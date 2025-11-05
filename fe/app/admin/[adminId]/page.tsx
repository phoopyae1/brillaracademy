import { redirect } from 'next/navigation';
import AdminPortalPage from '../AdminPortalPage';

export const metadata = {
  title: 'Admin Portal | Brillar Academy',
  description: 'Provision student accounts and coordinate responsibilities across the academy support teams.'
};

type Props = {
  params: Promise<{ adminId: string }>;
};

export default async function Page({ params }: Props) {
  const { adminId } = await params;
  const parsedId = Number(adminId);

  if (!Number.isFinite(parsedId)) {
    redirect('/login');
  }

  return <AdminPortalPage adminId={parsedId} />;
}

