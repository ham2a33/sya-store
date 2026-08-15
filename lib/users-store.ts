import { promises as fs } from 'fs';
import path from 'path';
import type { UserRecord } from './types';

const DATA_PATH = path.join(process.cwd(), 'data/users.json');

async function readUsers(): Promise<UserRecord[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as UserRecord[];
  } catch {
    return [];
  }
}

async function writeUsers(users: UserRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(users, null, 2), 'utf8');
}

export async function getUserByEmail(email: string): Promise<UserRecord | undefined> {
  const users = await readUsers();
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export async function getUserById(id: string): Promise<UserRecord | undefined> {
  const users = await readUsers();
  return users.find((user) => user.id === id);
}

export async function createUser(
  input: Omit<UserRecord, 'id'> & { id?: string },
): Promise<UserRecord> {
  const users = await readUsers();
  if (users.some((user) => user.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error('USER_EXISTS');
  }

  const user: UserRecord = {
    id: input.id ?? `user-${Date.now()}`,
    email: input.email,
    passwordHash: input.passwordHash,
    role: input.role,
  };

  users.push(user);
  await writeUsers(users);
  return user;
}

export async function getAllUsers(): Promise<UserRecord[]> {
  return readUsers();
}
