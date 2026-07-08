import { supabase } from "../../supabase.js";

function pushFlagKey(studentId) {
    return `notification-push-pending-${studentId}`;
}

export function setPushUnreadFlag(studentId) {
    localStorage.setItem(pushFlagKey(studentId), "1");
}

export function hasPushUnreadFlag(studentId) {
    return localStorage.getItem(pushFlagKey(studentId)) === "1";
}

export async function fetchStudentNotifications(studentId) {
    return supabase
        .from("student_notifications")
        .select("id, notification_type, title, body, sender_name, read_at, created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(50);
}

export async function hasUnreadNotifications(studentId) {
    if (hasPushUnreadFlag(studentId)) return true;

    const { count, error } = await supabase
        .from("student_notifications")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId)
        .is("read_at", null);

    if (error) return false;
    return (count ?? 0) > 0;
}

export async function markNotificationsRead(studentId) {
    localStorage.removeItem(pushFlagKey(studentId));

    const { error } = await supabase
        .from("student_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("student_id", studentId)
        .is("read_at", null);

    return { error };
}

export function formatNotificationDate(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleString("ja-JP", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function getNotificationTypeLabel(type) {
    if (type === "risk_alert") return "出席率";
    if (type === "morning_schedule") return "本日の授業";
    return "お知らせ";
}
