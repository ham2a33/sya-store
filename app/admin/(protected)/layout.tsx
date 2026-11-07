import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '../../../lib/auth';

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromCookies();

  if (!session || session.role !== 'admin') {
    redirect('/admin/login');
  }

  return <>{children}</>;
}
