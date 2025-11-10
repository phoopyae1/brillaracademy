import { fallbackFeatures, type Feature } from '@/lib/features';

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

export type StudentAssignment = {
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
};

export type StudentDashboardData = {
  student: Student;
  timetable: Array<{
    id: number;
    studentId: number;
    weekday: string;
    startTime: string;
    endTime: string;
    subject: string;
    location: string | null;
  }>;
  schedule: Array<{
    id: number;
    studentId: number;
    title: string;
    description: string | null;
    startTime: string;
    endTime: string;
  }>;
  registrations: Array<{
    id: number;
    studentId: number;
    className: string;
    instructor: string | null;
    status: string;
    registeredAt: string;
    semester?: string;
    credits?: number;
    confirmedBy?: number | null;
  }>;
  classroomEnrollments: ClassroomEnrollment[];
  grades: GradeRecord[];
  upcomingExams: ExamAnnouncement[];
  gpaBySemester: SemesterGpa[];
  registrationWindows: SemesterRegistration[];
  fees: FeePayment[];
  assignments: StudentAssignment[];
};

export type StaffAccount = {
  id: number;
  displayName: string;
  email: string;
  role: 'IT_ADMIN' | 'TEACHER' | 'STUDENT_ADMIN';
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

export type ClassroomEnrollment = {
  id: number;
  classroomId: number;
  studentId: number;
  status: 'enrolled' | 'waitlisted';
  registeredAt: string;
};

export type MajorSubjectCatalogEntry = {
  major: string;
  subjects: string[];
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

export type TeacherRosterStudent = {
  courseCode: string;
  courseTitle: string;
  studentId: number;
  studentName: string;
  status: 'enrolled' | 'waitlisted';
};

export type TeacherDashboard = {
  teacher: StaffAccount;
  schedule: TeacherScheduleSlot[];
  rosters: TeacherRosterStudent[];
  recentGrades: GradeRecord[];
  focusTags: string[];
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
  classroomName?: string;
  classroomLocation?: string;
  teacherName?: string;
};

export type Announcement = {
  id: number;
  title: string;
  content: string;
  type: 'announcement' | 'event';
  eventDate?: string | null;
  postedBy: number | null;
  createdAt: string;
  postedByName?: string | null;
};

const DEFAULT_API_BASE_URL = 'http://localhost:4000/api';

export async function getCurrentSemester(token: string): Promise<string> {
  const data = await apiRequest<{ currentSemester: string }>('/system/settings/current-semester', {
    method: 'GET',
    token
  });
  return data.currentSemester || '1/2026';
}

export async function updateCurrentSemester(token: string, semester: string): Promise<string> {
  const data = await apiRequest<{ currentSemester: string; message: string }>('/system/settings/current-semester', {
    method: 'PUT',
    body: { semester },
    token
  });
  return data.currentSemester;
}

function resolveApiBaseUrl() {
  if (typeof window === 'undefined') {
    return process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
  }

  return process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
  cache?: RequestCache;
  next?: RequestInit['next'];
};

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = resolveApiBaseUrl().replace(/\/$/, '');
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers();

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    method: options.method ?? (body ? 'POST' : 'GET'),
    body,
    headers,
    cache: options.cache ?? 'no-store',
    next: options.next
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = (payload as { error?: string })?.error ?? 'Request failed.';
    throw new Error(message);
  }

  return payload as T;
}

export async function fetchFeatures(): Promise<Feature[]> {
  try {
    const data = await apiRequest<{ features?: Feature[] }>('/features', { next: { revalidate: 60 } });
    return data.features?.length ? data.features : fallbackFeatures;
  } catch (error) {
    console.warn('Falling back to static features', error);
    return fallbackFeatures;
  }
}

export async function authenticateStudent(email: string, password: string): Promise<{ student: Student; accessToken: string } | null> {
  try {
    const data = await apiRequest<{ student?: Student; accessToken?: string }>('/login', {
      method: 'POST',
      body: { email, password }
    });

    if (!data.student || !data.accessToken) {
      return null;
    }

    return { student: data.student, accessToken: data.accessToken };
  } catch (error) {
    console.error('Student authentication failed', error);
    return null;
  }
}

export async function fetchStudentDashboard(studentId: number): Promise<StudentDashboardData | null> {
  if (!Number.isFinite(studentId)) {
    return null;
  }

  try {
    const data = await apiRequest<{ dashboard?: StudentDashboardData }>(`/students/${studentId}/dashboard`, {
      cache: 'no-store'
    });

    return data.dashboard ?? null;
  } catch (error) {
    console.error('Failed to fetch dashboard', error);
    return null;
  }
}

export async function listStudents(token?: string): Promise<Student[]> {
  try {
    const path = token ? '/students' : '/students/public/all';
    const data = await apiRequest<{ students?: Student[] | Array<Omit<Student, 'email'>> }>(path, {
      token
    });

    return (data.students as Student[]) ?? [];
  } catch (error) {
    console.error('Failed to list students', error);
    return [];
  }
}

export async function createStudent(
  token: string,
  input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    primaryInterest: string;
    selectedSubjects?: string[];
  }
): Promise<Student> {
  const data = await apiRequest<{ student: Student }>('/students', {
    method: 'POST',
    body: { ...input, role: 'Student' },
    token
  });

  return data.student;
}

export async function fetchMajorSubjectCatalog(): Promise<MajorSubjectCatalogEntry[]> {
  try {
    const data = await apiRequest<{ majors?: MajorSubjectCatalogEntry[] }>('/students/public/majors', {
      cache: 'no-store'
    });

    return data.majors ?? [];
  } catch (error) {
    console.error('Failed to fetch major catalog', error);
    return [];
  }
}

export async function selfRegisterStudent(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  primaryInterest: string;
  selectedSubjects: string[];
}): Promise<Student> {
  const data = await apiRequest<{ student: Student }>('/students/public/self-register', {
    method: 'POST',
    body: input
  });

  return data.student;
}

export async function adminLogin(
  email: string,
  password: string
): Promise<{ token: string; staff: StaffAccount } | null> {
  try {
    const data = await apiRequest<{ token?: string; staff?: StaffAccount }>('/admin/login', {
      method: 'POST',
      body: { email, password }
    });

    if (!data.token || !data.staff) {
      return null;
    }

    return { token: data.token, staff: data.staff };
  } catch (error) {
    console.error('Admin login failed', error);
    return null;
  }
}

export async function listStaff(token: string): Promise<StaffAccount[]> {
  try {
    const data = await apiRequest<{ staff?: StaffAccount[] }>('/staff', {
      token
    });

    return data.staff ?? [];
  } catch (error) {
    console.error('Failed to load staff accounts', error);
    return [];
  }
}

export async function createStaff(
  token: string,
  input: { displayName: string; email: string; password: string; role: StaffAccount['role'] }
): Promise<StaffAccount> {
  const data = await apiRequest<{ staff: StaffAccount }>('/staff', {
    method: 'POST',
    body: input,
    token
  });

  return data.staff;
}

export async function fetchTeacherDashboard(token: string, teacherId?: number): Promise<TeacherDashboard | null> {
  const query = teacherId ? `?teacherId=${teacherId}` : '';
  const data = await apiRequest<{ dashboard?: TeacherDashboard }>(`/teaching/dashboard${query}`, {
    token
  });

  return data.dashboard ?? null;
}

export async function listTeachingAssignments(
  token: string,
  teacherId?: number
): Promise<TeachingAssignment[]> {
  const query = teacherId ? `?teacherId=${teacherId}` : '';
  const data = await apiRequest<{ assignments?: TeachingAssignment[] }>(`/teaching/assignments${query}`, {
    token
  });

  return data.assignments ?? [];
}

export async function createTeachingAssignment(
  token: string,
  input: {
    teacherId: number;
    classroomId: number;
    courseCode: string;
    courseTitle: string;
    weekday: string;
    startTime: string;
    endTime: string;
    studentGroup?: string;
    majorFocus: string;
    semester?: string;
  }
): Promise<TeachingAssignment> {
  const data = await apiRequest<{ assignment: TeachingAssignment }>('/teaching/assignments', {
    method: 'POST',
    body: input,
    token
  });

  return data.assignment;
}


export async function recordTeacherGrade(
  token: string,
  input: {
    studentId: number;
    courseCode: string;
    courseTitle: string;
    semester: string;
    grade: string;
    credits: number;
  }
): Promise<GradeRecord> {
  const data = await apiRequest<{ grade: GradeRecord }>('/teaching/grades', {
    method: 'POST',
    body: input,
    token
  });

  return data.grade;
}

export async function listClassrooms(token: string): Promise<Classroom[]> {
  const data = await apiRequest<{ classrooms?: Classroom[] }>('/classrooms', {
    token
  });

  return data.classrooms ?? [];
}

export async function listAvailableClassrooms(studentId?: number): Promise<ClassroomAvailability[]> {
  const query = studentId ? `?studentId=${studentId}` : '';
  const data = await apiRequest<{ classrooms?: ClassroomAvailability[] }>(
    `/classrooms/public/available${query}`,
    { cache: 'no-store' }
  );

  return data.classrooms ?? [];
}

export async function registerForClassroom(input: {
  studentId: number;
  classroomId: number;
  courseCode?: string; // Optional: if provided, register only for this specific course
  weekday?: string; // Optional: specific weekday to register for (used for conflict checking)
  startTime?: string; // Optional: specific start time to register for (used for conflict checking)
}): Promise<ClassroomEnrollment> {
  const data = await apiRequest<{ enrollment: ClassroomEnrollment }>(
    `/classrooms/${input.classroomId}/self-registrations`,
    {
      method: 'POST',
      body: { 
        studentId: input.studentId,
        courseCode: input.courseCode, // Pass course code to register for specific course
        weekday: input.weekday, // Pass specific weekday if provided (for conflict checking)
        startTime: input.startTime // Pass specific start time if provided (for conflict checking)
      }
    }
  );

  return data.enrollment;
}

export async function recordStudentAtenxionTransaction(studentId: number | string): Promise<void> {
  await apiRequest('/atenxion/transaction', {
    method: 'POST',
    body: {
      studentId: String(studentId)
    }
  });
}

export async function listFeePayments(token: string, studentId?: number): Promise<FeePayment[]> {
  const query = studentId ? `?studentId=${studentId}` : '';
  const data = await apiRequest<{ payments?: FeePayment[] }>(`/finance/payments${query}`, {
    token
  });

  return data.payments ?? [];
}

export async function recordFeePayment(
  token: string,
  input: { studentId: number; amount: number; description?: string; status?: 'pending' | 'paid'; dueDate?: string | null }
): Promise<FeePayment> {
  const data = await apiRequest<{ payment: FeePayment }>('/finance/payments', {
    method: 'POST',
    body: input,
    token
  });

  return data.payment;
}

export async function listAnnouncements(): Promise<Announcement[]> {
  const data = await apiRequest<{ announcements?: Announcement[] }>('/announcements', {
    cache: 'no-store'
  });
  return data.announcements ?? [];
}

export async function createAnnouncement(
  token: string,
  input: {
    title: string;
    content: string;
    type: 'announcement' | 'event';
    eventDate?: string | null;
  }
): Promise<Announcement> {
  const data = await apiRequest<{ announcement: Announcement }>('/announcements', {
    method: 'POST',
    body: input,
    token
  });
  return data.announcement;
}

export async function deleteAnnouncement(token: string, id: number): Promise<void> {
  await apiRequest(`/announcements/${id}`, {
    method: 'DELETE',
    token
  });
}

export async function listTeacherAssignments(token: string, teacherId: number, courseCode?: string): Promise<StudentAssignment[]> {
  const query = courseCode ? `?courseCode=${courseCode}` : '';
  const data = await apiRequest<{ assignments?: StudentAssignment[] }>(`/assignments/teacher/${teacherId}${query}`, {
    token
  });
  return data.assignments ?? [];
}

export async function createAssignment(
  token: string,
  input: {
    teacherId: number;
    courseCode: string;
    courseTitle: string;
    title: string;
    description?: string | null;
    dueDate: string;
    maxPoints?: number | null;
    assignmentType?: 'homework' | 'project' | 'quiz' | 'exam' | 'other';
  }
): Promise<StudentAssignment> {
  const data = await apiRequest<{ assignment: StudentAssignment }>('/assignments', {
    method: 'POST',
    body: input,
    token
  });
  return data.assignment;
}

export async function updateAssignment(
  token: string,
  id: number,
  input: {
    title?: string;
    description?: string | null;
    dueDate?: string;
    maxPoints?: number | null;
    assignmentType?: 'homework' | 'project' | 'quiz' | 'exam' | 'other';
  }
): Promise<StudentAssignment> {
  const data = await apiRequest<{ assignment: StudentAssignment }>(`/assignments/${id}`, {
    method: 'PUT',
    body: input,
    token
  });
  return data.assignment;
}

export async function deleteAssignment(token: string, id: number): Promise<void> {
  await apiRequest(`/assignments/${id}`, {
    method: 'DELETE',
    token
  });
}

export type Integration = {
  contextKey: string;
  iframe: string;
  createdAt: string;
  updatedAt?: string;
};

export async function getIntegration(contextKey: string): Promise<Integration | null> {
  try {
    const data = await apiRequest<{ contextKey?: string; iframe?: string; createdAt?: string; updatedAt?: string }>(
      `/integration/${contextKey}`
    );
    if (data.contextKey && data.iframe) {
      return {
        contextKey: data.contextKey,
        iframe: data.iframe,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch integration', error);
    return null;
  }
}

export async function listIntegrations(): Promise<Integration[]> {
  try {
    const data = await apiRequest<{ integrations?: Integration[] }>('/integration');
    return data.integrations ?? [];
  } catch (error) {
    console.error('Failed to fetch integrations', error);
    return [];
  }
}

/**
 * Get token and iframe from MongoDB via backend API
 * Fetches contextKey from MongoDB first, then uses it to get the token and iframe
 * Follows the same pattern as fetchIntegrationEmbed
 */
export async function getToken(): Promise<{ token: string; iframe: string } | null> {
  const apiBaseUrl = resolveApiBaseUrl().replace(/\/$/, '');
  // resolveApiBaseUrl already includes /api, so use /integration/token directly
  const response = await fetch(`${apiBaseUrl}/integration/token`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }

  const body = (await response.json()) as { token?: string | null; iframe?: string | null };
  
  if (body.token && body.iframe) {
    return {
      token: body.token,
      iframe: body.iframe
    };
  }
  
  return null;
}
