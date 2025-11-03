import { getPool } from '../db/pool.js';
import {
  fallbackTeachingAssignments,
  fallbackTeacherRosters,
  fallbackTeacherFocusTags
} from './fallbackData.js';
import type {
  TeachingAssignment,
  TeacherDashboardData,
  TeacherRosterEntry,
  TeacherScheduleSlot
} from './types.js';
import { listClassrooms } from './classroomService.js';
import { listStudents } from './studentService.js';
import { findStaffById } from './staffService.js';
import { listTeacherGrades } from './academicService.js';
import { registerSubjectForMajor } from '../utils/majors.js';

let inMemoryAssignments = [...fallbackTeachingAssignments];
for (const assignment of inMemoryAssignments) {
  registerSubjectForMajor(assignment.majorFocus, assignment.courseTitle);
}
let inMemoryRosters = [...fallbackTeacherRosters];
let nextAssignmentId = fallbackTeachingAssignments.length + 1;

function normalizeAssignment(row: any): TeachingAssignment {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    classroomId: row.classroom_id,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    weekday: row.weekday,
    startTime: row.start_time,
    endTime: row.end_time,
    studentGroup: row.student_group,
    majorFocus: row.major_focus ?? row.majorFocus ?? 'Undeclared',
    assignedBy: row.assigned_by ?? null,
    assignedAt: row.assigned_at instanceof Date ? row.assigned_at.toISOString() : row.assigned_at
  };
}

function normalizeRoster(row: any): TeacherRosterEntry {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    studentId: row.student_id,
    status: row.status ?? 'enrolled'
  };
}

export async function listTeachingAssignments(): Promise<TeachingAssignment[]> {
  const pool = getPool();

  if (!pool) {
    return [...inMemoryAssignments];
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, teacher_id, classroom_id, course_code, course_title, weekday, start_time, end_time, student_group, major_focus, assigned_by, assigned_at
       FROM teaching_assignments
       ORDER BY assigned_at DESC`
    );

    const assignments = rows.map(normalizeAssignment);
    assignments.forEach((assignment) => {
      registerSubjectForMajor(assignment.majorFocus, assignment.courseTitle);
    });

    return assignments;
  } catch (error) {
    console.error('Failed to fetch teaching assignments from database', error);
    return [...inMemoryAssignments];
  }
}

export async function listTeachingAssignmentsForTeacher(teacherId: number): Promise<TeachingAssignment[]> {
  const pool = getPool();

  if (!pool) {
    return inMemoryAssignments.filter((assignment) => assignment.teacherId === teacherId);
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, teacher_id, classroom_id, course_code, course_title, weekday, start_time, end_time, student_group, major_focus, assigned_by, assigned_at
       FROM teaching_assignments
       WHERE teacher_id = $1
       ORDER BY start_time ASC`,
      [teacherId]
    );

    const assignments = rows.map(normalizeAssignment);
    assignments.forEach((assignment) => {
      registerSubjectForMajor(assignment.majorFocus, assignment.courseTitle);
    });

    return assignments;
  } catch (error) {
    console.error('Failed to fetch teaching assignments for teacher', error);
    return inMemoryAssignments.filter((assignment) => assignment.teacherId === teacherId);
  }
}

export type CreateTeachingAssignmentInput = {
  teacherId: number;
  classroomId: number;
  courseCode: string;
  courseTitle: string;
  weekday: string;
  startTime: string;
  endTime: string;
  studentGroup?: string;
  majorFocus: string;
};

export async function assignTeacherToClassroom(
  input: CreateTeachingAssignmentInput,
  assignedBy?: number
): Promise<TeachingAssignment> {
  const pool = getPool();
  const studentGroup = input.studentGroup ?? 'Core Cohort';
  registerSubjectForMajor(input.majorFocus, input.courseTitle);
  const assignedAt = new Date().toISOString();

  if (!pool) {
    const assignment: TeachingAssignment = {
      id: nextAssignmentId++,
      teacherId: input.teacherId,
      classroomId: input.classroomId,
      courseCode: input.courseCode,
      courseTitle: input.courseTitle,
      weekday: input.weekday,
      startTime: input.startTime,
      endTime: input.endTime,
      studentGroup,
      majorFocus: input.majorFocus,
      assignedBy: assignedBy ?? null,
      assignedAt
    };

    inMemoryAssignments = [assignment, ...inMemoryAssignments];
    return assignment;
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO teaching_assignments (teacher_id, classroom_id, course_code, course_title, weekday, start_time, end_time, student_group, major_focus, assigned_by, assigned_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, teacher_id, classroom_id, course_code, course_title, weekday, start_time, end_time, student_group, major_focus, assigned_by, assigned_at`,
      [
        input.teacherId,
        input.classroomId,
        input.courseCode,
        input.courseTitle,
        input.weekday,
        input.startTime,
        input.endTime,
        studentGroup,
        input.majorFocus,
        assignedBy ?? null,
        assignedAt
      ]
    );

    const assignment = normalizeAssignment(rows[0]);

    // Auto-enroll students with matching majors
    try {
      const allStudents = await listStudents();
      const relevantStudents = allStudents.filter((student) => student.primaryInterest === assignment.majorFocus);

      for (const student of relevantStudents) {
        // Check if already enrolled
        const existingRoster = await pool.query(
          `SELECT id FROM teacher_rosters WHERE teacher_id = $1 AND course_code = $2 AND student_id = $3`,
          [input.teacherId, input.courseCode, student.id]
        );

        if (existingRoster.rows.length === 0) {
          await pool.query(
            `INSERT INTO teacher_rosters (teacher_id, course_code, course_title, student_id, status)
             VALUES ($1, $2, $3, $4, 'enrolled')`,
            [input.teacherId, input.courseCode, input.courseTitle, student.id]
          );
        }
      }
    } catch (enrollmentError) {
      console.error('Failed to auto-enroll students for teaching assignment', enrollmentError);
      // Don't fail the whole operation if enrollment fails
    }

    return assignment;
  } catch (error) {
    console.error('Failed to persist teaching assignment, falling back to memory', error);
    const assignment: TeachingAssignment = {
      id: nextAssignmentId++,
      teacherId: input.teacherId,
      classroomId: input.classroomId,
      courseCode: input.courseCode,
      courseTitle: input.courseTitle,
      weekday: input.weekday,
      startTime: input.startTime,
      endTime: input.endTime,
      studentGroup,
      majorFocus: input.majorFocus,
      assignedBy: assignedBy ?? null,
      assignedAt
    };

    inMemoryAssignments = [assignment, ...inMemoryAssignments];
    return assignment;
  }
}

export async function listTeacherRosters(teacherId: number): Promise<TeacherRosterEntry[]> {
  const pool = getPool();

  if (!pool) {
    return inMemoryRosters.filter((roster) => roster.teacherId === teacherId);
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, teacher_id, course_code, course_title, student_id, status
       FROM teacher_rosters
       WHERE teacher_id = $1`,
      [teacherId]
    );

    return rows.map(normalizeRoster);
  } catch (error) {
    console.error('Failed to fetch teacher rosters from database', error);
    return inMemoryRosters.filter((roster) => roster.teacherId === teacherId);
  }
}

export function getTeacherFocusTags(teacherId: number): string[] {
  return fallbackTeacherFocusTags[teacherId] ?? ['Student success', 'Faculty collaboration'];
}

function sortSchedule(slots: TeacherScheduleSlot[]): TeacherScheduleSlot[] {
  const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return [...slots].sort((a, b) => {
    const dayDiff = order.indexOf(a.weekday) - order.indexOf(b.weekday);
    if (dayDiff !== 0) {
      return dayDiff;
    }

    return a.startTime.localeCompare(b.startTime);
  });
}

export async function buildTeacherDashboard(teacherId: number): Promise<TeacherDashboardData | null> {
  const [teacher, assignments, classrooms, rosterEntries, students, gradebook] = await Promise.all([
    findStaffById(teacherId),
    listTeachingAssignmentsForTeacher(teacherId),
    listClassrooms(),
    listTeacherRosters(teacherId),
    listStudents(),
    listTeacherGrades(teacherId)
  ]);

  if (!teacher) {
    return null;
  }

  const classroomMap = new Map(classrooms.map((room) => [room.id, room]));
  const studentMap = new Map(students.map((student) => [student.id, student]));

  const schedule: TeacherScheduleSlot[] = sortSchedule(
    assignments.map((assignment) => {
      const classroom = classroomMap.get(assignment.classroomId);
      return {
        assignmentId: assignment.id,
        teacherId: assignment.teacherId,
        courseCode: assignment.courseCode,
        courseTitle: assignment.courseTitle,
        weekday: assignment.weekday,
        startTime: assignment.startTime,
        endTime: assignment.endTime,
        classroomName: classroom?.name ?? 'TBA',
        classroomLocation: classroom?.location ?? 'To be assigned',
        studentGroup: assignment.studentGroup,
        majorFocus: assignment.majorFocus
      };
    })
  );

  const roster = rosterEntries.map((entry) => {
    const student = studentMap.get(entry.studentId);
    return {
      courseCode: entry.courseCode,
      courseTitle: entry.courseTitle,
      studentId: entry.studentId,
      studentName: student ? `${student.firstName} ${student.lastName}` : `Student #${entry.studentId}`,
      status: entry.status
    };
  });

  const recentGrades = [...gradebook].sort((a, b) => {
    const timeA = a.recordedAt ? new Date(a.recordedAt).getTime() : 0;
    const timeB = b.recordedAt ? new Date(b.recordedAt).getTime() : 0;
    return timeB - timeA;
  });

  return {
    teacher,
    schedule,
    rosters: roster,
    recentGrades,
    focusTags: getTeacherFocusTags(teacherId)
  };
}
