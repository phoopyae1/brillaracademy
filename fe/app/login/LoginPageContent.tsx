"use client";

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import { authenticateStudent, adminLogin } from '@/lib/db';

type FormState = {
  status: 'idle' | 'submitting' | 'error';
  message: string;
};

type LoginMode = 'student' | 'staff';

export default function LoginPageContent() {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>({ status: 'idle', message: '' });
  const [loginMode, setLoginMode] = useState<LoginMode>('student');

  const handleModeChange = (_event: unknown, value: LoginMode | null) => {
    if (!value) {
      return;
    }

    setLoginMode(value);
    setFormState({ status: 'idle', message: '' });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormState({ status: 'submitting', message: 'Authenticating your account…' });

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email')?.toString().trim();
    const password = formData.get('password')?.toString() ?? '';

    if (!email || !password) {
      setFormState({ status: 'error', message: 'Please provide both email and password.' });
      return;
    }

    try {
      if (loginMode === 'student') {
        const student = await authenticateStudent(email, password);

        if (!student?.id) {
          throw new Error('Invalid credentials or missing student profile.');
        }

        const fullName = [student.firstName, student.lastName].filter(Boolean).join(' ');
        const maxAgeSeconds = 60 * 60 * 24; // 24 hours

        document.cookie = `brillar_student_id=${student.id}; path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;

        if (fullName) {
          document.cookie = `brillar_student_name=${encodeURIComponent(fullName)}; path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
        }

        router.push('/dashboard');
        router.refresh();
        return;
      }

      const staffSession = await adminLogin(email, password);

      if (!staffSession) {
        throw new Error('Invalid staff credentials or insufficient permissions.');
      }

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('brillar_staff_session', JSON.stringify(staffSession));
      }

      router.push('/forge');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error during login.';
      setFormState({ status: 'error', message });
      return;
    }

    setFormState({ status: 'idle', message: '' });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #EFF6FF 0%, #F6F8FB 100%)',
        display: 'flex',
        alignItems: 'center',
        py: { xs: 8, md: 12 }
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={12}
          sx={{
            p: { xs: 4, md: 6 },
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(12px)'
          }}
        >
          <Stack spacing={3}>
            <Box textAlign="center">
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Welcome back 👋
              </Typography>
              <Typography color="text.secondary">
                Sign in to continue exploring curated lessons, assignments, and your personalized learning dashboard. Staff can
                access the Forge portal to manage academic operations.
              </Typography>
            </Box>

            <ToggleButtonGroup
              color="primary"
              exclusive
              value={loginMode}
              onChange={handleModeChange}
              sx={{ alignSelf: 'center' }}
            >
              <ToggleButton value="student" sx={{ px: 3 }}>
                Student login
              </ToggleButton>
              <ToggleButton value="staff" sx={{ px: 3 }}>
                Staff login
              </ToggleButton>
            </ToggleButtonGroup>

            {formState.status !== 'idle' && formState.status !== 'submitting' && (
              <Alert severity="error" sx={{ borderRadius: 3 }}>
                {formState.message}
              </Alert>
            )}

            <Stack spacing={2.5} component="form" noValidate onSubmit={handleSubmit}>
              <TextField name="email" label="Email address" type="email" fullWidth required autoComplete="email" />
              <TextField
                name="password"
                label="Password"
                type="password"
                fullWidth
                required
                autoComplete="current-password"
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                sx={{ py: 1.2 }}
                disabled={formState.status === 'submitting'}
                startIcon={formState.status === 'submitting' ? <CircularProgress size={20} color="inherit" /> : undefined}
              >
                {formState.status === 'submitting'
                  ? 'Logging in…'
                  : loginMode === 'student'
                    ? 'Log in as student'
                    : 'Log in to Forge'}
              </Button>
            </Stack>

            <Divider>Need access?</Divider>

            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                Student accounts are issued by the administrative teams. Reach out to the Student Administrative Office or the IT
                administrator to receive your credentials. Staff members should contact the IT administrator for Forge access.
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', sm: 'center' }}
              >
                <Typography variant="body2" color="text.secondary">
                  Email: admin-office@brillaracademy.edu
                </Typography>
                <Link href="/create" underline="hover">
                  Interested in building a new class?
                </Link>
              </Stack>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
