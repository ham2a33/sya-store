import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '../../../lib/auth';
import { registerMedia } from '../../../lib/media-store';

function isAdmin(request: Request): boolean {
  const session = getSessionFromRequest(request);
  return session?.role === 'admin';
}

export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only images are allowed' }, { status: 400 });
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeExtension = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension)
      ? extension
      : 'jpg';
    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${safeExtension}`;
    const uploadDir = path.join(process.cwd(), 'public/uploads/products');
    await fs.mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    const url = `/uploads/products/${filename}`;
    await registerMedia({ url, filename, label: file.name });

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
