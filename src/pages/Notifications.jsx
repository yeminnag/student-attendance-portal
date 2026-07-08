import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import {
    fetchStudentSubjects,
    getSubjectsFromEnrollment,
} from "@/utils/studentData.js";
import {
    disableMorningNotifications,
    enableMorningNotifications,
    fetchPushSubscriptionStatus,
    getNotificationPermission,
    isPushSupported,
} from "@/utils/pushService.js";
import {
    fetchStudentNotifications,
    formatNotificationDate,
    getNotificationTypeLabel,
    markNotificationsRead,
} from "@/utils/notificationInbox.js";
import { formatTimeRange, getTodayWeekday, isSubjectScheduledToday } from "@/utils/dateTimeFunctions.js";

export function Notifications() {
    const { studentId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [permission, setPermission] = useState("default");
    const [enabled, setEnabled] = useState(false);
    const [todaySubjects, setTodaySubjects] = useState([]);
    const [inbox, setInbox] = useState([]);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");

    const supported = isPushSupported();

    useEffect(() => {
        if (!studentId) return;

        async function load() {
            setLoading(true);

            const [{ data: enrollments }, { data: subscriptions }, { data: notifications }] =
                await Promise.all([
                    fetchStudentSubjects(studentId),
                    fetchPushSubscriptionStatus(studentId),
                    fetchStudentNotifications(studentId),
                ]);

            const subjects = getSubjectsFromEnrollment(enrollments).filter((subject) =>
                isSubjectScheduledToday(subject, getTodayWeekday())
            );
            setTodaySubjects(subjects);
            setEnabled((subscriptions ?? []).length > 0);
            setInbox(notifications ?? []);
            setPermission(await getNotificationPermission());
            setLoading(false);
        }

        load();
    }, [studentId]);

    useEffect(() => {
        if (!studentId || loading) return;

        async function markSeen() {
            await markNotificationsRead(studentId);
            setInbox((current) =>
                current.map((item) => ({
                    ...item,
                    read_at: item.read_at ?? new Date().toISOString(),
                }))
            );
        }

        markSeen();
    }, [studentId, loading]);

    const previewMessage = useMemo(() => {
        if (todaySubjects.length === 0) {
            return "本日は授業がありません。";
        }

        return `本日は ${todaySubjects.length} 件の授業があります。`;
    }, [todaySubjects]);

    async function handleToggle() {
        if (!studentId || busy) return;
        setBusy(true);
        setMessage("");

        const { error } = enabled
            ? await disableMorningNotifications(studentId)
            : await enableMorningNotifications(studentId);

        setBusy(false);

        if (error) {
            setMessage(error.message);
            return;
        }

        setEnabled(!enabled);
        if (!enabled) setPermission("granted");
    }

    if (loading) {
        return <div className="page-loading">読み込み中...</div>;
    }

    return (
        <div className="notifications-page">
            <section className="panel notification-toggle-panel">
                <label className="notification-switch-row">
                    <span className="notification-switch-label">通知</span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        aria-label="朝7時の授業通知"
                        className={`notification-switch${enabled ? " on" : ""}`}
                        onClick={handleToggle}
                        disabled={busy || !supported || permission === "denied"}
                    >
                        <span className="notification-switch-thumb" />
                    </button>
                </label>

                {permission === "denied" && (
                    <p className="notification-hint">
                        ブラウザの設定でこのサイトの通知を許可してください。
                    </p>
                )}

                {!supported && (
                    <p className="notification-hint">この端末は通知に対応していません。</p>
                )}

                {message && <p className="notification-message">{message}</p>}
            </section>

            <section className="panel">
                <h3 className="notification-section-title">お知らせ</h3>
                {inbox.length === 0 ? (
                    <p className="empty-msg">お知らせはまだありません。</p>
                ) : (
                    <ul className="notification-inbox-list">
                        {inbox.map((item) => (
                            <li
                                key={item.id}
                                className={`notification-inbox-item${item.read_at ? "" : " unread"}`}
                            >
                                <div className="notification-inbox-head">
                                    <span className="notification-inbox-type">
                                        {getNotificationTypeLabel(item.notification_type)}
                                    </span>
                                    <span className="notification-inbox-date">
                                        {formatNotificationDate(item.created_at)}
                                    </span>
                                </div>
                                <strong className="notification-inbox-title">{item.title}</strong>
                                <p className="notification-inbox-body">{item.body}</p>
                                {item.sender_name && (
                                    <span className="notification-inbox-sender">
                                        {item.sender_name}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="panel">
                <h3 className="notification-section-title">
                    本日の授業
                    <span className="notification-preview">{previewMessage}</span>
                </h3>
                {todaySubjects.length === 0 ? (
                    <p className="empty-msg">本日は授業がありません。</p>
                ) : (
                    <ul className="notification-class-list">
                        {todaySubjects.map((subject) => (
                            <li key={subject.id}>
                                <strong>{subject.name}</strong>
                                <span>{formatTimeRange(subject.start_time, subject.end_time)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
