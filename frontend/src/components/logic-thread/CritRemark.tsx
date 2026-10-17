'use client'

import { Search, X } from 'lucide-react'
import InspectorCrit from '@/components/brand/InspectorCrit'
import styles from './overlays.module.css'

/** remark: fades on its own · thinking: waiting on a hint · hint / explain: stay until dismissed */
export type RemarkKind = 'remark' | 'thinking' | 'hint' | 'explain'

export interface Remark {
  /** A new id replays the bubble. */
  id: number
  text: string
  kind: RemarkKind
}

interface CritRemarkProps {
  remark: Remark | null
  onDismiss: () => void
  /** Ask the AI for a deeper (Socratic) hint; omitted when unavailable. */
  onAskMore?: () => void
  asking?: boolean
}

/** Inspector Crit in the lower-left corner, speaking side remarks and Socratic guidance in a bubble. */
export default function CritRemark({ remark, onDismiss, onAskMore, asking }: CritRemarkProps) {
  const thinking = remark?.kind === 'thinking'
  const explain = remark?.kind === 'explain'
  const guidance = remark?.kind === 'hint' || thinking || explain

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
                <Search size={11} aria-hidden /> {explain ? "CRIT'S CASE EXPLANATION" : "CRIT'S SOCRATIC GUIDANCE"}
              </span>
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
          ) : (
            <p className={styles.remarkText}>{remark.text}</p>
          )}
          {remark.kind === 'hint' && onAskMore && (
            <button type="button" className={styles.hintMore} onClick={onAskMore} disabled={asking}>
              <Search size={12} aria-hidden /> {asking ? 'Thinking…' : 'Dig deeper'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
