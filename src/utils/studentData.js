import { supabase } from "../../supabase.js";
import { ATTENDANCE_STATUS } from "@/utils/attendanceFunctions.js";
import { getTodayDateString, isSubjectScheduledToday, WEEKDAYS, getTodayWeekday } from "@/utils/dateTimeFunctions.js";
import { groupAttendanceByCourse } from "@/utils/subjectGroupFunctions.js";

export async function fetchStudentProfile(userId) {
    return supabase
        .from("profiles")
        .select("id, name, role, student_id, students(id, name, student_number, email)")
        .eq("id", userId)
        .maybeSingle();
}

export async function fetchStudentSubjects(studentId) {
    return supabase
        .from("student_subjects")
        .select("subject_id, subjects(id, name, type, course_name, start_time, end_time, days)")
        .eq("student_id", studentId)
        .order("subjects(name)", { ascending: true });
}

export async function fetchStudentAttendance(studentId) {
    return supabase
        .from("attendance")
        .select("id, subject_id, date, status, subjects(name, type, course_name)")
        .eq("student_id", studentId)
        .order("date", { ascending: false });
}

export async function fetchTodayClassSessions(subjectIds, date = getTodayDateString()) {
    if (subjectIds.length === 0) return { data: [], error: null };

    return supabase
        .from("class_sessions")
        .select("id, subject_id, status, started_at, ended_at, date")
        .eq("date", date)
        .in("subject_id", subjectIds);
}

export async function fetchTodayAttendanceForStudent(studentId, date = getTodayDateString()) {
    return supabase
        .from("attendance")
        .select("subject_id, status")
        .eq("student_id", studentId)
        .eq("date", date);
}

export function getSubjectsFromEnrollment(rows) {
    return (rows ?? [])
        .map((row) => row.subjects)
        .filter(Boolean);
}

export function classifyTodayClass(subject, session, studentAttendanceRows) {
    const subjectAttendance = (studentAttendanceRows ?? []).filter(
        (row) => row.subject_id === subject.id
    );
    const hasRecords = subjectAttendance.length > 0;
    const allSkipped =
        hasRecords && subjectAttendance.every((r) => r.status === ATTENDANCE_STATUS.SKIPPED);
    const hasTakenAttendance = subjectAttendance.some(
        (r) => r.status !== ATTENDANCE_STATUS.SKIPPED
    );

    if (session?.status === "active") {
        return { state: "live", label: "出席取り中", session };
    }

    if (session?.status === "skipped" || allSkipped) {
        return { state: "skipped", label: "休講", session };
    }

    if (session?.status === "ended" || hasTakenAttendance) {
        const record = subjectAttendance.find((r) => r.status !== ATTENDANCE_STATUS.SKIPPED);
        return {
            state: "ended",
            label: record?.status ?? "終了",
            session,
        };
    }

    const now = new Date();
    const start = subject.start_time
        ? (() => {
              const [h, m] = subject.start_time.split(":").map(Number);
              const d = new Date();
              d.setHours(h, m, 0, 0);
              return d;
          })()
        : null;

    if (start && now < start) {
        return { state: "upcoming", label: "開始待ち", session };
    }

    return { state: "waiting", label: "開始待ち", session };
}

export function buildTodaySchedule(subjects, sessions, todayAttendance) {
    return subjects
        .filter((subject) => isSubjectScheduledToday(subject))
        .map((subject) => {
            const session = (sessions ?? []).find((s) => s.subject_id === subject.id) ?? null;
            const classification = classifyTodayClass(subject, session, todayAttendance);
            return { subject, session, ...classification };
        })
        .sort((a, b) => (a.subject.start_time ?? "").localeCompare(b.subject.start_time ?? ""));
}

function getTimeSlotKey(subject) {
    return `${subject.start_time ?? ""}|${subject.end_time ?? ""}`;
}

export function buildWeeklyScheduleTable(subjects) {
    const today = getTodayWeekday();
    const activeDays = WEEKDAYS.filter((day) =>
        (subjects ?? []).some((subject) => subject.days?.includes(day))
    );

    if (activeDays.length === 0) {
        return { days: [], rows: [], listRows: [] };
    }

    const slotMap = new Map();

    for (const subject of subjects ?? []) {
        const key = getTimeSlotKey(subject);
        if (!slotMap.has(key)) {
            slotMap.set(key, {
                startTime: subject.start_time,
                endTime: subject.end_time,
                byDay: Object.fromEntries(activeDays.map((day) => [day, []])),
            });
        }

        for (const day of subject.days ?? []) {
            if (activeDays.includes(day)) {
                slotMap.get(key).byDay[day].push(subject);
            }
        }
    }

    const rows = [...slotMap.values()]
        .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""))
        .map((slot) => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
            cells: activeDays.map((day) => ({
                day,
                isToday: day === today,
                subjects: slot.byDay[day] ?? [],
            })),
        }));

    const days = activeDays.map((day) => ({
        day,
        shortLabel: day.replace("曜", ""),
        isToday: day === today,
    }));

    const listRows = [];
    for (const subject of subjects ?? []) {
        for (const day of subject.days ?? []) {
            if (!activeDays.includes(day)) continue;
            listRows.push({
                id: `${subject.id}-${day}`,
                day,
                shortLabel: day.replace("曜", ""),
                isToday: day === today,
                startTime: subject.start_time,
                endTime: subject.end_time,
                subjectName: subject.name,
                subjectType: subject.type,
            });
        }
    }

    listRows.sort((a, b) => {
        const dayDiff = WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;
        return (a.startTime ?? "").localeCompare(b.startTime ?? "");
    });

    return { days, rows, listRows };
}

export function groupAttendanceBySubject(attendanceRows) {
    return groupAttendanceByCourse(attendanceRows).reduce((acc, group) => {
        acc[group.courseKey] = {
            subjectId: group.courseKey,
            subjectName: group.courseName,
            subjectType: group.subjectType,
            subjectIds: group.subjectIds,
            records: group.records,
        };
        return acc;
    }, {});
}
