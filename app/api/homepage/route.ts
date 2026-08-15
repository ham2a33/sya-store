import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '../../../lib/auth';
import {
  getHomepageConfig,
  getHomepageConfigAdmin,
  updateHomepageConfig,
} from '../../../lib/homepage-store';

function isAdmin(request: Request): boolean {
  const session = getSessionFromRequest(request);
  return session?.role === 'admin';
}

export async function GET(request: Request) {
  const adminView = new URL(request.url).searchParams.get('admin') === 'true';

  if (adminView && !isAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const homepage = adminView ? await getHomepageConfigAdmin() : await getHomepageConfig();
  return NextResponse.json({ homepage });
}

export async function PATCH(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const homepage = await updateHomepageConfig(body);
    revalidatePath('/');
    return NextResponse.json({ homepage });
  } catch {
    return NextResponse.json({ error: 'Failed to update homepage' }, { status: 500 });
  }
}
