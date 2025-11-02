export type Feature = {
  id: number;
  name: string;
  description: string;
  category: string;
  icon: string;
};

export type Student = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string | null;
  primaryInterest: string | null;
  createdAt: string;
};

export type TimetableEntry = {
  id: number;
  studentId: number;
  weekday: string;
  startTime: string;
  endTime: string;
  subject: string;
  location: string | null;
};

export type ScheduleItem = {
  id: number;
  studentId: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
};

export type ClassRegistration = {
  id: number;
  studentId: number;
  className: string;
  instructor: string | null;
  status: string;
  registeredAt: string;
};

export type StudentDashboardData = {
  student: Student;
  timetable: TimetableEntry[];
  schedule: ScheduleItem[];
  registrations: ClassRegistration[];
};

export type CreateStudentInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: string;
  primaryInterest?: string;
};

export type StaffRole = 'IT_ADMIN' | 'TEACHER' | 'STUDENT_ADMIN';

export type StaffAccount = {
  id: number;
  displayName: string;
  email: string;
  role: StaffRole;
  createdAt: string;
};
