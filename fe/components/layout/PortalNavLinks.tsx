"use client";

import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Link from 'next/link';

type PortalNavLinksProps = {
  isStudentLoggedIn: boolean;
};

export default function PortalNavLinks({ isStudentLoggedIn }: PortalNavLinksProps) {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);

  useEffect(() => {
    // Get student ID from cookie
    if (typeof window !== 'undefined') {
      const cookies = document.cookie.split(';');
      const studentIdCookie = cookies.find((c) => c.trim().startsWith('brillar_student_id='));
      if (studentIdCookie) {
        const studentIdValue = studentIdCookie.split('=')[1];
        setStudentId(studentIdValue);
      }

      // Get staff ID from sessionStorage
      const staffSession = window.sessionStorage.getItem('brillar_staff_session');
      if (staffSession) {
        try {
          const parsed = JSON.parse(staffSession);
          if (parsed?.staff?.id) {
            setStaffId(String(parsed.staff.id));
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }, []);

  const handleAdminLinkClick = useCallback(
    (e: React.MouseEvent, href: string) => {
      if (isStudentLoggedIn) {
        e.preventDefault();
        // Logout student by clearing all cookies
        const cookiesToClear = [
          'brillar_student_id',
          'brillar_student_name',
          'student_portal_token',
        ];
        
        cookiesToClear.forEach(cookieName => {
          // Clear with path=/
          document.cookie = `${cookieName}=; Max-Age=0; path=/; SameSite=Lax`;
          // Also try clearing without SameSite (in case it was set differently)
          document.cookie = `${cookieName}=; Max-Age=0; path=/`;
          // Also try with expires (for older browsers)
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });
        
        // Clear localStorage and sessionStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('student_portal');
          // Clear all localStorage keys that start with 'student'
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('student') || key.includes('student_portal')) {
              localStorage.removeItem(key);
            }
          });
          
          window.sessionStorage.removeItem('student_portal');
          // Clear all sessionStorage keys that start with 'student'
          Object.keys(window.sessionStorage).forEach(key => {
            if (key.startsWith('student') || key.includes('student_portal')) {
              window.sessionStorage.removeItem(key);
            }
          });
        }
        
        // Redirect to login
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
      }
    },
    [isStudentLoggedIn]
  );

  const studentPortalHref = studentId ? `/student-portal/${studentId}` : '/student-portal';
  const forgePortalHref = staffId ? `/forge/${staffId}` : '/forge';

  const navLinks = [
    { label: 'Home', href: '/', adminOnly: false },
    ...(isStudentLoggedIn ? [{ label: 'Student Portal', href: studentPortalHref, adminOnly: false }] : []),
    { label: 'Forge Staff Portal', href: forgePortalHref, adminOnly: true },
    { label: 'Admin Portal', href: '/admin', adminOnly: true },
  ];

  return (
    <Stack direction="row" spacing={1.5} sx={{ ml: 'auto' }} alignItems="center">
      {navLinks.map((item) => {
        if (isStudentLoggedIn && item.adminOnly) {
          // For students, make these buttons that log them out
          return (
            <Button
              key={item.href}
              onClick={(e) => handleAdminLinkClick(e, item.href)}
              color="primary"
              variant="text"
              sx={{
                fontWeight: 600,
                textTransform: 'none',
                opacity: 0.5,
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.7,
                  backgroundColor: 'rgba(255, 0, 0, 0.08)',
                },
              }}
              title="Students cannot access admin portals. Clicking will log you out."
            >
              {item.label}
            </Button>
          );
        }

        // Regular link for non-admin-only or non-logged-in users
        return (
          <Button
            key={item.href}
            component={Link}
            href={item.href}
            color="primary"
            variant="text"
            sx={{ fontWeight: 600, textTransform: 'none' }}
          >
            {item.label}
          </Button>
        );
      })}
    </Stack>
  );
}

