import { supabase } from "../../supabase.js";

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUserId(value) {
    return typeof value === "string" && UUID_RE.test(value);
}

export async function fetchMessagesWithPartner(userId, partnerId) {
    if (!isValidUserId(userId) || !isValidUserId(partnerId)) {
        return { data: [], error: new Error("Invalid conversation participant") };
    }

    return supabase
        .from("messages")
        .select("id, sender_id, recipient_id, body, read_at, created_at")
        .or(
            `and(sender_id.eq.${userId},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${userId})`
        )
        .order("created_at", { ascending: true });
}

export async function fetchRecentMessages(userId) {
    return supabase
        .from("messages")
        .select("id, sender_id, recipient_id, body, read_at, created_at")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(200);
}

export async function sendMessage(recipientId, body) {
    const trimmed = body.trim();
    if (!trimmed) return { data: null, error: new Error("メッセージを入力してください") };

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return { data: null, error: userError ?? new Error("認証が必要です") };
    }

    return supabase
        .from("messages")
        .insert({
            sender_id: user.id,
            recipient_id: recipientId,
            body: trimmed,
        })
        .select("id, sender_id, recipient_id, body, read_at, created_at")
        .single();
}

export async function markConversationRead(partnerId) {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return { error: userError ?? new Error("認証が必要です") };
    }

    return supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_id", user.id)
        .eq("sender_id", partnerId)
        .is("read_at", null);
}

export function buildConversationList(userId, messages, profilesById) {
    const map = new Map();

    for (const message of messages ?? []) {
        const partnerId =
            message.sender_id === userId ? message.recipient_id : message.sender_id;

        if (!map.has(partnerId)) {
            map.set(partnerId, {
                partnerId,
                partner: profilesById.get(partnerId) ?? { id: partnerId, name: "不明" },
                lastMessage: message,
                unreadCount: 0,
            });
        }

        const conversation = map.get(partnerId);
        if (
            message.recipient_id === userId &&
            !message.read_at &&
            message.sender_id === partnerId
        ) {
            conversation.unreadCount += 1;
        }
    }

    return [...map.values()].sort(
        (a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at)
    );
}

export async function fetchTeachersForStudentSubjects(studentId) {
    const { data: enrollments, error: enrollmentError } = await supabase
        .from("student_subjects")
        .select("subject_id, subjects(name)")
        .eq("student_id", studentId);

    if (enrollmentError) return { data: [], error: enrollmentError };
    if (!enrollments?.length) return { data: [], error: null };

    const subjectIds = enrollments.map((row) => row.subject_id);
    const subjectNameById = Object.fromEntries(
        enrollments.map((row) => [row.subject_id, row.subjects?.name ?? ""])
    );

    const { data: assignments, error: assignmentError } = await supabase
        .from("teacher_subjects")
        .select("subject_id, teacher_id, profiles:teacher_id(id, name, role, username)")
        .in("subject_id", subjectIds);

    if (assignmentError) return { data: [], error: assignmentError };

    const teacherMap = new Map();
    for (const row of assignments ?? []) {
        const profile = row.profiles;
        if (!profile?.id) continue;

        const existing = teacherMap.get(profile.id);
        const subjectName = subjectNameById[row.subject_id] ?? "";
        if (!existing) {
            teacherMap.set(profile.id, {
                ...profile,
                subjectNames: subjectName ? [subjectName] : [],
                subjectName,
            });
            continue;
        }

        if (subjectName && !existing.subjectNames.includes(subjectName)) {
            existing.subjectNames.push(subjectName);
            existing.subjectName = existing.subjectNames.join("、");
        }
    }

    return {
        data: [...teacherMap.values()].sort((a, b) => a.name.localeCompare(b.name, "ja")),
        error: null,
    };
}

export function subscribeToMessages(userId, onChange) {
    const channel = supabase
        .channel(`student-messages:${userId}`)
        .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "messages" },
            (payload) => {
                const row = payload.new ?? payload.old;
                if (!row) return;
                if (row.sender_id !== userId && row.recipient_id !== userId) return;
                onChange(payload);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}
