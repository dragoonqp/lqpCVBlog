import ResumeView from '@/components/resume-view';
import { readResume } from '@/server/store.cjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export default async function Home() {
  return <ResumeView data={await readResume({ consistent: true })} />;
}
