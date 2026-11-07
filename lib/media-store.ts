import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { getAllStoredCategories } from './categories-store';
import { getHomepageConfigAdmin } from './homepage-store';
import { getAllBanners } from './banners-store';
import { getAllStoredProducts } from './products-store';
import type { MediaItem, MediaUsage } from './types';

const DATA_PATH = path.join(process.cwd(), 'data/media.json');

async function readMedia(): Promise<MediaItem[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as MediaItem[];
  } catch {
    return [];
  }
}

async function writeMedia(items: MediaItem[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(items, null, 2), 'utf8');
}

export async function getAllMedia(): Promise<MediaItem[]> {
  const items = await readMedia();
  return items.sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );
}

export async function registerMedia(input: {
  url: string;
  filename: string;
  label?: string;
}): Promise<MediaItem> {
  const items = await readMedia();
  const existing = items.find((item) => item.url === input.url);
  if (existing) return existing;

  const item: MediaItem = {
    id: randomUUID(),
    url: input.url,
    filename: input.filename,
    uploadedAt: new Date().toISOString(),
    label: input.label,
  };

  items.push(item);
  await writeMedia(items);
  return item;
}

export async function deleteMedia(id: string): Promise<boolean> {
  const items = await readMedia();
  const next = items.filter((item) => item.id !== id);
  if (next.length === items.length) return false;
  await writeMedia(next);
  return true;
}

export async function findMediaUsage(url: string): Promise<MediaUsage[]> {
  const usages: MediaUsage[] = [];
  const products = await getAllStoredProducts();
  const categories = await getAllStoredCategories();
  const homepage = await getHomepageConfigAdmin();

  for (const product of products) {
    const images = [product.image, ...product.images];
    if (images.includes(url)) {
      usages.push({ type: 'product', id: product.id, label: product.name });
    }
  }

  for (const category of categories) {
    if (category.image === url) {
      usages.push({ type: 'category', id: category.slug, label: category.title });
    }
  }

  if (homepage.aboutImage === url) {
    usages.push({ type: 'homepage', id: 'about', label: 'Блок «О бренде»' });
  }

  const banners = await getAllBanners();
  for (const banner of banners) {
    if (banner.image === url) {
      usages.push({ type: 'hero', id: banner.id, label: `Hero: ${banner.name ?? banner.headline ?? banner.id}` });
    }
  }

  return usages;
}

export async function deleteMediaFile(url: string): Promise<void> {
  if (!url.startsWith('/uploads/')) return;
  const filePath = path.join(process.cwd(), 'public', url);
  try {
    await fs.unlink(filePath);
  } catch {
    // ignore missing files
  }
}
