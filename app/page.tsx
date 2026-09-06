import ResumeView from '@/components/resume-view';
import { readResume } from '@/server/store.cjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export default function Home() {
  return <ResumeView data={readResume()} />;
}
