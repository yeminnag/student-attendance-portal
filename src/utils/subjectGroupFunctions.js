export function getSubjectCourseKey(subject) {
    if (!subject) return "";

    const courseName = subject.course_name?.trim();
    if (courseName) return courseName;

    return subject.name?.trim() ?? "";
}

export function groupEnrollmentByCourse(enrollmentRows) {
    const groups = new Map();

    for (const row of enrollmentRows ?? []) {
        const subject = row.subjects ?? row;
        const courseKey = getSubjectCourseKey(subject) || row.subject_id || subject.id;
        const courseName = getSubjectCourseKey(subject) || subject.name || "不明";

        if (!groups.has(courseKey)) {
            groups.set(courseKey, {
                courseKey,
                courseName,
                subjectType: subject.type ?? "",
                subjectIds: [],
                slotNames: [],
            });
        }

        const group = groups.get(courseKey);
        const subjectId = row.subject_id ?? subject.id;
        group.subjectIds.push(subjectId);
        group.slotNames.push(subject.name ?? "");
    }

    return [...groups.values()];
}

export function groupAttendanceByCourse(attendanceRows) {
    const groups = {};

    for (const row of attendanceRows ?? []) {
        const subject = row.subjects;
        const courseKey = getSubjectCourseKey(subject) || row.subject_id;
        const courseName = getSubjectCourseKey(subject) || subject?.name || "不明";

        if (!groups[courseKey]) {
            groups[courseKey] = {
                courseKey,
                courseName,
                subjectType: subject?.type ?? "",
                subjectIds: new Set(),
                records: [],
            };
        }

        groups[courseKey].subjectIds.add(row.subject_id);
        groups[courseKey].records.push(row);
    }

    return Object.values(groups).map((group) => ({
        ...group,
        subjectIds: [...group.subjectIds],
    }));
}

export function filterAttendanceBySubjectIds(attendanceRows, subjectIds) {
    const idSet = new Set(subjectIds);
    return (attendanceRows ?? []).filter((row) => idSet.has(row.subject_id));
}
