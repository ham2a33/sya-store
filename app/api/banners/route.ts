import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '../../../lib/auth';
import {
  createBanner,
  getActiveBanners,
  getAllBanners,
} from '../../../lib/banners-store';

function isAdmin(request: Request): boolean {
  const session = getSessionFromRequest(request);
  return session?.role === 'admin';
}

export async function GET(request: Request) {
  const adminView = new URL(request.url).searchParams.get('admin') === 'true';

  if (adminView && !isAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const banners = adminView ? await getAllBanners() : await getActiveBanners();
  return NextResponse.json({ banners });
}

export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const banner = await createBanner({
      name: String(body.name ?? '').trim(),
      image: String(body.image ?? '').trim(),
      eyebrow: body.eyebrow ? String(body.eyebrow) : undefined,
      headline: body.headline ? String(body.headline) : undefined,
      title: body.title ? String(body.title) : undefined,
      subtitle: body.subtitle ? String(body.subtitle) : undefined,
      cta: String(body.cta ?? body.buttonText ?? 'СМОТРЕТЬ').trim(),
      href: String(body.href ?? body.buttonHref ?? '/catalog').trim(),
      sortOrder: Number(body.sortOrder ?? body.order ?? 999),
      active: body.active !== false,
    });

    if (!banner.name || !banner.image) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    revalidatePath('/');
    return NextResponse.json({ banner }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'BANNER_EXISTS') {
      return NextResponse.json({ error: 'Banner already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create banner' }, { status: 500 });
  }
}
