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
import { formatTimeRange, getTodayWeekday, isSubjectScheduledToday } from "@/utils/dateTimeFunctions.js";

export function Notifications() {
    const { studentId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [permission, setPermission] = useState("default");
    const [enabled, setEnabled] = useState(false);
    const [todaySubjects, setTodaySubjects] = useState([]);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");

    const supported = isPushSupported();

    useEffect(() => {
        if (!studentId) return;

        async function load() {
            setLoading(true);

            const [{ data: enrollments }, { data: subscriptions }] = await Promise.all([
                fetchStudentSubjects(studentId),
                fetchPushSubscriptionStatus(studentId),
            ]);

            const subjects = getSubjectsFromEnrollment(enrollments).filter((subject) =>
                isSubjectScheduledToday(subject, getTodayWeekday())
            );
            setTodaySubjects(subjects);
            setEnabled((subscriptions ?? []).length > 0);
            setPermission(await getNotificationPermission());
            setLoading(false);
        }

        load();
    }, [studentId]);

    const previewMessage = useMemo(() => {
        if (todaySubjects.length === 0) {
            return "本日は授業がありません。";
        }

        const first = todaySubjects[0];
        return `本日は ${todaySubjects.length} 件の授業があります。`;
    }, [todaySubjects]);

    async function handleEnable() {
        if (!studentId || busy) return;
        setBusy(true);
        setMessage("");

        const { error } = await enableMorningNotifications(studentId);
        setBusy(false);

        if (error) {
            setMessage(error.message);
            return;
        }

        setEnabled(true);
        setPermission("granted");
        setMessage("朝7時の授業通知を有効にしました。");
    }

    async function handleDisable() {
        if (!studentId || busy) return;
        setBusy(true);
        setMessage("");

        const { error } = await disableMorningNotifications(studentId);
        setBusy(false);

        if (error) {
            setMessage(error.message);
            return;
        }

        setEnabled(false);
        setMessage("通知を停止しました。");
    }

    if (loading) {
        return <div className="page-loading">読み込み中...</div>;
    }

    return (
        <div className="notifications-page">
            <div className="panel-header">
                <div>
                    <h2>通知</h2>
                </div>
            </div>

            <section className="panel notification-status-card">
                <div className="notification-status-row">
                    <span className="notification-status-label">対応</span>
                    <span className="notification-status-value">
                        {supported ? "対応" : "非対応"}
                    </span>
                </div>
                <div className="notification-status-row">
                    <span className="notification-status-label">許可</span>
                    <span className="notification-status-value">
                        {permission === "granted"
                            ? "許可済み"
                            : permission === "denied"
                              ? "拒否"
                              : "未設定"}
                    </span>
                </div>
                <div className="notification-status-row">
                    <span className="notification-status-label">通知</span>
                    <span
                        className={`notification-status-value${enabled ? " on" : ""}`}
                    >
                        {enabled ? "オン" : "オフ"}
                    </span>
                </div>

                {supported && permission !== "denied" && !enabled && (
                    <button
                        type="button"
                        className="notification-enable-btn"
                        onClick={handleEnable}
                        disabled={busy}
                    >
                        通知を有効にする
                    </button>
                )}

                {enabled && (
                    <button
                        type="button"
                        className="notification-disable-btn"
                        onClick={handleDisable}
                        disabled={busy}
                    >
                        通知を停止
                    </button>
                )}

                {permission === "denied" && (
                    <p className="notification-hint">
                        ブラウザの設定でこのサイトの通知を許可してください。
                    </p>
                )}

                {message && <p className="notification-message">{message}</p>}
            </section>

            <section className="panel">
                <h3 className="notification-section-title">
                    本日の授業 
                    <span className="notification-preview">{previewMessage}</span>
                </h3>
                {todaySubjects.length === 0 ? (
                    <p className="empty-msg"> 本日は授業がありません。</p>
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
