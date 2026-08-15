import { notFound } from 'next/navigation';
import { getOrderById } from '../../../../../lib/orders-store';
import AdminOrderDetailClient from './AdminOrderDetailClient';

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    notFound();
  }

  return <AdminOrderDetailClient order={order} />;
}
