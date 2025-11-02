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
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';

import AdminRoleOverview, { type RoleDefinition } from '@/components/admin/AdminRoleOverview';
import StudentProvisioningForm from '@/components/admin/StudentProvisioningForm';
import StaffProvisioningForm from '@/components/admin/StaffProvisioningForm';
import {
  adminLogin,
  createStaff,
  createStudent,
  listStaff,
  listStudents,
  type StaffAccount,
  type Student
} from '@/lib/db';

const roleDefinitions: readonly RoleDefinition[] = [
  {
    title: 'IT Administrator',
    description:
      'Ensures secure authentication, maintains the learning infrastructure, and provisions new accounts for every learner and staff member.',
    highlights: ['Manage platform access', 'Coordinate SSO and integrations', 'Handle credential resets']
  },
  {
    title: 'Teacher',
    description:
      'Prepares course content, confirms class rosters, and collaborates with administrative teams to keep schedules accurate.',
    highlights: ['Validate class rosters', 'Share curriculum updates', 'Submit schedule adjustments']
  },
  {
    title: 'Student Administrative Office',
    description:
      'Completes onboarding, verifies enrollment records, and serves as the primary contact for students requesting access.',
    highlights: ['Verify enrollment paperwork', 'Issue official credentials', 'Support student onboarding']
  }
];

const DEFAULT_ADMIN_EMAIL = process.env.NEXT_PUBLIC_DEFAULT_ADMIN_EMAIL ?? 'it-admin@brillaracademy.edu';
const DEFAULT_ADMIN_PASSWORD_HINT = process.env.NEXT_PUBLIC_DEFAULT_ADMIN_PASSWORD ?? 'changeme';

export default function AdminPortalPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  const [authToken, setAuthToken] = useState('');
  const [currentStaff, setCurrentStaff] = useState<StaffAccount | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loginState, setLoginState] = useState<{ status: 'idle' | 'submitting' | 'error'; message: string }>(
    {
      status: 'idle',
      message: ''
    }
  );

  const canProvisionStudents = currentStaff?.role === 'IT_ADMIN' || currentStaff?.role === 'STUDENT_ADMIN';
  const canProvisionStaff = currentStaff?.role === 'IT_ADMIN';

  const sortedStudents = useMemo(
    () => [...students].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [students]
  );
  const sortedStaff = useMemo(
    () =>
      [...staff].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [staff]
  );

  useEffect(() => {
    if (!authToken) {
      return;
    }

    let cancelled = false;
    const loadData = async () => {
      try {
        setLoadingData(true);
        const [studentResult, staffResult] = await Promise.all([
          listStudents(authToken),
          canProvisionStaff ? listStaff(authToken) : Promise.resolve([])
        ]);

        if (!cancelled) {
          setStudents(studentResult);
          setStaff(staffResult);
          setLoadError('');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load admin data.';
        if (!cancelled) {
          setLoadError(message);
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [authToken, canProvisionStaff]);

  const handleAdminLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email')?.toString().trim();
    const password = formData.get('password')?.toString() ?? '';

    if (!email || !password) {
      setLoginState({ status: 'error', message: 'Provide both email and password to sign in.' });
      return;
    }

    setLoginState({ status: 'submitting', message: 'Authenticating…' });

    const result = await adminLogin(email, password);

    if (!result) {
      setLoginState({ status: 'error', message: 'Login failed. Confirm your credentials and try again.' });
      return;
    }

    setAuthToken(result.token);
    setCurrentStaff(result.staff);
    setLoginState({ status: 'idle', message: '' });
  };

  const handleStudentCreated = (student: Student) => {
    setStudents((existing) => [student, ...existing]);
  };

  const handleStaffCreated = (account: StaffAccount) => {
    setStaff((existing) => [account, ...existing]);
  };

  const studentCreator = async (input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    primaryInterest?: string;
  }) => {
    if (!authToken || !canProvisionStudents) {
      throw new Error('You do not have permission to create student accounts.');
    }

    return createStudent(authToken, input);
  };

  const staffCreator = async (input: {
    displayName: string;
    email: string;
    password: string;
    role: StaffAccount['role'];
  }) => {
    if (!authToken || !canProvisionStaff) {
      throw new Error('Only IT administrators can create staff accounts.');
    }

    return createStaff(authToken, input);
  };

  return (
    <Box sx={{ minHeight: '100vh', background: '#F5F7FB', py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <Stack spacing={6}>
          <Stack spacing={1} textAlign={{ xs: 'center', md: 'left' }}>
            <Typography variant="overline" sx={{ letterSpacing: 2, color: 'primary.main' }}>
              Brillar Academy Admin Portal
            </Typography>
            <Typography variant="h3" fontWeight={700}>
              Coordinate teams and provision secure access
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720, mx: { xs: 'auto', md: 0 } }}>
              Use this workspace to align responsibilities across the IT administrators, teaching team, and Student Administrative
              Office. Only authorized staff can issue new student logins and invite additional staff members.
            </Typography>
          </Stack>

          <AdminRoleOverview roles={roleDefinitions} />

          {!authToken ? (
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'rgba(0, 0, 0, 0.08)', p: { xs: 4, md: 5 } }}>
              <Stack spacing={3} component="form" onSubmit={handleAdminLogin}>
                <Stack spacing={1}>
                  <Typography variant="h5" fontWeight={700}>
                    Sign in to the admin workspace
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Use your staff credentials to access provisioning tools. A starter IT admin account is created automatically
                    with the email <strong>{DEFAULT_ADMIN_EMAIL}</strong> and password hint <strong>{DEFAULT_ADMIN_PASSWORD_HINT}</strong>.
                  </Typography>
                </Stack>

                {loginState.status === 'error' && <Alert severity="error">{loginState.message}</Alert>}

                <TextField
                  name="email"
                  label="Work email"
                  type="email"
                  fullWidth
                  required
                  defaultValue={DEFAULT_ADMIN_EMAIL}
                />
                <TextField
                  name="password"
                  label="Password"
                  type="password"
                  fullWidth
                  required
                  placeholder="Enter your password"
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loginState.status === 'submitting'}
                  startIcon={loginState.status === 'submitting' ? <CircularProgress size={20} color="inherit" /> : undefined}
                >
                  {loginState.status === 'submitting' ? 'Signing in…' : 'Sign in'}
                </Button>
              </Stack>
            </Paper>
          ) : (
            <Stack spacing={5}>
              <Paper elevation={0} variant="outlined" sx={{ border: '1px solid', borderColor: 'rgba(0, 0, 0, 0.08)', p: { xs: 3, md: 4 } }}>
                <Stack spacing={1}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Signed in as {currentStaff?.displayName ?? 'Staff member'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Role: {currentStaff?.role === 'IT_ADMIN'
                      ? 'IT Administrator'
                      : currentStaff?.role === 'TEACHER'
                        ? 'Teacher'
                        : 'Student Administrative Office'}
                  </Typography>
                </Stack>
              </Paper>

              {loadError && <Alert severity="error">{loadError}</Alert>}

              <Stack spacing={4}>
                <StudentProvisioningForm
                  token={canProvisionStudents ? authToken : ''}
                  onStudentCreated={handleStudentCreated}
                  createStudent={studentCreator}
                />

                {canProvisionStaff ? (
                  <StaffProvisioningForm token={authToken} onStaffCreated={handleStaffCreated} createStaff={staffCreator} />
                ) : (
                  <Paper elevation={0} variant="outlined" sx={{ border: '1px solid', borderColor: 'rgba(0, 0, 0, 0.08)', p: { xs: 3, md: 4 } }}>
                    <Typography variant="body2" color="text.secondary">
                      Staff invitations are managed by IT administrators. Contact the IT admin team if you need to grant access
                      to another staff member.
                    </Typography>
                  </Paper>
                )}

                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'rgba(0, 0, 0, 0.08)', p: { xs: 3, md: 4 } }}>
                  <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                      <Typography variant="h6" fontWeight={700}>
                        Recently provisioned students
                      </Typography>
                      {loadingData && <CircularProgress size={18} />}
                    </Stack>
                    <Divider sx={{ borderStyle: 'dashed' }} />
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Interest</TableCell>
                          <TableCell>Created</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sortedStudents.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell>
                              {student.firstName} {student.lastName}
                            </TableCell>
                            <TableCell>{student.email}</TableCell>
                            <TableCell>{student.primaryInterest ?? '—'}</TableCell>
                            <TableCell>{new Date(student.createdAt).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                        {!sortedStudents.length && (
                          <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                              No students have been provisioned yet.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Stack>
                </Paper>

                {canProvisionStaff && (
                  <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'rgba(0, 0, 0, 0.08)', p: { xs: 3, md: 4 } }}>
                    <Stack spacing={2}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                        <Typography variant="h6" fontWeight={700}>
                          Staff directory
                        </Typography>
                        {loadingData && <CircularProgress size={18} />}
                      </Stack>
                      <Divider sx={{ borderStyle: 'dashed' }} />
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell>Invited</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sortedStaff.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell>{member.displayName}</TableCell>
                              <TableCell>{member.email}</TableCell>
                              <TableCell>
                                {member.role === 'IT_ADMIN'
                                  ? 'IT Administrator'
                                  : member.role === 'TEACHER'
                                    ? 'Teacher'
                                    : 'Student Administrative Office'}
                              </TableCell>
                              <TableCell>{new Date(member.createdAt).toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                          {!sortedStaff.length && (
                            <TableRow>
                              <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                No staff invitations yet.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </Stack>
                  </Paper>
                )}
              </Stack>
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
