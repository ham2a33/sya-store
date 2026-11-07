import { promises as fs } from 'fs';
import path from 'path';
import { getUploadsDirectory } from '../../../lib/upload-storage';

type RouteContext = { params: Promise<{ path: string[] }> };

const CONTENT_TYPES: Record<string, string> = {
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function notFound(): Response {
  return new Response('Not Found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' },
  });
}

async function serveFile(context: RouteContext, includeBody: boolean): Promise<Response> {
  const { path: segments } = await context.params;
  if (
    !segments?.length ||
    segments.some((segment) => !segment || segment === '.' || segment === '..' || /[/\\\0]/.test(segment))
  ) {
    return notFound();
  }

  const uploadsRoot = getUploadsDirectory();
  const candidatePath = path.resolve(uploadsRoot, ...segments);
  const rootPrefix = `${path.resolve(uploadsRoot)}${path.sep}`;
  if (!candidatePath.startsWith(rootPrefix)) return notFound();

  try {
    const [realRoot, realFile] = await Promise.all([
      fs.realpath(uploadsRoot),
      fs.realpath(candidatePath),
    ]);
    if (!realFile.startsWith(`${realRoot}${path.sep}`)) return notFound();

    const extension = path.extname(realFile).toLowerCase();
    const contentType = CONTENT_TYPES[extension];
    if (!contentType) return notFound();

    const stats = await fs.stat(realFile);
    if (!stats.isFile()) return notFound();

    const headers = {
      'Cache-Control': 'public, max-age=3600',
      'Content-Length': String(stats.size),
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
    };
    if (!includeBody) return new Response(null, { headers });

    const file = await fs.readFile(realFile);
    return new Response(new Uint8Array(file), { headers });
  } catch {
    return notFound();
  }
}

export async function GET(_request: Request, context: RouteContext) {
  return serveFile(context, true);
}

export async function HEAD(_request: Request, context: RouteContext) {
  return serveFile(context, false);
}
