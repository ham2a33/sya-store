import { createHash, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import seedProducts from '../data/products.json' with { type: 'json' };
import seedCategories from '../data/categories.json' with { type: 'json' };

const SYNC_VERSION = 1;
const PRODUCTS_FILE = 'products.json';
const CATEGORIES_FILE = 'categories.json';
const DONE_FILE = `.catalog-sync-v${SYNC_VERSION}.done.json`;
const LOCK_DIR = `.catalog-sync-v${SYNC_VERSION}.lock`;
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

async function completed(dataDir: string): Promise<boolean> {
  const markerPath = path.join(dataDir, DONE_FILE);
  if (!(await exists(markerPath))) return false;

  const marker: unknown = JSON.parse(await fs.readFile(markerPath, 'utf8'));
  if (!marker || typeof marker !== 'object' || (marker as { version?: unknown }).version !== SYNC_VERSION) {
    throw new Error('Catalog sync marker is invalid; refusing to replace catalog files.');
  }
  return true;
}

async function acquireLock(dataDir: string): Promise<() => Promise<void>> {
  const lockPath = path.join(dataDir, LOCK_DIR);
  const startedAt = Date.now();
  while (true) {
    try {
      await fs.mkdir(lockPath, { mode: 0o700 });
      await fs.writeFile(path.join(lockPath, 'owner.json'), JSON.stringify({ pid: process.pid, startedAt }), {
        encoding: 'utf8',
        mode: 0o600,
        flag: 'wx',
      });
      return () => fs.rm(lockPath, { recursive: true, force: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      if (await completed(dataDir)) return async () => undefined;
      if (Date.now() - startedAt >= LOCK_WAIT_MS) {
        throw new Error('Catalog sync is locked by another or interrupted startup; refusing to continue.');
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

async function backupExistingFiles(dataDir: string, backupPath: string): Promise<void> {
  await fs.mkdir(backupPath, { recursive: true, mode: 0o700 });
  for (const fileName of [PRODUCTS_FILE, CATEGORIES_FILE]) {
    const sourcePath = path.join(dataDir, fileName);
    if (!(await exists(sourcePath))) continue;
    const backupFile = path.join(backupPath, fileName);
    await fs.copyFile(sourcePath, backupFile, fs.constants.COPYFILE_EXCL);
    await fs.chmod(backupFile, 0o600);
  }
}

export async function synchronizeCatalogOnce(options: CatalogSyncOptions = {}): Promise<SyncResult> {
  const products = options.products ?? seedProducts;
  const categories = options.categories ?? seedCategories;
  validateCatalog(products, categories);

  const dataDir = options.dataDir ?? path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  if (await completed(dataDir)) return { synchronized: false };

  const releaseLock = await acquireLock(dataDir);
  try {
    if (await completed(dataDir)) return { synchronized: false };

    const backupId = `catalog-sync-v${SYNC_VERSION}-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`;
    const backupPath = path.join(dataDir, BACKUP_DIR, backupId);
    await backupExistingFiles(dataDir, backupPath);

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
