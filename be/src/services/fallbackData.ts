import type {
  Feature,
  Student,
  TimetableEntry,
  ScheduleItem,
  ClassRegistration,
  StaffAccount
} from './types.js';

export const fallbackFeatures: Feature[] = [
  {
    id: 1,
    name: 'Authentication & Profile',
    description:
      'Secure sign-in with admin-issued accounts, centralized profile management, and multi-factor authentication to protect every student account.',
    category: 'Foundation',
    icon: 'shield'
  },
  {
    id: 2,
    name: 'Academic Dashboard',
    description: 'A personalized control center with GPA, attendance, and upcoming deadlines at a glance.',
    category: 'Insights',
    icon: 'dashboard'
  },
  {
    id: 3,
    name: 'Courses & Learning',
    description: 'Streamlined access to course syllabi, schedules, instructors, and media-rich learning resources.',
    category: 'Learning',
    icon: 'menu_book'
  },
  {
    id: 4,
    name: 'Assignments & Assessments',
    description: 'Effortless submissions, status tracking, grading feedback, and academic integrity tools.',
    category: 'Evaluation',
    icon: 'assignment_turned_in'
  },
  {
    id: 5,
    name: 'Grades & Reports',
    description: 'Dynamic grade breakdowns, transcript exports, and progress analytics that illuminate performance.',
    category: 'Insights',
    icon: 'bar_chart'
  },
  {
    id: 6,
    name: 'Attendance & Schedule',
    description: 'Real-time attendance, smart reminders, and beautifully organized timetables.',
    category: 'Engagement',
    icon: 'event_available'
  },
  {
    id: 7,
    name: 'Communication & Support',
    description: 'In-platform chat, forums, and helpdesk workflows that keep students and faculty connected.',
    category: 'Community',
    icon: 'forum'
  },
  {
    id: 8,
    name: 'Payments & Finance',
    description: 'Transparent fee statements, modern payment options, and proactive reminders.',
    category: 'Finance',
    icon: 'account_balance_wallet'
  },
  {
    id: 9,
    name: 'Documents & Forms',
    description: 'Fast access to official documents and digital submissions with status tracking.',
    category: 'Records',
    icon: 'description'
  },
  {
    id: 10,
    name: 'Academic Planning',
    description: 'Curriculum planning, registration workflows, and advisor scheduling in one place.',
    category: 'Planning',
    icon: 'timeline'
  },
  {
    id: 11,
    name: 'Career & Internship',
    description: 'Opportunity boards, portfolio tools, and counselor booking to support every next step.',
    category: 'Career',
    icon: 'rocket_launch'
  },
  {
    id: 12,
    name: 'Admin & Faculty Suite',
    description: 'Comprehensive teaching tools, approvals, and analytics for academic leaders.',
    category: 'Operations',
    icon: 'admin_panel_settings'
  },
  {
    id: 13,
    name: 'Advanced Enhancements',
    description: 'Optional mobile apps, AI assistants, push alerts, and accessibility-first experiences.',
    category: 'Innovation',
    icon: 'auto_awesome'
  }
];

export const seededPasswordHash = 'f35c3c028c31e04bb4e5f8459825d2567307db506e54b13bce33d6fc392851ee';

export const fallbackStudents: Student[] = [
  {
    id: 1,
    firstName: 'Aaliyah',
    lastName: 'Gupta',
    email: 'aaliyah.gupta@example.edu',
    role: 'Student',
    primaryInterest: 'Biomedical Engineering',
    createdAt: new Date('2024-08-12T14:30:00Z').toISOString()
  },
  {
    id: 2,
    firstName: 'Mateo',
    lastName: 'Santos',
    email: 'mateo.santos@example.edu',
    role: 'Student',
    primaryInterest: 'Data Science',
    createdAt: new Date('2024-08-12T14:30:00Z').toISOString()
  }
];

export const fallbackTimetables: TimetableEntry[] = [
  {
    id: 1,
    studentId: 1,
    weekday: 'Monday',
    startTime: '09:00',
    endTime: '10:15',
    subject: 'Organic Chemistry Lab',
    location: 'Science Center 204'
  },
  {
    id: 2,
    studentId: 1,
    weekday: 'Tuesday',
    startTime: '11:00',
    endTime: '12:15',
    subject: 'Biomechanics Seminar',
    location: 'Innovation Hub 3A'
  },
  {
    id: 3,
    studentId: 1,
    weekday: 'Thursday',
    startTime: '14:00',
    endTime: '15:30',
    subject: 'Community Health Project',
    location: 'Wellness Studio'
  },
  {
    id: 4,
    studentId: 2,
    weekday: 'Monday',
    startTime: '10:30',
    endTime: '11:45',
    subject: 'Machine Learning',
    location: 'Tech Hall 201'
  },
  {
    id: 5,
    studentId: 2,
    weekday: 'Wednesday',
    startTime: '13:00',
    endTime: '14:15',
    subject: 'Human-Centered Data Viz',
    location: 'Design Loft'
  },
  {
    id: 6,
    studentId: 2,
    weekday: 'Friday',
    startTime: '09:30',
    endTime: '11:00',
    subject: 'Capstone Studio',
    location: 'Analytics Lab'
  }
];

export const fallbackSchedules: ScheduleItem[] = [
  {
    id: 1,
    studentId: 1,
    title: 'Advisor Check-in',
    description: 'Monthly meeting with academic advisor to review research proposal.',
    startTime: '2024-09-10T15:00:00Z',
    endTime: '2024-09-10T15:45:00Z'
  },
  {
    id: 2,
    studentId: 1,
    title: 'Wellness Workshop',
    description: 'Guided mindfulness session hosted by the health collaborative.',
    startTime: '2024-09-12T18:00:00Z',
    endTime: '2024-09-12T19:15:00Z'
  },
  {
    id: 3,
    studentId: 2,
    title: 'Data Challenge Sprint',
    description: 'Collaborative sprint with industry mentors on open city datasets.',
    startTime: '2024-09-11T14:00:00Z',
    endTime: '2024-09-11T17:00:00Z'
  },
  {
    id: 4,
    studentId: 2,
    title: 'Mentor Debrief',
    description: 'One-on-one feedback with capstone mentor.',
    startTime: '2024-09-13T16:30:00Z',
    endTime: '2024-09-13T17:15:00Z'
  }
];

export const fallbackRegistrations: ClassRegistration[] = [
  {
    id: 1,
    studentId: 1,
    className: 'Global Health Innovation Lab',
    instructor: 'Dr. Priya Raman',
    status: 'registered',
    registeredAt: '2024-08-15T13:00:00Z'
  },
  {
    id: 2,
    studentId: 1,
    className: 'Neuroscience Frontiers',
    instructor: 'Professor Malik Chen',
    status: 'waitlisted',
    registeredAt: '2024-08-16T09:30:00Z'
  },
  {
    id: 3,
    studentId: 2,
    className: 'Advanced Data Ethics',
    instructor: 'Dr. Leila Morgan',
    status: 'registered',
    registeredAt: '2024-08-14T10:45:00Z'
  },
  {
    id: 4,
    studentId: 2,
    className: 'Immersive Visualization Studio',
    instructor: 'Professor Aaron Patel',
    status: 'registered',
    registeredAt: '2024-08-17T11:15:00Z'
  }
];

export const fallbackStaff: StaffAccount[] = [
  {
    id: 1,
    displayName: 'Ada Lovelace',
    email: 'it-admin@brillaracademy.edu',
    role: 'IT_ADMIN',
    createdAt: new Date('2024-08-01T09:00:00Z').toISOString()
  },
  {
    id: 2,
    displayName: 'Grace Hopper',
    email: 'faculty@brillaracademy.edu',
    role: 'TEACHER',
    createdAt: new Date('2024-08-01T10:00:00Z').toISOString()
  },
  {
    id: 3,
    displayName: 'Mary Johnson',
    email: 'admin-office@brillaracademy.edu',
    role: 'STUDENT_ADMIN',
    createdAt: new Date('2024-08-01T11:15:00Z').toISOString()
  }
];
