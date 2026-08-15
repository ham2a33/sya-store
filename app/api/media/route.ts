import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '../../../lib/auth';
import {
  deleteMedia,
  deleteMediaFile,
  findMediaUsage,
  getAllMedia,
} from '../../../lib/media-store';

function isAdmin(request: Request): boolean {
  const session = getSessionFromRequest(request);
  return session?.role === 'admin';
}

export async function GET(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const media = await getAllMedia();
  return NextResponse.json({ media });
}

export async function DELETE(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const force = searchParams.get('force') === 'true';

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const items = await getAllMedia();
  const item = items.find((entry) => entry.id === id);
  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const usages = await findMediaUsage(item.url);
  if (usages.length > 0 && !force) {
    return NextResponse.json({ error: 'In use', usages }, { status: 409 });
  }
  await deleteMediaFile(item.url);

  return NextResponse.json({ ok: true });
}
