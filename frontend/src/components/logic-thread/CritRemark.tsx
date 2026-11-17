'use client'

import { Search, X } from 'lucide-react'
import InspectorCrit from '@/components/brand/InspectorCrit'
import styles from './overlays.module.css'

/**
 * remark: fades on its own · thinking: waiting on a hint · hint / explain / feedback: stay until dismissed ·
 * hintlog: the case's hint allowance is spent; shows the notice and the hints already unlocked
 */
export type RemarkKind = 'remark' | 'thinking' | 'hint' | 'explain' | 'feedback' | 'hintlog'

// Header tag on Crit's guidance card, per kind
const BADGES: Partial<Record<RemarkKind, string>> = {
  thinking: "CRIT'S SOCRATIC GUIDANCE",
  hint:     "CRIT'S SOCRATIC GUIDANCE",
  explain:  "CRIT'S CASE EXPLANATION",
  feedback: 'INSPECTOR CRIT // FEEDBACK',
  hintlog:  'UNLOCKED HINTS',
}

const MAX_HINTS = 3   // mirrors MAX_HINTS_PER_QUESTION in useCaseHints

export interface Remark {
  /** A new id replays the bubble. */
  id: number
  text: string
  kind: RemarkKind
  /** hintlog only: the guidance and hints already unlocked on this case, oldest first. */
  items?: { label: string; text: string }[]
}

interface CritRemarkProps {
  remark: Remark | null
  onDismiss: () => void
  /** Ask the AI for a deeper (Socratic) hint; omitted when unavailable. */
  onAskMore?: () => void
  asking?: boolean
  /** Hints left on the current case; at 0 "Dig deeper" gives way to the limit notice. */
  hintsRemaining?: number
}

/** Inspector Crit in the lower-left corner, speaking side remarks and Socratic guidance in a bubble. */
export default function CritRemark({ remark, onDismiss, onAskMore, asking, hintsRemaining }: CritRemarkProps) {
  const thinking = remark?.kind === 'thinking'
  const badge = remark ? BADGES[remark.kind] : undefined
  const guidance = badge !== undefined
  const counted = hintsRemaining !== undefined
  const spent = counted && hintsRemaining <= 0

  return (
    <div className={`${styles.root} ${styles.remark}`} aria-live="polite">
      <span className={styles.avatarWrap}>
        <span className={`${styles.remarkAvatar} ${thinking ? styles.remarkAvatarThinking : ''}`}>
          <InspectorCrit height={52} decorative />
        </span>
        {thinking && <span className={styles.thinkingLens} aria-hidden><Search size={13} /></span>}
      </span>
      {remark && (
        // Keyed by id so each remark restarts its animation
        <div key={remark.id} className={`${styles.remarkBubble} ${guidance ? styles.remarkHint : ''}`} aria-busy={thinking}>
          {guidance && (
            <div className={styles.hintHead}>
              <span className={styles.guidanceBadge}>
                <Search size={11} aria-hidden /> {badge}
              </span>
              {/* Hint cards show what is left on "Dig deeper"; the spent card states it in the header */}
              {counted && remark.kind === 'hintlog' && (
                <span className={`${styles.hintsLeft} ${spent ? styles.hintsLeftSpent : ''}`}>
                  HINTS {hintsRemaining}/{MAX_HINTS}
                </span>
              )}
              <button type="button" className={styles.hintClose} onClick={onDismiss} aria-label="Dismiss hint">
                <X size={12} aria-hidden />
              </button>
            </div>
          )}
          {thinking ? (
            <p className={`${styles.remarkText} ${styles.thinkingText}`}>
              <Search size={15} className={styles.thinkingIcon} aria-hidden />
              <span>{remark.text}<span className={styles.dots} aria-hidden><i>.</i><i>.</i><i>.</i></span></span>
            </p>
          ) : remark.kind === 'hintlog' ? (
            <div className={styles.remarkText}>
              <p className={styles.limitNotice}>{remark.text}</p>
              {remark.items && remark.items.length > 0 ? (
                <ol className={styles.hintLog}>
                  {remark.items.map((h, i) => <li key={i}><b>{h.label}.</b> {h.text}</li>)}
                </ol>
              ) : (
                <p className={styles.hintLogEmpty}>The hints for this case were used up in an earlier visit.</p>
              )}
            </div>
          ) : (
            <p className={styles.remarkText}>{remark.text}</p>
          )}
          {(remark.kind === 'hint' || remark.kind === 'feedback') && onAskMore && (
            spent ? (
              <p className={styles.limitNoticeInline}>0 hints remaining for this case</p>
            ) : (
              <button type="button" className={styles.hintMore} onClick={onAskMore} disabled={asking}>
                <Search size={12} aria-hidden /> {asking ? 'Thinking…' : counted ? `Dig deeper (${hintsRemaining} left)` : 'Dig deeper'}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}
