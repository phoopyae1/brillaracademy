"use client";

import { useState } from 'react';
import type { FormEvent } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

export const metadata = {
  title: 'Register | Brillar Academy',
  description: 'Create your Brillar Academy account and unlock access to personalized academic pathways.'
};

type FormState = {
  status: 'idle' | 'submitting' | 'success' | 'error';
  message: string;
};

export default function RegisterPage() {
  const [formState, setFormState] = useState<FormState>({ status: 'idle', message: '' });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const firstName = formData.get('firstName')?.toString().trim();
    const lastName = formData.get('lastName')?.toString().trim();
    const email = formData.get('email')?.toString().trim();
    const password = formData.get('password')?.toString() ?? '';
    const role = formData.get('role')?.toString().trim() || undefined;
    const primaryInterest = formData.get('primaryInterest')?.toString().trim() || undefined;

    if (!firstName || !lastName || !email || !password) {
      setFormState({ status: 'error', message: 'Please complete all required fields.' });
      return;
    }

    setFormState({ status: 'submitting', message: 'Creating your academy account…' });

    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password, role, primaryInterest })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Unable to create your account right now.');
      }

      setFormState({ status: 'success', message: 'Account created! You can now log in to explore your dashboard.' });
      form.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error while creating the account.';
      setFormState({ status: 'error', message });
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #F0FFF4 0%, #F8F9FF 100%)',
        py: { xs: 8, md: 12 }
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={8}
          sx={{
            p: { xs: 4, md: 6 },
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <Stack spacing={4}>
            <Box textAlign="center">
              <Typography variant="h3" fontWeight={700} gutterBottom>
                Join Brillar Academy 🌱
              </Typography>
              <Typography color="text.secondary">
                Tell us a bit about yourself to tailor courses, mentors, and collaborative programs to your goals.
              </Typography>
            </Box>

            {formState.status !== 'idle' && (
              <Alert severity={formState.status === 'success' ? 'success' : 'error'}>{formState.message}</Alert>
            )}

            <Stack spacing={3} component="form" noValidate onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField name="firstName" label="First name" required fullWidth autoComplete="given-name" />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField name="lastName" label="Last name" required fullWidth autoComplete="family-name" />
                </Grid>
                <Grid item xs={12}>
                  <TextField name="email" label="Email address" type="email" required fullWidth autoComplete="email" />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="password"
                    label="Create password"
                    type="password"
                    required
                    fullWidth
                    autoComplete="new-password"
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField name="role" label="Role" placeholder="Student, Parent, or Mentor" fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField name="primaryInterest" label="Primary interest" placeholder="STEM, Arts, Entrepreneurship..." fullWidth />
                </Grid>
              </Grid>

              <Divider light />

              <FormControlLabel
                control={<Checkbox required />}
                label={
                  <Typography variant="body2" color="text.secondary">
                    I agree to the{' '}
                    <Link href="#" underline="hover">
                      terms of service
                    </Link>{' '}
                    and acknowledge the privacy policy.
                  </Typography>
                }
              />

              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                sx={{ py: 1.3 }}
                disabled={formState.status === 'submitting'}
                startIcon={formState.status === 'submitting' ? <CircularProgress size={20} color="inherit" /> : undefined}
              >
                {formState.status === 'submitting' ? 'Creating account…' : 'Create account'}
              </Button>

              <Typography variant="body2" color="text.secondary" textAlign="center">
                Already have an account?{' '}
                <Link href="/login" underline="hover">
                  Log in here
                </Link>
              </Typography>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
