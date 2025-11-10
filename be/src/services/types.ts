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
  selectedSubjects?: string[];
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
  semester?: string;
  credits?: number;
  confirmedBy?: number | null;
};

export type StudentDashboardData = {
  student: Student;
  timetable: TimetableEntry[];
  schedule: ScheduleItem[];
  registrations: ClassRegistration[];
  classroomEnrollments: ClassroomEnrollment[];
  grades: GradeRecord[];
  upcomingExams: ExamAnnouncement[];
  gpaBySemester: SemesterGpa[];
  registrationWindows: SemesterRegistration[];
  fees: FeePayment[];
  assignments: Array<{
    id: number;
    teacherId: number;
    teacherName?: string | null;
    courseCode: string;
    courseTitle: string;
    title: string;
    description: string | null;
    dueDate: string;
    maxPoints: number | null;
    assignmentType: 'homework' | 'project' | 'quiz' | 'exam' | 'other';
    createdAt: string;
    updatedAt: string;
  }>;
};

export type CreateStudentInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: string;
  primaryInterest: string;
  selectedSubjects?: string[];
};

export type StaffRole = 'IT_ADMIN' | 'TEACHER' | 'STUDENT_ADMIN';

export type StaffAccount = {
  id: number;
  displayName: string;
  email: string;
  role: StaffRole;
  createdAt: string;
};

export type Classroom = {
  id: number;
  name: string;
  location: string;
  capacity: number;
  resources: string[];
  createdBy: number | null;
  createdAt: string;
  focusAreas?: string[];
};

export type ClassroomEnrollmentStatus = 'enrolled' | 'waitlisted';

export type ClassroomEnrollment = {
  id: number;
  studentId: number;
  classroomId: number;
  status: ClassroomEnrollmentStatus;
  registeredAt: string;
};

export type ClassroomCourse = {
  courseCode: string;
  courseTitle: string;
  weekday: string;
  startTime: string;
  endTime: string;
  majorFocus: string;
  teacherName?: string | null;
  isRegistered?: boolean; // True if student is registered for this specific course
  sameSubjectRegistered?: boolean; // True if student is registered for same course code at different time
  seatsFilled?: number; // Number of students enrolled in THIS specific course (not the whole classroom)
  seatsAvailable?: number; // Seats available for THIS specific course
  isFull?: boolean; // True if THIS specific course is full
};

export type ClassroomAvailability = Classroom & {
  seatsFilled: number;
  seatsAvailable: number;
  isFull: boolean;
  courses?: ClassroomCourse[];
};

export type FeePayment = {
  id: number;
  studentId: number;
  amount: number;
  description: string | null;
  status: 'pending' | 'paid';
  receivedBy: number | null;
  receivedAt: string;
  dueDate: string | null;
};

export type GradeRecord = {
  id: number;
  studentId: number;
  courseCode: string;
  courseTitle: string;
  semester: string;
  grade: string;
  credits: number;
  recordedBy?: number | null;
  recordedAt?: string;
};

export type ExamAnnouncement = {
  id: number;
  title: string;
  description: string;
  examDate: string;
  postedBy: number | null;
  createdAt: string;
};

export type SemesterGpa = {
  id: number;
  studentId: number;
  semester: string;
  gpa: number;
};

export type SemesterRegistrationCourse = {
  courseCode: string;
  courseTitle: string;
  instructor: string;
  credits: number;
};

export type SemesterRegistration = {
  id: number;
  semester: string;
  status: 'upcoming' | 'open' | 'closed';
  opensAt: string;
  closesAt: string;
  courses: SemesterRegistrationCourse[];
};

export type TeachingAssignment = {
  id: number;
  teacherId: number;
  classroomId: number;
  courseCode: string;
  courseTitle: string;
  weekday: string;
  startTime: string;
  endTime: string;
  studentGroup: string;
  majorFocus: string;
  semester: string;
  assignedBy: number | null;
  assignedAt: string;
};

export type TeacherScheduleSlot = {
  assignmentId: number;
  teacherId: number;
  courseCode: string;
  courseTitle: string;
  weekday: string;
  startTime: string;
  endTime: string;
  classroomName: string;
  classroomLocation: string;
  studentGroup: string;
  majorFocus: string;
};

export type TeacherRosterEntry = {
  id: number;
  teacherId: number;
  courseCode: string;
  courseTitle: string;
  studentId: number;
  status: 'enrolled' | 'waitlisted';
};

export type TeacherDashboardData = {
  teacher: StaffAccount;
  schedule: TeacherScheduleSlot[];
  rosters: Array<{
    courseCode: string;
    courseTitle: string;
    studentId: number;
    studentName: string;
    status: 'enrolled' | 'waitlisted';
  }>;
  recentGrades: GradeRecord[];
  focusTags: string[];
};
