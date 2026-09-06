import { NextRequest, NextResponse } from 'next/server';
import { InputError, sessionUser } from '@/server/store.cjs';
export const cookieName = 'resume_admin_session';
export function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(cookieName)?.value;
  if (!sessionUser(token)) throw new InputError('请先登录管理账号', 401);
  return token;
}
export async function readBody(request: NextRequest) {
  const expected = process.env.APP_ORIGIN || request.nextUrl.origin;
  if (
    request.headers.get('origin') !== expected ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new InputError('请求来源不受信任', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new InputError('需要 JSON 请求', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new InputError('请求内容为空');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 512000) {
      await reader.cancel();
      throw new InputError('内容过大', 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new InputError('JSON 格式不正确');
  }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
export function failure(error: unknown) {
  if (error instanceof InputError)
    return json({ error: error.message }, error.status);
  console.error('Admin request failed', error);
  return json({ error: '服务暂时无法完成操作，请重试' }, 500);
}
export function sessionCookie(request: NextRequest, maxAge = 28800) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure:
      new URL(process.env.APP_ORIGIN || request.url).protocol === 'https:',
    path: '/',
    maxAge,
  };
}
