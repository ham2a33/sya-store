const DEFAULT_WHATSAPP_NUMBER = '77007323157';

function normalizeWhatsAppNumber(value: string): string {
  return value.replace(/\D/g, '');
}

export const STORE_WHATSAPP_NUMBER = normalizeWhatsAppNumber(
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? DEFAULT_WHATSAPP_NUMBER,
);

export function getStoreWhatsAppNumber(): string {
  return STORE_WHATSAPP_NUMBER;
}

export function isStoreWhatsAppConfigured(): boolean {
  return getStoreWhatsAppNumber().length >= 10;
}
