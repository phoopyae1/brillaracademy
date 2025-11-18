import { getPool } from '../db/pool.js';
import {
  fallbackGrades,
  fallbackRegistrationWindows,
  fallbackSemesterGpa
} from './fallbackData.js';
import type { GradeRecord, SemesterGpa, SemesterRegistration } from './types.js';
import { recordAtenxionTransaction } from './atenxionService.js';

let inMemoryGrades = [...fallbackGrades];
let nextGradeId = fallbackGrades.length + 1;
let inMemoryGpa = [...fallbackSemesterGpa];
let inMemoryRegistrationWindows = [...fallbackRegistrationWindows];

export const GPA_BASE_SCALE = 4;
export const GPA_TARGET_SCALE = 3;
export const GPA_SCALE_FACTOR = GPA_TARGET_SCALE / GPA_BASE_SCALE;

const BASE_GRADE_POINTS: Record<string, number> = {
  'A+': 4.0,
  'A': 4.0,
  'A-': 3.7,
  'B+': 3.3,
  'B': 3.0,
  'B-': 2.7,
  'C+': 2.3,
  'C': 2.0,
  'C-': 1.7,
  'D+': 1.3,
  'D': 1.0,
  'D-': 0.7,
  'F': 0.0
};

const GRADE_POINT_MAP: Record<string, number> = Object.fromEntries(
  Object.entries(BASE_GRADE_POINTS).map(([grade, value]) => [
    grade,
    Math.round(value * GPA_SCALE_FACTOR * 100) / 100
  ])
);

function normalizeGrade(row: any): GradeRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    semester: row.semester,
    grade: row.grade,
    credits: Number(row.credits),
    recordedBy: row.recorded_by ?? row.recordedBy ?? null,
    recordedAt:
      row.recorded_at instanceof Date
        ? row.recorded_at.toISOString()
        : row.recorded_at ?? undefined
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
    console.log(`[AcademicService] No database pool, using in-memory grades for student ${studentId}`);
    const inMemoryResult = inMemoryGrades.filter((grade) => grade.studentId === studentId);
    console.log(`[AcademicService] Found ${inMemoryResult.length} in-memory grade(s) for student ${studentId}`);
    return inMemoryResult;
  }

  try {
    console.log(`[AcademicService] Fetching grades for student ${studentId} from database`);
    const { rows } = await pool.query(
      `SELECT id, student_id, course_code, course_title, semester, grade, credits, recorded_by, recorded_at
       FROM grade_records
       WHERE student_id = $1
       ORDER BY semester DESC, course_code ASC`,
      [studentId]
    );

    console.log(`[AcademicService] Found ${rows.length} grade record(s) for student ${studentId} in database`);
    if (rows.length > 0) {
      console.log(`[AcademicService] Sample grade records:`, rows.slice(0, 3).map((r: any) => ({
        id: r.id,
        courseCode: r.course_code,
        courseTitle: r.course_title,
        semester: r.semester,
        grade: r.grade,
        studentId: r.student_id
      })));
    }

    const normalizedGrades = rows.map(normalizeGrade);
    console.log(`[AcademicService] Returning ${normalizedGrades.length} normalized grade(s) for student ${studentId}`);
    return normalizedGrades;
  } catch (error) {
    console.error(`[AcademicService] Failed to fetch student grades for student ${studentId}:`, error);
    const fallbackResult = inMemoryGrades.filter((grade) => grade.studentId === studentId);
    console.log(`[AcademicService] Falling back to ${fallbackResult.length} in-memory grade(s) for student ${studentId}`);
    return fallbackResult;
  }
}

export async function listTeacherGrades(teacherId: number): Promise<GradeRecord[]> {
  const pool = getPool();

  if (!pool) {
    return inMemoryGrades.filter((grade) => grade.recordedBy === teacherId);
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, student_id, course_code, course_title, semester, grade, credits, recorded_by, recorded_at
       FROM grade_records
       WHERE recorded_by = $1
       ORDER BY recorded_at DESC NULLS LAST, semester DESC`,
      [teacherId]
    );

    return rows.map(normalizeGrade);
  } catch (error) {
    console.error('Failed to fetch teacher gradebook', error);
    return inMemoryGrades.filter((grade) => grade.recordedBy === teacherId);
  }
}

export async function listStudentSemesterGpa(studentId: number): Promise<SemesterGpa[]> {
  const pool = getPool();

  if (!pool) {
    console.log(`[AcademicService] No database pool, using in-memory GPA for student ${studentId}`);
    const inMemoryResult = inMemoryGpa.filter((record) => record.studentId === studentId);
    console.log(`[AcademicService] Found ${inMemoryResult.length} in-memory GPA record(s) for student ${studentId}`);
    return inMemoryResult;
  }

  try {
    console.log(`[AcademicService] Fetching GPA records for student ${studentId} from database`);
    const { rows } = await pool.query(
      `SELECT id, student_id, semester, gpa
       FROM semester_gpa
       WHERE student_id = $1
       ORDER BY semester DESC`,
      [studentId]
    );

    console.log(`[AcademicService] Found ${rows.length} GPA record(s) for student ${studentId} in database`);
    if (rows.length > 0) {
      console.log(`[AcademicService] GPA records:`, rows.map((r: any) => ({
        semester: r.semester,
        gpa: r.gpa
      })));
    }

    // If no GPA records found but student has grades, calculate GPA
    if (rows.length === 0) {
      console.log(`[AcademicService] No GPA records found for student ${studentId}. Checking for grades...`);
      
      // Get all unique semesters with grades for this student
      const semestersResult = await pool.query(
        `SELECT DISTINCT semester
         FROM grade_records
         WHERE student_id = $1 AND credits > 0`,
        [studentId]
      );

      if (semestersResult.rows.length > 0) {
        console.log(`[AcademicService] Found grades in ${semestersResult.rows.length} semester(s) for student ${studentId}. Calculating GPA...`);
        // Calculate GPA for each semester
        for (const semesterRow of semestersResult.rows) {
          const semester = semesterRow.semester;
          await calculateAndUpdateSemesterGPA(studentId, semester);
        }
        
        // Re-fetch GPA records after calculation
        const updatedRows = await pool.query(
          `SELECT id, student_id, semester, gpa
           FROM semester_gpa
           WHERE student_id = $1
           ORDER BY semester DESC`,
          [studentId]
        );
        console.log(`[AcademicService] After calculation, found ${updatedRows.rows.length} GPA record(s) for student ${studentId}`);
        return updatedRows.rows.map(normalizeSemesterGpa);
      }
    }

    return rows.map(normalizeSemesterGpa);
  } catch (error) {
    console.error(`[AcademicService] Failed to fetch semester GPA records for student ${studentId}:`, error);
    const fallbackResult = inMemoryGpa.filter((record) => record.studentId === studentId);
    console.log(`[AcademicService] Falling back to ${fallbackResult.length} in-memory GPA record(s) for student ${studentId}`);
    return fallbackResult;
  }
}

export async function listRegistrationWindows(): Promise<SemesterRegistration[]> {
  const pool = getPool();

  if (!pool) {
    return inMemoryRegistrationWindows;
  }

  try {
    // Use FULL OUTER JOIN to show registration windows from both tables
    // Priority: semester_dates dates > registration_windows dates
    // If semester_dates exists but no registration_windows, create a default window
    const { rows } = await pool.query(
      `SELECT 
        COALESCE(rw.id, sd.id) AS id,
        COALESCE(rw.semester, sd.semester) AS semester,
        COALESCE(rw.status, 'upcoming') AS status,
        COALESCE(rw.courses, '[]'::jsonb) AS courses,
        -- Always use semester_dates if available, otherwise use registration_windows dates
        -- Convert dates to timestamps in Singapore timezone first, then to UTC for API
        CASE 
          WHEN sd.start_date IS NOT NULL THEN 
            to_char((sd.start_date::date::timestamp AT TIME ZONE 'Asia/Singapore' AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
          WHEN rw.opens_at IS NOT NULL THEN
            to_char(rw.opens_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
          ELSE 
            NULL
        END AS opens_at,
        CASE 
          WHEN sd.end_date IS NOT NULL THEN 
            to_char(((sd.end_date::date + INTERVAL '1 day' - INTERVAL '1 second')::timestamp AT TIME ZONE 'Asia/Singapore' AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
          WHEN rw.closes_at IS NOT NULL THEN
            to_char(rw.closes_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
          ELSE 
            NULL
        END AS closes_at
       FROM semester_dates sd
       FULL OUTER JOIN registration_windows rw ON sd.semester = rw.semester
       WHERE sd.semester IS NOT NULL OR rw.semester IS NOT NULL
       ORDER BY COALESCE(sd.start_date, rw.opens_at) ASC`
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

/**
 * Converts letter grade to grade point (3.0 scale, A+ = 3.0)
 */
export function gradeToPoint(grade: string): number {
  const normalizedGrade = grade.trim().toUpperCase();
  return GRADE_POINT_MAP[normalizedGrade] ?? 0.0;
}

/**
 * Calculates and updates GPA for a student in a specific semester
 */
async function calculateAndUpdateSemesterGPA(studentId: number, semester: string): Promise<void> {
  const pool = getPool();
  if (!pool) {
    console.log(`[AcademicService] No database pool, skipping GPA calculation for student ${studentId}, semester ${semester}`);
    return;
  }

  try {
    // Get all grades for this student in this semester
    const gradesResult = await pool.query(
      `SELECT grade, credits
       FROM grade_records
       WHERE student_id = $1 AND semester = $2
       AND credits > 0`,
      [studentId, semester]
    );

    if (gradesResult.rows.length === 0) {
      console.log(`[AcademicService] No grades found for student ${studentId}, semester ${semester}. Skipping GPA calculation.`);
      return;
    }

    // Calculate weighted GPA
    let totalPoints = 0;
    let totalCredits = 0;

    for (const row of gradesResult.rows) {
      const grade = row.grade;
      const credits = Number(row.credits);
      const points = gradeToPoint(grade);
      
      totalPoints += points * credits;
      totalCredits += credits;
    }

    if (totalCredits === 0) {
      console.log(`[AcademicService] Total credits is 0 for student ${studentId}, semester ${semester}. Skipping GPA calculation.`);
      return;
    }

    const gpa = totalPoints / totalCredits;
    const roundedGpa = Math.round(gpa * 100) / 100; // Round to 2 decimal places

    console.log(`[AcademicService] Calculating GPA for student ${studentId}, semester ${semester}:`, {
      totalPoints,
      totalCredits,
      calculatedGpa: roundedGpa,
      gradesCount: gradesResult.rows.length
    });

    // Insert or update GPA record
    await pool.query(
      `INSERT INTO semester_gpa (student_id, semester, gpa)
       VALUES ($1, $2, $3)
       ON CONFLICT (student_id, semester)
       DO UPDATE SET gpa = $3`,
      [studentId, semester, roundedGpa]
    );

    console.log(`[AcademicService] ✓ Successfully updated GPA for student ${studentId}, semester ${semester}: ${roundedGpa}`);
  } catch (error) {
    console.error(`[AcademicService] Failed to calculate/update GPA for student ${studentId}, semester ${semester}:`, error);
    // Don't throw - GPA calculation failure shouldn't prevent grade recording
  }
}

export type RecordStudentGradeInput = {
  studentId: number;
  courseCode: string;
  courseTitle: string;
  semester: string;
  grade: string;
  credits: number;
};

export async function recordStudentGrade(
  input: RecordStudentGradeInput,
  recordedBy: number
): Promise<GradeRecord> {
  const pool = getPool();
  const recordedAt = new Date().toISOString();

  if (!pool) {
    // Check if grade already exists in memory
    const existingIndex = inMemoryGrades.findIndex(
      (g) => g.studentId === input.studentId && g.courseCode === input.courseCode && g.semester === input.semester
    );

    if (existingIndex >= 0) {
      // Update existing grade
      const existing = inMemoryGrades[existingIndex];
      const updated: GradeRecord = {
        ...existing,
        grade: input.grade,
        credits: input.credits,
        courseTitle: input.courseTitle,
        recordedBy,
        recordedAt
      };
      inMemoryGrades[existingIndex] = updated;
      console.log(`[AcademicService] Updated in-memory grade (ID: ${existing.id}, old grade: ${existing.grade} → new grade: ${input.grade})`);
      void recordAtenxionTransaction(String(input.studentId)).catch((error) =>
        console.error('[AcademicService] Failed to record Atenxion transaction (in-memory update):', error)
      );
      return updated;
    } else {
      // Create new grade
      const record: GradeRecord = {
        id: nextGradeId++,
        ...input,
        recordedBy,
        recordedAt
      };
      inMemoryGrades = [record, ...inMemoryGrades];
      console.log(`[AcademicService] Created new in-memory grade record (ID: ${record.id})`);
      void recordAtenxionTransaction(String(input.studentId)).catch((error) =>
        console.error('[AcademicService] Failed to record Atenxion transaction (in-memory create):', error)
      );
      return record;
    }
  }

  try {
    console.log(`[AcademicService] Recording grade for student ${input.studentId}:`, {
      courseCode: input.courseCode,
      courseTitle: input.courseTitle,
      semester: input.semester,
      grade: input.grade,
      credits: input.credits,
      recordedBy,
      recordedAt
    });

    // Check if grades already exist for this student + course + semester combination
    const existingGradesResult = await pool.query(
      `SELECT id, grade, credits, recorded_by, recorded_at
       FROM grade_records
       WHERE student_id = $1 AND course_code = $2 AND semester = $3
       ORDER BY recorded_at DESC`,
      [input.studentId, input.courseCode, input.semester]
    );

    let savedGrade: GradeRecord;

    if (existingGradesResult.rows.length > 0) {
      // Grade(s) already exist - update the most recent one and delete older duplicates
      const mostRecentId = existingGradesResult.rows[0].id;
      const existingGrade = existingGradesResult.rows[0].grade;
      const duplicateCount = existingGradesResult.rows.length;
      
      console.log(`[AcademicService] Found ${duplicateCount} existing grade record(s) for student ${input.studentId}, course ${input.courseCode}, semester ${input.semester}. Most recent ID: ${mostRecentId}, old grade: ${existingGrade}. Updating most recent and removing duplicates...`);

      // Update the most recent grade record
      const updateResult = await pool.query(
        `UPDATE grade_records
         SET grade = $1, credits = $2, course_title = $3, recorded_by = $4, recorded_at = $5
         WHERE id = $6
         RETURNING id, student_id, course_code, course_title, semester, grade, credits, recorded_by, recorded_at`,
        [
          input.grade,
          input.credits,
          input.courseTitle,
          recordedBy,
          recordedAt,
          mostRecentId
        ]
      );

      savedGrade = normalizeGrade(updateResult.rows[0]);

      // Delete all other duplicate records (keep only the one we just updated)
      if (duplicateCount > 1) {
        const deleteResult = await pool.query(
          `DELETE FROM grade_records
           WHERE student_id = $1 AND course_code = $2 AND semester = $3 AND id != $4`,
          [input.studentId, input.courseCode, input.semester, mostRecentId]
        );
        const deletedCount = (deleteResult as any).rowCount || duplicateCount - 1;
        console.log(`[AcademicService] ✓ Deleted ${deletedCount} duplicate grade record(s), kept most recent (ID: ${mostRecentId})`);
      }

      console.log(`[AcademicService] ✓ Successfully updated grade record (ID: ${mostRecentId}):`, {
        id: savedGrade.id,
        studentId: savedGrade.studentId,
        courseCode: savedGrade.courseCode,
        courseTitle: savedGrade.courseTitle,
        grade: savedGrade.grade,
        semester: savedGrade.semester,
        oldGrade: existingGrade,
        duplicatesRemoved: duplicateCount - 1
      });
    } else {
      // No existing grade - insert new one
      const insertResult = await pool.query(
        `INSERT INTO grade_records (student_id, course_code, course_title, semester, grade, credits, recorded_by, recorded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, student_id, course_code, course_title, semester, grade, credits, recorded_by, recorded_at`,
        [
          input.studentId,
          input.courseCode,
          input.courseTitle,
          input.semester,
          input.grade,
          input.credits,
          recordedBy,
          recordedAt
        ]
      );

      savedGrade = normalizeGrade(insertResult.rows[0]);
      console.log(`[AcademicService] ✓ Successfully created new grade record:`, {
        id: savedGrade.id,
        studentId: savedGrade.studentId,
        courseCode: savedGrade.courseCode,
        courseTitle: savedGrade.courseTitle,
        grade: savedGrade.grade,
        semester: savedGrade.semester
      });
    }

    // Calculate and update GPA for this semester (after insert or update)
    await calculateAndUpdateSemesterGPA(input.studentId, input.semester);

    void recordAtenxionTransaction(String(input.studentId)).catch((error) =>
      console.error('[AcademicService] Failed to record Atenxion transaction (database):', error)
    );

    return savedGrade;
  } catch (error) {
    console.error('Failed to persist grade record, falling back to in-memory store', error);
    const record: GradeRecord = {
      id: nextGradeId++,
      ...input,
      recordedBy,
      recordedAt
    };
    inMemoryGrades = [record, ...inMemoryGrades];
    return record;
  }
}
