'use client'

import { useEffect, useRef } from 'react'
import { ArrowRight, Award, FileSearch, Paperclip, RotateCcw, Search } from 'lucide-react'
import InspectorCrit from '@/components/brand/InspectorCrit'
import styles from './overlays.module.css'

/** A case the cadet got wrong, with Inspector Crit's notes on the sequence. */
export interface MissedCase {
  caseNumber: number
  title: string
  notes: string[]
  /** Cards filed in the right slot; null when the answer key is unavailable. */
  correctSlots: number | null
  total: number
}

export interface DocketDebrief {
  verdict: 'perfect' | 'partial'
  /** Cases solved / cases in the docket. */
  solved: number
  total: number
  /** XP actually awarded by the backend when the docket closed. */
  xpAwarded: number | null
  /** Node unlocked by closing the docket, if any. */
  nextNode: string | null
  missed: MissedCase[]
}

interface CaseDebriefModalProps {
  debrief: DocketDebrief | null
  onRetry: () => void
  onNext: () => void
  onReport: () => void
}

/** Inspector Crit's end-of-docket debrief, shown once every case has been submitted. */
export default function CaseDebriefModal({ debrief, onRetry, onNext, onReport }: CaseDebriefModalProps) {
  const primaryRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (debrief) primaryRef.current?.focus()
  }, [debrief])

  if (!debrief) return null

  const perfect = debrief.verdict === 'perfect'
  const pct = Math.round((debrief.solved / Math.max(1, debrief.total)) * 100)
  const unexplained = debrief.total - debrief.solved - debrief.missed.length

  const lead = perfect
    ? 'Outstanding work, Cadet! Every card in its place, every thread holds. Sharp deduction across the whole docket.'
    : pct >= 50
      ? `Solid effort, Cadet — ${debrief.solved} of ${debrief.total} cases cracked. A few threads snapped; here is where the evidence disagrees with you:`
      : `This docket does not hold up in court yet, Cadet. Let me point out the weak links before you try again:`

  return (
    <div className={`${styles.root} ${styles.backdrop}`}>
      <div className={`${styles.debrief} ${styles.paper}`} role="dialog" aria-modal="true" aria-labelledby="debrief-title">
        <Paperclip size={26} strokeWidth={1.6} className={styles.clip} style={{ top: -12, left: 18, transform: 'rotate(-30deg)' }} aria-hidden />

        <header className={styles.debriefHead}>
          <div>
            <div className={styles.kicker}>{debrief.total}-CASE DOCKET {'//'} INSPECTOR&apos;S DEBRIEF</div>
            <h2 id="debrief-title" className={styles.debriefTitle}>
              {perfect ? 'Docket Closed' : 'Docket Under Review'}
            </h2>
          </div>
          <span className={`${styles.stamp} ${perfect ? styles.stampOk : ''}`} style={{ fontSize: 11, transform: 'rotate(-3deg)' }}>
            {perfect ? 'Verified' : 'Re-examine'}
          </span>
        </header>

        <div className={styles.debriefBody}>
          <div className={styles.crit}>
            <InspectorCrit height={100} />
            <span className={styles.critName}>INSP. CRIT</span>
          </div>

          <div className={`${styles.speech} ${perfect ? styles.speechPerfect : styles.speechPartial}`}>
            <p className={styles.lead}>{lead}</p>

            {!perfect && (
              <div className={styles.missedList}>
                {debrief.missed.map(m => (
                  <div key={m.caseNumber} className={styles.missed}>
                    <div className={styles.missedHead}>
                      CASE {String(m.caseNumber).padStart(2, '0')} — {m.title}
                      {m.correctSlots !== null && <span className={styles.missedScore}>{m.correctSlots}/{m.total} in place</span>}
                    </div>
                    <ul className={styles.notes}>
                      {m.notes.slice(0, 2).map(n => <li key={n}><Search size={13} aria-hidden />{n}</li>)}
                    </ul>
                  </div>
                ))}
                {unexplained > 0 && (
                  <p className={styles.missedMore}>
                    {unexplained} earlier case{unexplained === 1 ? ' was' : 's were'} missed before you resumed this docket.
                  </p>
                )}
              </div>
            )}

            {perfect && (
              <div className={styles.verdictRow}>
                <span className={styles.xp}>
                  <Award size={14} aria-hidden />
                  {debrief.xpAwarded !== null && debrief.xpAwarded > 0 ? `+${debrief.xpAwarded} XP EARNED` : 'XP FILED TO YOUR RECORD'}
                </span>
                <span className={`${styles.stamp} ${styles.stampOk} ${styles.verdictStamp}`}>Evidence Verified</span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.scoreRow}>
          <span>CASES SOLVED</span>
          <div className={styles.gauge}>
            <div className={`${styles.gaugeFill} ${pct < 100 ? styles.gaugeFillLow : ''}`} style={{ width: `${pct}%` }} />
          </div>
          <span className={styles.score}>{pct}% ({debrief.solved}/{debrief.total})</span>
        </div>

        <footer className={styles.debriefFoot}>
          {perfect ? (
            <>
              <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onReport}>
                <FileSearch size={14} aria-hidden /> Case Report
              </button>
              <button ref={primaryRef} type="button" className={styles.btn} onClick={onNext}>
                Next Docket <ArrowRight size={14} aria-hidden />
              </button>
            </>
          ) : (
            <>
              <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onNext}
                title="Close this docket and open the case report">
                Next Docket <ArrowRight size={14} aria-hidden />
              </button>
              <button ref={primaryRef} type="button" className={styles.btn} onClick={onRetry}
                title="Replay this docket with a fresh set of cases">
                <RotateCcw size={14} aria-hidden /> Retry Case
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}
