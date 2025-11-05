import { getPool } from '../db/pool.js';
import { fallbackClassrooms, fallbackClassroomEnrollments } from './fallbackData.js';
let inMemoryClassrooms = [...fallbackClassrooms];
// Start next ID after the highest ID in fallback data (should be 217 after latest seed)
let nextClassroomId = Math.max(...fallbackClassrooms.map(c => c.id), 0) + 1;
console.log(`Initialized ${inMemoryClassrooms.length} classrooms in memory (max ID: ${nextClassroomId - 1})`);
let inMemoryClassroomEnrollments = [...fallbackClassroomEnrollments];
let nextClassroomEnrollmentId = fallbackClassroomEnrollments.length + 1;
function parseResourceList(row) {
    if (Array.isArray(row.resources)) {
        return row.resources;
    }
    if (typeof row.resources === 'string') {
        try {
            return JSON.parse(row.resources);
        }
        catch {
            return [];
        }
    }
    return [];
}
function extractFocusAreasFromResources(resources) {
    return resources
        .map((resource) => {
        if (typeof resource !== 'string') {
            return null;
        }
        const match = resource.match(/^\s*Major:\s*(.+)$/i);
        return match ? match[1].trim() : null;
    })
        .filter((value) => Boolean(value));
}
function normalizeClassroom(row) {
    const resources = parseResourceList(row);
    const focusSource = row.focus_majors ?? row.focusMajors ?? row.focusAreas;
    let focusAreas = [];
    if (Array.isArray(focusSource)) {
        focusAreas = focusSource.filter((item) => typeof item === 'string');
    }
    else if (typeof focusSource === 'string') {
        try {
            const parsed = JSON.parse(focusSource);
            if (Array.isArray(parsed)) {
                focusAreas = parsed.filter((item) => typeof item === 'string');
            }
        }
        catch {
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
function normalizeClassroomEnrollment(row) {
    return {
        id: row.id,
        studentId: row.student_id ?? row.studentId,
        classroomId: row.classroom_id ?? row.classroomId,
        status: (row.status ?? 'enrolled'),
        registeredAt: row.registered_at instanceof Date
            ? row.registered_at.toISOString()
            : row.registered_at ?? new Date().toISOString()
    };
}
export async function listClassrooms() {
    const pool = getPool();
    if (!pool) {
        console.log(`[ClassroomService] Using in-memory classrooms: ${inMemoryClassrooms.length} classrooms available`);
        return inMemoryClassrooms;
    }
    try {
        const { rows } = await pool.query(`SELECT id, name, location, capacity, resources, created_by, created_at
       FROM classrooms
       ORDER BY created_at DESC`);
        const classrooms = rows.map(normalizeClassroom);
        console.log(`[ClassroomService] Loaded ${classrooms.length} classrooms from database`);
        if (classrooms.length < 100) {
            console.warn(`[ClassroomService] WARNING: Only ${classrooms.length} classrooms found in database. Expected 217. Please re-seed the database with updated seed.sql`);
        }
        return classrooms;
    }
    catch (error) {
        console.error('[ClassroomService] Failed to list classrooms from database', error);
        console.log(`[ClassroomService] Falling back to in-memory classrooms: ${inMemoryClassrooms.length} available`);
        return inMemoryClassrooms;
    }
}
export async function getClassroomById(id) {
    if (!Number.isFinite(id)) {
        return null;
    }
    const pool = getPool();
    if (!pool) {
        return inMemoryClassrooms.find((room) => room.id === id) ?? null;
    }
    try {
        const { rows } = await pool.query(`SELECT id, name, location, capacity, resources, created_by, created_at
       FROM classrooms
       WHERE id = $1`, [id]);
        if (!rows.length) {
            return null;
        }
        return normalizeClassroom(rows[0]);
    }
    catch (error) {
        console.error('Failed to fetch classroom by id', error);
        return null;
    }
}
export async function createClassroom(input, createdBy) {
    const pool = getPool();
    const resources = input.resources ?? [];
    if (!pool) {
        const focusAreas = extractFocusAreasFromResources(resources);
        const classroom = {
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
        const { rows } = await pool.query(`INSERT INTO classrooms (name, location, capacity, resources, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, location, capacity, resources, created_by, created_at`, [input.name, input.location, input.capacity, JSON.stringify(resources), createdBy ?? null]);
        return normalizeClassroom(rows[0]);
    }
    catch (error) {
        console.error('Failed to create classroom', error);
        throw error;
    }
}
function buildEnrollmentCountsMap(enrollments) {
    const counts = new Map();
    for (const enrollment of enrollments) {
        counts.set(enrollment.classroomId, (counts.get(enrollment.classroomId) ?? 0) + 1);
    }
    return counts;
}
async function getClassroomEnrollmentCounts() {
    const pool = getPool();
    if (!pool) {
        return buildEnrollmentCountsMap(inMemoryClassroomEnrollments);
    }
    try {
        const { rows } = await pool.query(`SELECT classroom_id, COUNT(*)::int AS count
       FROM classroom_registrations
       GROUP BY classroom_id`);
        const counts = new Map();
        for (const row of rows) {
            counts.set(Number(row.classroom_id), Number(row.count));
        }
        return counts;
    }
    catch (error) {
        console.error('Failed to count classroom registrations', error);
        return new Map();
    }
}
async function getClassroomEnrollmentCount(classroomId) {
    const pool = getPool();
    if (!pool) {
        return inMemoryClassroomEnrollments.filter((item) => item.classroomId === classroomId).length;
    }
    try {
        const { rows } = await pool.query(`SELECT COUNT(*)::int AS count
       FROM classroom_registrations
       WHERE classroom_id = $1`, [classroomId]);
        return rows.length ? Number(rows[0].count) : 0;
    }
    catch (error) {
        console.error('Failed to count classroom registrations for classroom', error);
        return 0;
    }
}
async function findStudentClassroomEnrollment(studentId, classroomId) {
    const pool = getPool();
    if (!pool) {
        return (inMemoryClassroomEnrollments.find((item) => item.studentId === studentId && item.classroomId === classroomId) ?? null);
    }
    try {
        const { rows } = await pool.query(`SELECT id, classroom_id, student_id, status, registered_at
       FROM classroom_registrations
       WHERE classroom_id = $1 AND student_id = $2`, [classroomId, studentId]);
        if (!rows.length) {
            return null;
        }
        return normalizeClassroomEnrollment(rows[0]);
    }
    catch (error) {
        console.error('Failed to locate classroom enrollment', error);
        return null;
    }
}
export async function listClassroomEnrollmentsForStudent(studentId) {
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
        const { rows } = await pool.query(`SELECT id, classroom_id, student_id, status,
              to_char(registered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS registered_at
       FROM classroom_registrations
       WHERE student_id = $1
       ORDER BY registered_at DESC`, [studentId]);
        return rows.map(normalizeClassroomEnrollment);
    }
    catch (error) {
        console.error('Failed to list classroom enrollments for student', error);
        return [];
    }
}
/**
 * Get student's assigned courses from teacher rosters
 */
function normalizeMajorName(raw) {
    const value = (raw ?? '').trim().toLowerCase();
    if (!value)
        return '';
    // Common synonyms/abbreviations
    const aliases = {
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
async function getStudentAssignedCourses(studentId) {
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
                if (!studentMajor || !focus)
                    return false;
                return focus === studentMajor || focus.includes(studentMajor) || studentMajor.includes(focus);
            });
            // Return unique teacher/course combinations
            const uniqueCourses = new Map();
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
        }
        catch (error) {
            console.error('Failed to get student assigned courses (in-memory)', error);
            return [];
        }
    }
    try {
        const { rows } = await pool.query(`SELECT DISTINCT teacher_id, course_code, course_title
       FROM teacher_rosters
       WHERE student_id = $1 AND status = 'enrolled'`, [studentId]);
        return rows.map(row => ({
            teacherId: Number(row.teacher_id),
            courseCode: row.course_code,
            courseTitle: row.course_title
        }));
    }
    catch (error) {
        console.error('Failed to get student assigned courses', error);
        return [];
    }
}
export async function listClassroomsWithAvailability(studentId) {
    const pool = getPool();
    const [classrooms, counts] = await Promise.all([listClassrooms(), getClassroomEnrollmentCounts()]);
    // Fetch teaching assignments for all classrooms
    let classroomCourses = new Map();
    if (pool) {
        try {
            const { rows } = await pool.query(`SELECT ta.classroom_id, ta.teacher_id, ta.course_code, ta.course_title, ta.weekday, 
                to_char(ta.start_time, 'HH24:MI') AS start_time, 
                to_char(ta.end_time, 'HH24:MI') AS end_time, 
                ta.major_focus,
                sa.display_name AS teacher_name
         FROM teaching_assignments ta
         LEFT JOIN staff_accounts sa ON ta.teacher_id = sa.id
         ORDER BY ta.weekday, ta.start_time ASC`);
            console.log(`[ClassroomService] Found ${rows.length} teaching assignments for classrooms`);
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
                    teacherId: Number(row.teacher_id),
                    teacherName: row.teacher_name || null
                };
                classroomCourses.get(classroomId).push(courseData);
                console.log(`[ClassroomService] Added course "${courseData.courseTitle}" (${courseData.majorFocus}) by ${courseData.teacherName || 'Unknown'} to classroom ${classroomId}`);
            }
            // Log summary of courses per classroom
            for (const [classroomId, courses] of classroomCourses.entries()) {
                const classroom = classrooms.find(c => c.id === classroomId);
                if (!classroom) {
                    console.warn(`[ClassroomService] WARNING: Teaching assignments reference classroom_id ${classroomId} which does not exist in classrooms table!`);
                }
                console.log(`[ClassroomService] Classroom ${classroomId} (${classroom?.name || 'Unknown'}) has ${courses.length} course(s): ${courses.map(c => `${c.courseTitle} (${c.majorFocus}) by ${c.teacherName || 'Unknown'}`).join(', ')}`);
            }
        }
        catch (error) {
            console.error('Failed to fetch teaching assignments for classrooms', error);
        }
    }
    else {
        // For in-memory mode, get assignments from teaching service
        try {
            const { listTeachingAssignments } = await import('./teachingService.js');
            const { findStaffById } = await import('./staffService.js');
            const assignments = await listTeachingAssignments();
            for (const assignment of assignments) {
                const classroomId = assignment.classroomId;
                if (!classroomCourses.has(classroomId)) {
                    classroomCourses.set(classroomId, []);
                }
                // Get teacher name
                const teacher = await findStaffById(assignment.teacherId);
                const teacherName = teacher?.displayName || null;
                classroomCourses.get(classroomId).push({
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
        }
        catch (error) {
            console.error('Failed to fetch teaching assignments for classrooms (in-memory)', error);
        }
    }
    // If studentId is provided, show all classrooms with teaching assignments
    // but filter courses within each classroom to match the student's major
    let filteredClassrooms = classrooms;
    let studentMajor = null;
    let studentRegisteredCourses = new Set(); // Set of "course_code|teacher_id" the student is registered for
    if (studentId) {
        // Get student's major
        console.log(`[ClassroomService] Fetching student ${studentId}'s major...`);
        const pool = getPool();
        if (pool) {
            try {
                const { rows } = await pool.query(`SELECT primary_interest FROM students WHERE id = $1`, [studentId]);
                if (rows.length > 0) {
                    studentMajor = rows[0].primary_interest;
                    console.log(`[ClassroomService] Student ${studentId} major from database: "${studentMajor}"`);
                }
                else {
                    console.warn(`[ClassroomService] Student ${studentId} not found in database`);
                }
            }
            catch (error) {
                console.error('Failed to fetch student major', error);
            }
        }
        else {
            // In-memory mode
            try {
                const { listStudents } = await import('./studentService.js');
                const students = await listStudents();
                const student = students.find(s => s.id === studentId);
                studentMajor = student?.primaryInterest ?? null;
                console.log(`[ClassroomService] Student ${studentId} major from in-memory: "${studentMajor}"`);
            }
            catch (error) {
                console.error('Failed to fetch student major (in-memory)', error);
            }
        }
        // Filter by MAJOR and TEACHER (course major_focus), not classroom resources
        // A student sees classrooms that have teaching assignments where:
        // - The course's major_focus matches the student's major
        // - Any teacher can teach it (we show all teachers for that major)
        if (studentMajor) {
            const normalizedStudentMajor = normalizeMajorName(studentMajor);
            const matchingClassroomIds = new Set();
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
                    }
                    else {
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
                const allCourses = Array.from(classroomCourses.entries()).flatMap(([classroomId, courses]) => courses.map(c => ({ classroomId, classroomName: classrooms.find(cr => cr.id === classroomId)?.name, ...c })));
                console.warn(`[ClassroomService] ⚠ NO MATCHES: No teaching assignments found with major_focus matching "${studentMajor}" (normalized: "${normalizedStudentMajor}")`);
                console.warn(`[ClassroomService] All available teaching assignments:`);
                allCourses.forEach(c => {
                    console.warn(`  - "${c.courseTitle}" by ${c.teacherName || 'Unknown'} | major_focus: "${c.majorFocus}" | classroom: ${c.classroomId} (${c.classroomName})`);
                });
                console.warn(`[ClassroomService] Unique major_focus values in database: ${[...new Set(allCourses.map(c => c.majorFocus))].join(', ') || 'None'}`);
            }
            else {
                console.log(`[ClassroomService] Matching teaching assignments:`);
                matchingCourses.forEach(c => {
                    console.log(`  ✓ "${c.courseTitle}" by ${c.teacherName || 'Unknown'} | major_focus: "${c.majorFocus}" | ${c.weekday} ${c.startTime}-${c.endTime}`);
                });
            }
        }
        else {
            // If no major, show all classrooms with teaching assignments
            const classroomsWithAssignments = new Set(classroomCourses.keys());
            filteredClassrooms = classrooms.filter(room => classroomsWithAssignments.has(room.id));
            console.log(`[ClassroomService] Showing ${filteredClassrooms.length} classrooms with teaching assignments (student has no major)`);
        }
        // If studentId is provided, check course-specific registration status from teacher_rosters
        if (studentId && pool) {
            try {
                const { rows } = await pool.query(`SELECT DISTINCT course_code, teacher_id 
           FROM teacher_rosters 
           WHERE student_id = $1 AND status = 'enrolled'`, [studentId]);
                // Store as "course_code|teacher_id" to handle multiple teachers teaching same course
                for (const row of rows) {
                    studentRegisteredCourses.add(`${row.course_code}|${row.teacher_id}`);
                }
                console.log(`[ClassroomService] Student ${studentId} is registered for ${studentRegisteredCourses.size} course(s)`);
            }
            catch (error) {
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
        const seatsFilled = counts.get(room.id) ?? 0;
        const seatsAvailable = Math.max(room.capacity - seatsFilled, 0);
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
        }
        else {
            // No student or no major - show all courses
            displayedCourses = courses;
        }
        const classroomData = {
            ...room,
            seatsFilled,
            seatsAvailable,
            isFull: seatsAvailable === 0,
            focusAreas,
            courses: displayedCourses.map(c => {
                // Check if student is registered for this specific course (by course_code and teacher_id)
                const isRegistered = studentRegisteredCourses.has(`${c.courseCode}|${c.teacherId}`);
                return {
                    courseCode: c.courseCode,
                    courseTitle: c.courseTitle,
                    weekday: c.weekday,
                    startTime: c.startTime,
                    endTime: c.endTime,
                    majorFocus: c.majorFocus,
                    teacherName: c.teacherName,
                    isRegistered
                };
            })
        };
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
export async function registerStudentForClassroom(studentId, classroomId, courseCode // Optional: if provided, register only for this specific course
) {
    if (!Number.isFinite(studentId) || !Number.isFinite(classroomId)) {
        throw new Error('Invalid registration request.');
    }
    const classroom = await getClassroomById(classroomId);
    if (!classroom) {
        throw new Error('Classroom not found.');
    }
    // If registering for a specific course, check if student is already registered for that course
    if (courseCode) {
        const pool = getPool();
        if (pool) {
            try {
                // Check if student is already registered for this specific course
                // IMPORTANT: Query by course_code ONLY, not by classroom_id
                console.log(`[ClassroomService] Checking registration for student ${studentId}, courseCode: "${courseCode}" (NOT checking by classroom)`);
                const assignmentResult = await pool.query(`SELECT ta.course_code, ta.course_title, ta.teacher_id, ta.classroom_id
           FROM teaching_assignments ta
           WHERE ta.course_code = $1
           LIMIT 1`, [courseCode]);
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
                // Check for schedule conflicts - get the course schedule by course_code ONLY
                const scheduleResult = await pool.query(`SELECT weekday, start_time, end_time 
           FROM teaching_assignments 
           WHERE course_code = $1
           LIMIT 1`, [courseCode]);
                if (scheduleResult.rows.length > 0) {
                    const courseWeekday = scheduleResult.rows[0].weekday;
                    const courseStartTime = scheduleResult.rows[0].start_time;
                    const courseEndTime = scheduleResult.rows[0].end_time;
                    console.log(`[ClassroomService] Checking for schedule conflicts: ${courseTitle} (${courseWeekday} ${courseStartTime}-${courseEndTime})`);
                    // Check BOTH timetables AND teacher_rosters for existing registrations with conflicts
                    // This ensures we catch all registered courses, not just those with timetable entries
                    // 1. Check timetables for conflicts
                    const timetableConflictCheck = await pool.query(`SELECT t.id, t.subject, t.weekday, t.start_time, t.end_time
             FROM timetables t
             WHERE t.student_id = $1 
               AND t.weekday = $2
               AND (
                 -- New course starts during existing course (start_time is within existing course)
                 (t.start_time <= $3 AND t.end_time > $3)
                 -- New course ends during existing course (end_time is within existing course)
                 OR (t.start_time < $4 AND t.end_time >= $4)
                 -- New course completely contains existing course
                 OR (t.start_time >= $3 AND t.end_time <= $4)
                 -- Existing course completely contains new course
                 OR (t.start_time <= $3 AND t.end_time >= $4)
               )`, [studentId, courseWeekday, courseStartTime, courseEndTime]);
                    // 2. Check teacher_rosters for registered courses with same time (via teaching_assignments)
                    const rosterConflictCheck = await pool.query(`SELECT ta.course_code, ta.course_title, ta.weekday, ta.start_time, ta.end_time
             FROM teacher_rosters tr
             JOIN teaching_assignments ta ON tr.teacher_id = ta.teacher_id 
               AND tr.course_code = ta.course_code
             WHERE tr.student_id = $1
               AND ta.weekday = $2
               AND (
                 -- New course starts during existing course
                 (ta.start_time <= $3 AND ta.end_time > $3)
                 -- New course ends during existing course
                 OR (ta.start_time < $4 AND ta.end_time >= $4)
                 -- New course completely contains existing course
                 OR (ta.start_time >= $3 AND ta.end_time <= $4)
                 -- Existing course completely contains new course
                 OR (ta.start_time <= $3 AND ta.end_time >= $4)
               )
               -- Exclude the course we're trying to register (in case of retry) - use course_code ONLY
               AND ta.course_code != $5`, [studentId, courseWeekday, courseStartTime, courseEndTime, courseCode]);
                    const allConflicts = [
                        ...timetableConflictCheck.rows.map(row => ({
                            source: 'timetable',
                            course: row.subject,
                            weekday: row.weekday,
                            start: row.start_time,
                            end: row.end_time
                        })),
                        ...rosterConflictCheck.rows.map(row => ({
                            source: 'roster',
                            course: row.course_title,
                            weekday: row.weekday,
                            start: row.start_time,
                            end: row.end_time
                        }))
                    ];
                    if (allConflicts.length > 0) {
                        const conflictingCourses = allConflicts.map(c => `${c.course} (${c.weekday} ${c.start}-${c.end})`).join(', ');
                        console.warn(`[ClassroomService] ⚠️ SCHEDULE CONFLICT DETECTED for student ${studentId}`);
                        console.warn(`[ClassroomService]   New course: ${courseTitle} (${courseWeekday} ${courseStartTime}-${courseEndTime})`);
                        console.warn(`[ClassroomService]   Conflicting with: ${conflictingCourses}`);
                        console.warn(`[ClassroomService]   Conflicts found: ${timetableConflictCheck.rows.length} in timetables, ${rosterConflictCheck.rows.length} in teacher_rosters`);
                        // Return a warning error that the frontend can handle
                        throw new Error(`SCHEDULE_CONFLICT: You have a time conflict! This course (${courseTitle}, ${courseWeekday} ${courseStartTime}-${courseEndTime}) overlaps with: ${conflictingCourses}. Do you want to proceed anyway?`);
                    }
                    else {
                        console.log(`[ClassroomService] ✓ No schedule conflicts found for ${courseTitle} (${courseWeekday} ${courseStartTime}-${courseEndTime})`);
                    }
                }
                // Check using teacher_rosters table (most reliable - uses course_code + teacher_id)
                // This is the source of truth for course registrations since it includes course_code
                const existingRosterReg = await pool.query(`SELECT id, course_code, course_title, status FROM teacher_rosters 
           WHERE student_id = $1 AND course_code = $2 AND teacher_id = $3`, [studentId, courseCode, teacherId]);
                // Check class_registrations for reference, but don't use it to block registration
                // since class_registrations only has course title (not course_code), it could match
                // a different course with the same name. teacher_rosters is the authoritative source.
                const existingCourseReg = await pool.query(`SELECT id, class_name FROM class_registrations 
           WHERE student_id = $1 AND LOWER(TRIM(class_name)) = LOWER(TRIM($2))`, [studentId, courseTitle]);
                console.log(`[ClassroomService] Registration check results:`);
                console.log(`[ClassroomService]   - teacher_rosters (authoritative): ${existingRosterReg.rows.length} match(es)`, existingRosterReg.rows.length > 0 ? existingRosterReg.rows.map(r => `ID: ${r.id}, code: ${r.course_code}, title: ${r.course_title}, status: ${r.status}`).join('; ') : 'none');
                console.log(`[ClassroomService]   - class_registrations (reference only): ${existingCourseReg.rows.length} match(es)`, existingCourseReg.rows.length > 0 ? existingCourseReg.rows.map(r => `ID: ${r.id}, class_name: ${r.class_name}`).join('; ') : 'none');
                // Only block if teacher_rosters shows a registration (this is the authoritative check)
                // We don't use class_registrations alone because it could match a different course with the same title
                if (existingRosterReg.rows.length > 0) {
                    console.log(`[ClassroomService] Student ${studentId} already registered for course ${courseCode} (${courseTitle}) - found in teacher_rosters`);
                    throw new Error(`You are already registered for ${courseTitle} (${courseCode}).`);
                }
                console.log(`[ClassroomService] No existing registration found - student can register for ${courseCode}`);
            }
            catch (error) {
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
                const assignmentForCourse = await pool.query(`SELECT ta.teacher_id, ta.course_code, ta.course_title, ta.classroom_id
           FROM teaching_assignments ta
           WHERE ta.course_code = $1
           LIMIT 1`, [courseCode]);
                if (assignmentForCourse.rows.length > 0) {
                    const teacherId = assignmentForCourse.rows[0].teacher_id;
                    const assignmentClassroomId = assignmentForCourse.rows[0].classroom_id;
                    // Verify course is in the requested classroom
                    if (assignmentClassroomId !== classroomId) {
                        console.error(`[ClassroomService] ERROR: Course ${courseCode} is in classroom ${assignmentClassroomId}, not ${classroomId}`);
                        throw new Error(`Course ${courseCode} is not available in the selected classroom. Please select the correct classroom for this course.`);
                    }
                    const existingCourseInRoster = await pool.query(`SELECT id FROM teacher_rosters 
             WHERE student_id = $1 AND course_code = $2 AND teacher_id = $3`, [studentId, courseCode, teacherId]);
                    if (existingCourseInRoster.rows.length > 0) {
                        throw new Error(`You are already registered for ${assignmentForCourse.rows[0].course_title} (${courseCode}).`);
                    }
                }
                // Student has classroom enrollment but not this specific course - continue to registration below
                console.log(`[ClassroomService] Student ${studentId} has classroom enrollment but missing course ${courseCode}, will create ONLY this course`);
            }
            catch (error) {
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
            const courseCheck = await pool.query(`SELECT classroom_id FROM teaching_assignments WHERE course_code = $1 LIMIT 1`, [courseCode]);
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
        const enrollment = {
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
        }
        catch (error) {
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
        }
        catch (migrationError) {
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
            let effectiveClassroomId = classroomId;
            if (courseCode) {
                const courseCheck = await client.query(`SELECT classroom_id FROM teaching_assignments WHERE course_code = $1 LIMIT 1`, [courseCode]);
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
                }
                else {
                    await client.query('ROLLBACK');
                    throw new Error(`Course ${courseCode} not found in the system.`);
                }
            }
            // Only create classroom_registrations entry if student doesn't already have one for this classroom
            // This allows multiple course registrations in the same classroom without duplicate entries
            let enrollment;
            const existingEnrollment = await client.query(`SELECT id, classroom_id, student_id, status,
                to_char(registered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS registered_at
         FROM classroom_registrations
         WHERE classroom_id = $1 AND student_id = $2`, [effectiveClassroomId, studentId]);
            if (existingEnrollment.rows.length > 0) {
                // Use existing enrollment
                enrollment = normalizeClassroomEnrollment(existingEnrollment.rows[0]);
                console.log(`[ClassroomService] Using existing classroom enrollment for student ${studentId} in classroom ${effectiveClassroomId}`);
            }
            else {
                // Create new classroom registration
                const { rows } = await client.query(`INSERT INTO classroom_registrations (classroom_id, student_id, status)
         VALUES ($1, $2, 'enrolled')
         RETURNING id, classroom_id, student_id, status,
                   to_char(registered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS registered_at`, [effectiveClassroomId, studentId]);
                enrollment = normalizeClassroomEnrollment(rows[0]);
                console.log(`[ClassroomService] Created new classroom enrollment for student ${studentId} in classroom ${effectiveClassroomId}`);
            }
            // Fetch teaching assignments for this classroom to create timetable entries and class registrations
            // If courseCode is provided, ONLY register for that specific course (not all courses in the classroom)
            let assignmentsResult;
            try {
                if (courseCode) {
                    // Register for specific course only - STRICT FILTER by course_code ONLY (not classroom_id)
                    // This ensures we only get the specific course, regardless of classroom
                    assignmentsResult = await client.query(`SELECT teacher_id, course_code, course_title, weekday, start_time, end_time, major_focus, classroom_id,
                    COALESCE(semester, '1/2026') AS semester
             FROM teaching_assignments
             WHERE course_code = $1
             LIMIT 1`, [courseCode]);
                    console.log(`[ClassroomService] Registering student ${studentId} for SPECIFIC course ${courseCode} ONLY (not checking classroom_id)`);
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
                    // Verify the course's classroom_id matches what we determined earlier
                    const courseClassroomId = assignmentsResult.rows[0].classroom_id;
                    if (courseClassroomId !== effectiveClassroomId) {
                        console.error(`[ClassroomService] ERROR: Course ${courseCode} classroom_id mismatch! Expected ${effectiveClassroomId}, got ${courseClassroomId}`);
                        await client.query('ROLLBACK');
                        throw new Error(`Course ${courseCode} classroom mismatch. Please contact administration.`);
                    }
                    console.log(`[ClassroomService] ✓ Verified course ${courseCode} is in classroom ${effectiveClassroomId}`);
                }
                else {
                    // Register for all courses in classroom (backward compatibility - only when courseCode is NOT provided)
                    assignmentsResult = await client.query(`SELECT teacher_id, course_code, course_title, weekday, start_time, end_time, major_focus, 
                    COALESCE(semester, '1/2026') AS semester
         FROM teaching_assignments
         WHERE classroom_id = $1`, [effectiveClassroomId]);
                    console.log(`[ClassroomService] Registering student ${studentId} for ALL courses in classroom ${effectiveClassroomId} (backward compatibility mode)`);
                }
                console.log(`[ClassroomService] Found ${assignmentsResult.rows.length} teaching assignment(s) for classroom ${effectiveClassroomId}${courseCode ? ` (course: ${courseCode})` : ''}`);
            }
            catch (queryError) {
                // If semester column doesn't exist, fallback to query without it
                if (queryError?.code === '42703' && queryError?.message?.includes('semester')) {
                    console.warn('[ClassroomService] Semester column missing in teaching_assignments, using default');
                    if (courseCode) {
                        // Query by course_code ONLY, then verify classroom
                        assignmentsResult = await client.query(`SELECT teacher_id, course_code, course_title, weekday, start_time, end_time, major_focus, classroom_id
               FROM teaching_assignments
               WHERE course_code = $1
               LIMIT 1`, [courseCode]);
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
                    }
                    else {
                        // CRITICAL: Even in fallback, if courseCode is provided, only get that specific course
                        if (courseCode) {
                            assignmentsResult = await client.query(`SELECT teacher_id, course_code, course_title, weekday, start_time, end_time, major_focus, classroom_id
                 FROM teaching_assignments
                 WHERE course_code = $1
                 LIMIT 1`, [courseCode]);
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
                        }
                        else {
                            assignmentsResult = await client.query(`SELECT teacher_id, course_code, course_title, weekday, start_time, end_time, major_focus
                 FROM teaching_assignments
                 WHERE classroom_id = $1`, [effectiveClassroomId]);
                        }
                    }
                    // Add default semester to each row
                    assignmentsResult.rows = assignmentsResult.rows.map((row) => ({ ...row, semester: '1/2026' }));
                }
                else {
                    throw queryError;
                }
            }
            // Collect all course credits for tuition calculation
            let totalCredits = 0;
            const registeredCourses = [];
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
                assignmentsToProcess = assignmentsResult.rows.filter((a) => a.course_code === courseCode);
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
                // Final conflict check inside transaction - check for any overlapping courses on same weekday
                // This is a safety check to catch any conflicts that might have been missed earlier
                const finalConflictCheck = await client.query(`SELECT t.id, t.subject, t.weekday, t.start_time, t.end_time
           FROM timetables t
           WHERE t.student_id = $1 
             AND t.weekday = $2
             AND (
               -- New course starts during existing course (new start is within existing course)
               (t.start_time <= $3 AND t.end_time > $3)
               -- New course ends during existing course (new end is within existing course)
               OR (t.start_time < $4 AND t.end_time >= $4)
               -- New course completely contains existing course (new course is wider)
               OR (t.start_time >= $3 AND t.end_time <= $4)
               -- Existing course completely contains new course (existing course is wider)
               OR (t.start_time <= $3 AND t.end_time >= $4)
             )`, [studentId, assignment.weekday, assignment.start_time, assignment.end_time]);
                if (finalConflictCheck.rows.length > 0) {
                    const conflictingCourses = finalConflictCheck.rows.map((row) => `${row.subject} (${row.weekday} ${row.start_time}-${row.end_time})`).join(', ');
                    await client.query('ROLLBACK');
                    console.error(`[ClassroomService] ❌ SCHEDULE CONFLICT in transaction for student ${studentId}`);
                    console.error(`[ClassroomService]   New course: ${subject} (${assignment.weekday} ${assignment.start_time}-${assignment.end_time})`);
                    console.error(`[ClassroomService]   Conflicting with: ${conflictingCourses}`);
                    throw new Error(`SCHEDULE_CONFLICT: You have a time conflict! This course (${subject}, ${assignment.weekday} ${assignment.start_time}-${assignment.end_time}) overlaps with: ${conflictingCourses}. Please choose a different course or time.`);
                }
                // Check if timetable entry already exists to avoid duplicates
                const existingTimetable = await client.query(`SELECT id FROM timetables 
           WHERE student_id = $1 AND weekday = $2 AND start_time = $3 AND end_time = $4 AND subject = $5`, [
                    studentId,
                    assignment.weekday,
                    assignment.start_time,
                    assignment.end_time,
                    subject
                ]);
                if (existingTimetable.rows.length === 0) {
                    await client.query(`INSERT INTO timetables (student_id, weekday, start_time, end_time, subject, location)
             VALUES ($1, $2, $3, $4, $5, $6)`, [
                        studentId,
                        assignment.weekday,
                        assignment.start_time,
                        assignment.end_time,
                        subject,
                        effectiveClassroomForSubject?.location || classroom.location
                    ]);
                    console.log(`[ClassroomService] Created timetable entry for ${subject}`);
                }
                else {
                    console.log(`[ClassroomService] Timetable entry already exists for ${subject}`);
                }
                // Create class registration for this course
                // Check if class registration already exists (by course title, but also verify course_code if available)
                const existingRegistration = await client.query(`SELECT id FROM class_registrations WHERE student_id = $1 AND class_name = $2`, [studentId, assignment.course_title]);
                if (existingRegistration.rows.length === 0) {
                    // Get teacher/instructor name
                    let instructor = 'TBA';
                    if (assignment.teacher_id) {
                        const teacherResult = await client.query(`SELECT display_name FROM staff_accounts WHERE id = $1`, [assignment.teacher_id]);
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
                    }
                    catch (error) {
                        console.warn('Could not get course metadata for credits', error);
                    }
                    // Track credits for tuition calculation
                    totalCredits += credits;
                    registeredCourses.push({ courseTitle: assignment.course_title, credits });
                    // Use assignment's semester, or fallback to '1/2026' if not set
                    const semester = assignment.semester || '1/2026';
                    // Create class registration
                    const regResult = await client.query(`INSERT INTO class_registrations (student_id, class_name, instructor, status, semester, credits, confirmed_by, registered_at)
             VALUES ($1, $2, $3, 'registered', $4, $5, NULL, NOW())
             RETURNING id, class_name, instructor`, [studentId, assignment.course_title, instructor, semester, credits]);
                    console.log(`[ClassroomService] Created class registration for student ${studentId}: ${assignment.course_title} with instructor ${instructor}, ${credits} credits, semester ${semester} (ID: ${regResult.rows[0]?.id})`);
                    // Also add student to teacher_rosters so they appear in the teacher's roster
                    const existingRoster = await client.query(`SELECT id FROM teacher_rosters WHERE teacher_id = $1 AND course_code = $2 AND student_id = $3`, [assignment.teacher_id, assignment.course_code, studentId]);
                    if (existingRoster.rows.length === 0) {
                        await client.query(`INSERT INTO teacher_rosters (teacher_id, course_code, course_title, student_id, status)
               VALUES ($1, $2, $3, $4, 'enrolled')`, [assignment.teacher_id, assignment.course_code, assignment.course_title, studentId]);
                        console.log(`[ClassroomService] Added student ${studentId} to teacher ${assignment.teacher_id}'s roster for ${assignment.course_code}`);
                    }
                    else {
                        console.log(`[ClassroomService] Student ${studentId} already in teacher ${assignment.teacher_id}'s roster for ${assignment.course_code}, skipping`);
                    }
                    // Course registration fees are now replaced by a single tuition fee (calculated below)
                }
                else {
                    console.log(`[ClassroomService] Class registration already exists for ${assignment.course_title}, skipping duplicate`);
                }
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
            const feeComponents = [];
            if (tuitionFeeAmount > 0) {
                feeComponents.push(`Tuition Fee - ${semesterForFee} (${totalCredits} credits)`);
            }
            feeComponents.push(`Activity Fee - ${semesterForFee}`);
            feeComponents.push(`Insurance Fee - ${semesterForFee}`);
            const combinedFeeDescription = feeComponents.join('; ');
            // Check if a combined fee already exists for this student and semester
            const existingCombinedFee = await client.query(`SELECT id, amount, description FROM fee_payments 
         WHERE student_id = $1 
         AND description LIKE $2
         AND status = 'pending'`, [studentId, `%${semesterForFee}%`]);
            if (existingCombinedFee.rows.length === 0) {
                // Create new combined fee payment
                await client.query(`INSERT INTO fee_payments (student_id, amount, description, status, due_date)
           VALUES ($1, $2, $3, $4, $5)`, [studentId, totalFeeAmount, combinedFeeDescription, 'pending', feeDueDate.toISOString()]);
                console.log(`[ClassroomService] Created combined fee payment: ${totalFeeAmount} SGD for ${semesterForFee} (Tuition: ${tuitionFeeAmount}, Activity: ${activityFeeAmount}, Insurance: ${insuranceFeeAmount})`);
            }
            else {
                // Update existing combined fee if amount has changed
                const existingFee = existingCombinedFee.rows[0];
                const existingAmount = Number(existingFee.amount);
                if (existingAmount !== totalFeeAmount) {
                    await client.query(`UPDATE fee_payments SET amount = $1, description = $2 WHERE id = $3`, [totalFeeAmount, combinedFeeDescription, existingFee.id]);
                    console.log(`[ClassroomService] Updated combined fee payment from ${existingAmount} to ${totalFeeAmount} SGD for ${semesterForFee}`);
                }
                else {
                    console.log(`[ClassroomService] Combined fee payment already exists for ${semesterForFee} with correct amount: ${totalFeeAmount} SGD`);
                }
            }
            await client.query('COMMIT');
            console.log(`[ClassroomService] Registered student ${studentId} for classroom ${classroomId}, created ${assignmentsResult.rows.length} timetable entries, class registrations, and fee payment`);
            return enrollment;
        }
        catch (error) {
            await client.query('ROLLBACK').catch(() => { }); // Ignore rollback errors
            console.error(`[ClassroomService] Transaction error for student ${studentId} -> classroom ${classroomId}:`, error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
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
//# sourceMappingURL=classroomService.js.map