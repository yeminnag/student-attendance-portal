import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";
import {
    getAttendanceRate,
    summarizeAttendanceRecords,
} from "@/utils/attendanceFunctions.js";
import { formatTodayLabel, formatTimeRange } from "@/utils/dateTimeFunctions.js";
import {
    buildTodaySchedule,
    fetchStudentAttendance,
    fetchStudentSubjects,
    fetchTodayAttendanceForStudent,
    fetchTodayClassSessions,
    getSubjectsFromEnrollment,
    groupAttendanceBySubject,
} from "@/utils/studentData.js";

const SUBJECT_RATE_PREVIEW_COUNT = 4;

function getLatestRecordDate(records) {
    return (records ?? []).reduce(
        (latest, record) => (record.date > latest ? record.date : latest),
        ""
    );
}

export function Dashboard() {
    const { studentId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [overallRate, setOverallRate] = useState(0);
    const [summary, setSummary] = useState(null);
    const [todaySchedule, setTodaySchedule] = useState([]);
    const [subjectRates, setSubjectRates] = useState([]);
    const [showAllSubjectRates, setShowAllSubjectRates] = useState(false);

    useEffect(() => {
        if (!studentId) return;
        loadDashboard();
    }, [studentId]);

    async function loadDashboard() {
        setLoading(true);

        const [
            { data: enrollment, error: enrollmentError },
            { data: attendance, error: attendanceError },
        ] = await Promise.all([
            fetchStudentSubjects(studentId),
            fetchStudentAttendance(studentId),
        ]);

        if (enrollmentError || attendanceError) {
            setLoading(false);
            return;
        }

        const subjects = getSubjectsFromEnrollment(enrollment);
        const grouped = groupAttendanceBySubject(attendance);
        const rates = Object.values(grouped).map((item) => ({
            ...item,
            rate: getAttendanceRate(item.records),
            stats: summarizeAttendanceRecords(item.records),
        }));

        const allRecords = attendance ?? [];
        const overall = getAttendanceRate(allRecords);
        const overallStats = summarizeAttendanceRecords(allRecords);

        const subjectIds = subjects.map((s) => s.id);
        const [{ data: sessions }, { data: todayAttendance }] = await Promise.all([
            fetchTodayClassSessions(subjectIds),
            fetchTodayAttendanceForStudent(studentId),
        ]);

        setOverallRate(overall);
        setSummary(overallStats);
        setSubjectRates(rates);
        setShowAllSubjectRates(false);
        setTodaySchedule(buildTodaySchedule(subjects, sessions, todayAttendance));
        setLoading(false);
    }

    const liveClasses = todaySchedule.filter((item) => item.state === "live");
    const upcomingClasses = todaySchedule.filter((item) =>
        ["upcoming", "waiting"].includes(item.state)
    );
    const finishedClasses = todaySchedule.filter((item) =>
        ["ended", "skipped"].includes(item.state)
    );

    const subjectRatesByRecent = [...subjectRates].sort((a, b) =>
        getLatestRecordDate(b.records).localeCompare(getLatestRecordDate(a.records))
    );
    const hasMoreSubjectRates = subjectRatesByRecent.length > SUBJECT_RATE_PREVIEW_COUNT;
    const previewSubjectRates = subjectRatesByRecent.slice(0, SUBJECT_RATE_PREVIEW_COUNT);
    const extraSubjectRates = subjectRatesByRecent.slice(SUBJECT_RATE_PREVIEW_COUNT);

    if (loading) {
        return <div className="page-loading">読み込み中...</div>;
    }

    return (
        <div className="dashboard">
            <section className="hero-card">
                <p className="hero-date">{formatTodayLabel()}</p>
                <div className="hero-rate">
                    <span className="hero-rate-value">{overallRate}%</span>
                    <span className="hero-rate-label">総合出席率</span>
                </div>
                {summary && (
                    <p className="hero-note">
                        遅刻 - {summary.late}  · 欠席 - {summary.absent} 
                        {summary.lateAsAbsent > 0 && ` · 換算欠席 +${summary.lateAsAbsent}`}
                    </p>
                )}
            </section>

            <section className="panel">
                <div className="panel-header">
                    <h2>今日の授業</h2>
                    <span className="panel-count">{todaySchedule.length} 件</span>
                </div>

                {todaySchedule.length === 0 ? (
                    <p className="empty-msg">今日は授業がありません。</p>
                ) : (
                    <div className="schedule-groups">
                        {liveClasses.length > 0 && (
                            <ScheduleGroup title="出席取り中" items={liveClasses} tone="live" />
                        )}
                        {upcomingClasses.length > 0 && (
                            <ScheduleGroup title="開始待ち" items={upcomingClasses} tone="upcoming" />
                        )}
                        {finishedClasses.length > 0 && (
                            <ScheduleGroup title="終了" items={finishedClasses} tone="done" />
                        )}
                    </div>
                )}
            </section>

            <section className="panel">
                <div className="panel-header">
                    <h2>授業別出席率</h2>
                    <Link to="/attendance" className="panel-link">
                        詳細を見る
                    </Link>
                </div>

                {subjectRates.length === 0 ? (
                    <p className="empty-msg">出席記録はまだありません。</p>
                ) : (
                    <>
                        <div className="subject-rate-grid">
                            {previewSubjectRates.map((item) => (
                                <SubjectRateCard key={item.subjectId} item={item} />
                            ))}
                        </div>
                        {hasMoreSubjectRates && (
                            <>
                                <div
                                    className={
                                        showAllSubjectRates
                                            ? "subject-rate-more is-open"
                                            : "subject-rate-more"
                                    }
                                >
                                    <div className="subject-rate-more-inner">
                                        <div className="subject-rate-grid">
                                            {extraSubjectRates.map((item) => (
                                                <SubjectRateCard key={item.subjectId} item={item} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className={
                                        showAllSubjectRates
                                            ? "see-more-btn is-open"
                                            : "see-more-btn"
                                    }
                                    onClick={() => setShowAllSubjectRates((prev) => !prev)}
                                    aria-expanded={showAllSubjectRates}
                                >
                                    {showAllSubjectRates ? "閉じる" : "もっと見る"}
                                </button>
                            </>
                        )}
                    </>
                )}
            </section>
        </div>
    );
}

function SubjectRateCard({ item }) {
    return (
        <article className="subject-rate-card">
            <div className="subject-rate-head">
                <strong>{item.subjectName}</strong>
                <small>
                    {item.subjectType}
                </small>
                <span className="subject-rate-value">{item.rate}%</span>
            </div>
            <p className="subject-rate-meta">
                遅刻 {item.stats.late} · 欠席 {item.stats.effectiveAbsent}
            </p>
        </article>
    );
}

function ScheduleGroup({ title, items, tone }) {
    return (
        <div className={`schedule-group schedule-group-${tone}`}>
            <h3>{title}</h3>
            <ul className="schedule-list">
                {items.map(({ subject, label, state }) => (
                    <li key={subject.id} className={`schedule-item schedule-item-${state}`}>
                        <div>
                            <strong>{subject.name}</strong>
                            <span>{subject.type}</span>
                        </div>
                        <div className="schedule-item-meta">
                            <span>{formatTimeRange(subject.start_time, subject.end_time)}</span>
                            <span className="schedule-badge">{label}</span>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
