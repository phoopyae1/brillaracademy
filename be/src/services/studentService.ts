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
import { getCourseMetadata } from '../utils/majors.js';

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
      semester: 'Fall 2024',
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
          [studentId, subject, metadata.instructor, 'registered', 'Fall 2024', metadata.credits, null]
        );

        // Insert timetable
        await pool.query(
          `INSERT INTO timetables (student_id, weekday, start_time, end_time, subject, location)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [studentId, weekday, timeSlot.start, timeSlot.end, subject, location]
        );

        // Create fee
        const feeAmount = metadata.credits * 350; // $350 per credit
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
      const feeAmount = metadata.credits * 350;
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

    const [grades, exams, gpaBySemester, registrationWindows, fees, classroomEnrollments] = await Promise.all([
      listStudentGrades(studentId),
      listExamAnnouncements(),
      listStudentSemesterGpa(studentId),
      listRegistrationWindows(),
      listStudentFeePayments(studentId),
      listClassroomEnrollmentsForStudent(studentId)
    ]);
    const upcomingExams = exams
      .filter((exam) => new Date(exam.examDate).getTime() >= Date.now())
      .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());

    return {
      student: applySubjectSelection(student),
      timetable: inMemoryTimetables.filter((entry) => entry.studentId === studentId),
      schedule: inMemorySchedules.filter((entry) => entry.studentId === studentId),
      registrations: inMemoryRegistrations.filter((entry) => entry.studentId === studentId),
      classroomEnrollments,
      grades,
      upcomingExams,
      gpaBySemester,
      registrationWindows,
      fees
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
      pool.query<ClassRegistration>(
        `SELECT id, student_id AS "studentId", class_name AS "className", instructor, status,
                semester, credits, confirmed_by AS "confirmedBy",
                to_char(registered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "registeredAt"
         FROM class_registrations
         WHERE student_id = $1
         ORDER BY registered_at DESC`,
        [studentId]
      )
    ]);

    const [grades, exams, gpaBySemester, registrationWindows, fees, classroomEnrollments] = await Promise.all([
      listStudentGrades(studentId),
      listExamAnnouncements(),
      listStudentSemesterGpa(studentId),
      listRegistrationWindows(),
      listStudentFeePayments(studentId),
      listClassroomEnrollmentsForStudent(studentId)
    ]);
    const upcomingExams = exams
      .filter((exam) => new Date(exam.examDate).getTime() >= Date.now())
      .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());

    return {
      student,
      timetable: timetableResult.rows,
      schedule: scheduleResult.rows,
      registrations: registrationsResult.rows,
      classroomEnrollments,
      grades,
      upcomingExams,
      gpaBySemester,
      registrationWindows,
      fees
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
