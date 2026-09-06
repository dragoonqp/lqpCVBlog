import type { ResumeData } from './resume-types';
export class DraftConflict extends Error {
  latest: ResumeData;
}
export function saveWithRebase(
  baseline: ResumeData,
  draft: ResumeData,
  put: (data: ResumeData, baseline: ResumeData) => Promise<ResumeData>,
  get: () => Promise<ResumeData>,
): Promise<ResumeData>;
