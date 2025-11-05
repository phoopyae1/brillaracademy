import 'dotenv/config';
import { getPool } from './pool.js';
/**
 * Migration script to calculate and create GPA records for all students
 * who have grades but no GPA records in the semester_gpa table
 */
/**
 * Converts letter grade to grade point (4.0 scale)
 */
function gradeToPoint(grade) {
    const normalizedGrade = grade.trim().toUpperCase();
    const gradeMap = {
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
    return gradeMap[normalizedGrade] ?? 0.0;
}
async function calculateGPAForAllStudents() {
    const pool = getPool();
    if (!pool) {
        console.error('No database connection available. Please set DATABASE_URL environment variable.');
        process.exit(1);
    }
    try {
        console.log('Calculating GPA for all students with grades...\n');
        // Get all unique student-semester combinations from grade_records
        const studentSemestersResult = await pool.query(`SELECT DISTINCT student_id, semester
       FROM grade_records
       WHERE credits > 0
       ORDER BY student_id, semester`);
        console.log(`Found ${studentSemestersResult.rows.length} student-semester combinations with grades\n`);
        let calculatedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        for (const row of studentSemestersResult.rows) {
            const studentId = row.student_id;
            const semester = row.semester;
            try {
                // Get all grades for this student in this semester
                const gradesResult = await pool.query(`SELECT grade, credits
           FROM grade_records
           WHERE student_id = $1 AND semester = $2
           AND credits > 0`, [studentId, semester]);
                if (gradesResult.rows.length === 0) {
                    skippedCount++;
                    continue;
                }
                // Calculate weighted GPA
                let totalPoints = 0;
                let totalCredits = 0;
                for (const gradeRow of gradesResult.rows) {
                    const grade = gradeRow.grade;
                    const credits = Number(gradeRow.credits);
                    const points = gradeToPoint(grade);
                    totalPoints += points * credits;
                    totalCredits += credits;
                }
                if (totalCredits === 0) {
                    skippedCount++;
                    continue;
                }
                const gpa = totalPoints / totalCredits;
                const roundedGpa = Math.round(gpa * 100) / 100; // Round to 2 decimal places
                // Check if GPA record already exists
                const existingGpaResult = await pool.query(`SELECT id, gpa FROM semester_gpa
           WHERE student_id = $1 AND semester = $2`, [studentId, semester]);
                if (existingGpaResult.rows.length > 0) {
                    const existingGpa = Number(existingGpaResult.rows[0].gpa);
                    if (Math.abs(existingGpa - roundedGpa) < 0.01) {
                        // GPA already correct, skip
                        skippedCount++;
                        continue;
                    }
                    // Update existing GPA
                    await pool.query(`UPDATE semester_gpa SET gpa = $1 WHERE student_id = $2 AND semester = $3`, [roundedGpa, studentId, semester]);
                    updatedCount++;
                    console.log(`✓ Updated GPA for student ${studentId}, semester ${semester}: ${existingGpa} → ${roundedGpa}`);
                }
                else {
                    // Insert new GPA record using ON CONFLICT to handle race conditions
                    try {
                        await pool.query(`INSERT INTO semester_gpa (student_id, semester, gpa)
               VALUES ($1, $2, $3)
               ON CONFLICT (student_id, semester)
               DO UPDATE SET gpa = $3`, [studentId, semester, roundedGpa]);
                        calculatedCount++;
                        console.log(`✓ Calculated GPA for student ${studentId}, semester ${semester}: ${roundedGpa} (${gradesResult.rows.length} grade(s))`);
                    }
                    catch (insertError) {
                        // If it's a duplicate key error on ID (shouldn't happen with ON CONFLICT, but just in case)
                        if (insertError?.code === '23505') {
                            // Try to update instead
                            await pool.query(`UPDATE semester_gpa SET gpa = $1 WHERE student_id = $2 AND semester = $3`, [roundedGpa, studentId, semester]);
                            updatedCount++;
                            console.log(`✓ Updated GPA for student ${studentId}, semester ${semester}: ${roundedGpa} (handled conflict)`);
                        }
                        else {
                            throw insertError;
                        }
                    }
                }
            }
            catch (error) {
                console.error(`Error calculating GPA for student ${studentId}, semester ${semester}:`, error);
            }
        }
        console.log(`\n✓ GPA calculation complete!`);
        console.log(`  - New GPA records created: ${calculatedCount}`);
        console.log(`  - Existing GPA records updated: ${updatedCount}`);
        console.log(`  - Skipped (already correct or no valid grades): ${skippedCount}`);
        console.log(`  - Total processed: ${calculatedCount + updatedCount + skippedCount}`);
    }
    catch (error) {
        console.error('Error calculating GPA for all students:', error);
        process.exit(1);
    }
    finally {
        await pool.end();
    }
}
calculateGPAForAllStudents();
//# sourceMappingURL=calculateGPAForAllStudents.js.map