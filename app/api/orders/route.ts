import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '../../../lib/auth';
import { createOrder, getAllOrders, OrderValidationError } from '../../../lib/orders-store';
import type { CreateOrderInput } from '../../../lib/types';

function isAdmin(request: Request): boolean {
  const session = getSessionFromRequest(request);
  return session?.role === 'admin';
}

export async function GET(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const orders = await getAllOrders();
  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateOrderInput;

    const order = await createOrder({
      customer: {
        name: String(body.customer?.name ?? ''),
        phone: String(body.customer?.phone ?? ''),
        email: body.customer?.email ? String(body.customer.email) : undefined,
      },
      delivery: {
        method: body.delivery?.method === 'pickup' ? 'pickup' : 'delivery',
        city: body.delivery?.city ? String(body.delivery.city) : undefined,
        address: body.delivery?.address ? String(body.delivery.address) : undefined,
      },
      comment: body.comment ? String(body.comment) : undefined,
      items: Array.isArray(body.items)
        ? body.items.map((item) => ({
            productId: String(item.productId ?? ''),
            quantity: Number(item.quantity),
          }))
        : [],
    });

    revalidatePath('/');
    revalidatePath('/catalog');
    revalidatePath('/admin/orders');

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return NextResponse.json(
        {
          error: error.code,
          message: error.message,
          field: error.field,
          productName: error.productName,
          available: error.available,
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
