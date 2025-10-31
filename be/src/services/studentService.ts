import bcrypt from 'bcryptjs';
import { getPool } from '../db/pool.js';
import {
  fallbackStudents,
  fallbackTimetables,
  fallbackSchedules,
  fallbackRegistrations,
  seededPasswordHash
} from './fallbackData.js';
import type {
  ClassRegistration,
  CreateStudentInput,
  ScheduleItem,
  Student,
  StudentDashboardData,
  TimetableEntry
} from './types.js';

let inMemoryStudents = [...fallbackStudents];
let inMemoryTimetables = [...fallbackTimetables];
let inMemorySchedules = [...fallbackSchedules];
let inMemoryRegistrations = [...fallbackRegistrations];
let inMemorySecrets = new Map<number, string>(
  fallbackStudents.map((student) => [student.id, seededPasswordHash])
);
let nextStudentId = fallbackStudents.length + 1;

function normalizeStudent(row: any): Student {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: row.role,
    primaryInterest: row.primary_interest,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

export async function listStudents(): Promise<Student[]> {
  const pool = getPool();

  if (!pool) {
    return inMemoryStudents;
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, first_name, last_name, email, role, primary_interest, created_at
       FROM students
       ORDER BY created_at DESC`
    );
    return rows.map(normalizeStudent);
  } catch (error) {
    console.error('Failed to fetch students from database', error);
    return inMemoryStudents;
  }
}

export async function fetchStudentById(id: number): Promise<Student | null> {
  if (!Number.isFinite(id)) {
    return null;
  }

  const pool = getPool();

  if (!pool) {
    return inMemoryStudents.find((student) => student.id === id) ?? null;
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, first_name, last_name, email, role, primary_interest, created_at
       FROM students
       WHERE id = $1`,
      [id]
    );

    if (!rows.length) {
      return null;
    }

    return normalizeStudent(rows[0]);
  } catch (error) {
    console.error('Failed to fetch student by id', error);
    return null;
  }
}

export async function createStudent(input: CreateStudentInput): Promise<Student> {
  const { firstName, lastName, email, password, role, primaryInterest } = input;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const pool = getPool();

  if (!pool) {
    const student: Student = {
      id: nextStudentId++,
      firstName,
      lastName,
      email,
      role: role ?? 'Student',
      primaryInterest: primaryInterest ?? null,
      createdAt: new Date().toISOString()
    };

    inMemoryStudents = [student, ...inMemoryStudents];
    inMemorySecrets.set(student.id, hashedPassword);
    return student;
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO students (first_name, last_name, email, password_hash, role, primary_interest)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, first_name, last_name, email, role, primary_interest, created_at`,
      [firstName, lastName, email, hashedPassword, role ?? 'Student', primaryInterest ?? null]
    );

    return normalizeStudent(rows[0]);
  } catch (error) {
    console.error('Failed to create student', error);
    throw error;
  }
}

export async function authenticateStudent(email: string, password: string): Promise<Student | null> {
  const pool = getPool();

  if (!pool) {
    const student = inMemoryStudents.find((item) => item.email === email);
    if (!student) {
      return null;
    }

    const expectedHash = inMemorySecrets.get(student.id);
    return expectedHash && bcrypt.compareSync(password, expectedHash) ? student : null;
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, first_name, last_name, email, role, primary_interest, created_at, password_hash
       FROM students
       WHERE email = $1`,
      [email]
    );

    if (!rows.length) {
      return null;
    }

    const [row] = rows;
    const passwordMatches = await bcrypt.compare(password, row.password_hash);
    return passwordMatches ? normalizeStudent(row) : null;
  } catch (error) {
    console.error('Failed to authenticate student', error);
    return null;
  }
}

export async function fetchStudentDashboard(studentId: number): Promise<StudentDashboardData | null> {
  if (!Number.isFinite(studentId)) {
    return null;
  }

  const pool = getPool();

  if (!pool) {
    const student = inMemoryStudents.find((item) => item.id === studentId);
    if (!student) {
      return null;
    }

    return {
      student,
      timetable: inMemoryTimetables.filter((entry) => entry.studentId === studentId),
      schedule: inMemorySchedules.filter((entry) => entry.studentId === studentId),
      registrations: inMemoryRegistrations.filter((entry) => entry.studentId === studentId)
    };
  }

  try {
    const student = await fetchStudentById(studentId);
    if (!student) {
      return null;
    }

    const [timetableResult, scheduleResult, registrationsResult] = await Promise.all([
      pool.query<TimetableEntry>(
        `SELECT id, student_id AS "studentId", weekday, to_char(start_time, 'HH24:MI') AS "startTime",
                to_char(end_time, 'HH24:MI') AS "endTime", subject, location
         FROM timetables
         WHERE student_id = $1
         ORDER BY CASE weekday
           WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 ELSE 7 END,
           start_time ASC`,
        [studentId]
      ),
      pool.query<ScheduleItem>(
        `SELECT id, student_id AS "studentId", title, description,
                to_char(start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "startTime",
                to_char(end_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "endTime"
         FROM schedules
         WHERE student_id = $1
         ORDER BY start_time ASC`,
        [studentId]
      ),
      pool.query<ClassRegistration>(
        `SELECT id, student_id AS "studentId", class_name AS "className", instructor, status,
                to_char(registered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "registeredAt"
         FROM class_registrations
         WHERE student_id = $1
         ORDER BY registered_at DESC`,
        [studentId]
      )
    ]);

    return {
      student,
      timetable: timetableResult.rows,
      schedule: scheduleResult.rows,
      registrations: registrationsResult.rows
    };
  } catch (error) {
    console.error('Failed to fetch student dashboard', error);
    return null;
  }
}
