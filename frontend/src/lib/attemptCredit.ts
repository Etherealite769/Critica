/**
 * Attempt credit, the same rule in all four game modules (and enforced again by the session API):
 *
 * - Practice is unlimited: a cadet can keep submitting until the case is solved, then move on.
 * - Only the first CREDIT_ATTEMPTS attempts can earn credit. A solve on attempt 1-3 counts as CORRECT.
 * - Once attempt 3 fails, the case is latched as FAILED for stats, accuracy, XP and mastery. Solving it later
 *   (attempt 4+) still unlocks the next case, but is recorded as incorrect and never overwrites the latch.
 */
import type { CaseResult } from '@/components/shared/NodeEvaluationReport'
import type { MissedCase } from '@/components/logic-thread/CaseDebriefModal'

export const CREDIT_ATTEMPTS = 3
export const CREDIT_LOST_NOTICE = '3 ATTEMPTS EXCEEDED — MARKED INCORRECT IN STATS // KEEP TRYING TO SOLVE & CONTINUE'
export const LATE_SOLVE_REMARK =
  'Solved, Cadet. It took more than 3 attempts, so this case counts as incorrect in your stats. On to the next one.'

/** `wrongs` = wrong submissions so far on the case. True once attempt 3 has failed: the latch. */
export const creditLost = (wrongs: number) => wrongs >= CREDIT_ATTEMPTS

/** The result of a solved case: correct only when it was solved within the first 3 attempts. */
export function solvedCaseResult(caseNumber: number, wrongs: number, hintsUsed: number): CaseResult {
  const attempts = wrongs + 1
  const credited = !creditLost(wrongs)
  return { caseNumber, correct: credited, firstTry: attempts === 1, hintsUsed, attempts, solvedLate: !credited }
}

/** The debrief's missed list, plus every case solved too late for credit (so it is explained, not just counted). */
export function withLateSolves(missed: MissedCase[], results: CaseResult[]): MissedCase[] {
  const late: MissedCase[] = results
    .filter(r => r.solvedLate && !missed.some(m => m.caseNumber === r.caseNumber))
    .map(r => ({
      caseNumber: r.caseNumber,
      title: `Case ${r.caseNumber}`,
      notes: [`Solved on attempt ${r.attempts}. Only the first ${CREDIT_ATTEMPTS} attempts count, so this case is marked incorrect.`],
      correctSlots: null,
      total: 0,
    }))
  return [...missed, ...late].sort((a, b) => a.caseNumber - b.caseNumber)
}

/**
 * Merge the server's per-case wrong-attempt counts (session payload `case_attempts`) into a page's attempts map,
 * never lowering a count. After a refresh the latch therefore survives: the cadet still sees "ATTEMPT #4".
 */
export function mergeServerAttempts(map: Record<number, number>, server?: Record<string, number> | null) {
  for (const [k, v] of Object.entries(server || {})) {
    const i = Number(k)
    if (!Number.isNaN(i)) map[i] = Math.max(map[i] || 0, Number(v) || 0)
  }
  return map
}
