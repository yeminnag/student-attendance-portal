import { supabase } from "../../supabase.js";

function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) {
        output[i] = raw.charCodeAt(i);
    }
    return output;
}

export function isPushSupported() {
    return (
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
    );
}

export async function getNotificationPermission() {
    if (!isPushSupported()) return "unsupported";
    return Notification.permission;
}

export async function registerServiceWorker() {
    return navigator.serviceWorker.register("/sw.js");
}

export async function savePushSubscription(studentId, subscription) {
    const json = subscription.toJSON();
    return supabase.from("student_push_subscriptions").upsert(
        {
            student_id: studentId,
            endpoint: subscription.endpoint,
            p256dh: json.keys?.p256dh,
            auth: json.keys?.auth,
            morning_enabled: true,
        },
        { onConflict: "student_id,endpoint" }
    );
}

export async function removePushSubscriptions(studentId) {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
        await subscription.unsubscribe();
    }
    return supabase.from("student_push_subscriptions").delete().eq("student_id", studentId);
}

export async function fetchPushSubscriptionStatus(studentId) {
    return supabase
        .from("student_push_subscriptions")
        .select("id, morning_enabled, created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });
}

export async function enableMorningNotifications(studentId) {
    if (!isPushSupported()) {
        return { error: new Error("この端末は通知に対応していません") };
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
        return { error: new Error("通知の許可が必要です") };
    }

    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
        return { error: new Error("VITE_VAPID_PUBLIC_KEY が設定されていません") };
    }

    const registration = await registerServiceWorker();
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
    }

    const { error } = await savePushSubscription(studentId, subscription);
    if (error) return { error };

    return { data: subscription, error: null };
}

export async function disableMorningNotifications(studentId) {
    const { error } = await removePushSubscriptions(studentId);
    return { error };
}
