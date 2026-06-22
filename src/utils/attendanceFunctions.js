export const ATTENDANCE_STATUS = {
    PRESENT: "出席",
    LATE: "遅刻",
    ABSENT: "欠席",
    SKIPPED: "休講",
};

export const LATES_PER_ABSENT = 3;

export function summarizeAttendanceRecords(records) {
    const counted = records.filter((record) => record.status !== ATTENDANCE_STATUS.SKIPPED);
    const total = counted.length;

    if (total === 0) {
        return {
            total: 0,
            present: 0,
            late: 0,
            absent: 0,
            lateAsAbsent: 0,
            remainingLate: 0,
            effectivePresent: 0,
            effectiveAbsent: 0,
            rate: 0,
        };
    }

    const present = counted.filter((record) => record.status === ATTENDANCE_STATUS.PRESENT).length;
    const late = counted.filter((record) => record.status === ATTENDANCE_STATUS.LATE).length;
    const absent = counted.filter((record) => record.status === ATTENDANCE_STATUS.ABSENT).length;
    const lateAsAbsent = Math.floor(late / LATES_PER_ABSENT);
    const remainingLate = late % LATES_PER_ABSENT;

    return {
        total,
        present,
        late,
        absent,
        lateAsAbsent,
        remainingLate,
        effectivePresent: present + remainingLate,
        effectiveAbsent: absent + lateAsAbsent,
        rate: Math.round(((present + remainingLate) / total) * 100),
    };
}

export function getAttendanceRate(records) {
    return summarizeAttendanceRecords(records).rate;
}

export function getStatusClass(status) {
    switch (status) {
        case ATTENDANCE_STATUS.PRESENT:
            return "status-present";
        case ATTENDANCE_STATUS.LATE:
            return "status-late";
        case ATTENDANCE_STATUS.ABSENT:
            return "status-absent";
        case ATTENDANCE_STATUS.SKIPPED:
            return "status-skipped";
        default:
            return "";
    }
}
