import { redirect } from 'next/navigation';
import ForgePortalPage from '../ForgePortalPage';

export const metadata = {
  title: 'Forge Staff Portal | Brillar Academy',
  description: 'Role-based dashboards for IT administrators, teachers, and student administrators to collaborate.'
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  const parsedId = Number(id);

  if (!Number.isFinite(parsedId)) {
    redirect('/login');
  }

  return <ForgePortalPage staffId={parsedId} />;
}

