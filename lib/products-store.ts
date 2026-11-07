import { promises as fs } from 'fs';
import path from 'path';
import type { Product, CategorySlug } from './products';
import type { StoredProduct, ProductStatus } from './types';

const DATA_PATH = path.join(process.cwd(), 'data/products.json');

function normalizeProduct(product: StoredProduct): Product {
  return {
    ...product,
    inStock: (product.stock ?? 0) > 0 && product.status === 'active',
  };
}

export async function readRawProducts(): Promise<StoredProduct[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as StoredProduct[];
  } catch {
    return [];
  }
}

export async function writeRawProducts(products: StoredProduct[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(products, null, 2), 'utf8');
}

export async function getAllProducts(includeArchived = false): Promise<Product[]> {
  const products = await readRawProducts();
  return products
    .filter((product) => includeArchived || product.status === 'active')
    .map(normalizeProduct);
}

export async function getAllProductsAdmin(): Promise<Product[]> {
  return readRawProducts().then((products) => products.map(normalizeProduct));
}

export async function getStoredProduct(id: string): Promise<StoredProduct | undefined> {
  const products = await readRawProducts();
  return products.find((product) => product.id === id);
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const product = await getStoredProduct(id);
  if (!product || product.status !== 'active') return undefined;
  return normalizeProduct(product);
}

export async function getProductsByCategory(slug: CategorySlug): Promise<Product[]> {
  const products = await getAllProducts();
  return products.filter((product) => product.category === slug);
}

export async function countProductsByCategory(slug: string): Promise<number> {
  const products = await readRawProducts();
  return products.filter((product) => product.category === slug).length;
}

export async function transferProductsCategory(
  fromSlug: string,
  toSlug: string,
): Promise<number> {
  const products = await readRawProducts();
  let count = 0;

  for (const product of products) {
    if (product.category === fromSlug) {
      product.category = toSlug;
      count += 1;
    }
  }

  if (count > 0) {
    await writeRawProducts(products);
  }

  return count;
}

export async function updateProductsCategorySlug(
  oldSlug: string,
  newSlug: string,
): Promise<number> {
  const products = await readRawProducts();
  let count = 0;

  for (const product of products) {
    if (product.category === oldSlug) {
      product.category = newSlug;
      count += 1;
    }
  }

  if (count > 0) {
    await writeRawProducts(products);
  }

  return count;
}

export async function getSimilarProducts(
  product: Product,
  limit = 4,
): Promise<Product[]> {
  const products = await getAllProducts();
  return products
    .filter((item) => item.category === product.category && item.id !== product.id)
    .slice(0, limit);
}

export async function createProduct(
  input: Omit<StoredProduct, 'status'> & { status?: ProductStatus },
): Promise<Product> {
  const products = await readRawProducts();
  if (products.some((product) => product.id === input.id)) {
    throw new Error('PRODUCT_EXISTS');
  }

  const next: StoredProduct = {
    ...input,
    images: input.images.length ? input.images : [input.image],
    status: input.status ?? 'active',
  };

  products.push(next);
  await writeRawProducts(products);
  return normalizeProduct(next);
}

export async function updateProduct(
  id: string,
  patch: Partial<StoredProduct>,
): Promise<Product | undefined> {
  const products = await readRawProducts();
  const index = products.findIndex((product) => product.id === id);
  if (index === -1) return undefined;

  const current = products[index];
  const updated: StoredProduct = {
    ...current,
    ...patch,
    id: current.id,
    images:
      patch.images && patch.images.length
        ? patch.images
        : patch.image
          ? [patch.image, ...current.images.filter((img) => img !== patch.image)]
          : current.images,
  };

  products[index] = updated;
  await writeRawProducts(products);
  return normalizeProduct(updated);
}

export async function archiveProduct(id: string): Promise<boolean> {
  const products = await readRawProducts();
  const index = products.findIndex((product) => product.id === id);
  if (index === -1) return false;

  products[index] = {
    ...products[index],
    status: 'archived',
    stock: 0,
    isBestseller: false,
    bestsellerOrder: null,
  };
  await writeRawProducts(products);
  return true;
}

export async function restoreProduct(id: string): Promise<boolean> {
  const products = await readRawProducts();
  const index = products.findIndex((product) => product.id === id);
  if (index === -1) return false;

  products[index] = {
    ...products[index],
    status: 'active',
  };
  await writeRawProducts(products);
  return true;
}

export async function getAllStoredProducts(): Promise<StoredProduct[]> {
  return readRawProducts();
}

export function toStoredProduct(payload: Partial<StoredProduct> & Pick<StoredProduct, 'id' | 'name' | 'price' | 'category' | 'image' | 'description'>): StoredProduct {
  const stock = payload.stock ?? 0;
  return {
    id: payload.id,
    name: payload.name,
    price: payload.price,
    oldPrice: payload.oldPrice,
    category: payload.category,
    image: payload.image,
    images: payload.images?.length ? payload.images : [payload.image],
    description: payload.description,
    material: payload.material,
    color: payload.color,
    size: payload.size,
    stock,
    isNew: payload.isNew ?? false,
    popular: payload.popular ?? false,
    isBestseller: payload.isBestseller ?? false,
    bestsellerOrder: payload.bestsellerOrder ?? null,
    status: payload.status ?? 'active',
  };
}
