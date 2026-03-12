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

    // Separate registrations into current semester and historical (past semesters)
    const currentRegistrations = detailedRegistrations.filter(reg => {
      const regSemester = reg.semester || currentSemester;
      return regSemester === currentSemester;
    });
    
    const historicalRegistrations = detailedRegistrations.filter(reg => {
      const regSemester = reg.semester || currentSemester;
      return regSemester !== currentSemester;
    });

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
      registrations: detailedRegistrations, // All registrations (for backward compatibility)
      currentRegistrations: currentRegistrations, // Current semester registrations
      historicalRegistrations: historicalRegistrations // Past semester registrations
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
    const { studentId, courseCode, courseName, major, weekday, startTime, teacherName } = req.body;

    if (!studentId || !Number.isFinite(Number(studentId))) {
      return res.status(400).json({ error: 'Invalid student ID in request body.' });
    }

    // Require either courseCode or courseName (at least one)
    const hasCourseCode = courseCode && typeof courseCode === 'string' && courseCode.trim().length > 0;
    const hasCourseName = courseName && typeof courseName === 'string' && courseName.trim().length > 0;
    
    if (!hasCourseCode && !hasCourseName) {
      return res.status(400).json({ error: 'Either course code or course name is required.' });
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

    // Get current semester first to filter courses
    const currentSemester = await getCurrentSemester();
    
    // Check if registration window is open before allowing registration
    const regStatus = await getRegistrationStatus(currentSemester);
    if (!regStatus.open) {
      return res.status(403).json({ 
        error: regStatus.message || 'Registration is not available at this time.' 
      });
    }
    
    // Validate that the course exists and matches the provided weekday and time
    // IMPORTANT: Only allow registration for courses in the CURRENT SEMESTER
    // Search by course code OR course name, but MUST be in current semester
    let courseQuery: string;
    let courseParams: any[];
    
    if (hasCourseCode) {
      courseQuery = `SELECT ta.course_code, ta.course_title, ta.weekday, 
              to_char(ta.start_time, 'HH24:MI') AS start_time, 
              to_char(ta.end_time, 'HH24:MI') AS end_time, 
              ta.major_focus, ta.classroom_id, ta.teacher_id,
                            ta.semester,
              sa.display_name AS teacher_name
       FROM teaching_assignments ta
       LEFT JOIN staff_accounts sa ON ta.teacher_id = sa.id
       WHERE UPPER(ta.course_code) = UPPER($1) 
         AND LOWER(TRIM(ta.weekday)) = LOWER(TRIM($2)) 
                       AND to_char(ta.start_time, 'HH24:MI') = $3
                       AND ta.semester = $4`;
      courseParams = [courseCode.trim(), weekday.trim(), normalizedStartTime, currentSemester];
    } else {
      courseQuery = `SELECT ta.course_code, ta.course_title, ta.weekday, 
                            to_char(ta.start_time, 'HH24:MI') AS start_time, 
                            to_char(ta.end_time, 'HH24:MI') AS end_time, 
                            ta.major_focus, ta.classroom_id, ta.teacher_id,
                            ta.semester,
                            sa.display_name AS teacher_name
                     FROM teaching_assignments ta
                     LEFT JOIN staff_accounts sa ON ta.teacher_id = sa.id
                     WHERE LOWER(TRIM(ta.course_title)) = LOWER(TRIM($1)) 
                       AND LOWER(TRIM(ta.weekday)) = LOWER(TRIM($2)) 
                       AND to_char(ta.start_time, 'HH24:MI') = $3
                       AND ta.semester = $4`;
      courseParams = [courseName.trim(), weekday.trim(), normalizedStartTime, currentSemester];
    }
    
    const { rows } = await pool.query(courseQuery, courseParams);

    if (rows.length === 0) {
      // Try to find the course to provide better error message
      // Check if course exists in current semester first
      let lookupQuery: string;
      let lookupParams: any[];
      let searchTerm: string;
      
      if (hasCourseCode) {
        lookupQuery = `SELECT ta.course_code, ta.course_title, ta.weekday, to_char(ta.start_time, 'HH24:MI') AS start_time, ta.semester
         FROM teaching_assignments ta
                       WHERE UPPER(ta.course_code) = UPPER($1) AND ta.semester = $2`;
        lookupParams = [courseCode.trim(), currentSemester];
        searchTerm = courseCode.trim();
      } else {
        lookupQuery = `SELECT ta.course_code, ta.course_title, ta.weekday, to_char(ta.start_time, 'HH24:MI') AS start_time, ta.semester
                       FROM teaching_assignments ta
                       WHERE LOWER(TRIM(ta.course_title)) = LOWER(TRIM($1)) AND ta.semester = $2`;
        lookupParams = [courseName.trim(), currentSemester];
        searchTerm = courseName.trim();
      }
      
      const { rows: courseRows } = await pool.query(lookupQuery, lookupParams);
      
      if (courseRows.length === 0) {
        // Check if course exists in other semesters
        let otherSemesterQuery: string;
        let otherSemesterParams: any[];
        
        if (hasCourseCode) {
          otherSemesterQuery = `SELECT DISTINCT ta.semester FROM teaching_assignments ta WHERE UPPER(ta.course_code) = UPPER($1)`;
          otherSemesterParams = [courseCode.trim()];
        } else {
          otherSemesterQuery = `SELECT DISTINCT ta.semester FROM teaching_assignments ta WHERE LOWER(TRIM(ta.course_title)) = LOWER(TRIM($1))`;
          otherSemesterParams = [courseName.trim()];
        }
        
        const { rows: otherSemesterRows } = await pool.query(otherSemesterQuery, otherSemesterParams);
        
        if (otherSemesterRows.length > 0) {
          const otherSemesters = otherSemesterRows.map((r: any) => r.semester).join(', ');
        return res.status(404).json({ 
            error: `Course "${searchTerm}" is not available for the current semester (${currentSemester}). This course is available in semester(s): ${otherSemesters}.` 
          });
        }
        
        return res.status(404).json({ 
          error: `Course "${searchTerm}" not found in the system.` 
        });
      }
      
      // Course exists in current semester but doesn't match the provided weekday/time
      const availableSlots = courseRows.map((r: any) => ({
        weekday: r.weekday,
        startTime: r.start_time
      }));
      
      return res.status(404).json({ 
        error: `Course "${searchTerm}" not found with weekday "${weekday}" and start time "${startTime}" for semester ${currentSemester}.`,
        availableSlots: availableSlots
      });
    }

    const course = rows[0];
    
    // Double-check: Ensure the course is for the current semester (safety check)
    if (course.semester !== currentSemester) {
      return res.status(403).json({ 
        error: `Course "${course.course_title}" (${course.course_code}) is not available for the current semester (${currentSemester}). This course is assigned to semester ${course.semester}.` 
      });
    }

    // Check if registration period is still open (already checked above, but double-check before enrollment)
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
      [id, course.course_code] // Use the course code from the found course
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

    // Register the student for the course
    try {
      const enrollment = await registerStudentForClassroom(
        id,
        course.classroom_id,
        course.course_code, // Use the course code from the found course
        course.weekday,
        course.start_time
      );

      // Ensure class_registrations entry exists (registerStudentForClassroom should create it, but verify)
      try {
        const semester = currentSemester || '1/2026';
        
        // Check if class_registrations entry already exists
        const existingReg = await pool.query(
          `SELECT id FROM class_registrations 
           WHERE student_id = $1 AND LOWER(TRIM(class_name)) = LOWER(TRIM($2))`,
          [id, course.course_title]
        );

        if (existingReg.rows.length === 0) {
          // Get credits (default to 3 if not found)
          let credits = 3;
          try {
            const { getCourseMetadata } = await import('../utils/majors.js');
            const metadata = getCourseMetadata(course.course_title);
            if (metadata?.credits) {
              credits = metadata.credits;
            }
          } catch (error) {
            console.warn('[Agent] Could not get course metadata for credits', error);
          }

          // Insert into class_registrations
          await pool.query(
            `INSERT INTO class_registrations 
             (student_id, class_name, instructor, status, semester, credits, confirmed_by, registered_at)
             VALUES ($1, $2, $3, 'registered', $4, $5, NULL, NOW())`,
            [id, course.course_title, course.teacher_name || 'TBA', semester, credits]
          );
          console.log(`[Agent] Created class_registrations entry for student ${id}: ${course.course_title}`);
        } else {
          console.log(`[Agent] Class registration already exists for student ${id}: ${course.course_title}`);
        }
      } catch (regError) {
        // Log error but don't fail the registration
        console.error('[Agent] Failed to ensure class_registrations entry:', regError);
      }

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

/**
 * POST /api/agent/available-courses
 * Get available courses for a specific major
 * Requires authentication via Bearer token
 * Request body: { studentId: number }
 * Returns flat response with all available courses for the student's major in current semester
 */
router.post('/available-courses', requireStudent(), async (req: AuthenticatedStudentRequest, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId || !Number.isFinite(Number(studentId))) {
      return res.status(400).json({ error: 'Invalid student ID in request body.' });
    }

    const pool = getPool();
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available.' });
    }

    // Get current semester
    const currentSemester = await getCurrentSemester();
    if (!currentSemester) {
      return res.status(500).json({ error: 'Current semester not set in system.' });
    }

    // Fetch student's major from their profile
    const student = await fetchStudentById(Number(studentId));
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const targetMajor = student.primaryInterest || null;
    if (!targetMajor) {
      return res.status(400).json({ error: 'Student has no major assigned.' });
    }

    // Normalize major name (same logic as classroomService)
    function normalizeMajorName(raw: string | null | undefined): string {
      const value = (raw ?? '').trim().toLowerCase();
      if (!value) return '';
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

    const normalizedMajor = normalizeMajorName(targetMajor);

    // Query available courses for this major in current semester
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (ta.course_code, ta.weekday, ta.start_time, ta.teacher_id)
              ta.course_code AS "courseCode",
              ta.course_title AS "courseTitle",
              ta.major_focus AS "majorFocus",
              ta.weekday,
              to_char(ta.start_time, 'HH24:MI') AS "startTime",
              to_char(ta.end_time, 'HH24:MI') AS "endTime",
              ta.classroom_id AS "classroomId",
              ta.teacher_id AS "teacherId",
              sa.display_name AS "teacherName",
              c.name AS "classroomName",
              c.location AS "classroomLocation",
              c.capacity,
              ta.semester
       FROM teaching_assignments ta
       LEFT JOIN staff_accounts sa ON ta.teacher_id = sa.id
       LEFT JOIN classrooms c ON ta.classroom_id = c.id
       WHERE ta.semester = $1
         AND ta.semester IS NOT NULL
         AND TRIM(ta.semester) = TRIM($1)
         AND (
           LOWER(TRIM(ta.major_focus)) = LOWER(TRIM($2))
           OR LOWER(TRIM(ta.major_focus)) LIKE LOWER(TRIM($2)) || '%'
           OR LOWER(TRIM($2)) LIKE LOWER(TRIM(ta.major_focus)) || '%'
         )
       ORDER BY ta.course_code, ta.weekday, ta.start_time, ta.teacher_id, ta.id ASC`,
      [currentSemester, normalizedMajor]
    );

    // Additional filtering to ensure major matches (case-insensitive, flexible matching)
    const filteredCourses = rows.filter(row => {
      const courseMajor = normalizeMajorName(row.majorFocus);
      return courseMajor === normalizedMajor ||
        courseMajor.includes(normalizedMajor) ||
        normalizedMajor.includes(courseMajor);
    });

    // Get enrollment counts for each course
    const enrollmentCounts = new Map<string, number>();
    if (filteredCourses.length > 0) {
      try {
        // Build a list of course codes to query
        const courseCodes = [...new Set(filteredCourses.map(c => c.courseCode))];
        
        // Query enrollment counts for all courses matching the major and semester
        const { rows: countRows } = await pool.query(
          `SELECT ta.course_code, ta.weekday, to_char(ta.start_time, 'HH24:MI') AS start_time, 
                  COUNT(DISTINCT t.student_id)::int AS student_count
           FROM teaching_assignments ta
           LEFT JOIN timetables t ON 
             LOWER(TRIM(t.subject)) = LOWER(TRIM(ta.course_title))
             AND t.weekday = ta.weekday
             AND to_char(t.start_time, 'HH24:MI') = to_char(ta.start_time, 'HH24:MI')
             AND to_char(t.end_time, 'HH24:MI') = to_char(ta.end_time, 'HH24:MI')
             AND t.location::TEXT = ta.classroom_id::TEXT
           WHERE ta.semester = $1
             AND ta.course_code = ANY($2::text[])
           GROUP BY ta.course_code, ta.weekday, ta.start_time`,
          [currentSemester, courseCodes]
        );

        for (const row of countRows) {
          const key = `${row.course_code}|${row.weekday}|${row.start_time}`;
          enrollmentCounts.set(key, Number(row.student_count || 0));
        }
      } catch (error) {
        console.error('[Agent] Error fetching enrollment counts:', error);
      }
    }

    // Format courses with enrollment info
    const courses = filteredCourses.map(row => {
      const enrollmentKey = `${row.courseCode}|${row.weekday}|${row.startTime}`;
      const enrolledCount = enrollmentCounts.get(enrollmentKey) || 0;
      const capacity = row.capacity || 0;
      const availableSeats = Math.max(capacity - enrolledCount, 0);

      return {
        courseCode: row.courseCode,
        courseTitle: row.courseTitle,
        majorFocus: row.majorFocus,
        weekday: row.weekday,
        startTime: row.startTime,
        endTime: row.endTime,
        startTimeSingapore: formatTimeToSingapore(row.startTime),
        endTimeSingapore: formatTimeToSingapore(row.endTime),
        teacherId: row.teacherId,
        teacherName: row.teacherName || null,
        classroomId: row.classroomId,
        classroomName: row.classroomName || null,
        classroomLocation: row.classroomLocation || null,
        capacity: capacity,
        enrolledCount: enrolledCount,
        availableSeats: availableSeats,
        isFull: availableSeats === 0,
        semester: row.semester
      };
    });

    const generatedAt = formatDateTimeToSingapore(new Date().toISOString());
    const registrationStatus = await getRegistrationStatus(currentSemester);
    const semesterDate = await getSemesterDate(currentSemester);

    return res.json({
      generatedAtSingapore: generatedAt,
      currentSemester: currentSemester,
      major: targetMajor,
      registrationStatus: {
        open: registrationStatus.open,
        reason: registrationStatus.reason || null,
        message: registrationStatus.message || null,
        startDate: semesterDate?.startDate || null,
        endDate: semesterDate?.endDate || null
      },
      courses: courses,
      totalCourses: courses.length
    });
  } catch (error) {
    console.error('[Agent] Error fetching available courses:', error);
    return res.status(500).json({ error: 'Failed to fetch available courses.' });
  }
});

export default router;

