"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { logoutAtenxionUser } from '@/app/login/LoginPageContent';

type StudentSessionControlsProps = {
  isLoggedIn: boolean;
  studentName?: string;
};

export default function StudentSessionControls({ isLoggedIn: isLoggedInProp, studentName: studentNameProp }: StudentSessionControlsProps) {
  const router = useRouter();
  const [isStaffLoggedIn, setIsStaffLoggedIn] = useState(false);
  const [isStudentLoggedIn, setIsStudentLoggedIn] = useState(isLoggedInProp);
  const [studentName, setStudentName] = useState(studentNameProp);
  const [isHydrated, setIsHydrated] = useState(false);

  // Function to check and update student login status
  // Only updates if client-side check finds different value than server props
  const checkStudentLoginStatus = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    // Check student session from cookies and localStorage
    const studentIdCookie = document.cookie.split('; ').find((row) => row.startsWith('brillar_student_id='));
    const studentNameCookie = document.cookie.split('; ').find((row) => row.startsWith('brillar_student_name='));
    const studentSession = localStorage.getItem('student_portal');
    
    const hasStudentId = Boolean(studentIdCookie);
    const hasStudentSession = Boolean(studentSession);
    const clientIsLoggedIn = hasStudentId || hasStudentSession;
    
    // Only update if client check finds different value than current state
    // This prevents overriding server state unnecessarily
    setIsStudentLoggedIn((prev) => {
      if (prev !== clientIsLoggedIn) {
        console.log(`[StudentSessionControls] Login status changed: ${prev} -> ${clientIsLoggedIn} (client check)`);
        return clientIsLoggedIn;
      }
      return prev;
    });
    
    // Get student name from cookie or localStorage
    let newStudentName: string | undefined;
    if (studentNameCookie) {
      try {
        newStudentName = decodeURIComponent(studentNameCookie.split('=')[1]);
      } catch (e) {
        // Ignore decode errors
      }
    } else if (studentSession) {
      try {
        const session = JSON.parse(studentSession);
        if (session.studentName) {
          newStudentName = session.studentName;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    // Update name if different and we have a value
    if (newStudentName) {
      setStudentName((prev) => {
        if (prev !== newStudentName) {
          return newStudentName;
        }
        return prev;
      });
    }
  }, []);

  // Sync with server props when they change (e.g., after navigation)
  useEffect(() => {
    setIsStudentLoggedIn(isLoggedInProp);
    if (studentNameProp) {
      setStudentName(studentNameProp);
    }
  }, [isLoggedInProp, studentNameProp]);

  // Check for student and staff session on client side (for proper hydration and refresh handling)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Mark as hydrated
      setIsHydrated(true);
      
      // Check staff session
      const staffSession = window.sessionStorage.getItem('brillar_staff_session');
      setIsStaffLoggedIn(Boolean(staffSession));
      
      // Check student login status after a brief delay
      // Always check, but only update if there's a discrepancy (client finds cookies when server didn't)
      const timeoutId = setTimeout(() => {
        checkStudentLoginStatus();
      }, 50);
      
      // Listen for storage changes to update login status (for cross-tab updates)
      const handleStorageChange = () => {
        checkStudentLoginStatus();
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, [checkStudentLoginStatus]);

  const handleLogout = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    // Log what's currently stored before clearing
    console.log('Before logout - Cookies:', document.cookie);
    console.log('Before logout - localStorage keys:', Object.keys(localStorage));
    console.log('Before logout - sessionStorage keys:', Object.keys(window.sessionStorage));
    
    // Get student credentials before clearing for Atenxion logout
    let studentId: string | number | undefined;
    let agentId: string | undefined;
    let agentchainId: string | undefined;
    
    try {
      // Get student ID from cookie or localStorage
      const studentIdCookie = document.cookie.split('; ').find((row) => row.startsWith('brillar_student_id='));
      if (studentIdCookie) {
        studentId = studentIdCookie.split('=')[1];
      }
      
      // Get student session from localStorage
      const studentSession = localStorage.getItem('student_portal');
      if (studentSession) {
        try {
          const session = JSON.parse(studentSession);
          if (!studentId && session.studentId) {
            studentId = session.studentId;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      // Extract agentId and agentchainId from iframe if available
      // This would need to be stored somewhere accessible, or we can skip it for logout
      // For now, we'll just use studentId
      
      // Call Atenxion logout API if we have studentId
      if (studentId) {
        console.log('Calling Atenxion logout API for student:', studentId);
        try {
          await logoutAtenxionUser({
            userId: studentId,
            studentId: studentId.toString(),
            agentId,
            agentchainId
          });
          console.log('Atenxion logout API call completed');
        } catch (error) {
          console.error('Atenxion logout API call failed:', error);
          // Continue with logout even if API call fails
        }
      } else {
        console.log('No student ID found, skipping Atenxion logout API call');
      }
    } catch (error) {
      console.error('Error during Atenxion logout:', error);
      // Continue with logout even if there's an error
    }
    
    // Clear all student cookies - try multiple methods to ensure deletion
    const cookiesToClear = [
      'brillar_student_id',
      'brillar_student_name',
      'student_portal_token',
      'student_portal_accessToken',
    ];
    
    // Get all current cookies and clear any that match our patterns
    const allCookies = document.cookie.split(';').map(c => c.trim().split('=')[0]);
    allCookies.forEach(cookieName => {
      if (cookieName.includes('student') || cookieName.includes('brillar_student')) {
        // Try multiple clearing methods
        document.cookie = `${cookieName}=; Max-Age=0; path=/; SameSite=Lax`;
        document.cookie = `${cookieName}=; Max-Age=0; path=/`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
      }
    });
    
    // Also explicitly clear the known cookies
    cookiesToClear.forEach(cookieName => {
      document.cookie = `${cookieName}=; Max-Age=0; path=/; SameSite=Lax`;
      document.cookie = `${cookieName}=; Max-Age=0; path=/`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}`;
    });
    
    // Clear localStorage - remove specific keys and any matching patterns
    localStorage.removeItem('student_portal');
    Object.keys(localStorage).forEach(key => {
      if (key.toLowerCase().includes('student') || key.toLowerCase().includes('portal') || key.toLowerCase().includes('token')) {
        console.log('Clearing localStorage key:', key);
        localStorage.removeItem(key);
      }
    });
    
    // Clear sessionStorage
    window.sessionStorage.removeItem('brillar_staff_session');
    window.sessionStorage.removeItem('student_portal');
    Object.keys(window.sessionStorage).forEach(key => {
      if (key.toLowerCase().includes('student') || key.toLowerCase().includes('portal') || key.toLowerCase().includes('token')) {
        console.log('Clearing sessionStorage key:', key);
        window.sessionStorage.removeItem(key);
      }
    });
    
    // Log what's left after clearing
    console.log('After logout - Cookies:', document.cookie);
    console.log('After logout - localStorage keys:', Object.keys(localStorage));
    console.log('After logout - sessionStorage keys:', Object.keys(window.sessionStorage));
    
    // Update state immediately to reflect logout
    setIsStudentLoggedIn(false);
    setStudentName(undefined);
    
    // Use Next.js router to navigate to login page
    router.push('/login');
    // Refresh to ensure server-side state is updated
    router.refresh();
  }, [router, checkStudentLoginStatus]);

  // Hide login button if student or staff is logged in
  if (!isStudentLoggedIn && !isStaffLoggedIn) {
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
  if (isStaffLoggedIn && !isStudentLoggedIn) {
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
