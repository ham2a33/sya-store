'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '../../../../../components/admin/AdminShell';
import { formatPrice } from '../../../../../lib/products';
import { ORDER_STATUS_LABELS } from '../../../../../lib/order-labels';
import type { OrderStatus, StoredOrder } from '../../../../../lib/types';

const STATUSES: OrderStatus[] = [
  'new',
  'confirmed',
  'processing',
  'shipped',
  'completed',
  'cancelled',
];

export default function AdminOrderDetailClient({ order }: { order: StoredOrder }) {
  const router = useRouter();
  const [status, setStatus] = useState(order.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const saveStatus = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('save failed');
      router.refresh();
    } catch {
      setError('Не удалось обновить статус');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title={`Заказ №${order.orderNumber}`}
      subtitle={new Date(order.createdAt).toLocaleString('ru-RU')}
      actions={
        <a href="/admin/orders" className="catalog-btn-text">
          К СПИСКУ
        </a>
      }
    >
      <div className="admin-stack">
        <section className="admin-card">
          <h2>Клиент</h2>
          <p>{order.customer.name}</p>
          <p>{order.customer.phone}</p>
          {order.customer.email && <p>{order.customer.email}</p>}
        </section>

        <section className="admin-card">
          <h2>Доставка</h2>
          <p>{order.delivery.method === 'delivery' ? 'Доставка' : 'Самовывоз'}</p>
          {order.delivery.city && <p>Город: {order.delivery.city}</p>}
          {order.delivery.address && <p>Адрес: {order.delivery.address}</p>}
        </section>

        {order.comment && (
          <section className="admin-card">
            <h2>Комментарий</h2>
            <p>{order.comment}</p>
          </section>
        )}

        <section className="admin-section">
          <h2>ТОВАРЫ</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Фото</th>
                  <th>Название</th>
                  <th>Цена</th>
                  <th>Количество</th>
                  <th>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.productId}>
                    <td>
                      <img src={item.image} alt={item.name} className="admin-table-image" />
                    </td>
                    <td>{item.name}</td>
                    <td>{formatPrice(item.price)}</td>
                    <td>{item.quantity}</td>
                    <td>{formatPrice(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="admin-order-total">
            <strong>Итого: {formatPrice(order.total)}</strong>
          </p>
        </section>

        <section className="admin-card">
          <label className="admin-field">
            <span>Статус</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as OrderStatus)}>
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {ORDER_STATUS_LABELS[item]}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="dark-btn" onClick={saveStatus} disabled={saving}>
            {saving ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ СТАТУС'}
          </button>
          {error && <p className="admin-error">{error}</p>}
        </section>
      </div>
    </AdminShell>
  );
}
