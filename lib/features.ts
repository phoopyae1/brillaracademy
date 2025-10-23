export type Feature = {
  id: number;
  name: string;
  description: string;
  category: string;
  icon: string;
};

export const fallbackFeatures: Feature[] = [
  {
    id: 1,
    name: 'Authentication & Profile',
    description: 'Secure sign-in, profile management, and multi-factor authentication to protect every student account.',
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
