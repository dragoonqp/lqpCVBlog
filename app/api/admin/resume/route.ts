import { NextRequest } from 'next/server';
import { readResume, saveResume } from '@/server/store.cjs';
import { failure, json, readBody, requireAdmin } from '@/lib/admin-http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return json(await readResume({ consistent: true }));
  } catch (error) {
    return failure(error);
  }
}
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await readBody(request);
    return json(await saveResume(body));
  } catch (error) {
    return failure(error);
  }
}
