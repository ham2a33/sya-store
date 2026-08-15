import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '../../../../lib/auth';
import {
  archiveCategory,
  deleteCategory,
  getCategoryBySlug,
  restoreCategory,
  updateCategory,
} from '../../../../lib/categories-store';
import { deleteMediaFile, findMediaUsage } from '../../../../lib/media-store';

function isAdmin(request: Request): boolean {
  const session = getSessionFromRequest(request);
  return session?.role === 'admin';
}

type RouteContext = { params: Promise<{ slug: string }> };

function revalidateCategoryPaths(slug: string, extraSlugs: string[] = []) {
  revalidatePath('/');
  revalidatePath('/catalog');
  revalidatePath(`/catalog/${slug}`);
  for (const extraSlug of extraSlugs) {
    revalidatePath(`/catalog/${extraSlug}`);
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ category });
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { slug } = await context.params;

  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === 'archive') {
      const archived = await archiveCategory(slug);
      if (!archived) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      revalidateCategoryPaths(archived.slug, archived.slugAliases ?? []);
      return NextResponse.json({ category: archived });
    }

    if (body.action === 'restore') {
      const restored = await restoreCategory(slug);
      if (!restored) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      revalidateCategoryPaths(restored.slug, restored.slugAliases ?? []);
      return NextResponse.json({ category: restored });
    }

    const patch: Record<string, unknown> = {};
    if (body.title != null) patch.title = String(body.title);
    if (body.slug != null) patch.slug = String(body.slug);
    if (body.description != null) patch.description = String(body.description);
    if (body.image != null) patch.image = String(body.image);
    if (body.sortOrder != null) patch.sortOrder = Number(body.sortOrder);
    if (body.active != null) patch.active = Boolean(body.active);
    if (body.direction === 'up' || body.direction === 'down') {
      patch.direction = body.direction;
    }

    const previous = await getCategoryBySlug(slug);
    const updated = await updateCategory(slug, patch);

    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const aliasSlugs = [
      ...(previous?.slugAliases ?? []),
      ...(updated.slugAliases ?? []),
      ...(previous && previous.slug !== updated.slug ? [previous.slug] : []),
    ];
    revalidateCategoryPaths(updated.slug, aliasSlugs);
    return NextResponse.json({ category: updated });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'SLUG_EXISTS' || error.message === 'SLUG_RESERVED') {
        return NextResponse.json({ error: 'Category slug already exists' }, { status: 409 });
      }
      if (error.message === 'INVALID_SLUG') {
        return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
      }
    }
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { slug } = await context.params;

  try {
    const body = (await request.json().catch(() => ({}))) as { transferTo?: string };
    const removed = await deleteCategory(slug, { transferTo: body.transferTo });

    if (!removed) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (removed.image.startsWith('/uploads/')) {
      const usages = await findMediaUsage(removed.image);
      const otherUsages = usages.filter(
        (usage) => !(usage.type === 'category' && usage.id === removed.slug),
      );
      if (otherUsages.length === 0) {
        await deleteMediaFile(removed.image);
      }
    }

    revalidateCategoryPaths(removed.slug, removed.slugAliases ?? []);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('CATEGORY_NOT_EMPTY:')) {
      const productCount = Number(error.message.split(':')[1] ?? 0);
      return NextResponse.json(
        { error: 'CATEGORY_NOT_EMPTY', productCount },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === 'INVALID_TRANSFER_TARGET') {
      return NextResponse.json({ error: 'Invalid transfer target' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
