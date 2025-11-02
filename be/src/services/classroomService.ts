import { getPool } from '../db/pool.js';
import { fallbackClassrooms } from './fallbackData.js';
import type { Classroom } from './types.js';

let inMemoryClassrooms = [...fallbackClassrooms];
let nextClassroomId = fallbackClassrooms.length + 1;

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
