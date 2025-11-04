import { getPool } from '../db/pool.js';
import { fallbackClassrooms, fallbackClassroomEnrollments } from './fallbackData.js';
import type { Classroom, ClassroomAvailability, ClassroomEnrollment } from './types.js';

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
  const [classrooms, counts] = await Promise.all([listClassrooms(), getClassroomEnrollmentCounts()]);

  // Fetch teaching assignments for all classrooms
  let classroomCourses = new Map<number, Array<{ courseCode: string; courseTitle: string; weekday: string; startTime: string; endTime: string; majorFocus: string; teacherId: number }>>();

  if (pool) {
    try {
      const { rows } = await pool.query(
        `SELECT classroom_id, teacher_id, course_code, course_title, weekday, 
                to_char(start_time, 'HH24:MI') AS start_time, 
                to_char(end_time, 'HH24:MI') AS end_time, 
                major_focus
         FROM teaching_assignments
         ORDER BY weekday, start_time ASC`
      );

      console.log(`Found ${rows.length} teaching assignments for classrooms`);

      for (const row of rows) {
        const classroomId = Number(row.classroom_id);
        if (!classroomCourses.has(classroomId)) {
          classroomCourses.set(classroomId, []);
        }
        
        const courseData = {
          courseCode: row.course_code || row.courseCode,
          courseTitle: row.course_title || row.courseTitle,
          weekday: row.weekday,
          startTime: row.start_time || row.startTime,
          endTime: row.end_time || row.endTime,
          majorFocus: row.major_focus || row.majorFocus,
          teacherId: Number(row.teacher_id)
        };
        
        classroomCourses.get(classroomId)!.push(courseData);
        console.log(`Added course "${courseData.courseTitle}" to classroom ${classroomId}`);
      }
    } catch (error) {
      console.error('Failed to fetch teaching assignments for classrooms', error);
    }
  } else {
    // For in-memory mode, get assignments from teaching service
    try {
      const { listTeachingAssignments } = await import('./teachingService.js');
      const assignments = await listTeachingAssignments();
      
      for (const assignment of assignments) {
        const classroomId = assignment.classroomId;
        if (!classroomCourses.has(classroomId)) {
          classroomCourses.set(classroomId, []);
        }
        classroomCourses.get(classroomId)!.push({
          courseCode: assignment.courseCode,
          courseTitle: assignment.courseTitle,
          weekday: assignment.weekday,
          startTime: assignment.startTime,
          endTime: assignment.endTime,
          majorFocus: assignment.majorFocus,
          teacherId: assignment.teacherId
        });
      }
    } catch (error) {
      console.error('Failed to fetch teaching assignments for classrooms (in-memory)', error);
    }
  }

  // If studentId is provided, filter classrooms to only show those with teaching assignments
  // that match the student's major (assigned by IT admin)
  let filteredClassrooms = classrooms;
  let studentMajor: string | null = null;

  if (studentId) {
    // Get student's major
    const pool = getPool();
    if (pool) {
      try {
        const { rows } = await pool.query(
          `SELECT primary_interest FROM students WHERE id = $1`,
          [studentId]
        );
        if (rows.length > 0) {
          studentMajor = rows[0].primary_interest;
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
      } catch (error) {
        console.error('Failed to fetch student major (in-memory)', error);
      }
    }

    // Filter classrooms that have teaching assignments matching student's major
    if (studentMajor) {
      const normalizedStudentMajor = normalizeMajorName(studentMajor);
      const matchingClassroomIds = new Set<number>();

      for (const [classroomId, courses] of classroomCourses.entries()) {
        const hasMatchingAssignment = courses.some(course => {
          const courseMajor = normalizeMajorName(course.majorFocus);
          return courseMajor === normalizedStudentMajor || 
                 courseMajor.includes(normalizedStudentMajor) || 
                 normalizedStudentMajor.includes(courseMajor);
        });

        if (hasMatchingAssignment) {
          matchingClassroomIds.add(classroomId);
        }
      }

      filteredClassrooms = classrooms.filter(room => matchingClassroomIds.has(room.id));
      console.log(`[ClassroomService] Filtered classrooms for student ${studentId} (${studentMajor}): ${filteredClassrooms.length} matching classrooms`);
    } else {
      // If student has no major, show no classrooms
      filteredClassrooms = [];
      console.log(`[ClassroomService] Student ${studentId} has no major, showing no classrooms`);
    }
  }

  return filteredClassrooms.map((room) => {
    const seatsFilled = counts.get(room.id) ?? 0;
    const seatsAvailable = Math.max(room.capacity - seatsFilled, 0);
    const focusAreas = room.focusAreas?.length
      ? room.focusAreas
      : extractFocusAreasFromResources(room.resources);

    // Show all courses taught in this classroom
    const courses = classroomCourses.get(room.id) ?? [];

    // If filtering by major, only show courses matching that major
    let displayedCourses = courses;
    if (studentId && studentMajor) {
      const normalizedStudentMajor = normalizeMajorName(studentMajor);
      displayedCourses = courses.filter(course => {
        const courseMajor = normalizeMajorName(course.majorFocus);
        return courseMajor === normalizedStudentMajor || 
               courseMajor.includes(normalizedStudentMajor) || 
               normalizedStudentMajor.includes(courseMajor);
      });
    }

    return {
      ...room,
      seatsFilled,
      seatsAvailable,
      isFull: seatsAvailable === 0,
      focusAreas,
      courses: displayedCourses.map(c => ({
        courseCode: c.courseCode,
        courseTitle: c.courseTitle,
        weekday: c.weekday,
        startTime: c.startTime,
        endTime: c.endTime,
        majorFocus: c.majorFocus
      }))
    } satisfies ClassroomAvailability;
  });
}

export async function registerStudentForClassroom(
  studentId: number,
  classroomId: number
): Promise<ClassroomEnrollment> {
  if (!Number.isFinite(studentId) || !Number.isFinite(classroomId)) {
    throw new Error('Invalid registration request.');
  }

  const classroom = await getClassroomById(classroomId);

  if (!classroom) {
    throw new Error('Classroom not found.');
  }

  const existing = await findStudentClassroomEnrollment(studentId, classroomId);

  if (existing) {
    throw new Error('You are already registered for this classroom.');
  }

  const seatsFilled = await getClassroomEnrollmentCount(classroomId);

  if (seatsFilled >= classroom.capacity) {
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

      // Create fee payment
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      await recordFeePayment({
        studentId,
        amount: 50.00,
        description: `Classroom Registration Fee - ${classroom.name}`,
        status: 'pending',
        dueDate: dueDate.toISOString()
      });
    } catch (error) {
      console.warn('[ClassroomService] Could not create timetable/registration/fee in in-memory mode', error);
    }

    return enrollment;
  }

  try {
    // Start a transaction using a client connection
    // @ts-expect-error - Pool.connect() exists at runtime but may not be in type definitions
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Register the student for the classroom
      const { rows } = await client.query(
        `INSERT INTO classroom_registrations (classroom_id, student_id, status)
         VALUES ($1, $2, 'enrolled')
         RETURNING id, classroom_id, student_id, status,
                   to_char(registered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS registered_at`,
        [classroomId, studentId]
      );

      const enrollment = normalizeClassroomEnrollment(rows[0]);

      // Fetch teaching assignments for this classroom to create timetable entries and class registrations
      const assignmentsResult = await client.query(
        `SELECT teacher_id, course_code, course_title, weekday, start_time, end_time, major_focus
         FROM teaching_assignments
         WHERE classroom_id = $1`,
        [classroomId]
      );

      // Collect all course credits for tuition calculation
      let totalCredits = 0;
      const registeredCourses: Array<{ courseTitle: string; credits: number }> = [];

      // Create timetable entries and class registrations for each teaching assignment
      for (const assignment of assignmentsResult.rows) {
        const subject = assignment.course_title || `${assignment.course_code || 'Course'} - ${classroom.name}`;
        
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
          await client.query(
            `INSERT INTO timetables (student_id, weekday, start_time, end_time, subject, location)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              studentId,
              assignment.weekday,
              assignment.start_time,
              assignment.end_time,
              subject,
              classroom.location
            ]
          );
        }

        // Create class registration for this course
        // Check if class registration already exists
        const existingRegistration = await client.query(
          `SELECT id FROM class_registrations WHERE student_id = $1 AND class_name = $2`,
          [studentId, assignment.course_title]
        );

        if (existingRegistration.rows.length === 0) {
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

          // Create class registration
          const regResult = await client.query(
            `INSERT INTO class_registrations (student_id, class_name, instructor, status, semester, credits, confirmed_by, registered_at)
             VALUES ($1, $2, $3, 'registered', 'Fall 2024', $4, NULL, NOW())
             RETURNING id, class_name, instructor`,
            [studentId, assignment.course_title, instructor, credits]
          );
          
          console.log(`[ClassroomService] Created class registration for student ${studentId}: ${assignment.course_title} with instructor ${instructor}, ${credits} credits (ID: ${regResult.rows[0]?.id})`);

          // Course registration fees are now replaced by a single tuition fee (calculated below)
        } else {
          console.log(`[ClassroomService] Class registration already exists for ${assignment.course_title}, skipping duplicate`);
        }
      }

      // Create a fee payment for the classroom registration
      // Default fee: 50 Baht per classroom, due in 30 days
      const classroomFeeAmount = 50.00;
      const classroomFeeDueDate = new Date();
      classroomFeeDueDate.setDate(classroomFeeDueDate.getDate() + 30);

      // Check if classroom fee already exists
      const existingClassroomFee = await client.query(
        `SELECT id FROM fee_payments WHERE student_id = $1 AND description = $2`,
        [studentId, `Classroom Registration Fee - ${classroom.name}`]
      );

      if (existingClassroomFee.rows.length === 0) {
        await client.query(
          `INSERT INTO fee_payments (student_id, amount, description, status, due_date)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            studentId,
            classroomFeeAmount,
            `Classroom Registration Fee - ${classroom.name}`,
            'pending',
            classroomFeeDueDate.toISOString()
          ]
        );
      }

      // Create tuition fee based on total registered credits (4000 Baht per credit)
      if (totalCredits > 0) {
        const tuitionFeeAmount = totalCredits * 4000;
        const tuitionFeeDueDate = new Date();
        tuitionFeeDueDate.setDate(tuitionFeeDueDate.getDate() + 30);

        // Check if tuition fee already exists for this semester
        const existingTuitionFee = await client.query(
          `SELECT id, amount FROM fee_payments WHERE student_id = $1 AND description = $2`,
          [studentId, 'Tuition Fee - Fall 2024']
        );

        if (existingTuitionFee.rows.length === 0) {
          // When student registers, tuition fee should be automatically paid
          await client.query(
            `INSERT INTO fee_payments (student_id, amount, description, status, received_at, due_date)
             VALUES ($1, $2, $3, 'paid', NOW(), $4)`,
            [studentId, tuitionFeeAmount, 'Tuition Fee - Fall 2024', 'paid', tuitionFeeDueDate.toISOString()]
          );
          console.log(`[ClassroomService] Created tuition fee (paid): ${tuitionFeeAmount} Baht (${totalCredits} credits × 4000)`);
        } else {
          // Update existing tuition fee if credits have changed
          const existingAmount = Number(existingTuitionFee.rows[0].amount);
          if (existingAmount !== tuitionFeeAmount) {
            await client.query(
              `UPDATE fee_payments SET amount = $1, status = 'paid', received_at = NOW() WHERE id = $2`,
              [tuitionFeeAmount, existingTuitionFee.rows[0].id]
            );
            console.log(`[ClassroomService] Updated tuition fee from ${existingAmount} to ${tuitionFeeAmount} Baht (marked as paid)`);
          } else {
            // If amount matches but status is pending, mark as paid
            await client.query(
              `UPDATE fee_payments SET status = 'paid', received_at = COALESCE(received_at, NOW()) WHERE id = $1 AND status = 'pending'`,
              [existingTuitionFee.rows[0].id]
            );
          }
        }
      }

      await client.query('COMMIT');
      console.log(`[ClassroomService] Registered student ${studentId} for classroom ${classroomId}, created ${assignmentsResult.rows.length} timetable entries, class registrations, and fee payment`);
      
      return enrollment;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    const duplicate = error?.code === '23505';

    if (duplicate) {
      throw new Error('You are already registered for this classroom.');
    }

    console.error('Failed to register student for classroom', error);
    throw new Error('Unable to register for this classroom right now.');
  }
}
