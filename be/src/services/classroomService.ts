import { getPool } from '../db/pool.js';
import { fallbackClassrooms, fallbackClassroomEnrollments } from './fallbackData.js';
import type { Classroom, ClassroomAvailability, ClassroomEnrollment } from './types.js';
import { recordAtenxionTransaction } from './atenxionService.js';
import { getCurrentSemester, isRegistrationPeriodOpen } from './systemService.js';

let inMemoryClassrooms = [...fallbackClassrooms];
// Start next ID after the highest ID in fallback data (should be 217 after latest seed)
let nextClassroomId = Math.max(...fallbackClassrooms.map(c => c.id), 0) + 1;
console.log(`Initialized ${inMemoryClassrooms.length} classrooms in memory (max ID: ${nextClassroomId - 1})`);
let inMemoryClassroomEnrollments = [...fallbackClassroomEnrollments];
let nextClassroomEnrollmentId = fallbackClassroomEnrollments.length + 1;

function parseResourceList(row: any): string[] {
  if (Array.isArray(row.resources)) {
    return row.resources;
  }

  if (typeof row.resources === 'string') {
    try {
      return JSON.parse(row.resources);
    } catch {
      return [];
    }
  }

  return [];
}

function extractFocusAreasFromResources(resources: string[]): string[] {
  return resources
    .map((resource) => {
      if (typeof resource !== 'string') {
        return null;
      }

      const match = resource.match(/^\s*Major:\s*(.+)$/i);
      return match ? match[1].trim() : null;
    })
    .filter((value): value is string => Boolean(value));
}

function normalizeClassroom(row: any): Classroom {
  const resources = parseResourceList(row);
  const focusSource = row.focus_majors ?? row.focusMajors ?? row.focusAreas;
  let focusAreas: string[] = [];

  if (Array.isArray(focusSource)) {
    focusAreas = focusSource.filter((item): item is string => typeof item === 'string');
  } else if (typeof focusSource === 'string') {
    try {
      const parsed = JSON.parse(focusSource);
      if (Array.isArray(parsed)) {
        focusAreas = parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      focusAreas = [];
    }
  }

  if (!focusAreas.length) {
    focusAreas = extractFocusAreasFromResources(resources);
  }

  return {
    id: row.id,
    name: row.name,
    location: row.location,
    capacity: row.capacity,
    resources,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    focusAreas
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
    console.log(`[ClassroomService] Using in-memory classrooms: ${inMemoryClassrooms.length} classrooms available`);
    return inMemoryClassrooms;
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, name, location, capacity, resources, created_by, created_at
       FROM classrooms
       ORDER BY created_at DESC`
    );

    const classrooms = rows.map(normalizeClassroom);
    console.log(`[ClassroomService] Loaded ${classrooms.length} classrooms from database`);
    if (classrooms.length < 100) {
      console.warn(`[ClassroomService] WARNING: Only ${classrooms.length} classrooms found in database. Expected 217. Please re-seed the database with updated seed.sql`);
    }
    return classrooms;
  } catch (error) {
    console.error('[ClassroomService] Failed to list classrooms from database', error);
    console.log(`[ClassroomService] Falling back to in-memory classrooms: ${inMemoryClassrooms.length} available`);
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
    const focusAreas = extractFocusAreasFromResources(resources);
    const classroom: Classroom = {
      id: nextClassroomId++,
      name: input.name,
      location: input.location,
      capacity: input.capacity,
      resources,
      createdBy: createdBy ?? null,
      createdAt: new Date().toISOString(),
      focusAreas
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

/**
 * Get student's assigned courses from teacher rosters
 */
function normalizeMajorName(raw: string | null | undefined): string {
  const value = (raw ?? '').trim().toLowerCase();
  if (!value) return '';
  // Common synonyms/abbreviations
  const aliases: Record<string, string> = {
    'bme': 'biomedical engineering',
    'bio med': 'biomedical engineering',
    'biomed': 'biomedical engineering',
    'biomedical eng': 'biomedical engineering',
    'business': 'business administration',
    'business admin': 'business administration',
    'bus admin': 'business administration',
    'data sci': 'data science',
    'data science': 'data science',
    'international relations': 'international relations',
    'intl relations': 'international relations',
    'digital media': 'digital media design',
    'digital media design': 'digital media design',
    'environmental sci': 'environmental science',
    'environmental science': 'environmental science',
    'hospitality': 'hospitality management',
    'hospitality management': 'hospitality management',
    'ai': 'artificial intelligence',
    'artificial intelligence': 'artificial intelligence',
    'it': 'information technology',
    'information technology': 'information technology',
    'cybersecurity': 'cybersecurity',
    'cyber security': 'cybersecurity',
  };
  return aliases[value] ?? value;
}

async function getStudentAssignedCourses(studentId: number): Promise<Array<{ teacherId: number; courseCode: string; courseTitle: string }>> {
  const pool = getPool();
  
  if (!pool) {
    // For in-memory mode, get from teaching service
    try {
      const { listTeachingAssignments } = await import('./teachingService.js');
      const { listStudents } = await import('./studentService.js');
      
      const assignments = await listTeachingAssignments();
      const students = await listStudents();
      const student = students.find(s => s.id === studentId);
      
      if (!student) {
        return [];
      }
      
      // Get assignments matching student's major
      const studentMajor = normalizeMajorName(student.primaryInterest);
      const matchingAssignments = assignments.filter(a => {
        const focus = normalizeMajorName(a.majorFocus);
        if (!studentMajor || !focus) return false;
        return focus === studentMajor || focus.includes(studentMajor) || studentMajor.includes(focus);
      });
      
      // Return unique teacher/course combinations
      const uniqueCourses = new Map<string, { teacherId: number; courseCode: string; courseTitle: string }>();
      for (const assignment of matchingAssignments) {
        const key = `${assignment.teacherId}|${assignment.courseCode}`;
        if (!uniqueCourses.has(key)) {
          uniqueCourses.set(key, {
            teacherId: assignment.teacherId,
            courseCode: assignment.courseCode,
            courseTitle: assignment.courseTitle
          });
        }
      }
      
      return Array.from(uniqueCourses.values());
    } catch (error) {
      console.error('Failed to get student assigned courses (in-memory)', error);
      return [];
    }
  }

  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT teacher_id, course_code, course_title
       FROM teacher_rosters
       WHERE student_id = $1 AND status = 'enrolled'`,
      [studentId]
    );

    return rows.map(row => ({
      teacherId: Number(row.teacher_id),
      courseCode: row.course_code,
      courseTitle: row.course_title
    }));
  } catch (error) {
    console.error('Failed to get student assigned courses', error);
    return [];
  }
}

export async function listClassroomsWithAvailability(studentId?: number): Promise<ClassroomAvailability[]> {
  const pool = getPool();
  
  // Get current semester to filter courses
  let currentSemester = '1/2026';
  try {
    const { getCurrentSemester } = await import('./systemService.js');
    currentSemester = await getCurrentSemester();
    console.log(`[ClassroomService] Filtering available classrooms by current semester: ${currentSemester}`);
  } catch (error) {
    console.error('[ClassroomService] Failed to get current semester, using default:', error);
  }
  
  const [classrooms, counts] = await Promise.all([listClassrooms(), getClassroomEnrollmentCounts()]);

  // Calculate seat counts per course (courseCode + weekday + startTime) from timetables
  const perCourseEnrollmentCounts = new Map<string, number>(); // key: courseCode|weekday|startTime
  
  if (pool) {
    try {
      const { rows } = await pool.query(
        `SELECT ta.course_code, ta.weekday, to_char(ta.start_time, 'HH24:MI') AS start_time, COUNT(DISTINCT t.student_id)::int AS student_count
         FROM teaching_assignments ta
         LEFT JOIN timetables t ON 
           LOWER(TRIM(t.subject)) = LOWER(TRIM(ta.course_title))
           AND t.weekday = ta.weekday
           AND to_char(t.start_time, 'HH24:MI') = to_char(ta.start_time, 'HH24:MI')
           AND to_char(t.end_time, 'HH24:MI') = to_char(ta.end_time, 'HH24:MI')
           AND t.location::TEXT = ta.classroom_id::TEXT
         WHERE ta.semester = $1
         GROUP BY ta.course_code, ta.weekday, ta.start_time
         ORDER BY ta.course_code, ta.weekday, ta.start_time`,
        [currentSemester]
      );
      
      console.log(`[ClassroomService] Per-course enrollment counts from timetables:`);
      for (const row of rows) {
        const key = `${row.course_code}|${row.weekday}|${row.start_time}`;
        const count = Number(row.student_count || 0);
        perCourseEnrollmentCounts.set(key, count);
        console.log(`[ClassroomService]   ${row.course_code} ${row.weekday} ${row.start_time}: ${count} student(s)`);
      }
    } catch (error) {
      console.error('[ClassroomService] Failed to calculate per-course enrollment counts', error);
    }
  }

  // Fetch teaching assignments for all classrooms
  let classroomCourses = new Map<number, Array<{ courseCode: string; courseTitle: string; weekday: string; startTime: string; endTime: string; majorFocus: string; teacherId: number; teacherName: string | null }>>();

  if (pool) {
    try {
      const { rows } = await pool.query(
        `SELECT DISTINCT ON (ta.classroom_id, ta.course_code, ta.weekday, ta.start_time, ta.teacher_id)
                ta.classroom_id, ta.teacher_id, ta.course_code, ta.course_title, ta.weekday, 
                to_char(ta.start_time, 'HH24:MI') AS start_time, 
                to_char(ta.end_time, 'HH24:MI') AS end_time, 
                ta.major_focus,
                sa.display_name AS teacher_name
         FROM teaching_assignments ta
         LEFT JOIN staff_accounts sa ON ta.teacher_id = sa.id
         WHERE ta.semester = $1
         ORDER BY ta.classroom_id, ta.course_code, ta.weekday, ta.start_time, ta.teacher_id, ta.id ASC`,
        [currentSemester]
      );

      console.log(`[ClassroomService] Found ${rows.length} teaching assignments for classrooms`);

      // Track unique courses per classroom to avoid duplicates
      const uniqueCourseKeys = new Map<number, Set<string>>();

      for (const row of rows) {
        const classroomId = Number(row.classroom_id);
        if (!classroomCourses.has(classroomId)) {
          classroomCourses.set(classroomId, []);
          uniqueCourseKeys.set(classroomId, new Set());
        }
        
        const courseData = {
          courseCode: row.course_code || row.courseCode,
          courseTitle: row.course_title || row.courseTitle,
          weekday: row.weekday,
          startTime: row.start_time || row.startTime,
          endTime: row.end_time || row.endTime,
          majorFocus: row.major_focus || row.majorFocus,
          teacherId: Number(row.teacher_id),
          teacherName: row.teacher_name || null
        };
        
        // Create a unique key for this course (courseCode + weekday + startTime + teacherId)
        const courseKey = `${courseData.courseCode}|${courseData.weekday}|${courseData.startTime}|${courseData.teacherId}`;
        const classroomKeys = uniqueCourseKeys.get(classroomId)!;
        
        // Only add if this course hasn't been added to this classroom yet
        if (!classroomKeys.has(courseKey)) {
          classroomKeys.add(courseKey);
        classroomCourses.get(classroomId)!.push(courseData);
        console.log(`[ClassroomService] Added course "${courseData.courseTitle}" (${courseData.majorFocus}) by ${courseData.teacherName || 'Unknown'} to classroom ${classroomId}`);
        } else {
          console.log(`[ClassroomService] Skipped duplicate course "${courseData.courseTitle}" (${courseKey}) in classroom ${classroomId}`);
        }
      }
      
      // Log summary of courses per classroom
      for (const [classroomId, courses] of classroomCourses.entries()) {
        const classroom = classrooms.find(c => c.id === classroomId);
        if (!classroom) {
          console.warn(`[ClassroomService] WARNING: Teaching assignments reference classroom_id ${classroomId} which does not exist in classrooms table!`);
        }
        console.log(`[ClassroomService] Classroom ${classroomId} (${classroom?.name || 'Unknown'}) has ${courses.length} course(s): ${courses.map(c => `${c.courseTitle} (${c.majorFocus}) by ${c.teacherName || 'Unknown'}`).join(', ')}`);
      }
    } catch (error) {
      console.error('Failed to fetch teaching assignments for classrooms', error);
    }
  } else {
    // For in-memory mode, get assignments from teaching service
    try {
      const { listTeachingAssignments } = await import('./teachingService.js');
      const { findStaffById } = await import('./staffService.js');
      const allAssignments = await listTeachingAssignments();
      
      // Filter assignments by current semester
      const assignments = allAssignments.filter(assignment => assignment.semester === currentSemester);
      console.log(`[ClassroomService] Filtered ${assignments.length} assignments for semester ${currentSemester} (from ${allAssignments.length} total)`);
      
      for (const assignment of assignments) {
        const classroomId = assignment.classroomId;
        if (!classroomCourses.has(classroomId)) {
          classroomCourses.set(classroomId, []);
        }
        
        // Get teacher name
        const teacher = await findStaffById(assignment.teacherId);
        const teacherName = teacher?.displayName || null;
        
        classroomCourses.get(classroomId)!.push({
          courseCode: assignment.courseCode,
          courseTitle: assignment.courseTitle,
          weekday: assignment.weekday,
          startTime: assignment.startTime,
          endTime: assignment.endTime,
          majorFocus: assignment.majorFocus,
          teacherId: assignment.teacherId,
          teacherName: teacherName
        });
      }
    } catch (error) {
      console.error('Failed to fetch teaching assignments for classrooms (in-memory)', error);
    }
  }

  // If studentId is provided, show all classrooms with teaching assignments
  // but filter courses within each classroom to match the student's major
  let filteredClassrooms = classrooms;
  let studentMajor: string | null = null;
  let studentRegisteredCourses = new Set<string>(); // Set of "course_code|teacher_id|weekday|startTime" the student is registered for
  let studentRegisteredCourseCodes = new Set<string>(); // Set of course codes student is registered for (to block same subject)

  if (studentId) {
    // Get student's major
    console.log(`[ClassroomService] Fetching student ${studentId}'s major...`);
    const pool = getPool();
    if (pool) {
      try {
        const { rows } = await pool.query(
          `SELECT primary_interest FROM students WHERE id = $1`,
          [studentId]
        );
        if (rows.length > 0) {
          studentMajor = rows[0].primary_interest;
          console.log(`[ClassroomService] Student ${studentId} major from database: "${studentMajor}"`);
        } else {
          console.warn(`[ClassroomService] Student ${studentId} not found in database`);
        }
      } catch (error) {
        console.error('Failed to fetch student major', error);
      }
    } else {
      // In-memory mode
      try {
        const { listStudents } = await import('./studentService.js');
        const students = await listStudents();
        const student = students.find(s => s.id === studentId);
        studentMajor = student?.primaryInterest ?? null;
        console.log(`[ClassroomService] Student ${studentId} major from in-memory: "${studentMajor}"`);
      } catch (error) {
        console.error('Failed to fetch student major (in-memory)', error);
      }
    }

    // Filter by MAJOR and TEACHER (course major_focus), not classroom resources
    // A student sees classrooms that have teaching assignments where:
    // - The course's major_focus matches the student's major
    // - Any teacher can teach it (we show all teachers for that major)
    if (studentMajor) {
      const normalizedStudentMajor = normalizeMajorName(studentMajor);
      const matchingClassroomIds = new Set<number>();
      
      // Find all teaching assignments where course major_focus matches student's major
      // We group by classroom, but the key filter is: course major_focus = student major
      console.log(`[ClassroomService] Filtering by MAJOR: Looking for courses with major_focus matching student major "${studentMajor}" (normalized: "${normalizedStudentMajor}")`);
      console.log(`[ClassroomService] Total teaching assignments across ${classroomCourses.size} classrooms`);

      for (const [classroomId, courses] of classroomCourses.entries()) {
        // Check each course in this classroom - does its major_focus match the student's major?
        const hasMatchingCourse = courses.some(course => {
          const courseMajor = normalizeMajorName(course.majorFocus);
          const exactMatch = courseMajor === normalizedStudentMajor;
          const includesMatch = courseMajor.includes(normalizedStudentMajor) || normalizedStudentMajor.includes(courseMajor);
          const matches = exactMatch || includesMatch;

          if (matches) {
            console.log(`[ClassroomService] ✓ MATCH: Course "${course.courseTitle}" by ${course.teacherName || 'Unknown'} (major_focus: "${course.majorFocus}" -> "${courseMajor}") matches student major "${studentMajor}"`);
          } else {
            console.log(`[ClassroomService] ✗ NO MATCH: Course "${course.courseTitle}" by ${course.teacherName || 'Unknown'} (major_focus: "${course.majorFocus}" -> "${courseMajor}") does NOT match student major "${studentMajor}"`);
          }
          
          return matches;
        });
        
        if (hasMatchingCourse) {
          matchingClassroomIds.add(classroomId);
        }
      }

      // Only show classrooms that have teaching assignments with matching major_focus
      filteredClassrooms = classrooms.filter(room => matchingClassroomIds.has(room.id));
      
      // Collect all matching courses (filtered by major_focus)
      const matchingCourses = Array.from(matchingClassroomIds).flatMap(classroomId => {
        const courses = classroomCourses.get(classroomId) ?? [];
        return courses.filter(c => {
          const courseMajor = normalizeMajorName(c.majorFocus);
          return courseMajor === normalizedStudentMajor || 
                 courseMajor.includes(normalizedStudentMajor) || 
                 normalizedStudentMajor.includes(courseMajor);
        });
      });
      
      console.log(`[ClassroomService] RESULT: Found ${matchingCourses.length} course(s) with major_focus="${studentMajor}" taught by: ${[...new Set(matchingCourses.map(c => c.teacherName || 'Unknown'))].join(', ') || 'None'}`);
      console.log(`[ClassroomService] Showing ${filteredClassrooms.length} classroom(s) that contain these courses`);
      
      if (matchingCourses.length === 0) {
        // Log all available teaching assignments to help debug
        const allCourses = Array.from(classroomCourses.entries()).flatMap(([classroomId, courses]) => 
          courses.map(c => ({ classroomId, classroomName: classrooms.find(cr => cr.id === classroomId)?.name, ...c }))
        );
        console.warn(`[ClassroomService] ⚠ NO MATCHES: No teaching assignments found with major_focus matching "${studentMajor}" (normalized: "${normalizedStudentMajor}")`);
        console.warn(`[ClassroomService] All available teaching assignments:`);
        allCourses.forEach(c => {
          console.warn(`  - "${c.courseTitle}" by ${c.teacherName || 'Unknown'} | major_focus: "${c.majorFocus}" | classroom: ${c.classroomId} (${c.classroomName})`);
        });
        console.warn(`[ClassroomService] Unique major_focus values in database: ${[...new Set(allCourses.map(c => c.majorFocus))].join(', ') || 'None'}`);
    } else {
        console.log(`[ClassroomService] Matching teaching assignments:`);
        matchingCourses.forEach(c => {
          console.log(`  ✓ "${c.courseTitle}" by ${c.teacherName || 'Unknown'} | major_focus: "${c.majorFocus}" | ${c.weekday} ${c.startTime}-${c.endTime}`);
        });
      }
    } else {
      // If no major, show all classrooms with teaching assignments
      const classroomsWithAssignments = new Set<number>(classroomCourses.keys());
      filteredClassrooms = classrooms.filter(room => classroomsWithAssignments.has(room.id));
      console.log(`[ClassroomService] Showing ${filteredClassrooms.length} classrooms with teaching assignments (student has no major)`);
    }
    
    // If studentId is provided, check course-specific registration status from timetables
    // Use timetables instead of teacher_rosters to support multiple sections of same course code
    if (studentId && pool) {
      try {
        // Get all timetable entries for the student
        const { rows: timetableRows } = await pool.query(
          `SELECT t.id, t.subject, t.weekday, 
                  to_char(t.start_time, 'HH24:MI') AS start_time,
                  to_char(t.end_time, 'HH24:MI') AS end_time,
                  t.location
           FROM timetables t
           WHERE t.student_id = $1
           ORDER BY t.weekday, t.start_time`,
          [studentId]
        );
        
        console.log(`[ClassroomService] Found ${timetableRows.length} timetable entries for student ${studentId}`);
        
        // For each timetable entry, find the matching teaching assignment BY EXACT MATCH
        for (const timetable of timetableRows) {
          console.log(`[ClassroomService] Processing timetable:`, {
            subject: timetable.subject,
            weekday: timetable.weekday,
            startTime: timetable.start_time,
            endTime: timetable.end_time,
            location: timetable.location
          });
          
          // Find the teaching assignment that matches this exact timetable entry
          const { rows: matchingAssignments } = await pool.query(
            `SELECT ta.course_code, ta.teacher_id, ta.course_title, ta.classroom_id
             FROM teaching_assignments ta
             WHERE LOWER(TRIM(ta.course_title)) = LOWER(TRIM($1))
               AND ta.weekday = $2
               AND to_char(ta.start_time, 'HH24:MI') = $3
               AND to_char(ta.end_time, 'HH24:MI') = $4
               AND ta.classroom_id::TEXT = $5`,
            [timetable.subject, timetable.weekday, timetable.start_time, timetable.end_time, timetable.location]
          );
          
          if (matchingAssignments.length > 0) {
            const match = matchingAssignments[0];
            const key = `${match.course_code}|${match.teacher_id}|${timetable.weekday}|${timetable.start_time}`;
            studentRegisteredCourses.add(key);
            studentRegisteredCourseCodes.add(match.course_code);
            console.log(`[ClassroomService] ✓ Matched: "${timetable.subject}" → ${match.course_code} by teacher ${match.teacher_id} (key: ${key})`);
          } else {
            console.warn(`[ClassroomService] ⚠️ No teaching assignment match for: "${timetable.subject}" on ${timetable.weekday} ${timetable.start_time}-${timetable.end_time} at location ${timetable.location}`);
        }
        }
        
        console.log(`[ClassroomService] Student ${studentId} registered courses:`, Array.from(studentRegisteredCourses));
        console.log(`[ClassroomService] Student ${studentId} registered course codes:`, Array.from(studentRegisteredCourseCodes));
      } catch (error) {
        console.error('Failed to fetch student course registrations', error);
      }
    }
    
    // Check if any assignments reference non-existent classrooms
    const allClassroomIds = new Set(classroomCourses.keys());
    const missingClassrooms = Array.from(allClassroomIds).filter(id => !classrooms.find(c => c.id === id));
    if (missingClassrooms.length > 0) {
      console.warn(`[ClassroomService] WARNING: Teaching assignments reference classroom IDs that don't exist: ${missingClassrooms.join(', ')}`);
    }
  }

  const result = filteredClassrooms.map((room) => {
    // Note: We'll calculate seatsFilled and seatsAvailable per course, not per classroom
    // For the classroom-level display, we'll use the max across all courses
    const focusAreas = room.focusAreas?.length
      ? room.focusAreas
      : extractFocusAreasFromResources(room.resources);

    // Get all courses for this classroom
    const courses = classroomCourses.get(room.id) ?? [];

    // If student has a major, filter courses to only show those matching the student's major
    let displayedCourses = courses;
    if (studentId && studentMajor) {
      const normalizedStudentMajor = normalizeMajorName(studentMajor);
      displayedCourses = courses.filter(course => {
        const courseMajor = normalizeMajorName(course.majorFocus);
        const matches = courseMajor === normalizedStudentMajor || 
               courseMajor.includes(normalizedStudentMajor) || 
               normalizedStudentMajor.includes(courseMajor);
        if (matches) {
          console.log(`[ClassroomService] ✓ Including course "${course.courseTitle}" by ${course.teacherName || 'Unknown'} (${course.majorFocus}) in classroom ${room.id} (${room.name})`);
        }
        return matches;
      });
    } else {
      // No student or no major - show all courses
      displayedCourses = courses;
    }

    // Calculate per-course seat counts and use the max for classroom-level display
    const coursesWithEnrollment = displayedCourses.map(c => {
      // Check if student is registered for this specific course section (by course_code, teacher_id, weekday, and startTime)
      const registrationKey = `${c.courseCode}|${c.teacherId}|${c.weekday}|${c.startTime}`;
      const isRegistered = studentRegisteredCourses.has(registrationKey);
      
      // Check if student has this course code registered (to block same subject at different times)
      const sameSubjectRegistered = studentRegisteredCourseCodes.has(c.courseCode) && !isRegistered;
      
      // Get enrollment count for THIS specific course (not the whole classroom)
      const enrollmentKey = `${c.courseCode}|${c.weekday}|${c.startTime}`;
      const courseSeatsFilled = perCourseEnrollmentCounts.get(enrollmentKey) ?? 0;
      
      if (c.courseCode === 'HPM-001' || c.courseCode === 'HPM-002' || c.courseCode === 'IT-003' || c.courseCode === 'Cb-002') {
        console.log(`[ClassroomService] DEBUG: Seat count for ${c.courseCode} - ${c.courseTitle}`);
        console.log(`[ClassroomService]   Enrollment key: ${enrollmentKey}`);
        console.log(`[ClassroomService]   Seats filled: ${courseSeatsFilled}/${room.capacity}`);
        console.log(`[ClassroomService]   Registration key: ${registrationKey}`);
        console.log(`[ClassroomService]   isRegistered (this exact slot): ${isRegistered}`);
        console.log(`[ClassroomService]   sameSubjectRegistered (same code, diff time): ${sameSubjectRegistered}`);
      }
      
        return {
          courseCode: c.courseCode,
          courseTitle: c.courseTitle,
          weekday: c.weekday,
          startTime: c.startTime,
          endTime: c.endTime,
          majorFocus: c.majorFocus,
          teacherName: c.teacherName,
        isRegistered,
        sameSubjectRegistered, // Block if same course code already registered
        seatsFilled: courseSeatsFilled, // Per-course seat count
        seatsAvailable: Math.max(room.capacity - courseSeatsFilled, 0),
        isFull: courseSeatsFilled >= room.capacity
        };
    });
    
    // For classroom-level stats, use the max enrollment across all courses
    const maxCourseSeatsFilled = coursesWithEnrollment.length > 0 
      ? Math.max(...coursesWithEnrollment.map(c => c.seatsFilled))
      : 0;
    
    const classroomData = {
      ...room,
      seatsFilled: maxCourseSeatsFilled, // Use max enrollment for classroom display
      seatsAvailable: Math.max(room.capacity - maxCourseSeatsFilled, 0),
      isFull: maxCourseSeatsFilled >= room.capacity,
      focusAreas,
      courses: coursesWithEnrollment
    } satisfies ClassroomAvailability;
    
    console.log(`[ClassroomService] Returning classroom ${room.id} (${room.name}) with ${displayedCourses.length} course(s) matching student major`);
    
    return classroomData;
  });
  
  console.log(`[ClassroomService] FINAL RESULT: Returning ${result.length} classroom(s) to student ${studentId}${studentMajor ? ` (major: "${studentMajor}")` : ' (no major)'}`);
  if (result.length > 0) {
    result.forEach(room => {
      console.log(`[ClassroomService]   - Classroom ${room.id}: "${room.name}" with ${room.courses?.length || 0} course(s)`);
      room.courses?.forEach(course => {
        console.log(`[ClassroomService]     • ${course.courseTitle} by ${course.teacherName || 'Unknown'} (${course.majorFocus})`);
      });
    });
  }
  
  return result;
}

export async function registerStudentForClassroom(
  studentId: number,
  classroomId: number,
  courseCode?: string, // Optional: if provided, register only for this specific course
  specificWeekday?: string, // Optional: specific weekday to register for (used for conflict checking)
  specificStartTime?: string // Optional: specific start time to register for (used for conflict checking)
): Promise<ClassroomEnrollment> {
  console.log(`[ClassroomService] registerStudentForClassroom called with: studentId=${studentId}, classroomId=${classroomId}, courseCode=${courseCode}, specificWeekday=${specificWeekday}, specificStartTime=${specificStartTime}`);
  
  if (!Number.isFinite(studentId) || !Number.isFinite(classroomId)) {
    throw new Error('Invalid registration request.');
  }

  const classroom = await getClassroomById(classroomId);

  if (!classroom) {
    throw new Error('Classroom not found.');
  }

  // Check if registration period is still open
  const currentSemester = await getCurrentSemester();
  const { getRegistrationStatus } = await import('./systemService.js');
  const registrationStatus = await getRegistrationStatus(currentSemester);
  
  if (!registrationStatus.open) {
    throw new Error(registrationStatus.message || 'Registration is not available at this time.');
  }

  // If registering for a specific course, check if student is already registered for that course
  if (courseCode) {
    const pool = getPool();
    if (pool) {
      try {
        // Check if student is already registered for this specific course
        // IMPORTANT: Query by course_code ONLY, not by classroom_id
        console.log(`[ClassroomService] Checking registration for student ${studentId}, courseCode: "${courseCode}" (NOT checking by classroom)`);
        
        const assignmentResult = await pool.query(
          `SELECT ta.course_code, ta.course_title, ta.teacher_id, ta.classroom_id
           FROM teaching_assignments ta
           WHERE ta.course_code = $1
           LIMIT 1`,
          [courseCode]
        );

        if (assignmentResult.rows.length === 0) {
          throw new Error(`Course ${courseCode} not found in the system.`);
        }

        const courseTitle = assignmentResult.rows[0].course_title;
        const teacherId = assignmentResult.rows[0].teacher_id;
        const assignmentClassroomId = assignmentResult.rows[0].classroom_id;
        
        // Verify the course is in the requested classroom
        if (assignmentClassroomId !== classroomId) {
          console.error(`[ClassroomService] ERROR: Course ${courseCode} is in classroom ${assignmentClassroomId}, not ${classroomId}`);
          throw new Error(`Course ${courseCode} is not available in the selected classroom. Please select the correct classroom for this course.`);
        }
        
        console.log(`[ClassroomService] Found teaching assignment: ${courseCode} - "${courseTitle}" (teacher: ${teacherId}, classroom: ${assignmentClassroomId})`);

        // Check for schedule conflicts - use specific weekday/time if provided, otherwise get first match
        let scheduleResult;
        let courseWeekday: string | undefined;
        let courseStartTime: string | undefined;
        let courseEndTime: string | undefined;

        if (specificWeekday && specificStartTime) {
          // Use the specific weekday and time provided (for agent API)
          scheduleResult = await pool.query(
            `SELECT weekday, start_time, end_time 
             FROM teaching_assignments 
             WHERE course_code = $1 
               AND LOWER(TRIM(weekday)) = LOWER(TRIM($2))
               AND to_char(start_time, 'HH24:MI') = $3`,
            [courseCode, specificWeekday, specificStartTime]
          );
        } else {
          // Fallback: get first match by course_code only (for backward compatibility)
          scheduleResult = await pool.query(
          `SELECT weekday, start_time, end_time 
           FROM teaching_assignments 
           WHERE course_code = $1
           LIMIT 1`,
          [courseCode]
        );
        }

        // Get weekday and time for conflict checking - use specificWeekday/specificStartTime if provided, otherwise from scheduleResult
        if (scheduleResult.rows.length > 0) {
          courseWeekday = scheduleResult.rows[0].weekday;
          courseStartTime = scheduleResult.rows[0].start_time;
          courseEndTime = scheduleResult.rows[0].end_time;
        } else if (specificWeekday && specificStartTime) {
          // Use provided weekday and time even if scheduleResult is empty
          courseWeekday = specificWeekday;
          // Get start_time and end_time from teaching_assignments
          const timeResult = await pool.query(
            `SELECT start_time, end_time 
             FROM teaching_assignments 
             WHERE course_code = $1 
               AND LOWER(TRIM(weekday)) = LOWER(TRIM($2))
               AND to_char(start_time, 'HH24:MI') = $3
             LIMIT 1`,
            [courseCode, specificWeekday, specificStartTime]
          );
          if (timeResult.rows.length > 0) {
            courseStartTime = timeResult.rows[0].start_time;
            courseEndTime = timeResult.rows[0].end_time;
          } else {
            // Fallback: use provided time and assume 1 hour duration
            courseStartTime = specificStartTime as any; // Will be formatted in conflict check
            courseEndTime = specificStartTime as any; // Will be formatted in conflict check
          }
        }

        // ALWAYS run time conflict check if we have weekday and time
        const checkWeekday = courseWeekday || specificWeekday;
        const checkStartTime = courseStartTime || specificStartTime;
        
        if (checkWeekday && checkStartTime) {
          
          console.log(`[ClassroomService] ======================================`);
          console.log(`[ClassroomService] TIME CONFLICT CHECK (ALWAYS RUNS)`);
          console.log(`[ClassroomService] New course: "${courseTitle}" (${courseCode})`);
          console.log(`[ClassroomService] Schedule: ${checkWeekday} ${checkStartTime}-${courseEndTime || 'TBD'}`);
          console.log(`[ClassroomService] Student ID: ${studentId}`);

          // Normalize weekday for comparison (case-insensitive, trim whitespace)
          const normalizedWeekday = checkWeekday.trim().toLowerCase();
          
          // First, show ALL existing timetable entries for this student on this day
          const allDaySchedule = await pool.query(
            `SELECT t.id, t.subject, t.weekday, 
                    to_char(t.start_time, 'HH24:MI') AS start_time_fmt,
                    to_char(t.end_time, 'HH24:MI') AS end_time_fmt,
                    t.start_time, t.end_time
             FROM timetables t
             WHERE t.student_id = $1 AND LOWER(TRIM(t.weekday)) = $2
             ORDER BY t.start_time`,
            [studentId, normalizedWeekday]
          );

          console.log(`[ClassroomService] Student's current schedule for ${checkWeekday} (normalized: "${normalizedWeekday}"):`);
          if (allDaySchedule.rows.length === 0) {
            console.log(`[ClassroomService]   (no classes scheduled)`);
          } else {
            allDaySchedule.rows.forEach((entry, idx) => {
              console.log(`[ClassroomService]   ${idx + 1}. "${entry.subject}" ${entry.start_time_fmt}-${entry.end_time_fmt}`);
            });
          }

          // Format times consistently for comparison (HH24:MI format)
          // PostgreSQL TIME types are returned as strings in "HH:MM:SS" format
          // Use checkStartTime (which is courseStartTime or specificStartTime)
          const timeToFormat = checkStartTime;
          const courseStartTimeFormatted = typeof timeToFormat === 'string' 
            ? (timeToFormat.length >= 5 ? timeToFormat.slice(0, 5) : timeToFormat) // Extract HH:MM from "HH:MM:SS" or use as-is
            : String(timeToFormat).slice(0, 5);
          const checkEndTime = courseEndTime || (checkStartTime ? checkStartTime : undefined);
          const courseEndTimeFormatted = checkEndTime 
            ? (typeof checkEndTime === 'string' 
                ? (checkEndTime.length >= 5 ? checkEndTime.slice(0, 5) : checkEndTime)
                : String(checkEndTime).slice(0, 5))
            : courseStartTimeFormatted; // Fallback to start time if end time not available
          
          console.log(`[ClassroomService] Formatted times for comparison: ${courseStartTimeFormatted} - ${courseEndTimeFormatted}`);
          
          // Check timetables for time conflicts (students cannot take two classes at the same time)
          // SIMPLIFIED: Just check if there's ANY course at the same time on the same day
          // Exclude the EXACT course being registered (same title, day, and times)
          const timetableConflictCheck = await pool.query(
            `SELECT t.id, t.subject, t.weekday, 
                    to_char(t.start_time, 'HH24:MI') AS start_time_fmt,
                    to_char(t.end_time, 'HH24:MI') AS end_time_fmt,
                    t.start_time, t.end_time
             FROM timetables t
             WHERE t.student_id = $1 
               AND LOWER(TRIM(t.weekday)) = $2
               -- Exclude the exact same course (prevents self-conflict)
               AND NOT (
                 LOWER(TRIM(t.subject)) = LOWER(TRIM($3))
                 AND to_char(t.start_time, 'HH24:MI') = $4
                 AND to_char(t.end_time, 'HH24:MI') = $5
               )
               -- Check for ANY time overlap (simplified logic)
               AND (
                 -- New course starts during existing course
                 (to_char(t.start_time, 'HH24:MI') <= $4 AND to_char(t.end_time, 'HH24:MI') > $4)
                 -- New course ends during existing course
                 OR (to_char(t.start_time, 'HH24:MI') < $5 AND to_char(t.end_time, 'HH24:MI') >= $5)
                 -- New course completely contains existing course
                 OR (to_char(t.start_time, 'HH24:MI') >= $4 AND to_char(t.end_time, 'HH24:MI') <= $5)
                 -- Existing course completely contains new course
                 OR (to_char(t.start_time, 'HH24:MI') <= $4 AND to_char(t.end_time, 'HH24:MI') >= $5)
               )`,
            [studentId, normalizedWeekday, courseTitle, courseStartTimeFormatted, courseEndTimeFormatted]
          );
            
          // CRITICAL: Simple direct check - ANY course at same time on same day = CONFLICT
          // NO EXCEPTIONS - if there's ANY course at this time, block registration
          // This checks DAY and TIME only, regardless of course or teacher
          const allCoursesAtThisTime = await pool.query(
            `SELECT t.id, t.subject, t.weekday, 
                    to_char(t.start_time, 'HH24:MI') AS start_time_fmt,
                    to_char(t.end_time, 'HH24:MI') AS end_time_fmt
             FROM timetables t
             WHERE t.student_id = $1 
               AND LOWER(TRIM(t.weekday)) = $2
               AND to_char(t.start_time, 'HH24:MI') = $3`,
            [studentId, normalizedWeekday, courseStartTimeFormatted]
          );
          
          console.log(`[ClassroomService] ======================================`);
          console.log(`[ClassroomService] ⚠️ CRITICAL TIME CONFLICT CHECK ⚠️`);
          console.log(`[ClassroomService] Student ID: ${studentId}`);
          console.log(`[ClassroomService] Day: "${normalizedWeekday}" (original: "${checkWeekday}")`);
          console.log(`[ClassroomService] Time: "${courseStartTimeFormatted}"`);
          console.log(`[ClassroomService] New course: "${courseTitle}" (${courseCode})`);
          console.log(`[ClassroomService] Query: Looking for ANY course on "${normalizedWeekday}" at "${courseStartTimeFormatted}"`);
          console.log(`[ClassroomService] Found ${allCoursesAtThisTime.rows.length} existing course(s) at this exact time:`);
          
          if (allCoursesAtThisTime.rows.length > 0) {
            allCoursesAtThisTime.rows.forEach((row, idx) => {
              console.log(`[ClassroomService]   ${idx + 1}. ID:${row.id} "${row.subject}" on ${row.weekday} (${row.start_time_fmt}-${row.end_time_fmt})`);
            });
            
            // BLOCK REGISTRATION - ANY course at same time = CONFLICT
            // Don't check if it's the same course - if there's ANY course, it's a conflict
            const conflict = allCoursesAtThisTime.rows[0];
            console.error(`[ClassroomService] ❌❌❌ BLOCKING REGISTRATION - TIME CONFLICT ❌❌❌`);
            console.error(`[ClassroomService]   Student already has: "${conflict.subject}" at ${conflict.start_time_fmt} on ${conflict.weekday}`);
            console.error(`[ClassroomService]   Trying to register: "${courseTitle}" (${courseCode}) at ${courseStartTimeFormatted} on ${checkWeekday}`);
            console.error(`[ClassroomService]   RULE: Students CANNOT take two classes at the same time, regardless of course or teacher!`);
            throw new Error(`SCHEDULE_CONFLICT: You cannot take two classes at the same time!\n\nYou are trying to register:\n"${courseTitle}" (${courseCode}) on ${checkWeekday} (${courseStartTimeFormatted}-${courseEndTimeFormatted})\n\nThis conflicts with:\n  • "${conflict.subject}" on ${conflict.weekday} (${conflict.start_time_fmt} - ${conflict.end_time_fmt})\n\nPlease choose a different time slot.`);
          } else {
            console.log(`[ClassroomService] ✓ No existing courses at this time - registration allowed`);
          }
          console.log(`[ClassroomService] ======================================`);
          
          // Also do the overlap check for completeness (already handled above, but keep for compatibility)
          const exactTimeConflict = allCoursesAtThisTime.rows.filter(row => 
            row.subject.trim().toLowerCase() !== courseTitle.trim().toLowerCase()
          );

          console.log(`[ClassroomService] Conflict check query parameters:`);
          console.log(`[ClassroomService]   studentId: ${studentId}`);
          console.log(`[ClassroomService]   normalizedWeekday: "${normalizedWeekday}"`);
          console.log(`[ClassroomService]   checkStartTime: ${checkStartTime} (type: ${typeof checkStartTime}, formatted: ${courseStartTimeFormatted})`);
          console.log(`[ClassroomService]   checkEndTime: ${checkEndTime} (type: ${typeof checkEndTime}, formatted: ${courseEndTimeFormatted})`);
          console.log(`[ClassroomService]   courseTitle: "${courseTitle}"`);
          console.log(`[ClassroomService] Overlap conflict check returned ${timetableConflictCheck.rows.length} conflict(s)`);
          
          // Combine both conflict checks - if EITHER finds a conflict, block registration
          // Note: exactTimeConflict is already handled above with early throw, but keep this for overlap cases
          const allConflicts = [...timetableConflictCheck.rows, ...exactTimeConflict];
          
          // Remove duplicates based on timetable ID
          const uniqueConflicts = Array.from(
            new Map(allConflicts.map(row => [row.id, row])).values()
          );
          
          console.log(`[ClassroomService] Total unique conflicts found: ${uniqueConflicts.length}`);
          
          if (uniqueConflicts.length > 0) {
            console.log(`[ClassroomService] Conflicting entries:`);
            uniqueConflicts.forEach((row, idx) => {
              console.log(`[ClassroomService]   ${idx + 1}. "${row.subject}" on ${row.weekday} (${row.start_time_fmt}-${row.end_time_fmt})`);
            });
            
            const conflictingCourses = uniqueConflicts.map(row => 
              `"${row.subject}" on ${row.weekday} (${row.start_time_fmt} - ${row.end_time_fmt})`
            ).join('\n  • ');
            
            console.warn(`[ClassroomService] ⚠️ TIME CONFLICT DETECTED`);
            console.warn(`[ClassroomService]   New: "${courseTitle}" on ${checkWeekday} (${courseStartTimeFormatted}-${courseEndTimeFormatted})`);
            console.warn(`[ClassroomService]   Conflicts with:\n  • ${conflictingCourses}`);
            
            throw new Error(`SCHEDULE_CONFLICT: You cannot take two classes at the same time!\n\nYou are trying to register:\n"${courseTitle}" on ${checkWeekday} (${courseStartTimeFormatted}-${courseEndTimeFormatted})\n\nThis conflicts with:\n  • ${conflictingCourses}\n\nPlease choose a different time slot.`);
          }
          
          console.log(`[ClassroomService] ✓ No time conflicts found - registration can proceed`);
          console.log(`[ClassroomService] ======================================`);
        }

        // Check if student is already registered for this course code (same subject)
        // Students CANNOT register for the same course code twice, even at different times or with different teachers
        // First, get all time slots for this course code
        const allSlotsForCourse = await pool.query(
          `SELECT ta.course_title, ta.weekday, 
                  to_char(ta.start_time, 'HH24:MI') AS start_time,
                  to_char(ta.end_time, 'HH24:MI') AS end_time
           FROM teaching_assignments ta
           WHERE ta.course_code = $1 AND ta.teacher_id = $2`,
          [courseCode, teacherId]
        );

        // Hard stop: if the student already has ANY roster entry for this course code, block re-registration
        const { rows: existingCourseCodeEntries } = await pool.query(
          `SELECT tr.id,
                  tr.teacher_id,
                  ta.weekday,
                  to_char(ta.start_time, 'HH24:MI') AS start_time,
                  to_char(ta.end_time, 'HH24:MI') AS end_time
           FROM teacher_rosters tr
           LEFT JOIN teaching_assignments ta
             ON ta.course_code = tr.course_code
            AND ta.teacher_id = tr.teacher_id
           WHERE tr.student_id = $1
             AND tr.course_code = $2
           LIMIT 5`,
          [studentId, courseCode]
        );

        if (existingCourseCodeEntries.length > 0) {
          const existingSlot = existingCourseCodeEntries[0];
          const existingDay = existingSlot?.weekday;
          const existingStart = existingSlot?.start_time;
          const existingEnd = existingSlot?.end_time;
          const existingSummary =
            existingDay && existingStart
              ? `${existingDay} (${existingStart}${existingEnd ? `-${existingEnd}` : ''})`
              : 'a previously confirmed time slot';

          throw new Error(
            `You are already registered for "${courseTitle}" (${courseCode}). Existing slot: ${existingSummary}.`
          );
        }

        console.log(`[ClassroomService] ======================================`);
        console.log(`[ClassroomService] DUPLICATE CHECK for ${courseCode} (${courseTitle})`);
        console.log(`[ClassroomService] Student: ${studentId}, Teacher: ${teacherId}`);
        console.log(`[ClassroomService] Course has ${allSlotsForCourse.rows.length} time slot(s):`);
        allSlotsForCourse.rows.forEach(slot => {
          console.log(`[ClassroomService]   - ${slot.weekday} ${slot.start_time}-${slot.end_time}`);
        });
        
        // Show ALL timetable entries for debugging
        const allTimetables = await pool.query(
          `SELECT t.id, t.subject, t.weekday, 
                  to_char(t.start_time, 'HH24:MI') AS start_time,
                  to_char(t.end_time, 'HH24:MI') AS end_time,
                  t.location
           FROM timetables t
           WHERE t.student_id = $1
           ORDER BY t.weekday, t.start_time`,
          [studentId]
        );
        
        console.log(`[ClassroomService] Student ${studentId} ALL timetable entries (${allTimetables.rows.length} total):`);
        allTimetables.rows.forEach((t, idx) => {
          console.log(`[ClassroomService]   ${idx + 1}. ID:${t.id} "${t.subject}" - ${t.weekday} ${t.start_time}-${t.end_time} (location: ${t.location})`);
        });

        // Check if student is already registered for this course CODE by checking teaching_assignments
        // This is more reliable than matching by course title
        const existingRegistrations = await pool.query(
          `SELECT DISTINCT t.id, t.subject, t.weekday, 
                  to_char(t.start_time, 'HH24:MI') AS start_time,
                  to_char(t.end_time, 'HH24:MI') AS end_time,
                  ta.course_code, ta.teacher_id
           FROM timetables t
           INNER JOIN teaching_assignments ta ON LOWER(TRIM(t.subject)) = LOWER(TRIM(ta.course_title))
                  AND t.weekday = ta.weekday 
                  AND t.start_time = ta.start_time 
                  AND t.end_time = ta.end_time
           WHERE t.student_id = $1 
             AND ta.course_code = $2 
             AND ta.teacher_id = $3`,
          [studentId, courseCode, teacherId]
              );

        console.log(`[ClassroomService] Checking for existing ${courseCode} registrations:`);
        console.log(`[ClassroomService]   - Query params: studentId=${studentId}, courseCode=${courseCode}, teacherId=${teacherId}`);
        console.log(`[ClassroomService]   - Found ${existingRegistrations.rows.length} existing registration(s)`);
        
        if (existingRegistrations.rows.length > 0) {
          existingRegistrations.rows.forEach((entry, idx) => {
            console.log(`[ClassroomService]     ${idx + 1}. "${entry.subject}" (${entry.course_code}) on ${entry.weekday} ${entry.start_time}-${entry.end_time}`);
          });
        }
        
        const existingTimetableReg = existingRegistrations;

        if (existingTimetableReg.rows.length > 0) {
          // Student already registered for this course code
          // Check if it's on the SAME DAY - only block if same day, same time
          const existingEntry = existingTimetableReg.rows[0];
          
          // Normalize times for comparison
          let normalizedSpecificTime = specificStartTime ? specificStartTime.trim() : '';
          if (normalizedSpecificTime && normalizedSpecificTime.match(/^\d:\d{2}$/)) {
            normalizedSpecificTime = '0' + normalizedSpecificTime;
          }
          
          // Check if trying to register on the SAME DAY
          const sameDayRegistrations = specificWeekday ? existingTimetableReg.rows.filter((r: any) =>
            r.weekday.toLowerCase().trim() === specificWeekday.toLowerCase().trim()
          ) : [];

          console.log(`[ClassroomService] Checking ${courseCode} on ${specificWeekday}:`);
          console.log(`[ClassroomService]   - Total existing registrations: ${existingTimetableReg.rows.length}`);
          console.log(`[ClassroomService]   - Same day registrations: ${sameDayRegistrations.length}`);
          
          if (sameDayRegistrations.length > 0) {
            // Student already has this course on the same day
            const sameDayEntry = sameDayRegistrations[0];
            const existingTime = `${sameDayEntry.weekday} at ${sameDayEntry.start_time} - ${sameDayEntry.end_time}`;
            const newTime = `${specificWeekday} at ${normalizedSpecificTime}`;
            
            console.log(`[ClassroomService] ⚠️ DUPLICATE DETECTED - Same course on same day:`);
            console.log(`[ClassroomService]   Already registered: ${existingTime}`);
            console.log(`[ClassroomService]   Trying to register: ${newTime}`);

            // Check if exact same time slot
            const sameTimeSlot = sameDayRegistrations.some((r: any) =>
              r.start_time === normalizedSpecificTime
            );
            
            if (sameTimeSlot) {
              throw new Error(`You are already registered for "${courseTitle}" (${courseCode}) at this exact time.`);
            } else {
              throw new Error(`SCHEDULE_CONFLICT: You are already registered for "${courseTitle}" (${courseCode}) at ${existingTime}. You cannot register for the same subject twice on the same day. You are trying to register for ${newTime}. Please choose a different course or different day.`);
            }
          } else {
            // Same course code but DIFFERENT DAY - ALLOWED
            const existingDays = existingTimetableReg.rows.map((r: any) => 
              `${r.weekday} ${r.start_time}-${r.end_time}`
            ).join(', ');
            console.log(`[ClassroomService] ✓ Same course code but different day - ALLOWED`);
            console.log(`[ClassroomService]   Existing on: ${existingDays}`);
            console.log(`[ClassroomService]   Registering for: ${specificWeekday} at ${normalizedSpecificTime}`);
          }
        }
        
        console.log(`[ClassroomService] No existing registration found for ${courseCode} - student can register`);
      } catch (error: any) {
        // Re-throw if it's our custom error, otherwise continue
        if (error.message && (error.message.includes('already registered') || error.message.includes('not found'))) {
          throw error;
        }
        console.error('[ClassroomService] Error checking course registration:', error);
      }
    }
  }

  const existing = await findStudentClassroomEnrollment(studentId, classroomId);
            
  if (existing) {
    // Student is already registered for the classroom
    // If registering for a specific course, check if they already have that course
    // If not registering for a specific course (backward compatibility), throw error
    if (!courseCode) {
      throw new Error('You are already registered for this classroom.');
    }
    
    // IMPORTANT: When courseCode is provided, we ONLY want to register for that specific course
    // Do NOT auto-register for other courses in the same classroom
    const pool = getPool();
    if (pool) {
      try {
        // Check if they already have this SPECIFIC course - query by course_code ONLY
        const assignmentForCourse = await pool.query(
          `SELECT ta.teacher_id, ta.course_code, ta.course_title, ta.classroom_id
           FROM teaching_assignments ta
           WHERE ta.course_code = $1
           LIMIT 1`,
          [courseCode]
        );
        
        if (assignmentForCourse.rows.length > 0) {
          const teacherId = assignmentForCourse.rows[0].teacher_id;
          const assignmentClassroomId = assignmentForCourse.rows[0].classroom_id;
          
          // Verify course is in the requested classroom
          if (assignmentClassroomId !== classroomId) {
            console.error(`[ClassroomService] ERROR: Course ${courseCode} is in classroom ${assignmentClassroomId}, not ${classroomId}`);
            throw new Error(`Course ${courseCode} is not available in the selected classroom. Please select the correct classroom for this course.`);
          }
          
          const existingCourseInRoster = await pool.query(
            `SELECT id FROM teacher_rosters 
             WHERE student_id = $1 AND course_code = $2 AND teacher_id = $3`,
            [studentId, courseCode, teacherId]
          );
          
          if (existingCourseInRoster.rows.length > 0) {
            throw new Error(`You are already registered for ${assignmentForCourse.rows[0].course_title} (${courseCode}).`);
          }
        }

        // Student has classroom enrollment but not this specific course - continue to registration below
        console.log(`[ClassroomService] Student ${studentId} has classroom enrollment but missing course ${courseCode}, will create ONLY this course`);
      } catch (error: any) {
        // Re-throw if it's our custom error
        if (error.message && error.message.includes('already registered')) {
          throw error;
        }
        console.error('[ClassroomService] Error checking existing course registration:', error);
        // Continue to registration process - we'll create the specific course below
      }
    }
    
    // Continue to the main registration transaction below to create ONLY the specific course
    // DO NOT auto-register for other courses in the same classroom
    }
    
  // Get the effective classroom ID (from course if courseCode provided, otherwise use provided classroomId)
  let effectiveClassroomIdForCheck = classroomId;
  let effectiveClassroomForCheck = classroom;
  
  if (courseCode) {
    // Check the course's actual classroom
    const pool = getPool();
    if (pool) {
      const courseCheck = await pool.query(
        `SELECT classroom_id FROM teaching_assignments WHERE course_code = $1 LIMIT 1`,
        [courseCode]
      );
      if (courseCheck.rows.length > 0) {
        effectiveClassroomIdForCheck = courseCheck.rows[0].classroom_id;
        const foundClassroom = await getClassroomById(effectiveClassroomIdForCheck);
        if (!foundClassroom) {
          throw new Error(`Classroom ${effectiveClassroomIdForCheck} for course ${courseCode} not found.`);
        }
        effectiveClassroomForCheck = foundClassroom;
      }
    }
  }

  if (!effectiveClassroomForCheck) {
    throw new Error(`Classroom ${effectiveClassroomIdForCheck} not found.`);
  }

  const seatsFilled = await getClassroomEnrollmentCount(effectiveClassroomIdForCheck);

  if (seatsFilled >= effectiveClassroomForCheck.capacity) {
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

    // For in-memory mode, try to create timetable entries, class registrations, and fees
    try {
      const { listTeachingAssignments } = await import('./teachingService.js');
      const { recordFeePayment } = await import('./financeService.js');
      const { findStaffById } = await import('./staffService.js');
      const { getCourseMetadata } = await import('../utils/majors.js');
      
      const assignments = await listTeachingAssignments();
      const classroomAssignments = assignments.filter(a => a.classroomId === classroomId);

      // Create timetable entries and class registrations
      for (const assignment of classroomAssignments) {
        const subject = assignment.courseTitle || `${assignment.courseCode || 'Course'} - ${classroom.name}`;
        
        // Note: Timetable entries would need to be added to studentService's inMemoryTimetables
        // For now, we'll just log it in in-memory mode
        console.log(`[ClassroomService] In-memory: Would create timetable entry for ${subject} on ${assignment.weekday} ${assignment.startTime}-${assignment.endTime}`);

        // Create class registration in in-memory mode
        // Note: Would need to add to studentService's inMemoryRegistrations
        const teacher = await findStaffById(assignment.teacherId);
        const instructor = teacher?.displayName ?? 'TBA';
        const metadata = getCourseMetadata(assignment.courseTitle);
        const credits = metadata?.credits ?? 3;
        
        console.log(`[ClassroomService] In-memory: Would create class registration for ${assignment.courseTitle} with instructor ${instructor}, ${credits} credits`);
      }

      // Skip classroom registration fee - fees are now handled separately
    } catch (error) {
      console.warn('[ClassroomService] Could not create timetable/registration/fee in in-memory mode', error);
    }

    return enrollment;
  }

  try {
    // Ensure semester column exists in class_registrations (migration helper)
    try {
      await pool.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'class_registrations' AND column_name = 'semester'
          ) THEN
            ALTER TABLE class_registrations ADD COLUMN semester TEXT DEFAULT '1/2026';
            UPDATE class_registrations SET semester = '1/2026' WHERE semester IS NULL;
          END IF;
        END $$;
      `);
    } catch (migrationError) {
      console.warn('[ClassroomService] Could not ensure semester column exists in class_registrations:', migrationError);
    }

    // Start a transaction using a client connection
    // @ts-expect-error - Pool.connect() exists at runtime but may not be in type definitions
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      console.log(`[ClassroomService] Starting registration transaction for student ${studentId} -> classroom ${classroomId}${courseCode ? ` (course: ${courseCode})` : ''}`);

      // If registering for a specific course, get the actual classroom_id from the course first
      // This ensures we use the correct classroom even if frontend passes wrong classroomId
      // If specific weekday/time are provided, use those to get the exact course slot
      let effectiveClassroomId = classroomId;
      if (courseCode) {
        let courseCheckQuery: string;
        let courseCheckParams: any[];
        
        if (specificWeekday && specificStartTime) {
          // Normalize startTime
          let normalizedStartTime = specificStartTime.trim();
          if (normalizedStartTime.match(/^\d:\d{2}$/)) {
            normalizedStartTime = '0' + normalizedStartTime;
          }
          
          // Get the exact course slot's classroom
          courseCheckQuery = `SELECT classroom_id FROM teaching_assignments 
                             WHERE course_code = $1 
                               AND LOWER(TRIM(weekday)) = LOWER(TRIM($2))
                               AND to_char(start_time, 'HH24:MI') = $3`;
          courseCheckParams = [courseCode, specificWeekday.trim(), normalizedStartTime];
        } else {
          // Fallback: get first match
          courseCheckQuery = `SELECT classroom_id FROM teaching_assignments WHERE course_code = $1 LIMIT 1`;
          courseCheckParams = [courseCode];
        }
        
        const courseCheck = await client.query(courseCheckQuery, courseCheckParams);
        if (courseCheck.rows.length > 0) {
          effectiveClassroomId = courseCheck.rows[0].classroom_id;
          if (effectiveClassroomId !== classroomId) {
            console.warn(`[ClassroomService] Course ${courseCode} is in classroom ${effectiveClassroomId}, but frontend requested ${classroomId}. Using actual classroom ${effectiveClassroomId}.`);
          }
          // Verify the classroom exists
          const actualClassroomCheck = await getClassroomById(effectiveClassroomId);
          if (!actualClassroomCheck) {
            await client.query('ROLLBACK');
            throw new Error(`Classroom ${effectiveClassroomId} for course ${courseCode} not found.`);
          }
        } else {
          await client.query('ROLLBACK');
          throw new Error(`Course ${courseCode}${specificWeekday && specificStartTime ? ` on ${specificWeekday} at ${specificStartTime}` : ''} not found in the system.`);
        }
      }

      // Only create classroom_registrations entry if student doesn't already have one for this classroom
      // This allows multiple course registrations in the same classroom without duplicate entries
      let enrollment: ClassroomEnrollment;
      const existingEnrollment = await client.query(
        `SELECT id, classroom_id, student_id, status,
                to_char(registered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS registered_at
         FROM classroom_registrations
         WHERE classroom_id = $1 AND student_id = $2`,
        [effectiveClassroomId, studentId]
      );

      if (existingEnrollment.rows.length > 0) {
        // Use existing enrollment
        enrollment = normalizeClassroomEnrollment(existingEnrollment.rows[0]);
        console.log(`[ClassroomService] Using existing classroom enrollment for student ${studentId} in classroom ${effectiveClassroomId}`);
      } else {
        // Create new classroom registration
      const { rows } = await client.query(
        `INSERT INTO classroom_registrations (classroom_id, student_id, status)
         VALUES ($1, $2, 'enrolled')
         RETURNING id, classroom_id, student_id, status,
                   to_char(registered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS registered_at`,
        [effectiveClassroomId, studentId]
      );
        enrollment = normalizeClassroomEnrollment(rows[0]);
        console.log(`[ClassroomService] Created new classroom enrollment for student ${studentId} in classroom ${effectiveClassroomId}`);
      }

      // Fetch teaching assignments for this classroom to create timetable entries and class registrations
      // If courseCode is provided, ONLY register for that specific course (not all courses in the classroom)
      let assignmentsResult;
      try {
        if (courseCode) {
          // Register for specific course only - STRICT FILTER by course_code, weekday, and start_time if provided
          // This ensures we only get the specific time slot, not just any slot for that course
          let query: string;
          let params: any[];
          
          if (specificWeekday && specificStartTime) {
            // Normalize startTime to ensure it has leading zero if needed (e.g., "9:00" -> "09:00")
            let normalizedStartTime = specificStartTime.trim();
            if (normalizedStartTime.match(/^\d:\d{2}$/)) {
              normalizedStartTime = '0' + normalizedStartTime;
            }
            
            // Use specific weekday and time to get the exact slot
            query = `SELECT teacher_id, course_code, course_title, weekday, start_time, end_time, major_focus, classroom_id,
                    COALESCE(semester, '1/2026') AS semester
             FROM teaching_assignments
             WHERE course_code = $1
               AND LOWER(TRIM(weekday)) = LOWER(TRIM($2))
               AND to_char(start_time, 'HH24:MI') = $3`;
            params = [courseCode, specificWeekday.trim(), normalizedStartTime];
            console.log(`[ClassroomService] Registering student ${studentId} for SPECIFIC course ${courseCode} on ${specificWeekday} at ${normalizedStartTime}`);
          } else {
            // Fallback: get first match by course_code only (backward compatibility)
            query = `SELECT teacher_id, course_code, course_title, weekday, start_time, end_time, major_focus, classroom_id,
                    COALESCE(semester, '1/2026') AS semester
             FROM teaching_assignments
             WHERE course_code = $1
             LIMIT 1`;
            params = [courseCode];
            console.log(`[ClassroomService] Registering student ${studentId} for SPECIFIC course ${courseCode} ONLY (not checking classroom_id, weekday, or time)`);
          }
          
          assignmentsResult = await client.query(query, params);
          
          // Validate that we got exactly one result
          if (assignmentsResult.rows.length === 0) {
            await client.query('ROLLBACK');
            throw new Error(`Course ${courseCode} not found in the system.`);
          }
          if (assignmentsResult.rows.length > 1) {
            console.error(`[ClassroomService] ERROR: Multiple assignments found for course ${courseCode}. This should not happen!`);
            await client.query('ROLLBACK');
            throw new Error(`Multiple teaching assignments found for course ${courseCode}. Please contact administration.`);
          }
          
          // Double-check the course_code matches
          if (assignmentsResult.rows[0].course_code !== courseCode) {
            console.error(`[ClassroomService] ERROR: Course code mismatch! Expected ${courseCode}, got ${assignmentsResult.rows[0].course_code}`);
            await client.query('ROLLBACK');
            throw new Error(`Course code mismatch. Please contact administration.`);
          }
          
          // If we filtered by specific weekday/time, use that course's classroom (it's the correct one)
          // Otherwise, verify the course's classroom_id matches what we determined earlier
          const courseClassroomId = assignmentsResult.rows[0].classroom_id;
          if (specificWeekday && specificStartTime) {
            // When filtering by specific weekday/time, we trust the course's classroom
            // Update effectiveClassroomId to match the course's actual classroom
            if (courseClassroomId !== effectiveClassroomId) {
              console.log(`[ClassroomService] Course ${courseCode} is in classroom ${courseClassroomId}, updating effectiveClassroomId from ${effectiveClassroomId}`);
              effectiveClassroomId = courseClassroomId;
            }
          } else {
            // When not filtering by specific time, verify classroom matches
          if (courseClassroomId !== effectiveClassroomId) {
            console.error(`[ClassroomService] ERROR: Course ${courseCode} classroom_id mismatch! Expected ${effectiveClassroomId}, got ${courseClassroomId}`);
            await client.query('ROLLBACK');
            throw new Error(`Course ${courseCode} classroom mismatch. Please contact administration.`);
            }
          }
          
          console.log(`[ClassroomService] ✓ Verified course ${courseCode} is in classroom ${effectiveClassroomId}`);
        } else {
          // Register for all courses in classroom (backward compatibility - only when courseCode is NOT provided)
          assignmentsResult = await client.query(
            `SELECT teacher_id, course_code, course_title, weekday, start_time, end_time, major_focus, 
                    COALESCE(semester, '1/2026') AS semester
         FROM teaching_assignments
         WHERE classroom_id = $1`,
        [effectiveClassroomId]
      );
          console.log(`[ClassroomService] Registering student ${studentId} for ALL courses in classroom ${effectiveClassroomId} (backward compatibility mode)`);
        }
        console.log(`[ClassroomService] Found ${assignmentsResult.rows.length} teaching assignment(s) for classroom ${effectiveClassroomId}${courseCode ? ` (course: ${courseCode})` : ''}`);
      } catch (queryError: any) {
        // If semester column doesn't exist, fallback to query without it
        if (queryError?.code === '42703' && queryError?.message?.includes('semester')) {
          console.warn('[ClassroomService] Semester column missing in teaching_assignments, using default');
          if (courseCode) {
            // Query by course_code, weekday, and start_time if provided, then verify classroom
            let query: string;
            let params: any[];
            
            if (specificWeekday && specificStartTime) {
              // Normalize startTime
              let normalizedStartTime = specificStartTime.trim();
              if (normalizedStartTime.match(/^\d:\d{2}$/)) {
                normalizedStartTime = '0' + normalizedStartTime;
              }
              
              query = `SELECT teacher_id, course_code, course_title, weekday, start_time, end_time, major_focus, classroom_id
               FROM teaching_assignments
               WHERE course_code = $1
                 AND LOWER(TRIM(weekday)) = LOWER(TRIM($2))
                 AND to_char(start_time, 'HH24:MI') = $3`;
              params = [courseCode, specificWeekday.trim(), normalizedStartTime];
            } else {
              query = `SELECT teacher_id, course_code, course_title, weekday, start_time, end_time, major_focus, classroom_id
               FROM teaching_assignments
               WHERE course_code = $1
               LIMIT 1`;
              params = [courseCode];
            }
            
            assignmentsResult = await client.query(query, params);
            
            // Validate that we got exactly one result
            if (assignmentsResult.rows.length === 0) {
              await client.query('ROLLBACK');
              throw new Error(`Course ${courseCode} not found in the system.`);
            }
            if (assignmentsResult.rows.length > 1) {
              console.error(`[ClassroomService] ERROR: Multiple assignments found for course ${courseCode}. This should not happen!`);
              await client.query('ROLLBACK');
              throw new Error(`Multiple teaching assignments found for course ${courseCode}. Please contact administration.`);
            }
            
            // Double-check the course_code matches
            if (assignmentsResult.rows[0].course_code !== courseCode) {
              console.error(`[ClassroomService] ERROR: Course code mismatch! Expected ${courseCode}, got ${assignmentsResult.rows[0].course_code}`);
              await client.query('ROLLBACK');
              throw new Error(`Course code mismatch. Please contact administration.`);
            }
            
            // Verify the course is in the requested classroom
            const assignmentClassroomId = assignmentsResult.rows[0].classroom_id;
            if (assignmentClassroomId !== classroomId) {
              console.error(`[ClassroomService] ERROR: Course ${courseCode} is in classroom ${assignmentClassroomId}, but registration requested for classroom ${classroomId}`);
              await client.query('ROLLBACK');
              throw new Error(`Course ${courseCode} is not available in the selected classroom. Please select the correct classroom for this course.`);
            }
          } else {
            // CRITICAL: Even in fallback, if courseCode is provided, only get that specific course
            if (courseCode) {
              let query: string;
              let params: any[];
              
              if (specificWeekday && specificStartTime) {
                // Normalize startTime
                let normalizedStartTime = specificStartTime.trim();
                if (normalizedStartTime.match(/^\d:\d{2}$/)) {
                  normalizedStartTime = '0' + normalizedStartTime;
                }
                
                query = `SELECT teacher_id, course_code, course_title, weekday, start_time, end_time, major_focus, classroom_id
                 FROM teaching_assignments
                 WHERE course_code = $1
                   AND LOWER(TRIM(weekday)) = LOWER(TRIM($2))
                   AND to_char(start_time, 'HH24:MI') = $3`;
                params = [courseCode, specificWeekday.trim(), normalizedStartTime];
              } else {
                query = `SELECT teacher_id, course_code, course_title, weekday, start_time, end_time, major_focus, classroom_id
                 FROM teaching_assignments
                 WHERE course_code = $1
                 LIMIT 1`;
                params = [courseCode];
              }
              
              assignmentsResult = await client.query(query, params);
              
              // Validate fallback query result
              if (assignmentsResult.rows.length === 0) {
                await client.query('ROLLBACK');
                throw new Error(`Course ${courseCode} not found in the system.`);
              }
              if (assignmentsResult.rows.length > 1) {
                await client.query('ROLLBACK');
                throw new Error(`Multiple teaching assignments found for course ${courseCode}. Please contact administration.`);
              }
              if (assignmentsResult.rows[0].course_code !== courseCode) {
                await client.query('ROLLBACK');
                throw new Error(`Course code mismatch. Please contact administration.`);
              }
            } else {
              assignmentsResult = await client.query(
                `SELECT teacher_id, course_code, course_title, weekday, start_time, end_time, major_focus
                 FROM teaching_assignments
                 WHERE classroom_id = $1`,
                [effectiveClassroomId]
              );
            }
          }
          // Add default semester to each row
          assignmentsResult.rows = assignmentsResult.rows.map((row: any) => ({ ...row, semester: '1/2026' }));
        } else {
          throw queryError;
        }
      }

      // Collect all course credits for tuition calculation
      let totalCredits = 0;
      const registeredCourses: Array<{ courseTitle: string; credits: number }> = [];

      // Create timetable entries and class registrations for each teaching assignment
      // IMPORTANT: When courseCode is provided, this loop should only have ONE assignment (the specific course)
      console.log(`[ClassroomService] Processing ${assignmentsResult.rows.length} assignment(s) for registration${courseCode ? ` - EXPECTED: 1 (course: ${courseCode})` : ''}`);
      
      // If courseCode is provided, we should only process ONE course
      if (courseCode && assignmentsResult.rows.length !== 1) {
        console.error(`[ClassroomService] ERROR: Expected exactly 1 assignment for course ${courseCode}, but found ${assignmentsResult.rows.length}`);
        await client.query('ROLLBACK');
        throw new Error(`Expected exactly one course assignment for ${courseCode}, but found ${assignmentsResult.rows.length}. Please contact administration.`);
      }
      
      // CRITICAL: When courseCode is provided, we should ONLY process ONE course
      // Add extra safety check and break after first course
      let coursesProcessed = 0;
      
      // EXTRA SAFETY: If courseCode is provided, filter assignmentsResult.rows to ONLY the matching course
      // This prevents any possibility of processing multiple courses
      let assignmentsToProcess = assignmentsResult.rows;
      if (courseCode) {
        assignmentsToProcess = assignmentsResult.rows.filter((a: any) => a.course_code === courseCode);
        if (assignmentsToProcess.length === 0) {
          await client.query('ROLLBACK');
          throw new Error(`Course ${courseCode} not found in assignments result. This should not happen.`);
        }
        if (assignmentsToProcess.length > 1) {
          await client.query('ROLLBACK');
          throw new Error(`Multiple assignments found for course ${courseCode}. This should not happen.`);
        }
        console.log(`[ClassroomService] Filtered to exactly 1 assignment for course ${courseCode}`);
      }
      
      for (const assignment of assignmentsToProcess) {
        // STRICT validation: If courseCode is provided, ONLY process that exact course
        if (courseCode) {
          if (assignment.course_code !== courseCode) {
            console.error(`[ClassroomService] ERROR: Course code mismatch in loop! Expected ${courseCode}, got ${assignment.course_code}. Aborting transaction.`);
            await client.query('ROLLBACK');
            throw new Error(`Course code mismatch: expected ${courseCode} but got ${assignment.course_code}. Please contact administration.`);
          }
          console.log(`[ClassroomService] ✓ Verified course code match: ${assignment.course_code} === ${courseCode}`);
          
          // Safety check: If we've already processed a course and courseCode is provided, something is wrong
          if (coursesProcessed > 0) {
            console.error(`[ClassroomService] ERROR: Multiple courses found when only one expected! Already processed ${coursesProcessed} course(s). Aborting.`);
            await client.query('ROLLBACK');
            throw new Error(`Multiple courses found for ${courseCode}. Expected only one. Please contact administration.`);
          }
        }
        
        // Get the effective classroom for this course (use effectiveClassroomId from transaction scope)
        const effectiveClassroomForSubject = await getClassroomById(effectiveClassroomId);
        const subject = assignment.course_title || `${assignment.course_code || 'Course'} - ${effectiveClassroomForSubject?.name || classroom.name}`;
        console.log(`[ClassroomService] Processing course: ${assignment.course_code} - "${subject}" (${assignment.weekday} ${assignment.start_time}-${assignment.end_time})`);
        
        // Skip transaction conflict check - duplicate and conflict checks are done earlier
        // The transaction conflict check was causing "course conflicts with itself" errors
        console.log(`[ClassroomService] Skipping transaction conflict check (already validated earlier)`);
        
        // Check if timetable entry already exists to avoid duplicates
        const existingTimetable = await client.query(
          `SELECT id FROM timetables 
           WHERE student_id = $1 AND weekday = $2 AND start_time = $3 AND end_time = $4 AND subject = $5`,
          [
            studentId,
            assignment.weekday,
            assignment.start_time,
            assignment.end_time,
            subject
          ]
        );

        if (existingTimetable.rows.length === 0) {
          // FINAL SAFETY CHECK: Before inserting, check for time conflicts one more time
          // This is the last line of defense - check if student has ANY course at this time
          const normalizedDay = assignment.weekday.trim().toLowerCase();
          const startTimeFormatted = typeof assignment.start_time === 'string' 
            ? (assignment.start_time.length >= 5 ? assignment.start_time.slice(0, 5) : assignment.start_time)
            : String(assignment.start_time).slice(0, 5);
          
          const finalConflictCheck = await client.query(
            `SELECT t.id, t.subject, t.weekday, 
                    to_char(t.start_time, 'HH24:MI') AS start_time_fmt,
                    to_char(t.end_time, 'HH24:MI') AS end_time_fmt
             FROM timetables t
             WHERE t.student_id = $1 
               AND LOWER(TRIM(t.weekday)) = $2
               AND to_char(t.start_time, 'HH24:MI') = $3`,
            [studentId, normalizedDay, startTimeFormatted]
          );
          
          if (finalConflictCheck.rows.length > 0) {
            const conflict = finalConflictCheck.rows[0];
            await client.query('ROLLBACK');
            console.error(`[ClassroomService] ❌❌❌ FINAL CHECK: BLOCKING REGISTRATION ❌❌❌`);
            console.error(`[ClassroomService]   Student already has: "${conflict.subject}" at ${conflict.start_time_fmt} on ${conflict.weekday}`);
            console.error(`[ClassroomService]   Trying to register: "${subject}" at ${startTimeFormatted} on ${assignment.weekday}`);
            throw new Error(`SCHEDULE_CONFLICT: You cannot take two classes at the same time!\n\nYou are trying to register:\n"${subject}" on ${assignment.weekday} (${startTimeFormatted}-${String(assignment.end_time).slice(0, 5)})\n\nThis conflicts with:\n  • "${conflict.subject}" on ${conflict.weekday} (${conflict.start_time_fmt} - ${conflict.end_time_fmt})\n\nPlease choose a different time slot.`);
          }
          
          // Store classroom_id as location for better JOIN matching later
          const locationValue = String(effectiveClassroomId);
          
          await client.query(
            `INSERT INTO timetables (student_id, weekday, start_time, end_time, subject, location)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              studentId,
              assignment.weekday,
              assignment.start_time,
              assignment.end_time,
              subject,
              locationValue // Store classroom_id as location for JOIN matching
            ]
          );
          console.log(`[ClassroomService] Created timetable entry for ${subject} (classroom: ${effectiveClassroomId})`);
        } else {
          console.log(`[ClassroomService] Timetable entry already exists for ${subject}`);
        }

        // Create class registration for this course
        // Check if class registration already exists (by course title, but also verify course_code if available)
        const existingRegistration = await client.query(
          `SELECT id,
                  to_char(registered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS registered_at
             FROM class_registrations
             WHERE student_id = $1
               AND LOWER(TRIM(class_name)) = LOWER(TRIM($2))`,
          [studentId, assignment.course_title]
        );

        if (existingRegistration.rows.length > 0) {
          const existing = existingRegistration.rows[0];
          const registeredAt = existing?.registered_at
            ? ` already confirmed on ${existing.registered_at}`
            : '';
          throw new Error(
            `You are already registered for "${assignment.course_title}" (${assignment.course_code}).${registeredAt}`
          );
        }

        // Get teacher/instructor name
        let instructor = 'TBA';
        if (assignment.teacher_id) {
          const teacherResult = await client.query(
            `SELECT display_name FROM staff_accounts WHERE id = $1`,
            [assignment.teacher_id]
          );
          if (teacherResult.rows.length > 0) {
            instructor = teacherResult.rows[0].display_name;
          }
        }

        // Get course metadata for credits
        let credits = 3; // Default to 3 credits
        try {
          const { getCourseMetadata } = await import('../utils/majors.js');
          const metadata = getCourseMetadata(assignment.course_title);
          if (metadata?.credits) {
            credits = metadata.credits;
          }
        } catch (error) {
          console.warn('Could not get course metadata for credits', error);
        }

        // Track credits for tuition calculation
        totalCredits += credits;
        registeredCourses.push({ courseTitle: assignment.course_title, credits });

        // Use assignment's semester, or fallback to '1/2026' if not set
        const semester = assignment.semester || '1/2026';

        // Create class registration
        const regResult = await client.query(
          `INSERT INTO class_registrations (student_id, class_name, instructor, status, semester, credits, confirmed_by, registered_at)
           VALUES ($1, $2, $3, 'registered', $4, $5, NULL, NOW())
           RETURNING id, class_name, instructor`,
          [studentId, assignment.course_title, instructor, semester, credits]
        );
        
        console.log(`[ClassroomService] Created class registration for student ${studentId}: ${assignment.course_title} with instructor ${instructor}, ${credits} credits, semester ${semester} (ID: ${regResult.rows[0]?.id})`);

        // Also add student to teacher_rosters so they appear in the teacher's roster
        const existingRoster = await client.query(
          `SELECT id FROM teacher_rosters WHERE teacher_id = $1 AND course_code = $2 AND student_id = $3`,
          [assignment.teacher_id, assignment.course_code, studentId]
        );

        if (existingRoster.rows.length === 0) {
          await client.query(
            `INSERT INTO teacher_rosters (teacher_id, course_code, course_title, student_id, status)
             VALUES ($1, $2, $3, $4, 'enrolled')`,
            [assignment.teacher_id, assignment.course_code, assignment.course_title, studentId]
          );
          console.log(`[ClassroomService] Added student ${studentId} to teacher ${assignment.teacher_id}'s roster for ${assignment.course_code}`);
        } else {
          console.log(`[ClassroomService] Student ${studentId} already in teacher ${assignment.teacher_id}'s roster for ${assignment.course_code}, skipping`);
        }

        // Course registration fees are now replaced by a single tuition fee (calculated below)
        
        // Increment counter and break if courseCode is provided (we should only process ONE course)
        coursesProcessed++;
        if (courseCode && coursesProcessed >= 1) {
          console.log(`[ClassroomService] ✓ Successfully processed course ${assignment.course_code}. Breaking loop (course-specific registration).`);
          break; // CRITICAL: Stop after processing the ONE course when courseCode is provided
        }
      }
      
      // Final safety check: If courseCode was provided, we should have processed exactly 1 course
      if (courseCode && coursesProcessed !== 1) {
        console.error(`[ClassroomService] ERROR: Expected to process exactly 1 course (${courseCode}), but processed ${coursesProcessed}. Rolling back.`);
        await client.query('ROLLBACK');
        throw new Error(`Expected to register exactly one course (${courseCode}), but processed ${coursesProcessed} course(s). Please contact administration.`);
      }

      // Determine semester (use first assignment's semester or default)
        const semesterForFee = assignmentsResult.rows.length > 0 && assignmentsResult.rows[0].semester 
          ? assignmentsResult.rows[0].semester 
          : '1/2026';
      
      const feeDueDate = new Date();
      feeDueDate.setDate(feeDueDate.getDate() + 30);

      // Calculate all fees and combine into a single payment
      const tuitionFeeAmount = totalCredits > 0 ? totalCredits * 100 : 0;
      const activityFeeAmount = 100;
      const insuranceFeeAmount = 90;
      const totalFeeAmount = tuitionFeeAmount + activityFeeAmount + insuranceFeeAmount;

      // Build description with all fee components
      const feeComponents: string[] = [];
      if (tuitionFeeAmount > 0) {
        feeComponents.push(`Tuition Fee - ${semesterForFee} (${totalCredits} credits)`);
      }
      feeComponents.push(`Activity Fee - ${semesterForFee}`);
      feeComponents.push(`Insurance Fee - ${semesterForFee}`);
      
      const combinedFeeDescription = feeComponents.join('; ');

      // Check if a combined fee already exists for this student and semester
      const existingCombinedFee = await client.query(
        `SELECT id, amount, description FROM fee_payments 
         WHERE student_id = $1 
         AND description LIKE $2
         AND status = 'pending'`,
        [studentId, `%${semesterForFee}%`]
      );

      if (existingCombinedFee.rows.length === 0) {
        // Create new combined fee payment
        await client.query(
          `INSERT INTO fee_payments (student_id, amount, description, status, due_date)
           VALUES ($1, $2, $3, $4, $5)`,
          [studentId, totalFeeAmount, combinedFeeDescription, 'pending', feeDueDate.toISOString()]
        );
        console.log(`[ClassroomService] Created combined fee payment: ${totalFeeAmount} SGD for ${semesterForFee} (Tuition: ${tuitionFeeAmount}, Activity: ${activityFeeAmount}, Insurance: ${insuranceFeeAmount})`);
      } else {
        // Update existing combined fee if amount has changed
        const existingFee = existingCombinedFee.rows[0];
        const existingAmount = Number(existingFee.amount);
        
        if (existingAmount !== totalFeeAmount) {
          await client.query(
            `UPDATE fee_payments SET amount = $1, description = $2 WHERE id = $3`,
            [totalFeeAmount, combinedFeeDescription, existingFee.id]
          );
          console.log(`[ClassroomService] Updated combined fee payment from ${existingAmount} to ${totalFeeAmount} SGD for ${semesterForFee}`);
        } else {
          console.log(`[ClassroomService] Combined fee payment already exists for ${semesterForFee} with correct amount: ${totalFeeAmount} SGD`);
        }
      }

      // Verify that we actually created data before committing
      if (coursesProcessed === 0) {
        await client.query('ROLLBACK');
        throw new Error('No courses were processed. Registration failed.');
      }

      await client.query('COMMIT');
      console.log(`[ClassroomService] ✓ Transaction COMMITTED: Registered student ${studentId} for classroom ${classroomId}, processed ${coursesProcessed} course(s), created timetable entries, class registrations, and fee payment`);
      
      // Release client before verification (since transaction is committed)
      client.release();
      
      // Verify the data was actually saved (using a new connection since transaction is committed)
      try {
        const verifyRegistration = await pool.query(
          `SELECT COUNT(*) as count FROM class_registrations WHERE student_id = $1 AND registered_at > NOW() - INTERVAL '1 minute'`,
          [studentId]
        );
        const recentRegistrations = Number(verifyRegistration.rows[0]?.count || 0);
        if (recentRegistrations === 0) {
          console.error(`[ClassroomService] ⚠️ WARNING: Transaction committed but no recent registrations found for student ${studentId}`);
        } else {
          console.log(`[ClassroomService] ✓ Verified: ${recentRegistrations} recent registration(s) found in database`);
        }
      } catch (verifyError) {
        console.warn(`[ClassroomService] Could not verify registration (non-critical):`, verifyError);
      }

      // Record Atenxion transaction (non-blocking, fire-and-forget)
      recordAtenxionTransaction(String(studentId)).catch((error) => {
        console.error('[ClassroomService] Failed to record Atenxion transaction:', error);
      });
      
      return enrollment;
    } catch (error: any) {
      await client.query('ROLLBACK').catch(() => {}); // Ignore rollback errors
      console.error(`[ClassroomService] Transaction error for student ${studentId} -> classroom ${classroomId}:`, error);
      client.release();
      throw error;
    }
  } catch (error: any) {
    const duplicate = error?.code === '23505';
    const missingColumn = error?.code === '42703';
    const foreignKey = error?.code === '23503';

    if (duplicate) {
      console.log(`[ClassroomService] Duplicate registration detected for student ${studentId} -> classroom ${classroomId}`);
      throw new Error('You are already registered for this classroom.');
    }

    if (missingColumn) {
      console.error(`[ClassroomService] Missing database column error:`, error);
      throw new Error(`Database schema error: ${error.message || 'Missing required column'}. Please contact IT admin.`);
    }

    if (foreignKey) {
      console.error(`[ClassroomService] Foreign key constraint error:`, error);
      throw new Error('Invalid reference: The classroom or student may not exist.');
    }

    console.error(`[ClassroomService] Failed to register student ${studentId} for classroom ${classroomId}:`, {
      error: error?.message || String(error),
      code: error?.code,
      detail: error?.detail,
      hint: error?.hint,
      stack: error?.stack
    });
    
    // Provide more specific error message if available
    const errorMessage = error?.message || 'Unknown error';
    
    // Don't override specific error messages - only provide generic ones if needed
    if (errorMessage.includes('semester') && !errorMessage.includes('Database schema')) {
      throw new Error('Database schema issue with semester field. Please contact IT admin.');
    }
    
    // Only provide generic "classroom not found" if it's a generic classroom error
    // Don't override specific errors like "Course X is not available in the selected classroom"
    if (errorMessage.includes('classroom') && 
        !errorMessage.includes('Course') && 
        !errorMessage.includes('not available') &&
        !errorMessage.includes('SCHEDULE_CONFLICT') &&
        !errorMessage.includes('already registered')) {
      throw new Error('Classroom not found or invalid.');
    }
    
    if (errorMessage.includes('student') && !errorMessage.includes('Student not found')) {
      throw new Error('Student not found or invalid.');
    }
    
    // If it's already a specific error message, re-throw it as-is
    if (errorMessage.includes('Course') || 
        errorMessage.includes('SCHEDULE_CONFLICT') || 
        errorMessage.includes('already registered') ||
        errorMessage.includes('not found in') ||
        errorMessage.includes('not available')) {
      throw error; // Re-throw the original error with its specific message
    }
    
    throw new Error(`Unable to register for this course: ${errorMessage}`);
  }
}
