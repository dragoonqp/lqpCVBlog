import ResumeView from '@/components/resume-view';
import { readResume } from '@/server/store.cjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export default async function Home() {
  return <ResumeView data={await readResume({ consistent: true })} />;
}
