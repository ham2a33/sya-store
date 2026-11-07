import { formatPrice } from './products';

type WhatsAppLineItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

export function buildWhatsAppOrderMessage(
  lineItems: WhatsAppLineItem[],
  origin: string,
): string {
  const lines = ['Здравствуйте! Хочу заказать товары с сайта SYA:', ''];

  lineItems.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.name}`);
    lines.push(`Количество: ${item.quantity}`);
    lines.push(
      item.quantity > 1
        ? `Цена: ${formatPrice(item.price)} за шт.`
        : `Цена: ${formatPrice(item.price)}`,
    );
    lines.push(`${origin}/product/${item.productId}`);
    lines.push('');
  });

  const totalItems = lineItems.reduce((sum, item) => sum + item.quantity, 0);
  const total = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  lines.push(`Итого товаров: ${totalItems}`);
  lines.push(`Итого: ${formatPrice(total)}`);
  lines.push('');
  lines.push('Подскажите, пожалуйста, по наличию и доставке.');

  return lines.join('\n');
}

export function buildWhatsAppOrderUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function openWhatsAppOrder(url: string): void {
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    window.location.href = url;
  }
}
