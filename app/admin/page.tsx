import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '../../lib/auth';

export default async function AdminIndexPage() {
  const session = await getSessionFromCookies();
  redirect(session?.role === 'admin' ? '/admin/products' : '/admin/login');
}
