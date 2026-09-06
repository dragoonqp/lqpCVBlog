import type { ResumeData } from '../lib/resume-types';
export function readResume(): ResumeData;
export function saveResume(input: unknown): ResumeData;
export function login(username: unknown, password: unknown): Promise<string>;
export function sessionUser(token: string | undefined): string | null;
export function logout(token: string | undefined): void;
export function changePassword(
  token: string | undefined,
  current: unknown,
  next: unknown,
): Promise<void>;
export class InputError extends Error {
  status: number;
  constructor(message: string, status?: number);
}
