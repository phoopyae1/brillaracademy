"use client";

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

type StudentSessionControlsProps = {
  isLoggedIn: boolean;
  studentName?: string;
};

export default function StudentSessionControls({ isLoggedIn, studentName }: StudentSessionControlsProps) {
  const router = useRouter();

  const handleLogout = useCallback(() => {
    document.cookie = 'brillar_student_id=; Max-Age=0; path=/; SameSite=Lax';
    document.cookie = 'brillar_student_name=; Max-Age=0; path=/; SameSite=Lax';
    router.push('/login');
    router.refresh();
  }, [router]);

  if (!isLoggedIn) {
    return (
      <Button
        component={Link}
        href="/login"
        color="primary"
        variant="contained"
        sx={{ fontWeight: 700 }}
      >
        Login
      </Button>
    );
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {studentName && (
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
          Signed in as {studentName}
        </Typography>
      )}
      <Button onClick={handleLogout} color="primary" variant="outlined" sx={{ fontWeight: 600 }}>
        Log out
      </Button>
    </Stack>
  );
}
