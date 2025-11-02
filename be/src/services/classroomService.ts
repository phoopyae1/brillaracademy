import { getPool } from '../db/pool.js';
import { fallbackClassrooms, fallbackClassroomEnrollments } from './fallbackData.js';
import type { Classroom, ClassroomAvailability, ClassroomEnrollment } from './types.js';

let inMemoryClassrooms = [...fallbackClassrooms];
let nextClassroomId = fallbackClassrooms.length + 1;
let inMemoryClassroomEnrollments = [...fallbackClassroomEnrollments];
let nextClassroomEnrollmentId = fallbackClassroomEnrollments.length + 1;

function normalizeClassroom(row: any): Classroom {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    capacity: row.capacity,
    resources: Array.isArray(row.resources)
      ? row.resources
      : typeof row.resources === 'string'
        ? JSON.parse(row.resources)
        : [],
    createdBy: row.created_by ?? null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

function normalizeClassroomEnrollment(row: any): ClassroomEnrollment {
  return {
    id: row.id,
    studentId: row.student_id ?? row.studentId,
    classroomId: row.classroom_id ?? row.classroomId,
    status: (row.status ?? 'enrolled') as ClassroomEnrollment['status'],
    registeredAt:
      row.registered_at instanceof Date
        ? row.registered_at.toISOString()
        : row.registered_at ?? new Date().toISOString()
  };
}

export async function listClassrooms(): Promise<Classroom[]> {
  const pool = getPool();

  if (!pool) {
    return inMemoryClassrooms;
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, name, location, capacity, resources, created_by, created_at
       FROM classrooms
       ORDER BY created_at DESC`
    );

    return rows.map(normalizeClassroom);
  } catch (error) {
    console.error('Failed to list classrooms from database', error);
    return inMemoryClassrooms;
  }
}

export async function getClassroomById(id: number): Promise<Classroom | null> {
  if (!Number.isFinite(id)) {
    return null;
  }

  const pool = getPool();

  if (!pool) {
    return inMemoryClassrooms.find((room) => room.id === id) ?? null;
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, name, location, capacity, resources, created_by, created_at
       FROM classrooms
       WHERE id = $1`,
      [id]
    );

    if (!rows.length) {
      return null;
    }

    return normalizeClassroom(rows[0]);
  } catch (error) {
    console.error('Failed to fetch classroom by id', error);
    return null;
  }
}

export type CreateClassroomInput = {
  name: string;
  location: string;
  capacity: number;
  resources?: string[];
};

export async function createClassroom(
  input: CreateClassroomInput,
  createdBy?: number
): Promise<Classroom> {
  const pool = getPool();
  const resources = input.resources ?? [];

  if (!pool) {
    const classroom: Classroom = {
      id: nextClassroomId++,
      name: input.name,
      location: input.location,
      capacity: input.capacity,
      resources,
      createdBy: createdBy ?? null,
      createdAt: new Date().toISOString()
    };

    inMemoryClassrooms = [classroom, ...inMemoryClassrooms];
    return classroom;
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO classrooms (name, location, capacity, resources, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, location, capacity, resources, created_by, created_at`,
      [input.name, input.location, input.capacity, JSON.stringify(resources), createdBy ?? null]
    );

    return normalizeClassroom(rows[0]);
  } catch (error) {
    console.error('Failed to create classroom', error);
    throw error;
  }
}

function buildEnrollmentCountsMap(enrollments: ClassroomEnrollment[]): Map<number, number> {
  const counts = new Map<number, number>();

  for (const enrollment of enrollments) {
    counts.set(enrollment.classroomId, (counts.get(enrollment.classroomId) ?? 0) + 1);
  }

  return counts;
}

async function getClassroomEnrollmentCounts(): Promise<Map<number, number>> {
  const pool = getPool();

  if (!pool) {
    return buildEnrollmentCountsMap(inMemoryClassroomEnrollments);
  }

  try {
    const { rows } = await pool.query<{ classroom_id: number; count: number }>(
      `SELECT classroom_id, COUNT(*)::int AS count
       FROM classroom_registrations
       GROUP BY classroom_id`
    );

    const counts = new Map<number, number>();
    for (const row of rows) {
      counts.set(Number(row.classroom_id), Number(row.count));
    }

    return counts;
  } catch (error) {
    console.error('Failed to count classroom registrations', error);
    return new Map();
  }
}

async function getClassroomEnrollmentCount(classroomId: number): Promise<number> {
  const pool = getPool();

  if (!pool) {
    return inMemoryClassroomEnrollments.filter((item) => item.classroomId === classroomId).length;
  }

  try {
    const { rows } = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM classroom_registrations
       WHERE classroom_id = $1`,
      [classroomId]
    );

    return rows.length ? Number(rows[0].count) : 0;
  } catch (error) {
    console.error('Failed to count classroom registrations for classroom', error);
    return 0;
  }
}

async function findStudentClassroomEnrollment(
  studentId: number,
  classroomId: number
): Promise<ClassroomEnrollment | null> {
  const pool = getPool();

  if (!pool) {
    return (
      inMemoryClassroomEnrollments.find(
        (item) => item.studentId === studentId && item.classroomId === classroomId
      ) ?? null
    );
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, classroom_id, student_id, status, registered_at
       FROM classroom_registrations
       WHERE classroom_id = $1 AND student_id = $2`,
      [classroomId, studentId]
    );

    if (!rows.length) {
      return null;
    }

    return normalizeClassroomEnrollment(rows[0]);
  } catch (error) {
    console.error('Failed to locate classroom enrollment', error);
    return null;
  }
}

export async function listClassroomEnrollmentsForStudent(
  studentId: number
): Promise<ClassroomEnrollment[]> {
  if (!Number.isFinite(studentId)) {
    return [];
  }

  const pool = getPool();

  if (!pool) {
    return inMemoryClassroomEnrollments
      .filter((item) => item.studentId === studentId)
      .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, classroom_id, student_id, status,
              to_char(registered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS registered_at
       FROM classroom_registrations
       WHERE student_id = $1
       ORDER BY registered_at DESC`,
      [studentId]
    );

    return rows.map(normalizeClassroomEnrollment);
  } catch (error) {
    console.error('Failed to list classroom enrollments for student', error);
    return [];
  }
}

export async function listClassroomsWithAvailability(): Promise<ClassroomAvailability[]> {
  const [classrooms, counts] = await Promise.all([listClassrooms(), getClassroomEnrollmentCounts()]);

  return classrooms.map((room) => {
    const seatsFilled = counts.get(room.id) ?? 0;
    const seatsAvailable = Math.max(room.capacity - seatsFilled, 0);

    return {
      ...room,
      seatsFilled,
      seatsAvailable,
      isFull: seatsAvailable === 0
    } satisfies ClassroomAvailability;
  });
}

export async function registerStudentForClassroom(
  studentId: number,
  classroomId: number
): Promise<ClassroomEnrollment> {
  if (!Number.isFinite(studentId) || !Number.isFinite(classroomId)) {
    throw new Error('Invalid registration request.');
  }

  const classroom = await getClassroomById(classroomId);

  if (!classroom) {
    throw new Error('Classroom not found.');
  }

  const existing = await findStudentClassroomEnrollment(studentId, classroomId);

  if (existing) {
    throw new Error('You are already registered for this classroom.');
  }

  const seatsFilled = await getClassroomEnrollmentCount(classroomId);

  if (seatsFilled >= classroom.capacity) {
    throw new Error('This classroom is already full.');
  }

  const pool = getPool();

  if (!pool) {
    const enrollment: ClassroomEnrollment = {
      id: nextClassroomEnrollmentId++,
      studentId,
      classroomId,
      status: 'enrolled',
      registeredAt: new Date().toISOString()
    };

    inMemoryClassroomEnrollments = [enrollment, ...inMemoryClassroomEnrollments];
    return enrollment;
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO classroom_registrations (classroom_id, student_id, status)
       VALUES ($1, $2, 'enrolled')
       RETURNING id, classroom_id, student_id, status,
                 to_char(registered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS registered_at`,
      [classroomId, studentId]
    );

    return normalizeClassroomEnrollment(rows[0]);
  } catch (error: any) {
    const duplicate = error?.code === '23505';

    if (duplicate) {
      throw new Error('You are already registered for this classroom.');
    }

    console.error('Failed to register student for classroom', error);
    throw new Error('Unable to register for this classroom right now.');
  }
}
