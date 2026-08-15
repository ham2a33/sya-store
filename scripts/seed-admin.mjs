import { randomBytes, scryptSync } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

const ROOT = process.cwd();
const USERS_PATH = path.join(ROOT, 'data/users.json');

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@sya.store';
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.error('Set ADMIN_PASSWORD before running seed-admin.');
    process.exit(1);
  }

  await fs.mkdir(path.dirname(USERS_PATH), { recursive: true });

  let users = [];
  try {
    users = JSON.parse(await fs.readFile(USERS_PATH, 'utf8'));
    if (!Array.isArray(users)) users = [];
  } catch {
    users = [];
  }

  const existingIndex = users.findIndex(
    (user) => user.email?.toLowerCase() === email.toLowerCase(),
  );

  const adminUser = {
    id: 'admin-1',
    email,
    passwordHash: hashPassword(password),
    role: 'admin',
  };

  if (existingIndex >= 0) {
    users[existingIndex] = { ...users[existingIndex], ...adminUser };
    console.log(`Updated admin user: ${email}`);
  } else {
    users.push(adminUser);
    console.log(`Created admin user: ${email}`);
  }

  await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2));
  console.log('Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
