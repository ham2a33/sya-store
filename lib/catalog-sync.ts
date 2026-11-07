import { createHash, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import seedProducts from '../data/products.json' with { type: 'json' };
import seedCategories from '../data/categories.json' with { type: 'json' };
import type { StoredProduct } from './types';

const SYNC_VERSION = 1;
const ENRICHMENT_VERSION = 2;
const PRODUCTS_FILE = 'products.json';
const CATEGORIES_FILE = 'categories.json';
const DONE_FILE = `.catalog-sync-v${SYNC_VERSION}.done.json`;
const LOCK_DIR = `.catalog-sync-v${SYNC_VERSION}.lock`;
const ENRICHMENT_DONE_FILE = `.catalog-enrichment-v${ENRICHMENT_VERSION}.done.json`;
const ENRICHMENT_LOCK_DIR = `.catalog-enrichment-v${ENRICHMENT_VERSION}.lock`;
const BACKUP_DIR = '.catalog-backups';
const LOCK_WAIT_MS = 30_000;

type CatalogSyncOptions = {
  dataDir?: string;
  products?: unknown;
  categories?: unknown;
};

type SyncResult = { synchronized: true; backupPath: string } | { synchronized: false };

function validateCatalog(products: unknown, categories: unknown): asserts products is unknown[] {
  if (!Array.isArray(products) || products.length !== 130) {
    throw new Error('Catalog sync refused: expected exactly 130 bundled products.');
  }
  if (!Array.isArray(categories) || categories.length !== 11) {
    throw new Error('Catalog sync refused: expected exactly 11 bundled categories.');
  }

  const productIds = products.map((item) => (item as { id?: unknown })?.id);
  const categorySlugs = categories.map((item) => (item as { slug?: unknown })?.slug);
  if (productIds.some((id) => typeof id !== 'string' || !id.trim()) || new Set(productIds).size !== 130) {
    throw new Error('Catalog sync refused: bundled product IDs are missing or duplicated.');
  }
  if (categorySlugs.some((slug) => typeof slug !== 'string' || !slug.trim()) || new Set(categorySlugs).size !== 11) {
    throw new Error('Catalog sync refused: bundled category slugs are missing or duplicated.');
  }
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

async function atomicWrite(filePath: string, contents: string): Promise<void> {
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await fs.open(tempPath, 'wx', 0o600);
  try {
    await handle.writeFile(contents, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.rename(tempPath, filePath);
}

async function completed(
  dataDir: string,
  markerName = DONE_FILE,
  version = SYNC_VERSION,
): Promise<boolean> {
  const markerPath = path.join(dataDir, markerName);
  if (!(await exists(markerPath))) return false;

  const marker: unknown = JSON.parse(await fs.readFile(markerPath, 'utf8'));
  if (!marker || typeof marker !== 'object' || (marker as { version?: unknown }).version !== version) {
    throw new Error('Catalog sync marker is invalid; refusing to replace catalog files.');
  }
  return true;
}

async function acquireLock(
  dataDir: string,
  lockName = LOCK_DIR,
  markerName = DONE_FILE,
  version = SYNC_VERSION,
): Promise<() => Promise<void>> {
  const lockPath = path.join(dataDir, lockName);
  const startedAt = Date.now();
  while (true) {
    let created = false;
    try {
      await fs.mkdir(lockPath, { mode: 0o700 });
      created = true;
      await fs.writeFile(path.join(lockPath, 'owner.json'), JSON.stringify({ pid: process.pid, startedAt }), {
        encoding: 'utf8',
        mode: 0o600,
        flag: 'wx',
      });
      return () => fs.rm(lockPath, { recursive: true, force: true });
    } catch (error) {
      if (created) await fs.rm(lockPath, { recursive: true, force: true });
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      if (await completed(dataDir, markerName, version)) return async () => undefined;
      if (Date.now() - startedAt >= LOCK_WAIT_MS) {
        throw new Error('Catalog sync is locked by another or interrupted startup; refusing to continue.');
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

async function backupFiles(dataDir: string, backupPath: string, fileNames: string[]): Promise<void> {
  await fs.mkdir(backupPath, { recursive: true, mode: 0o700 });
  for (const fileName of fileNames) {
    const sourcePath = path.join(dataDir, fileName);
    if (!(await exists(sourcePath))) continue;
    const backupFile = path.join(backupPath, fileName);
    await fs.copyFile(sourcePath, backupFile, fs.constants.COPYFILE_EXCL);
    await fs.chmod(backupFile, 0o600);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function synchronizeInitialCatalog(
  dataDir: string,
  products: unknown[],
  categories: unknown,
): Promise<SyncResult> {
  if (await completed(dataDir)) return { synchronized: false };

  const releaseLock = await acquireLock(dataDir);
  try {
    if (await completed(dataDir)) return { synchronized: false };

    const backupId = `catalog-sync-v${SYNC_VERSION}-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`;
    const backupPath = path.join(dataDir, BACKUP_DIR, backupId);
    await backupFiles(dataDir, backupPath, [PRODUCTS_FILE, CATEGORIES_FILE]);

    await atomicWrite(path.join(dataDir, PRODUCTS_FILE), `${JSON.stringify(products, null, 2)}\n`);
    await atomicWrite(path.join(dataDir, CATEGORIES_FILE), `${JSON.stringify(categories, null, 2)}\n`);

    const sourceHash = createHash('sha256')
      .update(JSON.stringify({ products, categories }))
      .digest('hex');
    await atomicWrite(
      path.join(dataDir, DONE_FILE),
      `${JSON.stringify({ version: SYNC_VERSION, completedAt: new Date().toISOString(), sourceHash, backupId }, null, 2)}\n`,
    );

    return { synchronized: true, backupPath };
  } finally {
    await releaseLock();
  }
}

async function synchronizeCatalogEnrichment(dataDir: string): Promise<SyncResult> {
  if (await completed(dataDir, ENRICHMENT_DONE_FILE, ENRICHMENT_VERSION)) {
    return { synchronized: false };
  }

  const releaseLock = await acquireLock(
    dataDir,
    ENRICHMENT_LOCK_DIR,
    ENRICHMENT_DONE_FILE,
    ENRICHMENT_VERSION,
  );
  try {
    if (await completed(dataDir, ENRICHMENT_DONE_FILE, ENRICHMENT_VERSION)) {
      return { synchronized: false };
    }

    const productsPath = path.join(dataDir, PRODUCTS_FILE);
    const liveProducts: unknown = JSON.parse(await fs.readFile(productsPath, 'utf8'));
    if (!Array.isArray(liveProducts)) {
      throw new Error('Catalog enrichment refused: stored products file is not an array.');
    }

    const sourceProducts = seedProducts as StoredProduct[];
    const liveById = new Map<string, Record<string, unknown>>();
    for (const item of liveProducts) {
      if (isRecord(item) && typeof item.id === 'string') liveById.set(item.id, item);
    }
    const missingIds = sourceProducts.filter((product) => !liveById.has(product.id)).map((product) => product.id);
    if (missingIds.length) {
      throw new Error(`Catalog enrichment refused: ${missingIds.length} source products are missing from storage.`);
    }

    let changed = false;
    for (const source of sourceProducts) {
      const target = liveById.get(source.id)!;
      const specs = isRecord(target.specifications) ? { ...target.specifications } : {};

      if (typeof specs['Материал'] === 'string') {
        if (typeof target.material !== 'string' || !target.material.trim()) {
          target.material = specs['Материал'];
          changed = true;
        }
        if (target.material === specs['Материал']) {
          delete specs['Материал'];
          changed = true;
        }
      }
      if (typeof specs['Размер'] === 'string') {
        if (typeof target.size !== 'string' || !target.size.trim()) {
          target.size = specs['Размер'];
          changed = true;
        }
        if (target.size === specs['Размер']) {
          delete specs['Размер'];
          changed = true;
        }
      }

      if ((typeof target.material !== 'string' || !target.material.trim()) && source.material) {
        target.material = source.material;
        changed = true;
      }
      if ((typeof target.size !== 'string' || !target.size.trim()) && source.size) {
        target.size = source.size;
        changed = true;
      }

      for (const [label, value] of Object.entries(source.specifications ?? {})) {
        if (typeof value === 'string' && value.trim() && (typeof specs[label] !== 'string' || !specs[label].trim())) {
          specs[label] = value;
          changed = true;
        }
      }

      const currentDescription = typeof target.description === 'string' ? target.description.trim() : '';
      const isOldPlaceholder =
        currentDescription === '' ||
        currentDescription === 'Характеристики указаны в карточке товара.' ||
        currentDescription.startsWith('Украшение APM. Бережный уход:') ||
        /PHOTO-|<Сообщение изменено>/i.test(currentDescription);
      const sourceDescription = source.description?.trim() ?? '';
      if (isOldPlaceholder && currentDescription !== sourceDescription) {
        target.description = sourceDescription;
        changed = true;
      }

      target.specifications = specs;
    }

    const sourceHash = createHash('sha256').update(JSON.stringify(sourceProducts)).digest('hex');
    let backupId: string | null = null;
    let backupPath: string | undefined;
    if (changed) {
      backupId = `catalog-enrichment-v${ENRICHMENT_VERSION}-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`;
      backupPath = path.join(dataDir, BACKUP_DIR, backupId);
      await backupFiles(dataDir, backupPath, [PRODUCTS_FILE]);
      await atomicWrite(productsPath, `${JSON.stringify(liveProducts, null, 2)}\n`);
    }

    await atomicWrite(
      path.join(dataDir, ENRICHMENT_DONE_FILE),
      `${JSON.stringify({ version: ENRICHMENT_VERSION, completedAt: new Date().toISOString(), sourceHash, backupId }, null, 2)}\n`,
    );
    return changed && backupPath
      ? { synchronized: true, backupPath }
      : { synchronized: false };
  } finally {
    await releaseLock();
  }
}

export async function synchronizeCatalogOnce(options: CatalogSyncOptions = {}): Promise<SyncResult> {
  const products = options.products ?? seedProducts;
  const categories = options.categories ?? seedCategories;
  validateCatalog(products, categories);

  const dataDir = options.dataDir ?? path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  const initialResult = await synchronizeInitialCatalog(dataDir, products, categories);
  const enrichmentResult = await synchronizeCatalogEnrichment(dataDir);
  if (initialResult.synchronized) return initialResult;
  return enrichmentResult;
}
