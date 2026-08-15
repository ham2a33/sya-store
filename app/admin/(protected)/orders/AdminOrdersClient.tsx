'use client';

import Link from 'next/link';
import AdminShell from '../../../../components/admin/AdminShell';
import { formatPrice } from '../../../../lib/products';
import { formatOrderDate, ORDER_STATUS_LABELS } from '../../../../lib/order-labels';
import type { StoredOrder } from '../../../../lib/types';

export default function AdminOrdersClient({ orders }: { orders: StoredOrder[] }) {
  return (
    <AdminShell title="Заказы" subtitle="Новые и текущие заказы магазина">
      <section className="admin-section">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>№</th>
                <th>Клиент</th>
                <th>Товаров</th>
                <th>Сумма</th>
                <th>Статус</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/admin/orders/${order.id}`}>#{order.orderNumber}</Link>
                    </td>
                    <td>{order.customer.name}</td>
                    <td>{itemCount}</td>
                    <td>{formatPrice(order.total)}</td>
                    <td>{ORDER_STATUS_LABELS[order.status]}</td>
                    <td>{formatOrderDate(order.createdAt)}</td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6}>Заказов пока нет</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
