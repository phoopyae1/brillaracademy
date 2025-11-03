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
    setPayments((existing) => [payment, ...existing]);
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
    semester: 'Fall 2024',
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
};

function ItAdminWorkspace({ loading, assignments, classrooms, teachers, majors, onCreateAssignment }: ItAdminWorkspaceProps) {
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
    status: 'idle',
    message: ''
  });

  const teacherMap = useMemo(() => new Map(teachers.map((teacher) => [teacher.id, teacher.displayName])), [teachers]);
  const classroomMap = useMemo(() => new Map(classrooms.map((room) => [room.id, room])), [classrooms]);
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
      !formState.majorFocus
    ) {
      setFormState((prev) => ({ ...prev, status: 'error', message: 'Complete every field before assigning a classroom.' }));
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
      majorFocus: formState.majorFocus
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
    <Stack spacing={4}>
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
              <FormControl fullWidth required>
                <InputLabel id="classroom-select">Classroom</InputLabel>
                <Select
                  labelId="classroom-select"
                  label="Classroom"
                  value={formState.classroomId}
                  onChange={(event) => setFormState((prev) => ({ ...prev, classroomId: event.target.value }))}
                >
                  {classrooms.map((room) => (
                    <MenuItem key={room.id} value={String(room.id)}>
                      {room.name}
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
                  onChange={(event) => setFormState((prev) => ({ ...prev, majorFocus: event.target.value }))}
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
            <Grid item xs={12}>
              <TextField
                label="Student group"
                value={formState.studentGroup}
                onChange={(event) => setFormState((prev) => ({ ...prev, studentGroup: event.target.value }))}
                required
                fullWidth
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
                <TableCell>Major</TableCell>
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
                    <Chip label={assignment.majorFocus} size="small" color="info" variant="outlined" />
                  </TableCell>
                </TableRow>
              ))}
              {!enrichedAssignments.length && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
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

          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Received</TableCell>
                <TableCell>Due</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <Tooltip title={payment.studentId.toString()} placement="top">
                      <span>{studentMap.get(payment.studentId) ?? `Student #${payment.studentId}`}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>${payment.amount.toFixed(2)}</TableCell>
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
              {!payments.length && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No payments logged yet.
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
