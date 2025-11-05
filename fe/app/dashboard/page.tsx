import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export const metadata = {
  title: 'Student Portal | Brillar Academy',
  description: 'Review your personal timetable, upcoming milestones, and active class registrations.'
};

export default async function Page() {
  // Try to get student ID from cookie and redirect to student portal
  const cookieStore = cookies();
  const studentIdCookie = cookieStore.get('brillar_student_id');

  if (studentIdCookie) {
    redirect('/student-portal');
  }

  // If no cookie, redirect to login
  redirect('/login');
}
