import { NextRequest } from 'next/server';
import { changePassword } from '@/server/store.cjs';
import {
  cookieName,
  failure,
  json,
  readBody,
  requireAdmin,
  sessionCookie,
} from '@/lib/admin-http';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  try {
    const token = await requireAdmin(request);
    const body = await readBody(request);
    await changePassword(token, body?.current, body?.next);
    const response = json({ ok: true });
    response.cookies.set(cookieName, '', sessionCookie(request, 0));
    return response;
  } catch (error) {
    return failure(error);
  }
}
