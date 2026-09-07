import { NextRequest } from 'next/server';
import { listContactCodes, createContactCode, revokeContactCode } from '@/server/store.cjs';
import { requireAdmin, readBody, failure, json } from '@/lib/admin-http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export async function GET(request: NextRequest) {
  try { await requireAdmin(request); return json(await listContactCodes()); } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  try { await requireAdmin(request); const body = await readBody(request); return json(await createContactCode(body)); } catch (error) { return failure(error); }
}
export async function DELETE(request: NextRequest) {
  try { await requireAdmin(request); const body = await readBody(request); await revokeContactCode(body?.id); return json({ok: true}); } catch (error) { return failure(error); }
}
