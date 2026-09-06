import { NextRequest } from 'next/server';
import { login, logout } from '@/server/store.cjs';
import {
  cookieName,
  failure,
  json,
  readBody,
  sessionCookie,
} from '@/lib/admin-http';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  try {
    const body = await readBody(request);
    const token = await login(body?.username, body?.password);
    await logout(request.cookies.get(cookieName)?.value);
    const response = json({ ok: true });
    response.cookies.set(cookieName, token, sessionCookie(request));
    return response;
  } catch (error) {
    return failure(error);
  }
}
