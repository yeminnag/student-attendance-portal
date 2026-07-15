import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import {
    getAttendanceRate,
    getStatusClass,
    summarizeAttendanceRecords,
} from "@/utils/attendanceFunctions.js";
import {
    filterRecordsByMonth,
    formatMonthLabel,
    getAvailableMonths,
    getCurrentMonthKey,
} from "@/utils/dateTimeFunctions.js";
import {
    fetchStudentAttendance,
    groupAttendanceBySubject,
} from "@/utils/studentData.js";

function buildSubjectGroups(records) {
    const grouped = Object.values(groupAttendanceBySubject(records)).map((item) => ({
        ...item,
        rate: getAttendanceRate(item.records),
        stats: summarizeAttendanceRecords(item.records),
    }));

    grouped.sort((a, b) => a.subjectName.localeCompare(b.subjectName, "ja"));
    return grouped;
}

export function AttendanceHistory() {
    const { studentId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [allRecords, setAllRecords] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
    const [selectedId, setSelectedId] = useState(null);
    const subjectListRef = useRef(null);
    const detailRef = useRef(null);

    useEffect(() => {
        if (!studentId) return;
        loadAttendance();
    }, [studentId]);

    async function loadAttendance() {
        setLoading(true);
        const { data, error } = await fetchStudentAttendance(studentId);
        if (error) {
            setLoading(false);
            return;
        }

        setAllRecords(data ?? []);
        setLoading(false);
    }

    const monthOptions = useMemo(() => {
        const months = getAvailableMonths(allRecords);
        const current = getCurrentMonthKey();
        if (!months.includes(current)) {
            months.unshift(current);
        }
        return months;
    }, [allRecords]);

    const filteredRecords = useMemo(
        () => filterRecordsByMonth(allRecords, selectedMonth),
        [allRecords, selectedMonth]
    );

    const subjects = useMemo(
        () => buildSubjectGroups(filteredRecords),
        [filteredRecords]
    );

    useEffect(() => {
        if (subjects.length === 0) {
            setSelectedId(null);
            return;
        }

        const stillSelected = subjects.some((item) => item.subjectId === selectedId);
        if (!stillSelected) {
            setSelectedId(subjects[0].subjectId);
        }
    }, [subjects, selectedId]);

    function selectSubject(subjectId) {
        setSelectedId(subjectId);

        if (!window.matchMedia("(max-width: 640px)").matches) return;

        requestAnimationFrame(() => {
            const list = subjectListRef.current;
            const active = list?.querySelector(".subject-list-item.active");
            active?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
            detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
    }

    const selected = subjects.find((item) => item.subjectId === selectedId);
    const monthLabel = formatMonthLabel(selectedMonth);

    if (loading) {
        return <div className="page-loading">読み込み中...</div>;
    }

    return (
        <div className="attendance-page">
            <section className="panel">
                <div className="month-filter">
                    <label htmlFor="month-filter">表示月</label>
                    <select
                        id="month-filter"
                        className="month-filter-select"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                        <option value="all">すべて</option>
                        {monthOptions.map((month) => (
                            <option key={month} value={month}>
                                {formatMonthLabel(month)}
                            </option>
                        ))}
                    </select>
                    {selectedMonth !== "all" && (
                        <span className="month-filter-meta">{monthLabel}の記録</span>
                    )}
                </div>

                {allRecords.length === 0 ? (
                    <p className="empty-msg">出席記録はまだありません。</p>
                ) : filteredRecords.length === 0 ? (
                    <p className="empty-msg">{monthLabel}の出席記録はありません。</p>
                ) : (
                    <div className="attendance-layout">
                        <aside className="subject-list" ref={subjectListRef}>
                            {subjects.map((item) => (
                                <button
                                    key={item.subjectId}
                                    type="button"
                                    className={
                                        item.subjectId === selectedId
                                            ? "subject-list-item active"
                                            : "subject-list-item"
                                    }
                                    onClick={() => selectSubject(item.subjectId)}
                                >
                                    <strong>{item.subjectName}</strong>
                                    <span>{item.rate}%</span>
                                </button>
                            ))}
                        </aside>

                        {selected && (
                            <div className="attendance-detail" ref={detailRef}>
                                <div className="attendance-detail-head">
                                    <div>
                                        <h3>{selected.subjectName}</h3>
                                        <p>
                                            {selected.subjectType}
                                            {selectedMonth !== "all" && ` · ${monthLabel}`}
                                        </p>
                                    </div>
                                    <div className="attendance-detail-rate">{selected.rate}%</div>
                                </div>

                                <div className="attendance-stats">
                                    <span>記録 {selected.stats.total} 回</span>
                                    <span>出席 {selected.stats.present}</span>
                                    <span>遅刻 {selected.stats.late}</span>
                                    <span>欠席 {selected.stats.effectiveAbsent}</span>
                                </div>

                                <table className="attendance-table">
                                    <thead>
                                        <tr>
                                            <th>日付</th>
                                            
                                            <th>ステータス</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selected.records.map((record) => (
                                            <tr key={record.id}>
                                                <td>{record.date}</td>
                                                
                                                <td>
                                                    <span
                                                        className={`status-pill ${getStatusClass(record.status)}`}
                                                    >
                                                        {record.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}
