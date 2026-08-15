export function groupCartQuantities(itemIds: string[]): Map<string, number> {
  const quantities = new Map<string, number>();
  for (const id of itemIds) {
    if (typeof id !== 'string') continue;
    quantities.set(id, (quantities.get(id) ?? 0) + 1);
  }
  return quantities;
}

export function isValidEmail(value: string): boolean {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export const MAX_ORDER_ITEM_QUANTITY = 99;
