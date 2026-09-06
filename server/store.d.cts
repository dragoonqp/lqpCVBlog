import type { ResumeData } from '../lib/resume-types';
export function readResume(): Promise<ResumeData>;
export function saveResume(input: unknown): Promise<ResumeData>;
export function login(username: unknown, password: unknown): Promise<string>;
export function sessionUser(token: string | undefined): Promise<string | null>;
export function logout(token: string | undefined): Promise<void>;
export function changePassword(
  token: string | undefined,
  current: unknown,
  next: unknown,
): Promise<void>;
export class InputError extends Error {
  status: number;
  constructor(message: string, status?: number);
}
