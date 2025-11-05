"use client";

import { useCallback, useEffect, useState } from 'react';
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
  const [isStaffLoggedIn, setIsStaffLoggedIn] = useState(false);

  // Check for staff session on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const staffSession = window.sessionStorage.getItem('brillar_staff_session');
      setIsStaffLoggedIn(Boolean(staffSession));
    }
  }, []);

  const handleLogout = useCallback(() => {
    document.cookie = 'brillar_student_id=; Max-Age=0; path=/; SameSite=Lax';
    document.cookie = 'brillar_student_name=; Max-Age=0; path=/; SameSite=Lax';
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('brillar_staff_session');
    }
    router.push('/login');
    router.refresh();
  }, [router]);

  // Hide login button if student or staff is logged in
  if (!isLoggedIn && !isStaffLoggedIn) {
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

  // If staff is logged in but not student, show nothing (staff handles their own logout in their portal)
  if (isStaffLoggedIn && !isLoggedIn) {
    return null;
  }

  // Show student session controls
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
