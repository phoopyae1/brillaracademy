import 'dotenv/config';
import { getPool } from './pool.js';
/**
 * Cleanup script to remove duplicate grade records
 * Keeps only the most recent grade for each student + course_code + semester combination
 */
async function cleanupDuplicateGrades() {
    const pool = getPool();
    if (!pool) {
        console.error('No database connection available. Please set DATABASE_URL environment variable.');
        process.exit(1);
    }
    try {
        console.log('Finding duplicate grade records...\n');
        // Find all duplicate grade records (same student, course_code, semester)
        const duplicatesResult = await pool.query(`SELECT student_id, course_code, semester, COUNT(*) as count
       FROM grade_records
       GROUP BY student_id, course_code, semester
       HAVING COUNT(*) > 1
       ORDER BY student_id, semester, course_code`);
        if (duplicatesResult.rows.length === 0) {
            console.log('✓ No duplicate grade records found!');
            await pool.end();
            return;
        }
        console.log(`Found ${duplicatesResult.rows.length} duplicate grade combinations:\n`);
        let totalDeleted = 0;
        for (const dup of duplicatesResult.rows) {
            const studentId = dup.student_id;
            const courseCode = dup.course_code;
            const semester = dup.semester;
            const count = Number(dup.count);
            // Get all grades for this combination, ordered by most recent first
            const gradesResult = await pool.query(`SELECT id, grade, recorded_at
         FROM grade_records
         WHERE student_id = $1 AND course_code = $2 AND semester = $3
         ORDER BY recorded_at DESC, id DESC`, [studentId, courseCode, semester]);
            if (gradesResult.rows.length <= 1) {
                continue;
            }
            // Keep the most recent one (first in the list)
            const keepId = gradesResult.rows[0].id;
            const keepGrade = gradesResult.rows[0].grade;
            const deleteIds = gradesResult.rows.slice(1).map((r) => r.id);
            // Delete all except the most recent
            const deleteResult = await pool.query(`DELETE FROM grade_records
         WHERE id = ANY($1::int[])`, [deleteIds]);
            const deletedCount = deleteResult.rowCount || deleteIds.length;
            totalDeleted += deletedCount;
            console.log(`✓ Student ${studentId}, Course ${courseCode}, Semester ${semester}:`);
            console.log(`  - Kept: ID ${keepId}, Grade ${keepGrade} (most recent)`);
            console.log(`  - Deleted: ${deletedCount} duplicate record(s)`);
            console.log('');
        }
        console.log(`\n✓ Cleanup complete!`);
        console.log(`  - Total duplicate combinations found: ${duplicatesResult.rows.length}`);
        console.log(`  - Total duplicate records deleted: ${totalDeleted}`);
    }
    catch (error) {
        console.error('Error cleaning up duplicate grades:', error);
        process.exit(1);
    }
    finally {
        await pool.end();
    }
}
cleanupDuplicateGrades();
//# sourceMappingURL=cleanupDuplicateGrades.js.map