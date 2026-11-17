import { MAX_HINTS_PER_QUESTION } from './useCaseHints'
import styles from './caseHints.module.css'

/** Hints left on this case, pinned to the corner of the Hint side tab (always visible, even retracted). */
export default function HintCounter({ remaining }: { remaining: number }) {
  return (
    <span className={`${styles.counter} ${remaining <= 0 ? styles.counterSpent : ''}`} aria-hidden>
      {remaining}/{MAX_HINTS_PER_QUESTION}
    </span>
  )
}

/** Side tab label, e.g. "Hints 2/3"; screen readers get the full sentence. */
export function hintTabLabel(remaining: number) {
  return `Hints ${remaining}/${MAX_HINTS_PER_QUESTION}`
}

export function hintTabTitle(remaining: number) {
  return remaining > 0
    ? `Hint (${remaining} of ${MAX_HINTS_PER_QUESTION} left for this case)`
    : 'No hints left for this case: re-read the hints you unlocked'
}
