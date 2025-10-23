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
