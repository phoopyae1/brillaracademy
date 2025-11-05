import { getPool } from '../db/pool.js';
/**
 * List all assignments for a specific student
 * Returns assignments for all courses the student is enrolled in
 */
export async function listStudentAssignments(studentId) {
    const pool = getPool();
    if (!pool) {
        return [];
    }
    try {
        // Get all assignments for courses the student is enrolled in
        // A student is enrolled if they have a teacher_rosters entry for that course
        const { rows } = await pool.query(`SELECT sa.id, sa.teacher_id, sa.course_code, sa.course_title, 
              sa.title, sa.description, sa.due_date, sa.max_points, 
              sa.assignment_type,
              to_char(sa.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
              to_char(sa.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at,
              to_char(sa.due_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS due_date_formatted,
              staff.display_name AS teacher_name
       FROM student_assignments sa
       INNER JOIN teacher_rosters tr ON sa.teacher_id = tr.teacher_id AND sa.course_code = tr.course_code
       LEFT JOIN staff_accounts staff ON sa.teacher_id = staff.id
       WHERE tr.student_id = $1
       ORDER BY sa.due_date ASC, sa.created_at DESC`, [studentId]);
        return rows.map(normalizeAssignment);
    }
    catch (error) {
        console.error('Failed to list student assignments', error);
        return [];
    }
}
/**
 * List all assignments for a specific teacher and course
 */
export async function listTeacherAssignments(teacherId, courseCode) {
    const pool = getPool();
    if (!pool) {
        return [];
    }
    try {
        let query = `
      SELECT sa.id, sa.teacher_id, sa.course_code, sa.course_title, 
             sa.title, sa.description, sa.due_date, sa.max_points, 
             sa.assignment_type,
             to_char(sa.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
             to_char(sa.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at,
             to_char(sa.due_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS due_date_formatted,
             staff.display_name AS teacher_name
      FROM student_assignments sa
      LEFT JOIN staff_accounts staff ON sa.teacher_id = staff.id
      WHERE sa.teacher_id = $1
    `;
        const params = [teacherId];
        if (courseCode) {
            query += ` AND sa.course_code = $2`;
            params.push(courseCode);
        }
        query += ` ORDER BY sa.due_date ASC, sa.created_at DESC`;
        const { rows } = await pool.query(query, params);
        return rows.map(normalizeAssignment);
    }
    catch (error) {
        console.error('Failed to list teacher assignments', error);
        return [];
    }
}
/**
 * Create a new assignment
 */
export async function createAssignment(input) {
    const pool = getPool();
    if (!pool) {
        throw new Error('Database connection not available.');
    }
    try {
        const { rows } = await pool.query(`INSERT INTO student_assignments (teacher_id, course_code, course_title, title, description, due_date, max_points, assignment_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, teacher_id, course_code, course_title, title, description, 
                 due_date, max_points, assignment_type,
                 to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
                 to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at,
                 to_char(due_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS due_date_formatted`, [
            input.teacherId,
            input.courseCode,
            input.courseTitle,
            input.title,
            input.description || null,
            input.dueDate,
            input.maxPoints || null,
            input.assignmentType || 'homework'
        ]);
        const assignment = normalizeAssignment(rows[0]);
        // Get teacher name
        const teacherResult = await pool.query('SELECT display_name FROM staff_accounts WHERE id = $1', [input.teacherId]);
        if (teacherResult.rows.length > 0) {
            assignment.teacherName = teacherResult.rows[0].display_name;
        }
        return assignment;
    }
    catch (error) {
        console.error('Failed to create assignment', error);
        throw new Error('Unable to create assignment right now.');
    }
}
/**
 * Update an existing assignment
 */
export async function updateAssignment(input) {
    const pool = getPool();
    if (!pool) {
        throw new Error('Database connection not available.');
    }
    try {
        const updates = [];
        const params = [];
        let paramIndex = 1;
        if (input.title !== undefined) {
            updates.push(`title = $${paramIndex++}`);
            params.push(input.title);
        }
        if (input.description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            params.push(input.description);
        }
        if (input.dueDate !== undefined) {
            updates.push(`due_date = $${paramIndex++}`);
            params.push(input.dueDate);
        }
        if (input.maxPoints !== undefined) {
            updates.push(`max_points = $${paramIndex++}`);
            params.push(input.maxPoints);
        }
        if (input.assignmentType !== undefined) {
            updates.push(`assignment_type = $${paramIndex++}`);
            params.push(input.assignmentType);
        }
        // Always update updated_at
        updates.push(`updated_at = NOW()`);
        params.push(input.id);
        const { rows } = await pool.query(`UPDATE student_assignments
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, teacher_id, course_code, course_title, title, description, 
                 due_date, max_points, assignment_type,
                 to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
                 to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at,
                 to_char(due_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS due_date_formatted`, params);
        if (rows.length === 0) {
            throw new Error('Assignment not found.');
        }
        const assignment = normalizeAssignment(rows[0]);
        // Get teacher name
        const teacherResult = await pool.query('SELECT display_name FROM staff_accounts WHERE id = $1', [rows[0].teacher_id]);
        if (teacherResult.rows.length > 0) {
            assignment.teacherName = teacherResult.rows[0].display_name;
        }
        return assignment;
    }
    catch (error) {
        console.error('Failed to update assignment', error);
        throw new Error('Unable to update assignment right now.');
    }
}
/**
 * Delete an assignment
 */
export async function deleteAssignment(id) {
    const pool = getPool();
    if (!pool) {
        throw new Error('Database connection not available.');
    }
    try {
        await pool.query('DELETE FROM student_assignments WHERE id = $1', [id]);
    }
    catch (error) {
        console.error('Failed to delete assignment', error);
        throw new Error('Unable to delete assignment right now.');
    }
}
function normalizeAssignment(row) {
    return {
        id: row.id,
        teacherId: row.teacher_id,
        teacherName: row.teacher_name || null,
        courseCode: row.course_code,
        courseTitle: row.course_title,
        title: row.title,
        description: row.description || null,
        dueDate: row.due_date_formatted || row.due_date,
        maxPoints: row.max_points ? Number(row.max_points) : null,
        assignmentType: row.assignment_type || 'homework',
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}
//# sourceMappingURL=assignmentService.js.map