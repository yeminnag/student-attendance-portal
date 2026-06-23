import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import { formatTimeRange } from "@/utils/dateTimeFunctions.js";
import {
    buildWeeklyScheduleTable,
    fetchStudentSubjects,
    getSubjectsFromEnrollment,
} from "@/utils/studentData.js";

export function Schedule() {
    const { studentId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [scheduleTable, setScheduleTable] = useState({ days: [], rows: [], listRows: [] });

    useEffect(() => {
        if (!studentId) return;
        loadSchedule();
    }, [studentId]);

    async function loadSchedule() {
        setLoading(true);

        const { data, error } = await fetchStudentSubjects(studentId);
        if (error) {
            setLoading(false);
            return;
        }

        const subjects = getSubjectsFromEnrollment(data);
        setScheduleTable(buildWeeklyScheduleTable(subjects));
        setLoading(false);
    }

    const { days, rows, listRows } = scheduleTable;
    const dayGroups = days.map((dayInfo) => ({
        ...dayInfo,
        items: listRows.filter((row) => row.day === dayInfo.day),
    }));

    if (loading) {
        return <div className="page-loading">読み込み中...</div>;
    }

    return (
        <div className="schedule-page">
            <section className="panel">
                <div className="panel-header">
                    <h2>時間割</h2>
                </div>

                {listRows.length === 0 ? (
                    <p className="empty-msg">登録されている授業はありません。</p>
                ) : (
                    <>
                        <div className="schedule-table-wrap schedule-table-desktop">
                            <table className="schedule-table">
                                <thead>
                                    <tr>
                                        <th scope="col" className="schedule-table-time-col">
                                            時間
                                        </th>
                                        {days.map(({ day, shortLabel, isToday }) => (
                                            <th
                                                key={day}
                                                scope="col"
                                                className={isToday ? "is-today" : ""}
                                            >
                                                {shortLabel}
                                                {isToday && (
                                                    <span className="today-tag">今日</span>
                                                )}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => (
                                        <tr key={`${row.startTime}-${row.endTime}`}>
                                            <th scope="row" className="schedule-table-time-col">
                                                {formatTimeRange(row.startTime, row.endTime)}
                                            </th>
                                            {row.cells.map(({ day, isToday, subjects }) => (
                                                <td
                                                    key={day}
                                                    className={isToday ? "is-today" : ""}
                                                >
                                                    {subjects.length === 0 ? (
                                                        <span className="schedule-table-empty">
                                                            —
                                                        </span>
                                                    ) : (
                                                        subjects.map((subject) => (
                                                            <div
                                                                key={subject.id}
                                                                className="schedule-table-cell"
                                                            >
                                                                <strong>{subject.name}</strong>
                                                                <span>{subject.type}</span>
                                                            </div>
                                                        ))
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="schedule-table-wrap schedule-table-mobile">
                            <div className="schedule-mobile-groups">
                                {dayGroups.map(({ day, shortLabel, isToday, items }) => (
                                    <section
                                        key={day}
                                        className={
                                            isToday
                                                ? "schedule-day-block is-today"
                                                : "schedule-day-block"
                                        }
                                    >
                                        <header className="schedule-day-head">
                                            <h3>{shortLabel}</h3>
                                            {isToday && (
                                                <span className="today-tag">今日</span>
                                            )}
                                            <span className="schedule-day-count">
                                                {items.length}件
                                            </span>
                                        </header>
                                        <table className="schedule-day-table">
                                            <tbody>
                                                {items.map((item) => (
                                                    <tr key={item.id}>
                                                        <td className="schedule-day-time">
                                                            {formatTimeRange(
                                                                item.startTime,
                                                                item.endTime
                                                            )}
                                                        </td>
                                                        <td className="schedule-day-name">
                                                            {item.subjectName}
                                                        </td>
                                                        <td className="schedule-day-type">
                                                            {item.subjectType}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </section>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}
