"use client";

import { useEffect, useMemo, useState } from 'react';
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
  syncAssignmentEnrollments,
  type StaffAccount,
  type TeacherDashboard,
  type TeachingAssignment,
  type Classroom,
  type FeePayment,
  type Student,
  type GradeRecord,
  type TeacherRosterStudent,
  type TeacherScheduleSlot,
  type MajorSubjectCatalogEntry
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
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(value);
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

export default function ForgePortalPage() {
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

  useEffect(() => {
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

    let cancelled = false;
    setLoading(true);
    setLoadError('');

    const load = async () => {
      try {
        if (session.staff.role === 'TEACHER') {
          const dashboard = await fetchTeacherDashboard(session.token);
          if (!cancelled) {
            setTeacherDashboard(dashboard);
          }
        } else if (session.staff.role === 'IT_ADMIN') {
          const [assignmentList, classroomList, staffList, majors] = await Promise.all([
            listTeachingAssignments(session.token),
            listClassrooms(session.token),
            listStaff(session.token),
            fetchMajorSubjectCatalog()
          ]);

          if (!cancelled) {
            setAssignments(assignmentList);
            setClassrooms(classroomList);
            setTeachers(staffList.filter((member) => member.role === 'TEACHER'));
            setMajorCatalog(majors);
          }
        } else if (session.staff.role === 'STUDENT_ADMIN') {
          const [paymentList, studentList] = await Promise.all([
            listFeePayments(session.token),
            listStudents(session.token)
          ]);

          if (!cancelled) {
            setPayments(paymentList);
            setStudents(studentList);
          }
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Unable to load portal data.';
          setLoadError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
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
            <TeacherWorkspace dashboard={teacherDashboard} loading={loading} onRecordGrade={handleRecordGrade} />
          )}

          {session?.staff.role === 'IT_ADMIN' && (
            <ItAdminWorkspace
              loading={loading}
              assignments={assignments}
              classrooms={classrooms}
              teachers={teachers}
              majors={majorCatalog}
              onCreateAssignment={handleCreateAssignment}
              session={session}
            />
          )}

          {session?.staff.role === 'STUDENT_ADMIN' && (
            <StudentAdminWorkspace
              loading={loading}
              payments={payments}
              students={students}
              onRecordPayment={handleRecordPayment}
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
};

function TeacherWorkspace({ dashboard, loading, onRecordGrade }: TeacherWorkspaceProps) {
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
  onCreateAssignment: (
    input: Omit<AssignmentFormState, 'status' | 'message'>
  ) => Promise<TeachingAssignment>;
  session: StaffSession;
};

function ItAdminWorkspace({ loading, assignments, classrooms, teachers, majors, onCreateAssignment, session }: ItAdminWorkspaceProps) {
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
  const [syncingAssignments, setSyncingAssignments] = useState<Set<number>>(new Set());

  // Load current semester on mount
  useEffect(() => {
    const loadCurrentSemester = async () => {
      try {
        const semester = await getCurrentSemester(session.token);
        setCurrentSemester(semester);
      } catch (error) {
        console.error('Failed to load current semester', error);
        setSemesterError('Failed to load current semester');
      }
    };
    void loadCurrentSemester();
  }, [session.token]);

  const handleUpdateSemester = async (newSemester: string) => {
    setSemesterUpdateStatus('submitting');
    setSemesterError('');
    try {
      const updated = await updateCurrentSemester(session.token, newSemester);
      setCurrentSemester(updated);
      setSemesterUpdateStatus('success');
      setTimeout(() => setSemesterUpdateStatus('idle'), 3000);
    } catch (error) {
      setSemesterError(error instanceof Error ? error.message : 'Failed to update semester');
      setSemesterUpdateStatus('error');
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

  const handleSyncEnrollments = async (assignmentId: number) => {
    setSyncingAssignments((prev) => new Set(prev).add(assignmentId));
    try {
      const result = await syncAssignmentEnrollments(session.token, assignmentId);
      let message = `Enrollment sync completed!\n\nEnrolled: ${result.enrolled} student(s)\nSkipped: ${result.skipped} student(s)`;
      
      // Show detailed information if available
      if (result.details && result.details.length > 0) {
        message += '\n\nDetails:\n' + result.details.join('\n');
      }
      
      alert(message);
      // Refresh assignments to show updated enrollments
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to sync enrollments');
    } finally {
      setSyncingAssignments((prev) => {
        const next = new Set(prev);
        next.delete(assignmentId);
        return next;
      });
    }
  };

  const enrichedAssignments = assignments.map((assignment) => ({
    ...assignment,
    teacherName: teacherMap.get(assignment.teacherId) ?? `Teacher #${assignment.teacherId}`,
    classroomName: classroomMap.get(assignment.classroomId)?.name ?? `Classroom #${assignment.classroomId}`,
    classroomLocation: classroomMap.get(assignment.classroomId)?.location ?? 'TBA'
  }));

  return (
    <Stack spacing={4}>
      <Paper elevation={3} sx={{  p: { xs: 3, md: 4 } }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Current Semester
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Current semester is open for: <strong>{currentSemester}</strong>
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 150 }}>
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
                <Alert severity="success" sx={{ py: 0 }}>Semester updated successfully</Alert>
              )}
              {semesterError && <Alert severity="error" sx={{ py: 0 }}>{semesterError}</Alert>}
            </Stack>
          </Box>
        </Stack>
      </Paper>

      <Paper elevation={3} sx={{  p: { xs: 3, md: 4 } }}>
        <Stack spacing={2.5} component="form" onSubmit={handleSubmit} noValidate>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Assign teacher to classroom
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Coordinate campus logistics by pairing instructors with available rooms and cohorts.
            </Typography>
          </Box>

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

      <Paper elevation={0} sx={{  border: '1px solid', borderColor: 'divider', p: { xs: 3, md: 4 } }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Active assignments
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Every classroom assignment issued by IT administrators appears here.
              </Typography>
            </Box>
            {loading && <CircularProgress size={20} />}
          </Stack>

          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell>Course</TableCell>
                <TableCell>Teacher</TableCell>
                <TableCell>Classroom</TableCell>
                <TableCell>Schedule</TableCell>
                <TableCell>Semester</TableCell>
                <TableCell>Major</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {enrichedAssignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography fontWeight={600}>{assignment.courseTitle}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {assignment.courseCode}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{assignment.teacherName}</TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography fontWeight={600}>{assignment.classroomName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {assignment.classroomLocation}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
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
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleSyncEnrollments(assignment.id)}
                      disabled={syncingAssignments.has(assignment.id)}
                      startIcon={syncingAssignments.has(assignment.id) ? <CircularProgress size={16} /> : undefined}
                    >
                      {syncingAssignments.has(assignment.id) ? 'Syncing...' : 'Sync Enrollments'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!enrichedAssignments.length && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No classroom assignments have been created yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{  border: '1px solid', borderColor: 'divider', p: { xs: 3, md: 4 } }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                All classrooms
              </Typography>
              <Typography variant="body2" color="text.secondary">
                View all available classrooms on campus.
              </Typography>
            </Box>
          </Stack>

          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Capacity</TableCell>
                <TableCell>Resources</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {classrooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell>
                    <Typography fontWeight={600}>{room.name}</Typography>
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
                    No classrooms have been created yet.
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

type StudentAdminWorkspaceProps = {
  loading: boolean;
  payments: FeePayment[];
  students: Student[];
  onRecordPayment: (
    input: Omit<PaymentFormState, 'status' | 'message'>
  ) => Promise<FeePayment>;
};

function StudentAdminWorkspace({ loading, payments, students, onRecordPayment }: StudentAdminWorkspaceProps) {
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

  // Auto-fill amount and description when student is selected (only if fields are empty)
  // Sum ALL outstanding fees for the student (classroom fees, course fees, etc.)
  useEffect(() => {
    if (formState.studentId && students.length > 0 && payments.length > 0 && !formState.amount) {
      const studentIdNum = Number(formState.studentId);
      if (isNaN(studentIdNum)) return;

      // Calculate total outstanding fees for the selected student
      // Include ALL fees with status 'pending' (classroom registration, course registration, etc.)
      const studentPayments = payments.filter(
        (payment) => payment.studentId === studentIdNum && payment.status === 'pending'
      );
      
      const outstandingFees = studentPayments.reduce((sum, payment) => sum + payment.amount, 0);

      // Auto-fill amount with total of all outstanding fees
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
      }
    }
  }, [formState.studentId, formState.amount, formState.description, students, payments]);

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
                    ? `Auto-filled: ${outstandingFeesBreakdown.fees.length} outstanding fee(s) totaling ${outstandingFeesBreakdown.total.toFixed(2)} Baht. Breakdown: ${outstandingFeesBreakdown.fees.map(f => `${f.description || 'Fee'}: ${f.amount.toFixed(2)}`).join(', ')}`
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
    </Stack>
  );
}
