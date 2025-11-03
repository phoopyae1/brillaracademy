INSERT INTO features (id, name, description, category, icon) VALUES
    (1, 'Authentication & Profile', 'Secure sign-in, profile management, and multi-factor authentication to protect every student account.', 'Foundation', 'shield'),
    (2, 'Academic Dashboard', 'A personalized control center with GPA, attendance, and upcoming deadlines at a glance.', 'Insights', 'dashboard'),
    (3, 'Courses & Learning', 'Streamlined access to course syllabi, schedules, instructors, and media-rich learning resources.', 'Learning', 'menu_book'),
    (4, 'Assignments & Assessments', 'Effortless submissions, status tracking, grading feedback, and academic integrity tools.', 'Evaluation', 'assignment_turned_in'),
    (5, 'Grades & Reports', 'Dynamic grade breakdowns, transcript exports, and progress analytics that illuminate performance.', 'Insights', 'bar_chart'),
    (6, 'Attendance & Schedule', 'Real-time attendance, smart reminders, and beautifully organized timetables.', 'Engagement', 'event_available'),
    (7, 'Communication & Support', 'In-platform chat, forums, and helpdesk workflows that keep students and faculty connected.', 'Community', 'forum'),
    (8, 'Payments & Finance', 'Transparent fee statements, modern payment options, and proactive reminders.', 'Finance', 'account_balance_wallet'),
    (9, 'Documents & Forms', 'Fast access to official documents and digital submissions with status tracking.', 'Records', 'description'),
    (10, 'Academic Planning', 'Curriculum planning, registration workflows, and advisor scheduling in one place.', 'Planning', 'timeline'),
    (11, 'Career & Internship', 'Opportunity boards, portfolio tools, and counselor booking to support every next step.', 'Career', 'rocket_launch'),
    (12, 'Admin & Faculty Suite', 'Comprehensive teaching tools, approvals, and analytics for academic leaders.', 'Operations', 'admin_panel_settings'),
    (13, 'Advanced Enhancements', 'Optional mobile apps, AI assistants, push alerts, and accessibility-first experiences.', 'Innovation', 'auto_awesome')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    icon = EXCLUDED.icon;

INSERT INTO students (id, first_name, last_name, email, password_hash, role, primary_interest)
VALUES
    (1, 'Aaliyah', 'Gupta', 'aaliyah.gupta@example.edu', '$2a$10$nL8DH4FX53TBjccqOUFtkucOoZPdbdd/f4SXMxv8ENjS/pUadeUX2', 'Student', 'Biomedical Engineering'),
    (2, 'Mateo', 'Santos', 'mateo.santos@example.edu', '$2a$10$nL8DH4FX53TBjccqOUFtkucOoZPdbdd/f4SXMxv8ENjS/pUadeUX2', 'Student', 'Data Science')
ON CONFLICT (id) DO UPDATE
SET first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    primary_interest = EXCLUDED.primary_interest;

INSERT INTO timetables (id, student_id, weekday, start_time, end_time, subject, location)
VALUES
    (1, 1, 'Monday', '09:00', '10:15', 'Global Health Innovation Lab', 'North Campus - Building B'),
    (2, 1, 'Tuesday', '11:00', '12:15', 'Neuroscience Frontiers', 'Main Campus - Innovation Hub'),
    (3, 1, 'Thursday', '14:00', '15:30', 'Community Health Project', 'South Campus - Health Center'),
    (4, 2, 'Monday', '10:30', '11:45', 'Advanced Data Ethics', 'Tech Hall 201'),
    (5, 2, 'Wednesday', '13:00', '14:15', 'Immersive Visualization Studio', 'Analytics Lab 410'),
    (6, 2, 'Friday', '09:30', '11:00', 'Capstone Studio', 'Main Campus - Tech Tower')
ON CONFLICT (id) DO UPDATE
SET student_id = EXCLUDED.student_id,
    weekday = EXCLUDED.weekday,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    subject = EXCLUDED.subject,
    location = EXCLUDED.location;

INSERT INTO schedules (id, student_id, title, description, start_time, end_time)
VALUES
    (1, 1, 'Advisor Check-in', 'Monthly meeting with academic advisor to review research proposal.', '2024-09-10T15:00:00Z', '2024-09-10T15:45:00Z'),
    (2, 1, 'Wellness Workshop', 'Guided mindfulness session hosted by the health collaborative.', '2024-09-12T18:00:00Z', '2024-09-12T19:15:00Z'),
    (3, 2, 'Data Challenge Sprint', 'Collaborative sprint with industry mentors on open city datasets.', '2024-09-11T14:00:00Z', '2024-09-11T17:00:00Z'),
    (4, 2, 'Mentor Debrief', 'One-on-one feedback with capstone mentor.', '2024-09-13T16:30:00Z', '2024-09-13T17:15:00Z')
ON CONFLICT (id) DO UPDATE
SET student_id = EXCLUDED.student_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time;

INSERT INTO class_registrations (id, student_id, class_name, instructor, status, semester, credits, confirmed_by, registered_at)
VALUES
    (1, 1, 'Global Health Innovation Lab', 'Dr. Priya Raman', 'registered', 'Fall 2024', 3, 1, '2024-08-15T13:00:00Z'),
    (2, 1, 'Neuroscience Frontiers', 'Professor Malik Chen', 'waitlisted', 'Fall 2024', 4, NULL, '2024-08-16T09:30:00Z'),
    (3, 2, 'Advanced Data Ethics', 'Dr. Leila Morgan', 'registered', 'Fall 2024', 3, 1, '2024-08-14T10:45:00Z'),
    (4, 2, 'Immersive Visualization Studio', 'Professor Aaron Patel', 'registered', 'Fall 2024', 4, NULL, '2024-08-17T11:15:00Z')
ON CONFLICT (id) DO UPDATE
SET student_id = EXCLUDED.student_id,
    class_name = EXCLUDED.class_name,
    instructor = EXCLUDED.instructor,
    status = EXCLUDED.status,
    semester = EXCLUDED.semester,
    credits = EXCLUDED.credits,
    confirmed_by = EXCLUDED.confirmed_by,
    registered_at = EXCLUDED.registered_at;

INSERT INTO classrooms (id, name, location, capacity, resources, created_by, created_at)
VALUES
    (1, 'Innovation Hub 201', 'North Campus - Building B', 28, '["Interactive Whiteboard", "3D Printer", "Video Conferencing"]', 1, '2024-08-05T09:00:00Z'),
    (2, 'Wellness Studio 3A', 'South Campus - Health Center', 22, '["Yoga Mats", "Projection System"]', 1, '2024-08-06T11:30:00Z'),
    (3, 'Analytics Lab 410', 'Main Campus - Tech Tower', 32, '["High-Performance Workstations", "Data Wall"]', 1, '2024-08-07T14:15:00Z')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    location = EXCLUDED.location,
    capacity = EXCLUDED.capacity,
    resources = EXCLUDED.resources,
    created_by = EXCLUDED.created_by,
    created_at = EXCLUDED.created_at;

INSERT INTO classroom_registrations (id, classroom_id, student_id, status, registered_at)
VALUES
    (1, 1, 1, 'enrolled', '2024-08-22T15:30:00Z'),
    (2, 3, 2, 'enrolled', '2024-08-23T10:15:00Z')
ON CONFLICT (id) DO UPDATE
SET classroom_id = EXCLUDED.classroom_id,
    student_id = EXCLUDED.student_id,
    status = EXCLUDED.status,
    registered_at = EXCLUDED.registered_at;

INSERT INTO staff_accounts (id, display_name, email, password_hash, role, created_at)
VALUES
    (1, 'Ada Lovelace', 'it-admin@brillaracademy.edu', '$2a$10$nL8DH4FX53TBjccqOUFtkucOoZPdbdd/f4SXMxv8ENjS/pUadeUX2', 'IT_ADMIN', '2024-08-01T09:00:00Z'),
    (2, 'Grace Hopper', 'faculty@brillaracademy.edu', '$2a$10$nL8DH4FX53TBjccqOUFtkucOoZPdbdd/f4SXMxv8ENjS/pUadeUX2', 'TEACHER', '2024-08-01T10:00:00Z'),
    (3, 'Mary Johnson', 'admin-office@brillaracademy.edu', '$2a$10$nL8DH4FX53TBjccqOUFtkucOoZPdbdd/f4SXMxv8ENjS/pUadeUX2', 'STUDENT_ADMIN', '2024-08-01T11:15:00Z')
ON CONFLICT (id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    created_at = EXCLUDED.created_at;

INSERT INTO fee_payments (id, student_id, amount, description, status, received_by, received_at, due_date)
VALUES
    (1, 1, 1200.00, 'Global Health Innovation Lab - Registration Fee', 'pending', NULL, '2024-08-20T00:00:00Z', '2024-09-15T00:00:00Z'),
    (2, 1, 850.00, 'Neuroscience Frontiers - Class Fee', 'pending', NULL, '2024-08-20T00:00:00Z', '2024-09-15T00:00:00Z'),
    (3, 2, 1500.00, 'Advanced Data Ethics - Registration Fee', 'pending', NULL, '2024-08-21T00:00:00Z', '2024-09-15T00:00:00Z'),
    (4, 2, 1800.00, 'Immersive Visualization Studio - Class Fee', 'paid', 3, '2024-08-21T13:45:00Z', '2024-09-15T00:00:00Z'),
    (5, 2, 450.00, 'Student Wellness Pass', 'pending', NULL, '2024-08-25T00:00:00Z', '2024-09-10T00:00:00Z')
ON CONFLICT (id) DO UPDATE
SET student_id = EXCLUDED.student_id,
    amount = EXCLUDED.amount,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    received_by = EXCLUDED.received_by,
    received_at = EXCLUDED.received_at,
    due_date = EXCLUDED.due_date;

INSERT INTO grade_records (id, student_id, course_code, course_title, semester, grade, credits, recorded_by, recorded_at)
VALUES
    (1, 1, 'BIOE-521', 'Advanced Bioinstrumentation', 'Spring 2024', 'A', 3, 2, '2024-05-10T15:00:00Z'),
    (2, 1, 'CHEM-540', 'Organic Synthesis Lab', 'Spring 2024', 'A-', 4, 2, '2024-05-10T15:05:00Z'),
    (3, 2, 'DATA-610', 'Bayesian Machine Learning', 'Spring 2024', 'A', 3, 2, '2024-05-12T14:40:00Z'),
    (4, 2, 'STAT-575', 'Responsible AI Fieldwork', 'Spring 2024', 'A-', 2, 2, '2024-05-12T14:45:00Z')
ON CONFLICT (id) DO UPDATE
SET student_id = EXCLUDED.student_id,
    course_code = EXCLUDED.course_code,
    course_title = EXCLUDED.course_title,
    semester = EXCLUDED.semester,
    grade = EXCLUDED.grade,
    credits = EXCLUDED.credits,
    recorded_by = EXCLUDED.recorded_by,
    recorded_at = EXCLUDED.recorded_at;

INSERT INTO exam_announcements (id, title, description, exam_date, posted_by, created_at)
VALUES
    (1, 'Fall 2024 Midterm Week', 'Midterm examinations for all core courses will take place between October 14-18. Detailed schedules will be shared in course portals.', '2024-10-14T13:00:00Z', 1, '2024-08-18T10:00:00Z'),
    (2, 'Capstone Final Presentations', 'Capstone cohorts will present their final projects on December 5 in the Innovation Hub.', '2024-12-05T15:00:00Z', 1, '2024-08-22T09:30:00Z')
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    exam_date = EXCLUDED.exam_date,
    posted_by = EXCLUDED.posted_by,
    created_at = EXCLUDED.created_at;

INSERT INTO semester_gpa (id, student_id, semester, gpa)
VALUES
    (1, 1, 'Fall 2023', 3.72),
    (2, 1, 'Spring 2024', 3.88),
    (3, 2, 'Fall 2023', 3.65),
    (4, 2, 'Spring 2024', 3.74)
ON CONFLICT (id) DO UPDATE
SET student_id = EXCLUDED.student_id,
    semester = EXCLUDED.semester,
    gpa = EXCLUDED.gpa;

INSERT INTO registration_windows (id, semester, status, opens_at, closes_at, courses)
VALUES
    (1, 'Fall 2024', 'open', '2024-08-10T12:00:00Z', '2024-09-10T23:59:59Z', '[{"courseCode":"BIOE-630","courseTitle":"Neural Interface Design","instructor":"Dr. Priya Raman","credits":3},{"courseCode":"DATA-720","courseTitle":"Responsible AI Systems","instructor":"Professor Malik Chen","credits":4}]'),
    (2, 'Spring 2025', 'upcoming', '2024-11-15T12:00:00Z', '2025-01-10T23:59:59Z', '[{"courseCode":"BIOE-650","courseTitle":"Biomechatronics Studio","instructor":"Dr. Leila Morgan","credits":4},{"courseCode":"DATA-755","courseTitle":"Immersive Analytics Workshop","instructor":"Professor Aaron Patel","credits":3}]')
ON CONFLICT (id) DO UPDATE
SET semester = EXCLUDED.semester,
    status = EXCLUDED.status,
    opens_at = EXCLUDED.opens_at,
    closes_at = EXCLUDED.closes_at,
    courses = EXCLUDED.courses;

INSERT INTO teaching_assignments (id, teacher_id, classroom_id, course_code, course_title, weekday, start_time, end_time, student_group, assigned_by, assigned_at)
VALUES
    (1, 2, 1, 'BIOE-521', 'Advanced Bioinstrumentation', 'Monday', '09:00', '10:15', 'Biomedical Cohort A', 1, '2024-08-08T14:00:00Z'),
    (2, 2, 3, 'DATA-610', 'Bayesian Machine Learning', 'Wednesday', '13:00', '14:15', 'Data Science Scholars', 1, '2024-08-08T14:30:00Z'),
    (3, 2, 2, 'CHEM-540', 'Organic Synthesis Lab', 'Thursday', '14:30', '16:00', 'Advanced Chem Labs', 1, '2024-08-08T15:00:00Z')
ON CONFLICT (id) DO UPDATE
SET teacher_id = EXCLUDED.teacher_id,
    classroom_id = EXCLUDED.classroom_id,
    course_code = EXCLUDED.course_code,
    course_title = EXCLUDED.course_title,
    weekday = EXCLUDED.weekday,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    student_group = EXCLUDED.student_group,
    assigned_by = EXCLUDED.assigned_by,
    assigned_at = EXCLUDED.assigned_at;

INSERT INTO teacher_rosters (id, teacher_id, course_code, course_title, student_id, status)
VALUES
    (1, 2, 'BIOE-521', 'Advanced Bioinstrumentation', 1, 'enrolled'),
    (2, 2, 'CHEM-540', 'Organic Synthesis Lab', 1, 'enrolled'),
    (3, 2, 'DATA-610', 'Bayesian Machine Learning', 2, 'enrolled'),
    (4, 2, 'STAT-575', 'Responsible AI Fieldwork', 2, 'waitlisted')
ON CONFLICT (id) DO UPDATE
SET teacher_id = EXCLUDED.teacher_id,
    course_code = EXCLUDED.course_code,
    course_title = EXCLUDED.course_title,
    student_id = EXCLUDED.student_id,
    status = EXCLUDED.status;
