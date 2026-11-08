import { formatPrice } from './products';

export const DEFAULT_WHATSAPP_TEMPLATE = [
  'Здравствуйте! Хочу оформить заказ в магазине SYA.',
  '',
  'Товары:',
  '{{items}}',
  '',
  'Итого: {{total}}',
  '',
  'Данные клиента:',
  'Имя: {{name}}',
  'Телефон: {{phone}}',
  'Email: {{email}}',
  'Город: {{city}}',
  'Адрес: {{address}}',
  'Способ получения: {{deliveryMethod}}',
  'Комментарий к заказу: {{comment}}',
].join('\n');

type WhatsAppLineItem = {
  productId: string;
  article?: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
};

export type WhatsAppOrderDetails = {
  name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  deliveryMethod: string;
  comment: string;
};

export function renderWhatsAppTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (token, key: string) => values[key] ?? token);
}

export function buildWhatsAppOrderMessage(
  lineItems: WhatsAppLineItem[],
  total: number,
  details: WhatsAppOrderDetails,
  template = DEFAULT_WHATSAPP_TEMPLATE,
): string {
  const items = lineItems.map((item, index) => [
    `${index + 1}. ${item.name}`,
    `   Артикул: ${item.article || item.productId}`,
    `   Количество: ${item.quantity}`,
    `   Цена: ${formatPrice(item.price)} за шт.`,
    ...(item.size?.trim() ? [`   Размер: ${item.size.trim()}`] : []),
  ].join('\n')).join('\n');

  return renderWhatsAppTemplate(template, {
    items,
    total: formatPrice(total),
    name: details.name || '—',
    phone: details.phone || '—',
    email: details.email || '—',
    city: details.city || '—',
    address: details.address || '—',
    deliveryMethod: details.deliveryMethod || '—',
    comment: details.comment || '—',
  });
}

export function buildWhatsAppOrderUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function openWhatsAppOrder(url: string): boolean {
  const opened = window.open(url, '_blank');
  if (!opened) return false;
  opened.opener = null;
  return true;
}
