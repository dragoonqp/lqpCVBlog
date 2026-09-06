import { NextRequest } from 'next/server';
import { logout } from '@/server/store.cjs';
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
    await readBody(request);
    await logout(request.cookies.get(cookieName)?.value);
    const response = json({ ok: true });
    response.cookies.set(cookieName, '', sessionCookie(request, 0));
    return response;
  } catch (error) {
    return failure(error);
  }
}
