import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { synchronizeCatalogOnce } from '../lib/catalog-sync.ts';

const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'sya-catalog-sync-'));
const dataDir = path.join(tempRoot, 'data');
const oldProducts = [{ id: 'legacy-product' }];
const oldCategories = [{ slug: 'legacy-category' }];
const untouched = {
  'users.json': '[{"id":"keep-user"}]',
  'orders.json': '[{"id":"keep-order"}]',
  'homepage.json': '{"title":"keep-setting"}',
};

try {
  await import('node:fs/promises').then(({ mkdir }) => mkdir(dataDir, { recursive: true }));
  await writeFile(path.join(dataDir, 'products.json'), JSON.stringify(oldProducts));
  await writeFile(path.join(dataDir, 'categories.json'), JSON.stringify(oldCategories));
  for (const [name, contents] of Object.entries(untouched)) {
    await writeFile(path.join(dataDir, name), contents);
  }

  const results = await Promise.all([
    synchronizeCatalogOnce({ dataDir }),
    synchronizeCatalogOnce({ dataDir }),
  ]);
  assert.equal(results.filter((result) => result.synchronized).length, 1);

  const products = JSON.parse(await readFile(path.join(dataDir, 'products.json'), 'utf8'));
  const categories = JSON.parse(await readFile(path.join(dataDir, 'categories.json'), 'utf8'));
  assert.equal(products.length, 130);
  assert.equal(categories.length, 11);

  const synchronized = results.find((result) => result.synchronized);
  const backupProducts = JSON.parse(await readFile(path.join(synchronized.backupPath, 'products.json'), 'utf8'));
  const backupCategories = JSON.parse(await readFile(path.join(synchronized.backupPath, 'categories.json'), 'utf8'));
  assert.deepEqual(backupProducts, oldProducts);
  assert.deepEqual(backupCategories, oldCategories);

  for (const [name, contents] of Object.entries(untouched)) {
    assert.equal(await readFile(path.join(dataDir, name), 'utf8'), contents);
  }

  await writeFile(path.join(dataDir, 'products.json'), '[{"id":"post-sync-edit"}]');
  const rerun = await synchronizeCatalogOnce({ dataDir });
  assert.equal(rerun.synchronized, false);
  assert.deepEqual(JSON.parse(await readFile(path.join(dataDir, 'products.json'), 'utf8')), [
    { id: 'post-sync-edit' },
  ]);

  const backupRoots = await readdir(path.join(dataDir, '.catalog-backups'));
  assert.equal(backupRoots.length, 1);
  console.log('Catalog sync test passed: backup, 130/11 sync, concurrency, repeat guard, and untouched files.');
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
