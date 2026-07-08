import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const NOTIFICATION_TYPE = "morning_schedule";

function getEnv(env = process.env) {
    return {
        supabaseUrl: env.SUPABASE_URL || env.VITE_SUPABASE_URL || "",
        serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || "",
        vapidPublicKey: env.VAPID_PUBLIC_KEY || env.VITE_VAPID_PUBLIC_KEY || "",
        vapidPrivateKey: env.VAPID_PRIVATE_KEY || "",
        vapidSubject: env.VAPID_SUBJECT || "mailto:admin@example.com",
        cronSecret: env.CRON_SECRET || "",
    };
}

function getTodayInJapan() {
    const now = new Date();
    const date = now.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
    const weekdayLabel = now.toLocaleDateString("ja-JP", {
        weekday: "long",
        timeZone: "Asia/Tokyo",
    });
    const weekday = weekdayLabel.endsWith("曜日") ? weekdayLabel.slice(0, -1) : weekdayLabel;
    return { date, weekday };
}

function getSubjectsForToday(enrollments, weekday) {
    const subjects = [];
    const seen = new Set();

    for (const row of enrollments ?? []) {
        const subject = row.subjects;
        if (!subject?.id || seen.has(subject.id)) continue;
        if (!(subject.days ?? []).includes(weekday)) continue;
        seen.add(subject.id);
        subjects.push(subject);
    }

    return subjects.sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));
}

function buildMorningMessage(subjects) {
    if (subjects.length === 0) return null;

    const first = subjects[0];
    const firstTime = first.start_time?.slice(0, 5) ?? "";
    const title = "本日は授業があります";
    const lines = [
        `今日は ${subjects.length} 件の授業があります。`,
        firstTime ? `最初の授業: ${first.name}（${firstTime}〜）` : `最初の授業: ${first.name}`,
        "時間割を確認してください。",
    ];

    return { title, body: lines.join("\n") };
}

async function sendPushNotification(subscription, payload) {
    await webpush.sendNotification(
        {
            endpoint: subscription.endpoint,
            keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
            },
        },
        JSON.stringify(payload)
    );
}

export default async function handler(req, res) {
    if (req.method !== "GET" && req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { supabaseUrl, serviceRoleKey, vapidPublicKey, vapidPrivateKey, vapidSubject, cronSecret } =
        getEnv();

    const authHeader = req.headers.authorization ?? "";
    const providedSecret = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!cronSecret || providedSecret !== cronSecret) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
        return res.status(500).json({
            error: "Missing SUPABASE_SERVICE_ROLE_KEY or VAPID keys",
        });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const { date: todayDate, weekday } = getTodayInJapan();

    const { data: subscriptions, error: subscriptionError } = await supabase
        .from("student_push_subscriptions")
        .select("id, student_id, endpoint, p256dh, auth")
        .eq("morning_enabled", true);

    if (subscriptionError) {
        return res.status(500).json({ error: subscriptionError.message });
    }

    const studentIds = [...new Set((subscriptions ?? []).map((row) => row.student_id))];
    if (studentIds.length === 0) {
        return res.status(200).json({ sent: 0, skipped: 0, message: "No subscriptions" });
    }

    const { data: enrollments, error: enrollmentError } = await supabase
        .from("student_subjects")
        .select("student_id, subjects(id, name, start_time, end_time, days)")
        .in("student_id", studentIds);

    if (enrollmentError) {
        return res.status(500).json({ error: enrollmentError.message });
    }

    const enrollmentsByStudent = new Map();
    for (const row of enrollments ?? []) {
        if (!enrollmentsByStudent.has(row.student_id)) {
            enrollmentsByStudent.set(row.student_id, []);
        }
        enrollmentsByStudent.get(row.student_id).push(row);
    }

    const { data: sentLogs } = await supabase
        .from("student_notification_logs")
        .select("student_id")
        .eq("notification_type", NOTIFICATION_TYPE)
        .eq("sent_date", todayDate);

    const alreadySent = new Set((sentLogs ?? []).map((row) => row.student_id));

    let sent = 0;
    let skipped = 0;
    let noClass = 0;
    const staleEndpoints = [];

    const subsByStudent = new Map();
    for (const sub of subscriptions ?? []) {
        if (!subsByStudent.has(sub.student_id)) subsByStudent.set(sub.student_id, []);
        subsByStudent.get(sub.student_id).push(sub);
    }

    for (const [studentId, studentSubs] of subsByStudent.entries()) {
        if (alreadySent.has(studentId)) {
            skipped += 1;
            continue;
        }

        const todaySubjects = getSubjectsForToday(enrollmentsByStudent.get(studentId) ?? [], weekday);
        if (todaySubjects.length === 0) {
            noClass += 1;
            continue;
        }

        const message = buildMorningMessage(todaySubjects);
        if (!message) continue;

        let delivered = false;
        for (const sub of studentSubs) {
            try {
                await sendPushNotification(sub, {
                    title: message.title,
                    body: message.body,
                    url: "/schedule",
                });
                delivered = true;
            } catch (error) {
                if (error?.statusCode === 404 || error?.statusCode === 410) {
                    staleEndpoints.push(sub.id);
                }
            }
        }

        if (delivered) {
            await supabase.from("student_notification_logs").upsert(
                {
                    student_id: studentId,
                    notification_type: NOTIFICATION_TYPE,
                    sent_date: todayDate,
                },
                { onConflict: "student_id,notification_type,sent_date" }
            );
            await supabase.from("student_notifications").insert({
                student_id: studentId,
                notification_type: NOTIFICATION_TYPE,
                title: message.title,
                body: message.body,
                sender_name: "システム",
            });
            sent += 1;
        }
    }

    if (staleEndpoints.length > 0) {
        await supabase.from("student_push_subscriptions").delete().in("id", staleEndpoints);
    }

    return res.status(200).json({
        date: todayDate,
        weekday,
        sent,
        skipped,
        noClass,
        staleRemoved: staleEndpoints.length,
    });
}
