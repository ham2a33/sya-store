import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '../../../lib/auth';
import {
  createProduct,
  getAllProducts,
  getAllStoredProducts,
  toStoredProduct,
} from '../../../lib/products-store';
import type { CategorySlug } from '../../../lib/products.types';

function isAdmin(request: Request): boolean {
  const session = getSessionFromRequest(request);
  return session?.role === 'admin';
}

export async function GET(request: Request) {
  const includeArchived = new URL(request.url).searchParams.get('includeArchived') === 'true';

  if (includeArchived && !isAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const products = includeArchived
    ? (await getAllStoredProducts()).map((product) => ({
        ...product,
        inStock: product.stock > 0 && product.status === 'active',
      }))
    : await getAllProducts();

  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const product = toStoredProduct({
      id: String(body.id ?? '').trim(),
      name: String(body.name ?? '').trim(),
      price: Number(body.price),
      oldPrice: body.oldPrice != null ? Number(body.oldPrice) : undefined,
      category: body.category as CategorySlug,
      image: String(body.image ?? '').trim(),
      images: Array.isArray(body.images)
        ? body.images.map(String)
        : [String(body.image ?? '').trim()],
      description: String(body.description ?? '').trim(),
      material: body.material ? String(body.material) : undefined,
      color: body.color ? String(body.color) : undefined,
      size: body.size ? String(body.size) : undefined,
      stock: Number(body.stock ?? 0),
      isNew: Boolean(body.isNew),
      popular: Boolean(body.popular),
      status: body.status === 'archived' ? 'archived' : 'active',
    });

    if (!product.id || !product.name || !product.category || !product.image) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!Number.isFinite(product.price) || product.price < 0) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
    }

    const created = await createProduct(product);
    revalidatePath('/catalog');
    revalidatePath('/search');
    revalidatePath('/favorites');
    revalidatePath(`/product/${created.id}`);

    return NextResponse.json({ product: created }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'PRODUCT_EXISTS') {
      return NextResponse.json({ error: 'Product already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
