import { randomBytes, timingSafeEqual } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { hashPassword } from '../../../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_PATH = path.join(DATA_DIR, 'users.json');
const USED_PATH = path.join(DATA_DIR, '.admin-recovery-used');
const LOCK_PATH = path.join(DATA_DIR, '.admin-recovery-lock');
const MAX_BODY_BYTES = 16 * 1024;

type User = {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  [key: string]: unknown;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function validUserArray(value: unknown): value is User[] {
  return Array.isArray(value) && value.every((user) =>
    user !== null && typeof user === 'object' && !Array.isArray(user) &&
    typeof user.id === 'string' && user.id.length > 0 &&
    typeof user.email === 'string' &&
    typeof user.passwordHash === 'string' && user.passwordHash.includes(':') &&
    typeof user.role === 'string',
  );
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await lstat(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

export async function POST(request: Request) {
  const expectedToken = process.env.ADMIN_RECOVERY_TOKEN;
  if (!expectedToken || Buffer.byteLength(expectedToken) < 32) {
    return jsonError('Восстановление администратора не настроено.', 503);
  }
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    return jsonError('Ожидался JSON запрос.', 415);
  }
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) return jsonError('Запрос слишком большой.', 413);

  let body: { token?: unknown; email?: unknown; password?: unknown };
  try {
    if (!request.body) return jsonError('Некорректный запрос.', 400);
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return jsonError('Запрос слишком большой.', 413);
      }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
    body = JSON.parse(bytes.toString('utf8'));
  } catch {
    return jsonError('Некорректный запрос.', 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonError('Некорректный запрос.', 400);
  }

  const token = typeof body.token === 'string' ? body.token : '';
  const tokenBytes = Buffer.from(token);
  const expectedBytes = Buffer.from(expectedToken);
  if (tokenBytes.length !== expectedBytes.length || !timingSafeEqual(tokenBytes, expectedBytes)) {
    return jsonError('Неверный recovery token.', 401);
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError('Укажите корректный email.', 400);
  }
  if (password.length < 8) {
    return jsonError('Пароль должен содержать не менее 8 символов.', 400);
  }

  let lockHandle;
  let lockAcquired = false;
  let tempPath: string | undefined;
  let markerCreated = false;
  try {
    try {
      lockHandle = await open(LOCK_PATH, 'wx', 0o600);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        return jsonError('Восстановление уже выполняется или уже использовано.', 409);
      }
      throw error;
    }
    lockAcquired = true;

    if (await exists(USED_PATH)) {
      return jsonError('Recovery token уже использован.', 410);
    }

    const info = await lstat(USERS_PATH);
    if (!info.isFile() || info.isSymbolicLink()) {
      return jsonError('Файл пользователей недоступен для безопасного обновления.', 500);
    }
    const original = await readFile(USERS_PATH);
    let users: unknown;
    try {
      users = JSON.parse(original.toString('utf8'));
    } catch {
      return jsonError('Файл пользователей содержит некорректные данные.', 500);
    }
    if (!validUserArray(users)) {
      return jsonError('Файл пользователей содержит некорректные записи.', 500);
    }

    const admins = users.filter((user) => user.role === 'admin');
    if (admins.length !== 1) {
      return jsonError('Для восстановления должен существовать ровно один администратор.', 409);
    }
    const admin = admins[0];
    const normalizedEmail = email.toLowerCase();
    if (users.some((user) => user.id !== admin.id && user.email.toLowerCase() === normalizedEmail)) {
      return jsonError('Этот email уже используется другой учётной записью.', 409);
    }

    const stamp = new Date().toISOString().replaceAll(':', '-');
    const backupPath = `${USERS_PATH}.backup-${stamp}`;
    await writeFile(backupPath, original, { flag: 'wx', mode: 0o600 });

    const updated = users.map((user) => user.id === admin.id
      ? { ...user, email, passwordHash: hashPassword(password) }
      : user);
    const serialized = `${JSON.stringify(updated, null, 2)}\n`;
    tempPath = path.join(DATA_DIR, `.users-recovery-${process.pid}-${randomBytes(8).toString('hex')}.tmp`);
    await writeFile(tempPath, serialized, { flag: 'wx', mode: info.mode & 0o777 });
    const tempHandle = await open(tempPath, constants.O_RDONLY);
    try {
      await tempHandle.sync();
    } finally {
      await tempHandle.close();
    }

    // Consume the token immediately before the atomic replacement. A failed rename
    // removes this marker; a process crash cannot leave a successfully changed file
    // with a reusable token.
    const markerHandle = await open(USED_PATH, 'wx', 0o600);
    markerCreated = true;
    try {
      await markerHandle.writeFile(`${new Date().toISOString()}\n`);
      await markerHandle.sync();
    } finally {
      await markerHandle.close();
    }

    const latest = await readFile(USERS_PATH);
    if (!latest.equals(original)) throw new Error('users.json changed during recovery');
    await rename(tempPath, USERS_PATH);
    tempPath = undefined;
    markerCreated = false;
    return NextResponse.json({ ok: true, message: 'Доступ администратора восстановлен.' }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    if (markerCreated) await unlink(USED_PATH).catch(() => {});
    return jsonError('Не удалось безопасно обновить учётную запись.', 500);
  } finally {
    if (tempPath) await unlink(tempPath).catch(() => {});
    await lockHandle?.close().catch(() => {});
    if (lockAcquired) await unlink(LOCK_PATH).catch(() => {});
  }
}
