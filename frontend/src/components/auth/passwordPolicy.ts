// Mirrors backend/api/email_verification.py so the client and server agree.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_SPECIALS = '@$!%*?&';

export interface PasswordRule {
  id: string;
  label: string;
  test: (pw: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'len',     label: '8+ chars',              test: (pw) => pw.length >= 8 },
  { id: 'upper',   label: 'Uppercase',             test: (pw) => /[A-Z]/.test(pw) },
  { id: 'lower',   label: 'Lowercase',             test: (pw) => /[a-z]/.test(pw) },
  { id: 'number',  label: 'Number',                test: (pw) => /\d/.test(pw) },
  { id: 'special', label: `Symbol (${PASSWORD_SPECIALS})`, test: (pw) => /[@$!%*?&]/.test(pw) },
];

export type StrengthLevel = 'weak' | 'medium' | 'strong';

export const STRENGTH_LABELS: Record<StrengthLevel, string> = {
  weak: 'Unsecured',
  medium: 'Guarded',
  strong: 'Vault-Locked',
};

/** Rules met (0-5) → weak (<3), medium (3-4), strong (all 5). */
export function passwordStrength(pw: string): { met: number; level: StrengthLevel } {
  const met = PASSWORD_RULES.filter((r) => r.test(pw)).length;
  const level: StrengthLevel = met === PASSWORD_RULES.length ? 'strong' : met >= 3 ? 'medium' : 'weak';
  return { met, level };
}

export function passwordMeetsPolicy(pw: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(pw));
}
