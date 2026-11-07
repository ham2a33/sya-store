import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '../../../../lib/auth';
import {
  deleteBanner,
  getBannerById,
  swapBannerOrder,
  updateBanner,
} from '../../../../lib/banners-store';
import { deleteMediaFile, findMediaUsage } from '../../../../lib/media-store';

function isAdmin(request: Request): boolean {
  const session = getSessionFromRequest(request);
  return session?.role === 'admin';
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const banner = await getBannerById(id);
  if (!banner) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ banner });
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (body.direction === 'up' || body.direction === 'down') {
      const swapped = await swapBannerOrder(id, body.direction);
      if (!swapped) {
        return NextResponse.json({ error: 'Cannot reorder' }, { status: 400 });
      }
      revalidatePath('/');
      revalidatePath('/admin/homepage');
      const banner = await getBannerById(id);
      return NextResponse.json({ banner });
    }

    const patch: Record<string, unknown> = {};
    if (body.name != null) patch.name = String(body.name);
    if (body.image != null) patch.image = String(body.image);
    if (body.eyebrow != null) patch.eyebrow = String(body.eyebrow);
    if (body.headline != null) patch.headline = String(body.headline);
    if (body.title != null) patch.title = String(body.title);
    if (body.subtitle != null) patch.subtitle = String(body.subtitle);
    if (body.cta != null || body.buttonText != null) {
      patch.cta = String(body.cta ?? body.buttonText);
    }
    if (body.href != null || body.buttonHref != null) {
      patch.href = String(body.href ?? body.buttonHref);
    }
    if (body.sortOrder != null || body.order != null) {
      patch.sortOrder = Number(body.sortOrder ?? body.order);
    }
    if (body.active != null) patch.active = Boolean(body.active);

    const updated = await updateBanner(id, patch);
    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    revalidatePath('/');
    revalidatePath('/admin/homepage');
    return NextResponse.json({ banner: updated });
  } catch {
    return NextResponse.json({ error: 'Failed to update banner' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!isAdmin(_request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const removed = await deleteBanner(id);
  if (!removed) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (removed.image.startsWith('/uploads/')) {
    const usages = await findMediaUsage(removed.image);
    const otherUsages = usages.filter(
      (usage) => !(usage.type === 'hero' && usage.id === removed.id),
    );
    if (otherUsages.length === 0) {
      await deleteMediaFile(removed.image);
    }
  }

  revalidatePath('/');
  revalidatePath('/admin/homepage');
  return NextResponse.json({ ok: true });
}
