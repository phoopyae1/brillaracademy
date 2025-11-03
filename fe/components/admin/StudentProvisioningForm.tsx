'use client';

import { useState, useRef } from 'react';
import type { FormEvent } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';

import type { Student } from '@/lib/db';
import { AVAILABLE_MAJORS } from '@/lib/majors';

export type StudentProvisioningFormProps = {
  token: string;
  onStudentCreated: (student: Student) => void;
  createStudent: (input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    primaryInterest: string;
  }) => Promise<Student>;
};

export default function StudentProvisioningForm({ token, onStudentCreated, createStudent }: StudentProvisioningFormProps) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error' | 'success'>('idle');
  const [message, setMessage] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const firstName = formData.get('firstName')?.toString().trim();
    const lastName = formData.get('lastName')?.toString().trim();
    const email = formData.get('email')?.toString().trim();
    const password = formData.get('password')?.toString() ?? '';
    const primaryInterest = formData.get('primaryInterest')?.toString().trim();

    if (!firstName || !lastName || !email || !password || !primaryInterest) {
      setStatus('error');
      setMessage('Please provide first name, last name, email, major, and a temporary password.');
      return;
    }

    try {
      setStatus('submitting');
      const student = await createStudent({ firstName, lastName, email, password, primaryInterest });
      onStudentCreated(student);
      setStatus('success');
      setMessage('Student account created successfully. Share credentials securely with the learner.');
      formRef.current?.reset();
    } catch (error) {
      const fallback = error instanceof Error ? error.message : 'Unable to create the student account right now.';
      setStatus('error');
      setMessage(fallback);
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 4, md: 5 },
        background: 'rgba(255, 255, 255, 0.98)',
        border: '1px solid',
        borderColor: 'rgba(0, 0, 0, 0.08)',
      }}
    >
      <Stack spacing={3} component="form" ref={formRef} onSubmit={handleSubmit}>
        <Stack spacing={1}>
          <Typography variant="h5" fontWeight={700}>
            Provision a student account
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Students cannot self-register. Provide their details below and distribute the generated credentials securely.
          </Typography>
        </Stack>

        {status !== 'idle' && status !== 'submitting' && (
          <Alert severity={status === 'success' ? 'success' : 'error'}>{message}</Alert>
        )}

        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField name="firstName" label="First name" fullWidth required />
            <TextField name="lastName" label="Last name" fullWidth required />
          </Stack>
          <TextField name="email" label="Student email" type="email" fullWidth required />
          <TextField
            name="password"
            label="Temporary password"
            helperText="Provide a starter password and require students to update it after their first login."
            type="password"
            fullWidth
            required
          />
          <TextField
            name="primaryInterest"
            label="Major"
            fullWidth
            required
            select
            defaultValue=""
            helperText="Assign the student's primary program to tailor their class recommendations."
          >
            <MenuItem value="" disabled>
              Select a major
            </MenuItem>
            {AVAILABLE_MAJORS.map((major) => (
              <MenuItem key={major} value={major}>
                {major}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Divider sx={{ borderStyle: 'dashed', borderColor: 'secondary.light', opacity: 0.5 }} />

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={!token || status === 'submitting'}
          startIcon={status === 'submitting' ? <CircularProgress size={20} color="inherit" /> : undefined}
        >
          {status === 'submitting' ? 'Creating account…' : 'Create student account'}
        </Button>
      </Stack>
    </Box>
  );
}
