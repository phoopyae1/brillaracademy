"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgeRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Check sessionStorage for staff session
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
  }, [router]);

  return null;
}

