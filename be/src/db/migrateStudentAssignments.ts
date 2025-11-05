import 'dotenv/config';
import { getPool } from './pool.js';

/**
 * Migration script to create the student_assignments table
 */
async function migrateStudentAssignments() {
  const pool = getPool();
  
  if (!pool) {
    console.error('No database connection available. Please set DATABASE_URL environment variable.');
    process.exit(1);
  }

  try {
    console.log('Creating student_assignments table...\n');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_assignments (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER NOT NULL REFERENCES staff_accounts(id) ON DELETE CASCADE,
        course_code TEXT NOT NULL,
        course_title TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        due_date TIMESTAMPTZ NOT NULL,
        max_points DECIMAL(10, 2),
        assignment_type TEXT NOT NULL DEFAULT 'homework' CHECK (assignment_type IN ('homework', 'project', 'quiz', 'exam', 'other')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    console.log('✓ student_assignments table created successfully!');
  } catch (error) {
    console.error('Error creating student_assignments table:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateStudentAssignments();

