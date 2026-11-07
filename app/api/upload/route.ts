import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '../../../lib/auth';
import { registerMedia } from '../../../lib/media-store';
import { getUploadsDirectory } from '../../../lib/upload-storage';

function isAdmin(request: Request): boolean {
  const session = getSessionFromRequest(request);
  return session?.role === 'admin';
}

function getImageExtension(buffer: Buffer): 'jpg' | 'png' | 'webp' | 'gif' | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) return 'png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'webp';
  }
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))) return 'gif';
  return null;
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

    if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be between 1 byte and 10 MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = getImageExtension(buffer);
    if (!extension) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, and GIF images are allowed' }, { status: 400 });
    }

    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;
    const uploadDir = path.join(getUploadsDirectory(), 'products');
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    const url = `/uploads/products/${filename}`;
    await registerMedia({ url, filename, label: file.name });

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
