import { Router } from 'express';
import { getPool } from '../db/pool.js';
import { fetchStudentById } from '../services/studentService.js';
import { listAnnouncements } from '../services/announcementService.js';
import { listStudentAssignments } from '../services/assignmentService.js';
import { gradeToPoint } from '../services/academicService.js';
import { requireStudent, type AuthenticatedStudentRequest } from '../middleware/requireStudent.js';
import { registerStudentForClassroom } from '../services/classroomService.js';
import { getCurrentSemester, isRegistrationPeriodOpen, getRegistrationStatus, getSemesterDate } from '../services/systemService.js';

function formatTimeToSingapore(time: string | null | undefined): string | null {
  if (!time) {
    return null;
  }

  try {
    const date = new Date(`1970-01-01T${time}:00Z`);
    const formatter = new Intl.DateTimeFormat('en-SG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Singapore'
    });
    return formatter.format(date);
  } catch (error) {
    console.warn('[AgentRoutes] Failed to format time to Singapore timezone:', error);
    return time;
  }
}

function getDayName(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-SG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Singapore'
  }).format(date);
}

function formatDateTimeToSingapore(isoDateTime: string | null | undefined): { iso: string; display: string; date: string; dayName: string } | null {
  if (!isoDateTime) {
    return null;
  }

  try {
    const date = new Date(isoDateTime);
    const display = new Intl.DateTimeFormat('en-SG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Singapore'
    }).format(date);

    return {
      iso: date.toISOString(),
      display,
      date: formatDate(date),
      dayName: getDayName(date)
    };
  } catch (error) {
    console.warn('[AgentRoutes] Failed to format datetime to Singapore timezone:', error);
    return null;
  }
}

const router = Router();

/**
 * POST /api/agent/student-profile
 * Get student profile for agent nodes
 * Requires authentication via Bearer token
 * Request body: { studentId: number }
 */
router.post('/student-profile', requireStudent(), async (req: AuthenticatedStudentRequest, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId || !Number.isFinite(Number(studentId))) {
      return res.status(400).json({ error: 'Invalid student ID in request body.' });
    }

    const id = Number(studentId);
    const student = await fetchStudentById(id);

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    // Return flat response - direct object (no nesting)
    return res.json({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      role: student.role,
      major: student.primaryInterest,
      selectedSubjects: student.selectedSubjects ?? [],
      createdAt: student.createdAt
    });
  } catch (error) {
    console.error('[Agent] Error fetching student profile:', error);
    return res.status(500).json({ error: 'Failed to fetch student profile.' });
  }
});

/**
 * POST /api/agent/student-registrations
 * Get student's registered subjects/courses
 * Requires authentication via Bearer token
 * Request body: { studentId: number }
 * Returns flat response with all registration data
 */
router.post('/student-registrations', requireStudent(), async (req: AuthenticatedStudentRequest, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId || !Number.isFinite(Number(studentId))) {
      return res.status(400).json({ error: 'Invalid student ID in request body.' });
    }

    const id = Number(studentId);
    const pool = getPool();

    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available.' });
    }

    const { rows } = await pool.query(
      `SELECT 
        cr.id,
        cr.student_id AS "studentId",
        cr.class_name AS "className",
        cr.instructor,
        cr.status,
        cr.semester,
        cr.credits,
        cr.confirmed_by AS "confirmedBy",
        sa.display_name AS "confirmedByName",
         to_char(cr.registered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "registeredAt",
         ta.course_code AS "courseCode",
         ta.weekday,
         to_char(ta.start_time, 'HH24:MI') AS "startTime",
         to_char(ta.end_time, 'HH24:MI') AS "endTime",
         ta.student_group AS "studentGroup",
         ta.semester AS "teachingSemester",
         classroom.name AS "classroomName",
         classroom.location AS "classroomLocation",
         teacher.display_name AS "teacherName"
       FROM class_registrations cr
       LEFT JOIN staff_accounts sa ON cr.confirmed_by = sa.id
       LEFT JOIN teaching_assignments ta
         ON LOWER(TRIM(ta.course_title)) = LOWER(TRIM(cr.class_name))
       LEFT JOIN classrooms classroom ON ta.classroom_id = classroom.id
       LEFT JOIN staff_accounts teacher ON ta.teacher_id = teacher.id
       WHERE cr.student_id = $1
       ORDER BY cr.registered_at DESC`,
      [id]
    );

    const detailedRegistrations = rows.map((row: any) => {
      const registeredAtSingapore = formatDateTimeToSingapore(row.registeredAt);
      const registeredDate = row.registeredAt ? new Date(row.registeredAt) : null;
      
      return {
        id: row.id,
        studentId: row.studentId,
        className: row.className,
        courseCode: row.courseCode || null,
        instructor: row.instructor || row.teacherName || null,
        teacherName: row.teacherName || row.instructor || null,
        status: row.status,
        isConfirmed: row.confirmedBy !== null,
        confirmedBy: row.confirmedBy,
        confirmedByName: row.confirmedByName || null,
        semester: row.semester || row.teachingSemester || null,
        credits: row.credits,
        registeredAt: row.registeredAt,
        registeredAtSingapore: registeredAtSingapore,
        registeredDate: registeredDate ? formatDate(registeredDate) : null,
        registeredDayName: registeredDate ? getDayName(registeredDate) : null,
        weekday: row.weekday || null,
        weekdayName: row.weekday || null, // e.g., "Monday", "Tuesday", "Thursday", "Friday"
        startTime: row.startTime || null,
        endTime: row.endTime || null,
        startTimeSingapore: formatTimeToSingapore(row.startTime) || null,
        endTimeSingapore: formatTimeToSingapore(row.endTime) || null,
        classroomName: row.classroomName || null,
        classroomLocation: row.classroomLocation || null,
        studentGroup: row.studentGroup || null
      };
    });

    const generatedAt = formatDateTimeToSingapore(new Date().toISOString());
    const currentSemester = await getCurrentSemester();
    const registrationStatus = currentSemester ? await getRegistrationStatus(currentSemester) : { open: false, reason: 'unknown', message: 'Current semester not set.' };
    const semesterDate = currentSemester ? await getSemesterDate(currentSemester) : null;

    return res.json({
      generatedAtSingapore: generatedAt,
      currentSemester: currentSemester,
      registrationStatus: {
        open: registrationStatus.open,
        reason: registrationStatus.reason || null,
        message: registrationStatus.message || null,
        startDate: semesterDate?.startDate || null,
        endDate: semesterDate?.endDate || null
      },
      registrations: detailedRegistrations
    });
  } catch (error) {
    console.error('[Agent] Error fetching student registrations:', error);
    return res.status(500).json({ error: 'Failed to fetch student registrations.' });
  }
});

/**
 * POST /api/agent/announcements-events
 * Get announcements and events
 * Requires authentication via Bearer token
 * Request body: { studentId: number } (optional, for filtering student-specific events)
 * Returns flat response with all announcements and events
 */
router.post('/announcements-events', requireStudent(), async (req: AuthenticatedStudentRequest, res) => {
  try {
    const { studentId } = req.body;
    const pool = getPool();

    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available.' });
    }

    // Fetch all announcements (includes both announcements and events)
    const announcements = await listAnnouncements();

    // Fetch student-specific schedule events if studentId is provided
    let scheduleEvents: any[] = [];
    if (studentId && Number.isFinite(Number(studentId))) {
      const id = Number(studentId);
      const { rows } = await pool.query(
        `SELECT 
          id,
          student_id AS "studentId",
          title,
          description,
          to_char(start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "startTime",
          to_char(end_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "endTime"
         FROM schedules
         WHERE student_id = $1
         ORDER BY start_time ASC`,
        [id]
      );
      scheduleEvents = rows;
    }

    // Combine announcements and events into flat array
    const allItems = [
      // Announcements and events from announcements table
      ...announcements.map((announcement: any) => ({
        id: announcement.id,
        type: announcement.type || 'announcement',
        title: announcement.title,
        content: announcement.content,
        eventDate: announcement.eventDate || null,
        postedBy: announcement.postedBy || null,
        postedByName: announcement.postedByName || null,
        createdAt: announcement.createdAt
      })),
      // Student-specific schedule events
      ...scheduleEvents.map((event: any) => ({
        id: `schedule-${event.id}`,
        type: 'event',
        title: event.title,
        content: event.description || null,
        eventDate: event.startTime,
        studentId: event.studentId,
        startTime: event.startTime,
        endTime: event.endTime,
        postedBy: null,
        postedByName: null,
        createdAt: event.startTime
      }))
    ];

    // Sort by date (most recent first)
    allItems.sort((a, b) => {
      const dateA = new Date(a.eventDate || a.createdAt).getTime();
      const dateB = new Date(b.eventDate || b.createdAt).getTime();
      return dateB - dateA;
    });

    // Return flat response - direct array (no nesting)
    return res.json(allItems);
  } catch (error) {
    console.error('[Agent] Error fetching announcements and events:', error);
    return res.status(500).json({ error: 'Failed to fetch announcements and events.' });
  }
});

/**
 * POST /api/agent/admission-fees
 * Get admission fee summary and payment history for a student
 * Requires authentication via Bearer token
 * Request body: { studentId: number }
 */
router.post('/admission-fees', requireStudent(), async (req: AuthenticatedStudentRequest, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId || !Number.isFinite(Number(studentId))) {
      return res.status(400).json({ error: 'Invalid student ID in request body.' });
    }

    const id = Number(studentId);
    const pool = getPool();

    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available.' });
    }

    const paymentRows = await (async () => {
      try {
        const { rows } = await pool.query(
          `SELECT 
         id,
         student_id AS "studentId",
         amount,
         description,
         status,
         received_by AS "receivedBy",
         to_char(received_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "receivedAt",
         to_char(due_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "dueDate"
       FROM fee_payments
       WHERE student_id = $1
       ORDER BY received_at DESC NULLS LAST, due_date ASC NULLS LAST`,
          [id]
        );
        return rows;
      } catch (error: any) {
        if (error?.code === '42703') {
          const { rows } = await pool.query(
            `SELECT 
               id,
               student_id AS "studentId",
               amount,
               description,
               status,
               NULL::INTEGER AS "receivedBy",
               NULL::TIMESTAMP AS "receivedAt",
               NULL::TIMESTAMP AS "dueDate"
             FROM fee_payments
             WHERE student_id = $1
             ORDER BY id DESC`,
            [id]
          );
          return rows;
        }
        throw error;
      }
    })();

    const subjectRows = await (async () => {
      try {
        const { rows } = await pool.query(
          `SELECT 
             cr.id,
             cr.class_name AS "className",
             cr.course_code AS "courseCode",
             cr.semester,
             cr.credits,
             cr.status,
             cr.confirmed_by AS "confirmedBy",
             to_char(cr.registered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "registeredAt",
             sa.display_name AS "teacherName"
           FROM class_registrations cr
           LEFT JOIN staff_accounts sa ON cr.confirmed_by = sa.id
           WHERE cr.student_id = $1
           ORDER BY cr.registered_at DESC`,
          [id]
        );
        return rows;
      } catch (error: any) {
        if (error?.code === '42703') {
          const { rows } = await pool.query(
            `SELECT 
               cr.id,
               cr.class_name AS "className",
               cr.semester,
               cr.credits,
               cr.status,
               NULL::INTEGER AS "confirmedBy",
               NULL::TIMESTAMP AS "registeredAt",
               NULL::TEXT AS "teacherName"
             FROM class_registrations cr
             WHERE cr.student_id = $1
             ORDER BY cr.id DESC`,
            [id]
          );
          return rows;
        }
        throw error;
      }
    })();

    const subjectFees = subjectRows.map((row: any) => {
      const credits = Number(row.credits ?? 0);
      const amount = credits * 100;
      const label = row.courseCode ?? row.className ?? `Course ${row.id}`;

      return {
        label,
        category: 'subject' as const,
        amount,
        status: 'unpaid' as 'paid' | 'unpaid'
      };
    });
    const semesters = new Set<string>();
    subjectRows.forEach((row: any) => {
      if (row.semester) {
        semesters.add(row.semester);
      }
    });

    const activityStatus = new Map<string, 'paid' | 'unpaid'>();
    const insuranceStatus = new Map<string, 'paid' | 'unpaid'>();
    semesters.forEach((semester) => {
      activityStatus.set(semester, 'unpaid');
      insuranceStatus.set(semester, 'unpaid');
    });

    const matchedPaymentIds = new Set<number>();

    paymentRows.forEach((row: any) => {
      const description = (row.description ?? '').toString();
      const normalized = description.toLowerCase();

      semesters.forEach((semester) => {
        const activityTag = `activity fee - ${semester}`.toLowerCase();
        const insuranceTag = `insurance fee - ${semester}`.toLowerCase();

        if (normalized.includes(activityTag)) {
          activityStatus.set(semester, row.status === 'paid' ? 'paid' : 'unpaid');
          matchedPaymentIds.add(row.id);
        }

        if (normalized.includes(insuranceTag)) {
          insuranceStatus.set(semester, row.status === 'paid' ? 'paid' : 'unpaid');
          matchedPaymentIds.add(row.id);
        }

        const tuitionTag = `tuition fee - ${semester}`.toLowerCase();
        if (normalized.includes(tuitionTag)) {
          matchedPaymentIds.add(row.id);
        }
      });
    });

    const activityFees = Array.from(semesters).map((semester) => ({
      label: `Activity Fee - ${semester}`,
      category: 'other' as const,
      amount: 100,
      status: activityStatus.get(semester) ?? 'unpaid'
    }));

    const insuranceFees = Array.from(semesters).map((semester) => ({
      label: `Health Insurance - ${semester}`,
      category: 'other' as const,
      amount: 100,
      status: insuranceStatus.get(semester) ?? 'unpaid'
    }));

    const otherFees = paymentRows
      .filter((row: any) => !matchedPaymentIds.has(row.id))
      .map((row: any) => {
        const description = (row.description ?? '').toString().trim();
        const label = description || 'Other Fee';

        return {
          label,
          category: 'other' as const,
          amount: Math.abs(Number(row.amount)),
          status: row.status === 'paid' ? 'paid' : 'unpaid'
        };
      });

    const totalPaid = paymentRows
      .filter((row: any) => row.status === 'paid')
      .reduce((sum: number, row: any) => sum + Math.abs(Number(row.amount)), 0);

    const paidOtherFeeTotal = otherFees
      .filter((fee) => fee.status === 'paid')
      .reduce((sum, fee) => sum + fee.amount, 0);

    let remainingPaid = Math.max(totalPaid - paidOtherFeeTotal, 0);

    const applyPaymentStatus = (
      fees: Array<{ label: string; category: 'subject' | 'other'; amount: number; status: 'paid' | 'unpaid' }>
    ) =>
      fees.map((fee) => {
        if (remainingPaid >= fee.amount) {
          remainingPaid -= fee.amount;
          return { ...fee, status: 'paid' as const };
        }
        return { ...fee, status: 'unpaid' as const };
      });

    const activityFeesWithStatus = applyPaymentStatus(activityFees);
    const insuranceFeesWithStatus = applyPaymentStatus(insuranceFees);
    const subjectFeesWithStatus = applyPaymentStatus(subjectFees);

    return res.json([
      ...subjectFeesWithStatus,
      ...activityFeesWithStatus,
      ...insuranceFeesWithStatus,
      ...otherFees
    ]);
  } catch (error) {
    console.error('[Agent] Error fetching admission fees:', error);
    return res.status(500).json({ error: 'Failed to fetch admission fees.' });
  }
});

/**
 * POST /api/agent/assignments
 * Get student's assignments
 * Requires authentication via Bearer token
 * Request body: { studentId: number }
 * Returns flat response with all assignment data
 */
router.post('/assignments', requireStudent(), async (req: AuthenticatedStudentRequest, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId || !Number.isFinite(Number(studentId))) {
      return res.status(400).json({ error: 'Invalid student ID in request body.' });
    }

    const id = Number(studentId);
    const assignments = await listStudentAssignments(id);

    // Return flat response - direct array of assignment objects (no nesting)
    return res.json(
      assignments.map((assignment: any) => ({
        id: assignment.id,
        teacherId: assignment.teacherId,
        teacherName: assignment.teacherName || null,
        courseCode: assignment.courseCode,
        courseTitle: assignment.courseTitle,
        title: assignment.title,
        description: assignment.description || null,
        dueDate: assignment.dueDate,
        maxPoints: assignment.maxPoints || null,
        assignmentType: assignment.assignmentType,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt
      }))
    );
  } catch (error) {
    console.error('[Agent] Error fetching assignments:', error);
    return res.status(500).json({ error: 'Failed to fetch assignments.' });
  }
});

/**
 * POST /api/agent/grades
 * Get student's grades
 * Requires authentication via Bearer token
 * Request body: { studentId: number }
 * Returns flat response with all grade data
 */
router.post('/grades', requireStudent(), async (req: AuthenticatedStudentRequest, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId || !Number.isFinite(Number(studentId))) {
      return res.status(400).json({ error: 'Invalid student ID in request body.' });
    }

    const id = Number(studentId);
    const pool = getPool();

    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available.' });
    }

    // Fetch grades with teacher information
    const { rows } = await pool.query(
      `SELECT 
        gr.id,
        gr.student_id AS "studentId",
        gr.course_code AS "courseCode",
        gr.course_title AS "courseTitle",
        gr.semester,
        gr.grade,
        gr.credits,
        gr.recorded_by AS "recordedBy",
        sa.display_name AS "teacherName",
        to_char(gr.recorded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "recordedAt"
       FROM grade_records gr
       LEFT JOIN staff_accounts sa ON gr.recorded_by = sa.id
       WHERE gr.student_id = $1
       ORDER BY gr.semester DESC, gr.course_code ASC`,
      [id]
    );

    const totalCredits = rows.reduce((sum: number, row: any) => sum + Number(row.credits ?? 0), 0);
    const totalPoints = rows.reduce(
      (sum: number, row: any) => sum + gradeToPoint(row.grade) * Number(row.credits ?? 0),
      0
    );
    const totalGpa =
      totalCredits > 0 ? Math.round((totalPoints / totalCredits) * 100) / 100 : null;

    return res.json({
      grades: rows.map((row: any) => ({
        id: row.id,
        studentId: row.studentId,
        courseCode: row.courseCode,
        courseTitle: row.courseTitle,
        semester: row.semester,
        grade: row.grade,
        credits: row.credits || null,
        recordedBy: row.recordedBy || null,
        teacherName: row.teacherName || null,
        recordedAt: row.recordedAt || null
      })),
      totalGpa,
      totalCredits
    });
  } catch (error) {
    console.error('[Agent] Error fetching grades:', error);
    return res.status(500).json({ error: 'Failed to fetch grades.' });
  }
});

/**
 * POST /api/agent/register-course
 * Register student for a course
 * Requires authentication via Bearer token
 * Request body: { studentId: number, courseCode: string, major: string, weekday: string, startTime: string }
 * Returns flat response with enrollment data including teacher name
 */
router.post('/register-course', requireStudent(), async (req: AuthenticatedStudentRequest, res) => {
  try {
    const { studentId, courseCode, major, weekday, startTime, teacherName } = req.body;

    if (!studentId || !Number.isFinite(Number(studentId))) {
      return res.status(400).json({ error: 'Invalid student ID in request body.' });
    }

    if (!major || typeof major !== 'string' || major.trim().length === 0) {
      return res.status(400).json({ error: 'Major is required.' });
    }
     if(!courseCode || typeof courseCode !== 'string' || courseCode.trim().length === 0) {
      return res.status(400).json({ error: 'Course code is required.' });
    }
    if (!weekday || typeof weekday !== 'string' || weekday.trim().length === 0) {
      return res.status(400).json({ error: 'Weekday is required.' });
    }

    if (!startTime || typeof startTime !== 'string' || startTime.trim().length === 0) {
      return res.status(400).json({ error: 'Start time is required.' });
    }
    if(!teacherName || typeof teacherName !== 'string' || teacherName.trim().length === 0) {
      return res.status(400).json({ error: 'Teacher name is required.' });
    }

    const id = Number(studentId);
    const pool = getPool();

    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available.' });
    }

    // Normalize startTime to ensure it has leading zero if needed (e.g., "9:00" -> "09:00")
    let normalizedStartTime = startTime.trim();
    // If time doesn't have leading zero, add it (e.g., "9:00" -> "09:00")
    if (normalizedStartTime.match(/^\d:\d{2}$/)) {
      normalizedStartTime = '0' + normalizedStartTime;
    }
    // Validate format is HH:MM
    if (!/^\d{2}:\d{2}$/.test(normalizedStartTime)) {
      return res.status(400).json({ error: 'Invalid start time format. Expected HH:MM (e.g., "09:00" or "14:30").' });
    }

    // Validate that the course exists and matches the provided major, weekday, and time
    const { rows } = await pool.query(
      `SELECT ta.course_code, ta.course_title, ta.weekday, 
              to_char(ta.start_time, 'HH24:MI') AS start_time, 
              to_char(ta.end_time, 'HH24:MI') AS end_time, 
              ta.major_focus, ta.classroom_id, ta.teacher_id,
              sa.display_name AS teacher_name
       FROM teaching_assignments ta
       LEFT JOIN staff_accounts sa ON ta.teacher_id = sa.id
       WHERE UPPER(ta.course_code) = UPPER($1) 
         AND LOWER(TRIM(ta.weekday)) = LOWER(TRIM($2)) 
         AND to_char(ta.start_time, 'HH24:MI') = $3`,
      [courseCode.trim(), weekday.trim(), normalizedStartTime]
    );

    if (rows.length === 0) {
      // Try to find the course with just courseCode to provide better error message
      const { rows: courseRows } = await pool.query(
        `SELECT ta.course_code, ta.weekday, to_char(ta.start_time, 'HH24:MI') AS start_time
         FROM teaching_assignments ta
         WHERE UPPER(ta.course_code) = UPPER($1)`,
        [courseCode.trim()]
      );
      
      if (courseRows.length === 0) {
        return res.status(404).json({ 
          error: `Course ${courseCode} not found in the system.` 
        });
      }
      
      // Course exists but doesn't match the provided weekday/time
      const availableSlots = courseRows.map((r: any) => ({
        weekday: r.weekday,
        startTime: r.start_time
      }));
      
      return res.status(404).json({ 
        error: `Course ${courseCode} not found with weekday "${weekday}" and start time "${startTime}".`,
        availableSlots: availableSlots
      });
    }

    const course = rows[0];

    // Check if registration period is still open
    const currentSemester = await getCurrentSemester();
    const { getRegistrationStatus } = await import('../services/systemService.js');
    const registrationStatus = await getRegistrationStatus(currentSemester);
    
    if (!registrationStatus.open) {
      return res.status(403).json({ 
        error: registrationStatus.message || 'Registration is not available at this time.' 
      });
    }

    // Hard stop: prevent agents from re-validating courses the student already confirmed
    const { rows: existingRoster } = await pool.query(
      `SELECT tr.id,
              to_char(ta.start_time, 'HH24:MI') AS start_time,
              ta.weekday
       FROM teacher_rosters tr
       LEFT JOIN teaching_assignments ta
         ON ta.course_code = tr.course_code
        AND ta.teacher_id = tr.teacher_id
       WHERE tr.student_id = $1
         AND tr.course_code = $2
       LIMIT 1`,
      [id, courseCode.trim()]
    );

    if (existingRoster.length > 0) {
      const slot = existingRoster[0];
      const existingSummary = slot?.weekday && slot?.start_time
        ? `${slot.weekday} at ${slot.start_time}`
        : 'an earlier confirmed slot';
      return res.status(409).json({
        error: `Student already registered for ${course.course_title} (${course.course_code}) on ${existingSummary}.`
      });
    }

    const { rows: existingTimetable } = await pool.query(
      `SELECT id
       FROM timetables
       WHERE student_id = $1
         AND LOWER(TRIM(subject)) = LOWER(TRIM($2))
         AND to_char(start_time, 'HH24:MI') = $3
         AND LOWER(TRIM(weekday)) = LOWER(TRIM($4))
       LIMIT 1`,
      [id, course.course_title, course.start_time, course.weekday]
    );

    if (existingTimetable.length > 0) {
      return res.status(409).json({
        error: `Student already has ${course.course_title} scheduled on ${course.weekday} at ${course.start_time}.`
      });
    }

    // Validate major matches
    if (course.major_focus?.trim().toLowerCase() !== major.trim().toLowerCase()) {
      return res.status(400).json({ 
        error: `Major mismatch. Expected: ${course.major_focus}, Provided: ${major}` 
      });
    }

    // Register the student for the course
    try {
      const enrollment = await registerStudentForClassroom(
        id,
        course.classroom_id,
        courseCode.trim(),
        course.weekday,
        course.start_time
      );

      return res.status(200).json({
        message: 'Student successfully registered for the course.',
        enrollment: {
          id: enrollment.id,
          studentId: enrollment.studentId,
          classroomId: enrollment.classroomId,
          status: enrollment.status,
          registeredAt: enrollment.registeredAt
        },
        course: {
          courseCode: course.course_code,
          courseTitle: course.course_title,
          majorFocus: course.major_focus,
          weekday: course.weekday,
          startTime: course.start_time,
          endTime: course.end_time,
          teacherName: course.teacher_name,
          classroomId: course.classroom_id,
          startTimeSingapore: formatTimeToSingapore(course.start_time),
          endTimeSingapore: formatTimeToSingapore(course.end_time)
        },
        generatedAtSingapore: formatDateTimeToSingapore(new Date().toISOString())
      });
    } catch (registrationError: any) {
      // If registration fails (e.g., schedule conflict), return the error
      const errorMessage = registrationError?.message || 'Failed to register student for course.';
      console.error('[Agent] Registration error:', registrationError);

      if (errorMessage.includes('SCHEDULE_CONFLICT') || errorMessage.includes('already registered')) {
        return res.status(409).json({ error: errorMessage });
      }

      return res.status(400).json({ error: errorMessage });
    }
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : 'Unable to register for this course right now.';
    console.error('[Agent] Error registering for course:', error);

    if (message.startsWith('SCHEDULE_CONFLICT') || message.includes('You are already registered')) {
      return res.status(409).json({ error: message });
    }

    return res.status(400).json({ error: message });
  }
});

export default router;

