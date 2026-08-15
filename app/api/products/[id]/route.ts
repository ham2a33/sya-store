import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '../../../../lib/auth';
import {
  archiveProduct,
  getProductById,
  getStoredProduct,
  updateProduct,
} from '../../../../lib/products-store';
import type { CategorySlug } from '../../../../lib/products.types';

function isAdmin(request: Request): boolean {
  const session = getSessionFromRequest(request);
  return session?.role === 'admin';
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const product = await getProductById(id);
  if (!product) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ product });
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await getStoredProduct(id);
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};

    if (body.name != null) patch.name = String(body.name).trim();
    if (body.price != null) patch.price = Number(body.price);
    if (body.oldPrice != null) patch.oldPrice = Number(body.oldPrice);
    if (body.category != null) patch.category = body.category as CategorySlug;
    if (body.image != null) patch.image = String(body.image).trim();
    if (body.images != null && Array.isArray(body.images)) patch.images = body.images.map(String);
    if (body.description != null) patch.description = String(body.description);
    if (body.material != null) patch.material = String(body.material);
    if (body.color != null) patch.color = String(body.color);
    if (body.size != null) patch.size = String(body.size);
    if (body.stock != null) patch.stock = Number(body.stock);
    if (body.isNew != null) patch.isNew = Boolean(body.isNew);
    if (body.popular != null) patch.popular = Boolean(body.popular);
    if (body.isBestseller != null) patch.isBestseller = Boolean(body.isBestseller);
    if (body.bestsellerOrder != null) {
      patch.bestsellerOrder = body.bestsellerOrder === '' ? null : Number(body.bestsellerOrder);
    }
    if (body.status === 'archived' || body.status === 'active') patch.status = body.status;

    const updated = await updateProduct(id, patch);
    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    revalidatePath('/catalog');
    revalidatePath('/search');
    revalidatePath('/favorites');
    revalidatePath(`/product/${id}`);
    revalidatePath('/admin/products');

    return NextResponse.json({ product: updated });
  } catch {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const restore = searchParams.get('restore') === 'true';

  if (restore) {
    const { restoreProduct } = await import('../../../../lib/products-store');
    const restored = await restoreProduct(id);
    if (!restored) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    revalidatePath('/');
    revalidatePath('/catalog');
    revalidatePath('/search');
    revalidatePath('/favorites');
    revalidatePath(`/product/${id}`);
    revalidatePath('/admin/products');
    return NextResponse.json({ ok: true, restored: true });
  }

  const archived = await archiveProduct(id);
  if (!archived) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  revalidatePath('/catalog');
  revalidatePath('/search');
  revalidatePath('/favorites');
  revalidatePath(`/product/${id}`);
  revalidatePath('/admin/products');

  return NextResponse.json({ ok: true });
}
