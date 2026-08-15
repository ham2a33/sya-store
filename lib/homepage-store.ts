import { promises as fs } from 'fs';
import path from 'path';
import { getActiveBanners } from './banners-store';
import type { HomepageConfig } from './types';

const DATA_PATH = path.join(process.cwd(), 'data/homepage.json');

const DEFAULT_HOMEPAGE: Omit<HomepageConfig, 'heroSlides'> = {
  newCollectionTitle: 'НОВАЯ КОЛЛЕКЦИЯ',
  bestsellersTitle: 'БЕСТСЕЛЛЕРЫ',
  aboutImage: '',
};

async function readHomepageBase(): Promise<Omit<HomepageConfig, 'heroSlides'>> {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    const parsed = JSON.parse(raw) as HomepageConfig;
    return {
      newCollectionTitle: parsed.newCollectionTitle ?? DEFAULT_HOMEPAGE.newCollectionTitle,
      bestsellersTitle: parsed.bestsellersTitle ?? DEFAULT_HOMEPAGE.bestsellersTitle,
      aboutImage: parsed.aboutImage ?? DEFAULT_HOMEPAGE.aboutImage,
    };
  } catch {
    return DEFAULT_HOMEPAGE;
  }
}

async function writeHomepageBase(config: Omit<HomepageConfig, 'heroSlides'>): Promise<void> {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(config, null, 2), 'utf8');
}

export async function getHomepageConfig(): Promise<HomepageConfig> {
  const base = await readHomepageBase();
  const banners = await getActiveBanners();
  return {
    ...base,
    heroSlides: banners,
  };
}

export async function getHomepageConfigAdmin(): Promise<Omit<HomepageConfig, 'heroSlides'>> {
  return readHomepageBase();
}

export async function updateHomepageConfig(
  patch: Partial<Omit<HomepageConfig, 'heroSlides'>>,
): Promise<HomepageConfig> {
  const current = await readHomepageBase();
  const { heroSlides: _ignored, ...safePatch } = patch as Partial<HomepageConfig>;
  const next = { ...current, ...safePatch };
  await writeHomepageBase(next);
  const banners = await getActiveBanners();
  return { ...next, heroSlides: banners };
}
