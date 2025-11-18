"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import {
  adminLogin,
  fetchTeacherDashboard,
  recordTeacherGrade,
  createTeachingAssignment,
  listTeachingAssignments,
  listClassrooms,
  listStaff,
  listFeePayments,
  recordFeePayment,
  listStudents,
  fetchMajorSubjectCatalog,
  getCurrentSemester,
  updateCurrentSemester,
  getSemesterDate,
  setSemesterDate,
  listSemesterDates,
  type SemesterDate,
  listAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  createAssignment,
  fetchStudentDashboard,
  deregisterStudentFromCourse,
  deleteStudentAccount,
  type StaffAccount,
  type TeacherDashboard,
  type TeachingAssignment,
  type Classroom,
  type FeePayment,
  type Student,
  type GradeRecord,
  type TeacherRosterStudent,
  type TeacherScheduleSlot,
  type MajorSubjectCatalogEntry,
  type Announcement,
  type StudentDashboardData
} from '@/lib/db';

type StaffSession = { token: string; staff: StaffAccount };

type AsyncState = 'idle' | 'submitting' | 'success' | 'error';

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function formatTimeRange(slot: TeacherScheduleSlot) {
  return `${slot.startTime} – ${slot.endTime}`;
}

function formatTimestamp(value?: string) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(value);
}

type LoginState = { status: 'idle' | 'submitting' | 'error'; message: string };

type GradeFormState = {
  studentId: string;
  courseCode: string;
  semester: string;
  grade: string;
  credits: string;
  status: AsyncState;
  message: string;
};

type AssignmentFormState = {
  teacherId: string;
  classroomId: string;
  courseCode: string;
  courseTitle: string;
  weekday: string;
  startTime: string;
  endTime: string;
  studentGroup: string;
  majorFocus: string;
  semester: string;
  status: AsyncState;
  message: string;
};

type PaymentFormState = {
  studentId: string;
  amount: string;
  description: string;
  statusValue: 'pending' | 'paid';
  dueDate: string;
  status: AsyncState;
  message: string;
};

type ForgePortalPageProps = {
  staffId?: number;
};

export default function ForgePortalPage({ staffId }: ForgePortalPageProps = {}) {
  const [session, setSession] = useState<StaffSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loginState, setLoginState] = useState<LoginState>({ status: 'idle', message: '' });
  const [teacherDashboard, setTeacherDashboard] = useState<TeacherDashboard | null>(null);
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teachers, setTeachers] = useState<StaffAccount[]>([]);
  const [majorCatalog, setMajorCatalog] = useState<MajorSubjectCatalogEntry[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const stored = window.sessionStorage.getItem('brillar_staff_session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as StaffSession;
        setSession(parsed);
      } catch (error) {
        console.warn('Unable to restore staff session', error);
      }
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!session) {
      setTeacherDashboard(null);
      setAssignments([]);
      setClassrooms([]);
      setTeachers([]);
      setMajorCatalog([]);
      setPayments([]);
      setStudents([]);
      return;
    }

    setLoading(true);
    setLoadError('');

    try {
      if (session.staff.role === 'TEACHER') {
        const dashboard = await fetchTeacherDashboard(session.token);
        setTeacherDashboard(dashboard);
      } else if (session.staff.role === 'IT_ADMIN') {
        const [assignmentList, classroomList, staffList, majors, announcementsList, studentList] = await Promise.all([
          listTeachingAssignments(session.token),
          listClassrooms(session.token),
          listStaff(session.token),
          fetchMajorSubjectCatalog(),
          listAnnouncements(),
          listStudents(session.token)
        ]);

        setAssignments(assignmentList);
        setClassrooms(classroomList);
        setTeachers(staffList.filter((member) => member.role === 'TEACHER'));
        setMajorCatalog(majors);
        setAnnouncements(announcementsList);
        setStudents(studentList);
      } else if (session.staff.role === 'STUDENT_ADMIN') {
        const [paymentList, studentList, announcementsList] = await Promise.all([
          listFeePayments(session.token),
          listStudents(session.token),
          listAnnouncements()
        ]);

        setPayments(paymentList);
        setStudents(studentList);
        setAnnouncements(announcementsList);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load portal data.';
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const refreshStudents = useCallback(async () => {
    if (!session || session.staff.role !== 'IT_ADMIN') return;
    try {
      const studentList = await listStudents(session.token);
      setStudents(studentList);
    } catch (error) {
      console.error('Failed to refresh students list:', error);
    }
  }, [session]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('brillar_staff_session');
    }

    setSession(null);
  };

  const handleStaffLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginState({ status: 'submitting', message: 'Verifying your credentials…' });

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email')?.toString().trim();
    const password = formData.get('password')?.toString() ?? '';

    if (!email || !password) {
      setLoginState({ status: 'error', message: 'Provide both email and password to continue.' });
      return;
    }

    try {
      const result = await adminLogin(email, password);
      if (!result) {
        throw new Error('Login failed. Confirm your credentials and role.');
      }

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('brillar_staff_session', JSON.stringify(result));
      }

      setSession(result);
      setLoginState({ status: 'idle', message: '' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to log in right now.';
      setLoginState({ status: 'error', message });
    }
  };

  const handleRecordGrade = async (input: {
    studentId: number;
    courseCode: string;
    courseTitle: string;
    semester: string;
    grade: string;
    credits: number;
  }): Promise<GradeRecord> => {
    if (!session) {
      throw new Error('You must be signed in as a teacher to record grades.');
    }

    const record = await recordTeacherGrade(session.token, input);
    setTeacherDashboard((existing) =>
      existing
        ? {
            ...existing,
            recentGrades: [record, ...existing.recentGrades]
          }
        : existing
    );
    return record;
  };

  const handleCreateAssignment = async (
    input: Omit<AssignmentFormState, 'status' | 'message'>
  ): Promise<TeachingAssignment> => {
    if (!session) {
      throw new Error('You must be signed in as an IT administrator to assign classrooms.');
    }

    const payload = {
      teacherId: Number(input.teacherId),
      classroomId: Number(input.classroomId),
      courseCode: input.courseCode,
      courseTitle: input.courseTitle,
      weekday: input.weekday,
      startTime: input.startTime,
      endTime: input.endTime,
      studentGroup: input.studentGroup || undefined,
      majorFocus: input.majorFocus
    };

    const assignment = await createTeachingAssignment(session.token, payload);
    setAssignments((existing) => [assignment, ...existing]);
    return assignment;
  };

  const handleRecordPayment = async (
    input: Omit<PaymentFormState, 'status' | 'message'>
  ): Promise<FeePayment> => {
    if (!session) {
      throw new Error('You must be signed in as a student administrator to record fees.');
    }

    const payload = {
      studentId: Number(input.studentId),
      amount: Number(input.amount),
      description: input.description ? input.description.trim() : undefined,
      status: input.statusValue,
      dueDate: input.dueDate ? new Date(input.dueDate).toISOString() : undefined
    };

    const payment = await recordFeePayment(session.token, payload);
    
    // Refresh the entire payments list to get updated fee statuses
    // (since payment might have updated an existing fee rather than creating a new one)
    try {
      const updatedPayments = await listFeePayments(session.token);
      setPayments(updatedPayments);
    } catch (error) {
      console.error('Failed to refresh payments list', error);
      // Fallback: add the payment to the list
      setPayments((existing) => [payment, ...existing]);
    }
    
    return payment;
  };

  const teacherTags = useMemo(() => teacherDashboard?.focusTags ?? [], [teacherDashboard]);

  return (
    <Box sx={{ py: { xs: 6, md: 10 } }}>
      <Container maxWidth="lg">
        <Stack spacing={5}>
          <Stack spacing={1} textAlign={{ xs: 'center', md: 'left' }}>
            <Typography variant="overline" sx={{ letterSpacing: 2, color: 'primary.main' }}>
              Forge | Role-based operations portal
            </Typography>
            <Typography variant="h3" fontWeight={700}>
              Coordinate the campus in one workspace
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 760, mx: { xs: 'auto', md: 0 } }}>
              IT administrators, faculty, and student administrators share a unified hub for schedules, classroom assignments,
              and academic records. Log in with your staff credentials to unlock role-aware dashboards.
            </Typography>
          </Stack>

          {!session && (
            <Paper
              elevation={4}
              sx={{
                p: { xs: 4, md: 5 },
                maxWidth: 640,
                mx: 'auto'
              }}
            >
              <Stack spacing={3}>
                <Box>
                  <Typography variant="h5" fontWeight={700}>
                    Staff sign in
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Use your Forge-issued credentials. Default accounts: it-admin@brillaracademy.edu, faculty@brillaracademy.edu,
                    admin-office@brillaracademy.edu (password: changeme).
                  </Typography>
                </Box>

                {loginState.status === 'error' && <Alert severity="error">{loginState.message}</Alert>}

                <Stack component="form" spacing={2.5} onSubmit={handleStaffLogin} noValidate>
                  <TextField name="email" type="email" label="Staff email" required fullWidth autoComplete="email" />
                  <TextField
                    name="password"
                    type="password"
                    label="Password"
                    required
                    fullWidth
                    autoComplete="current-password"
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loginState.status === 'submitting'}
                    startIcon={loginState.status === 'submitting' ? <CircularProgress size={20} color="inherit" /> : undefined}
                  >
                    {loginState.status === 'submitting' ? 'Signing in…' : 'Access Forge'}
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          )}

          {session && (
            <Paper elevation={0} sx={{  border: '1px solid', borderColor: 'divider', p: { xs: 3, md: 4 } }}>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                  <Box>
                    <Typography variant="h5" fontWeight={700}>
                      {session.staff.displayName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Signed in as {session.staff.role.replace('_', ' ').toLowerCase()} · {session.staff.email}
                    </Typography>
                  </Box>
                  <Button variant="outlined" onClick={handleLogout} sx={{ ml: { sm: 'auto' } }}>
                    Log out
                  </Button>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {(session.staff.role === 'TEACHER' ? teacherTags : ['Secure access', 'Workflow automation', 'Student success']).map(
                    (tag) => (
                      <Chip key={tag} label={tag} color="secondary" variant="outlined" />
                    )
                  )}
                </Stack>

                {loadError && <Alert severity="error">{loadError}</Alert>}
              </Stack>
            </Paper>
          )}

          {session?.staff.role === 'TEACHER' && (
            <TeacherWorkspace dashboard={teacherDashboard} loading={loading} onRecordGrade={handleRecordGrade} session={session} />
          )}

          {session?.staff.role === 'IT_ADMIN' && (
            <ItAdminWorkspace
              loading={loading}
              assignments={assignments}
              classrooms={classrooms}
              teachers={teachers}
              majors={majorCatalog}
              students={students}
              onCreateAssignment={handleCreateAssignment}
              session={session}
              announcements={announcements}
              onCreateAnnouncement={async (input) => {
                if (!session) throw new Error('Not authenticated');
                const announcement = await createAnnouncement(session.token, input);
                setAnnouncements((prev) => [announcement, ...prev]);
                return announcement;
              }}
              onDeleteAnnouncement={async (id) => {
                if (!session) throw new Error('Not authenticated');
                await deleteAnnouncement(session.token, id);
                setAnnouncements((prev) => prev.filter((a) => a.id !== id));
              }}
              onStudentsChange={refreshStudents}
            />
          )}

          {session?.staff.role === 'STUDENT_ADMIN' && (
            <StudentAdminWorkspace
              loading={loading}
              payments={payments}
              students={students}
              announcements={announcements}
              onRecordPayment={handleRecordPayment}
              onCreateAnnouncement={async (input) => {
                if (!session) throw new Error('Not authenticated');
                const announcement = await createAnnouncement(session.token, input);
                setAnnouncements((prev) => [announcement, ...prev]);
                return announcement;
              }}
              onDeleteAnnouncement={async (id) => {
                if (!session) throw new Error('Not authenticated');
                await deleteAnnouncement(session.token, id);
                setAnnouncements((prev) => prev.filter((a) => a.id !== id));
              }}
            />
          )}
        </Stack>
      </Container>
    </Box>
  );
}

type TeacherWorkspaceProps = {
  dashboard: TeacherDashboard | null;
  loading: boolean;
  onRecordGrade: (input: {
    studentId: number;
    courseCode: string;
    courseTitle: string;
    semester: string;
    grade: string;
    credits: number;
  }) => Promise<GradeRecord>;
  session: StaffSession;
};

type StudentAssignmentFormState = {
  courseCode: string;
  title: string;
  description: string;
  dueDate: string;
  maxPoints: string;
  assignmentType: 'homework' | 'project' | 'quiz' | 'exam' | 'other';
  status: AsyncState;
  message: string;
};

function TeacherWorkspace({ dashboard, loading, onRecordGrade, session }: TeacherWorkspaceProps) {
  const [formState, setFormState] = useState<GradeFormState>({
    studentId: '',
    courseCode: '',
    semester: '1/2026',
    grade: '',
    credits: '3',
    status: 'idle',
    message: ''
  });

  useEffect(() => {
    if (dashboard?.schedule.length && !formState.courseCode) {
      setFormState((prev) => ({ ...prev, courseCode: dashboard.schedule[0].courseCode }));
    }
  }, [dashboard, formState.courseCode]);

  const courseOptions = useMemo(
    () =>
      dashboard?.schedule.map((slot) => ({
        courseCode: slot.courseCode,
        courseTitle: slot.courseTitle
      })) ?? [],
    [dashboard]
  );

  const rosterByCourse = useMemo(() => {
    const map = new Map<string, TeacherRosterStudent[]>();
    dashboard?.rosters.forEach((entry) => {
      const existing = map.get(entry.courseCode) ?? [];
      existing.push(entry);
      map.set(entry.courseCode, existing);
    });
    return map;
  }, [dashboard]);

  const gradeHistory = dashboard?.recentGrades ?? [];

  const [assignmentFormState, setAssignmentFormState] = useState<StudentAssignmentFormState>({
    courseCode: '',
    title: '',
    description: '',
    dueDate: '',
    maxPoints: '',
    assignmentType: 'homework',
    status: 'idle',
    message: ''
  });

  useEffect(() => {
    if (dashboard?.schedule.length && !assignmentFormState.courseCode) {
      setAssignmentFormState((prev) => ({ ...prev, courseCode: dashboard.schedule[0].courseCode }));
    }
  }, [dashboard, assignmentFormState.courseCode]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.studentId || !formState.courseCode || !formState.semester || !formState.grade || !formState.credits) {
      setFormState((prev) => ({ ...prev, status: 'error', message: 'Fill out every grade field before submitting.' }));
      return;
    }

    setFormState((prev) => ({ ...prev, status: 'submitting', message: 'Recording grade…' }));

    try {
      const roster = rosterByCourse.get(formState.courseCode) ?? [];
      const rosterEntry = roster.find((entry) => String(entry.studentId) === formState.studentId);
      const courseTitle = courseOptions.find((course) => course.courseCode === formState.courseCode)?.courseTitle ?? '';
      await onRecordGrade({
        studentId: Number(formState.studentId),
        courseCode: formState.courseCode,
        courseTitle,
        semester: formState.semester,
        grade: formState.grade,
        credits: Number(formState.credits)
      });

      setFormState({
        studentId: '',
        courseCode: formState.courseCode,
        semester: formState.semester,
        grade: '',
        credits: formState.credits,
        status: 'success',
        message: rosterEntry
          ? `Saved ${formState.grade} for ${rosterEntry.studentName}.`
          : 'Grade saved successfully.'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to record grade.';
      setFormState((prev) => ({ ...prev, status: 'error', message }));
    }
  };

  const handleAssignmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!assignmentFormState.courseCode || !assignmentFormState.title || !assignmentFormState.dueDate) {
      setAssignmentFormState((prev) => ({ ...prev, status: 'error', message: 'Please fill in course, title, and due date.' }));
      return;
    }

    setAssignmentFormState((prev) => ({ ...prev, status: 'submitting', message: 'Creating assignment…' }));

    try {
      const course = courseOptions.find((c) => c.courseCode === assignmentFormState.courseCode);
      if (!course) {
        throw new Error('Course not found');
      }

      await createAssignment(session.token, {
        teacherId: dashboard?.teacher.id ?? 0,
        courseCode: assignmentFormState.courseCode,
        courseTitle: course.courseTitle,
        title: assignmentFormState.title,
        description: assignmentFormState.description || null,
        dueDate: assignmentFormState.dueDate,
        maxPoints: assignmentFormState.maxPoints ? Number(assignmentFormState.maxPoints) : null,
        assignmentType: assignmentFormState.assignmentType
      });

      setAssignmentFormState({
        courseCode: assignmentFormState.courseCode,
        title: '',
        description: '',
        dueDate: '',
        maxPoints: '',
        assignmentType: 'homework',
        status: 'success',
        message: `Assignment "${assignmentFormState.title}" created successfully!`
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create assignment.';
      setAssignmentFormState((prev) => ({ ...prev, status: 'error', message }));
    }
  };

  return (
    <Stack spacing={4}>
      <Paper elevation={3} sx={{  p: { xs: 3, md: 4 } }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Teaching schedule
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Review the classrooms and cohorts assigned to you for the week.
              </Typography>
            </Box>
            {loading && <CircularProgress size={24} />}
          </Stack>

          <Grid container spacing={2}>
            {(dashboard?.schedule ?? []).map((slot) => (
              <Grid key={slot.assignmentId} item xs={12} md={6} lg={4}>
                <Paper variant="outlined" sx={{  p: 2.5, height: '100%' }}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={slot.weekday} color="primary" size="small" sx={{ fontWeight: 600 }} />
                      <Typography variant="body2" color="text.secondary">
                        {formatTimeRange(slot)}
                      </Typography>
                    </Stack>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {slot.courseTitle}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {slot.courseCode} · {slot.studentGroup}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {slot.classroomName} · {slot.classroomLocation}
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
            ))}
            {!dashboard?.schedule.length && !loading && (
              <Grid item xs={12}>
                <Alert severity="info">No active classroom assignments yet.</Alert>
              </Grid>
            )}
          </Grid>
        </Stack>
      </Paper>

      <Grid container spacing={4}>
        <Grid item xs={12} lg={6}>
          <Paper elevation={0} sx={{  border: '1px dashed', borderColor: 'divider', p: { xs: 3, md: 4 }, height: '100%' }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Enter student grades
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Select a course and learner to submit midterm or final grades directly into the shared record.
                </Typography>
              </Box>

              {formState.status === 'error' && <Alert severity="error">{formState.message}</Alert>}
              {formState.status === 'success' && <Alert severity="success">{formState.message}</Alert>}

              <Stack component="form" spacing={2.5} onSubmit={handleSubmit} noValidate>
                <FormControl fullWidth required>
                  <InputLabel id="course-select-label">Course</InputLabel>
                  <Select
                    labelId="course-select-label"
                    label="Course"
                    value={formState.courseCode}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        courseCode: event.target.value,
                        studentId: ''
                      }))
                    }
                  >
                    {courseOptions.map((course) => (
                      <MenuItem key={course.courseCode} value={course.courseCode}>
                        {course.courseCode} · {course.courseTitle}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth required>
                  <InputLabel id="student-select-label">Student</InputLabel>
                  <Select
                    labelId="student-select-label"
                    label="Student"
                    value={formState.studentId}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        studentId: event.target.value
                      }))
                    }
                  >
                    {(rosterByCourse.get(formState.courseCode) ?? []).map((entry) => (
                      <MenuItem key={entry.studentId} value={String(entry.studentId)}>
                        {entry.studentName} · #{entry.studentId}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Semester"
                  value={formState.semester}
                  onChange={(event) => setFormState((prev) => ({ ...prev, semester: event.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  label="Grade"
                  value={formState.grade}
                  onChange={(event) => setFormState((prev) => ({ ...prev, grade: event.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  label="Credits"
                  value={formState.credits}
                  onChange={(event) => setFormState((prev) => ({ ...prev, credits: event.target.value }))}
                  required
                  type="number"
                  inputProps={{ min: 0 }}
                  fullWidth
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={formState.status === 'submitting'}
                  startIcon={formState.status === 'submitting' ? <CircularProgress size={20} color="inherit" /> : undefined}
                >
                  {formState.status === 'submitting' ? 'Saving grade…' : 'Record grade'}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Paper elevation={0} sx={{  border: '1px solid', borderColor: 'divider', p: { xs: 3, md: 4 }, height: '100%' }}>
            <Stack spacing={2} sx={{ height: '100%' }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Grade history
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Review the latest grades submitted across your courses.
                </Typography>
              </Box>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Course</TableCell>
                    <TableCell>Student</TableCell>
                    <TableCell>Grade</TableCell>
                    <TableCell>Semester</TableCell>
                    <TableCell>Recorded</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {gradeHistory.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography fontWeight={600}>{record.courseTitle}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {record.courseCode}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>#{record.studentId}</TableCell>
                      <TableCell>{record.grade}</TableCell>
                      <TableCell>{record.semester}</TableCell>
                      <TableCell>{formatTimestamp(record.recordedAt)}</TableCell>
                    </TableRow>
                  ))}
                  {!gradeHistory.length && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No grades recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{  border: '1px solid', borderColor: 'divider', p: { xs: 3, md: 4 } }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Create Assignment
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create homework, projects, quizzes, or exams for your students.
            </Typography>
          </Box>

          {assignmentFormState.status === 'error' && <Alert severity="error">{assignmentFormState.message}</Alert>}
          {assignmentFormState.status === 'success' && <Alert severity="success">{assignmentFormState.message}</Alert>}

          <Stack component="form" spacing={2.5} onSubmit={handleAssignmentSubmit} noValidate>
            <FormControl fullWidth required>
              <InputLabel id="assignment-course-select-label">Course</InputLabel>
              <Select
                labelId="assignment-course-select-label"
                label="Course"
                value={assignmentFormState.courseCode}
                onChange={(event) =>
                  setAssignmentFormState((prev) => ({
                    ...prev,
                    courseCode: event.target.value
                  }))
                }
              >
                {courseOptions.map((course) => (
                  <MenuItem key={course.courseCode} value={course.courseCode}>
                    {course.courseCode} · {course.courseTitle}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Assignment Title"
              value={assignmentFormState.title}
              onChange={(event) => setAssignmentFormState((prev) => ({ ...prev, title: event.target.value }))}
              required
              fullWidth
            />

            <TextField
              label="Description"
              value={assignmentFormState.description}
              onChange={(event) => setAssignmentFormState((prev) => ({ ...prev, description: event.target.value }))}
              multiline
              rows={3}
              fullWidth
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Due Date"
                  type="datetime-local"
                  value={assignmentFormState.dueDate}
                  onChange={(event) => setAssignmentFormState((prev) => ({ ...prev, dueDate: event.target.value }))}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="assignment-type-select-label">Type</InputLabel>
                  <Select
                    labelId="assignment-type-select-label"
                    label="Type"
                    value={assignmentFormState.assignmentType}
                    onChange={(event) =>
                      setAssignmentFormState((prev) => ({
                        ...prev,
                        assignmentType: event.target.value as 'homework' | 'project' | 'quiz' | 'exam' | 'other'
                      }))
                    }
                  >
                    <MenuItem value="homework">Homework</MenuItem>
                    <MenuItem value="project">Project</MenuItem>
                    <MenuItem value="quiz">Quiz</MenuItem>
                    <MenuItem value="exam">Exam</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TextField
              label="Max Points (optional)"
              type="number"
              value={assignmentFormState.maxPoints}
              onChange={(event) => setAssignmentFormState((prev) => ({ ...prev, maxPoints: event.target.value }))}
              fullWidth
              inputProps={{ min: 0, step: 0.1 }}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={assignmentFormState.status === 'submitting'}
              startIcon={assignmentFormState.status === 'submitting' ? <CircularProgress size={20} color="inherit" /> : undefined}
            >
              {assignmentFormState.status === 'submitting' ? 'Creating…' : 'Create Assignment'}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{  border: '1px solid', borderColor: 'divider', p: { xs: 3, md: 4 } }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Course rosters
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track which students are enrolled or waitlisted for each of your sections.
            </Typography>
          </Box>

          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell>Course</TableCell>
                <TableCell>Student</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(dashboard?.rosters ?? []).map((entry) => (
                <TableRow key={`${entry.courseCode}-${entry.studentId}`}>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography fontWeight={600}>{entry.courseTitle}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {entry.courseCode}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{entry.studentName}</TableCell>
                  <TableCell>
                    <Chip
                      label={entry.status}
                      size="small"
                      color={entry.status === 'enrolled' ? 'success' : 'warning'}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {!dashboard?.rosters.length && (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No roster data available yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Stack>
      </Paper>
    </Stack>
  );
}

type ItAdminWorkspaceProps = {
  loading: boolean;
  assignments: TeachingAssignment[];
  classrooms: Classroom[];
  teachers: StaffAccount[];
  majors: MajorSubjectCatalogEntry[];
  students: Student[];
  onCreateAssignment: (
    input: Omit<AssignmentFormState, 'status' | 'message'>
  ) => Promise<TeachingAssignment>;
  session: StaffSession;
  announcements: Announcement[];
  onCreateAnnouncement: (input: {
    title: string;
    content: string;
    type: 'announcement' | 'event';
    eventDate?: string | null;
  }) => Promise<Announcement>;
  onDeleteAnnouncement: (id: number) => Promise<void>;
  onStudentsChange?: () => void;
};

function ItAdminWorkspace({ loading, assignments, classrooms, teachers, majors, students, onCreateAssignment, session, announcements, onCreateAnnouncement, onDeleteAnnouncement, onStudentsChange }: ItAdminWorkspaceProps) {
  const [formState, setFormState] = useState<AssignmentFormState>({
    teacherId: '',
    classroomId: '',
    courseCode: '',
    courseTitle: '',
    weekday: 'Monday',
    startTime: '09:00',
    endTime: '10:00',
    studentGroup: 'Core Cohort',
    majorFocus: '',
    semester: '1/2026',
    status: 'idle',
    message: ''
  });
  const [currentSemester, setCurrentSemester] = useState<string>('1/2026');
  const [semesterLoading, setSemesterLoading] = useState(false);
  const [semesterError, setSemesterError] = useState('');
  const [semesterUpdateStatus, setSemesterUpdateStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  
  // Semester dates state
  const [semesterDates, setSemesterDates] = useState<SemesterDate[]>([]);
  const [selectedSemesterForDates, setSelectedSemesterForDates] = useState<string>('1/2026');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [semesterDateStatus, setSemesterDateStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [semesterDateError, setSemesterDateError] = useState<string>('');

  // Load current semester on mount
  useEffect(() => {
    const loadCurrentSemester = async () => {
      try {
        const semester = await getCurrentSemester(session.token);
        setCurrentSemester(semester);
        setSelectedSemesterForDates(semester);
      } catch (error) {
        console.error('Failed to load current semester', error);
        setSemesterError('Failed to load current semester');
      }
    };
    void loadCurrentSemester();
  }, [session.token]);

  // Load semester dates on mount and when current semester changes
  useEffect(() => {
    const loadSemesterDates = async () => {
      try {
        const dates = await listSemesterDates(session.token);
        setSemesterDates(dates);
        
        // Load dates for current semester if available
        const currentSemesterDate = dates.find(d => d.semester === currentSemester);
        if (currentSemesterDate) {
          setStartDate(currentSemesterDate.startDate);
          setEndDate(currentSemesterDate.endDate);
        } else {
          setStartDate('');
          setEndDate('');
        }
      } catch (error) {
        console.error('Failed to load semester dates', error);
      }
    };
    void loadSemesterDates();
  }, [session.token, currentSemester]);

  // Load dates when selected semester changes
  useEffect(() => {
    const loadSelectedSemesterDate = async () => {
      try {
        const semesterDate = await getSemesterDate(session.token, selectedSemesterForDates);
        if (semesterDate) {
          setStartDate(semesterDate.startDate);
          setEndDate(semesterDate.endDate);
        } else {
          setStartDate('');
          setEndDate('');
        }
      } catch (error) {
        console.error('Failed to load semester date', error);
        setStartDate('');
        setEndDate('');
      }
    };
    void loadSelectedSemesterDate();
  }, [session.token, selectedSemesterForDates]);

  const handleUpdateSemester = async (newSemester: string) => {
    setSemesterUpdateStatus('submitting');
    setSemesterError('');
    try {
      const updated = await updateCurrentSemester(session.token, newSemester);
      setCurrentSemester(updated);
      setSelectedSemesterForDates(updated);
      setSemesterUpdateStatus('success');
      setTimeout(() => setSemesterUpdateStatus('idle'), 3000);
    } catch (error) {
      setSemesterError(error instanceof Error ? error.message : 'Failed to update semester');
      setSemesterUpdateStatus('error');
    }
  };

  const handleSaveSemesterDates = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!startDate || !endDate) {
      setSemesterDateError('Please provide both start and end dates');
      setSemesterDateStatus('error');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setSemesterDateError('End date must be after start date');
      setSemesterDateStatus('error');
      return;
    }

    setSemesterDateStatus('submitting');
    setSemesterDateError('');
    
    try {
      const saved = await setSemesterDate(session.token, selectedSemesterForDates, startDate, endDate);
      setSemesterDates(prev => {
        const filtered = prev.filter(d => d.semester !== saved.semester);
        return [...filtered, saved];
      });
      setSemesterDateStatus('success');
      setTimeout(() => setSemesterDateStatus('idle'), 3000);
    } catch (error) {
      setSemesterDateError(error instanceof Error ? error.message : 'Failed to save semester dates');
      setSemesterDateStatus('error');
    }
  };

  const teacherMap = useMemo(() => new Map(teachers.map((teacher) => [teacher.id, teacher.displayName])), [teachers]);
  const classroomMap = useMemo(() => new Map(classrooms.map((room) => [room.id, room])), [classrooms]);
  
  // Filter classrooms based on selected major - only show classrooms that support the selected major
  const filteredClassrooms = useMemo(() => {
    if (!formState.majorFocus) {
      return []; // Don't show any classrooms until a major is selected
    }

    const normalizedMajor = formState.majorFocus.trim().toLowerCase();
    
    const filtered = classrooms.filter((room) => {
      // Check focusAreas first (extracted from resources)
      if (room.focusAreas && Array.isArray(room.focusAreas) && room.focusAreas.length > 0) {
        return room.focusAreas.some((area) => area.trim().toLowerCase() === normalizedMajor);
      }

      // Fallback: check resources for "Major: [Major Name]" entries
      if (room.resources && Array.isArray(room.resources)) {
        return room.resources.some((resource) => {
          if (typeof resource !== 'string') return false;
          const match = resource.match(/^\s*Major:\s*(.+)$/i);
          if (match) {
            return match[1].trim().toLowerCase() === normalizedMajor;
          }
          return false;
        });
      }

      return false;
    });

    // If a classroom is already selected but doesn't match the new major, log a warning
    if (formState.classroomId && filtered.length > 0) {
      const selectedRoom = filtered.find(r => String(r.id) === formState.classroomId);
      if (!selectedRoom) {
        console.warn(
          `[ItAdminWorkspace] Selected classroom ${formState.classroomId} does not support major "${formState.majorFocus}". ` +
          `It will be cleared.`
        );
      }
    }

    return filtered;
  }, [classrooms, formState.majorFocus, formState.classroomId]);
  
  useEffect(() => {
    console.log(`[ItAdminWorkspace] Loaded ${classrooms.length} classrooms, filtered to ${filteredClassrooms.length} for major "${formState.majorFocus || 'none'}"`);
    if (classrooms.length < 10) {
      console.warn(`[ItAdminWorkspace] WARNING: Only ${classrooms.length} classrooms loaded. Expected 217. Please re-seed the database.`);
    }
  }, [classrooms, filteredClassrooms.length, formState.majorFocus]);

  useEffect(() => {
    if (!formState.majorFocus && majors.length) {
      setFormState((prev) => ({ ...prev, majorFocus: majors[0]?.major ?? '' }));
    }
  }, [majors, formState.majorFocus]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !formState.teacherId ||
      !formState.classroomId ||
      !formState.courseCode ||
      !formState.courseTitle ||
      !formState.majorFocus ||
      !formState.semester
    ) {
      setFormState((prev) => ({ ...prev, status: 'error', message: 'Complete every field before assigning a classroom.' }));
      return;
    }

    // Validate that selected classroom matches the major
    const selectedClassroom = filteredClassrooms.find(r => String(r.id) === formState.classroomId);
    if (!selectedClassroom) {
      setFormState((prev) => ({ 
        ...prev, 
        status: 'error', 
        message: `The selected classroom does not support "${formState.majorFocus}" major. Please select a classroom that supports this major.` 
      }));
      return;
    }

    setFormState((prev) => ({ ...prev, status: 'submitting', message: 'Assigning classroom…' }));

    try {
      const assignment = await onCreateAssignment({
        teacherId: formState.teacherId,
        classroomId: formState.classroomId,
        courseCode: formState.courseCode,
        courseTitle: formState.courseTitle,
        weekday: formState.weekday,
        startTime: formState.startTime,
        endTime: formState.endTime,
        studentGroup: formState.studentGroup,
        majorFocus: formState.majorFocus,
        semester: formState.semester
      });

      setFormState((prev) => ({
        teacherId: prev.teacherId,
        classroomId: prev.classroomId,
        courseCode: '',
        courseTitle: '',
        weekday: prev.weekday,
        startTime: prev.startTime,
        endTime: prev.endTime,
        studentGroup: prev.studentGroup,
        majorFocus: prev.majorFocus,
        semester: prev.semester,
        status: 'success',
        message: `Assigned ${assignment.courseCode} to ${teacherMap.get(assignment.teacherId) ?? 'teacher'} successfully.`
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to assign classroom right now.';
      setFormState((prev) => ({ ...prev, status: 'error', message }));
    }
  };


  const enrichedAssignments = assignments.map((assignment) => ({
    ...assignment,
    teacherName: teacherMap.get(assignment.teacherId) ?? `Teacher #${assignment.teacherId}`,
    classroomName: classroomMap.get(assignment.classroomId)?.name ?? `Classroom #${assignment.classroomId}`,
    classroomLocation: classroomMap.get(assignment.classroomId)?.location ?? 'TBA'
  }));

  return (
    <Stack spacing={3}>
      {/* Summary Statistics */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
            <Stack spacing={1}>
              <Typography variant="h4" fontWeight={700}>
                {assignments.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active assignments
              </Typography>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
            <Stack spacing={1}>
              <Typography variant="h4" fontWeight={700}>
                {classrooms.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total classrooms
              </Typography>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
            <Stack spacing={1}>
              <Typography variant="h4" fontWeight={700}>
                {teachers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active teachers
              </Typography>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
            <Stack spacing={1}>
              <Typography variant="h4" fontWeight={700}>
                {currentSemester}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Current semester
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Student Course Management */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: { xs: 3, md: 4 } }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Student Course Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View and manage student course registrations. Deregister students from courses as needed.
            </Typography>
          </Box>
          <Divider />
          <StudentRegistrationsManager students={students} session={session} onStudentsChange={onStudentsChange} />
        </Stack>
      </Paper>

      {/* Current Semester */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: { xs: 3, md: 4 } }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Current Semester
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage the active semester for course registrations and assignments.
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ pt: 1 }}>
            <FormControl size="medium" sx={{ minWidth: 180 }}>
              <InputLabel id="current-semester-select">Set Current Semester</InputLabel>
              <Select
                labelId="current-semester-select"
                label="Set Current Semester"
                value={currentSemester}
                onChange={(event) => handleUpdateSemester(event.target.value)}
                disabled={semesterUpdateStatus === 'submitting'}
              >
                <MenuItem value="1/2026">1/2026</MenuItem>
                <MenuItem value="2/2026">2/2026</MenuItem>
                <MenuItem value="1/2027">1/2027</MenuItem>
                <MenuItem value="2/2027">2/2027</MenuItem>
              </Select>
            </FormControl>
            {semesterUpdateStatus === 'submitting' && <CircularProgress size={20} />}
            {semesterUpdateStatus === 'success' && (
              <Alert severity="success" sx={{ py: 0.5, px: 1.5 }}>Semester updated successfully</Alert>
            )}
            {semesterError && <Alert severity="error" sx={{ py: 0.5, px: 1.5 }}>{semesterError}</Alert>}
          </Stack>
        </Stack>
      </Paper>

      {/* Semester Start/End Dates */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: { xs: 3, md: 4 } }}>
        <Stack spacing={2.5} component="form" onSubmit={handleSaveSemesterDates} noValidate>
          <Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Semester Start & End Dates
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Define the start and end dates for each semester. Students cannot register after the semester end date has passed.
            </Typography>
          </Box>
          <Divider />
          
          {semesterDateStatus === 'error' && semesterDateError && (
            <Alert severity="error">{semesterDateError}</Alert>
          )}
          {semesterDateStatus === 'success' && (
            <Alert severity="success">Semester dates saved successfully</Alert>
          )}

          <Grid container spacing={2.5}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth required>
                <InputLabel id="semester-dates-select">Semester</InputLabel>
                <Select
                  labelId="semester-dates-select"
                  label="Semester"
                  value={selectedSemesterForDates}
                  onChange={(event) => setSelectedSemesterForDates(event.target.value)}
                  disabled={semesterDateStatus === 'submitting'}
                >
                  <MenuItem value="1/2026">1/2026</MenuItem>
                  <MenuItem value="2/2026">2/2026</MenuItem>
                  <MenuItem value="1/2027">1/2027</MenuItem>
                  <MenuItem value="2/2027">2/2027</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                type="date"
                label="Start Date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                disabled={semesterDateStatus === 'submitting'}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                type="date"
                label="End Date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                disabled={semesterDateStatus === 'submitting'}
                InputLabelProps={{
                  shrink: true,
                }}
                error={!!(endDate && startDate && new Date(endDate) < new Date(startDate))}
                helperText={
                  endDate && startDate && new Date(endDate) < new Date(startDate)
                    ? 'End date must be after start date'
                    : ''
                }
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            {semesterDateStatus === 'submitting' && <CircularProgress size={24} />}
            <Button
              type="submit"
              variant="contained"
              disabled={semesterDateStatus === 'submitting' || !startDate || !endDate}
            >
              Save Dates
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Assign Teacher to Classroom */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: { xs: 3, md: 4 } }}>
        <Stack spacing={2.5} component="form" onSubmit={handleSubmit} noValidate>
          <Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Assign teacher to classroom
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Coordinate campus logistics by pairing instructors with available rooms and cohorts.
            </Typography>
          </Box>
          <Divider />

          {formState.status === 'error' && <Alert severity="error">{formState.message}</Alert>}
          {formState.status === 'success' && <Alert severity="success">{formState.message}</Alert>}
          {!majors.length && (
            <Alert severity="warning">
              Major catalog data is unavailable right now. Teachers can be assigned once majors are restored.
            </Alert>
          )}

          <Grid container spacing={2.5}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel id="teacher-select">Teacher</InputLabel>
                <Select
                  labelId="teacher-select"
                  label="Teacher"
                  value={formState.teacherId}
                  onChange={(event) => setFormState((prev) => ({ ...prev, teacherId: event.target.value }))}
                >
                  {teachers.map((teacher) => (
                    <MenuItem key={teacher.id} value={String(teacher.id)}>
                      {teacher.displayName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required disabled={!majors.length}>
                <InputLabel id="major-select">Major focus</InputLabel>
                <Select
                  labelId="major-select"
                  label="Major focus"
                  value={formState.majorFocus}
                  onChange={(event) => {
                    const newMajor = event.target.value;
                    // Clear classroom selection when major changes to ensure it matches
                    setFormState((prev) => ({ 
                      ...prev, 
                      majorFocus: newMajor, 
                      classroomId: '' // Force reselection of classroom for new major
                    }));
                  }}
                >
                  {majors.map((major) => (
                    <MenuItem key={major.major} value={major.major}>
                      {major.major}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required disabled={!formState.majorFocus}>
                <InputLabel id="classroom-select">Classroom</InputLabel>
                <Select
                  labelId="classroom-select"
                  label="Classroom"
                  value={formState.classroomId}
                  onChange={(event) => setFormState((prev) => ({ ...prev, classroomId: event.target.value }))}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                      },
                    },
                    variant: 'menu',
                    anchorOrigin: {
                      vertical: 'bottom',
                      horizontal: 'left',
                    },
                    transformOrigin: {
                      vertical: 'top',
                      horizontal: 'left',
                    },
                  }}
                >
                  {filteredClassrooms.length > 0 ? (
                    filteredClassrooms.map((room) => (
                      <MenuItem key={room.id} value={String(room.id)}>
                        {room.name} — {room.location} (Capacity: {room.capacity})
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>
                      {formState.majorFocus ? `No classrooms available for ${formState.majorFocus}` : 'Select a major first'}
                    </MenuItem>
                  )}
                </Select>
                {filteredClassrooms.length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    {filteredClassrooms.length} classroom{filteredClassrooms.length !== 1 ? 's' : ''} available for {formState.majorFocus}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Course code"
                value={formState.courseCode}
                onChange={(event) => setFormState((prev) => ({ ...prev, courseCode: event.target.value }))}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Course title"
                value={formState.courseTitle}
                onChange={(event) => setFormState((prev) => ({ ...prev, courseTitle: event.target.value }))}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="weekday-select">Weekday</InputLabel>
                <Select
                  labelId="weekday-select"
                  label="Weekday"
                  value={formState.weekday}
                  onChange={(event) => setFormState((prev) => ({ ...prev, weekday: event.target.value }))}
                >
                  {weekdays.map((day) => (
                    <MenuItem key={day} value={day}>
                      {day}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Start time"
                value={formState.startTime}
                onChange={(event) => setFormState((prev) => ({ ...prev, startTime: event.target.value }))}
                required
                type="time"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="End time"
                value={formState.endTime}
                onChange={(event) => setFormState((prev) => ({ ...prev, endTime: event.target.value }))}
                required
                type="time"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Student group"
                value={formState.studentGroup}
                onChange={(event) => setFormState((prev) => ({ ...prev, studentGroup: event.target.value }))}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel id="semester-select">Semester</InputLabel>
                <Select
                  labelId="semester-select"
                  label="Semester"
                  value={formState.semester}
                  onChange={(event) => setFormState((prev) => ({ ...prev, semester: event.target.value }))}
                >
                  <MenuItem value="1/2026">1/2026</MenuItem>
                  <MenuItem value="2/2026">2/2026</MenuItem>
                  <MenuItem value="1/2027">1/2027</MenuItem>
                  <MenuItem value="2/2027">2/2027</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={formState.status === 'submitting'}
            startIcon={formState.status === 'submitting' ? <CircularProgress size={20} color="inherit" /> : undefined}
          >
            {formState.status === 'submitting' ? 'Assigning…' : 'Assign classroom'}
          </Button>
        </Stack>
      </Paper>

      {/* Active Assignments */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: { xs: 3, md: 4 } }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Active assignments
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Every classroom assignment issued by IT administrators appears here.
            </Typography>
          </Box>
          <Divider />
          {loading && (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={24} />
            </Box>
          )}
          {!loading && (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Course</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Teacher</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Classroom</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Schedule</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Semester</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Major</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {enrichedAssignments.map((assignment) => (
                  <TableRow key={assignment.id} hover>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography fontWeight={600} variant="body2">
                          {assignment.courseTitle}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {assignment.courseCode}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{assignment.teacherName}</Typography>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography fontWeight={500} variant="body2">
                          {assignment.classroomName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {assignment.classroomLocation}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {assignment.weekday}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {assignment.startTime} – {assignment.endTime}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{assignment.semester || '1/2026'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={assignment.majorFocus} size="small" color="info" variant="outlined" />
                    </TableCell>
                  </TableRow>
                ))}
                {!enrichedAssignments.length && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      <Typography variant="body2">No classroom assignments have been created yet.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Stack>
      </Paper>

      {/* All Classrooms */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: { xs: 3, md: 4 } }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              All classrooms
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View all available classrooms on campus.
            </Typography>
          </Box>
          <Divider />
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Capacity</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Resources</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {classrooms.map((room) => (
                <TableRow key={room.id} hover>
                  <TableCell>
                    <Typography fontWeight={600} variant="body2">
                      {room.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {room.location}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{room.capacity}</Typography>
                  </TableCell>
                  <TableCell>
                    {room.resources && room.resources.length > 0 ? (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {room.resources.map((resource, idx) => (
                          <Chip key={idx} label={resource} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!classrooms.length && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    <Typography variant="body2">No classrooms have been created yet.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Stack>
      </Paper>

      {/* Create Announcement */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: { xs: 3, md: 4 } }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Create Announcement or Event
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Post announcements and events visible to all students.
            </Typography>
          </Box>
          <Divider />
          <AnnouncementForm onCreate={onCreateAnnouncement} />
        </Stack>
      </Paper>

      {/* Announcements & Events */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: { xs: 3, md: 4 } }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Announcements & Events
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage announcements and events visible to all students.
            </Typography>
          </Box>
          <Divider />
          {loading && (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={24} />
            </Box>
          )}
          {!loading && (
            <Stack spacing={2}>
              {announcements.map((announcement) => (
                <Paper key={announcement.id} elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <Chip
                            label={announcement.type}
                            size="small"
                            color={announcement.type === 'event' ? 'primary' : 'default'}
                            sx={{ textTransform: 'capitalize' }}
                          />
                          <Typography variant="h6" fontWeight={600}>
                            {announcement.title}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          Posted by {announcement.postedByName || 'Admin'} on {formatTimestamp(announcement.createdAt)}
                          {announcement.eventDate && ` • Event Date: ${formatTimestamp(announcement.eventDate)}`}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={async () => {
                          if (confirm('Are you sure you want to delete this announcement?')) {
                            await onDeleteAnnouncement(announcement.id);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </Stack>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', pt: 0.5 }}>
                      {announcement.content}
                    </Typography>
                  </Stack>
                </Paper>
              ))}
              {announcements.length === 0 && (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No announcements yet. Create one above to get started.
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}

type StudentRegistrationsManagerProps = {
  students: Student[];
  session: StaffSession;
  onStudentsChange?: () => void;
};

function StudentRegistrationsManager({ students, session, onStudentsChange }: StudentRegistrationsManagerProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [dashboardData, setDashboardData] = useState<StudentDashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [deregistering, setDeregistering] = useState<Map<string, boolean>>(new Map());
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!selectedStudentId) {
      setDashboardData(null);
      return;
    }

    let cancelled = false;
    const loadDashboard = async () => {
      setLoadingDashboard(true);
      setMessage(null);
      try {
        const data = await fetchStudentDashboard(Number(selectedStudentId));
        if (!cancelled) {
          setDashboardData(data);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to load student data.' });
        }
      } finally {
        if (!cancelled) {
          setLoadingDashboard(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [selectedStudentId]);

  const handleDeregister = async (studentId: number, courseCode: string, courseTitle: string) => {
    const key = `${studentId}-${courseCode}`;
    if (!confirm(`Are you sure you want to deregister this student from "${courseTitle}" (${courseCode})?`)) {
      return;
    }

    setDeregistering((prev) => new Map(prev).set(key, true));
    setMessage(null);

    try {
      await deregisterStudentFromCourse(session.token, studentId, courseCode);
      setMessage({ type: 'success', text: `Successfully deregistered student from ${courseTitle} (${courseCode}).` });
      
      // Reload dashboard data
      const data = await fetchStudentDashboard(studentId);
      setDashboardData(data);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to deregister student from course.' });
    } finally {
      setDeregistering((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudentId) return;

    const student = students.find((s) => String(s.id) === selectedStudentId);
    const studentName = student ? `${student.firstName} ${student.lastName}` : `Student #${selectedStudentId}`;

    if (!confirm(`Are you sure you want to DELETE the student account for "${studentName}" (ID: ${selectedStudentId})?\n\nThis action will permanently delete:\n- Student account\n- All course registrations\n- All grades and GPA records\n- All timetable entries\n\nThis action CANNOT be undone.`)) {
      return;
    }

    setDeleting(true);
    setMessage(null);

    try {
      await deleteStudentAccount(session.token, Number(selectedStudentId));
      setMessage({ type: 'success', text: `Student account "${studentName}" has been deleted successfully.` });
      
      // Clear selected student and dashboard
      setSelectedStudentId('');
      setDashboardData(null);
      
      // Refresh students list
      if (onStudentsChange) {
        onStudentsChange();
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to delete student account.' });
    } finally {
      setDeleting(false);
    }
  };

  const registrations = dashboardData?.registrations ?? [];

  const selectedStudent = students.find((s) => String(s.id) === selectedStudentId);
  const totalCredits = registrations.reduce((sum, r) => sum + (r.credits || 0), 0);
  const confirmedCount = registrations.filter((r) => r.confirmedBy !== null).length;

  return (
    <Stack spacing={3}>
      {/* Student Selector */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" fontWeight={600}>
              Select Student
            </Typography>
            {selectedStudentId && (
              <Button
                size="small"
                color="error"
                variant="outlined"
                disabled={deleting}
                onClick={handleDeleteStudent}
                startIcon={deleting ? <CircularProgress size={14} /> : undefined}
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </Button>
            )}
          </Stack>
          <FormControl fullWidth>
            <InputLabel id="student-select-label">Choose a student</InputLabel>
            <Select
              labelId="student-select-label"
              label="Choose a student"
              value={selectedStudentId}
              onChange={(event) => setSelectedStudentId(event.target.value)}
            >
              {students.map((student) => (
                <MenuItem key={student.id} value={String(student.id)}>
                  {student.firstName} {student.lastName} (#{student.id})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {selectedStudent && (
            <Box sx={{ pt: 1 }}>
              <Chip
                label={`${selectedStudent.firstName} ${selectedStudent.lastName} - ${selectedStudent.primaryInterest || 'N/A'}`}
                color="primary"
                variant="outlined"
                size="small"
              />
            </Box>
          )}
        </Stack>
      </Paper>

      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {loadingDashboard && (
        <Box display="flex" justifyContent="center" alignItems="center" py={6}>
          <CircularProgress />
        </Box>
      )}

      {!loadingDashboard && selectedStudentId && dashboardData && (
        <Stack spacing={3}>
          {/* Summary Statistics */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
                <Stack spacing={1}>
                  <Typography variant="h4" fontWeight={700}>
                    {registrations.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active courses
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
                <Stack spacing={1}>
                  <Typography variant="h4" fontWeight={700}>
                    {totalCredits}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total credits registered
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
                <Stack spacing={1}>
                  <Typography variant="h4" fontWeight={700}>
                    {confirmedCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Confirmed registrations
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
                <Stack spacing={1}>
                  <Typography variant="h4" fontWeight={700}>
                    {formatCurrency(totalCredits * 100)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Estimated tuition
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          {/* Class Registrations Table */}
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 3 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Class registrations
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Confirm enrolled classes, instructors, and registration status in one place.
                </Typography>
              </Box>

              {registrations.length > 0 ? (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Instructor</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Credits</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Tuition</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Confirmed</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Registered</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {registrations.map((registration) => {
                      // Use courseCode from registration if available, otherwise try to extract from className
                      const courseCode = registration.courseCode || (() => {
                        const courseCodeMatch = registration.className.match(/^([A-Z0-9-]+)/);
                        return courseCodeMatch ? courseCodeMatch[1] : registration.className.split(' ')[0] || 'N/A';
                      })();
                      const key = `${selectedStudentId}-${courseCode}`;
                      const isDeregistering = deregistering.get(key) || false;
                      const credits = registration.credits || 0;
                      const tuition = credits * 100;

                      return (
                        <TableRow key={registration.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {registration.className}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{registration.instructor || 'TBA'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{credits}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{formatCurrency(tuition)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={registration.status}
                              size="small"
                              color={registration.status === 'registered' ? 'success' : 'warning'}
                              sx={{ textTransform: 'capitalize' }}
                            />
                          </TableCell>
                          <TableCell>
                            {registration.confirmedBy ? (
                              <Chip label="Confirmed" size="small" color="success" variant="outlined" />
                            ) : (
                              <Chip label="Pending" size="small" color="warning" variant="outlined" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {formatTimestamp(registration.registeredAt)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              color="error"
                              variant="outlined"
                              disabled={isDeregistering || courseCode === 'N/A'}
                              onClick={() => handleDeregister(Number(selectedStudentId), courseCode, registration.className)}
                              startIcon={isDeregistering ? <CircularProgress size={14} /> : undefined}
                            >
                              {isDeregistering ? 'Processing...' : 'Deregister'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No course registrations found for this student.
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>
        </Stack>
      )}

      {!selectedStudentId && !loadingDashboard && (
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 4 }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Select a student from the dropdown above to view their course registrations.
          </Typography>
        </Paper>
      )}
    </Stack>
  );
}

type StudentAdminWorkspaceProps = {
  loading: boolean;
  payments: FeePayment[];
  students: Student[];
  announcements: Announcement[];
  onRecordPayment: (
    input: Omit<PaymentFormState, 'status' | 'message'>
  ) => Promise<FeePayment>;
  onCreateAnnouncement: (input: {
    title: string;
    content: string;
    type: 'announcement' | 'event';
    eventDate?: string | null;
  }) => Promise<Announcement>;
  onDeleteAnnouncement: (id: number) => Promise<void>;
};

function StudentAdminWorkspace({ 
  loading, 
  payments, 
  students, 
  announcements,
  onRecordPayment,
  onCreateAnnouncement,
  onDeleteAnnouncement
}: StudentAdminWorkspaceProps) {
  const [formState, setFormState] = useState<PaymentFormState>({
    studentId: '',
    amount: '',
    description: '',
    statusValue: 'paid',
    dueDate: '',
    status: 'idle',
    message: ''
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-fill amount and description when student is selected
  // Sum ALL outstanding fees for the student (classroom fees, course fees, etc.)
  useEffect(() => {
    if (formState.studentId && students.length > 0 && payments.length > 0) {
      const studentIdNum = Number(formState.studentId);
      if (isNaN(studentIdNum)) return;

      // Calculate total outstanding fees for the selected student
      // Include ALL fees with status 'pending' (classroom registration, course registration, etc.)
      const studentPayments = payments.filter(
        (payment) => payment.studentId === studentIdNum && payment.status === 'pending'
      );
      
      const outstandingFees = studentPayments.reduce((sum, payment) => sum + payment.amount, 0);

      // Auto-fill amount with total of all outstanding fees whenever student changes
      if (outstandingFees > 0) {
        // Create a description that includes all outstanding fees for better matching
        const feeDescriptions = studentPayments.map(p => p.description || 'Fee').join('; ');
        const description = studentPayments.length === 1 
          ? (studentPayments[0].description || 'Fee payment')
          : `Payment for ${studentPayments.length} outstanding fees: ${feeDescriptions}`;
        
        setFormState((prev) => ({
          ...prev,
          amount: outstandingFees.toFixed(2),
          description: prev.description || description
        }));
      } else {
        // If no outstanding fees, clear the amount
        setFormState((prev) => ({
          ...prev,
          amount: '',
          description: prev.description || ''
        }));
      }
    }
  }, [formState.studentId, students, payments]); // Removed formState.amount and formState.description from dependencies

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.studentId || !formState.amount) {
      setFormState((prev) => ({ ...prev, status: 'error', message: 'Student and amount are required.' }));
      return;
    }

    setFormState((prev) => ({ ...prev, status: 'submitting', message: 'Saving payment…' }));

    try {
      await onRecordPayment({
        studentId: formState.studentId,
        amount: formState.amount,
        description: formState.description,
        statusValue: formState.statusValue,
        dueDate: formState.dueDate
      });

      setFormState({
        studentId: formState.studentId,
        amount: '',
        description: '',
        statusValue: 'paid',
        dueDate: '',
        status: 'success',
        message: 'Payment recorded successfully.'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to record payment.';
      setFormState((prev) => ({ ...prev, status: 'error', message }));
    }
  };

  const studentMap = useMemo(
    () => new Map(students.map((student) => [student.id, `${student.firstName} ${student.lastName}`])),
    [students]
  );

  // Filter payments by search query
  const filteredPayments = useMemo(() => {
    if (!searchQuery.trim()) {
      return payments;
    }

    const query = searchQuery.toLowerCase().trim();
    return payments.filter((payment) => {
      const studentName = studentMap.get(payment.studentId) ?? '';
      const studentNameLower = studentName.toLowerCase();
      const description = (payment.description || '').toLowerCase();
      
      return (
        studentNameLower.includes(query) ||
        description.includes(query) ||
        String(payment.studentId).includes(query)
      );
    });
  }, [payments, searchQuery, studentMap]);

  // Calculate outstanding fees breakdown for the selected student
  const outstandingFeesBreakdown = useMemo(() => {
    if (!formState.studentId) return { total: 0, fees: [] };
    
    const studentIdNum = Number(formState.studentId);
    if (isNaN(studentIdNum)) return { total: 0, fees: [] };

    const studentPayments = payments.filter(
      (payment) => payment.studentId === studentIdNum && payment.status === 'pending'
    );
    
    const total = studentPayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    return {
      total,
      fees: studentPayments
    };
  }, [formState.studentId, payments]);

  return (
    <Stack spacing={4}>
      <Paper elevation={3} sx={{  p: { xs: 3, md: 4 } }}>
        <Stack spacing={2.5} component="form" onSubmit={handleSubmit} noValidate>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Record tuition or fee payments
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Keep financial records accurate by logging receipts from the Student Administrative Office.
            </Typography>
          </Box>

          {formState.status === 'error' && <Alert severity="error">{formState.message}</Alert>}
          {formState.status === 'success' && <Alert severity="success">{formState.message}</Alert>}

          <Grid container spacing={2.5}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel id="payment-student">Student</InputLabel>
                <Select
                  labelId="payment-student"
                  label="Student"
                  value={formState.studentId}
                  onChange={(event) => setFormState((prev) => ({ ...prev, studentId: event.target.value }))}
                >
                  {students.map((student) => (
                    <MenuItem key={student.id} value={String(student.id)}>
                      {student.firstName} {student.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Amount"
                value={formState.amount}
                onChange={(event) => setFormState((prev) => ({ ...prev, amount: event.target.value }))}
                required
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
                fullWidth
                helperText={
                  outstandingFeesBreakdown.total > 0 && formState.studentId
                    ? `Auto-filled: ${outstandingFeesBreakdown.fees.length} outstanding fee(s) totaling S$${outstandingFeesBreakdown.total.toFixed(2)}. Breakdown: ${outstandingFeesBreakdown.fees.map(f => `${f.description || 'Fee'}: S$${f.amount.toFixed(2)}`).join(', ')}`
                    : 'Enter the payment amount or select a student to auto-fill outstanding fees'
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                value={formState.description}
                onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                fullWidth
                multiline
                minRows={2}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="status-select">Status</InputLabel>
                <Select
                  labelId="status-select"
                  label="Status"
                  value={formState.statusValue}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, statusValue: event.target.value as 'pending' | 'paid' }))
                  }
                >
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Due date"
                type="date"
                value={formState.dueDate}
                onChange={(event) => setFormState((prev) => ({ ...prev, dueDate: event.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={formState.status === 'submitting'}
            startIcon={formState.status === 'submitting' ? <CircularProgress size={20} color="inherit" /> : undefined}
          >
            {formState.status === 'submitting' ? 'Recording…' : 'Record payment'}
          </Button>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{  border: '1px solid', borderColor: 'divider', p: { xs: 3, md: 4 } }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Recent payments
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Monitor the latest tuition and fee activity across the student body.
              </Typography>
            </Box>
            {loading && <CircularProgress size={20} />}
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="Search by student name, description, or ID"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              size="small"
              sx={{ maxWidth: 400, flexGrow: 1 }}
            />
            {searchQuery && (
              <Typography variant="body2" color="text.secondary">
                Showing {filteredPayments.length} of {payments.length} payment{payments.length !== 1 ? 's' : ''}
              </Typography>
            )}
          </Stack>

          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Received</TableCell>
                <TableCell>Due</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <Tooltip title={payment.studentId.toString()} placement="top">
                      <span>{studentMap.get(payment.studentId) ?? `Student #${payment.studentId}`}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{payment.description || 'Fee'}</TableCell>
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>
                    <Chip
                      label={payment.status}
                      size="small"
                      color={payment.status === 'paid' ? 'success' : 'warning'}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>{formatTimestamp(payment.receivedAt)}</TableCell>
                  <TableCell>{payment.dueDate ? formatTimestamp(payment.dueDate) : '—'}</TableCell>
                </TableRow>
              ))}
              {!filteredPayments.length && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {searchQuery ? `No payments found matching "${searchQuery}"` : 'No payments logged yet.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: { xs: 3, md: 4 } }}>
        <Stack spacing={3}>
          <Typography variant="h6" fontWeight={700}>
            Create Announcement or Event
          </Typography>
          <AnnouncementForm onCreate={onCreateAnnouncement} />
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: { xs: 3, md: 4 } }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Announcements & Events
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage announcements and events visible to all students.
              </Typography>
            </Box>
            {loading && <CircularProgress size={20} />}
          </Stack>

          <Stack spacing={2}>
            {announcements.map((announcement) => (
              <Paper key={announcement.id} elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={announcement.type}
                          size="small"
                          color={announcement.type === 'event' ? 'primary' : 'default'}
                          sx={{ textTransform: 'capitalize' }}
                        />
                        <Typography variant="h6" fontWeight={600}>
                          {announcement.title}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Posted by {announcement.postedByName || 'Admin'} on {formatTimestamp(announcement.createdAt)}
                        {announcement.eventDate && ` • Event Date: ${formatTimestamp(announcement.eventDate)}`}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      color="error"
                      onClick={async () => {
                        if (confirm('Are you sure you want to delete this announcement?')) {
                          await onDeleteAnnouncement(announcement.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </Stack>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {announcement.content}
                  </Typography>
                </Stack>
              </Paper>
            ))}
            {announcements.length === 0 && (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                No announcements yet. Create one above to get started.
              </Typography>
            )}
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}

type AnnouncementFormProps = {
  onCreate: (input: {
    title: string;
    content: string;
    type: 'announcement' | 'event';
    eventDate?: string | null;
  }) => Promise<Announcement>;
};

function AnnouncementForm({ onCreate }: AnnouncementFormProps) {
  const [formState, setFormState] = useState({
    title: '',
    content: '',
    type: 'announcement' as 'announcement' | 'event',
    eventDate: '',
    status: 'idle' as AsyncState,
    message: ''
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormState((prev) => ({ ...prev, status: 'submitting', message: '' }));

    try {
      await onCreate({
        title: formState.title,
        content: formState.content,
        type: formState.type,
        eventDate: formState.type === 'event' && formState.eventDate ? formState.eventDate : null
      });
      setFormState({
        title: '',
        content: '',
        type: 'announcement',
        eventDate: '',
        status: 'success',
        message: 'Announcement created successfully!'
      });
      setTimeout(() => {
        setFormState((prev) => ({ ...prev, status: 'idle', message: '' }));
      }, 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create announcement.';
      setFormState((prev) => ({ ...prev, status: 'error', message }));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={3}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Title"
              value={formState.title}
              onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
              required
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={formState.type}
                onChange={(e) => setFormState((prev) => ({ ...prev, type: e.target.value as 'announcement' | 'event' }))}
                label="Type"
              >
                <MenuItem value="announcement">Announcement</MenuItem>
                <MenuItem value="event">Event</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {formState.type === 'event' && (
            <Grid item xs={12} md={6}>
              <TextField
                label="Event Date & Time"
                type="datetime-local"
                value={formState.eventDate}
                onChange={(e) => setFormState((prev) => ({ ...prev, eventDate: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          )}
          <Grid item xs={12}>
            <TextField
              label="Content"
              value={formState.content}
              onChange={(e) => setFormState((prev) => ({ ...prev, content: e.target.value }))}
              required
              fullWidth
              multiline
              rows={4}
            />
          </Grid>
        </Grid>

        {formState.message && (
          <Alert severity={formState.status === 'error' ? 'error' : 'success'}>
            {formState.message}
          </Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          disabled={formState.status === 'submitting' || !formState.title || !formState.content}
        >
          {formState.status === 'submitting' ? 'Creating…' : 'Create Announcement'}
        </Button>
      </Stack>
    </form>
  );
}
