import { NextRequest } from 'next/server';
import { contactAccess, redeemContactCode, readResume, InputError } from '@/server/store.cjs';
import { readBody, failure, json, sessionCookie } from '@/lib/admin-http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
const cookieName = 'resume_contact_access';
async function contacts() { return (await readResume({ consistent: true })).contacts; }
export async function GET(request: NextRequest) {
  try {
    if (!(await contactAccess(request.cookies.get(cookieName)?.value))) throw new InputError('请输入访问码查看联系方式', 401);
    return json({ contacts: await contacts() });
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  try {
    const body = await readBody(request);
    if (await contactAccess(request.cookies.get(cookieName)?.value)) return json({ contacts: await contacts() });
    const grant = await redeemContactCode(body?.code);
    const response = json({ contacts: await contacts() });
    response.cookies.set(cookieName, grant.token, sessionCookie(request, Math.max(0, Math.floor((grant.expiresAt - Date.now()) / 1000))));
    return response;
  } catch (error) { return failure(error); }
}
