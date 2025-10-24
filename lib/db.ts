import { createHash } from 'crypto';
import { Pool } from 'pg';
import { Feature, fallbackFeatures } from '@/lib/features';

export interface Student {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string | null;
  primaryInterest: string | null;
  createdAt: string;
}

export interface CreateStudentInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: string;
  primaryInterest?: string;
}

export interface TimetableEntry {
  id: number;
  studentId: number;
  weekday: string;
  startTime: string;
  endTime: string;
  subject: string;
  location: string | null;
}

export interface ScheduleItem {
  id: number;
  studentId: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
}

export interface ClassRegistration {
  id: number;
  studentId: number;
  className: string;
  instructor: string | null;
  status: string;
  registeredAt: string;
}

export interface StudentDashboardData {
  student: Student;
  timetable: TimetableEntry[];
  schedule: ScheduleItem[];
  registrations: ClassRegistration[];
}

const seededPasswordHash = 'f35c3c028c31e04bb4e5f8459825d2567307db506e54b13bce33d6fc392851ee';

const fallbackStudents: Student[] = [
  {
    id: 1,
    firstName: 'Aaliyah',
    lastName: 'Gupta',
    email: 'aaliyah.gupta@example.edu',
    role: 'Student',
    primaryInterest: 'Biomedical Engineering',
    createdAt: new Date('2024-08-12T14:30:00Z').toISOString()
  },
  {
    id: 2,
    firstName: 'Mateo',
    lastName: 'Santos',
    email: 'mateo.santos@example.edu',
    role: 'Student',
    primaryInterest: 'Data Science',
    createdAt: new Date('2024-08-12T14:30:00Z').toISOString()
  }
];

const fallbackTimetables: TimetableEntry[] = [
  {
    id: 1,
    studentId: 1,
    weekday: 'Monday',
    startTime: '09:00',
    endTime: '10:15',
    subject: 'Organic Chemistry Lab',
    location: 'Science Center 204'
  },
  {
    id: 2,
    studentId: 1,
    weekday: 'Tuesday',
    startTime: '11:00',
    endTime: '12:15',
    subject: 'Biomechanics Seminar',
    location: 'Innovation Hub 3A'
  },
  {
    id: 3,
    studentId: 1,
    weekday: 'Thursday',
    startTime: '14:00',
    endTime: '15:30',
    subject: 'Community Health Project',
    location: 'Wellness Studio'
  },
  {
    id: 4,
    studentId: 2,
    weekday: 'Monday',
    startTime: '10:30',
    endTime: '11:45',
    subject: 'Machine Learning',
    location: 'Tech Hall 201'
  },
  {
    id: 5,
    studentId: 2,
    weekday: 'Wednesday',
    startTime: '13:00',
    endTime: '14:15',
    subject: 'Human-Centered Data Viz',
    location: 'Design Loft'
  },
  {
    id: 6,
    studentId: 2,
    weekday: 'Friday',
    startTime: '09:30',
    endTime: '11:00',
    subject: 'Capstone Studio',
    location: 'Analytics Lab'
  }
];

const fallbackSchedules: ScheduleItem[] = [
  {
    id: 1,
    studentId: 1,
    title: 'Advisor Check-in',
    description: 'Monthly meeting with academic advisor to review research proposal.',
    startTime: '2024-09-10T15:00:00Z',
    endTime: '2024-09-10T15:45:00Z'
  },
  {
    id: 2,
    studentId: 1,
    title: 'Wellness Workshop',
    description: 'Guided mindfulness session hosted by the health collaborative.',
    startTime: '2024-09-12T18:00:00Z',
    endTime: '2024-09-12T19:15:00Z'
  },
  {
    id: 3,
    studentId: 2,
    title: 'Data Challenge Sprint',
    description: 'Collaborative sprint with industry mentors on open city datasets.',
    startTime: '2024-09-11T14:00:00Z',
    endTime: '2024-09-11T17:00:00Z'
  },
  {
    id: 4,
    studentId: 2,
    title: 'Mentor Debrief',
    description: 'One-on-one feedback with capstone mentor.',
    startTime: '2024-09-13T16:30:00Z',
    endTime: '2024-09-13T17:15:00Z'
  }
];

const fallbackRegistrations: ClassRegistration[] = [
  {
    id: 1,
    studentId: 1,
    className: 'Global Health Innovation Lab',
    instructor: 'Dr. Priya Raman',
    status: 'registered',
    registeredAt: '2024-08-15T13:00:00Z'
  },
  {
    id: 2,
    studentId: 1,
    className: 'Neuroscience Frontiers',
    instructor: 'Professor Malik Chen',
    status: 'waitlisted',
    registeredAt: '2024-08-16T09:30:00Z'
  },
  {
    id: 3,
    studentId: 2,
    className: 'Advanced Data Ethics',
    instructor: 'Dr. Leila Morgan',
    status: 'registered',
    registeredAt: '2024-08-14T10:45:00Z'
  },
  {
    id: 4,
    studentId: 2,
    className: 'Immersive Visualization Studio',
    instructor: 'Professor Aaron Patel',
    status: 'registered',
    registeredAt: '2024-08-17T11:15:00Z'
  }
];

let inMemoryStudents = [...fallbackStudents];
let inMemoryTimetables = [...fallbackTimetables];
let inMemorySchedules = [...fallbackSchedules];
let inMemoryRegistrations = [...fallbackRegistrations];
let nextStudentId = inMemoryStudents.length ? Math.max(...inMemoryStudents.map((student) => student.id)) + 1 : 1;
const inMemoryStudentSecrets = new Map<number, string>([
  [1, seededPasswordHash],
  [2, seededPasswordHash]
]);

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;

const pool = globalThis.pgPool ??
  (connectionString
    ? new Pool({ connectionString, max: 5, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false })
    : undefined);

if (!globalThis.pgPool && pool) {
  globalThis.pgPool = pool;
}

export async function fetchFeatures(): Promise<Feature[]> {
  if (!pool) {
    return fallbackFeatures;
  }

  try {
    const { rows } = await pool.query<Feature>(
      'SELECT id, name, description, category, icon FROM features ORDER BY id ASC'
    );

    if (!rows.length) {
      return fallbackFeatures;
    }

    return rows;
  } catch (error) {
    console.error('Failed to load features from PostgreSQL. Falling back to static data.', error);
    return fallbackFeatures;
  }
}

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

const studentSelection = `
  id,
  first_name AS "firstName",
  last_name AS "lastName",
  email,
  role,
  primary_interest AS "primaryInterest",
  to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt"
`;

export async function listStudents(): Promise<Student[]> {
  if (!pool) {
    return inMemoryStudents;
  }

  const { rows } = await pool.query<Student>(`SELECT ${studentSelection} FROM students ORDER BY id ASC`);
  return rows;
}

export async function fetchStudentById(studentId: number): Promise<Student | null> {
  if (!Number.isFinite(studentId)) {
    return null;
  }

  if (!pool) {
    return inMemoryStudents.find((student) => student.id === studentId) ?? null;
  }

  const { rows } = await pool.query<Student>(`SELECT ${studentSelection} FROM students WHERE id = $1`, [studentId]);
  return rows[0] ?? null;
}

export async function createStudent(input: CreateStudentInput): Promise<Student> {
  const {
    firstName,
    lastName,
    email,
    password,
    role: incomingRole,
    primaryInterest: incomingPrimaryInterest
  } = input;
  const passwordHash = hashPassword(password);
  const role = incomingRole ?? null;
  const primaryInterest = incomingPrimaryInterest ?? null;

  if (!pool) {
    const now = new Date().toISOString();
    const existing = inMemoryStudents.find((student) => student.email === email);
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    const newStudent: Student = {
      id: nextStudentId++,
      firstName,
      lastName,
      email,
      role,
      primaryInterest,
      createdAt: now
    };

    inMemoryStudents = [...inMemoryStudents, newStudent];
    inMemoryStudentSecrets.set(newStudent.id, passwordHash);
    return newStudent;
  }

  try {
    const { rows } = await pool.query<Student>(
      `INSERT INTO students (first_name, last_name, email, password_hash, role, primary_interest)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${studentSelection}`,
      [firstName, lastName, email, passwordHash, role, primaryInterest]
    );

    return rows[0];
  } catch (error) {
    console.error('Failed to create student account.', error);
    throw error;
  }
}

export async function authenticateStudent(email: string, password: string): Promise<Student | null> {
  const passwordHash = hashPassword(password);

  if (!pool) {
    const student = inMemoryStudents.find((item) => item.email === email);
    if (!student) {
      return null;
    }

    const expectedHash = inMemoryStudentSecrets.get(student.id);
    return expectedHash === passwordHash ? student : null;
  }

  const { rows } = await pool.query<{ password_hash: string } & Student>(
    `SELECT ${studentSelection}, password_hash FROM students WHERE email = $1`,
    [email]
  );

  if (!rows.length) {
    return null;
  }

  const [{ password_hash: storedHash, ...student }] = rows;
  return storedHash === passwordHash ? student : null;
}

export async function fetchStudentDashboard(studentId: number): Promise<StudentDashboardData | null> {
  if (!Number.isFinite(studentId)) {
    return null;
  }

  if (!pool) {
    const student = inMemoryStudents.find((item) => item.id === studentId);
    if (!student) {
      return null;
    }

    return {
      student,
      timetable: inMemoryTimetables.filter((entry) => entry.studentId === studentId),
      schedule: inMemorySchedules.filter((item) => item.studentId === studentId),
      registrations: inMemoryRegistrations.filter((item) => item.studentId === studentId)
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
    console.error('Failed to load dashboard data.', error);
    return null;
  }
}
