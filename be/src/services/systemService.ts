import { getPool } from '../db/pool.js';

export async function getSystemSetting(key: string): Promise<string | null> {
  const pool = getPool();
  
  if (!pool) {
    // In-memory fallback
    if (key === 'current_semester') {
      return '1/2026';
    }
    return null;
  }

  try {
    const { rows } = await pool.query(
      `SELECT value FROM system_settings WHERE key = $1`,
      [key]
    );

    return rows.length > 0 ? rows[0].value : null;
  } catch (error) {
    console.error('Failed to fetch system setting', error);
    return null;
  }
}

export async function setSystemSetting(
  key: string,
  value: string,
  updatedBy?: number
): Promise<void> {
  const pool = getPool();

  if (!pool) {
    // In-memory mode - settings not persisted
    throw new Error('Database connection not available. Cannot persist system settings.');
  }

  try {
    await pool.query(
      `INSERT INTO system_settings (key, value, updated_by, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value,
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()`,
      [key, value, updatedBy ?? null]
    );
  } catch (error: any) {
    console.error('Failed to set system setting', error);
    // Provide more detailed error message
    if (error?.code === '42P01') {
      throw new Error('System settings table does not exist. Please run the database schema migration.');
    }
    if (error?.code === '23505') {
      throw new Error('System setting already exists with this key.');
    }
    throw new Error(`Database error: ${error?.message || 'Unknown error'}`);
  }
}

export async function getCurrentSemester(): Promise<string> {
  const currentSemester = await getSystemSetting('current_semester');
  return currentSemester || '1/2026';
}

export type SemesterDate = {
  id: number;
  semester: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
};

export async function getSemesterDate(semester: string): Promise<SemesterDate | null> {
  const pool = getPool();
  
  if (!pool) {
    return null;
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, semester, start_date, end_date, created_at, updated_at
       FROM semester_dates
       WHERE semester = $1`,
      [semester]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      semester: row.semester,
      startDate: row.start_date instanceof Date ? row.start_date.toISOString().split('T')[0] : row.start_date,
      endDate: row.end_date instanceof Date ? row.end_date.toISOString().split('T')[0] : row.end_date,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
    };
  } catch (error) {
    console.error('Failed to fetch semester date', error);
    return null;
  }
}

export async function setSemesterDate(
  semester: string,
  startDate: string,
  endDate: string,
  updatedBy?: number
): Promise<SemesterDate> {
  const pool = getPool();

  if (!pool) {
    throw new Error('Database connection not available.');
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO semester_dates (semester, start_date, end_date, created_by, updated_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $4, NOW(), NOW())
       ON CONFLICT (semester) DO UPDATE
       SET start_date = EXCLUDED.start_date,
           end_date = EXCLUDED.end_date,
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()
       RETURNING id, semester, start_date, end_date, created_at, updated_at`,
      [semester, startDate, endDate, updatedBy ?? null]
    );

    const row = rows[0];
    return {
      id: row.id,
      semester: row.semester,
      startDate: row.start_date instanceof Date ? row.start_date.toISOString().split('T')[0] : row.start_date,
      endDate: row.end_date instanceof Date ? row.end_date.toISOString().split('T')[0] : row.end_date,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
    };
  } catch (error) {
    console.error('Failed to set semester date', error);
    throw error;
  }
}

export async function listSemesterDates(): Promise<SemesterDate[]> {
  const pool = getPool();
  
  if (!pool) {
    return [];
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, semester, start_date, end_date, created_at, updated_at
       FROM semester_dates
       ORDER BY semester DESC`
    );

    return rows.map((row) => ({
      id: row.id,
      semester: row.semester,
      startDate: row.start_date instanceof Date ? row.start_date.toISOString().split('T')[0] : row.start_date,
      endDate: row.end_date instanceof Date ? row.end_date.toISOString().split('T')[0] : row.end_date,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
    }));
  } catch (error) {
    console.error('Failed to list semester dates', error);
    return [];
  }
}

export type RegistrationStatus = {
  open: boolean;
  reason?: 'not_started' | 'ended' | 'window_closed' | 'status_closed';
  message?: string;
};

export async function isRegistrationPeriodOpen(semester: string): Promise<boolean> {
  const result = await getRegistrationStatus(semester);
  return result.open;
}

export async function getRegistrationStatus(semester: string): Promise<RegistrationStatus> {
  const pool = getPool();
  
  if (!pool) {
    return { open: true }; // Allow registration if database not available (fallback mode)
  }

  try {
    const now = new Date();
    // Set time to start of day for date comparison (00:00:00)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    // First, check semester dates from semester_dates table
    const semesterDateRows = await pool.query(
      `SELECT start_date, end_date
       FROM semester_dates
       WHERE semester = $1`,
      [semester]
    );

    if (semesterDateRows.rows.length > 0) {
      const semesterStartDate = semesterDateRows.rows[0].start_date instanceof Date 
        ? semesterDateRows.rows[0].start_date 
        : new Date(semesterDateRows.rows[0].start_date);
      const semesterEndDate = semesterDateRows.rows[0].end_date instanceof Date 
        ? semesterDateRows.rows[0].end_date 
        : new Date(semesterDateRows.rows[0].end_date);
      
      // Set semester start date to start of day for comparison
      const semesterStart = new Date(semesterStartDate.getFullYear(), semesterStartDate.getMonth(), semesterStartDate.getDate(), 0, 0, 0);
      // Set semester end date to end of day for comparison
      const semesterEnd = new Date(semesterEndDate.getFullYear(), semesterEndDate.getMonth(), semesterEndDate.getDate(), 23, 59, 59);
      
      // If current date is before semester start date, registration is not open yet
      if (today < semesterStart) {
        const startDateStr = semesterStartDate.toISOString().split('T')[0];
        console.log(`[SystemService] Registration closed: Current date is before semester ${semester} start date (${startDateStr})`);
        return {
          open: false,
          reason: 'not_started',
          message: `Registration is not open yet. The semester starts on ${startDateStr}.`
        };
      }
      
      // If semester end date has passed, registration is closed
      if (today > semesterEnd) {
        const endDateStr = semesterEndDate.toISOString().split('T')[0];
        console.log(`[SystemService] Registration closed: Semester ${semester} end date (${endDateStr}) has passed`);
        return {
          open: false,
          reason: 'ended',
          message: `Registration period has ended. The semester ended on ${endDateStr}.`
        };
      }
    }

    // Also check registration window closes_at
    const { rows } = await pool.query(
      `SELECT closes_at, status
       FROM registration_windows
       WHERE semester = $1`,
      [semester]
    );

    if (rows.length === 0) {
      // No registration window found - check if semester dates exist
      // If semester dates exist and we're within the range, allow registration
      // If no semester dates, allow registration (backward compatibility)
      // Note: We already checked semester dates above, so if we reach here and dates exist,
      // we're within the valid range (after start, before end)
      return { open: true };
    }

    const window = rows[0];
    const closesAt = window.closes_at instanceof Date ? window.closes_at : new Date(window.closes_at);

    // Check if registration period has ended
    if (now > closesAt) {
      console.log(`[SystemService] Registration closed: Registration window closes_at (${closesAt.toISOString()}) has passed`);
      return {
        open: false,
        reason: 'window_closed',
        message: 'Registration period has ended. Students cannot register for courses at this time.'
      };
    }

    // Also check status
    if (window.status === 'closed') {
      console.log(`[SystemService] Registration closed: Registration window status is 'closed'`);
      return {
        open: false,
        reason: 'status_closed',
        message: 'Registration is currently closed. Please check back later.'
      };
    }

    return { open: true };
  } catch (error) {
    console.error('Failed to check registration period', error);
    return { open: true }; // Allow registration on error (fail open)
  }
}

