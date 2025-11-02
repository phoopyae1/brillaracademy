import { getPool } from '../db/pool.js';
import {
  fallbackGrades,
  fallbackRegistrationWindows,
  fallbackSemesterGpa
} from './fallbackData.js';
import type { GradeRecord, SemesterGpa, SemesterRegistration } from './types.js';

let inMemoryGrades = [...fallbackGrades];
let inMemoryGpa = [...fallbackSemesterGpa];
let inMemoryRegistrationWindows = [...fallbackRegistrationWindows];

function normalizeGrade(row: any): GradeRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    semester: row.semester,
    grade: row.grade,
    credits: Number(row.credits)
  };
}

function normalizeSemesterGpa(row: any): SemesterGpa {
  return {
    id: row.id,
    studentId: row.student_id,
    semester: row.semester,
    gpa: Number(row.gpa)
  };
}

function normalizeRegistrationWindow(row: any): SemesterRegistration {
  return {
    id: row.id,
    semester: row.semester,
    status: row.status,
    opensAt: row.opens_at instanceof Date ? row.opens_at.toISOString() : row.opens_at,
    closesAt: row.closes_at instanceof Date ? row.closes_at.toISOString() : row.closes_at,
    courses: Array.isArray(row.courses)
      ? row.courses
      : typeof row.courses === 'string'
        ? JSON.parse(row.courses)
        : []
  };
}

export async function listStudentGrades(studentId: number): Promise<GradeRecord[]> {
  const pool = getPool();

  if (!pool) {
    return inMemoryGrades.filter((grade) => grade.studentId === studentId);
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, student_id, course_code, course_title, semester, grade, credits
       FROM grade_records
       WHERE student_id = $1
       ORDER BY semester DESC, course_code ASC`,
      [studentId]
    );

    return rows.map(normalizeGrade);
  } catch (error) {
    console.error('Failed to fetch student grades', error);
    return inMemoryGrades.filter((grade) => grade.studentId === studentId);
  }
}

export async function listStudentSemesterGpa(studentId: number): Promise<SemesterGpa[]> {
  const pool = getPool();

  if (!pool) {
    return inMemoryGpa.filter((record) => record.studentId === studentId);
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, student_id, semester, gpa
       FROM semester_gpa
       WHERE student_id = $1
       ORDER BY semester DESC`,
      [studentId]
    );

    return rows.map(normalizeSemesterGpa);
  } catch (error) {
    console.error('Failed to fetch semester GPA records', error);
    return inMemoryGpa.filter((record) => record.studentId === studentId);
  }
}

export async function listRegistrationWindows(): Promise<SemesterRegistration[]> {
  const pool = getPool();

  if (!pool) {
    return inMemoryRegistrationWindows;
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, semester, status, opens_at, closes_at, courses
       FROM registration_windows
       ORDER BY opens_at ASC`
    );

    return rows.map(normalizeRegistrationWindow);
  } catch (error) {
    console.error('Failed to fetch registration windows', error);
    return inMemoryRegistrationWindows;
  }
}

export function findCourseOffering(
  semester: string,
  courseCode: string
): { window: SemesterRegistration; course: SemesterRegistration['courses'][number] } | null {
  const window = inMemoryRegistrationWindows.find((item) => item.semester === semester);

  if (!window) {
    return null;
  }

  const course = window.courses.find((item) => item.courseCode === courseCode);

  if (!course) {
    return null;
  }

  return { window, course };
}
