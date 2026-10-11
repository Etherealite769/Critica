// Field Induction (onboarding tour) state.
//
// - `hasCompletedInduction` is stored per cadet in localStorage and mirrored to
//   the backend profile (`onboarding_completed`) via /progression/onboarding/complete/.
// - A short-lived sessionStorage flag marks a brand-new cadet right after email
//   verification so the tour opens on that first dashboard visit even if the
//   profile request is slow or fails.

const LEGACY_KEY = (studentId: string) => `critica_onboarding_completed_${studentId}`;
const COMPLETED_KEY = (studentId: string) => `critica.hasCompletedInduction.${studentId}`;
const PENDING_KEY = 'critica.inductionPending';

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return typeof window === 'undefined' ? fallback : fn();
  } catch {
    return fallback; // storage blocked (private mode, etc.)
  }
}

export function hasCompletedInduction(studentId: string): boolean {
  return safe(
    () => localStorage.getItem(COMPLETED_KEY(studentId)) === 'true'
      || localStorage.getItem(LEGACY_KEY(studentId)) === 'true',
    false,
  );
}

export function markInductionComplete(studentId: string): void {
  safe(() => {
    localStorage.setItem(COMPLETED_KEY(studentId), 'true');
    localStorage.setItem(LEGACY_KEY(studentId), 'true');   // keep older builds in sync
    sessionStorage.removeItem(PENDING_KEY);
  }, undefined);
}

/** Called after a new account is verified (first sign-in after registration). */
export function markInductionPending(): void {
  safe(() => sessionStorage.setItem(PENDING_KEY, 'true'), undefined);
}

export function isInductionPending(): boolean {
  return safe(() => sessionStorage.getItem(PENDING_KEY) === 'true', false);
}

/**
 * Should the tour auto-open on the dashboard?
 * Yes for a just-verified cadet, or when neither the profile nor this browser
 * has a completion record.
 */
export function shouldAutoOpenInduction(studentId: string, profileCompleted: boolean | undefined): boolean {
  if (hasCompletedInduction(studentId)) return false;
  return isInductionPending() || profileCompleted !== true;
}
