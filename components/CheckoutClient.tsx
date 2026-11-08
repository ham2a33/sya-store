'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { formatPrice, type Product } from '../lib/products';
import { groupCartQuantities, isValidEmail } from '../lib/cart-utils';
import {
  buildWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
  openWhatsAppOrder,
} from '../lib/whatsapp-order';
import type { WhatsAppSettings } from '../lib/site-settings-store';
import { useCart } from '../context/CartContext';
import { useProducts } from '../context/ProductsContext';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';

type DeliveryMethod = 'delivery' | 'pickup';

type FormValues = {
  name: string;
  phone: string;
  email: string;
  deliveryMethod: DeliveryMethod;
  city: string;
  address: string;
  comment: string;
};

type FormErrors = Partial<Record<keyof FormValues | 'form', string>>;

type CheckoutLineItem = {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  size?: string;
};

const LAST_ORDER_KEY = 'sya-last-order';

export function saveLastOrder(order: unknown) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
}

export function loadLastOrder(orderId: string) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(LAST_ORDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string };
    return parsed.id === orderId ? parsed : null;
  } catch {
    return null;
  }
}

function buildLineItems(
  itemIds: string[],
  getProduct: (id: string) => Product | undefined,
  sizes: Record<string, string>,
): CheckoutLineItem[] {
  const quantities = groupCartQuantities(itemIds);
  return Array.from(quantities.entries())
    .map(([productId, quantity]) => {
      const product = getProduct(productId);
      if (!product) return null;
      return {
        productId: product.id,
        name: product.name,
        image: product.image,
        price: product.price,
        quantity,
        ...(sizes[productId]?.trim() ? { size: sizes[productId].trim() } : {}),
      };
    })
    .filter((item): item is CheckoutLineItem => item != null);
}

export default function CheckoutClient() {
  const router = useRouter();
  const { items, sizes, clearCart } = useCart();
  const { getProduct } = useProducts();
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [whatsappError, setWhatsappError] = useState('');
  const [whatsappSettings, setWhatsappSettings] = useState<WhatsAppSettings | null>(null);
  const [whatsappSettingsLoaded, setWhatsappSettingsLoaded] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [values, setValues] = useState<FormValues>({
    name: '',
    phone: '',
    email: '',
    deliveryMethod: 'delivery',
    city: '',
    address: '',
    comment: '',
  });

  useEffect(() => {
    setHydrated(true);
    fetch('/api/settings/whatsapp', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('settings request failed');
        const data = (await response.json()) as { whatsapp: WhatsAppSettings };
        setWhatsappSettings(data.whatsapp);
      })
      .catch(() => setWhatsappSettings(null))
      .finally(() => setWhatsappSettingsLoaded(true));
  }, []);

  const lineItems = useMemo(
    () => buildLineItems(items, getProduct, sizes),
    [items, getProduct, sizes],
  );

  const totalItems = lineItems.reduce((sum, item) => sum + item.quantity, 0);
  const total = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const validate = (): FormErrors => {
    const next: FormErrors = {};

    if (!values.name.trim()) next.name = 'Укажите имя';
    if (!values.phone.trim()) next.phone = 'Укажите телефон';
    if (values.email.trim() && !isValidEmail(values.email)) {
      next.email = 'Некорректный email';
    }
    if (values.deliveryMethod === 'delivery') {
      if (!values.city.trim()) next.city = 'Укажите город';
      if (!values.address.trim()) next.address = 'Укажите адрес';
    }

    return next;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    if (!lineItems.length) {
      setFormError('Корзина пуста');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            name: values.name.trim(),
            phone: values.phone.trim(),
            email: values.email.trim() || undefined,
          },
          delivery: {
            method: values.deliveryMethod,
            city: values.deliveryMethod === 'delivery' ? values.city.trim() : undefined,
            address: values.deliveryMethod === 'delivery' ? values.address.trim() : undefined,
          },
          comment: values.comment.trim() || undefined,
          items: lineItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            ...(item.size ? { size: item.size } : {}),
          })),
        }),
      });

      const data = (await response.json()) as {
        order?: {
          id: string;
          orderNumber: number;
          total: number;
          customer: { name: string };
        };
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message ?? 'Не удалось создать заказ');
      }

      if (!data.order) {
        throw new Error('Не удалось создать заказ');
      }

      saveLastOrder(data.order);
      clearCart();
      router.push(`/checkout/success?order=${data.order.id}`);
      router.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не удалось создать заказ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWhatsAppOrder = () => {
    setWhatsappError('');

    if (!lineItems.length) return;

    if (!whatsappSettings?.enabled) {
      setWhatsappError('Заказ через WhatsApp сейчас отключён магазином.');
      return;
    }

    const number = whatsappSettings.phone.replace(/\D/g, '');
    if (!/^\d{8,15}$/.test(number)) {
      setWhatsappError('WhatsApp магазина пока не настроен.');
      return;
    }

    const message = buildWhatsAppOrderMessage(lineItems, total, {
      name: values.name.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      city: values.deliveryMethod === 'delivery' ? values.city.trim() : '',
      address: values.deliveryMethod === 'delivery' ? values.address.trim() : '',
      deliveryMethod: values.deliveryMethod === 'delivery' ? 'Доставка' : 'Самовывоз',
      comment: values.comment.trim(),
    }, whatsappSettings.messageTemplate);
    const url = buildWhatsAppOrderUrl(number, message);
    if (!openWhatsAppOrder(url)) {
      setWhatsappError('Браузер заблокировал новое окно WhatsApp. Разрешите всплывающие окна и повторите попытку.');
    }
  };

  if (!hydrated) {
    return (
      <>
        <SiteHeader />
        <main className="checkout-page">
          <div className="container checkout-container">
            <p className="checkout-loading">Загрузка...</p>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  if (!lineItems.length) {
    return (
      <>
        <SiteHeader />
        <main className="checkout-page">
          <div className="container checkout-container">
            <div className="checkout-empty">
              <h1>КОРЗИНА ПУСТА</h1>
              <p>Добавьте товары в корзину, чтобы оформить заказ.</p>
              <Link href="/catalog" className="dark-btn">
                ПЕРЕЙТИ В КАТАЛОГ
              </Link>
            </div>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="checkout-page">
        <div className="container checkout-container">
          <form className="checkout-layout" onSubmit={handleSubmit} noValidate>
            <section className="checkout-form-section">
              <h1>ОФОРМЛЕНИЕ ЗАКАЗА</h1>

              <div className="checkout-block">
                <h2>1. КОНТАКТНЫЕ ДАННЫЕ</h2>
                <label className="checkout-field">
                  <span>Имя</span>
                  <input
                    value={values.name}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, name: event.target.value }))
                    }
                    autoComplete="name"
                  />
                  {errors.name && <em className="checkout-field-error">{errors.name}</em>}
                </label>
                <label className="checkout-field">
                  <span>Телефон</span>
                  <input
                    value={values.phone}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, phone: event.target.value }))
                    }
                    autoComplete="tel"
                  />
                  {errors.phone && <em className="checkout-field-error">{errors.phone}</em>}
                </label>
                <label className="checkout-field">
                  <span>Email (необязательно)</span>
                  <input
                    type="email"
                    value={values.email}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, email: event.target.value }))
                    }
                    autoComplete="email"
                  />
                  {errors.email && <em className="checkout-field-error">{errors.email}</em>}
                </label>
              </div>

              <div className="checkout-block">
                <h2>2. СПОСОБ ПОЛУЧЕНИЯ</h2>
                <div className="checkout-radio-group">
                  <label className="checkout-radio">
                    <input
                      type="radio"
                      name="deliveryMethod"
                      checked={values.deliveryMethod === 'delivery'}
                      onChange={() =>
                        setValues((current) => ({ ...current, deliveryMethod: 'delivery' }))
                      }
                    />
                    <span>Доставка</span>
                  </label>
                  <label className="checkout-radio">
                    <input
                      type="radio"
                      name="deliveryMethod"
                      checked={values.deliveryMethod === 'pickup'}
                      onChange={() =>
                        setValues((current) => ({ ...current, deliveryMethod: 'pickup' }))
                      }
                    />
                    <span>Самовывоз</span>
                  </label>
                </div>

                {values.deliveryMethod === 'delivery' && (
                  <>
                    <label className="checkout-field">
                      <span>Город</span>
                      <input
                        value={values.city}
                        onChange={(event) =>
                          setValues((current) => ({ ...current, city: event.target.value }))
                        }
                      />
                      {errors.city && <em className="checkout-field-error">{errors.city}</em>}
                    </label>
                    <label className="checkout-field">
                      <span>Адрес</span>
                      <input
                        value={values.address}
                        onChange={(event) =>
                          setValues((current) => ({ ...current, address: event.target.value }))
                        }
                      />
                      {errors.address && (
                        <em className="checkout-field-error">{errors.address}</em>
                      )}
                    </label>
                  </>
                )}
              </div>

              <label className="checkout-field">
                <span>Комментарий к заказу</span>
                <textarea
                  rows={4}
                  value={values.comment}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, comment: event.target.value }))
                  }
                />
              </label>
            </section>

            <aside className="checkout-summary">
              <h2>ВАШ ЗАКАЗ</h2>
              <div className="checkout-summary-items">
                {lineItems.map((item) => (
                  <article key={item.productId} className="checkout-summary-item">
                    <img src={item.image} alt={item.name} />
                    <div>
                      <h3>{item.name}</h3>
                      <p>
                        {item.quantity} × {formatPrice(item.price)}
                      </p>
                      {item.size && <p>Размер: {item.size}</p>}
                    </div>
                    <strong>{formatPrice(item.price * item.quantity)}</strong>
                  </article>
                ))}
              </div>
              <div className="checkout-summary-total">
                <p>Товаров: {totalItems}</p>
                <div className="checkout-summary-price">
                  <span>Итого:</span>
                  <strong>{formatPrice(total)}</strong>
                </div>
              </div>
              {formError && <p className="checkout-form-error">{formError}</p>}
              <button type="submit" className="dark-btn checkout-submit" disabled={submitting}>
                {submitting ? 'СОЗДАНИЕ ЗАКАЗА...' : 'ПОДТВЕРДИТЬ ЗАКАЗ'}
              </button>
              <div className="checkout-divider">
                <span>или</span>
              </div>
              <button
                type="button"
                className="checkout-whatsapp-btn"
                onClick={handleWhatsAppOrder}
                disabled={!whatsappSettingsLoaded || !whatsappSettings?.enabled}
              >
                {!whatsappSettingsLoaded ? 'ЗАГРУЗКА WHATSAPP...' : 'ЗАКАЗАТЬ В WHATSAPP'}
              </button>
              {whatsappSettingsLoaded && !whatsappSettings?.enabled && (
                <p className="checkout-form-error">Заказ через WhatsApp сейчас недоступен.</p>
              )}
              {whatsappError && <p className="checkout-form-error">{whatsappError}</p>}
            </aside>
          </form>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
