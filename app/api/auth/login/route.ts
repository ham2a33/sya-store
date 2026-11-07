import { NextResponse } from 'next/server';
import {
  authenticateUser,
  createSessionToken,
  getSessionCookieName,
  getSessionCookieOptions,
} from '../../../../lib/auth';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim();
    const password = body.password ?? '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = createSessionToken(user);
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, role: user.role },
    });
    response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
