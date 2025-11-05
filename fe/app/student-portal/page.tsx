import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { fetchStudentDashboard, listAvailableClassrooms } from '@/lib/db';
import StudentDashboard from '@/components/student/StudentDashboard';

export const metadata = {
  title: 'Student Portal | Brillar Academy',
  description: 'Review your personal timetable, upcoming milestones, and active class registrations.'
};

export default async function Page() {
  const cookieStore = cookies();
  const studentIdCookie = cookieStore.get('brillar_student_id');
  const parsedId = Number(studentIdCookie?.value);

  if (!studentIdCookie || !Number.isFinite(parsedId)) {
    redirect('/login');
  }

  const dashboard = await fetchStudentDashboard(parsedId);

  if (!dashboard) {
    redirect('/login');
  }

  const availableClassrooms = await listAvailableClassrooms(dashboard.student.id);

  return (
    <StudentDashboard
      dashboard={dashboard}
      availableClassrooms={availableClassrooms}
      classroomEnrollments={dashboard.classroomEnrollments}
    />
  );
}
