import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '../../../lib/auth';
import {
  createCategory,
  getAllCategories,
  getAllStoredCategories,
} from '../../../lib/categories-store';

function isAdmin(request: Request): boolean {
  const session = getSessionFromRequest(request);
  return session?.role === 'admin';
}

function revalidateCategoryPaths(slug?: string) {
  revalidatePath('/');
  revalidatePath('/catalog');
  if (slug) {
    revalidatePath(`/catalog/${slug}`);
  }
}

export async function GET(request: Request) {
  const includeInactive =
    new URL(request.url).searchParams.get('includeInactive') === 'true' ||
    new URL(request.url).searchParams.get('admin') === 'true';

  if (includeInactive && !isAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const categories = includeInactive
    ? await getAllStoredCategories()
    : await getAllCategories();

  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const category = await createCategory({
      slug: String(body.slug ?? ''),
      title: String(body.title ?? ''),
      description: body.description ? String(body.description) : undefined,
      image: String(body.image ?? ''),
      sortOrder: body.sortOrder != null ? Number(body.sortOrder) : undefined,
      active: body.active !== false,
    });

    if (!category.image) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    revalidateCategoryPaths(category.slug);
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'CATEGORY_EXISTS' || error.message === 'SLUG_RESERVED') {
        return NextResponse.json({ error: 'Category slug already exists' }, { status: 409 });
      }
      if (error.message === 'INVALID_INPUT') {
        return NextResponse.json({ error: 'Invalid category data' }, { status: 400 });
      }
    }
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
