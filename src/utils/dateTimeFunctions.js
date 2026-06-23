export function getTodayWeekday() {
    const label = new Date().toLocaleDateString("ja-JP", { weekday: "long" });
    return label.endsWith("曜日") ? label.slice(0, -1) : label;
}

export const WEEKDAYS = ["月曜", "火曜", "水曜", "木曜", "金曜", "土曜", "日曜"];

export function getTodayDateString() {
    return new Date().toISOString().slice(0, 10);
}

export function formatTodayLabel() {
    return new Date().toLocaleDateString().split("/").join(" - ");
}

export function formatTimeRange(startTime, endTime) {
    const start = startTime?.slice(0, 5) ?? "—";
    const end = endTime?.slice(0, 5) ?? "—";
    return `${start} - ${end}`;
}

export function parseTimeOnDate(baseDate, timeStr) {
    if (!timeStr) return null;
    const base = new Date(baseDate);
    const [hours, minutes, seconds = 0] = timeStr.split(":").map(Number);
    base.setHours(hours, minutes, seconds, 0);
    return base;
}

export function isSubjectScheduledToday(subject, weekday = getTodayWeekday()) {
    return subject.days?.includes(weekday) ?? false;
}

export function getCurrentMonthKey() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${now.getFullYear()}-${month}`;
}

export function formatMonthLabel(monthKey) {
    if (!monthKey || monthKey === "all") return "すべて";
    const [year, month] = monthKey.split("-");
    return `${year}年${Number(month)}月`;
}

export function filterRecordsByMonth(records, monthKey) {
    if (!monthKey || monthKey === "all") return records ?? [];
    return (records ?? []).filter((record) => record.date?.startsWith(monthKey));
}

export function getAvailableMonths(records) {
    const months = new Set();
    for (const record of records ?? []) {
        if (record.date) months.add(record.date.slice(0, 7));
    }
    return [...months].sort().reverse();
}
