import { getPool } from '../db/pool.js';
import {
  fallbackTeachingAssignments,
  fallbackTeacherRosters,
  fallbackTeacherFocusTags
} from './fallbackData.js';
import type {
  TeachingAssignment,
  TeacherDashboardData,
  TeacherRosterEntry,
  TeacherScheduleSlot
} from './types.js';
import { listClassrooms } from './classroomService.js';
import { listStudents } from './studentService.js';
import { findStaffById } from './staffService.js';
import { listTeacherGrades } from './academicService.js';
import { getCurrentSemester } from './systemService.js';
import { registerSubjectForMajor } from '../utils/majors.js';

let inMemoryAssignments = [...fallbackTeachingAssignments];
for (const assignment of inMemoryAssignments) {
  registerSubjectForMajor(assignment.majorFocus, assignment.courseTitle);
}
let inMemoryRosters = [...fallbackTeacherRosters];
let nextAssignmentId = fallbackTeachingAssignments.length + 1;

function normalizeAssignment(row: any): TeachingAssignment {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    classroomId: row.classroom_id,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    weekday: row.weekday,
    startTime: row.start_time,
    endTime: row.end_time,
    studentGroup: row.student_group,
    majorFocus: row.major_focus ?? row.majorFocus ?? 'Undeclared',
    semester: row.semester ?? '1/2026',
    assignedBy: row.assigned_by ?? null,
    assignedAt: row.assigned_at instanceof Date ? row.assigned_at.toISOString() : row.assigned_at
  };
}

function normalizeRoster(row: any): TeacherRosterEntry {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    studentId: row.student_id,
    status: row.status ?? 'enrolled'
  };
}

export async function listTeachingAssignments(): Promise<TeachingAssignment[]> {
  const pool = getPool();

  if (!pool) {
    return [...inMemoryAssignments];
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, teacher_id, classroom_id, course_code, course_title, weekday, start_time, end_time, student_group, major_focus, semester, assigned_by, assigned_at
       FROM teaching_assignments
       ORDER BY assigned_at DESC`
    );

    const assignments = rows.map(normalizeAssignment);
    assignments.forEach((assignment) => {
      registerSubjectForMajor(assignment.majorFocus, assignment.courseTitle);
    });

    return assignments;
  } catch (error) {
    console.error('Failed to fetch teaching assignments from database', error);
    return [...inMemoryAssignments];
  }
}

export async function listTeachingAssignmentsForTeacher(teacherId: number): Promise<TeachingAssignment[]> {
  const pool = getPool();

  if (!pool) {
    const assignments = inMemoryAssignments.filter((assignment) => assignment.teacherId === teacherId);
    if (assignments.length === 0) {
      console.warn(`No assignments found for teacher ID ${teacherId}. Available teacher IDs: ${[...new Set(inMemoryAssignments.map(a => a.teacherId))].join(', ')}`);
    }
    return assignments;
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, teacher_id, classroom_id, course_code, course_title, weekday, start_time, end_time, student_group, major_focus, semester, assigned_by, assigned_at
       FROM teaching_assignments
       WHERE teacher_id = $1
       ORDER BY start_time ASC`,
      [teacherId]
    );

    const assignments = rows.map(normalizeAssignment);
    assignments.forEach((assignment) => {
      registerSubjectForMajor(assignment.majorFocus, assignment.courseTitle);
    });

    return assignments;
  } catch (error) {
    console.error('Failed to fetch teaching assignments for teacher', error);
    return inMemoryAssignments.filter((assignment) => assignment.teacherId === teacherId);
  }
}

export type CreateTeachingAssignmentInput = {
  teacherId: number;
  classroomId: number;
  courseCode: string;
  courseTitle: string;
  weekday: string;
  startTime: string;
  endTime: string;
  studentGroup?: string;
  majorFocus: string;
  semester?: string;
};

// Helper function to enroll students in an assignment
async function enrollStudentsInAssignment(
  assignment: TeachingAssignment,
  input: CreateTeachingAssignmentInput,
  pool: any,
  assignedBy?: number
): Promise<void> {
  const allStudents = await listStudents();
  console.log(`[enrollStudentsInAssignment] Checking ${allStudents.length} total students for major "${assignment.majorFocus}"`);
  console.log(`[enrollStudentsInAssignment] Student majors found: ${allStudents.map(s => `${s.firstName} ${s.lastName} (ID: ${s.id}): "${s.primaryInterest}"`).join(', ')}`);
  
  // Case-insensitive and trimmed major matching
  const normalizedMajorFocus = assignment.majorFocus?.trim().toLowerCase() ?? '';
  const relevantStudents = allStudents.filter((student) => {
    const studentMajor = student.primaryInterest?.trim().toLowerCase() ?? '';
    const matches = studentMajor === normalizedMajorFocus;
    if (studentMajor && matches) {
      console.log(`[enrollStudentsInAssignment] ✓ Matched: ${student.firstName} ${student.lastName} (ID: ${student.id}) - "${student.primaryInterest}" matches "${assignment.majorFocus}"`);
    }
    return matches;
  });

  if (relevantStudents.length === 0) {
    const availableMajors = [...new Set(allStudents.map(s => s.primaryInterest).filter(Boolean))];
    console.warn(
      `[enrollStudentsInAssignment] ⚠ No students found with major "${assignment.majorFocus}" for assignment "${input.courseTitle}". ` +
      `Available student majors: ${availableMajors.join(', ')}`
    );
    return;
  }

  console.log(`[enrollStudentsInAssignment] ✓ Found ${relevantStudents.length} student(s) with major "${assignment.majorFocus}" to enroll in ${input.courseTitle}: ${relevantStudents.map(s => `${s.firstName} ${s.lastName}`).join(', ')}`);

  for (const student of relevantStudents) {
    // Check if already enrolled
    const existingRoster = await pool.query(
      `SELECT id FROM teacher_rosters WHERE teacher_id = $1 AND course_code = $2 AND student_id = $3`,
      [input.teacherId, input.courseCode, student.id]
    );

    if (existingRoster.rows.length === 0) {
      // Add to teacher roster
      await pool.query(
        `INSERT INTO teacher_rosters (teacher_id, course_code, course_title, student_id, status)
         VALUES ($1, $2, $3, $4, 'enrolled')`,
        [input.teacherId, input.courseCode, input.courseTitle, student.id]
      );

      // Get course metadata for fees and credits
      const { getCourseMetadata } = await import('../utils/majors.js');
      const metadata = getCourseMetadata(input.courseTitle);
      
      // Get instructor from teacher record
      const teacher = await findStaffById(input.teacherId);
      const instructor = metadata?.instructor ?? teacher?.displayName ?? 'TBA';
      const credits = metadata?.credits ?? 3; // Default to 3 credits if metadata not found

      // Create class registration (even if metadata is missing)
      const existingReg = await pool.query(
        `SELECT id FROM class_registrations WHERE student_id = $1 AND class_name = $2`,
        [student.id, input.courseTitle]
      );
      
      if (existingReg.rows.length === 0) {
        await pool.query(
          `INSERT INTO class_registrations (student_id, class_name, instructor, status, semester, credits, confirmed_by, registered_at)
           VALUES ($1, $2, $3, 'registered', $4, $5, $6, NOW())`,
          [student.id, input.courseTitle, instructor, input.semester ?? '1/2026', credits, assignedBy ?? null]
        );
        console.log(`✓ Auto-enrolled student ${student.id} (${student.firstName} ${student.lastName}) in ${input.courseTitle}`);
      } else {
        console.log(`Student ${student.id} already registered for ${input.courseTitle}, skipping`);
      }

      // Create timetable entry
      const existingTimetable = await pool.query(
        `SELECT id FROM timetables WHERE student_id = $1 AND subject = $2 AND weekday = $3`,
        [student.id, input.courseTitle, input.weekday]
      );
      
      if (existingTimetable.rows.length === 0) {
        await pool.query(
          `INSERT INTO timetables (student_id, weekday, start_time, end_time, subject, location)
           VALUES ($1, $2, $3, $4, $5, 
             (SELECT location FROM classrooms WHERE id = $6))`,
          [student.id, input.weekday, input.startTime, input.endTime, input.courseTitle, input.classroomId]
        );
      }

      // Create fee payment (only if metadata exists to get accurate credit amount)
      if (metadata) {
        const existingFee = await pool.query(
          `SELECT id FROM fee_payments WHERE student_id = $1 AND description = $2`,
          [student.id, `${input.courseTitle} - Registration Fee`]
        );
        
        // Course registration fees removed - fees are now handled per semester (semester fee + health insurance)
      }
    } else {
      console.log(`Student ${student.id} (${student.firstName} ${student.lastName}) already in roster for ${input.courseTitle}`);
    }
  }
}

async function validateClassroomMajorMatch(
  classroomId: number,
  majorFocus: string,
  pool: any
): Promise<boolean> {
  if (!pool) {
    return true; // Skip validation in in-memory mode
  }

  try {
    const { rows } = await pool.query(
      `SELECT resources FROM classrooms WHERE id = $1`,
      [classroomId]
    );

    if (rows.length === 0) {
      console.warn(`[TeachingService] Classroom ${classroomId} not found`);
      return false;
    }

    const resources = Array.isArray(rows[0].resources) ? rows[0].resources : [];
    const normalizedMajor = majorFocus.trim().toLowerCase();

    // Check if any resource contains "Major: [Major Name]" matching the assignment's major
    const hasMatchingMajor = resources.some((resource: any) => {
      if (typeof resource !== 'string') return false;
      const match = resource.match(/^\s*Major:\s*(.+)$/i);
      if (match) {
        return match[1].trim().toLowerCase() === normalizedMajor;
      }
      return false;
    });

    if (!hasMatchingMajor) {
      console.warn(
        `[TeachingService] ⚠️ Classroom ${classroomId} does not support major "${majorFocus}". ` +
        `Available majors in classroom resources: ${resources
          .filter((r: any) => typeof r === 'string' && /Major:/i.test(r))
          .map((r: string) => r.replace(/^\s*Major:\s*/i, ''))
          .join(', ') || 'none'}`
      );
    }

    return hasMatchingMajor;
  } catch (error) {
    console.error(`[TeachingService] Error validating classroom major match:`, error);
    return false;
  }
}

export async function assignTeacherToClassroom(
  input: CreateTeachingAssignmentInput,
  assignedBy?: number
): Promise<TeachingAssignment> {
  const pool = getPool();

  // Get current semester as default if not provided
  let defaultSemester = '1/2026';
  if (!input.semester) {
    try {
      const { getCurrentSemester } = await import('./systemService.js');
      defaultSemester = await getCurrentSemester();
      console.log(`[TeachingService] Using current semester as default: ${defaultSemester}`);
    } catch (error) {
      console.error('[TeachingService] Failed to get current semester, using default:', error);
    }
  }

  // Validate that classroom matches the major focus
  if (input.majorFocus && input.classroomId) {
    const isValid = await validateClassroomMajorMatch(input.classroomId, input.majorFocus, pool);
    if (!isValid) {
      throw new Error(
        `Cannot assign ${input.majorFocus} class to this classroom. ` +
        `The classroom must support "${input.majorFocus}" major in its resources. ` +
        `Please select a classroom that has "Major: ${input.majorFocus}" in its resources.`
      );
    }
  }
  const studentGroup = input.studentGroup ?? 'Core Cohort';
  registerSubjectForMajor(input.majorFocus, input.courseTitle);
  const assignedAt = new Date().toISOString();

  if (!pool) {
    const assignment: TeachingAssignment = {
      id: nextAssignmentId++,
      teacherId: input.teacherId,
      classroomId: input.classroomId,
      courseCode: input.courseCode,
      courseTitle: input.courseTitle,
      weekday: input.weekday,
      startTime: input.startTime,
      endTime: input.endTime,
      studentGroup,
      majorFocus: input.majorFocus,
      semester: input.semester ?? defaultSemester,
      assignedBy: assignedBy ?? null,
      assignedAt
    };

    inMemoryAssignments = [assignment, ...inMemoryAssignments];
    return assignment;
  }

  try {
    // NOTE: Removed classroom conflict check - staff can assign same teacher to same time/day
    // Staff have the discretion to assign teachers to multiple courses at the same time if needed
    // This allows for flexible scheduling and different classroom/cohort assignments

    // Do not mutate classroom resources with major tags; majors are tracked on assignments

    const { rows } = await pool.query(
      `INSERT INTO teaching_assignments (teacher_id, classroom_id, course_code, course_title, weekday, start_time, end_time, student_group, major_focus, semester, assigned_by, assigned_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, teacher_id, classroom_id, course_code, course_title, weekday, start_time, end_time, student_group, major_focus, semester, assigned_by, assigned_at`,
      [
        input.teacherId,
        input.classroomId,
        input.courseCode,
        input.courseTitle,
        input.weekday,
        input.startTime,
        input.endTime,
        studentGroup,
        input.majorFocus,
        input.semester ?? '1/2026',
        assignedBy ?? null,
        assignedAt
      ]
    );

    const assignment = normalizeAssignment(rows[0]);

    // NOTE: Auto-enrollment disabled - students must register via the portal
    // Teacher assignments do not automatically register students
    // Students need to confirm their registration through the student portal
    // If you need to enroll students, use the syncEnrollmentsForAssignment function explicitly
    // try {
    //   await enrollStudentsInAssignment(assignment, input, pool, assignedBy);
    // } catch (enrollmentError) {
    //   console.error('Failed to auto-enroll students for teaching assignment', enrollmentError);
    //   // Don't fail the whole operation if enrollment fails
    // }

    return assignment;
  } catch (error) {
    console.error('Failed to persist teaching assignment, falling back to memory', error);
    const assignment: TeachingAssignment = {
      id: nextAssignmentId++,
      teacherId: input.teacherId,
      classroomId: input.classroomId,
      courseCode: input.courseCode,
      courseTitle: input.courseTitle,
      weekday: input.weekday,
      startTime: input.startTime,
      endTime: input.endTime,
      studentGroup,
      majorFocus: input.majorFocus,
      semester: input.semester ?? defaultSemester,
      assignedBy: assignedBy ?? null,
      assignedAt
    };

    inMemoryAssignments = [assignment, ...inMemoryAssignments];
    return assignment;
  }
}

// Function to re-sync enrollments for an existing assignment
// Update teaching assignments to a new semester
export async function updateTeachingAssignmentsSemester(
  fromSemester: string | null,
  toSemester: string
): Promise<{ updated: number; message: string }> {
  const pool = getPool();
  
  if (!pool) {
    throw new Error('Database connection not available.');
  }

  try {
    // First, check how many assignments will be updated
    let countQuery;
    if (fromSemester === null) {
      countQuery = await pool.query(
        `SELECT COUNT(*) as count 
         FROM teaching_assignments 
         WHERE semester != $1 OR semester IS NULL`,
        [toSemester]
      );
    } else {
      countQuery = await pool.query(
        `SELECT COUNT(*) as count 
         FROM teaching_assignments 
         WHERE semester = $1`,
        [fromSemester]
      );
    }
    
    const expectedCount = Number(countQuery.rows[0]?.count || 0);
    console.log(`[TeachingService] Found ${expectedCount} assignment(s) to update to semester "${toSemester}"`);
    
    if (expectedCount === 0) {
      return {
        updated: 0,
        message: `No assignments found to update. ${fromSemester === null ? 'All assignments already have semester ' + toSemester + '.' : 'No assignments found with semester ' + fromSemester + '.'}`
      };
    }
    
    let result;
    if (fromSemester === null) {
      // Update all assignments (any semester or NULL) to the new semester
      result = await pool.query(
        `UPDATE teaching_assignments 
         SET semester = $1 
         WHERE semester != $1 OR semester IS NULL
         RETURNING id, course_code, course_title, major_focus`,
        [toSemester]
      );
    } else {
      // Update assignments from a specific semester
      result = await pool.query(
        `UPDATE teaching_assignments 
         SET semester = $1 
         WHERE semester = $2
         RETURNING id, course_code, course_title, major_focus`,
        [toSemester, fromSemester]
      );
    }

    const updated = result.rows.length || 0;
    console.log(`[TeachingService] ✅ Successfully updated ${updated} teaching assignment(s) to semester "${toSemester}":`);
    result.rows.forEach((row, idx) => {
      console.log(`[TeachingService]   ${idx + 1}. ${row.course_title} (${row.course_code}) - ${row.major_focus}`);
    });
    
    // Verify the update
    const verifyQuery = await pool.query(
      `SELECT COUNT(*) as count 
       FROM teaching_assignments 
       WHERE semester = $1`,
      [toSemester]
    );
    const totalForSemester = Number(verifyQuery.rows[0]?.count || 0);
    console.log(`[TeachingService] Total assignments for semester "${toSemester}" after update: ${totalForSemester}`);
    
    return {
      updated,
      message: `Successfully updated ${updated} teaching assignment(s) to semester ${toSemester}. Total assignments for ${toSemester}: ${totalForSemester}.`
    };
  } catch (error: any) {
    console.error('[TeachingService] Failed to update teaching assignments semester:', error);
    throw new Error(`Failed to update teaching assignments: ${error?.message || 'Unknown error'}`);
  }
}

export async function syncEnrollmentsForAssignment(assignmentId: number): Promise<{ enrolled: number; skipped: number; details: string[] }> {
  const pool = getPool();
  
  if (!pool) {
    return { enrolled: 0, skipped: 0, details: ['In-memory mode: Enrollment sync not available'] };
  }

  try {
    // Ensure semester column exists (migration helper)
    try {
      await pool.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'teaching_assignments' AND column_name = 'semester'
          ) THEN
            ALTER TABLE teaching_assignments ADD COLUMN semester TEXT DEFAULT '1/2026';
            UPDATE teaching_assignments SET semester = '1/2026' WHERE semester IS NULL;
            ALTER TABLE teaching_assignments ALTER COLUMN semester SET NOT NULL;
            ALTER TABLE teaching_assignments ALTER COLUMN semester SET DEFAULT '1/2026';
          END IF;
        END $$;
      `);
    } catch (migrationError) {
      console.warn('[syncEnrollments] Could not ensure semester column exists:', migrationError);
    }

    // Get the assignment - use COALESCE as fallback if column was just added
    let rows;
    try {
      const result = await pool.query(
      `SELECT id, teacher_id, classroom_id, course_code, course_title, weekday, start_time, end_time, student_group, major_focus, semester
       FROM teaching_assignments
       WHERE id = $1`,
      [assignmentId]
    );
      rows = result.rows;
    } catch (queryError: any) {
      // If semester column still doesn't exist, fallback to query without it
      if (queryError?.code === '42703' && queryError?.message?.includes('semester')) {
        console.warn('[syncEnrollments] Semester column missing, using default value');
        const result = await pool.query(
          `SELECT id, teacher_id, classroom_id, course_code, course_title, weekday, start_time, end_time, student_group, major_focus
           FROM teaching_assignments
           WHERE id = $1`,
          [assignmentId]
        );
        // Add default semester to each row
        rows = result.rows.map(row => ({ ...row, semester: '1/2026' }));
      } else {
        throw queryError;
      }
    }

    if (rows.length === 0) {
      throw new Error(`Assignment with ID ${assignmentId} not found`);
    }

    const assignment = normalizeAssignment(rows[0]);
    
    const input: CreateTeachingAssignmentInput = {
      teacherId: assignment.teacherId,
      classroomId: assignment.classroomId,
      courseCode: assignment.courseCode,
      courseTitle: assignment.courseTitle,
      weekday: assignment.weekday,
      startTime: assignment.startTime,
      endTime: assignment.endTime,
      studentGroup: assignment.studentGroup,
      majorFocus: assignment.majorFocus,
      semester: assignment.semester
    };

    let enrolled = 0;
    let skipped = 0;
    const details: string[] = [];

    const allStudents = await listStudents();
    details.push(`Checking ${allStudents.length} total students for major "${assignment.majorFocus}"`);
    
    console.log(`[syncEnrollments] Checking ${allStudents.length} total students for assignment ${assignmentId} (major: "${assignment.majorFocus}")`);
    console.log(`[syncEnrollments] Student majors found: ${allStudents.map(s => `${s.firstName} ${s.lastName} (ID: ${s.id}): "${s.primaryInterest}"`).join(', ')}`);
    
    const normalizedMajorFocus = assignment.majorFocus?.trim().toLowerCase() ?? '';
    const relevantStudents = allStudents.filter((student) => {
      const studentMajor = student.primaryInterest?.trim().toLowerCase() ?? '';
      const matches = studentMajor === normalizedMajorFocus;
      if (studentMajor && matches) {
        console.log(`[syncEnrollments] ✓ Matched: ${student.firstName} ${student.lastName} (ID: ${student.id}) - "${student.primaryInterest}" matches "${assignment.majorFocus}"`);
        details.push(`✓ Found: ${student.firstName} ${student.lastName} (ID: ${student.id}) - Major: "${student.primaryInterest}"`);
      } else if (studentMajor) {
        details.push(`✗ Not matched: ${student.firstName} ${student.lastName} (ID: ${student.id}) - Major: "${student.primaryInterest}" (expected: "${assignment.majorFocus}")`);
      }
      return matches;
    });

    if (relevantStudents.length === 0) {
      const availableMajors = [...new Set(allStudents.map(s => s.primaryInterest).filter(Boolean))];
      const warningMsg = `⚠ No students found with major "${assignment.majorFocus}". Available majors: ${availableMajors.join(', ') || 'none'}`;
      console.warn(`[syncEnrollments] ${warningMsg}`);
      details.push(warningMsg);
      if (allStudents.length > 0) {
        details.push(`All students in database: ${allStudents.map(s => `${s.firstName} ${s.lastName} (${s.primaryInterest || 'no major'})`).join(', ')}`);
      }
    } else {
      const foundMsg = `✓ Found ${relevantStudents.length} student(s): ${relevantStudents.map(s => `${s.firstName} ${s.lastName}`).join(', ')}`;
      console.log(`[syncEnrollments] ${foundMsg}`);
      details.push(foundMsg);
    }

    for (const student of relevantStudents) {
      const existingRoster = await pool.query(
        `SELECT id FROM teacher_rosters WHERE teacher_id = $1 AND course_code = $2 AND student_id = $3`,
        [assignment.teacherId, assignment.courseCode, student.id]
      );

      if (existingRoster.rows.length === 0) {
        // Add to teacher roster
        await pool.query(
          `INSERT INTO teacher_rosters (teacher_id, course_code, course_title, student_id, status)
           VALUES ($1, $2, $3, $4, 'enrolled')`,
          [assignment.teacherId, assignment.courseCode, assignment.courseTitle, student.id]
        );

        // Get course metadata
        const { getCourseMetadata } = await import('../utils/majors.js');
        const metadata = getCourseMetadata(assignment.courseTitle);
        const teacher = await findStaffById(assignment.teacherId);
        const instructor = metadata?.instructor ?? teacher?.displayName ?? 'TBA';
        const credits = metadata?.credits ?? 3;

        // Create class registration
        const existingReg = await pool.query(
          `SELECT id FROM class_registrations WHERE student_id = $1 AND class_name = $2`,
          [student.id, assignment.courseTitle]
        );
        
        if (existingReg.rows.length === 0) {
          await pool.query(
            `INSERT INTO class_registrations (student_id, class_name, instructor, status, semester, credits, confirmed_by, registered_at)
             VALUES ($1, $2, $3, 'registered', $4, $5, NULL, NOW())`,
            [student.id, assignment.courseTitle, instructor, assignment.semester ?? '1/2026', credits]
          );
          enrolled++;
          const enrollMsg = `✓ Enrolled student ${student.id} (${student.firstName} ${student.lastName}) in ${assignment.courseTitle}`;
          console.log(enrollMsg);
          details.push(enrollMsg);
        } else {
          skipped++;
          details.push(`⊘ Student ${student.id} (${student.firstName} ${student.lastName}) already registered for ${assignment.courseTitle}`);
        }

        // Create timetable entry
        const existingTimetable = await pool.query(
          `SELECT id FROM timetables WHERE student_id = $1 AND subject = $2 AND weekday = $3`,
          [student.id, assignment.courseTitle, assignment.weekday]
        );
        
        if (existingTimetable.rows.length === 0) {
          // Get classroom location first
          const classroomResult = await pool.query(
            `SELECT location FROM classrooms WHERE id = $1`,
            [assignment.classroomId]
          );
          
          const classroomLocation = classroomResult.rows.length > 0 
            ? classroomResult.rows[0].location 
            : 'TBA';
          
          await pool.query(
            `INSERT INTO timetables (student_id, weekday, start_time, end_time, subject, location)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [student.id, assignment.weekday, assignment.startTime, assignment.endTime, assignment.courseTitle, classroomLocation]
          );
        }
      } else {
        skipped++;
      }
    }

    details.push(`\nSummary: ${enrolled} enrolled, ${skipped} skipped`);
    return { enrolled, skipped, details };
  } catch (error) {
    console.error('Failed to sync enrollments for assignment', error);
    throw error;
  }
}

export async function listTeacherRosters(teacherId: number): Promise<TeacherRosterEntry[]> {
  const pool = getPool();

  if (!pool) {
    return inMemoryRosters.filter((roster) => roster.teacherId === teacherId);
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, teacher_id, course_code, course_title, student_id, status
       FROM teacher_rosters
       WHERE teacher_id = $1`,
      [teacherId]
    );

    return rows.map(normalizeRoster);
  } catch (error) {
    console.error('Failed to fetch teacher rosters from database', error);
    return inMemoryRosters.filter((roster) => roster.teacherId === teacherId);
  }
}

export function getTeacherFocusTags(teacherId: number): string[] {
  return fallbackTeacherFocusTags[teacherId] ?? ['Student success', 'Faculty collaboration'];
}

function sortSchedule(slots: TeacherScheduleSlot[]): TeacherScheduleSlot[] {
  const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return [...slots].sort((a, b) => {
    const dayDiff = order.indexOf(a.weekday) - order.indexOf(b.weekday);
    if (dayDiff !== 0) {
      return dayDiff;
    }

    return a.startTime.localeCompare(b.startTime);
  });
}

export async function buildTeacherDashboard(teacherId: number): Promise<TeacherDashboardData | null> {
  const currentSemester = await getCurrentSemester().catch((error) => {
    console.error('[TeachingService] Failed to fetch current semester, defaulting to 1/2026', error);
    return '1/2026';
  });

  const [teacher, assignments, classrooms, rosterEntries, students, gradebook] = await Promise.all([
    findStaffById(teacherId),
    listTeachingAssignmentsForTeacher(teacherId),
    listClassrooms(),
    listTeacherRosters(teacherId),
    listStudents(),
    listTeacherGrades(teacherId)
  ]);

  if (!teacher) {
    return null;
  }

  const classroomMap = new Map(classrooms.map((room) => [room.id, room]));
  const studentMap = new Map(students.map((student) => [student.id, student]));

  const filteredAssignments = assignments.filter((assignment) => {
    const assignmentSemester = assignment.semester?.trim();
    return assignmentSemester ? assignmentSemester === currentSemester.trim() : true;
  });

  const schedule: TeacherScheduleSlot[] = sortSchedule(
    filteredAssignments.map((assignment) => {
      const classroom = classroomMap.get(assignment.classroomId);
      return {
        assignmentId: assignment.id,
        teacherId: assignment.teacherId,
        courseCode: assignment.courseCode,
        courseTitle: assignment.courseTitle,
        semester: assignment.semester,
        weekday: assignment.weekday,
        startTime: assignment.startTime,
        endTime: assignment.endTime,
        classroomName: classroom?.name ?? 'TBA',
        classroomLocation: classroom?.location ?? 'To be assigned',
        studentGroup: assignment.studentGroup,
        majorFocus: assignment.majorFocus
      };
    })
  );

  const roster = rosterEntries.map((entry) => {
    const student = studentMap.get(entry.studentId);
    return {
      courseCode: entry.courseCode,
      courseTitle: entry.courseTitle,
      studentId: entry.studentId,
      studentName: student ? `${student.firstName} ${student.lastName}` : `Student #${entry.studentId}`,
      status: entry.status
    };
  });

  const recentGrades = [...gradebook].sort((a, b) => {
    const timeA = a.recordedAt ? new Date(a.recordedAt).getTime() : 0;
    const timeB = b.recordedAt ? new Date(b.recordedAt).getTime() : 0;
    return timeB - timeA;
  });

  return {
    teacher,
    currentSemester,
    schedule,
    rosters: roster,
    recentGrades,
    focusTags: getTeacherFocusTags(teacherId)
  };
}