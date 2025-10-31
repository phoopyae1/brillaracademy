"use client";

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string | null;
  primaryInterest: string | null;
  createdAt: string;
}

const roleDefinitions = [
  {
    title: 'IT Administrator',
    description:
      'Ensures secure authentication, maintains the learning infrastructure, and provisions new accounts using the shared admin token.',
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
] as const;

const DEFAULT_TOKEN_HINT = 'development-admin-token';

export default function AdminPortalPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [formState, setFormState] = useState<{ status: 'idle' | 'submitting' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: ''
  });
  const [adminToken, setAdminToken] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadError, setLoadError] = useState('');

  const sortedStudents = useMemo(
    () =>
      [...students].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [students]
  );

  useEffect(() => {
    const loadStudents = async () => {
      try {
        setLoadingStudents(true);
        const response = await fetch('/api/students');
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error ?? 'Unable to load students.');
        }
        setStudents(payload.students ?? []);
        setLoadError('');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected error loading students.';
        setLoadError(message);
      } finally {
        setLoadingStudents(false);
      }
    };

    void loadStudents();
  }, []);

  const handleCreateStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const firstName = formData.get('firstName')?.toString().trim();
    const lastName = formData.get('lastName')?.toString().trim();
    const email = formData.get('email')?.toString().trim();
    const password = formData.get('password')?.toString() ?? '';
    const primaryInterest = formData.get('primaryInterest')?.toString().trim() || undefined;

    if (!firstName || !lastName || !email || !password) {
      setFormState({ status: 'error', message: 'Please provide first name, last name, email, and password.' });
      return;
    }

    if (!adminToken) {
      setFormState({ status: 'error', message: 'Provide the shared admin token before provisioning a student.' });
      return;
    }

    setFormState({ status: 'submitting', message: 'Creating student account…' });

    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify({ firstName, lastName, email, password, primaryInterest, role: 'Student' })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to create the student account.');
      }

      setStudents((existing) => [payload.student, ...existing]);
      setFormState({ status: 'success', message: 'Student account created successfully.' });
      form.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error while creating the account.';
      setFormState({ status: 'error', message });
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, #EEF5FF 0%, #FFFFFF 100%)', py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <Stack spacing={6}>
          <Stack spacing={1} textAlign={{ xs: 'center', md: 'left' }}>
            <Typography variant="overline" sx={{ letterSpacing: 2, color: 'primary.main' }}>
              Brillar Academy Admin Portal
            </Typography>
            <Typography variant="h3" fontWeight={700}>
              Coordinate teams and provision secure student access
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720, mx: { xs: 'auto', md: 0 } }}>
              Use this workspace to align responsibilities across the IT administrators, teaching team, and Student Administrative Office. Only authorized staff can issue new student logins using the shared admin token.
            </Typography>
          </Stack>

          <Grid container spacing={3}>
            {roleDefinitions.map((role) => (
              <Grid item xs={12} md={4} key={role.title}>
                <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', p: { xs: 3, md: 4 }, height: '100%' }}>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={role.title} color="primary" sx={{ fontWeight: 600 }} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {role.description}
                    </Typography>
                    <Divider sx={{ borderStyle: 'dashed' }} />
                    <Stack spacing={1}>
                      {role.highlights.map((highlight) => (
                        <Typography key={highlight} variant="body2">
                          • {highlight}
                        </Typography>
                      ))}
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Paper elevation={6} sx={{ borderRadius: 4, p: { xs: 4, md: 5 } }}>
            <Stack spacing={3}>
              <Stack spacing={1}>
                <Typography variant="h5" fontWeight={700}>
                  Provision a student account
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Students cannot self-register. Provide their details below and share the generated credentials securely with the learner.
                </Typography>
              </Stack>

              <Alert severity="info">
                Use the shared admin token to authorize creation requests. For local development and the demo environment, the default token is <strong>{DEFAULT_TOKEN_HINT}</strong>.
              </Alert>

              {formState.status !== 'idle' && formState.status !== 'submitting' && (
                <Alert severity={formState.status === 'success' ? 'success' : 'error'}>{formState.message}</Alert>
              )}

              <Stack component="form" spacing={3} onSubmit={handleCreateStudent} noValidate>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField name="firstName" label="First name" required fullWidth autoComplete="off" />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField name="lastName" label="Last name" required fullWidth autoComplete="off" />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField name="email" label="Email" type="email" required fullWidth autoComplete="off" />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField name="password" label="Temporary password" type="password" required fullWidth autoComplete="off" />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      name="primaryInterest"
                      label="Primary interest (optional)"
                      placeholder="STEM, Arts, Entrepreneurship…"
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      value={adminToken}
                      onChange={(event) => setAdminToken(event.target.value)}
                      label="Admin token"
                      type="password"
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
                  {formState.status === 'submitting' ? 'Provisioning…' : 'Create student account'}
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', p: { xs: 3, md: 4 } }}>
            <Stack spacing={3}>
              <Stack spacing={1}>
                <Typography variant="h5" fontWeight={700}>
                  Recently created students
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Monitor who has been provisioned and confirm that credentials have been shared securely.
                </Typography>
              </Stack>

              {loadError && <Alert severity="error">{loadError}</Alert>}

              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Interest</TableCell>
                    <TableCell align="right">Created</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingStudents ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ py: 4 }}>
                          <CircularProgress size={20} />
                          <Typography variant="body2" color="text.secondary">
                            Loading students…
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : sortedStudents.length ? (
                    sortedStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {student.firstName} {student.lastName}
                        </TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>{student.primaryInterest ?? '—'}</TableCell>
                        <TableCell align="right">
                          {new Intl.DateTimeFormat('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          }).format(new Date(student.createdAt))}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No student accounts have been provisioned yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
