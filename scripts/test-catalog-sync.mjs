import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { synchronizeCatalogOnce } from '../lib/catalog-sync.ts';
import seedProducts from '../data/products.json' with { type: 'json' };

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
  await mkdir(dataDir, { recursive: true });
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

  const enrichedDataDir = path.join(tempRoot, 'already-synced-data');
  await mkdir(enrichedDataDir, { recursive: true });
  const legacyProducts = seedProducts.map((product) => {
    const specifications = { ...product.specifications };
    delete specifications['Проба'];
    delete specifications['Качество'];
    if (product.material) specifications['Материал'] = product.material;
    if (product.size) specifications['Размер'] = product.size;
    return {
      ...product,
      description: product.description ? 'Украшение APM. Бережный уход: избегать контакта с водой.' : 'Характеристики указаны в карточке товара.',
      material: undefined,
      size: undefined,
      specifications,
    };
  });
  const categoriesBeforeEnrichment = '[{"slug":"preserve-category-file"}]';
  await writeFile(path.join(enrichedDataDir, 'products.json'), JSON.stringify(legacyProducts));
  await writeFile(path.join(enrichedDataDir, 'categories.json'), categoriesBeforeEnrichment);
  await writeFile(path.join(enrichedDataDir, '.catalog-sync-v1.done.json'), JSON.stringify({ version: 1 }));

  const enrichmentResult = await synchronizeCatalogOnce({ dataDir: enrichedDataDir });
  assert.equal(enrichmentResult.synchronized, true);
  const enrichedProducts = JSON.parse(await readFile(path.join(enrichedDataDir, 'products.json'), 'utf8'));
  assert.equal(enrichedProducts.length, 130);
  assert.equal(enrichedProducts[0].material, seedProducts[0].material);
  assert.equal(enrichedProducts[0].specifications['Проба'], seedProducts[0].specifications['Проба']);
  assert.equal(enrichedProducts[0].specifications['Качество'], seedProducts[0].specifications['Качество']);
  assert.equal(enrichedProducts[0].description, seedProducts[0].description);
  assert.equal(
    await readFile(path.join(enrichedDataDir, 'categories.json'), 'utf8'),
    categoriesBeforeEnrichment,
  );
  const enrichmentBackup = JSON.parse(
    await readFile(path.join(enrichmentResult.backupPath, 'products.json'), 'utf8'),
  );
  assert.equal(enrichmentBackup.length, 130);
  assert.equal(enrichmentBackup[0].specifications['Проба'], undefined);

  console.log('Catalog sync test passed: backup, 130/11 sync, targeted enrichment, concurrency, repeat guard, and untouched files.');
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
