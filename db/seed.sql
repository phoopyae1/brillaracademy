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
    (1, 'Aaliyah', 'Gupta', 'aaliyah.gupta@example.edu', 'f35c3c028c31e04bb4e5f8459825d2567307db506e54b13bce33d6fc392851ee', 'Student', 'Biomedical Engineering'),
    (2, 'Mateo', 'Santos', 'mateo.santos@example.edu', 'f35c3c028c31e04bb4e5f8459825d2567307db506e54b13bce33d6fc392851ee', 'Student', 'Data Science')
ON CONFLICT (id) DO UPDATE
SET first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    primary_interest = EXCLUDED.primary_interest;

INSERT INTO timetables (id, student_id, weekday, start_time, end_time, subject, location)
VALUES
    (1, 1, 'Monday', '09:00', '10:15', 'Organic Chemistry Lab', 'Science Center 204'),
    (2, 1, 'Tuesday', '11:00', '12:15', 'Biomechanics Seminar', 'Innovation Hub 3A'),
    (3, 1, 'Thursday', '14:00', '15:30', 'Community Health Project', 'Wellness Studio'),
    (4, 2, 'Monday', '10:30', '11:45', 'Machine Learning', 'Tech Hall 201'),
    (5, 2, 'Wednesday', '13:00', '14:15', 'Human-Centered Data Viz', 'Design Loft'),
    (6, 2, 'Friday', '09:30', '11:00', 'Capstone Studio', 'Analytics Lab')
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

INSERT INTO class_registrations (id, student_id, class_name, instructor, status, registered_at)
VALUES
    (1, 1, 'Global Health Innovation Lab', 'Dr. Priya Raman', 'registered', '2024-08-15T13:00:00Z'),
    (2, 1, 'Neuroscience Frontiers', 'Professor Malik Chen', 'waitlisted', '2024-08-16T09:30:00Z'),
    (3, 2, 'Advanced Data Ethics', 'Dr. Leila Morgan', 'registered', '2024-08-14T10:45:00Z'),
    (4, 2, 'Immersive Visualization Studio', 'Professor Aaron Patel', 'registered', '2024-08-17T11:15:00Z')
ON CONFLICT (id) DO UPDATE
SET student_id = EXCLUDED.student_id,
    class_name = EXCLUDED.class_name,
    instructor = EXCLUDED.instructor,
    status = EXCLUDED.status,
    registered_at = EXCLUDED.registered_at;
