'use client';

import { useState, useRef } from 'react';
import type { FormEvent } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';

import type { StaffAccount } from '@/lib/db';

type Props = {
  token: string;
  onStaffCreated: (staff: StaffAccount) => void;
  createStaff: (input: { displayName: string; email: string; password: string; role: StaffAccount['role'] }) => Promise<
    StaffAccount
  >;
};

export default function StaffProvisioningForm({ token, onStaffCreated, createStaff }: Props) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error' | 'success'>('idle');
  const [message, setMessage] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const displayName = formData.get('displayName')?.toString().trim();
    const email = formData.get('email')?.toString().trim();
    const password = formData.get('password')?.toString() ?? '';
    const role = formData.get('role')?.toString() as StaffAccount['role'] | undefined;

    if (!displayName || !email || !password || !role) {
      setStatus('error');
      setMessage('Provide a name, email, password, and role for the staff member.');
      return;
    }

    try {
      setStatus('submitting');
      const staff = await createStaff({ displayName, email, password, role });
      onStaffCreated(staff);
      setStatus('success');
      setMessage('Staff account created. Share credentials and next steps with the team member.');
      formRef.current?.reset();
    } catch (error) {
      const fallback = error instanceof Error ? error.message : 'Unable to create the staff account right now.';
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
          <Typography variant="h6" fontWeight={700}>
            Create a staff account
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Provision login access for teachers or the Student Administrative Office. IT admins can also invite additional IT
            admins when needed.
          </Typography>
        </Stack>

        {status !== 'idle' && status !== 'submitting' && (
          <Alert severity={status === 'success' ? 'success' : 'error'}>{message}</Alert>
        )}

        <TextField name="displayName" label="Full name" fullWidth required />
        <TextField name="email" label="Work email" type="email" fullWidth required />
        <TextField name="password" label="Temporary password" type="password" fullWidth required />
        <TextField name="role" label="Role" select fullWidth required defaultValue="">
          <MenuItem value="">Select a role</MenuItem>
          <MenuItem value="IT_ADMIN">IT Administrator</MenuItem>
          <MenuItem value="TEACHER">Teacher</MenuItem>
          <MenuItem value="STUDENT_ADMIN">Student Administrative Office</MenuItem>
        </TextField>

        <Divider sx={{ borderStyle: 'dashed', borderColor: 'primary.light', opacity: 0.5 }} />

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={!token || status === 'submitting'}
          startIcon={status === 'submitting' ? <CircularProgress size={20} color="inherit" /> : undefined}
        >
          {status === 'submitting' ? 'Creating staff account…' : 'Create staff account'}
        </Button>
      </Stack>
    </Box>
  );
}
