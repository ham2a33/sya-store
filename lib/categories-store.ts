import { promises as fs } from 'fs';
import path from 'path';
import {
  countProductsByCategory,
  transferProductsCategory,
  updateProductsCategorySlug,
} from './products-store';
import { normalizeSlug } from './category-utils';
import type { StoredCategory } from './types';

const DATA_PATH = path.join(process.cwd(), 'data/categories.json');

export type CategoryCreateInput = {
  slug: string;
  title: string;
  description?: string;
  image: string;
  sortOrder?: number;
  active?: boolean;
};

function normalizeCategory(raw: Partial<StoredCategory> & Pick<StoredCategory, 'slug'>): StoredCategory {
  return {
    slug: raw.slug,
    title: raw.title ?? raw.slug,
    description: raw.description ?? '',
    image: raw.image ?? '',
    sortOrder: raw.sortOrder ?? 999,
    active: raw.active ?? true,
    status: raw.status === 'archived' ? 'archived' : 'active',
    slugAliases: raw.slugAliases ?? [],
  };
}

async function readCategories(): Promise<StoredCategory[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeCategory(item as StoredCategory));
  } catch {
    return [];
  }
}

async function writeCategories(categories: StoredCategory[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(categories, null, 2), 'utf8');
}

async function getAllCategoriesInternal(): Promise<StoredCategory[]> {
  const categories = await readCategories();
  return [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
}

function findCategoryIndex(categories: StoredCategory[], slug: string): number {
  return categories.findIndex(
    (category) =>
      category.slug === slug || category.slugAliases?.includes(slug),
  );
}

export async function getAllCategories(includeInactive = false): Promise<StoredCategory[]> {
  const categories = await getAllCategoriesInternal();
  return categories.filter(
    (category) =>
      category.status !== 'archived' &&
      (includeInactive || category.active),
  );
}

export async function getCategoryBySlug(slug: string): Promise<StoredCategory | undefined> {
  const categories = await getAllCategoriesInternal();
  return categories.find(
    (category) =>
      category.slug === slug || category.slugAliases?.includes(slug),
  );
}

export async function resolveCategorySlug(
  slug: string,
): Promise<{ category: StoredCategory; isAlias: boolean } | undefined> {
  const categories = await getAllCategoriesInternal();
  const direct = categories.find((category) => category.slug === slug);
  if (direct) {
    return { category: direct, isAlias: false };
  }

  const viaAlias = categories.find((category) => category.slugAliases?.includes(slug));
  if (viaAlias) {
    return { category: viaAlias, isAlias: true };
  }

  return undefined;
}

export async function createCategory(input: CategoryCreateInput): Promise<StoredCategory> {
  const categories = await getAllCategoriesInternal();
  const slug = normalizeSlug(input.slug);

  if (!slug || !input.title.trim()) {
    throw new Error('INVALID_INPUT');
  }

  if (categories.some((category) => category.slug === slug)) {
    throw new Error('CATEGORY_EXISTS');
  }

  if (categories.some((category) => category.slugAliases?.includes(slug))) {
    throw new Error('SLUG_RESERVED');
  }

  const category = normalizeCategory({
    slug,
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    image: input.image.trim(),
    sortOrder: input.sortOrder ?? categories.length + 1,
    active: input.active !== false,
    status: 'active',
    slugAliases: [],
  });

  categories.push(category);
  await writeCategories(categories);
  return category;
}

export async function updateCategory(
  slug: string,
  patch: Partial<StoredCategory> & { direction?: 'up' | 'down' },
): Promise<StoredCategory | undefined> {
  if (patch.direction === 'up' || patch.direction === 'down') {
    const swapped = await swapCategoryOrder(slug, patch.direction);
    if (!swapped) return undefined;
    return getCategoryBySlug(slug);
  }

  const categories = await getAllCategoriesInternal();
  const index = findCategoryIndex(categories, slug);
  if (index === -1) return undefined;

  const current = categories[index];
  let nextSlug = current.slug;

  if (patch.slug != null && patch.slug !== current.slug) {
    const normalized = normalizeSlug(patch.slug);
    if (!normalized) throw new Error('INVALID_SLUG');

    const slugTaken = categories.some(
      (category, categoryIndex) =>
        categoryIndex !== index &&
        (category.slug === normalized || category.slugAliases?.includes(normalized)),
    );
    if (slugTaken) throw new Error('SLUG_EXISTS');

    await updateProductsCategorySlug(current.slug, normalized);
    nextSlug = normalized;

    const aliases = new Set(current.slugAliases ?? []);
    aliases.add(current.slug);
    patch.slug = normalized;
    patch.slugAliases = [...aliases];
  }

  categories[index] = normalizeCategory({
    ...current,
    ...patch,
    slug: nextSlug,
  });

  await writeCategories(categories);
  return categories[index];
}

export async function swapCategoryOrder(
  slug: string,
  direction: 'up' | 'down',
): Promise<boolean> {
  const categories = await getAllCategoriesInternal();
  const visible = categories.filter((category) => category.status !== 'archived');
  const index = visible.findIndex((category) => category.slug === slug);
  if (index === -1) return false;

  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= visible.length) return false;

  const currentOrder = visible[index].sortOrder;
  visible[index].sortOrder = visible[swapIndex].sortOrder;
  visible[swapIndex].sortOrder = currentOrder;

  await writeCategories(
    categories.sort((a, b) => a.sortOrder - b.sortOrder),
  );
  return true;
}

export async function deleteCategory(
  slug: string,
  options?: { transferTo?: string },
): Promise<StoredCategory | undefined> {
  const categories = await getAllCategoriesInternal();
  const index = categories.findIndex((category) => category.slug === slug);
  if (index === -1) return undefined;

  const productCount = await countProductsByCategory(slug);

  if (productCount > 0) {
    const transferTo = options?.transferTo?.trim();
    if (!transferTo) {
      throw new Error(`CATEGORY_NOT_EMPTY:${productCount}`);
    }

    const target = categories.find((category) => category.slug === transferTo);
    if (!target || target.status === 'archived') {
      throw new Error('INVALID_TRANSFER_TARGET');
    }

    await transferProductsCategory(slug, transferTo);
  }

  const [removed] = categories.splice(index, 1);
  await writeCategories(categories);
  return removed;
}

export async function archiveCategory(slug: string): Promise<StoredCategory | undefined> {
  return updateCategory(slug, { status: 'archived', active: false });
}

export async function restoreCategory(slug: string): Promise<StoredCategory | undefined> {
  return updateCategory(slug, { status: 'active', active: true });
}

export async function getAllStoredCategories(): Promise<StoredCategory[]> {
  return getAllCategoriesInternal();
}
