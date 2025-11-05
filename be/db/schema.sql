CREATE TABLE IF NOT EXISTS features (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'auto_awesome'
);

CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT,
    primary_interest TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timetables (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    weekday TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    subject TEXT NOT NULL,
    location TEXT
);

CREATE TABLE IF NOT EXISTS schedules (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS class_registrations (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_name TEXT NOT NULL,
    instructor TEXT,
    status TEXT NOT NULL DEFAULT 'registered',
    semester TEXT,
    credits INTEGER,
    confirmed_by INTEGER REFERENCES staff_accounts(id),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classrooms (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    resources JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by INTEGER REFERENCES staff_accounts(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classroom_registrations (
    id SERIAL PRIMARY KEY,
    classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'enrolled',
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (classroom_id, student_id)
);

CREATE TABLE IF NOT EXISTS staff_accounts (
    id SERIAL PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by INTEGER REFERENCES staff_accounts(id)
);

CREATE TABLE IF NOT EXISTS fee_payments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    received_by INTEGER REFERENCES staff_accounts(id),
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS grade_records (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_code TEXT NOT NULL,
    course_title TEXT NOT NULL,
    semester TEXT NOT NULL,
    grade TEXT NOT NULL,
    credits INTEGER NOT NULL CHECK (credits > 0),
    recorded_by INTEGER REFERENCES staff_accounts(id),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_announcements (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    exam_date TIMESTAMPTZ NOT NULL,
    posted_by INTEGER REFERENCES staff_accounts(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'announcement' CHECK (type IN ('announcement', 'event')),
    event_date TIMESTAMPTZ,
    posted_by INTEGER REFERENCES staff_accounts(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS semester_gpa (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    semester TEXT NOT NULL,
    gpa DECIMAL(3, 2) NOT NULL CHECK (gpa >= 0 AND gpa <= 4),
    UNIQUE(student_id, semester)
);

CREATE TABLE IF NOT EXISTS registration_windows (
    id SERIAL PRIMARY KEY,
    semester TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'open', 'closed')),
    opens_at TIMESTAMPTZ NOT NULL,
    closes_at TIMESTAMPTZ NOT NULL,
    courses JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_by INTEGER REFERENCES staff_accounts(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teaching_assignments (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES staff_accounts(id) ON DELETE CASCADE,
    classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    course_code TEXT NOT NULL,
    course_title TEXT NOT NULL,
    weekday TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    student_group TEXT,
    major_focus TEXT NOT NULL DEFAULT 'Undeclared',
    semester TEXT NOT NULL DEFAULT '1/2026',
    assigned_by INTEGER REFERENCES staff_accounts(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_rosters (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES staff_accounts(id) ON DELETE CASCADE,
    course_code TEXT NOT NULL,
    course_title TEXT NOT NULL,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'waitlisted')),
    UNIQUE(teacher_id, course_code, student_id)
);

CREATE TABLE IF NOT EXISTS student_assignments (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES staff_accounts(id) ON DELETE CASCADE,
    course_code TEXT NOT NULL,
    course_title TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    max_points DECIMAL(10, 2),
    assignment_type TEXT NOT NULL DEFAULT 'homework' CHECK (assignment_type IN ('homework', 'project', 'quiz', 'exam', 'other')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
