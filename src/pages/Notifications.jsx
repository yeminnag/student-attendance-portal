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
        setInbox((current) =>
            current.map((item) => ({
                ...item,
                read_at: item.read_at ?? new Date().toISOString(),
            }))
        );
    }, [studentId, loading]);

    const feedItems = useMemo(() => {
        const items = [];

        if (todaySubjects.length > 0) {
            items.push({
                id: "today-schedule",
                notification_type: "today_schedule",
                title:
                    todaySubjects.length === 1
                        ? "本日は1件の授業があります"
                        : `本日は${todaySubjects.length}件の授業があります`,
                body: todaySubjects
                    .map(
                        (subject) =>
                            `${subject.name}（${formatTimeRange(subject.start_time, subject.end_time)}）`
                    )
                    .join("\n"),
                sender_name: null,
                created_at: new Date().toISOString(),
                read_at: new Date().toISOString(),
                isStatic: true,
            });
        }

        for (const item of inbox) {
            items.push(item);
        }

        return items;
    }, [todaySubjects, inbox]);

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

            <section className="panel notification-feed-panel">
                {feedItems.length === 0 ? (
                    <p className="empty-msg">お知らせはまだありません。</p>
                ) : (
                    <ul className="notification-inbox-list">
                        {feedItems.map((item) => (
                            <li
                                key={item.id}
                                className={`notification-inbox-item${item.read_at ? "" : " unread"}`}
                            >
                                <div className="notification-inbox-head">
                                    <span className="notification-inbox-type">
                                        {getNotificationTypeLabel(item.notification_type)}
                                    </span>
                                    {!item.isStatic && (
                                        <span className="notification-inbox-date">
                                            {formatNotificationDate(item.created_at)}
                                        </span>
                                    )}
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
        </div>
    );
}
