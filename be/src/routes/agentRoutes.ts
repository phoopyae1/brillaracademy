import { Router } from 'express';
import { getPool } from '../db/pool.js';
import { fetchStudentById } from '../services/studentService.js';
import { listAnnouncements } from '../services/announcementService.js';
import { listStudentAssignments } from '../services/assignmentService.js';
import { listStudentGrades } from '../services/academicService.js';
import { registerStudentForClassroom } from '../services/classroomService.js';
import { requireStudent, type AuthenticatedStudentRequest } from '../middleware/requireStudent.js';

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

    // Fetch class registrations from database with staff name who confirmed
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
        to_char(cr.registered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "registeredAt"
       FROM class_registrations cr
       LEFT JOIN staff_accounts sa ON cr.confirmed_by = sa.id
       WHERE cr.student_id = $1
       ORDER BY cr.registered_at DESC`,
      [id]
    );

    // Return flat response - direct array of registration objects (no nesting)
    // confirmedBy: null = pending, has value = confirmed (staff ID)
    return res.json(
      rows.map((row: any) => ({
        id: row.id,
        studentId: row.studentId,
        className: row.className,
        instructor: row.instructor,
        status: row.status, // e.g., 'registered', 'waitlisted'
        isConfirmed: row.confirmedBy !== null, // true if confirmed, false if pending
        confirmedBy: row.confirmedBy, // staff ID who confirmed, or null if pending
        confirmedByName: row.confirmedByName || null, // staff name who confirmed, or null if pending
        semester: row.semester,
        credits: row.credits,
        registeredAt: row.registeredAt
      }))
    );
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

    // Return flat response - direct array of grade objects (no nesting)
    return res.json(
      rows.map((row: any) => ({
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
      }))
    );
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
       WHERE ta.course_code = $1 
         AND LOWER(TRIM(ta.weekday)) = LOWER(TRIM($2)) 
         AND to_char(ta.start_time, 'HH24:MI') = $3`,
      [courseCode.trim(), weekday.trim(), normalizedStartTime]
    );

    if (rows.length === 0) {
      // Try to find the course with just courseCode to provide better error message
      const { rows: courseRows } = await pool.query(
        `SELECT ta.course_code, ta.weekday, to_char(ta.start_time, 'HH24:MI') AS start_time
         FROM teaching_assignments ta
         WHERE ta.course_code = $1`,
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
    
    // Validate major matches
    if (course.major_focus?.trim().toLowerCase() !== major.trim().toLowerCase()) {
      return res.status(400).json({ 
        error: `Major mismatch. Expected: ${course.major_focus}, Provided: ${major}` 
      });
    }

    // Register student for the course with specific weekday and time
    // This ensures conflict checking uses the correct time slot, not just any slot for the course
    const enrollment = await registerStudentForClassroom(
      id,
      course.classroom_id,
      courseCode.trim(),
      course.weekday, // Pass the specific weekday we're registering for
      course.start_time // Pass the specific start time we're registering for
    );

    // Return flat response - direct object (no nesting)
    return res.status(201).json({
      id: enrollment.id,
      studentId: enrollment.studentId,
      classroomId: enrollment.classroomId,
      courseCode: courseCode.trim(),
      courseTitle: course.course_title,
      major: course.major_focus,
      weekday: course.weekday,
      startTime: course.start_time,
      endTime: course.end_time,
      teacherId: course.teacher_id,
      teacherName: course.teacher_name || null,
      status: enrollment.status,
      registeredAt: enrollment.registeredAt
    });
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

