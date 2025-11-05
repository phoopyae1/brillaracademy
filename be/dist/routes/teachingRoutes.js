import { Router } from 'express';
import { z } from 'zod';
import { requireStaff } from '../middleware/requireStaff.js';
import { assignTeacherToClassroom, listTeachingAssignments, listTeachingAssignmentsForTeacher, buildTeacherDashboard, listTeacherRosters } from '../services/teachingService.js';
import { recordStudentGrade } from '../services/academicService.js';
import { findStaffById } from '../services/staffService.js';
import { listStudents } from '../services/studentService.js';
import { getPool } from '../db/pool.js';
import { AVAILABLE_MAJORS } from '../utils/majors.js';
const router = Router();
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const assignmentSchema = z.object({
    teacherId: z.coerce.number().int().positive(),
    classroomId: z.coerce.number().int().positive(),
    courseCode: z.string().min(2),
    courseTitle: z.string().min(2),
    weekday: z.enum(weekdays),
    startTime: z.string().regex(/^[0-2]\d:[0-5]\d$/, 'Use HH:MM 24-hour time format.'),
    endTime: z.string().regex(/^[0-2]\d:[0-5]\d$/, 'Use HH:MM 24-hour time format.'),
    studentGroup: z.string().min(2).optional(),
    majorFocus: z.enum([...AVAILABLE_MAJORS]),
    semester: z.string().min(4).optional()
});
const gradeSchema = z.object({
    studentId: z.coerce.number().int().positive(),
    courseCode: z.string().min(2),
    courseTitle: z.string().min(2),
    semester: z.string().min(4),
    grade: z.string().min(1),
    credits: z.coerce.number().positive()
});
router.get('/dashboard', requireStaff(['TEACHER', 'IT_ADMIN']), async (req, res) => {
    const teacherIdParam = req.query.teacherId;
    const teacherId = req.staff?.role === 'IT_ADMIN' && typeof teacherIdParam === 'string'
        ? Number(teacherIdParam)
        : req.staff?.id;
    if (!teacherId || !Number.isFinite(teacherId)) {
        return res.status(400).json({ error: 'A valid teacher id is required to load this dashboard.' });
    }
    const dashboard = await buildTeacherDashboard(teacherId);
    if (!dashboard) {
        return res.status(404).json({ error: 'Teacher dashboard not found.' });
    }
    res.json({ dashboard });
});
router.get('/assignments', requireStaff(['IT_ADMIN', 'TEACHER']), async (req, res) => {
    const teacherIdParam = req.query.teacherId;
    if (req.staff?.role === 'TEACHER') {
        const assignments = await listTeachingAssignmentsForTeacher(req.staff.id);
        return res.json({ assignments });
    }
    if (typeof teacherIdParam === 'string') {
        const teacherId = Number(teacherIdParam);
        if (!Number.isFinite(teacherId)) {
            return res.status(400).json({ error: 'Invalid teacher id.' });
        }
        const assignments = await listTeachingAssignmentsForTeacher(teacherId);
        return res.json({ assignments });
    }
    const assignments = await listTeachingAssignments();
    res.json({ assignments });
});
router.post('/assignments', requireStaff(['IT_ADMIN']), async (req, res) => {
    const parseResult = assignmentSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid assignment payload.', details: parseResult.error.flatten() });
    }
    const teacher = await findStaffById(parseResult.data.teacherId);
    if (!teacher) {
        return res.status(400).json({
            error: `Teacher with ID ${parseResult.data.teacherId} not found. Please verify the teacher exists in the system.`
        });
    }
    if (teacher.role !== 'TEACHER') {
        return res.status(400).json({
            error: `Account "${teacher.displayName}" (ID: ${teacher.id}) has role "${teacher.role}", not "TEACHER". Assignments must target an active teacher account.`
        });
    }
    try {
        const assignment = await assignTeacherToClassroom(parseResult.data, req.staff?.id);
        res.status(201).json({ assignment });
    }
    catch (error) {
        console.error('Failed to assign teacher to classroom', error);
        const message = error?.message || 'Unable to assign classroom right now.';
        const statusCode = message.includes('already booked') || message.includes('conflicts') ? 409 : 500;
        res.status(statusCode).json({ error: message });
    }
});
router.post('/grades', requireStaff(['TEACHER']), async (req, res) => {
    const parseResult = gradeSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid grade payload.', details: parseResult.error.flatten() });
    }
    try {
        const record = await recordStudentGrade(parseResult.data, req.staff.id);
        res.status(201).json({ grade: record });
    }
    catch (error) {
        console.error('Failed to record grade', error);
        res.status(500).json({ error: 'Unable to save grade right now.' });
    }
});
router.get('/assignments/:id/enrollment-status', requireStaff(['IT_ADMIN', 'TEACHER']), async (req, res) => {
    const assignmentId = Number(req.params.id);
    if (!Number.isFinite(assignmentId)) {
        return res.status(400).json({ error: 'Invalid assignment id.' });
    }
    try {
        const pool = getPool();
        if (!pool) {
            return res.status(503).json({ error: 'Database not available. Cannot check enrollment status.' });
        }
        // Get the assignment
        const assignmentResult = await pool.query(`SELECT id, teacher_id, course_code, course_title, major_focus
       FROM teaching_assignments
       WHERE id = $1`, [assignmentId]);
        if (assignmentResult.rows.length === 0) {
            return res.status(404).json({ error: `Assignment with ID ${assignmentId} not found.` });
        }
        const assignment = assignmentResult.rows[0];
        const majorFocus = assignment.major_focus;
        // Get all students with matching major
        const allStudents = await listStudents();
        const normalizedMajorFocus = majorFocus?.trim().toLowerCase() ?? '';
        const studentsWithMatchingMajor = allStudents.filter((student) => {
            const studentMajor = student.primaryInterest?.trim().toLowerCase() ?? '';
            return studentMajor === normalizedMajorFocus;
        });
        // Get actually enrolled students from teacher roster
        const enrolledStudents = await listTeacherRosters(assignment.teacher_id);
        const enrolledForThisCourse = enrolledStudents.filter((roster) => roster.courseCode === assignment.course_code && roster.status === 'enrolled');
        // Get student details for enrolled students
        const enrolledStudentIds = enrolledForThisCourse.map((e) => e.studentId);
        const enrolledStudentDetails = allStudents.filter((s) => enrolledStudentIds.includes(s.id));
        // Find students who should be enrolled but aren't
        const shouldBeEnrolled = studentsWithMatchingMajor.filter((student) => !enrolledStudentIds.includes(student.id));
        res.json({
            assignment: {
                id: assignment.id,
                courseCode: assignment.course_code,
                courseTitle: assignment.course_title,
                majorFocus: majorFocus
            },
            matchingStudents: studentsWithMatchingMajor.map((s) => ({
                id: s.id,
                name: `${s.firstName} ${s.lastName}`,
                email: s.email,
                primaryInterest: s.primaryInterest
            })),
            enrolledStudents: enrolledStudentDetails.map((s) => ({
                id: s.id,
                name: `${s.firstName} ${s.lastName}`,
                email: s.email,
                primaryInterest: s.primaryInterest
            })),
            missingEnrollments: shouldBeEnrolled.map((s) => ({
                id: s.id,
                name: `${s.firstName} ${s.lastName}`,
                email: s.email,
                primaryInterest: s.primaryInterest,
                reason: `Student has matching major "${s.primaryInterest}" but is not enrolled in this course. Enrollment happens automatically when assignments are created.`
            })),
            summary: {
                totalStudentsWithMatchingMajor: studentsWithMatchingMajor.length,
                enrolledCount: enrolledStudentDetails.length,
                missingCount: shouldBeEnrolled.length
            }
        });
    }
    catch (error) {
        console.error('Failed to check enrollment status', error);
        const message = error instanceof Error ? error.message : 'Unable to check enrollment status right now.';
        res.status(500).json({ error: message });
    }
});
export default router;
//# sourceMappingURL=teachingRoutes.js.map