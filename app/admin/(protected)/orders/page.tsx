import { getAllOrders } from '../../../../lib/orders-store';
import AdminOrdersClient from './AdminOrdersClient';

export default async function AdminOrdersPage() {
  const orders = await getAllOrders();
  return <AdminOrdersClient orders={orders} />;
}
