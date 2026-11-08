import { constants } from 'node:fs';
import { lstat, open, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getSessionFromRequest, hashPassword, verifyPassword } from '../../../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_PATH = path.join(DATA_DIR, 'users.json');
const LOCK_PATH = path.join(DATA_DIR, '.users-password-change.lock');
const MAX_BODY_BYTES = 8 * 1024;

type User = {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  [key: string]: unknown;
};

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session || session.role !== 'admin') return errorResponse('Требуется вход администратора.', 401);
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    return errorResponse('Ожидался JSON запрос.', 415);
  }
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return errorResponse('Запрос слишком большой.', 413);
  }

  let body: { currentPassword?: unknown; newPassword?: unknown; confirmPassword?: unknown };
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
      return errorResponse('Запрос слишком большой.', 413);
    }
    body = JSON.parse(rawBody);
  } catch {
    return errorResponse('Некорректный запрос.', 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return errorResponse('Некорректный запрос.', 400);
  }

  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';
  if (!currentPassword) {
    return errorResponse('Введите текущий пароль.', 400);
  }
  if (newPassword.length < 8) {
    return errorResponse('Новый пароль должен содержать не менее 8 символов.', 400);
  }
  if (newPassword !== confirmPassword) return errorResponse('Новые пароли не совпадают.', 400);
  if (newPassword === currentPassword) return errorResponse('Новый пароль должен отличаться от текущего.', 400);

  let lockHandle;
  let lockAcquired = false;
  let tempPath: string | undefined;
  try {
    try {
      lockHandle = await open(LOCK_PATH, 'wx', 0o600);
      lockAcquired = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        return errorResponse('Изменение пароля уже выполняется. Повторите попытку.', 409);
      }
      throw error;
    }

    const info = await lstat(USERS_PATH);
    if (!info.isFile() || info.isSymbolicLink()) {
      return errorResponse('Файл пользователей недоступен.', 500);
    }
    const original = await readFile(USERS_PATH);
    let users: unknown;
    try {
      users = JSON.parse(original.toString('utf8'));
    } catch {
      return errorResponse('Файл пользователей содержит некорректные данные.', 500);
    }
    if (!Array.isArray(users) || users.some((user) =>
      !user || typeof user !== 'object' || Array.isArray(user) ||
      typeof user.id !== 'string' || typeof user.email !== 'string' ||
      typeof user.passwordHash !== 'string' || typeof user.role !== 'string'
    )) {
      return errorResponse('Файл пользователей содержит некорректные записи.', 500);
    }

    const matchingUsers = users.filter((user) => user.id === session.userId);
    if (matchingUsers.length !== 1 || matchingUsers[0].role !== 'admin') {
      return errorResponse('Учётная запись администратора не найдена.', 401);
    }
    const admin = matchingUsers[0] as User;
    if (!verifyPassword(currentPassword, admin.passwordHash)) {
      return errorResponse('Текущий пароль указан неверно.', 401);
    }

    const updatedUsers = users.map((user) => user.id === admin.id
      ? { ...user, passwordHash: hashPassword(newPassword) }
      : user);
    tempPath = path.join(DATA_DIR, `.users-password-${process.pid}-${Date.now()}.tmp`);
    await writeFile(tempPath, `${JSON.stringify(updatedUsers, null, 2)}\n`, {
      flag: 'wx',
      mode: info.mode & 0o777,
    });
    const tempHandle = await open(tempPath, constants.O_RDONLY);
    try {
      await tempHandle.sync();
    } finally {
      await tempHandle.close();
    }

    const latest = await readFile(USERS_PATH);
    if (!latest.equals(original)) return errorResponse('Данные пользователей изменились. Повторите попытку.', 409);
    await rename(tempPath, USERS_PATH);
    tempPath = undefined;
    return NextResponse.json({ ok: true, message: 'Пароль успешно изменён.' }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return errorResponse('Не удалось безопасно сохранить новый пароль.', 500);
  } finally {
    if (tempPath) await unlink(tempPath).catch(() => {});
    await lockHandle?.close().catch(() => {});
    if (lockAcquired) await unlink(LOCK_PATH).catch(() => {});
  }
}
