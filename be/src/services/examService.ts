import { getPool } from '../db/pool.js';
import { fallbackExamAnnouncements } from './fallbackData.js';
import type { ExamAnnouncement } from './types.js';

let inMemoryExams = [...fallbackExamAnnouncements];
let nextExamId = fallbackExamAnnouncements.length + 1;

function normalizeExam(row: any): ExamAnnouncement {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    examDate: row.exam_date instanceof Date ? row.exam_date.toISOString() : row.exam_date,
    postedBy: row.posted_by ?? null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

export async function listExamAnnouncements(): Promise<ExamAnnouncement[]> {
  const pool = getPool();

  if (!pool) {
    return inMemoryExams;
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, title, description, exam_date, posted_by, created_at
       FROM exam_announcements
       ORDER BY exam_date ASC`
    );

    return rows.map(normalizeExam);
  } catch (error) {
    console.error('Failed to fetch exam announcements', error);
    return inMemoryExams;
  }
}

export type CreateExamAnnouncementInput = {
  title: string;
  description: string;
  examDate: string;
};

export async function createExamAnnouncement(
  input: CreateExamAnnouncementInput,
  postedBy?: number
): Promise<ExamAnnouncement> {
  const pool = getPool();

  if (!pool) {
    const exam: ExamAnnouncement = {
      id: nextExamId++,
      title: input.title,
      description: input.description,
      examDate: input.examDate,
      postedBy: postedBy ?? null,
      createdAt: new Date().toISOString()
    };

    inMemoryExams = [...inMemoryExams, exam];
    inMemoryExams.sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
    return exam;
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO exam_announcements (title, description, exam_date, posted_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, description, exam_date, posted_by, created_at`,
      [input.title, input.description, input.examDate, postedBy ?? null]
    );

    return normalizeExam(rows[0]);
  } catch (error) {
    console.error('Failed to create exam announcement', error);
    throw error;
  }
}
