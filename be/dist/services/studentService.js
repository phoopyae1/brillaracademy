import bcrypt from 'bcryptjs';
import { getPool } from '../db/pool.js';
import { fallbackStudents, fallbackTimetables, fallbackSchedules, fallbackRegistrations, seededPasswordHash } from './fallbackData.js';
import { listExamAnnouncements } from './examService.js';
import { listStudentGrades, listStudentSemesterGpa, listRegistrationWindows, findCourseOffering } from './academicService.js';
import { listStudentFeePayments, recordFeePayment } from './financeService.js';
import { listClassroomEnrollmentsForStudent } from './classroomService.js';
import { listStudentAssignments } from './assignmentService.js';
import { getCourseMetadata, getSubjectsForMajor } from '../utils/majors.js';
import { getCurrentSemester } from './systemService.js';
let inMemoryStudents = [...fallbackStudents];
let inMemoryTimetables = [...fallbackTimetables];
let inMemorySchedules = [...fallbackSchedules];
let inMemoryRegistrations = [...fallbackRegistrations];
let inMemorySecrets = new Map(fallbackStudents.map((student) => [student.id, seededPasswordHash]));
let inMemorySubjectSelections = new Map(fallbackStudents
    .filter((student) => Array.isArray(student.selectedSubjects) && student.selectedSubjects.length)
    .map((student) => [
    student.id,
    {
        studentId: student.id,
        major: student.primaryInterest ?? null,
        subjects: [...(student.selectedSubjects ?? [])],
        createdAt: student.createdAt
    }
]));
let nextStudentId = fallbackStudents.length + 1;
let nextRegistrationId = fallbackRegistrations.length + 1;
function sanitizeSubjects(subjects) {
    if (!Array.isArray(subjects)) {
        return [];
    }
    const unique = new Set();
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
function normalizeStudent(row) {
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
function rememberSubjectSelection(student, subjects) {
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
function applySubjectSelection(student) {
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
export async function listStudents() {
    const pool = getPool();
    if (!pool) {
        return inMemoryStudents.map((student) => applySubjectSelection(student));
    }
    try {
        const { rows } = await pool.query(`SELECT id, first_name, last_name, email, role, primary_interest, created_at
       FROM students
       ORDER BY created_at DESC`);
        return rows.map(normalizeStudent).map((student) => {
            return applySubjectSelection(student);
        });
    }
    catch (error) {
        console.error('Failed to fetch students from database', error);
        return inMemoryStudents.map((student) => applySubjectSelection(student));
    }
}
export async function fetchStudentById(id) {
    if (!Number.isFinite(id)) {
        return null;
    }
    const pool = getPool();
    if (!pool) {
        const student = inMemoryStudents.find((item) => item.id === id) ?? null;
        return student ? applySubjectSelection(student) : null;
    }
    try {
        const { rows } = await pool.query(`SELECT id, first_name, last_name, email, role, primary_interest, created_at
       FROM students
       WHERE id = $1`, [id]);
        if (!rows.length) {
            return null;
        }
        return applySubjectSelection(normalizeStudent(rows[0]));
    }
    catch (error) {
        console.error('Failed to fetch student by id', error);
        return null;
    }
}
async function createCourseDataForStudent(studentId, subjects, pool) {
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
        const registration = {
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
        const timetableEntry = {
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
                const regResult = await pool.query(`INSERT INTO class_registrations (student_id, class_name, instructor, status, semester, credits, confirmed_by, registered_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           RETURNING id, student_id AS "studentId", class_name AS "className", instructor, status,
                     semester, credits, confirmed_by AS "confirmedBy",
                     to_char(registered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "registeredAt"`, [studentId, subject, metadata.instructor, 'registered', currentSemester, metadata.credits, null]);
                // Insert timetable
                await pool.query(`INSERT INTO timetables (student_id, weekday, start_time, end_time, subject, location)
           VALUES ($1, $2, $3, $4, $5, $6)`, [studentId, weekday, timeSlot.start, timeSlot.end, subject, location]);
                // Create fee
                const feeAmount = metadata.credits * 100; // 100 SGD per credit
                await pool.query(`INSERT INTO fee_payments (student_id, amount, description, status, due_date)
           VALUES ($1, $2, $3, $4, NOW() + INTERVAL '30 days')`, [studentId, feeAmount, `${subject} - Registration Fee`, 'pending']);
            }
            catch (error) {
                console.error(`Failed to create course data for ${subject}:`, error);
            }
        }
        else {
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
export async function createStudent(input) {
    const { firstName, lastName, email, password, role, primaryInterest, selectedSubjects } = input;
    const hashedPassword = bcrypt.hashSync(password, 10);
    const pool = getPool();
    const cleanedSubjects = sanitizeSubjects(selectedSubjects);
    if (!pool) {
        const student = {
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
        const { rows } = await pool.query(`INSERT INTO students (first_name, last_name, email, password_hash, role, primary_interest)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, first_name, last_name, email, role, primary_interest, created_at`, [firstName, lastName, email, hashedPassword, role ?? 'Student', primaryInterest]);
        const student = normalizeStudent(rows[0]);
        rememberSubjectSelection(student, cleanedSubjects);
        // Create course data for the student
        if (cleanedSubjects.length > 0) {
            await createCourseDataForStudent(student.id, cleanedSubjects, pool);
        }
        return applySubjectSelection({ ...student, selectedSubjects: cleanedSubjects });
    }
    catch (error) {
        console.error('Failed to create student', error);
        throw error;
    }
}
export async function authenticateStudent(email, password) {
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
        const { rows } = await pool.query(`SELECT id, first_name, last_name, email, role, primary_interest, created_at, password_hash
       FROM students
       WHERE email = $1`, [email]);
        if (!rows.length) {
            return null;
        }
        const [row] = rows;
        const passwordMatches = await bcrypt.compare(password, row.password_hash);
        if (!passwordMatches) {
            return null;
        }
        return applySubjectSelection(normalizeStudent(row));
    }
    catch (error) {
        console.error('Failed to authenticate student', error);
        return null;
    }
}
export async function fetchStudentDashboard(studentId) {
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
                const courseToMajorMap = new Map();
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
                        return majorSubjects.some(subject => course.courseTitle.toLowerCase().includes(subject.toLowerCase()) ||
                            course.courseCode.toLowerCase().includes(studentMajor.toLowerCase().substring(0, 4)));
                    });
                    return {
                        ...window,
                        courses: filteredCourses
                    };
                });
            }
            catch (error) {
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
            pool.query(`SELECT id, student_id AS "studentId", weekday, to_char(start_time, 'HH24:MI') AS "startTime",
                to_char(end_time, 'HH24:MI') AS "endTime", subject, location
         FROM timetables
         WHERE student_id = $1
         ORDER BY CASE weekday
           WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 ELSE 7 END,
           start_time ASC`, [studentId]),
            pool.query(`SELECT id, student_id AS "studentId", title, description,
                to_char(start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "startTime",
                to_char(end_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "endTime"
         FROM schedules
         WHERE student_id = $1
         ORDER BY start_time ASC`, [studentId]),
            pool.query(`SELECT id, student_id AS "studentId", class_name AS "className", instructor, status,
                semester, credits, confirmed_by AS "confirmedBy",
                to_char(registered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "registeredAt"
         FROM class_registrations
         WHERE student_id = $1
         ORDER BY registered_at DESC`, [studentId])
        ]);
        // Check if student has classroom enrollments but missing class registrations
        // This can happen if they enrolled before the auto-enrollment code was added
        if (registrationsResult.rows.length === 0 && pool) {
            try {
                const { listClassroomEnrollmentsForStudent } = await import('./classroomService.js');
                const { listTeachingAssignments } = await import('./teachingService.js');
                const { getCourseMetadata } = await import('../utils/majors.js');
                const { findStaffById } = await import('./staffService.js');
                const classroomEnrollments = await listClassroomEnrollmentsForStudent(studentId);
                const allAssignments = await listTeachingAssignments();
                const studentMajor = student.primaryInterest?.trim().toLowerCase() || '';
                if (classroomEnrollments.length > 0 && studentMajor) {
                    // Student has classroom enrollments but no class registrations
                    // Create missing class registrations for teaching assignments in their enrolled classrooms
                    for (const enrollment of classroomEnrollments) {
                        const classroomAssignments = allAssignments.filter(a => {
                            if (a.classroomId !== enrollment.classroomId)
                                return false;
                            // Check if assignment major matches student major (case-insensitive)
                            const assignmentMajor = a.majorFocus?.trim().toLowerCase() || '';
                            return assignmentMajor === studentMajor;
                        });
                        for (const assignment of classroomAssignments) {
                            // Check if registration already exists
                            const existingReg = await pool.query(`SELECT id FROM class_registrations WHERE student_id = $1 AND class_name = $2`, [studentId, assignment.courseTitle]);
                            if (existingReg.rows.length === 0) {
                                // Get teacher/instructor name
                                const teacher = await findStaffById(assignment.teacherId);
                                const instructor = teacher?.displayName ?? 'TBA';
                                // Get course metadata for credits
                                const metadata = getCourseMetadata(assignment.courseTitle);
                                const credits = metadata?.credits ?? 3;
                                const semester = assignment.semester || await getCurrentSemester();
                                // Create class registration
                                await pool.query(`INSERT INTO class_registrations (student_id, class_name, instructor, status, semester, credits, confirmed_by, registered_at)
                   VALUES ($1, $2, $3, 'registered', $4, $5, NULL, NOW())`, [studentId, assignment.courseTitle, instructor, semester, credits]);
                                // Create timetable entry if it doesn't exist
                                const existingTimetable = await pool.query(`SELECT id FROM timetables WHERE student_id = $1 AND subject = $2 AND weekday = $3`, [studentId, assignment.courseTitle, assignment.weekday]);
                                if (existingTimetable.rows.length === 0) {
                                    const classroomResult = await pool.query(`SELECT location FROM classrooms WHERE id = $1`, [enrollment.classroomId]);
                                    const location = classroomResult.rows[0]?.location || 'TBA';
                                    await pool.query(`INSERT INTO timetables (student_id, weekday, start_time, end_time, subject, location)
                     VALUES ($1, $2, $3, $4, $5, $6)`, [studentId, assignment.weekday, assignment.startTime, assignment.endTime, assignment.courseTitle, location]);
                                }
                                // Add to teacher roster
                                const existingRoster = await pool.query(`SELECT id FROM teacher_rosters WHERE teacher_id = $1 AND course_code = $2 AND student_id = $3`, [assignment.teacherId, assignment.courseCode, studentId]);
                                if (existingRoster.rows.length === 0) {
                                    await pool.query(`INSERT INTO teacher_rosters (teacher_id, course_code, course_title, student_id, status)
                     VALUES ($1, $2, $3, $4, 'enrolled')`, [assignment.teacherId, assignment.courseCode, assignment.courseTitle, studentId]);
                                }
                                console.log(`[StudentService] Auto-created missing class registration for student ${studentId}: ${assignment.courseTitle}`);
                            }
                        }
                    }
                    // Re-fetch registrations after creating missing ones
                    const newRegistrationsResult = await pool.query(`SELECT id, student_id AS "studentId", class_name AS "className", instructor, status,
                    semester, credits, confirmed_by AS "confirmedBy",
                    to_char(registered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "registeredAt"
             FROM class_registrations
             WHERE student_id = $1
             ORDER BY registered_at DESC`, [studentId]);
                    registrationsResult.rows = newRegistrationsResult.rows;
                }
            }
            catch (error) {
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
        const creditsBySemester = new Map();
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
                    const insuranceFeeAmount = 90;
                    const totalFeeAmount = tuitionFeeAmount + activityFeeAmount + insuranceFeeAmount;
                    // Build description with all fee components
                    const feeComponents = [];
                    if (tuitionFeeAmount > 0) {
                        feeComponents.push(`Tuition Fee - ${semester} (${totalCredits} credits)`);
                    }
                    feeComponents.push(`Activity Fee - ${semester}`);
                    feeComponents.push(`Insurance Fee - ${semester}`);
                    const combinedFeeDescription = feeComponents.join('; ');
                    // Check if a combined fee already exists for this student and semester
                    const existingCombinedFee = await pool.query(`SELECT id, amount, description FROM fee_payments 
             WHERE student_id = $1 
             AND description LIKE $2
             AND status = 'pending'`, [studentId, `%${semester}%`]);
                    if (existingCombinedFee.rows.length === 0) {
                        // Create new combined fee payment
                        await pool.query(`INSERT INTO fee_payments (student_id, amount, description, status, due_date)
               VALUES ($1, $2, $3, 'pending', $4)`, [studentId, totalFeeAmount, combinedFeeDescription, 'pending', feeDueDate.toISOString()]);
                        console.log(`[StudentService] Created combined fee payment: ${totalFeeAmount} SGD for ${semester} (Tuition: ${tuitionFeeAmount}, Activity: ${activityFeeAmount}, Insurance: ${insuranceFeeAmount})`);
                        updatedFees = await listStudentFeePayments(studentId);
                    }
                    else {
                        // Update existing combined fee if amount has changed
                        const existingFee = existingCombinedFee.rows[0];
                        const existingAmount = Number(existingFee.amount);
                        if (existingAmount !== totalFeeAmount) {
                            await pool.query(`UPDATE fee_payments SET amount = $1, description = $2 WHERE id = $3`, [totalFeeAmount, combinedFeeDescription, existingFee.id]);
                            console.log(`[StudentService] Updated combined fee payment from ${existingAmount} to ${totalFeeAmount} SGD for ${semester}`);
                            updatedFees = await listStudentFeePayments(studentId);
                        }
                        else {
                            console.log(`[StudentService] Combined fee payment already exists for ${semester} with correct amount: ${totalFeeAmount} SGD`);
                        }
                    }
                }
            }
            catch (error) {
                console.error('Failed to ensure semester and health insurance fees exist', error);
            }
        }
        // Filter registration windows courses by student's major
        const studentMajor = student.primaryInterest;
        let filteredRegistrationWindows = registrationWindows;
        if (studentMajor && pool) {
            try {
                // Get all teaching assignments to map courses to majors
                const assignmentsResult = await pool.query(`SELECT DISTINCT course_code, course_title, major_focus
           FROM teaching_assignments`);
                const courseToMajorMap = new Map();
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
                        return majorSubjects.some(subject => course.courseTitle.toLowerCase().includes(subject.toLowerCase()) ||
                            course.courseCode.toLowerCase().includes(studentMajor.toLowerCase().substring(0, 4)));
                    });
                    return {
                        ...window,
                        courses: filteredCourses
                    };
                });
            }
            catch (error) {
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
    }
    catch (error) {
        console.error('Failed to fetch student dashboard', error);
        return null;
    }
}
export async function registerStudentForSemesterCourse(studentId, semester, courseCode) {
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
    const alreadyRegistered = inMemoryRegistrations.some((registration) => registration.studentId === studentId &&
        registration.semester === offering.window.semester &&
        registration.className === offering.course.courseTitle);
    if (alreadyRegistered) {
        throw new Error('Student is already registered for this course.');
    }
    const pool = getPool();
    if (!pool) {
        const registration = {
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
        const { rows } = await pool.query(`INSERT INTO class_registrations (student_id, class_name, instructor, status, semester)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, student_id AS "studentId", class_name AS "className", instructor, status,
                 to_char(registered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "registeredAt",
                 semester`, [studentId, offering.course.courseTitle, offering.course.instructor, 'registered', offering.window.semester]);
        const [registration] = rows;
        return registration;
    }
    catch (error) {
        const duplicate = error?.code === '23505';
        if (duplicate) {
            throw new Error('Student is already registered for this course.');
        }
        console.error('Failed to register student for course', error);
        throw new Error('Unable to register for the selected course right now.');
    }
}
//# sourceMappingURL=studentService.js.map