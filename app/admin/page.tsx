import { cookies } from 'next/headers';
import { readResume, sessionUser } from '@/server/store.cjs';
import Admin from '@/components/admin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: '简历数据管理',
  robots: { index: false, follow: false },
};
export default async function AdminPage() {
  const user = await sessionUser(cookies().get('resume_admin_session')?.value);
  return <Admin initialData={user ? await readResume() : null} />;
}
