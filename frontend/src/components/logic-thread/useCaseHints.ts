'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import type { Remark } from './CritRemark'

/** "Dig deeper" hints a cadet may request on one case (question). The session API enforces the same cap. */
export const MAX_HINTS_PER_QUESTION = 3
export const HINT_LIMIT_NOTICE = '0 HINTS REMAINING FOR THIS CASE — ANALYZE THE EVIDENCE DIRECTLY'

/** What a page's hint fetcher returns: the text to show, and the server's count for this case if it sent one. */
export interface HintFetch { text: string; used?: number }
export type HintOutcome = 'ok' | 'limit' | 'busy' | 'error'

/** Session payload fields the backend sends so the cap and unlocked hints survive a refresh. */
export interface SessionHintPayload {
  session_id?: string
  case_hints?: Record<string, number>
  case_hint_log?: Record<string, string[]>
}

interface CaseHints {
  used: number                              // "Dig deeper" hints counted on this case
  guidance: string | null                   // Crit's opening guidance (free)
  deeper: string[]                          // "Dig deeper" hints, oldest first
  pending: 'guidance' | 'deeper' | null     // a request in flight for this case
  error: string | null                      // fallback text after a failed request (nothing counted)
  view: 'latest' | 'log'                    // the newest hint, or (once spent) everything unlocked to re-read
  rev: number                               // bumps on every change, so the bubble replays its animation
}

const EMPTY: CaseHints = { used: 0, guidance: null, deeper: [], pending: null, error: null, view: 'latest', rev: 0 }
const NO_HINTS: string[] = []

export function isHintLimitError(e: unknown): boolean {
  const err = e as { error?: string; status?: number } | null
  return err?.error === 'hint_limit_reached' || err?.status === 429
}

/**
 * Crit's Socratic guidance for the active case.
 *
 * - openGuidance(): the sidebar lightbulb. Opens the drawer and loads the opening guidance once per case. Free.
 * - digDeeper(): the only action that spends a hint (3 per case); each one goes a level deeper.
 * - close(): hides the drawer and nothing else. A request still in flight keeps running, and reopening shows
 *   its "thinking" state or its result, so closing mid-thought can never lock the drawer.
 *
 * Every case of every session run has its own entry, so the allowance is back to 3/3 on the next case, on a new
 * session (Retry docket / Fresh Case) and after reset(); a late response always lands on the case that asked.
 */
export function useCaseHints(sessionId: string | null | undefined, caseIndex: number, thinkingText: string) {
  const [server, setServer] = useState<{ sessionId: string | null; used: Record<string, number>; log: Record<string, string[]> }>(
    { sessionId: null, used: {}, log: {} })
  const [run, setRun] = useState(0)
  const [cases, setCases] = useState<Record<string, CaseHints>>({})
  // Which case's drawer is open, and when it was opened (the page shows whichever of drawer or remark is newer)
  const [open, setOpen] = useState<{ key: string; at: number } | null>(null)
  const inFlight = useRef<Set<string>>(new Set())

  const caseKey = `${sessionId || 'local'}#${run}#${caseIndex}`
  const fromServer = !!sessionId && server.sessionId === sessionId
  const serverUsed = (fromServer && server.used[String(caseIndex)]) || 0
  const serverLog = (fromServer && server.log[String(caseIndex)]) || NO_HINTS
  const entry: CaseHints = useMemo(
    () => cases[caseKey] ?? { ...EMPTY, used: serverUsed, deeper: serverLog },
    [cases, caseKey, serverUsed, serverLog])
  const used = Math.min(MAX_HINTS_PER_QUESTION, Math.max(entry.used, serverUsed))
  const remaining = MAX_HINTS_PER_QUESTION - used
  const isOpen = open?.key === caseKey

  const update = useCallback((key: string, base: CaseHints, change: (c: CaseHints) => Partial<CaseHints>) => {
    setCases(prev => {
      const cur = prev[key] ?? base
      return { ...prev, [key]: { ...cur, ...change(cur), rev: cur.rev + 1 } }
    })
  }, [])

  /** Adopt the server's per-case counts and unlocked hints from a freshly loaded session. */
  const syncFromSession = useCallback((data: SessionHintPayload | null | undefined) => {
    setServer({ sessionId: data?.session_id ?? null, used: data?.case_hints ?? {}, log: data?.case_hint_log ?? {} })
  }, [])

  /** Start the allowance over (a restarted node) and hide the drawer. */
  const reset = useCallback(() => { setRun(r => r + 1); setOpen(null) }, [])

  const close = useCallback(() => setOpen(null), [])

  /** Sidebar lightbulb: open Crit's guidance. Loads it once per case; never spends a hint. */
  const openGuidance = useCallback(async (fetcher: () => Promise<HintFetch>, fallback: string): Promise<HintOutcome> => {
    const key = caseKey, base = entry
    setOpen({ key, at: Date.now() })
    if (inFlight.current.has(key)) return 'busy'          // still thinking: reopening just shows that
    const spent = Math.max(base.used, serverUsed) >= MAX_HINTS_PER_QUESTION
    if (base.guidance !== null) {                          // already loaded: show it again (the re-read list once spent)
      update(key, base, () => ({ error: null, view: spent ? 'log' : 'latest' }))
      return 'ok'
    }
    inFlight.current.add(key)
    update(key, base, () => ({ pending: 'guidance', error: null }))
    try {
      const res = await fetcher()
      update(key, base, () => ({ guidance: res.text, pending: null, view: spent ? 'log' : 'latest' }))
      return 'ok'
    } catch {
      update(key, base, () => ({ pending: null, error: fallback }))
      return 'error'
    } finally {
      inFlight.current.delete(key)
    }
  }, [caseKey, entry, serverUsed, update])

  /** DIG DEEPER: the next, more specific hint. The only action that counts toward the 3 per case. */
  const digDeeper = useCallback(async (fetcher: () => Promise<HintFetch>, fallback: string): Promise<HintOutcome> => {
    const key = caseKey, base = { ...entry, used }
    setOpen({ key, at: Date.now() })
    if (inFlight.current.has(key)) return 'busy'
    if (used >= MAX_HINTS_PER_QUESTION) {
      update(key, base, () => ({ view: 'log' }))
      return 'limit'
    }
    inFlight.current.add(key)
    update(key, base, () => ({ pending: 'deeper', error: null }))
    try {
      const res = await fetcher()
      update(key, base, c => ({
        pending: null,
        used: Math.min(MAX_HINTS_PER_QUESTION, Math.max(c.used + 1, res.used ?? 0)),
        deeper: [...c.deeper, res.text],
        view: 'latest',   // the hint just earned (even the third) is shown on its own, not buried in a list
      }))
      return 'ok'
    } catch (e) {
      if (isHintLimitError(e)) {
        update(key, base, () => ({ pending: null, used: MAX_HINTS_PER_QUESTION, view: 'log' }))
        return 'limit'
      }
      update(key, base, () => ({ pending: null, error: fallback }))
      return 'error'
    } finally {
      inFlight.current.delete(key)
    }
  }, [caseKey, entry, used, update])

  // What the drawer shows: thinking while a request runs; once the allowance is spent, the notice plus every
  // unlocked hint to re-read; otherwise the latest hint (or the opening guidance).
  const items = [
    ...(entry.guidance ? [{ label: 'Guidance', text: entry.guidance }] : []),
    ...entry.deeper.map((text, i) => ({ label: `Hint ${i + 1}`, text })),
  ]
  const remark: Remark | null =
    entry.pending ? { id: entry.rev, kind: 'thinking', text: thinkingText }
    : entry.error ? { id: entry.rev, kind: 'hint', text: entry.error }
    : used >= MAX_HINTS_PER_QUESTION && (entry.view === 'log' || !entry.deeper.length)
      ? { id: entry.rev, kind: 'hintlog', text: HINT_LIMIT_NOTICE, items }
    : entry.deeper.length ? { id: entry.rev, kind: 'hint', text: entry.deeper[entry.deeper.length - 1] }
    : entry.guidance ? { id: entry.rev, kind: 'hint', text: entry.guidance }
    : null

  return {
    used,
    remaining,
    exhausted: remaining <= 0,
    pending: entry.pending,
    isOpen,
    openedAt: isOpen ? open!.at : 0,
    remark,
    openGuidance,
    digDeeper,
    close,
    syncFromSession,
    reset,
  }
}
