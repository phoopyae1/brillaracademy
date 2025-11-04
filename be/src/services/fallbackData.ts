import type {
  Feature,
  Student,
  TimetableEntry,
  ScheduleItem,
  ClassRegistration,
  StaffAccount,
  Classroom,
  FeePayment,
  GradeRecord,
  ExamAnnouncement,
  SemesterGpa,
  SemesterRegistration,
  TeachingAssignment,
  TeacherRosterEntry,
  ClassroomEnrollment
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

export const seededPasswordHash = '$2a$10$nL8DH4FX53TBjccqOUFtkucOoZPdbdd/f4SXMxv8ENjS/pUadeUX2';

export const fallbackStudents: Student[] = [
  {
    id: 1,
    firstName: 'Aaliyah',
    lastName: 'Gupta',
    email: 'aaliyah.gupta@example.edu',
    role: 'Student',
    primaryInterest: 'Biomedical Engineering',
    createdAt: new Date('2024-08-12T14:30:00Z').toISOString(),
    selectedSubjects: ['Neural Interface Design', 'Global Health Innovation Lab']
  },
  {
    id: 2,
    firstName: 'Mateo',
    lastName: 'Santos',
    email: 'mateo.santos@example.edu',
    role: 'Student',
    primaryInterest: 'Data Science',
    createdAt: new Date('2024-08-12T14:30:00Z').toISOString(),
    selectedSubjects: ['Responsible AI Systems', 'Advanced Data Ethics']
  }
];

export const fallbackTimetables: TimetableEntry[] = [
  {
    id: 1,
    studentId: 1,
    weekday: 'Monday',
    startTime: '09:00',
    endTime: '10:15',
    subject: 'Global Health Innovation Lab',
    location: 'North Campus - Building B'
  },
  {
    id: 2,
    studentId: 1,
    weekday: 'Tuesday',
    startTime: '11:00',
    endTime: '12:15',
    subject: 'Neuroscience Frontiers',
    location: 'Main Campus - Innovation Hub'
  },
  {
    id: 3,
    studentId: 1,
    weekday: 'Thursday',
    startTime: '14:00',
    endTime: '15:30',
    subject: 'Community Health Project',
    location: 'South Campus - Health Center'
  },
  {
    id: 4,
    studentId: 2,
    weekday: 'Monday',
    startTime: '10:30',
    endTime: '11:45',
    subject: 'Advanced Data Ethics',
    location: 'Tech Hall 201'
  },
  {
    id: 5,
    studentId: 2,
    weekday: 'Wednesday',
    startTime: '13:00',
    endTime: '14:15',
    subject: 'Immersive Visualization Studio',
    location: 'Analytics Lab 410'
  },
  {
    id: 6,
    studentId: 2,
    weekday: 'Friday',
    startTime: '09:30',
    endTime: '11:00',
    subject: 'Capstone Studio',
    location: 'Main Campus - Tech Tower'
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
    registeredAt: '2024-08-15T13:00:00Z',
    semester: 'Fall 2024',
    credits: 3,
    confirmedBy: 1
  },
  {
    id: 2,
    studentId: 1,
    className: 'Neuroscience Frontiers',
    instructor: 'Professor Malik Chen',
    status: 'waitlisted',
    registeredAt: '2024-08-16T09:30:00Z',
    semester: 'Fall 2024',
    credits: 4,
    confirmedBy: null
  },
  {
    id: 3,
    studentId: 2,
    className: 'Advanced Data Ethics',
    instructor: 'Dr. Leila Morgan',
    status: 'registered',
    registeredAt: '2024-08-14T10:45:00Z',
    semester: 'Fall 2024',
    credits: 3,
    confirmedBy: 1
  },
  {
    id: 4,
    studentId: 2,
    className: 'Immersive Visualization Studio',
    instructor: 'Professor Aaron Patel',
    status: 'registered',
    registeredAt: '2024-08-17T11:15:00Z',
    semester: 'Fall 2024',
    credits: 4,
    confirmedBy: null
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

export const fallbackClassrooms: Classroom[] = [
  {
    id: 1,
    name: 'Building 1, 1001',
    location: 'Building 1 - First Floor',
    capacity: 28,
    resources: [
      'Interactive Whiteboard',
      '3D Printer',
      'Video Conferencing',
      'Major: Biomedical Engineering',
      'Major: Artificial Intelligence'
    ],
    createdBy: 1,
    createdAt: new Date('2024-08-05T09:00:00Z').toISOString()
  },
  {
    id: 2,
    name: 'Building 1, 1002',
    location: 'Building 1 - First Floor',
    capacity: 22,
    resources: [
      'Yoga Mats',
      'Projection System',
      'Major: Environmental Science',
      'Major: International Relations',
      'Major: Hospitality Management'
    ],
    createdBy: 1,
    createdAt: new Date('2024-08-06T11:30:00Z').toISOString()
  },
  {
    id: 3,
    name: 'Building 1, 1003',
    location: 'Building 1 - First Floor',
    capacity: 32,
    resources: [
      'High-Performance Workstations',
      'Data Wall',
      'Major: Data Science',
      'Major: Cybersecurity',
      'Major: Digital Media Design',
      'Major: Business Administration'
    ],
    createdBy: 1,
    createdAt: new Date('2024-08-07T14:15:00Z').toISOString()
  },
  {
    id: 4,
    name: 'Building 1 - Room 101',
    location: 'Building 1 - First Floor',
    capacity: 25,
    resources: ['Whiteboard', 'Projector', 'Major: Business Administration', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-08T09:00:00Z').toISOString()
  },
  {
    id: 5,
    name: 'Building 1 - Room 102',
    location: 'Building 1 - First Floor',
    capacity: 30,
    resources: ['Interactive Display', 'Audio System', 'Major: Digital Media Design', 'Major: Information Technology'],
    createdBy: 1,
    createdAt: new Date('2024-08-08T09:00:00Z').toISOString()
  },
  {
    id: 6,
    name: 'Building 1 - Room 201',
    location: 'Building 1 - Second Floor',
    capacity: 28,
    resources: ['Smart Board', 'Video Equipment', 'Major: International Relations', 'Major: Hospitality Management'],
    createdBy: 1,
    createdAt: new Date('2024-08-08T10:00:00Z').toISOString()
  },
  {
    id: 7,
    name: 'Building 1 - Room 202',
    location: 'Building 1 - Second Floor',
    capacity: 32,
    resources: ['Whiteboard', 'Projector', 'Major: Business Administration', 'Major: Digital Media Design'],
    createdBy: 1,
    createdAt: new Date('2024-08-08T10:00:00Z').toISOString()
  },
  {
    id: 8,
    name: 'Building 2 - Room 101',
    location: 'Building 2 - First Floor',
    capacity: 24,
    resources: ['Lab Equipment', 'Safety Stations', 'Major: Biomedical Engineering', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-08T11:00:00Z').toISOString()
  },
  {
    id: 9,
    name: 'Building 2 - Room 102',
    location: 'Building 2 - First Floor',
    capacity: 26,
    resources: ['Microscopes', 'Lab Benches', 'Major: Biomedical Engineering', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-08T11:00:00Z').toISOString()
  },
  {
    id: 10,
    name: 'Building 2 - Room 201',
    location: 'Building 2 - Second Floor',
    capacity: 30,
    resources: ['Computer Workstations', 'Printer Station', 'Major: Data Science', 'Major: Information Technology'],
    createdBy: 1,
    createdAt: new Date('2024-08-08T12:00:00Z').toISOString()
  },
  {
    id: 11,
    name: 'Building 2 - Room 202',
    location: 'Building 2 - Second Floor',
    capacity: 28,
    resources: ['Programming Lab Setup', 'Network Equipment', 'Major: Cybersecurity', 'Major: Information Technology'],
    createdBy: 1,
    createdAt: new Date('2024-08-08T12:00:00Z').toISOString()
  },
  {
    id: 12,
    name: 'Building 3 - Room 101',
    location: 'Building 3 - First Floor',
    capacity: 22,
    resources: ['Seminar Tables', 'Presentation Screen', 'Major: International Relations', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-08T13:00:00Z').toISOString()
  },
  {
    id: 13,
    name: 'Building 3 - Room 102',
    location: 'Building 3 - First Floor',
    capacity: 20,
    resources: ['Round Tables', 'Whiteboard Walls', 'Major: International Relations', 'Major: Hospitality Management'],
    createdBy: 1,
    createdAt: new Date('2024-08-08T13:00:00Z').toISOString()
  },
  {
    id: 14,
    name: 'Building 3 - Room 201',
    location: 'Building 3 - Second Floor',
    capacity: 25,
    resources: ['Design Tables', 'Drawing Boards', 'Major: Digital Media Design', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-08T14:00:00Z').toISOString()
  },
  {
    id: 15,
    name: 'Building 3 - Room 202',
    location: 'Building 3 - Second Floor',
    capacity: 24,
    resources: ['Art Supplies', 'Digital Tablets', 'Major: Digital Media Design'],
    createdBy: 1,
    createdAt: new Date('2024-08-08T14:00:00Z').toISOString()
  },
  {
    id: 16,
    name: 'Building 4 - Room 101',
    location: 'Building 4 - First Floor',
    capacity: 35,
    resources: ['Lecture Hall Setup', 'Stage', 'Major: Business Administration', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-08T15:00:00Z').toISOString()
  },
  {
    id: 17,
    name: 'Building 4 - Room 102',
    location: 'Building 4 - First Floor',
    capacity: 32,
    resources: ['Tiered Seating', 'Audio-Visual System', 'Major: International Relations', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-08T15:00:00Z').toISOString()
  },
  {
    id: 18,
    name: 'Building 4 - Room 201',
    location: 'Building 4 - Second Floor',
    capacity: 28,
    resources: ['Collaboration Tables', 'Smart Screens', 'Major: Data Science', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-08T16:00:00Z').toISOString()
  },
  {
    id: 19,
    name: 'Building 5 - Room 101',
    location: 'Building 5 - First Floor',
    capacity: 26,
    resources: ['Science Lab Setup', 'Safety Equipment', 'Major: Biomedical Engineering', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-09T09:00:00Z').toISOString()
  },
  {
    id: 20,
    name: 'Building 5 - Room 102',
    location: 'Building 5 - First Floor',
    capacity: 24,
    resources: ['Chemistry Lab', 'Ventilation System', 'Major: Biomedical Engineering', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-09T09:00:00Z').toISOString()
  },
  {
    id: 21,
    name: 'Building 5 - Room 201',
    location: 'Building 5 - Second Floor',
    capacity: 30,
    resources: ['Physics Lab', 'Measurement Tools', 'Major: Biomedical Engineering'],
    createdBy: 1,
    createdAt: new Date('2024-08-09T10:00:00Z').toISOString()
  },
  {
    id: 22,
    name: 'Building 6 - Room 101',
    location: 'Building 6 - First Floor',
    capacity: 28,
    resources: ['Computer Lab', 'Network Access', 'Major: Data Science', 'Major: Cybersecurity'],
    createdBy: 1,
    createdAt: new Date('2024-08-09T11:00:00Z').toISOString()
  },
  {
    id: 23,
    name: 'Building 6 - Room 102',
    location: 'Building 6 - First Floor',
    capacity: 30,
    resources: ['High-Speed Workstations', 'Data Visualization Tools', 'Major: Data Science', 'Major: Artificial Intelligence'],
    createdBy: 1,
    createdAt: new Date('2024-08-09T11:00:00Z').toISOString()
  },
  {
    id: 24,
    name: 'Building 6 - Room 201',
    location: 'Building 6 - Second Floor',
    capacity: 26,
    resources: ['Security Lab', 'Network Simulators', 'Major: Cybersecurity', 'Major: Information Technology'],
    createdBy: 1,
    createdAt: new Date('2024-08-09T12:00:00Z').toISOString()
  },
  {
    id: 25,
    name: 'Building 7 - Room 101',
    location: 'Building 7 - First Floor',
    capacity: 22,
    resources: ['Hospitality Kitchen', 'Dining Setup', 'Major: Hospitality Management'],
    createdBy: 1,
    createdAt: new Date('2024-08-09T13:00:00Z').toISOString()
  },
  {
    id: 26,
    name: 'Building 7 - Room 102',
    location: 'Building 7 - First Floor',
    capacity: 20,
    resources: ['Service Training Area', 'Equipment Storage', 'Major: Hospitality Management'],
    createdBy: 1,
    createdAt: new Date('2024-08-09T13:00:00Z').toISOString()
  },
  {
    id: 27,
    name: 'Building 7 - Room 201',
    location: 'Building 7 - Second Floor',
    capacity: 24,
    resources: ['Event Planning Space', 'Presentation Equipment', 'Major: Hospitality Management', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-09T14:00:00Z').toISOString()
  },
  {
    id: 28,
    name: 'Building 8 - Room 101',
    location: 'Building 8 - First Floor',
    capacity: 32,
    resources: ['AI Lab', 'GPU Workstations', 'Major: Artificial Intelligence', 'Major: Data Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-09T15:00:00Z').toISOString()
  },
  {
    id: 29,
    name: 'Building 8 - Room 102',
    location: 'Building 8 - First Floor',
    capacity: 28,
    resources: ['Machine Learning Setup', 'Data Processing Tools', 'Major: Artificial Intelligence', 'Major: Data Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-09T15:00:00Z').toISOString()
  },
  {
    id: 30,
    name: 'Building 8 - Room 201',
    location: 'Building 8 - Second Floor',
    capacity: 30,
    resources: ['Robotics Lab', 'Prototyping Tools', 'Major: Artificial Intelligence', 'Major: Biomedical Engineering'],
    createdBy: 1,
    createdAt: new Date('2024-08-09T16:00:00Z').toISOString()
  },
  {
    id: 31,
    name: 'Building 9 - Room 101',
    location: 'Building 9 - First Floor',
    capacity: 26,
    resources: ['Environmental Lab', 'Testing Equipment', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-10T09:00:00Z').toISOString()
  },
  {
    id: 32,
    name: 'Building 9 - Room 102',
    location: 'Building 9 - First Floor',
    capacity: 24,
    resources: ['Field Study Prep', 'Sample Analysis Tools', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-10T09:00:00Z').toISOString()
  },
  {
    id: 33,
    name: 'Building 9 - Room 201',
    location: 'Building 9 - Second Floor',
    capacity: 28,
    resources: ['Sustainability Lab', 'Research Equipment', 'Major: Environmental Science', 'Major: Biomedical Engineering'],
    createdBy: 1,
    createdAt: new Date('2024-08-10T10:00:00Z').toISOString()
  },
  {
    id: 34,
    name: 'Building 10 - Room 101',
    location: 'Building 10 - First Floor',
    capacity: 25,
    resources: ['General Purpose', 'Flexible Seating', 'Major: Business Administration', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-10T11:00:00Z').toISOString()
  },
  {
    id: 35,
    name: 'Building 10 - Room 102',
    location: 'Building 10 - First Floor',
    capacity: 27,
    resources: ['Study Space', 'Group Work Area', 'Major: Digital Media Design', 'Major: Information Technology'],
    createdBy: 1,
    createdAt: new Date('2024-08-10T11:00:00Z').toISOString()
  },
  {
    id: 36,
    name: 'Building 10 - Room 201',
    location: 'Building 10 - Second Floor',
    capacity: 30,
    resources: ['Multi-Purpose Hall', 'Movable Furniture', 'Major: International Relations', 'Major: Hospitality Management'],
    createdBy: 1,
    createdAt: new Date('2024-08-10T12:00:00Z').toISOString()
  },
  {
    id: 37,
    name: 'Building 10 - Room 202',
    location: 'Building 10 - Second Floor',
    capacity: 28,
    resources: ['Conference Setup', 'Video Conferencing', 'Major: Business Administration', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-10T12:00:00Z').toISOString()
  },
  {
    id: 38,
    name: 'Building 1 - Room 103',
    location: 'Building 1 - First Floor',
    capacity: 27,
    resources: ['Whiteboard', 'Projector', 'Major: Business Administration', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-10T13:00:00Z').toISOString()
  },
  {
    id: 39,
    name: 'Building 1 - Room 104',
    location: 'Building 1 - First Floor',
    capacity: 29,
    resources: ['Interactive Display', 'Audio System', 'Major: Digital Media Design', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-10T13:00:00Z').toISOString()
  },
  {
    id: 40,
    name: 'Building 1 - Room 203',
    location: 'Building 1 - Second Floor',
    capacity: 26,
    resources: ['Smart Board', 'Video Equipment', 'Major: International Relations', 'Major: Hospitality Management'],
    createdBy: 1,
    createdAt: new Date('2024-08-10T14:00:00Z').toISOString()
  },
  {
    id: 41,
    name: 'Building 1 - Room 204',
    location: 'Building 1 - Second Floor',
    capacity: 31,
    resources: ['Whiteboard', 'Projector', 'Major: Business Administration', 'Major: Digital Media Design'],
    createdBy: 1,
    createdAt: new Date('2024-08-10T14:00:00Z').toISOString()
  },
  {
    id: 42,
    name: 'Building 1 - Room 301',
    location: 'Building 1 - Third Floor',
    capacity: 24,
    resources: ['Seminar Setup', 'Presentation Screen', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-10T15:00:00Z').toISOString()
  },
  {
    id: 43,
    name: 'Building 1 - Room 302',
    location: 'Building 1 - Third Floor',
    capacity: 28,
    resources: ['Conference Tables', 'Video Conferencing', 'Major: Business Administration', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-10T15:00:00Z').toISOString()
  },
  {
    id: 44,
    name: 'Building 1 - Room 303',
    location: 'Building 1 - Third Floor',
    capacity: 25,
    resources: ['Flexible Seating', 'Whiteboard', 'Major: Hospitality Management'],
    createdBy: 1,
    createdAt: new Date('2024-08-10T16:00:00Z').toISOString()
  },
  {
    id: 45,
    name: 'Building 1 - Room 304',
    location: 'Building 1 - Third Floor',
    capacity: 30,
    resources: ['Collaboration Space', 'Smart Board', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-10T16:00:00Z').toISOString()
  },
  {
    id: 46,
    name: 'Building 2 - Room 103',
    location: 'Building 2 - First Floor',
    capacity: 28,
    resources: ['Lab Equipment', 'Safety Stations', 'Major: Biomedical Engineering', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-10T17:00:00Z').toISOString()
  },
  {
    id: 47,
    name: 'Building 2 - Room 104',
    location: 'Building 2 - First Floor',
    capacity: 25,
    resources: ['Microscopes', 'Lab Benches', 'Major: Biomedical Engineering'],
    createdBy: 1,
    createdAt: new Date('2024-08-10T17:00:00Z').toISOString()
  },
  {
    id: 48,
    name: 'Building 2 - Room 203',
    location: 'Building 2 - Second Floor',
    capacity: 32,
    resources: ['Computer Workstations', 'Printer Station', 'Major: Data Science', 'Major: Information Technology'],
    createdBy: 1,
    createdAt: new Date('2024-08-11T09:00:00Z').toISOString()
  },
  {
    id: 49,
    name: 'Building 2 - Room 204',
    location: 'Building 2 - Second Floor',
    capacity: 29,
    resources: ['Programming Lab Setup', 'Network Equipment', 'Major: Cybersecurity', 'Major: Information Technology'],
    createdBy: 1,
    createdAt: new Date('2024-08-11T09:00:00Z').toISOString()
  },
  {
    id: 50,
    name: 'Building 2 - Room 301',
    location: 'Building 2 - Third Floor',
    capacity: 26,
    resources: ['Advanced Lab Equipment', 'Safety Stations', 'Major: Biomedical Engineering'],
    createdBy: 1,
    createdAt: new Date('2024-08-11T10:00:00Z').toISOString()
  },
  {
    id: 51,
    name: 'Building 2 - Room 302',
    location: 'Building 2 - Third Floor',
    capacity: 24,
    resources: ['Research Lab', 'Specialized Tools', 'Major: Environmental Science', 'Major: Biomedical Engineering'],
    createdBy: 1,
    createdAt: new Date('2024-08-11T10:00:00Z').toISOString()
  },
  {
    id: 52,
    name: 'Building 2 - Room 303',
    location: 'Building 2 - Third Floor',
    capacity: 30,
    resources: ['Data Lab', 'Analysis Tools', 'Major: Data Science', 'Major: Artificial Intelligence'],
    createdBy: 1,
    createdAt: new Date('2024-08-11T11:00:00Z').toISOString()
  },
  {
    id: 53,
    name: 'Building 2 - Room 304',
    location: 'Building 2 - Third Floor',
    capacity: 27,
    resources: ['Security Lab', 'Testing Equipment', 'Major: Cybersecurity'],
    createdBy: 1,
    createdAt: new Date('2024-08-11T11:00:00Z').toISOString()
  },
  {
    id: 54,
    name: 'Building 3 - Room 103',
    location: 'Building 3 - First Floor',
    capacity: 23,
    resources: ['Seminar Tables', 'Presentation Screen', 'Major: International Relations', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-11T12:00:00Z').toISOString()
  },
  {
    id: 55,
    name: 'Building 3 - Room 104',
    location: 'Building 3 - First Floor',
    capacity: 21,
    resources: ['Round Tables', 'Whiteboard Walls', 'Major: International Relations', 'Major: Hospitality Management'],
    createdBy: 1,
    createdAt: new Date('2024-08-11T12:00:00Z').toISOString()
  },
  {
    id: 56,
    name: 'Building 3 - Room 203',
    location: 'Building 3 - Second Floor',
    capacity: 26,
    resources: ['Design Tables', 'Drawing Boards', 'Major: Digital Media Design', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-11T13:00:00Z').toISOString()
  },
  {
    id: 57,
    name: 'Building 3 - Room 204',
    location: 'Building 3 - Second Floor',
    capacity: 25,
    resources: ['Art Supplies', 'Digital Tablets', 'Major: Digital Media Design'],
    createdBy: 1,
    createdAt: new Date('2024-08-11T13:00:00Z').toISOString()
  },
  {
    id: 58,
    name: 'Building 3 - Room 301',
    location: 'Building 3 - Third Floor',
    capacity: 22,
    resources: ['Studio Space', 'Creative Tools', 'Major: Digital Media Design'],
    createdBy: 1,
    createdAt: new Date('2024-08-11T14:00:00Z').toISOString()
  },
  {
    id: 59,
    name: 'Building 3 - Room 302',
    location: 'Building 3 - Third Floor',
    capacity: 24,
    resources: ['Media Lab', 'Recording Equipment', 'Major: Digital Media Design', 'Major: Information Technology'],
    createdBy: 1,
    createdAt: new Date('2024-08-11T14:00:00Z').toISOString()
  },
  {
    id: 60,
    name: 'Building 3 - Room 303',
    location: 'Building 3 - Third Floor',
    capacity: 28,
    resources: ['Collaboration Studio', 'Presentation Tools', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-11T15:00:00Z').toISOString()
  },
  {
    id: 61,
    name: 'Building 3 - Room 304',
    location: 'Building 3 - Third Floor',
    capacity: 27,
    resources: ['Flexible Workshop', 'Design Equipment', 'Major: Digital Media Design', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-11T15:00:00Z').toISOString()
  },
  {
    id: 62,
    name: 'Building 4 - Room 103',
    location: 'Building 4 - First Floor',
    capacity: 33,
    resources: ['Lecture Hall Setup', 'Stage', 'Major: Business Administration', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-11T16:00:00Z').toISOString()
  },
  {
    id: 63,
    name: 'Building 4 - Room 104',
    location: 'Building 4 - First Floor',
    capacity: 34,
    resources: ['Tiered Seating', 'Audio-Visual System', 'Major: International Relations', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-11T16:00:00Z').toISOString()
  },
  {
    id: 64,
    name: 'Building 4 - Room 203',
    location: 'Building 4 - Second Floor',
    capacity: 30,
    resources: ['Collaboration Tables', 'Smart Screens', 'Major: Data Science', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-12T09:00:00Z').toISOString()
  },
  {
    id: 65,
    name: 'Building 4 - Room 204',
    location: 'Building 4 - Second Floor',
    capacity: 29,
    resources: ['Conference Hall', 'Video Equipment', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-12T09:00:00Z').toISOString()
  },
  {
    id: 66,
    name: 'Building 4 - Room 301',
    location: 'Building 4 - Third Floor',
    capacity: 27,
    resources: ['Seminar Hall', 'Presentation Setup', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-12T10:00:00Z').toISOString()
  },
  {
    id: 67,
    name: 'Building 4 - Room 302',
    location: 'Building 4 - Third Floor',
    capacity: 31,
    resources: ['Large Classroom', 'Multi-Media System', 'Major: International Relations', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-12T10:00:00Z').toISOString()
  },
  {
    id: 68,
    name: 'Building 4 - Room 303',
    location: 'Building 4 - Third Floor',
    capacity: 28,
    resources: ['Lecture Room', 'Smart Board', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-12T11:00:00Z').toISOString()
  },
  {
    id: 69,
    name: 'Building 4 - Room 304',
    location: 'Building 4 - Third Floor',
    capacity: 32,
    resources: ['Presentation Hall', 'Audio-Visual', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-12T11:00:00Z').toISOString()
  },
  {
    id: 70,
    name: 'Building 5 - Room 103',
    location: 'Building 5 - First Floor',
    capacity: 27,
    resources: ['Science Lab Setup', 'Safety Equipment', 'Major: Biomedical Engineering', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-12T12:00:00Z').toISOString()
  },
  {
    id: 71,
    name: 'Building 5 - Room 104',
    location: 'Building 5 - First Floor',
    capacity: 25,
    resources: ['Chemistry Lab', 'Ventilation System', 'Major: Biomedical Engineering', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-12T12:00:00Z').toISOString()
  },
  {
    id: 72,
    name: 'Building 5 - Room 203',
    location: 'Building 5 - Second Floor',
    capacity: 31,
    resources: ['Physics Lab', 'Measurement Tools', 'Major: Biomedical Engineering'],
    createdBy: 1,
    createdAt: new Date('2024-08-12T13:00:00Z').toISOString()
  },
  {
    id: 73,
    name: 'Building 5 - Room 204',
    location: 'Building 5 - Second Floor',
    capacity: 28,
    resources: ['Biology Lab', 'Specimen Equipment', 'Major: Biomedical Engineering', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-12T13:00:00Z').toISOString()
  },
  {
    id: 74,
    name: 'Building 5 - Room 301',
    location: 'Building 5 - Third Floor',
    capacity: 26,
    resources: ['Advanced Science Lab', 'Specialized Equipment', 'Major: Biomedical Engineering'],
    createdBy: 1,
    createdAt: new Date('2024-08-12T14:00:00Z').toISOString()
  },
  {
    id: 75,
    name: 'Building 5 - Room 302',
    location: 'Building 5 - Third Floor',
    capacity: 29,
    resources: ['Research Lab', 'Analysis Tools', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-12T14:00:00Z').toISOString()
  },
  {
    id: 76,
    name: 'Building 5 - Room 303',
    location: 'Building 5 - Third Floor',
    capacity: 27,
    resources: ['Biotechnology Lab', 'Specialized Instruments', 'Major: Biomedical Engineering'],
    createdBy: 1,
    createdAt: new Date('2024-08-12T15:00:00Z').toISOString()
  },
  {
    id: 77,
    name: 'Building 5 - Room 304',
    location: 'Building 5 - Third Floor',
    capacity: 30,
    resources: ['Environmental Testing Lab', 'Field Equipment', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-12T15:00:00Z').toISOString()
  },
  {
    id: 78,
    name: 'Building 6 - Room 103',
    location: 'Building 6 - First Floor',
    capacity: 29,
    resources: ['Computer Lab', 'Network Access', 'Major: Data Science', 'Major: Cybersecurity'],
    createdBy: 1,
    createdAt: new Date('2024-08-12T16:00:00Z').toISOString()
  },
  {
    id: 79,
    name: 'Building 6 - Room 104',
    location: 'Building 6 - First Floor',
    capacity: 31,
    resources: ['High-Speed Workstations', 'Data Visualization Tools', 'Major: Data Science', 'Major: Artificial Intelligence'],
    createdBy: 1,
    createdAt: new Date('2024-08-12T16:00:00Z').toISOString()
  },
  {
    id: 80,
    name: 'Building 6 - Room 203',
    location: 'Building 6 - Second Floor',
    capacity: 27,
    resources: ['Security Lab', 'Network Simulators', 'Major: Cybersecurity', 'Major: Information Technology'],
    createdBy: 1,
    createdAt: new Date('2024-08-13T09:00:00Z').toISOString()
  },
  {
    id: 81,
    name: 'Building 6 - Room 204',
    location: 'Building 6 - Second Floor',
    capacity: 28,
    resources: ['Programming Lab', 'Development Tools', 'Major: Information Technology', 'Major: Cybersecurity'],
    createdBy: 1,
    createdAt: new Date('2024-08-13T09:00:00Z').toISOString()
  },
  {
    id: 82,
    name: 'Building 6 - Room 301',
    location: 'Building 6 - Third Floor',
    capacity: 30,
    resources: ['Advanced Computing Lab', 'GPU Clusters', 'Major: Data Science', 'Major: Artificial Intelligence'],
    createdBy: 1,
    createdAt: new Date('2024-08-13T10:00:00Z').toISOString()
  },
  {
    id: 83,
    name: 'Building 6 - Room 302',
    location: 'Building 6 - Third Floor',
    capacity: 26,
    resources: ['Cyber Range', 'Penetration Testing Tools', 'Major: Cybersecurity'],
    createdBy: 1,
    createdAt: new Date('2024-08-13T10:00:00Z').toISOString()
  },
  {
    id: 84,
    name: 'Building 6 - Room 303',
    location: 'Building 6 - Third Floor',
    capacity: 29,
    resources: ['Big Data Lab', 'Analytics Tools', 'Major: Data Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-13T11:00:00Z').toISOString()
  },
  {
    id: 85,
    name: 'Building 6 - Room 304',
    location: 'Building 6 - Third Floor',
    capacity: 32,
    resources: ['Network Lab', 'Infrastructure Tools', 'Major: Information Technology', 'Major: Cybersecurity'],
    createdBy: 1,
    createdAt: new Date('2024-08-13T11:00:00Z').toISOString()
  },
  {
    id: 86,
    name: 'Building 7 - Room 103',
    location: 'Building 7 - First Floor',
    capacity: 23,
    resources: ['Hospitality Kitchen', 'Dining Setup', 'Major: Hospitality Management'],
    createdBy: 1,
    createdAt: new Date('2024-08-13T12:00:00Z').toISOString()
  },
  {
    id: 87,
    name: 'Building 7 - Room 104',
    location: 'Building 7 - First Floor',
    capacity: 21,
    resources: ['Service Training Area', 'Equipment Storage', 'Major: Hospitality Management'],
    createdBy: 1,
    createdAt: new Date('2024-08-13T12:00:00Z').toISOString()
  },
  {
    id: 88,
    name: 'Building 7 - Room 203',
    location: 'Building 7 - Second Floor',
    capacity: 25,
    resources: ['Event Planning Space', 'Presentation Equipment', 'Major: Hospitality Management', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-13T13:00:00Z').toISOString()
  },
  {
    id: 89,
    name: 'Building 7 - Room 204',
    location: 'Building 7 - Second Floor',
    capacity: 26,
    resources: ['Catering Prep', 'Service Stations', 'Major: Hospitality Management'],
    createdBy: 1,
    createdAt: new Date('2024-08-13T13:00:00Z').toISOString()
  },
  {
    id: 90,
    name: 'Building 7 - Room 301',
    location: 'Building 7 - Third Floor',
    capacity: 24,
    resources: ['Hotel Operations Lab', 'Front Desk Setup', 'Major: Hospitality Management'],
    createdBy: 1,
    createdAt: new Date('2024-08-13T14:00:00Z').toISOString()
  },
  {
    id: 91,
    name: 'Building 7 - Room 302',
    location: 'Building 7 - Third Floor',
    capacity: 22,
    resources: ['Event Hall', 'Banquet Setup', 'Major: Hospitality Management', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-13T14:00:00Z').toISOString()
  },
  {
    id: 92,
    name: 'Building 7 - Room 303',
    location: 'Building 7 - Third Floor',
    capacity: 27,
    resources: ['Culinary Lab', 'Cooking Equipment', 'Major: Hospitality Management'],
    createdBy: 1,
    createdAt: new Date('2024-08-13T15:00:00Z').toISOString()
  },
  {
    id: 93,
    name: 'Building 7 - Room 304',
    location: 'Building 7 - Third Floor',
    capacity: 25,
    resources: ['Service Excellence Lab', 'Training Tools', 'Major: Hospitality Management'],
    createdBy: 1,
    createdAt: new Date('2024-08-13T15:00:00Z').toISOString()
  },
  {
    id: 94,
    name: 'Building 8 - Room 103',
    location: 'Building 8 - First Floor',
    capacity: 33,
    resources: ['AI Lab', 'GPU Workstations', 'Major: Artificial Intelligence', 'Major: Data Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-13T16:00:00Z').toISOString()
  },
  {
    id: 95,
    name: 'Building 8 - Room 104',
    location: 'Building 8 - First Floor',
    capacity: 29,
    resources: ['Machine Learning Setup', 'Data Processing Tools', 'Major: Artificial Intelligence', 'Major: Data Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-13T16:00:00Z').toISOString()
  },
  {
    id: 96,
    name: 'Building 8 - Room 203',
    location: 'Building 8 - Second Floor',
    capacity: 31,
    resources: ['Robotics Lab', 'Prototyping Tools', 'Major: Artificial Intelligence', 'Major: Biomedical Engineering'],
    createdBy: 1,
    createdAt: new Date('2024-08-14T09:00:00Z').toISOString()
  },
  {
    id: 97,
    name: 'Building 8 - Room 204',
    location: 'Building 8 - Second Floor',
    capacity: 28,
    resources: ['Deep Learning Lab', 'Neural Network Tools', 'Major: Artificial Intelligence'],
    createdBy: 1,
    createdAt: new Date('2024-08-14T09:00:00Z').toISOString()
  },
  {
    id: 98,
    name: 'Building 8 - Room 301',
    location: 'Building 8 - Third Floor',
    capacity: 30,
    resources: ['AI Research Lab', 'Advanced Computing', 'Major: Artificial Intelligence', 'Major: Data Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-14T10:00:00Z').toISOString()
  },
  {
    id: 99,
    name: 'Building 8 - Room 302',
    location: 'Building 8 - Third Floor',
    capacity: 27,
    resources: ['Computer Vision Lab', 'Image Processing Tools', 'Major: Artificial Intelligence'],
    createdBy: 1,
    createdAt: new Date('2024-08-14T10:00:00Z').toISOString()
  },
  {
    id: 100,
    name: 'Building 8 - Room 303',
    location: 'Building 8 - Third Floor',
    capacity: 32,
    resources: ['NLP Lab', 'Language Processing Tools', 'Major: Artificial Intelligence', 'Major: Data Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-14T11:00:00Z').toISOString()
  },
  {
    id: 101,
    name: 'Building 8 - Room 304',
    location: 'Building 8 - Third Floor',
    capacity: 29,
    resources: ['Autonomous Systems Lab', 'Sensor Equipment', 'Major: Artificial Intelligence', 'Major: Biomedical Engineering'],
    createdBy: 1,
    createdAt: new Date('2024-08-14T11:00:00Z').toISOString()
  },
  {
    id: 102,
    name: 'Building 9 - Room 103',
    location: 'Building 9 - First Floor',
    capacity: 27,
    resources: ['Environmental Lab', 'Testing Equipment', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-14T12:00:00Z').toISOString()
  },
  {
    id: 103,
    name: 'Building 9 - Room 104',
    location: 'Building 9 - First Floor',
    capacity: 25,
    resources: ['Field Study Prep', 'Sample Analysis Tools', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-14T12:00:00Z').toISOString()
  },
  {
    id: 104,
    name: 'Building 9 - Room 203',
    location: 'Building 9 - Second Floor',
    capacity: 29,
    resources: ['Sustainability Lab', 'Research Equipment', 'Major: Environmental Science', 'Major: Biomedical Engineering'],
    createdBy: 1,
    createdAt: new Date('2024-08-14T13:00:00Z').toISOString()
  },
  {
    id: 105,
    name: 'Building 9 - Room 204',
    location: 'Building 9 - Second Floor',
    capacity: 26,
    resources: ['Ecology Lab', 'Field Analysis Tools', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-14T13:00:00Z').toISOString()
  },
  {
    id: 106,
    name: 'Building 9 - Room 301',
    location: 'Building 9 - Third Floor',
    capacity: 28,
    resources: ['Climate Research Lab', 'Monitoring Equipment', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-14T14:00:00Z').toISOString()
  },
  {
    id: 107,
    name: 'Building 9 - Room 302',
    location: 'Building 9 - Third Floor',
    capacity: 24,
    resources: ['Conservation Lab', 'Preservation Tools', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-14T14:00:00Z').toISOString()
  },
  {
    id: 108,
    name: 'Building 9 - Room 303',
    location: 'Building 9 - Third Floor',
    capacity: 30,
    resources: ['Environmental Policy Lab', 'Analysis Tools', 'Major: Environmental Science', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-14T15:00:00Z').toISOString()
  },
  {
    id: 109,
    name: 'Building 9 - Room 304',
    location: 'Building 9 - Third Floor',
    capacity: 27,
    resources: ['Renewable Energy Lab', 'Testing Equipment', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-14T15:00:00Z').toISOString()
  },
  {
    id: 110,
    name: 'Building 10 - Room 103',
    location: 'Building 10 - First Floor',
    capacity: 26,
    resources: ['General Purpose', 'Flexible Seating', 'Major: Business Administration', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-14T16:00:00Z').toISOString()
  },
  {
    id: 111,
    name: 'Building 10 - Room 104',
    location: 'Building 10 - First Floor',
    capacity: 28,
    resources: ['Study Space', 'Group Work Area', 'Major: Digital Media Design', 'Major: Information Technology'],
    createdBy: 1,
    createdAt: new Date('2024-08-14T16:00:00Z').toISOString()
  },
  {
    id: 112,
    name: 'Building 10 - Room 203',
    location: 'Building 10 - Second Floor',
    capacity: 31,
    resources: ['Multi-Purpose Hall', 'Movable Furniture', 'Major: International Relations', 'Major: Hospitality Management'],
    createdBy: 1,
    createdAt: new Date('2024-08-15T09:00:00Z').toISOString()
  },
  {
    id: 113,
    name: 'Building 10 - Room 204',
    location: 'Building 10 - Second Floor',
    capacity: 29,
    resources: ['Conference Setup', 'Video Conferencing', 'Major: Business Administration', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-15T09:00:00Z').toISOString()
  },
  {
    id: 114,
    name: 'Building 10 - Room 301',
    location: 'Building 10 - Third Floor',
    capacity: 27,
    resources: ['Collaboration Hub', 'Flexible Layout', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-15T10:00:00Z').toISOString()
  },
  {
    id: 115,
    name: 'Building 10 - Room 302',
    location: 'Building 10 - Third Floor',
    capacity: 25,
    resources: ['Meeting Space', 'Presentation Tools', 'Major: International Relations', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-15T10:00:00Z').toISOString()
  },
  {
    id: 116,
    name: 'Building 10 - Room 303',
    location: 'Building 10 - Third Floor',
    capacity: 30,
    resources: ['Workshop Space', 'Group Setup', 'Major: Digital Media Design', 'Major: Information Technology'],
    createdBy: 1,
    createdAt: new Date('2024-08-15T11:00:00Z').toISOString()
  },
  {
    id: 117,
    name: 'Building 10 - Room 304',
    location: 'Building 10 - Third Floor',
    capacity: 28,
    resources: ['Flexible Classroom', 'Adaptable Furniture', 'Major: Business Administration', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-15T11:00:00Z').toISOString()
  },
  {
    id: 118,
    name: 'Building 1 - Room 401',
    location: 'Building 1 - Fourth Floor',
    capacity: 26,
    resources: ['Seminar Room', 'Presentation Equipment', 'Major: International Relations', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-15T12:00:00Z').toISOString()
  },
  {
    id: 119,
    name: 'Building 1 - Room 402',
    location: 'Building 1 - Fourth Floor',
    capacity: 28,
    resources: ['Conference Room', 'Video Setup', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-15T12:00:00Z').toISOString()
  },
  {
    id: 120,
    name: 'Building 1 - Room 403',
    location: 'Building 1 - Fourth Floor',
    capacity: 24,
    resources: ['Study Room', 'Whiteboard', 'Major: Hospitality Management'],
    createdBy: 1,
    createdAt: new Date('2024-08-15T13:00:00Z').toISOString()
  },
  {
    id: 121,
    name: 'Building 1 - Room 404',
    location: 'Building 1 - Fourth Floor',
    capacity: 30,
    resources: ['Collaboration Space', 'Smart Board', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-15T13:00:00Z').toISOString()
  },
  {
    id: 122,
    name: 'Building 2 - Room 401',
    location: 'Building 2 - Fourth Floor',
    capacity: 27,
    resources: ['Advanced Lab', 'Specialized Equipment', 'Major: Biomedical Engineering'],
    createdBy: 1,
    createdAt: new Date('2024-08-15T14:00:00Z').toISOString()
  },
  {
    id: 123,
    name: 'Building 2 - Room 402',
    location: 'Building 2 - Fourth Floor',
    capacity: 25,
    resources: ['Research Lab', 'Analysis Tools', 'Major: Environmental Science', 'Major: Biomedical Engineering'],
    createdBy: 1,
    createdAt: new Date('2024-08-15T14:00:00Z').toISOString()
  },
  {
    id: 124,
    name: 'Building 2 - Room 403',
    location: 'Building 2 - Fourth Floor',
    capacity: 29,
    resources: ['Computing Lab', 'Workstations', 'Major: Data Science', 'Major: Information Technology'],
    createdBy: 1,
    createdAt: new Date('2024-08-15T15:00:00Z').toISOString()
  },
  {
    id: 125,
    name: 'Building 2 - Room 404',
    location: 'Building 2 - Fourth Floor',
    capacity: 31,
    resources: ['Security Lab', 'Testing Environment', 'Major: Cybersecurity'],
    createdBy: 1,
    createdAt: new Date('2024-08-15T15:00:00Z').toISOString()
  },
  {
    id: 126,
    name: 'Building 3 - Room 401',
    location: 'Building 3 - Fourth Floor',
    capacity: 23,
    resources: ['Design Studio', 'Creative Tools', 'Major: Digital Media Design'],
    createdBy: 1,
    createdAt: new Date('2024-08-15T16:00:00Z').toISOString()
  },
  {
    id: 127,
    name: 'Building 3 - Room 402',
    location: 'Building 3 - Fourth Floor',
    capacity: 25,
    resources: ['Media Production', 'Recording Studio', 'Major: Digital Media Design', 'Major: Information Technology'],
    createdBy: 1,
    createdAt: new Date('2024-08-15T16:00:00Z').toISOString()
  },
  {
    id: 128,
    name: 'Building 3 - Room 403',
    location: 'Building 3 - Fourth Floor',
    capacity: 27,
    resources: ['Workshop Space', 'Design Equipment', 'Major: Digital Media Design', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-16T09:00:00Z').toISOString()
  },
  {
    id: 129,
    name: 'Building 3 - Room 404',
    location: 'Building 3 - Fourth Floor',
    capacity: 22,
    resources: ['Collaboration Room', 'Presentation Tools', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-16T09:00:00Z').toISOString()
  },
  {
    id: 130,
    name: 'Building 4 - Room 401',
    location: 'Building 4 - Fourth Floor',
    capacity: 32,
    resources: ['Large Lecture Hall', 'Multi-Media', 'Major: Business Administration', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-16T10:00:00Z').toISOString()
  },
  {
    id: 131,
    name: 'Building 4 - Room 402',
    location: 'Building 4 - Fourth Floor',
    capacity: 30,
    resources: ['Seminar Hall', 'Presentation Setup', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-16T10:00:00Z').toISOString()
  },
  {
    id: 132,
    name: 'Building 4 - Room 403',
    location: 'Building 4 - Fourth Floor',
    capacity: 28,
    resources: ['Conference Hall', 'Audio-Visual', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-16T11:00:00Z').toISOString()
  },
  {
    id: 133,
    name: 'Building 4 - Room 404',
    location: 'Building 4 - Fourth Floor',
    capacity: 34,
    resources: ['Lecture Theater', 'Stage Setup', 'Major: International Relations', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-16T11:00:00Z').toISOString()
  },
  {
    id: 134,
    name: 'Building 5 - Room 401',
    location: 'Building 5 - Fourth Floor',
    capacity: 28,
    resources: ['Advanced Science Lab', 'Research Equipment', 'Major: Biomedical Engineering'],
    createdBy: 1,
    createdAt: new Date('2024-08-16T12:00:00Z').toISOString()
  },
  {
    id: 135,
    name: 'Building 5 - Room 402',
    location: 'Building 5 - Fourth Floor',
    capacity: 26,
    resources: ['Biotech Lab', 'Specialized Instruments', 'Major: Biomedical Engineering', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-16T12:00:00Z').toISOString()
  },
  {
    id: 136,
    name: 'Building 5 - Room 403',
    location: 'Building 5 - Fourth Floor',
    capacity: 29,
    resources: ['Environmental Research Lab', 'Field Equipment', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-16T13:00:00Z').toISOString()
  },
  {
    id: 137,
    name: 'Building 5 - Room 404',
    location: 'Building 5 - Fourth Floor',
    capacity: 27,
    resources: ['Science Research Lab', 'Analysis Equipment', 'Major: Biomedical Engineering', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-16T13:00:00Z').toISOString()
  },
  {
    id: 138,
    name: 'Building 6 - Room 401',
    location: 'Building 6 - Fourth Floor',
    capacity: 31,
    resources: ['Advanced Computing Lab', 'High-Performance Systems', 'Major: Data Science', 'Major: Artificial Intelligence'],
    createdBy: 1,
    createdAt: new Date('2024-08-16T14:00:00Z').toISOString()
  },
  {
    id: 139,
    name: 'Building 6 - Room 402',
    location: 'Building 6 - Fourth Floor',
    capacity: 28,
    resources: ['Cyber Security Lab', 'Penetration Tools', 'Major: Cybersecurity'],
    createdBy: 1,
    createdAt: new Date('2024-08-16T14:00:00Z').toISOString()
  },
  {
    id: 140,
    name: 'Building 6 - Room 403',
    location: 'Building 6 - Fourth Floor',
    capacity: 30,
    resources: ['Network Lab', 'Infrastructure Setup', 'Major: Information Technology', 'Major: Cybersecurity'],
    createdBy: 1,
    createdAt: new Date('2024-08-16T15:00:00Z').toISOString()
  },
  {
    id: 141,
    name: 'Building 6 - Room 404',
    location: 'Building 6 - Fourth Floor',
    capacity: 29,
    resources: ['Data Analytics Lab', 'Visualization Tools', 'Major: Data Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-16T15:00:00Z').toISOString()
  },
  {
    id: 142,
    name: 'Building 7 - Room 401',
    location: 'Building 7 - Fourth Floor',
    capacity: 25,
    resources: ['Hospitality Training Lab', 'Service Equipment', 'Major: Hospitality Management'],
    createdBy: 1,
    createdAt: new Date('2024-08-16T16:00:00Z').toISOString()
  },
  {
    id: 143,
    name: 'Building 7 - Room 402',
    location: 'Building 7 - Fourth Floor',
    capacity: 23,
    resources: ['Event Management Space', 'Planning Tools', 'Major: Hospitality Management', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-16T16:00:00Z').toISOString()
  },
  {
    id: 144,
    name: 'Building 7 - Room 403',
    location: 'Building 7 - Fourth Floor',
    capacity: 26,
    resources: ['Culinary Training Lab', 'Kitchen Equipment', 'Major: Hospitality Management'],
    createdBy: 1,
    createdAt: new Date('2024-08-17T09:00:00Z').toISOString()
  },
  {
    id: 145,
    name: 'Building 7 - Room 404',
    location: 'Building 7 - Fourth Floor',
    capacity: 24,
    resources: ['Service Excellence Lab', 'Training Tools', 'Major: Hospitality Management'],
    createdBy: 1,
    createdAt: new Date('2024-08-17T09:00:00Z').toISOString()
  },
  {
    id: 146,
    name: 'Building 8 - Room 401',
    location: 'Building 8 - Fourth Floor',
    capacity: 32,
    resources: ['Advanced AI Lab', 'GPU Clusters', 'Major: Artificial Intelligence', 'Major: Data Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-17T10:00:00Z').toISOString()
  },
  {
    id: 147,
    name: 'Building 8 - Room 402',
    location: 'Building 8 - Fourth Floor',
    capacity: 30,
    resources: ['Machine Learning Research Lab', 'Neural Network Hardware', 'Major: Artificial Intelligence'],
    createdBy: 1,
    createdAt: new Date('2024-08-17T10:00:00Z').toISOString()
  },
  {
    id: 148,
    name: 'Building 8 - Room 403',
    location: 'Building 8 - Fourth Floor',
    capacity: 28,
    resources: ['Robotics Research Lab', 'Advanced Prototyping', 'Major: Artificial Intelligence', 'Major: Biomedical Engineering'],
    createdBy: 1,
    createdAt: new Date('2024-08-17T11:00:00Z').toISOString()
  },
  {
    id: 149,
    name: 'Building 8 - Room 404',
    location: 'Building 8 - Fourth Floor',
    capacity: 31,
    resources: ['AI Innovation Lab', 'Cutting-Edge Tools', 'Major: Artificial Intelligence', 'Major: Data Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-17T11:00:00Z').toISOString()
  },
  {
    id: 150,
    name: 'Building 9 - Room 401',
    location: 'Building 9 - Fourth Floor',
    capacity: 29,
    resources: ['Environmental Research Lab', 'Advanced Testing', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-17T12:00:00Z').toISOString()
  },
  {
    id: 151,
    name: 'Building 9 - Room 402',
    location: 'Building 9 - Fourth Floor',
    capacity: 26,
    resources: ['Climate Science Lab', 'Monitoring Systems', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-17T12:00:00Z').toISOString()
  },
  {
    id: 152,
    name: 'Building 9 - Room 403',
    location: 'Building 9 - Fourth Floor',
    capacity: 28,
    resources: ['Sustainability Research Lab', 'Analysis Equipment', 'Major: Environmental Science', 'Major: Biomedical Engineering'],
    createdBy: 1,
    createdAt: new Date('2024-08-17T13:00:00Z').toISOString()
  },
  {
    id: 153,
    name: 'Building 9 - Room 404',
    location: 'Building 9 - Fourth Floor',
    capacity: 30,
    resources: ['Renewable Energy Research Lab', 'Testing Equipment', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-17T13:00:00Z').toISOString()
  },
  {
    id: 154,
    name: 'Building 10 - Room 401',
    location: 'Building 10 - Fourth Floor',
    capacity: 27,
    resources: ['Multi-Purpose Room', 'Flexible Setup', 'Major: Business Administration', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-17T14:00:00Z').toISOString()
  },
  {
    id: 155,
    name: 'Building 10 - Room 402',
    location: 'Building 10 - Fourth Floor',
    capacity: 29,
    resources: ['Collaboration Room', 'Group Setup', 'Major: Digital Media Design', 'Major: Information Technology'],
    createdBy: 1,
    createdAt: new Date('2024-08-17T14:00:00Z').toISOString()
  },
  {
    id: 156,
    name: 'Building 10 - Room 403',
    location: 'Building 10 - Fourth Floor',
    capacity: 25,
    resources: ['Meeting Room', 'Presentation Tools', 'Major: International Relations', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-17T15:00:00Z').toISOString()
  },
  {
    id: 157,
    name: 'Building 10 - Room 404',
    location: 'Building 10 - Fourth Floor',
    capacity: 31,
    resources: ['Workshop Room', 'Adaptable Furniture', 'Major: Business Administration', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-17T15:00:00Z').toISOString()
  },
  {
    id: 158,
    name: 'Building 11 - Room 101',
    location: 'Building 11 - First Floor',
    capacity: 24,
    resources: ['General Purpose', 'Flexible Seating', 'Major: Business Administration', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-17T16:00:00Z').toISOString()
  },
  {
    id: 159,
    name: 'Building 11 - Room 102',
    location: 'Building 11 - First Floor',
    capacity: 26,
    resources: ['Study Space', 'Group Work Area', 'Major: Digital Media Design', 'Major: Information Technology'],
    createdBy: 1,
    createdAt: new Date('2024-08-17T16:00:00Z').toISOString()
  },
  {
    id: 160,
    name: 'Building 11 - Room 103',
    location: 'Building 11 - First Floor',
    capacity: 28,
    resources: ['Collaboration Space', 'Whiteboard', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-18T09:00:00Z').toISOString()
  },
  {
    id: 161,
    name: 'Building 11 - Room 104',
    location: 'Building 11 - First Floor',
    capacity: 25,
    resources: ['Meeting Room', 'Presentation Setup', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-18T09:00:00Z').toISOString()
  },
  {
    id: 162,
    name: 'Building 11 - Room 201',
    location: 'Building 11 - Second Floor',
    capacity: 30,
    resources: ['Seminar Room', 'Smart Board', 'Major: Business Administration', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-18T10:00:00Z').toISOString()
  },
  {
    id: 163,
    name: 'Building 11 - Room 202',
    location: 'Building 11 - Second Floor',
    capacity: 27,
    resources: ['Conference Room', 'Video Equipment', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-18T10:00:00Z').toISOString()
  },
  {
    id: 164,
    name: 'Building 11 - Room 203',
    location: 'Building 11 - Second Floor',
    capacity: 29,
    resources: ['Workshop Space', 'Flexible Layout', 'Major: Digital Media Design', 'Major: Information Technology'],
    createdBy: 1,
    createdAt: new Date('2024-08-18T11:00:00Z').toISOString()
  },
  {
    id: 165,
    name: 'Building 11 - Room 204',
    location: 'Building 11 - Second Floor',
    capacity: 26,
    resources: ['Study Lab', 'Quiet Space', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-18T11:00:00Z').toISOString()
  },
  {
    id: 166,
    name: 'Building 11 - Room 301',
    location: 'Building 11 - Third Floor',
    capacity: 28,
    resources: ['Lecture Room', 'Projector Setup', 'Major: International Relations', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-18T12:00:00Z').toISOString()
  },
  {
    id: 167,
    name: 'Building 11 - Room 302',
    location: 'Building 11 - Third Floor',
    capacity: 32,
    resources: ['Large Classroom', 'Audio-Visual', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-18T12:00:00Z').toISOString()
  },
  {
    id: 168,
    name: 'Building 11 - Room 303',
    location: 'Building 11 - Third Floor',
    capacity: 25,
    resources: ['Small Group Room', 'Collaboration Tools', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-18T13:00:00Z').toISOString()
  },
  {
    id: 169,
    name: 'Building 11 - Room 304',
    location: 'Building 11 - Third Floor',
    capacity: 30,
    resources: ['Multi-Purpose Hall', 'Flexible Setup', 'Major: Business Administration', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-18T13:00:00Z').toISOString()
  },
  {
    id: 170,
    name: 'Building 12 - Room 101',
    location: 'Building 12 - First Floor',
    capacity: 22,
    resources: ['Lab Space', 'Basic Equipment', 'Major: Biomedical Engineering', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-18T14:00:00Z').toISOString()
  },
  {
    id: 171,
    name: 'Building 12 - Room 102',
    location: 'Building 12 - First Floor',
    capacity: 24,
    resources: ['Science Lab', 'Safety Stations', 'Major: Biomedical Engineering'],
    createdBy: 1,
    createdAt: new Date('2024-08-18T14:00:00Z').toISOString()
  },
  {
    id: 172,
    name: 'Building 12 - Room 103',
    location: 'Building 12 - First Floor',
    capacity: 26,
    resources: ['Computer Lab', 'Workstations', 'Major: Data Science', 'Major: Information Technology'],
    createdBy: 1,
    createdAt: new Date('2024-08-18T15:00:00Z').toISOString()
  },
  {
    id: 173,
    name: 'Building 12 - Room 104',
    location: 'Building 12 - First Floor',
    capacity: 28,
    resources: ['Programming Lab', 'Development Tools', 'Major: Cybersecurity', 'Major: Information Technology'],
    createdBy: 1,
    createdAt: new Date('2024-08-18T15:00:00Z').toISOString()
  },
  {
    id: 174,
    name: 'Building 12 - Room 201',
    location: 'Building 12 - Second Floor',
    capacity: 30,
    resources: ['Advanced Lab', 'Specialized Equipment', 'Major: Biomedical Engineering', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-18T16:00:00Z').toISOString()
  },
  {
    id: 175,
    name: 'Building 12 - Room 202',
    location: 'Building 12 - Second Floor',
    capacity: 27,
    resources: ['Research Lab', 'Analysis Tools', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-18T16:00:00Z').toISOString()
  },
  {
    id: 176,
    name: 'Building 12 - Room 203',
    location: 'Building 12 - Second Floor',
    capacity: 29,
    resources: ['Data Lab', 'Computing Resources', 'Major: Data Science', 'Major: Artificial Intelligence'],
    createdBy: 1,
    createdAt: new Date('2024-08-19T09:00:00Z').toISOString()
  },
  {
    id: 177,
    name: 'Building 12 - Room 204',
    location: 'Building 12 - Second Floor',
    capacity: 31,
    resources: ['Security Lab', 'Network Equipment', 'Major: Cybersecurity'],
    createdBy: 1,
    createdAt: new Date('2024-08-19T09:00:00Z').toISOString()
  },
  {
    id: 178,
    name: 'Building 12 - Room 301',
    location: 'Building 12 - Third Floor',
    capacity: 25,
    resources: ['Biotech Lab', 'Specialized Instruments', 'Major: Biomedical Engineering'],
    createdBy: 1,
    createdAt: new Date('2024-08-19T10:00:00Z').toISOString()
  },
  {
    id: 179,
    name: 'Building 12 - Room 302',
    location: 'Building 12 - Third Floor',
    capacity: 28,
    resources: ['Environmental Testing Lab', 'Field Equipment', 'Major: Environmental Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-19T10:00:00Z').toISOString()
  },
  {
    id: 180,
    name: 'Building 12 - Room 303',
    location: 'Building 12 - Third Floor',
    capacity: 26,
    resources: ['Big Data Lab', 'Analytics Tools', 'Major: Data Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-19T11:00:00Z').toISOString()
  },
  {
    id: 181,
    name: 'Building 12 - Room 304',
    location: 'Building 12 - Third Floor',
    capacity: 30,
    resources: ['Network Lab', 'Infrastructure Tools', 'Major: Information Technology', 'Major: Cybersecurity'],
    createdBy: 1,
    createdAt: new Date('2024-08-19T11:00:00Z').toISOString()
  },
  {
    id: 182,
    name: 'Building 13 - Room 101',
    location: 'Building 13 - First Floor',
    capacity: 23,
    resources: ['Design Studio', 'Creative Space', 'Major: Digital Media Design'],
    createdBy: 1,
    createdAt: new Date('2024-08-19T12:00:00Z').toISOString()
  },
  {
    id: 183,
    name: 'Building 13 - Room 102',
    location: 'Building 13 - First Floor',
    capacity: 25,
    resources: ['Media Lab', 'Recording Equipment', 'Major: Digital Media Design', 'Major: Information Technology'],
    createdBy: 1,
    createdAt: new Date('2024-08-19T12:00:00Z').toISOString()
  },
  {
    id: 184,
    name: 'Building 13 - Room 103',
    location: 'Building 13 - First Floor',
    capacity: 27,
    resources: ['Art Studio', 'Creative Tools', 'Major: Digital Media Design'],
    createdBy: 1,
    createdAt: new Date('2024-08-19T13:00:00Z').toISOString()
  },
  {
    id: 185,
    name: 'Building 13 - Room 104',
    location: 'Building 13 - First Floor',
    capacity: 24,
    resources: ['Workshop Space', 'Design Equipment', 'Major: Digital Media Design', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-19T13:00:00Z').toISOString()
  },
  {
    id: 186,
    name: 'Building 13 - Room 201',
    location: 'Building 13 - Second Floor',
    capacity: 29,
    resources: ['Design Lab', 'Digital Tablets', 'Major: Digital Media Design'],
    createdBy: 1,
    createdAt: new Date('2024-08-19T14:00:00Z').toISOString()
  },
  {
    id: 187,
    name: 'Building 13 - Room 202',
    location: 'Building 13 - Second Floor',
    capacity: 26,
    resources: ['Production Studio', 'Video Equipment', 'Major: Digital Media Design', 'Major: Information Technology'],
    createdBy: 1,
    createdAt: new Date('2024-08-19T14:00:00Z').toISOString()
  },
  {
    id: 188,
    name: 'Building 13 - Room 203',
    location: 'Building 13 - Second Floor',
    capacity: 28,
    resources: ['Creative Workshop', 'Art Supplies', 'Major: Digital Media Design'],
    createdBy: 1,
    createdAt: new Date('2024-08-19T15:00:00Z').toISOString()
  },
  {
    id: 189,
    name: 'Building 13 - Room 204',
    location: 'Building 13 - Second Floor',
    capacity: 31,
    resources: ['Media Production Lab', 'Recording Studio', 'Major: Digital Media Design'],
    createdBy: 1,
    createdAt: new Date('2024-08-19T15:00:00Z').toISOString()
  },
  {
    id: 190,
    name: 'Building 13 - Room 301',
    location: 'Building 13 - Third Floor',
    capacity: 24,
    resources: ['Design Innovation Lab', 'Advanced Tools', 'Major: Digital Media Design'],
    createdBy: 1,
    createdAt: new Date('2024-08-19T16:00:00Z').toISOString()
  },
  {
    id: 191,
    name: 'Building 13 - Room 302',
    location: 'Building 13 - Third Floor',
    capacity: 27,
    resources: ['Digital Media Studio', 'Creative Equipment', 'Major: Digital Media Design', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-19T16:00:00Z').toISOString()
  },
  {
    id: 192,
    name: 'Building 13 - Room 303',
    location: 'Building 13 - Third Floor',
    capacity: 25,
    resources: ['Visual Design Lab', 'Graphics Tools', 'Major: Digital Media Design'],
    createdBy: 1,
    createdAt: new Date('2024-08-20T09:00:00Z').toISOString()
  },
  {
    id: 193,
    name: 'Building 13 - Room 304',
    location: 'Building 13 - Third Floor',
    capacity: 30,
    resources: ['Multimedia Lab', 'Production Tools', 'Major: Digital Media Design', 'Major: Information Technology'],
    createdBy: 1,
    createdAt: new Date('2024-08-20T09:00:00Z').toISOString()
  },
  {
    id: 194,
    name: 'Building 14 - Room 101',
    location: 'Building 14 - First Floor',
    capacity: 32,
    resources: ['AI Research Lab', 'GPU Workstations', 'Major: Artificial Intelligence', 'Major: Data Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-20T10:00:00Z').toISOString()
  },
  {
    id: 195,
    name: 'Building 14 - Room 102',
    location: 'Building 14 - First Floor',
    capacity: 28,
    resources: ['Machine Learning Lab', 'Data Processing', 'Major: Artificial Intelligence', 'Major: Data Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-20T10:00:00Z').toISOString()
  },
  {
    id: 196,
    name: 'Building 14 - Room 103',
    location: 'Building 14 - First Floor',
    capacity: 30,
    resources: ['Robotics Lab', 'Prototyping Tools', 'Major: Artificial Intelligence', 'Major: Biomedical Engineering'],
    createdBy: 1,
    createdAt: new Date('2024-08-20T11:00:00Z').toISOString()
  },
  {
    id: 197,
    name: 'Building 14 - Room 104',
    location: 'Building 14 - First Floor',
    capacity: 29,
    resources: ['Deep Learning Lab', 'Neural Networks', 'Major: Artificial Intelligence'],
    createdBy: 1,
    createdAt: new Date('2024-08-20T11:00:00Z').toISOString()
  },
  {
    id: 198,
    name: 'Building 14 - Room 201',
    location: 'Building 14 - Second Floor',
    capacity: 31,
    resources: ['Computer Vision Lab', 'Image Processing', 'Major: Artificial Intelligence'],
    createdBy: 1,
    createdAt: new Date('2024-08-20T12:00:00Z').toISOString()
  },
  {
    id: 199,
    name: 'Building 14 - Room 202',
    location: 'Building 14 - Second Floor',
    capacity: 27,
    resources: ['NLP Lab', 'Language Processing', 'Major: Artificial Intelligence', 'Major: Data Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-20T12:00:00Z').toISOString()
  },
  {
    id: 200,
    name: 'Building 14 - Room 203',
    location: 'Building 14 - Second Floor',
    capacity: 33,
    resources: ['Autonomous Systems Lab', 'Sensor Equipment', 'Major: Artificial Intelligence', 'Major: Biomedical Engineering'],
    createdBy: 1,
    createdAt: new Date('2024-08-20T13:00:00Z').toISOString()
  },
  {
    id: 201,
    name: 'Building 14 - Room 204',
    location: 'Building 14 - Second Floor',
    capacity: 28,
    resources: ['AI Innovation Lab', 'Advanced Computing', 'Major: Artificial Intelligence'],
    createdBy: 1,
    createdAt: new Date('2024-08-20T13:00:00Z').toISOString()
  },
  {
    id: 202,
    name: 'Building 14 - Room 301',
    location: 'Building 14 - Third Floor',
    capacity: 30,
    resources: ['AI Research Center', 'High-Performance Computing', 'Major: Artificial Intelligence', 'Major: Data Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-20T14:00:00Z').toISOString()
  },
  {
    id: 203,
    name: 'Building 14 - Room 302',
    location: 'Building 14 - Third Floor',
    capacity: 32,
    resources: ['Machine Learning Research Lab', 'GPU Clusters', 'Major: Artificial Intelligence'],
    createdBy: 1,
    createdAt: new Date('2024-08-20T14:00:00Z').toISOString()
  },
  {
    id: 204,
    name: 'Building 14 - Room 303',
    location: 'Building 14 - Third Floor',
    capacity: 29,
    resources: ['Robotics Research Lab', 'Advanced Prototyping', 'Major: Artificial Intelligence', 'Major: Biomedical Engineering'],
    createdBy: 1,
    createdAt: new Date('2024-08-20T15:00:00Z').toISOString()
  },
  {
    id: 205,
    name: 'Building 14 - Room 304',
    location: 'Building 14 - Third Floor',
    capacity: 31,
    resources: ['AI Development Lab', 'Cutting-Edge Tools', 'Major: Artificial Intelligence', 'Major: Data Science'],
    createdBy: 1,
    createdAt: new Date('2024-08-20T15:00:00Z').toISOString()
  },
  {
    id: 206,
    name: 'Building 15 - Room 101',
    location: 'Building 15 - First Floor',
    capacity: 24,
    resources: ['General Purpose Classroom', 'Flexible Seating', 'Major: Business Administration', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-20T16:00:00Z').toISOString()
  },
  {
    id: 207,
    name: 'Building 15 - Room 102',
    location: 'Building 15 - First Floor',
    capacity: 26,
    resources: ['Study Space', 'Group Work Area', 'Major: Digital Media Design', 'Major: Information Technology'],
    createdBy: 1,
    createdAt: new Date('2024-08-20T16:00:00Z').toISOString()
  },
  {
    id: 208,
    name: 'Building 15 - Room 103',
    location: 'Building 15 - First Floor',
    capacity: 28,
    resources: ['Collaboration Room', 'Whiteboard', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-21T09:00:00Z').toISOString()
  },
  {
    id: 209,
    name: 'Building 15 - Room 104',
    location: 'Building 15 - First Floor',
    capacity: 25,
    resources: ['Meeting Room', 'Presentation Tools', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-21T09:00:00Z').toISOString()
  },
  {
    id: 210,
    name: 'Building 15 - Room 201',
    location: 'Building 15 - Second Floor',
    capacity: 30,
    resources: ['Seminar Room', 'Smart Board', 'Major: Business Administration', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-21T10:00:00Z').toISOString()
  },
  {
    id: 211,
    name: 'Building 15 - Room 202',
    location: 'Building 15 - Second Floor',
    capacity: 27,
    resources: ['Conference Room', 'Video Equipment', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-21T10:00:00Z').toISOString()
  },
  {
    id: 212,
    name: 'Building 15 - Room 203',
    location: 'Building 15 - Second Floor',
    capacity: 29,
    resources: ['Workshop Space', 'Flexible Layout', 'Major: Digital Media Design', 'Major: Information Technology'],
    createdBy: 1,
    createdAt: new Date('2024-08-21T11:00:00Z').toISOString()
  },
  {
    id: 213,
    name: 'Building 15 - Room 204',
    location: 'Building 15 - Second Floor',
    capacity: 32,
    resources: ['Large Classroom', 'Multi-Purpose', 'Major: Business Administration', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-21T11:00:00Z').toISOString()
  },
  {
    id: 214,
    name: 'Building 15 - Room 301',
    location: 'Building 15 - Third Floor',
    capacity: 28,
    resources: ['Lecture Hall', 'Projector Setup', 'Major: International Relations', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-21T12:00:00Z').toISOString()
  },
  {
    id: 215,
    name: 'Building 15 - Room 302',
    location: 'Building 15 - Third Floor',
    capacity: 31,
    resources: ['Presentation Hall', 'Audio-Visual', 'Major: Business Administration'],
    createdBy: 1,
    createdAt: new Date('2024-08-21T12:00:00Z').toISOString()
  },
  {
    id: 216,
    name: 'Building 15 - Room 303',
    location: 'Building 15 - Third Floor',
    capacity: 25,
    resources: ['Small Group Room', 'Collaboration Tools', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-21T13:00:00Z').toISOString()
  },
  {
    id: 217,
    name: 'Building 15 - Room 304',
    location: 'Building 15 - Third Floor',
    capacity: 30,
    resources: ['Multi-Purpose Hall', 'Flexible Setup', 'Major: Business Administration', 'Major: International Relations'],
    createdBy: 1,
    createdAt: new Date('2024-08-21T13:00:00Z').toISOString()
  }
];

export const fallbackClassroomEnrollments: ClassroomEnrollment[] = [
  {
    id: 1,
    studentId: 1,
    classroomId: 1,
    status: 'enrolled',
    registeredAt: new Date('2024-08-22T15:30:00Z').toISOString()
  },
  {
    id: 2,
    studentId: 2,
    classroomId: 3,
    status: 'enrolled',
    registeredAt: new Date('2024-08-23T10:15:00Z').toISOString()
  }
];

export const fallbackFeePayments: FeePayment[] = [
  {
    id: 1,
    studentId: 1,
    amount: 1200,
    description: 'Global Health Innovation Lab - Registration Fee',
    status: 'pending',
    receivedBy: null,
    receivedAt: '2024-08-20T00:00:00Z',
    dueDate: '2024-09-15T00:00:00Z'
  },
  {
    id: 2,
    studentId: 1,
    amount: 850,
    description: 'Neuroscience Frontiers - Class Fee',
    status: 'pending',
    receivedBy: null,
    receivedAt: '2024-08-20T00:00:00Z',
    dueDate: '2024-09-15T00:00:00Z'
  },
  {
    id: 3,
    studentId: 2,
    amount: 1500,
    description: 'Advanced Data Ethics - Registration Fee',
    status: 'pending',
    receivedBy: null,
    receivedAt: '2024-08-21T00:00:00Z',
    dueDate: '2024-09-15T00:00:00Z'
  },
  {
    id: 4,
    studentId: 2,
    amount: 1800,
    description: 'Immersive Visualization Studio - Class Fee',
    status: 'paid',
    receivedBy: 3,
    receivedAt: '2024-08-21T13:45:00Z',
    dueDate: '2024-09-15T00:00:00Z'
  },
  {
    id: 5,
    studentId: 2,
    amount: 450,
    description: 'Student Wellness Pass',
    status: 'pending',
    receivedBy: null,
    receivedAt: '2024-08-25T00:00:00Z',
    dueDate: '2024-09-10T00:00:00Z'
  }
];

export const fallbackGrades: GradeRecord[] = [
  {
    id: 1,
    studentId: 1,
    courseCode: 'BIOE-521',
    courseTitle: 'Advanced Bioinstrumentation',
    semester: 'Spring 2024',
    grade: 'A',
    credits: 3,
    recordedBy: 2,
    recordedAt: '2024-05-10T15:00:00Z'
  },
  {
    id: 2,
    studentId: 1,
    courseCode: 'CHEM-540',
    courseTitle: 'Organic Synthesis Lab',
    semester: 'Spring 2024',
    grade: 'A-',
    credits: 4,
    recordedBy: 2,
    recordedAt: '2024-05-10T15:05:00Z'
  },
  {
    id: 3,
    studentId: 2,
    courseCode: 'DATA-610',
    courseTitle: 'Bayesian Machine Learning',
    semester: 'Spring 2024',
    grade: 'A',
    credits: 3,
    recordedBy: 2,
    recordedAt: '2024-05-12T14:40:00Z'
  },
  {
    id: 4,
    studentId: 2,
    courseCode: 'STAT-575',
    courseTitle: 'Responsible AI Fieldwork',
    semester: 'Spring 2024',
    grade: 'A-',
    credits: 2,
    recordedBy: 2,
    recordedAt: '2024-05-12T14:45:00Z'
  }
];

export const fallbackExamAnnouncements: ExamAnnouncement[] = [
  {
    id: 1,
    title: 'Fall 2024 Midterm Week',
    description:
      'Midterm examinations for all core courses will take place between October 14-18. Detailed schedules will be shared in course portals.',
    examDate: '2024-10-14T13:00:00Z',
    postedBy: 1,
    createdAt: '2024-08-18T10:00:00Z'
  },
  {
    id: 2,
    title: 'Capstone Final Presentations',
    description: 'Capstone cohorts will present their final projects on December 5 in the Innovation Hub.',
    examDate: '2024-12-05T15:00:00Z',
    postedBy: 1,
    createdAt: '2024-08-22T09:30:00Z'
  }
];

export const fallbackSemesterGpa: SemesterGpa[] = [
  {
    id: 1,
    studentId: 1,
    semester: 'Fall 2023',
    gpa: 3.72
  },
  {
    id: 2,
    studentId: 1,
    semester: 'Spring 2024',
    gpa: 3.88
  },
  {
    id: 3,
    studentId: 2,
    semester: 'Fall 2023',
    gpa: 3.65
  },
  {
    id: 4,
    studentId: 2,
    semester: 'Spring 2024',
    gpa: 3.74
  }
];

export const fallbackRegistrationWindows: SemesterRegistration[] = [
  {
    id: 1,
    semester: 'Fall 2024',
    status: 'open',
    opensAt: '2024-08-10T12:00:00Z',
    closesAt: '2024-09-10T23:59:59Z',
    courses: [
      {
        courseCode: 'BIOE-630',
        courseTitle: 'Neural Interface Design',
        instructor: 'Dr. Priya Raman',
        credits: 3
      },
      {
        courseCode: 'DATA-720',
        courseTitle: 'Responsible AI Systems',
        instructor: 'Professor Malik Chen',
        credits: 4
      }
    ]
  },
  {
    id: 2,
    semester: 'Spring 2025',
    status: 'upcoming',
    opensAt: '2024-11-15T12:00:00Z',
    closesAt: '2025-01-10T23:59:59Z',
    courses: [
      {
        courseCode: 'BIOE-650',
        courseTitle: 'Biomechatronics Studio',
        instructor: 'Dr. Leila Morgan',
        credits: 4
      },
      {
        courseCode: 'DATA-755',
        courseTitle: 'Immersive Analytics Workshop',
        instructor: 'Professor Aaron Patel',
        credits: 3
      }
    ]
  }
];

export const fallbackTeachingAssignments: TeachingAssignment[] = [
  {
    id: 1,
    teacherId: 2,
    classroomId: 1,
    courseCode: 'BIOE-521',
    courseTitle: 'Advanced Bioinstrumentation',
    weekday: 'Monday',
    startTime: '09:00',
    endTime: '10:15',
    studentGroup: 'Biomedical Cohort A',
    majorFocus: 'Biomedical Engineering',
    semester: '1/2026',
    assignedBy: 1,
    assignedAt: '2024-08-08T14:00:00Z'
  },
  {
    id: 2,
    teacherId: 2,
    classroomId: 3,
    courseCode: 'DATA-610',
    courseTitle: 'Bayesian Machine Learning',
    weekday: 'Wednesday',
    startTime: '13:00',
    endTime: '14:15',
    studentGroup: 'Data Science Scholars',
    majorFocus: 'Data Science',
    semester: '1/2026',
    assignedBy: 1,
    assignedAt: '2024-08-08T14:30:00Z'
  },
  {
    id: 3,
    teacherId: 2,
    classroomId: 2,
    courseCode: 'CHEM-540',
    courseTitle: 'Organic Synthesis Lab',
    weekday: 'Thursday',
    startTime: '14:30',
    endTime: '16:00',
    studentGroup: 'Advanced Chem Labs',
    majorFocus: 'Environmental Science',
    semester: '1/2026',
    assignedBy: 1,
    assignedAt: '2024-08-08T15:00:00Z'
  }
];

export const fallbackTeacherRosters: TeacherRosterEntry[] = [
  {
    id: 1,
    teacherId: 2,
    courseCode: 'BIOE-521',
    courseTitle: 'Advanced Bioinstrumentation',
    studentId: 1,
    status: 'enrolled'
  },
  {
    id: 2,
    teacherId: 2,
    courseCode: 'CHEM-540',
    courseTitle: 'Organic Synthesis Lab',
    studentId: 1,
    status: 'enrolled'
  },
  {
    id: 3,
    teacherId: 2,
    courseCode: 'DATA-610',
    courseTitle: 'Bayesian Machine Learning',
    studentId: 2,
    status: 'enrolled'
  },
  {
    id: 4,
    teacherId: 2,
    courseCode: 'STAT-575',
    courseTitle: 'Responsible AI Fieldwork',
    studentId: 2,
    status: 'waitlisted'
  }
];

export const fallbackTeacherFocusTags: Record<number, string[]> = {
  2: ['Research-led teaching', 'Precision grading', 'Cross-campus scheduling']
};
