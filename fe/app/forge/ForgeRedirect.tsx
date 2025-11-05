"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

export default function ForgeRedirect() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Small delay to ensure sessionStorage is available after login redirect
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        const staffSession = window.sessionStorage.getItem('brillar_staff_session');
        if (staffSession) {
          try {
            const parsed = JSON.parse(staffSession);
            if (parsed?.staff?.id) {
              router.replace(`/forge/${parsed.staff.id}`);
              return;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        // If no staff session, redirect to login
        router.replace('/login');
      }
      setLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [router]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return null;
}

