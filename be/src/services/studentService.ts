import bcrypt from 'bcryptjs';
import { getPool } from '../db/pool.js';
import {
  fallbackStudents,
  fallbackTimetables,
  fallbackSchedules,
  fallbackRegistrations,
  seededPasswordHash
} from './fallbackData.js';
import type {
  ClassRegistration,
  CreateStudentInput,
  ScheduleItem,
  Student,
  StudentDashboardData,
  TimetableEntry
} from './types.js';
import { listExamAnnouncements } from './examService.js';
import {
  listStudentGrades,
  listStudentSemesterGpa,
  listRegistrationWindows,
  findCourseOffering
} from './academicService.js';
import { listStudentFeePayments, recordFeePayment } from './financeService.js';
import { listClassroomEnrollmentsForStudent } from './classroomService.js';
import { listStudentAssignments } from './assignmentService.js';
import { getCourseMetadata, getSubjectsForMajor } from '../utils/majors.js';
import { getCurrentSemester } from './systemService.js';

type StudentSubjectSelection = {
  studentId: number;
  major: string | null;
  subjects: string[];
  createdAt: string;
};

let inMemoryStudents = [...fallbackStudents];
let inMemoryTimetables = [...fallbackTimetables];
let inMemorySchedules = [...fallbackSchedules];
let inMemoryRegistrations = [...fallbackRegistrations];
let inMemorySecrets = new Map<number, string>(
  fallbackStudents.map((student) => [student.id, seededPasswordHash])
);
let inMemorySubjectSelections = new Map<number, StudentSubjectSelection>(
  fallbackStudents
    .filter((student) => Array.isArray(student.selectedSubjects) && student.selectedSubjects.length)
    .map((student) => [
      student.id,
      {
        studentId: student.id,
        major: student.primaryInterest ?? null,
        subjects: [...(student.selectedSubjects ?? [])],
        createdAt: student.createdAt
      }
    ])
);
let nextStudentId = fallbackStudents.length + 1;
let nextRegistrationId = fallbackRegistrations.length + 1;

function sanitizeSubjects(subjects: unknown): string[] {
  if (!Array.isArray(subjects)) {
    return [];
  }

  const unique = new Set<string>();
  for (const subject of subjects) {
    if (typeof subject === 'string') {
      const trimmed = subject.trim();
      if (trimmed.length) {
        unique.add(trimmed);
      }
    }
  }

  return Array.from(unique);
}

function normalizeStudent(row: any): Student {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: row.role,
    primaryInterest: row.primary_interest,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    selectedSubjects: sanitizeSubjects(row.selected_subjects)
  };
}

function rememberSubjectSelection(student: Student, subjects: string[]): void {
  const cleanedSubjects = sanitizeSubjects(subjects);

  if (!cleanedSubjects.length) {
    inMemorySubjectSelections.delete(student.id);
    return;
  }

  inMemorySubjectSelections.set(student.id, {
    studentId: student.id,
    major: student.primaryInterest ?? null,
    subjects: cleanedSubjects,
    createdAt: new Date().toISOString()
  });
}

function applySubjectSelection(student: Student): Student {
  const cleanedSubjects = sanitizeSubjects(student.selectedSubjects);
  if (cleanedSubjects.length) {
    return { ...student, selectedSubjects: cleanedSubjects };
  }

  const storedSelection = inMemorySubjectSelections.get(student.id);
  if (!storedSelection) {
    return { ...student, selectedSubjects: [] };
  }

  return { ...student, selectedSubjects: [...storedSelection.subjects] };
}

export async function listStudents(): Promise<Student[]> {
  const pool = getPool();

  if (!pool) {
    return inMemoryStudents.map((student) => applySubjectSelection(student));
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, first_name, last_name, email, role, primary_interest, created_at
       FROM students
       ORDER BY created_at DESC`
    );
    return rows.map(normalizeStudent).map((student) => {
      return applySubjectSelection(student);
    });
  } catch (error) {
    console.error('Failed to fetch students from database', error);
    return inMemoryStudents.map((student) => applySubjectSelection(student));
  }
}

export async function fetchStudentById(id: number): Promise<Student | null> {
  if (!Number.isFinite(id)) {
    return null;
  }

  const pool = getPool();

  if (!pool) {
    const student = inMemoryStudents.find((item) => item.id === id) ?? null;
    return student ? applySubjectSelection(student) : null;
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, first_name, last_name, email, role, primary_interest, created_at
       FROM students
       WHERE id = $1`,
      [id]
    );

    if (!rows.length) {
      return null;
    }

    return applySubjectSelection(normalizeStudent(rows[0]));
  } catch (error) {
    console.error('Failed to fetch student by id', error);
    return null;
  }
}

async function createCourseDataForStudent(studentId: number, subjects: string[], pool: any) {
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = [
    { start: '09:00', end: '10:30' },
    { start: '11:00', end: '12:30' },
    { start: '14:00', end: '15:30' },
    { start: '16:00', end: '17:30' }
  ];
  const locations = [
    'Tech Hall 101',
    'Tech Hall 105',
    'Innovation Hub 201',
    'Main Campus - Building A',
    'North Campus - Building B',
    'Analytics Lab 410'
  ];

  // Get current semester from system settings
  const currentSemester = await getCurrentSemester();

  for (let i = 0; i < subjects.length; i++) {
    const subject = subjects[i];
    const metadata = getCourseMetadata(subject);
    
    if (!metadata) {
      console.warn(`No metadata found for subject: ${subject}`);
      continue;
    }

    const registration: ClassRegistration = {
      id: nextRegistrationId++,
      studentId,
      className: subject,
      instructor: metadata.instructor,
      status: 'registered',
      registeredAt: new Date().toISOString(),
      semester: currentSemester,
      credits: metadata.credits,
      confirmedBy: null
    };

    // Create timetable entry
    const weekday = weekdays[i % weekdays.length];
    const timeSlot = timeSlots[i % timeSlots.length];
    const location = locations[i % locations.length];
    const timetableEntry: TimetableEntry = {
      id: inMemoryTimetables.length + 1,
      studentId,
      weekday,
      startTime: timeSlot.start,
      endTime: timeSlot.end,
      subject,
      location
    };

    if (pool) {
      try {
        // Insert registration
        const regResult = await pool.query(
          `INSERT INTO class_registrations (student_id, class_name, instructor, status, semester, credits, confirmed_by, registered_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           RETURNING id, student_id AS "studentId", class_name AS "className", instructor, status,
                     semester, credits, confirmed_by AS "confirmedBy",
                     to_char(registered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "registeredAt"`,
          [studentId, subject, metadata.instructor, 'registered', currentSemester, metadata.credits, null]
        );

        // Insert timetable
        await pool.query(
          `INSERT INTO timetables (student_id, weekday, start_time, end_time, subject, location)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [studentId, weekday, timeSlot.start, timeSlot.end, subject, location]
        );

        // Create fee
        const feeAmount = metadata.credits * 100; // 100 SGD per credit
        await pool.query(
          `INSERT INTO fee_payments (student_id, amount, description, status, due_date)
           VALUES ($1, $2, $3, $4, NOW() + INTERVAL '30 days')`,
          [studentId, feeAmount, `${subject} - Registration Fee`, 'pending']
        );
      } catch (error) {
        console.error(`Failed to create course data for ${subject}:`, error);
      }
    } else {
      // In-memory mode
      inMemoryRegistrations = [registration, ...inMemoryRegistrations];
      inMemoryTimetables = [...inMemoryTimetables, timetableEntry];
      
      // Add fee payment
      const feeAmount = metadata.credits * 100; // 100 SGD per credit
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      await recordFeePayment({
        studentId,
        amount: feeAmount,
        description: `${subject} - Registration Fee`,
        status: 'pending',
        dueDate: dueDate.toISOString()
      });
    }
  }
}

export async function createStudent(input: CreateStudentInput): Promise<Student> {
  const { firstName, lastName, email, password, role, primaryInterest, selectedSubjects } = input;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const pool = getPool();
  const cleanedSubjects = sanitizeSubjects(selectedSubjects);

  if (!pool) {
    const student: Student = {
      id: nextStudentId++,
      firstName,
      lastName,
      email,
      role: role ?? 'Student',
      primaryInterest,
      createdAt: new Date().toISOString(),
      selectedSubjects: cleanedSubjects
    };

    inMemoryStudents = [student, ...inMemoryStudents];
    inMemorySecrets.set(student.id, hashedPassword);
    rememberSubjectSelection(student, cleanedSubjects);
    
    // Create course data for the student
    if (cleanedSubjects.length > 0) {
      await createCourseDataForStudent(student.id, cleanedSubjects, null);
    }
    
    return applySubjectSelection(student);
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO students (first_name, last_name, email, password_hash, role, primary_interest)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, first_name, last_name, email, role, primary_interest, created_at`,
      [firstName, lastName, email, hashedPassword, role ?? 'Student', primaryInterest]
    );

    const student = normalizeStudent(rows[0]);
    rememberSubjectSelection(student, cleanedSubjects);
    
    // Create course data for the student
    if (cleanedSubjects.length > 0) {
      await createCourseDataForStudent(student.id, cleanedSubjects, pool);
    }
    
    return applySubjectSelection({ ...student, selectedSubjects: cleanedSubjects });
  } catch (error) {
    console.error('Failed to create student', error);
    throw error;
  }
}

export async function authenticateStudent(email: string, password: string): Promise<Student | null> {
  const pool = getPool();

  if (!pool) {
    const student = inMemoryStudents.find((item) => item.email === email);
    if (!student) {
      return null;
    }

    const expectedHash = inMemorySecrets.get(student.id);
    return expectedHash && bcrypt.compareSync(password, expectedHash) ? applySubjectSelection(student) : null;
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, first_name, last_name, email, role, primary_interest, created_at, password_hash
       FROM students
       WHERE email = $1`,
      [email]
    );

    if (!rows.length) {
      return null;
    }

    const [row] = rows;
    const passwordMatches = await bcrypt.compare(password, row.password_hash);
    if (!passwordMatches) {
      return null;
    }

    return applySubjectSelection(normalizeStudent(row));
  } catch (error) {
    console.error('Failed to authenticate student', error);
    return null;
  }
}

export async function fetchStudentDashboard(studentId: number): Promise<StudentDashboardData | null> {
  if (!Number.isFinite(studentId)) {
    return null;
  }

  const pool = getPool();

  if (!pool) {
    const student = inMemoryStudents.find((item) => item.id === studentId);
    if (!student) {
      return null;
    }

    console.log(`[StudentService] Fetching dashboard data for student ${studentId}`);
    const [grades, exams, gpaBySemester, registrationWindows, fees, classroomEnrollments, assignments] = await Promise.all([
      listStudentGrades(studentId),
      listExamAnnouncements(),
      listStudentSemesterGpa(studentId),
      listRegistrationWindows(),
      listStudentFeePayments(studentId),
      listClassroomEnrollmentsForStudent(studentId),
      listStudentAssignments(studentId)
    ]);
    console.log(`[StudentService] Dashboard data fetched for student ${studentId}:`, {
      gradesCount: grades.length,
      examsCount: exams.length,
      gpaCount: gpaBySemester.length,
      feesCount: fees.length
    });
    if (grades.length > 0) {
      console.log(`[StudentService] Sample grades for student ${studentId}:`, grades.slice(0, 3).map(g => ({
        courseCode: g.courseCode,
        courseTitle: g.courseTitle,
        grade: g.grade,
        semester: g.semester
      })));
    }
    const upcomingExams = exams
      .filter((exam) => new Date(exam.examDate).getTime() >= Date.now())
      .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());

    // Filter registration windows courses by student's major (fallback/in-memory mode)
    const studentMajor = student.primaryInterest;
    let filteredRegistrationWindows = registrationWindows;

    if (studentMajor) {
      try {
        // Get teaching assignments from in-memory or import
        const { listTeachingAssignments } = await import('./teachingService.js');
        const assignments = await listTeachingAssignments();

        const courseToMajorMap = new Map<string, string>();
        for (const assignment of assignments) {
          const courseKey = `${assignment.courseCode}|${assignment.courseTitle}`;
          if (!courseToMajorMap.has(courseKey)) {
            courseToMajorMap.set(courseKey, assignment.majorFocus);
          }
        }

        // Filter courses in registration windows
        filteredRegistrationWindows = registrationWindows.map((window) => {
          const filteredCourses = window.courses.filter((course) => {
            const courseKey = `${course.courseCode}|${course.courseTitle}`;
            const courseMajor = courseToMajorMap.get(courseKey);
            
            if (courseMajor) {
              return courseMajor.trim().toLowerCase() === studentMajor.trim().toLowerCase();
            }
            
            // Fallback: check if course title contains major-related keywords
            const majorSubjects = getSubjectsForMajor(studentMajor);
            return majorSubjects.some(subject => 
              course.courseTitle.toLowerCase().includes(subject.toLowerCase()) ||
              course.courseCode.toLowerCase().includes(studentMajor.toLowerCase().substring(0, 4))
            );
          });

          return {
            ...window,
            courses: filteredCourses
          };
        });
      } catch (error) {
        console.error('Failed to filter registration windows by major (fallback)', error);
      }
    }

    return {
      student: applySubjectSelection(student),
      timetable: inMemoryTimetables.filter((entry) => entry.studentId === studentId),
      schedule: inMemorySchedules.filter((entry) => entry.studentId === studentId),
      registrations: inMemoryRegistrations.filter((entry) => entry.studentId === studentId),
      classroomEnrollments,
      grades,
      upcomingExams,
      gpaBySemester,
      registrationWindows: filteredRegistrationWindows,
      fees,
      assignments
    };
  }

  try {
    const student = await fetchStudentById(studentId);
    if (!student) {
      return null;
    }

    const [timetableResult, scheduleResult, registrationsResult] = await Promise.all([
      pool.query<TimetableEntry>(
        `SELECT id, student_id AS "studentId", weekday, to_char(start_time, 'HH24:MI') AS "startTime",
                to_char(end_time, 'HH24:MI') AS "endTime", subject, location
         FROM timetables
         WHERE student_id = $1
         ORDER BY CASE weekday
           WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 ELSE 7 END,
           start_time ASC`,
        [studentId]
      ),
      pool.query<ScheduleItem>(
        `SELECT id, student_id AS "studentId", title, description,
                to_char(start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "startTime",
                to_char(end_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "endTime"
         FROM schedules
         WHERE student_id = $1
         ORDER BY start_time ASC`,
        [studentId]
      ),
      pool.query<ClassRegistration & { courseCode?: string }>(
        `SELECT * FROM (
           SELECT DISTINCT ON (cr.id)
                  cr.id, cr.student_id AS "studentId", cr.class_name AS "className", cr.instructor, cr.status,
                  cr.semester, cr.credits, cr.confirmed_by AS "confirmedBy",
                  to_char(cr.registered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "registeredAt",
                  COALESCE(tr.course_code, ta.course_code) AS "courseCode"
           FROM class_registrations cr
           LEFT JOIN teacher_rosters tr ON tr.student_id = cr.student_id 
             AND LOWER(TRIM(tr.course_title)) = LOWER(TRIM(cr.class_name))
           LEFT JOIN teaching_assignments ta ON LOWER(TRIM(ta.course_title)) = LOWER(TRIM(cr.class_name))
           WHERE cr.student_id = $1
           ORDER BY cr.id, COALESCE(tr.course_code, ta.course_code) NULLS LAST, cr.registered_at DESC
         ) AS registrations
         ORDER BY "registeredAt" DESC`,
        [studentId]
      )
    ]);

    // Check if student has classroom enrollments but missing class registrations
    // This can happen if they enrolled before the auto-enrollment code was added
    // IMPORTANT: Only auto-create if student has NO registrations at all (not just missing some)
    // This prevents auto-recreation of courses that were explicitly deregistered
    if (registrationsResult.rows.length === 0 && pool) {
      try {
        const { listClassroomEnrollmentsForStudent } = await import('./classroomService.js');
        const { listTeachingAssignments } = await import('./teachingService.js');
        const { getCourseMetadata } = await import('../utils/majors.js');
        const { findStaffById } = await import('./staffService.js');
        
        const classroomEnrollments = await listClassroomEnrollmentsForStudent(studentId);
        const allAssignments = await listTeachingAssignments();
        const studentMajor = student.primaryInterest?.trim().toLowerCase() || '';
        
        // Only auto-create if student has classroom enrollments AND no registrations at all
        // This is a one-time migration/setup, not a recurring sync
        if (classroomEnrollments.length > 0 && studentMajor) {
          // Double-check: verify student truly has no registrations (including deleted ones)
          const verifyNoRegs = await pool.query(
            `SELECT COUNT(*) as count FROM class_registrations WHERE student_id = $1`,
            [studentId]
          );
          const regCount = parseInt(verifyNoRegs.rows[0]?.count || '0', 10);
          
          // Only proceed if student has absolutely no registrations
          // This prevents auto-recreation after explicit deregistration
          if (regCount === 0) {
            // Student has classroom enrollments but no class registrations
            // Create missing class registrations for teaching assignments in their enrolled classrooms
            for (const enrollment of classroomEnrollments) {
              const classroomAssignments = allAssignments.filter(a => {
                if (a.classroomId !== enrollment.classroomId) return false;
                // Check if assignment major matches student major (case-insensitive)
                const assignmentMajor = a.majorFocus?.trim().toLowerCase() || '';
                return assignmentMajor === studentMajor;
              });
              
              for (const assignment of classroomAssignments) {
                // Check if registration already exists (double-check)
                const existingReg = await pool.query(
                  `SELECT id FROM class_registrations WHERE student_id = $1 AND class_name = $2`,
                  [studentId, assignment.courseTitle]
                );
                
                if (existingReg.rows.length === 0) {
                // Get teacher/instructor name
                const teacher = await findStaffById(assignment.teacherId);
                const instructor = teacher?.displayName ?? 'TBA';
                
                // Get course metadata for credits
                const metadata = getCourseMetadata(assignment.courseTitle);
                const credits = metadata?.credits ?? 3;
                const semester = assignment.semester || await getCurrentSemester();
                
                // Create class registration
                await pool.query(
                  `INSERT INTO class_registrations (student_id, class_name, instructor, status, semester, credits, confirmed_by, registered_at)
                   VALUES ($1, $2, $3, 'registered', $4, $5, NULL, NOW())`,
                  [studentId, assignment.courseTitle, instructor, semester, credits]
                );
                
                // Create timetable entry if it doesn't exist
                const existingTimetable = await pool.query(
                  `SELECT id FROM timetables WHERE student_id = $1 AND subject = $2 AND weekday = $3`,
                  [studentId, assignment.courseTitle, assignment.weekday]
                );
                
                if (existingTimetable.rows.length === 0) {
                  const classroomResult = await pool.query(
                    `SELECT location FROM classrooms WHERE id = $1`,
                    [enrollment.classroomId]
                  );
                  const location = classroomResult.rows[0]?.location || 'TBA';
                  
                  await pool.query(
                    `INSERT INTO timetables (student_id, weekday, start_time, end_time, subject, location)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [studentId, assignment.weekday, assignment.startTime, assignment.endTime, assignment.courseTitle, location]
                  );
                }
                
                // Add to teacher roster
                const existingRoster = await pool.query(
                  `SELECT id FROM teacher_rosters WHERE teacher_id = $1 AND course_code = $2 AND student_id = $3`,
                  [assignment.teacherId, assignment.courseCode, studentId]
                );
                
                if (existingRoster.rows.length === 0) {
                  await pool.query(
                    `INSERT INTO teacher_rosters (teacher_id, course_code, course_title, student_id, status)
                     VALUES ($1, $2, $3, $4, 'enrolled')`,
                    [assignment.teacherId, assignment.courseCode, assignment.courseTitle, studentId]
                  );
                }
                
                console.log(`[StudentService] Auto-created missing class registration for student ${studentId}: ${assignment.courseTitle}`);
              }
            }
          }
          
          // Re-fetch registrations after creating missing ones
          const newRegistrationsResult = await pool.query<ClassRegistration>(
            `SELECT id, student_id AS "studentId", class_name AS "className", instructor, status,
                    semester, credits, confirmed_by AS "confirmedBy",
                    to_char(registered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "registeredAt"
             FROM class_registrations
             WHERE student_id = $1
             ORDER BY registered_at DESC`,
            [studentId]
          );
          registrationsResult.rows = newRegistrationsResult.rows;
          }
        }
      } catch (error) {
        console.error('[StudentService] Failed to auto-create missing class registrations', error);
        // Continue even if this fails
      }
    }

    const [grades, exams, gpaBySemester, registrationWindows, fees, classroomEnrollments, assignments] = await Promise.all([
      listStudentGrades(studentId),
      listExamAnnouncements(),
      listStudentSemesterGpa(studentId),
      listRegistrationWindows(),
      listStudentFeePayments(studentId),
      listClassroomEnrollmentsForStudent(studentId),
      listStudentAssignments(studentId)
    ]);
    const upcomingExams = exams
      .filter((exam) => new Date(exam.examDate).getTime() >= Date.now())
      .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());

    // Ensure tuition fee exists based on class registrations
    // Calculate total credits from class registrations, grouped by semester
    const creditsBySemester = new Map<string, number>();
    for (const reg of registrationsResult.rows) {
      const semester = reg.semester || await getCurrentSemester();
      const currentCredits = creditsBySemester.get(semester) || 0;
      creditsBySemester.set(semester, currentCredits + (reg.credits ?? 0));
    }
    
    let updatedFees = fees;
    
    if (registrationsResult.rows.length > 0 && pool) {
      try {
        // Get current semester for new registrations without semester
        const currentSemester = await getCurrentSemester();
        
        // Process each semester separately - combine all fees into a single payment
        for (const [semester, totalCredits] of creditsBySemester.entries()) {
          const feeDueDate = new Date();
          feeDueDate.setDate(feeDueDate.getDate() + 30);
          
          // Calculate all fees and combine into a single payment
          const tuitionFeeAmount = totalCredits > 0 ? totalCredits * 100 : 0;
          const activityFeeAmount = 100;
          const insuranceFeeAmount = 100;
          const totalFeeAmount = tuitionFeeAmount + activityFeeAmount + insuranceFeeAmount;

          // Build description with all fee components
          const feeComponents: string[] = [];
          if (tuitionFeeAmount > 0) {
            feeComponents.push(`Tuition Fee - ${semester} (${totalCredits} credits)`);
          }
          feeComponents.push(`Activity Fee - ${semester}`);
          feeComponents.push(`Insurance Fee - ${semester}`);
          
          const combinedFeeDescription = feeComponents.join('; ');

          const paidForSemesterResult = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) AS total_paid
             FROM fee_payments
             WHERE student_id = $1 
             AND description LIKE $2
               AND status = 'paid'`,
            [studentId, `%${semester}%`]
          );

          const totalPaidForSemester = Number(paidForSemesterResult.rows[0]?.total_paid ?? 0);
          const outstandingAmount = Math.max(totalFeeAmount - totalPaidForSemester, 0);

          const existingPendingFees = await pool.query(
            `SELECT id FROM fee_payments 
             WHERE student_id = $1 
               AND description LIKE $2
               AND status = 'pending'
             ORDER BY id ASC`,
            [studentId, `%${semester}%`]
          );

          if (outstandingAmount <= 0) {
            if (existingPendingFees.rows.length > 0) {
              const idsToDelete = existingPendingFees.rows.map((row: any) => row.id);
              await pool.query(
                `DELETE FROM fee_payments WHERE id = ANY($1::int[])`,
                [idsToDelete]
              );
              console.log(`[StudentService] Removed pending semester fees for ${semester}; outstanding balance settled.`);
              updatedFees = await listStudentFeePayments(studentId);
            }
            continue;
          }

          if (existingPendingFees.rows.length === 0) {
            await pool.query(
              `INSERT INTO fee_payments (student_id, amount, description, status, due_date)
               VALUES ($1, $2, $3, 'pending', $4)`,
              [studentId, outstandingAmount, combinedFeeDescription, feeDueDate.toISOString()]
            );
            console.log(
              `[StudentService] Created outstanding fee ${outstandingAmount} SGD for ${semester} (Tuition: ${tuitionFeeAmount}, Activity: ${activityFeeAmount}, Insurance: ${insuranceFeeAmount}, Paid: ${totalPaidForSemester})`
            );
            updatedFees = await listStudentFeePayments(studentId);
          } else {
            const [primaryPending, ...extraPending] = existingPendingFees.rows;
            
              await pool.query(
              `UPDATE fee_payments
                 SET amount = $1,
                     description = $2,
                     status = 'pending',
                     due_date = $3
               WHERE id = $4`,
              [outstandingAmount, combinedFeeDescription, feeDueDate.toISOString(), primaryPending.id]
            );

            if (extraPending.length > 0) {
              const idsToDelete = extraPending.map((row: any) => row.id);
              await pool.query(
                `DELETE FROM fee_payments WHERE id = ANY($1::int[])`,
                [idsToDelete]
              );
            }

            console.log(
              `[StudentService] Updated outstanding fee to ${outstandingAmount} SGD for ${semester} (Paid: ${totalPaidForSemester})`
            );
              updatedFees = await listStudentFeePayments(studentId);
          }
        }
      } catch (error) {
        console.error('Failed to ensure semester and health insurance fees exist', error);
      }
    }

    // Filter registration windows courses by student's major
    const studentMajor = student.primaryInterest;
    let filteredRegistrationWindows = registrationWindows;

    if (studentMajor && pool) {
      try {
        // Get all teaching assignments to map courses to majors
        const assignmentsResult = await pool.query(
          `SELECT DISTINCT course_code, course_title, major_focus
           FROM teaching_assignments`
        );

        const courseToMajorMap = new Map<string, string>();
        for (const row of assignmentsResult.rows) {
          const courseKey = `${row.course_code}|${row.course_title}`;
          if (!courseToMajorMap.has(courseKey)) {
            courseToMajorMap.set(courseKey, row.major_focus);
          }
        }

        // Filter courses in registration windows
        filteredRegistrationWindows = registrationWindows.map((window) => {
          const filteredCourses = window.courses.filter((course) => {
            const courseKey = `${course.courseCode}|${course.courseTitle}`;
            const courseMajor = courseToMajorMap.get(courseKey);
            
            // If course is found in teaching assignments, filter by major
            // Otherwise, also check if course title matches the student's major subjects
            if (courseMajor) {
              return courseMajor.trim().toLowerCase() === studentMajor.trim().toLowerCase();
            }
            
            // Fallback: check if course title contains major-related keywords
            const majorSubjects = getSubjectsForMajor(studentMajor);
            return majorSubjects.some(subject => 
              course.courseTitle.toLowerCase().includes(subject.toLowerCase()) ||
              course.courseCode.toLowerCase().includes(studentMajor.toLowerCase().substring(0, 4))
            );
          });

          return {
            ...window,
            courses: filteredCourses
          };
        });
      } catch (error) {
        console.error('Failed to filter registration windows by major', error);
        // Fall back to unfiltered windows if error occurs
      }
    }

    return {
      student,
      timetable: timetableResult.rows,
      schedule: scheduleResult.rows,
      registrations: registrationsResult.rows,
      classroomEnrollments,
      grades,
      upcomingExams,
      gpaBySemester,
      registrationWindows: filteredRegistrationWindows,
      fees: updatedFees,
      assignments
    };
  } catch (error) {
    console.error('Failed to fetch student dashboard', error);
    return null;
  }
}

export async function registerStudentForSemesterCourse(
  studentId: number,
  semester: string,
  courseCode: string
): Promise<ClassRegistration> {
  if (!Number.isFinite(studentId)) {
    throw new Error('Invalid student.');
  }

  const offering = findCourseOffering(semester, courseCode);

  if (!offering) {
    throw new Error('Course is not available for the requested semester.');
  }

  if (offering.window.status !== 'open') {
    throw new Error('Registration for this semester is not open.');
  }

  const alreadyRegistered = inMemoryRegistrations.some(
    (registration) =>
      registration.studentId === studentId &&
      registration.semester === offering.window.semester &&
      registration.className === offering.course.courseTitle
  );

  if (alreadyRegistered) {
    throw new Error('Student is already registered for this course.');
  }

  const pool = getPool();

  if (!pool) {
    const registration: ClassRegistration = {
      id: nextRegistrationId++,
      studentId,
      className: offering.course.courseTitle,
      instructor: offering.course.instructor,
      status: 'registered',
      registeredAt: new Date().toISOString(),
      semester: offering.window.semester
    };

    inMemoryRegistrations = [registration, ...inMemoryRegistrations];
    return registration;
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO class_registrations (student_id, class_name, instructor, status, semester)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, student_id AS "studentId", class_name AS "className", instructor, status,
                 to_char(registered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "registeredAt",
                 semester`,
      [studentId, offering.course.courseTitle, offering.course.instructor, 'registered', offering.window.semester]
    );

    const [registration] = rows as unknown as ClassRegistration[];
    return registration;
  } catch (error: any) {
    const duplicate = error?.code === '23505';
    if (duplicate) {
      throw new Error('Student is already registered for this course.');
    }

    console.error('Failed to register student for course', error);
    throw new Error('Unable to register for the selected course right now.');
  }
}

export async function deregisterStudentFromCourse(
  studentId: number,
  courseCode: string
): Promise<{ success: boolean; message: string; removed: { classRegistrations: number; teacherRosters: number; timetables: number } }> {
  if (!Number.isFinite(studentId)) {
    throw new Error('Invalid student ID.');
  }

  if (!courseCode || typeof courseCode !== 'string' || courseCode.trim().length === 0) {
    throw new Error('Course code is required.');
  }

  const pool = getPool();

  if (!pool) {
    throw new Error('Database connection not available.');
  }

  try {
    // Start a transaction to ensure all deletions succeed or fail together
    // @ts-expect-error - Pool.connect() exists at runtime but may not be in type definitions
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const normalizedCourseCode = courseCode.trim().toUpperCase();

      // First, try to find all matching records using course code
      // Get all class names that match this course code
      const matchingClassesQuery = await client.query(
        `SELECT DISTINCT cr.class_name, tr.course_code, ta.course_title
         FROM class_registrations cr
         LEFT JOIN teacher_rosters tr ON tr.student_id = cr.student_id 
           AND LOWER(TRIM(tr.course_title)) = LOWER(TRIM(cr.class_name))
         LEFT JOIN teaching_assignments ta ON LOWER(TRIM(ta.course_title)) = LOWER(TRIM(cr.class_name))
         WHERE cr.student_id = $1
           AND (UPPER(tr.course_code) = $2 OR UPPER(ta.course_code) = $2 OR cr.class_name ILIKE $3)`,
        [studentId, normalizedCourseCode, `%${courseCode.trim()}%`]
      );

      const matchingClassNames = new Set<string>();
      let foundCourseTitle: string | null = null;

      if (matchingClassesQuery.rows.length > 0) {
        for (const row of matchingClassesQuery.rows) {
          if (row.class_name) {
            matchingClassNames.add(row.class_name);
            if (!foundCourseTitle && row.class_name) {
              foundCourseTitle = row.class_name;
            }
          }
        }
      }

      // If no matches found, try to find by course code in teacher_rosters or teaching_assignments
      if (matchingClassNames.size === 0) {
        const courseTitleQuery = await client.query(
          `SELECT DISTINCT course_title
           FROM teaching_assignments
           WHERE UPPER(course_code) = $1
           LIMIT 1`,
          [normalizedCourseCode]
        );

        if (courseTitleQuery.rows.length > 0) {
          const courseTitle = courseTitleQuery.rows[0].course_title;
          if (courseTitle) {
            foundCourseTitle = courseTitle;
            matchingClassNames.add(courseTitle);
          }
        }
      }

      // If still no matches, try to find any class_registrations for this student that might match
      if (matchingClassNames.size === 0) {
        const allRegistrationsQuery = await client.query(
          `SELECT DISTINCT class_name
           FROM class_registrations
           WHERE student_id = $1`,
          [studentId]
        );

        for (const row of allRegistrationsQuery.rows) {
          if (row.class_name && (
            row.class_name.toUpperCase().includes(normalizedCourseCode) ||
            normalizedCourseCode.includes(row.class_name.toUpperCase().substring(0, 3))
          )) {
            matchingClassNames.add(row.class_name);
            if (!foundCourseTitle) {
              foundCourseTitle = row.class_name;
            }
          }
        }
      }

      if (matchingClassNames.size === 0) {
        await client.query('ROLLBACK');
        throw new Error(`Course "${courseCode}" not found for student ${studentId}.`);
      }

      console.log(`[StudentService] Found ${matchingClassNames.size} matching class(es) for course code ${courseCode}:`, Array.from(matchingClassNames));

      // Delete from class_registrations - delete ALL matching class names
      let totalClassRegCount = 0;
      for (const className of matchingClassNames) {
        const classRegResult = await client.query(
          `DELETE FROM class_registrations
           WHERE student_id = $1
             AND LOWER(TRIM(class_name)) = LOWER(TRIM($2))
           RETURNING id`,
          [studentId, className]
        );
        totalClassRegCount += classRegResult.rowCount || 0;
      }

      // Delete from teacher_rosters - by course code
      const rosterResult = await client.query(
        `DELETE FROM teacher_rosters
         WHERE student_id = $1
           AND UPPER(course_code) = $2
         RETURNING id`,
        [studentId, normalizedCourseCode]
      );
      const rosterCount = rosterResult.rowCount || 0;

      // Delete from timetables - delete ALL matching subjects
      let totalTimetableCount = 0;
      for (const className of matchingClassNames) {
        const timetableResult = await client.query(
          `DELETE FROM timetables
           WHERE student_id = $1
             AND LOWER(TRIM(subject)) = LOWER(TRIM($2))
           RETURNING id`,
          [studentId, className]
        );
        totalTimetableCount += timetableResult.rowCount || 0;
      }

      // Also delete from teacher_rosters by course title if course code didn't match
      let totalRosterCount = rosterCount;
      if (rosterCount === 0 && foundCourseTitle) {
        const rosterByTitleResult = await client.query(
          `DELETE FROM teacher_rosters
           WHERE student_id = $1
             AND LOWER(TRIM(course_title)) = LOWER(TRIM($2))
           RETURNING id`,
          [studentId, foundCourseTitle]
        );
        const rosterByTitleCount = rosterByTitleResult.rowCount || 0;
        totalRosterCount += rosterByTitleCount;
        if (rosterByTitleCount > 0) {
          console.log(`[StudentService] Deleted ${rosterByTitleCount} teacher_roster entries by course title`);
        }
      }

      // Also delete from classroom_registrations if this course was the only one in that classroom
      // First, find which classrooms this course belongs to
      let classroomRegCount = 0;
      if (foundCourseTitle) {
        // Find classrooms that have this course
        const classroomQuery = await client.query(
          `SELECT DISTINCT ta.classroom_id
           FROM teaching_assignments ta
           WHERE LOWER(TRIM(ta.course_title)) = LOWER(TRIM($1))
             OR UPPER(ta.course_code) = $2`,
          [foundCourseTitle, normalizedCourseCode]
        );

        for (const row of classroomQuery.rows) {
          const classroomId = row.classroom_id;
          
          // Check if student has other registrations in this classroom
          const otherRegsQuery = await client.query(
            `SELECT COUNT(*) as count
             FROM class_registrations cr
             JOIN teaching_assignments ta ON LOWER(TRIM(ta.course_title)) = LOWER(TRIM(cr.class_name))
             WHERE cr.student_id = $1
               AND ta.classroom_id = $2
               AND LOWER(TRIM(cr.class_name)) != LOWER(TRIM($3))`,
            [studentId, classroomId, foundCourseTitle]
          );

          const otherRegsCount = parseInt(otherRegsQuery.rows[0]?.count || '0', 10);
          
          // If no other registrations in this classroom, remove the classroom enrollment
          if (otherRegsCount === 0) {
            const classroomRegResult = await client.query(
              `DELETE FROM classroom_registrations
               WHERE student_id = $1
                 AND classroom_id = $2
               RETURNING id`,
              [studentId, classroomId]
            );
            classroomRegCount += classroomRegResult.rowCount || 0;
            if (classroomRegResult.rowCount > 0) {
              console.log(`[StudentService] Deleted classroom_registration for student ${studentId} in classroom ${classroomId}`);
            }
          }
        }
      }

      // Also ensure ALL teacher_rosters entries for this course code are deleted (regardless of teacher_id)
      // This is important because the registration check looks for course_code + teacher_id
      const allRosterEntries = await client.query(
        `SELECT id, teacher_id, course_code, course_title
         FROM teacher_rosters
         WHERE student_id = $1
           AND UPPER(course_code) = $2`,
        [studentId, normalizedCourseCode]
      );
      
      if (allRosterEntries.rows.length > 0) {
        console.log(`[StudentService] Found ${allRosterEntries.rows.length} additional teacher_roster entries to delete:`, 
          allRosterEntries.rows.map((r: any) => ({ teacher_id: r.teacher_id, course_code: r.course_code, course_title: r.course_title })));
        
        const additionalRosterDelete = await client.query(
          `DELETE FROM teacher_rosters
           WHERE student_id = $1
             AND UPPER(course_code) = $2
           RETURNING id`,
          [studentId, normalizedCourseCode]
        );
        
        const additionalRosterCount = additionalRosterDelete.rowCount || 0;
        totalRosterCount += additionalRosterCount;
        if (additionalRosterCount > 0) {
          console.log(`[StudentService] Deleted ${additionalRosterCount} additional teacher_roster entries`);
        }
      }

      // Verify that at least some records were deleted
      const totalDeleted = totalClassRegCount + totalRosterCount + totalTimetableCount;
      if (totalDeleted === 0) {
        await client.query('ROLLBACK');
        throw new Error(`No records found to delete for course "${courseCode}" and student ${studentId}.`);
      }

      await client.query('COMMIT');

      const removed = {
        classRegistrations: totalClassRegCount,
        teacherRosters: totalRosterCount,
        timetables: totalTimetableCount
      };

      console.log(`[StudentService] Deregistered student ${studentId} from course ${courseCode}:`, removed);
      console.log(`[StudentService] Deleted from class_registrations: ${totalClassRegCount}, teacher_rosters: ${totalRosterCount}, timetables: ${totalTimetableCount}`);

      return {
        success: true,
        message: `Successfully deregistered student from course "${foundCourseTitle || courseCode}" (${courseCode}).`,
        removed
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Failed to deregister student from course', error);
    const errorMessage = error?.message || 'Unable to deregister student from course.';
    throw new Error(errorMessage);
  }
}

export async function deleteStudent(studentId: number): Promise<{ success: boolean; message: string }> {
  if (!Number.isFinite(studentId)) {
    throw new Error('Invalid student ID.');
  }

  const pool = getPool();

  if (!pool) {
    throw new Error('Database connection not available.');
  }

  try {
    // Start a transaction to ensure all deletions succeed or fail together
    // @ts-expect-error - Pool.connect() exists at runtime but may not be in type definitions
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // First, verify the student exists
      const { rows: studentRows } = await client.query(
        `SELECT id, email FROM student_accounts WHERE id = $1`,
        [studentId]
      );

      if (studentRows.length === 0) {
        await client.query('ROLLBACK');
        throw new Error(`Student with ID ${studentId} not found.`);
      }

      const studentEmail = studentRows[0].email;

      // Delete all related records in order (respecting foreign key constraints)
      // Delete from timetables
      await client.query('DELETE FROM timetables WHERE student_id = $1', [studentId]);

      // Delete from class_registrations
      await client.query('DELETE FROM class_registrations WHERE student_id = $1', [studentId]);

      // Delete from teacher_rosters
      await client.query('DELETE FROM teacher_rosters WHERE student_id = $1', [studentId]);

      // Delete from classroom_registrations
      await client.query('DELETE FROM classroom_registrations WHERE student_id = $1', [studentId]);

      // Delete from semester_gpa (if exists)
      try {
        await client.query('DELETE FROM semester_gpa WHERE student_id = $1', [studentId]);
      } catch (e) {
        // Table might not exist, ignore
      }

      // Delete from grades (if exists)
      try {
        await client.query('DELETE FROM grades WHERE student_id = $1', [studentId]);
      } catch (e) {
        // Table might not exist, ignore
      }

      // Finally, delete the student account
      await client.query('DELETE FROM student_accounts WHERE id = $1', [studentId]);

      await client.query('COMMIT');

      console.log(`[StudentService] Deleted student ${studentId} (${studentEmail}) and all related records.`);

      return {
        success: true,
        message: `Student account ${studentEmail} (ID: ${studentId}) has been deleted successfully.`
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Failed to delete student', error);
    const errorMessage = error?.message || 'Unable to delete student account.';
    throw new Error(errorMessage);
  }
}
