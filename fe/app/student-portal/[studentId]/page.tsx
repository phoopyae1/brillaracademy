import { redirect } from 'next/navigation';
import StudentPortalPage from '../StudentPortalPage';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Student Portal | Brillar Academy',
  description: 'Review your personal timetable, upcoming milestones, and active class registrations.'
};

type Props = {
  params: Promise<{ studentId: string }>;
};

export default async function Page({ params }: Props) {
  const { studentId } = await params;
  const parsedId = Number(studentId);

  if (!Number.isFinite(parsedId)) {
    redirect('/login');
  }

  return <StudentPortalPage studentId={parsedId} />;
}

