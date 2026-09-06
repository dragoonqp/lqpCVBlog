import { NextRequest } from 'next/server';
import { readResume, saveResume } from '@/server/store.cjs';
import { failure, json, readBody, requireAdmin } from '@/lib/admin-http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    return json(readResume());
  } catch (error) {
    return failure(error);
  }
}
export async function PUT(request: NextRequest) {
  try {
    requireAdmin(request);
    const body = await readBody(request);
    return json(saveResume(body));
  } catch (error) {
    return failure(error);
  }
}
