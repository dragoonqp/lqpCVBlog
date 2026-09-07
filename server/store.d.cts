import type { ResumeData } from '../lib/resume-types';
export function readResume(options?: {
  consistent?: boolean;
}): Promise<ResumeData>;
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

export function listContactCodes(): Promise<Array<{id: string; label: string; expires_at: number; max_uses: number; uses: number; revoked: number; created_at: number}>>;
export function createContactCode(input: unknown): Promise<{id: string; code: string; expiresAt: number}>;
export function revokeContactCode(id: unknown): Promise<void>;
export function contactAccess(token: string | undefined): Promise<boolean>;
export function redeemContactCode(code: unknown): Promise<{token: string; expiresAt: number}>;
