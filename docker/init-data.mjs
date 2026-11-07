import { constants } from 'node:fs';
import { lstat, mkdir, readFile, readdir, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const DATA_DIR = '/app/data';
const SEED_DIR = '/app/seed-data';
const UPLOAD_DIR = '/app/public/uploads';
const UPLOAD_SEED_DIR = '/app/seed-uploads';

const stores = [
  { name: 'products.json', type: 'array', required: ['id', 'name', 'price', 'stock'] },
  { name: 'categories.json', type: 'array', required: ['slug', 'title'] },
  { name: 'banners.json', type: 'array', required: ['id'] },
  { name: 'homepage.json', type: 'object' },
  { name: 'media.json', type: 'array', required: ['id', 'url', 'filename'] },
  { name: 'orders.json', type: 'array', required: [], customerRecords: true },
  { name: 'users.json', type: 'array', required: [], customerRecords: true },
];

function fail(message) {
  console.error(`Data initialization stopped: ${message}`);
  process.exit(1);
}

function validateStore(name, value, definition) {
  const storeName = name.replace(/^seed /, '');
  const validType = definition.type === 'array'
    ? Array.isArray(value)
    : value !== null && typeof value === 'object' && !Array.isArray(value);
  if (!validType) fail(`${name} has an invalid top-level JSON type.`);

  if (definition.type !== 'array') {
    if (storeName === 'homepage.json' && (
      typeof value.newCollectionTitle !== 'string' ||
      typeof value.bestsellersTitle !== 'string' ||
      typeof value.aboutImage !== 'string' || !Array.isArray(value.heroSlides)
    )) fail('homepage.json is missing expected site settings.');
    return;
  }
  const seen = new Set();
  const seenEmails = new Set();
  for (const row of value) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      fail(`${name} contains a non-object record.`);
    }
    for (const field of definition.required) {
      if (!(field in row) || (row[field] === null && !(storeName === 'products.json' && field === 'stock')) || row[field] === '') {
        fail(`${name} contains a record missing required field ${field}.`);
      }
    }
    if (storeName === 'products.json' && (
      typeof row.id !== 'string' || typeof row.name !== 'string' ||
      typeof row.price !== 'number' || !Number.isFinite(row.price) || row.price < 0 ||
      (row.stock !== null && (!Number.isInteger(row.stock) || row.stock < 0)) || typeof row.category !== 'string'
    )) fail('products.json contains an invalid product record.');
    if (storeName === 'categories.json' && (
      typeof row.slug !== 'string' || typeof row.title !== 'string'
    )) fail('categories.json contains an invalid category record.');
    if (storeName === 'banners.json' && typeof row.id !== 'string') {
      fail('banners.json contains an invalid banner record.');
    }
    if (storeName === 'media.json' && (
      typeof row.id !== 'string' || typeof row.url !== 'string' ||
      typeof row.filename !== 'string'
    )) fail('media.json contains an invalid media record.');
    const idField = definition.name === 'categories.json' ? 'slug' : 'id';
    if (definition.name !== 'orders.json' || row.id !== undefined) {
      const id = row[idField];
      if (typeof id !== 'string' || !id) fail(`${name} contains a record with an invalid ${idField}.`);
      if (seen.has(id)) fail(`${name} contains duplicate ${idField} values.`);
      seen.add(id);
    }
    if (storeName === 'users.json' && (
      typeof row.id !== 'string' || typeof row.email !== 'string' ||
      typeof row.passwordHash !== 'string' || !row.passwordHash.includes(':') ||
      typeof row.role !== 'string'
    )) fail('users.json contains an incomplete user record.');
    if (storeName === 'users.json') {
      const normalizedEmail = row.email.toLowerCase();
      if (seenEmails.has(normalizedEmail)) fail('users.json contains duplicate email addresses.');
      seenEmails.add(normalizedEmail);
    }
    if (storeName === 'orders.json' && (
      typeof row.id !== 'string' ||
      !['number', 'string'].includes(typeof row.orderNumber) ||
      !row.customer || typeof row.customer !== 'object' ||
      typeof row.customer.name !== 'string' || typeof row.customer.phone !== 'string' ||
      !Array.isArray(row.items) ||
      row.items.some((item) => !item || typeof item !== 'object' ||
        typeof item.productId !== 'string' || !Number.isInteger(item.quantity) ||
        item.quantity < 1 || typeof item.price !== 'number' || typeof item.total !== 'number') ||
      typeof row.subtotal !== 'number' || typeof row.total !== 'number'
    )) fail('orders.json contains an incomplete order record.');
  }
}

async function readJson(file, name, definition) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(file, 'utf8'));
  } catch {
    fail(`${name} is malformed or unreadable.`);
  }
  validateStore(name, parsed, definition);
  return parsed;
}

async function copyIfMissing(source, destination) {
  try {
    await copyFile(source, destination, constants.COPYFILE_EXCL);
  } catch (error) {
    if (error.code === 'EEXIST') return;
    throw error;
  }
}

async function validateUploadTree(directory, relative = '') {
  const directoryInfo = await lstat(directory);
  if (!directoryInfo.isDirectory()) fail('upload storage contains a non-directory path.');
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const childRelative = path.join(relative, entry.name);
    if (entry.isSymbolicLink()) fail('bundled upload seed contains a symbolic link.');
    if (entry.isDirectory()) await validateUploadTree(path.join(directory, entry.name), childRelative);
    else if (!entry.isFile()) fail('bundled upload seed contains an unsupported file type.');
  }
}

async function copyMissingUploads(sourceDirectory, destinationDirectory) {
  await mkdir(destinationDirectory, { recursive: true });
  const entries = await readdir(sourceDirectory, { withFileTypes: true });
  for (const entry of entries) {
    const source = path.join(sourceDirectory, entry.name);
    const destination = path.join(destinationDirectory, entry.name);
    if (entry.isDirectory()) {
      await copyMissingUploads(source, destination);
    } else if (entry.isFile()) {
      await copyIfMissing(source, destination);
    }
  }
}

await mkdir(DATA_DIR, { recursive: true });
await mkdir(UPLOAD_DIR, { recursive: true });

// Validate every existing store and every seed before writing any missing file.
const existing = new Map();
for (const definition of stores) {
  const target = path.join(DATA_DIR, definition.name);
  try {
    const info = await lstat(target);
    if (!info.isFile()) fail(`${definition.name} exists but is not a regular file.`);
    existing.set(definition.name, await readJson(target, definition.name, definition));
  } catch (error) {
    if (error.code === 'ENOENT') continue;
    throw error;
  }
}

const seedDefinitions = stores.filter((item) => !item.customerRecords);
for (const definition of seedDefinitions) {
  const seedFile = path.join(SEED_DIR, definition.name);
  await readJson(seedFile, `seed ${definition.name}`, definition);
}

const usersDefinition = stores.find((item) => item.name === 'users.json');
const currentUsers = existing.get('users.json');
const needsAdmin = currentUsers === undefined || currentUsers.length === 0;
if (needsAdmin && (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)) {
  fail('ADMIN_EMAIL and ADMIN_PASSWORD are required only when users.json has no users.');
}
if (needsAdmin && process.env.ADMIN_PASSWORD.length < 16) {
  fail('ADMIN_PASSWORD must contain at least 16 characters for initial setup.');
}

await validateUploadTree(UPLOAD_SEED_DIR);
await validateUploadTree(UPLOAD_DIR);

const hasExistingStoreFiles = existing.size > 0;
const missingCatalogStores = seedDefinitions.filter((item) => !existing.has(item.name));
if (hasExistingStoreFiles && missingCatalogStores.length > 0) {
  fail(`non-empty data volume is missing ${missingCatalogStores.map((item) => item.name).join(', ')}; restore the original store files before startup.`);
}

for (const definition of stores) {
  if (existing.has(definition.name)) continue;
  const target = path.join(DATA_DIR, definition.name);
  if (definition.customerRecords) {
    await writeFile(target, '[]\n', { flag: 'wx', mode: 0o600 });
  } else if (!hasExistingStoreFiles) {
    await copyIfMissing(path.join(SEED_DIR, definition.name), target);
  }
}
await copyMissingUploads(UPLOAD_SEED_DIR, UPLOAD_DIR);

const users = await readJson(path.join(DATA_DIR, 'users.json'), 'users.json', usersDefinition);
if (users.length === 0) {
  const result = spawnSync(process.execPath, ['/app/scripts/seed-admin.mjs'], {
    cwd: '/app',
    env: process.env,
    stdio: 'ignore',
  });
  if (result.error || result.status !== 0) fail('initial administrator creation failed.');
  await readJson(path.join(DATA_DIR, 'users.json'), 'users.json', usersDefinition);
}
