import { randomBytes, scryptSync } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const USERS_PATH = path.resolve(process.env.SYA_USERS_FILE || 'data/users.json');
const dryRun = process.argv.includes('--dry-run');
const email = process.env.ADMIN_EMAIL?.trim();
const password = process.env.ADMIN_PASSWORD;

function fail(message) {
  console.error(`Admin credential sync failed: ${message}`);
  process.exitCode = 1;
}

function validateUsers(users) {
  if (!Array.isArray(users)) throw new Error('users.json must contain a JSON array.');
  for (const user of users) {
    if (!user || typeof user !== 'object' || Array.isArray(user) ||
        typeof user.id !== 'string' || !user.id || typeof user.email !== 'string' ||
        typeof user.passwordHash !== 'string' || !user.passwordHash.includes(':') ||
        typeof user.role !== 'string') {
      throw new Error('users.json contains an incomplete user record.');
    }
  }
  const emails = new Set();
  for (const user of users) {
    const key = user.email.toLowerCase();
    if (emails.has(key)) throw new Error('users.json already contains duplicate email addresses.');
    emails.add(key);
  }
}

async function main() {
  if (!email || !password) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('ADMIN_EMAIL is not a valid email address.');
  if (password.length < 16) throw new Error('ADMIN_PASSWORD must contain at least 16 characters.');

  const info = await lstat(USERS_PATH);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('users.json must be a regular, non-symlink file.');
  const original = await readFile(USERS_PATH);
  let users;
  try {
    users = JSON.parse(original.toString('utf8'));
  } catch {
    throw new Error('users.json is malformed JSON.');
  }
  validateUsers(users);

  const admins = users.filter((user) => user.role === 'admin');
  if (admins.length !== 1) throw new Error(`expected exactly one administrator; found ${admins.length}.`);
  const admin = admins[0];
  const targetEmail = email.toLowerCase();
  if (users.some((user) => user.id !== admin.id && user.email.toLowerCase() === targetEmail)) {
    throw new Error('ADMIN_EMAIL is already used by another account.');
  }

  if (dryRun) {
    console.log('Dry run successful: one existing administrator can be updated; no files changed.');
    return;
  }

  const salt = randomBytes(16).toString('hex');
  const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
  const updatedUsers = users.map((user) => user.id === admin.id
    ? { ...user, email, passwordHash }
    : user);
  const output = `${JSON.stringify(updatedUsers, null, 2)}\n`;
  const stamp = new Date().toISOString().replaceAll(':', '-');
  const backupPath = `${USERS_PATH}.backup-${stamp}`;
  const tempPath = `${USERS_PATH}.tmp-${process.pid}-${randomBytes(6).toString('hex')}`;

  // Refuse to overwrite a backup name, and verify the source did not change since it was read.
  await writeFile(backupPath, original, { flag: 'wx', mode: 0o600 });
  try {
    const latest = await readFile(USERS_PATH);
    if (!latest.equals(original)) throw new Error('users.json changed during sync; no update was applied.');
    await writeFile(tempPath, output, { flag: 'wx', mode: info.mode & 0o777 });
    const handle = await open(tempPath, constants.O_RDONLY);
    try { await handle.sync(); } finally { await handle.close(); }
    await rename(tempPath, USERS_PATH);
  } catch (error) {
    await unlink(tempPath).catch(() => {});
    throw error;
  }
  console.log(`Administrator credentials updated. Backup: ${path.basename(backupPath)}`);
}

main().catch((error) => fail(error.message));
