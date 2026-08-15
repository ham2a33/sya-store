import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import type { HeroSlide } from './types';

const BANNERS_PATH = path.join(process.cwd(), 'data/banners.json');
const HOMEPAGE_PATH = path.join(process.cwd(), 'data/homepage.json');

export type Banner = HeroSlide & {
  name: string;
};

function normalizeBanner(raw: Partial<Banner> & Pick<Banner, 'id'>): Banner {
  return {
    id: raw.id,
    name: raw.name ?? raw.headline ?? raw.id,
    image: raw.image ?? '',
    eyebrow: raw.eyebrow,
    headline: raw.headline,
    title: raw.title,
    subtitle: raw.subtitle,
    cta: raw.cta ?? 'СМОТРЕТЬ',
    href: raw.href ?? '/catalog',
    sortOrder: raw.sortOrder ?? 999,
    active: raw.active ?? true,
  };
}

async function readBannersRaw(): Promise<Banner[]> {
  try {
    const raw = await fs.readFile(BANNERS_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeBanner(item as Banner));
  } catch {
    return [];
  }
}

async function writeBanners(banners: Banner[]): Promise<void> {
  await fs.mkdir(path.dirname(BANNERS_PATH), { recursive: true });
  await fs.writeFile(BANNERS_PATH, JSON.stringify(banners, null, 2), 'utf8');
}

async function migrateFromHomepageIfNeeded(): Promise<void> {
  const existing = await readBannersRaw();
  if (existing.length > 0) return;

  try {
    const raw = await fs.readFile(HOMEPAGE_PATH, 'utf8');
    const homepage = JSON.parse(raw) as { heroSlides?: HeroSlide[] };
    if (!homepage.heroSlides?.length) return;

    const migrated = homepage.heroSlides.map((slide) =>
      normalizeBanner({
        ...slide,
        name: (slide as Banner).name ?? slide.headline ?? slide.id,
      }),
    );
    await writeBanners(migrated);
  } catch {
    // no homepage data to migrate
  }
}

async function getAllBannersInternal(): Promise<Banner[]> {
  await migrateFromHomepageIfNeeded();
  const banners = await readBannersRaw();
  return [...banners].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getActiveBanners(): Promise<Banner[]> {
  const banners = await getAllBannersInternal();
  return banners.filter((banner) => banner.active);
}

export async function getAllBanners(): Promise<Banner[]> {
  return getAllBannersInternal();
}

export async function getBannerById(id: string): Promise<Banner | undefined> {
  const banners = await getAllBannersInternal();
  return banners.find((banner) => banner.id === id);
}

export async function createBanner(
  input: Omit<Banner, 'id'> & { id?: string },
): Promise<Banner> {
  const banners = await getAllBannersInternal();
  const banner = normalizeBanner({
    ...input,
    id: input.id ?? `banner-${randomUUID().slice(0, 8)}`,
  });

  if (banners.some((item) => item.id === banner.id)) {
    throw new Error('BANNER_EXISTS');
  }

  banners.push(banner);
  await writeBanners(banners);
  return banner;
}

export async function updateBanner(
  id: string,
  patch: Partial<Banner>,
): Promise<Banner | undefined> {
  const banners = await getAllBannersInternal();
  const index = banners.findIndex((banner) => banner.id === id);
  if (index === -1) return undefined;

  banners[index] = normalizeBanner({ ...banners[index], ...patch, id });
  await writeBanners(banners);
  return banners[index];
}

export async function deleteBanner(id: string): Promise<Banner | undefined> {
  const banners = await getAllBannersInternal();
  const index = banners.findIndex((banner) => banner.id === id);
  if (index === -1) return undefined;

  const [removed] = banners.splice(index, 1);
  await writeBanners(banners);
  return removed;
}

export async function swapBannerOrder(id: string, direction: 'up' | 'down'): Promise<boolean> {
  const banners = await getAllBannersInternal();
  const index = banners.findIndex((banner) => banner.id === id);
  if (index === -1) return false;

  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= banners.length) return false;

  const currentOrder = banners[index].sortOrder;
  banners[index].sortOrder = banners[swapIndex].sortOrder;
  banners[swapIndex].sortOrder = currentOrder;

  await writeBanners(banners.sort((a, b) => a.sortOrder - b.sortOrder));
  return true;
}

export function bannerToHeroSlide(banner: Banner): HeroSlide {
  const { name: _name, ...slide } = banner;
  return slide;
}
