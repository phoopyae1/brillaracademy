import { fallbackFeatures, type Feature } from '@/lib/features';

export type Student = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string | null;
  primaryInterest: string | null;
  createdAt: string;
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
  }>;
};

export type StaffAccount = {
  id: number;
  displayName: string;
  email: string;
  role: 'IT_ADMIN' | 'TEACHER' | 'STUDENT_ADMIN';
  createdAt: string;
};

const DEFAULT_API_BASE_URL = 'http://localhost:4000/api';

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

export async function authenticateStudent(email: string, password: string): Promise<Student | null> {
  try {
    const data = await apiRequest<{ student?: Student }>('/login', {
      method: 'POST',
      body: { email, password }
    });

    return data.student ?? null;
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
  input: { firstName: string; lastName: string; email: string; password: string; primaryInterest?: string }
): Promise<Student> {
  const data = await apiRequest<{ student: Student }>('/students', {
    method: 'POST',
    body: { ...input, role: 'Student' },
    token
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
