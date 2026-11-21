import { CREDIT_LOST_NOTICE } from '@/lib/attemptCredit'
import styles from './CreditLostNotice.module.css'

/** Manila-dossier stamp shown once attempt 3 has failed: the case stays playable but no longer earns credit. */
export default function CreditLostNotice() {
  return (
    <span className={styles.notice} role="status" data-testid="credit-lost">
      {CREDIT_LOST_NOTICE}
    </span>
  )
}
