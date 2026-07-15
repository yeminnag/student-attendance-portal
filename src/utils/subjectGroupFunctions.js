export function getSubjectCourseKey(subject) {
    if (!subject) return "";

    const courseName = subject.course_name?.trim();
    if (courseName) return courseName;

    return subject.name?.trim() ?? "";
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
