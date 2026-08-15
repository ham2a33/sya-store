import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '../../../../lib/auth';
import { getOrderById, updateOrderStatus } from '../../../../lib/orders-store';
import type { OrderStatus } from '../../../../lib/types';

function isAdmin(request: Request): boolean {
  const session = getSessionFromRequest(request);
  return session?.role === 'admin';
}

type RouteContext = { params: Promise<{ id: string }> };

const STATUSES: OrderStatus[] = [
  'new',
  'confirmed',
  'processing',
  'shipped',
  'completed',
  'cancelled',
];

export async function GET(_request: Request, context: RouteContext) {
  if (!isAdmin(_request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const order = await getOrderById(id);

  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ order });
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const body = (await request.json()) as { status?: OrderStatus };
    if (!body.status || !STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updated = await updateOrderStatus(id, body.status);
    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${id}`);
    return NextResponse.json({ order: updated });
  } catch {
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
