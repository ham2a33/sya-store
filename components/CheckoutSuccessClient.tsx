'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { loadLastOrder } from './CheckoutClient';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';

type SuccessOrder = {
  id: string;
  orderNumber: number;
  total: number;
};

export default function CheckoutSuccessClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order') ?? '';
  const [order, setOrder] = useState<SuccessOrder | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const saved = loadLastOrder(orderId) as SuccessOrder | null;
    if (saved) setOrder(saved);
  }, [orderId]);

  return (
    <>
      <SiteHeader />
      <main className="checkout-page">
        <div className="container checkout-container">
          <div className="checkout-success">
            <div className="checkout-success-icon">✓</div>
            <h1>ЗАКАЗ ОФОРМЛЕН</h1>
            <p className="checkout-success-lead">Спасибо за заказ!</p>
            {order ? (
              <p className="checkout-success-number">Заказ №{order.orderNumber}</p>
            ) : null}
            <p>Мы получили ваш заказ.</p>
            <p>Мы свяжемся с вами для подтверждения.</p>
            <Link href="/" className="dark-btn checkout-success-btn">
              ВЕРНУТЬСЯ В МАГАЗИН
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
