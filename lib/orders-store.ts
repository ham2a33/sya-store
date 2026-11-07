import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { MAX_ORDER_ITEM_QUANTITY } from './cart-utils';
import { readRawProducts, writeRawProducts } from './products-store';
import type { CreateOrderInput, OrderItem, StoredOrder, StoredProduct } from './types';

const ORDERS_PATH = path.join(process.cwd(), 'data/orders.json');

export class OrderValidationError extends Error {
  code: string;
  field?: string;
  productName?: string;
  available?: number;

  constructor(
    message: string,
    code: string,
    options?: { field?: string; productName?: string; available?: number },
  ) {
    super(message);
    this.code = code;
    this.field = options?.field;
    this.productName = options?.productName;
    this.available = options?.available;
  }
}

async function readOrders(): Promise<StoredOrder[]> {
  try {
    const raw = await fs.readFile(ORDERS_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as StoredOrder[];
  } catch {
    return [];
  }
}

async function writeOrders(orders: StoredOrder[]): Promise<void> {
  await fs.mkdir(path.dirname(ORDERS_PATH), { recursive: true });
  await fs.writeFile(ORDERS_PATH, JSON.stringify(orders, null, 2), 'utf8');
}

function normalizePhone(value: string): string {
  return value.trim();
}

function validateInput(input: CreateOrderInput): void {
  if (!input.customer.name.trim()) {
    throw new OrderValidationError('Укажите имя', 'INVALID_NAME', { field: 'name' });
  }

  if (!normalizePhone(input.customer.phone)) {
    throw new OrderValidationError('Укажите телефон', 'INVALID_PHONE', { field: 'phone' });
  }

  if (input.customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.customer.email.trim())) {
    throw new OrderValidationError('Некорректный email', 'INVALID_EMAIL', { field: 'email' });
  }

  if (input.delivery.method !== 'delivery' && input.delivery.method !== 'pickup') {
    throw new OrderValidationError('Выберите способ получения', 'INVALID_DELIVERY', {
      field: 'deliveryMethod',
    });
  }

  if (input.delivery.method === 'delivery') {
    if (!input.delivery.city?.trim()) {
      throw new OrderValidationError('Укажите город', 'INVALID_CITY', { field: 'city' });
    }
    if (!input.delivery.address?.trim()) {
      throw new OrderValidationError('Укажите адрес', 'INVALID_ADDRESS', { field: 'address' });
    }
  }

  if (!input.items.length) {
    throw new OrderValidationError('Корзина пуста', 'EMPTY_CART');
  }

  for (const item of input.items) {
    if (!item.productId || !Number.isFinite(item.quantity) || item.quantity < 1) {
      throw new OrderValidationError('Некорректное количество товара', 'INVALID_QUANTITY');
    }
    if (item.quantity > MAX_ORDER_ITEM_QUANTITY) {
      throw new OrderValidationError('Слишком большое количество товара', 'INVALID_QUANTITY');
    }
  }
}

function aggregateItems(items: CreateOrderInput['items']): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
  }
  return map;
}

function buildOrderItems(
  aggregated: Map<string, number>,
  products: StoredProduct[],
): OrderItem[] {
  const orderItems: OrderItem[] = [];

  for (const [productId, quantity] of aggregated) {
    const product = products.find((item) => item.id === productId);

    if (!product || product.status === 'archived') {
      throw new OrderValidationError('Товар недоступен', 'PRODUCT_NOT_FOUND', {
        productName: product?.name,
      });
    }

    if (product.stock == null || product.stock <= 0) {
      throw new OrderValidationError(`Товар «${product.name}» недоступен`, 'OUT_OF_STOCK', {
        productName: product.name,
        available: 0,
      });
    }

    if (quantity > product.stock) {
      throw new OrderValidationError(
        `Товар «${product.name}» доступен только в количестве ${product.stock} шт.`,
        'INSUFFICIENT_STOCK',
        { productName: product.name, available: product.stock },
      );
    }

    orderItems.push({
      productId: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity,
      total: product.price * quantity,
    });
  }

  return orderItems;
}

function applyStockDecrease(
  products: StoredProduct[],
  aggregated: Map<string, number>,
): StoredProduct[] {
  return products.map((product) => {
    const quantity = aggregated.get(product.id);
    if (!quantity) return product;
    return { ...product, stock: (product.stock ?? 0) - quantity };
  });
}

function revertStockIncrease(
  products: StoredProduct[],
  aggregated: Map<string, number>,
): StoredProduct[] {
  return products.map((product) => {
    const quantity = aggregated.get(product.id);
    if (!quantity) return product;
    return { ...product, stock: (product.stock ?? 0) + quantity };
  });
}

function nextOrderNumber(orders: StoredOrder[]): number {
  if (!orders.length) return 1001;
  return Math.max(...orders.map((order) => order.orderNumber)) + 1;
}

export async function createOrder(input: CreateOrderInput): Promise<StoredOrder> {
  validateInput(input);

  const aggregated = aggregateItems(input.items);
  const products = await readRawProducts();
  const orderItems = buildOrderItems(aggregated, products);
  const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);

  const orders = await readOrders();
  const order: StoredOrder = {
    id: `order-${randomUUID().slice(0, 8)}`,
    orderNumber: nextOrderNumber(orders),
    status: 'new',
    customer: {
      name: input.customer.name.trim(),
      phone: normalizePhone(input.customer.phone),
      email: input.customer.email?.trim() || undefined,
    },
    delivery: {
      method: input.delivery.method,
      city: input.delivery.method === 'delivery' ? input.delivery.city?.trim() : undefined,
      address:
        input.delivery.method === 'delivery' ? input.delivery.address?.trim() : undefined,
    },
    comment: input.comment?.trim() || undefined,
    items: orderItems,
    subtotal,
    total: subtotal,
    createdAt: new Date().toISOString(),
  };

  const updatedProducts = applyStockDecrease(products, aggregated);

  for (const product of updatedProducts) {
    if (product.stock != null && product.stock < 0) {
      throw new OrderValidationError('Недостаточно товара на складе', 'INSUFFICIENT_STOCK');
    }
  }

  await writeRawProducts(updatedProducts);

  try {
    orders.unshift(order);
    await writeOrders(orders);
  } catch (error) {
    await writeRawProducts(revertStockIncrease(updatedProducts, aggregated));
    throw error;
  }

  return order;
}

export async function getAllOrders(): Promise<StoredOrder[]> {
  const orders = await readOrders();
  return orders.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getOrderById(id: string): Promise<StoredOrder | undefined> {
  const orders = await readOrders();
  return orders.find((order) => order.id === id);
}

export async function updateOrderStatus(
  id: string,
  status: StoredOrder['status'],
): Promise<StoredOrder | undefined> {
  const orders = await readOrders();
  const index = orders.findIndex((order) => order.id === id);
  if (index === -1) return undefined;

  orders[index] = { ...orders[index], status };
  await writeOrders(orders);
  return orders[index];
}
