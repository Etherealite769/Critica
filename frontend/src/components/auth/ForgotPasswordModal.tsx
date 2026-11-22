'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { KeyRound, MailCheck, TimerReset, X } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { EMAIL_RE } from './passwordPolicy';
import styles from './auth.module.css';

/** One reset request per email per 60 s (the server enforces the same window and answers 429 inside it). */
const COOLDOWN_SECONDS = 60;
const GENERIC_SENT = 'If an account with that email exists, a password reset link has been sent.';

// The cooldown's end time is kept per normalized email in sessionStorage, so closing and reopening the modal (or
// reloading the page) cannot skip it. Storage can be unavailable (private mode): the in-memory state still works.
const cooldownKey = (email: string) => `critica.resetCooldown.${email.trim().toLowerCase()}`;
function readCooldownUntil(email: string): number {
  try { return Number(sessionStorage.getItem(cooldownKey(email))) || 0; } catch { return 0; }
}
function writeCooldownUntil(email: string, until: number) {
  try { sessionStorage.setItem(cooldownKey(email), String(until)); } catch { /* storage unavailable */ }
}

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
  /** Prefill with whatever the cadet already typed on the Sign In form. */
  initialEmail?: string;
}

/** "Forgot Password?" prompt: requests a reset link for the cadet's email. */
export default function ForgotPasswordModal(props: ForgotPasswordModalProps) {
  // Mounted only while open, so its state starts fresh each time
  if (!props.open || typeof document === 'undefined') return null;
  return createPortal(<ForgotPasswordDialog {...props} />, document.body);
}

function ForgotPasswordDialog({ onClose, initialEmail = '' }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState(initialEmail.trim());
  const [error, setError] = useState('');
  const [sentMessage, setSentMessage] = useState('');
  const [rateLimited, setRateLimited] = useState(false);   // the server refused a request inside the window
  const [loading, setLoading] = useState(false);
  // Cooldown end times set during this visit, per normalized email (sessionStorage keeps them across visits)
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => Date.now());

  const emailKey = email.trim().toLowerCase();
  const storedUntil = useMemo(() => readCooldownUntil(emailKey), [emailKey]);
  const cooldownUntil = Math.max(cooldowns[emailKey] || 0, storedUntil);
  const remaining = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const coolingDown = remaining > 0;

  // Tick while a cooldown runs, so the countdown is live (60s -> 59s -> ... -> 0s)
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const t = window.setInterval(() => {
      const t2 = Date.now();
      setNow(t2);
      if (t2 >= cooldownUntil) window.clearInterval(t);
    }, 250);
    return () => window.clearInterval(t);
  }, [cooldownUntil]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const startCooldown = (seconds: number) => {
    const until = Date.now() + Math.max(1, seconds) * 1000;
    writeCooldownUntil(emailKey, until);
    setCooldowns(prev => ({ ...prev, [emailKey]: until }));
    setNow(Date.now());
  };

  const requestLink = async () => {
    setError('');
    if (!EMAIL_RE.test(email.trim())) { setError('PLEASE ENTER A VALID EMAIL ADDRESS.'); return; }
    if (coolingDown) return;   // the button is disabled too; this guards Enter and double clicks
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      // Read as text first so non-JSON error pages are still reported
      const raw = await res.text();
      let data: { message?: string; error?: string; detail?: string; retry_after?: number } = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { /* non-JSON body */ }
      if (res.status === 429) {
        // Inside the 60 s window (another tab, a reload...): no new link was sent, so no confirmation either.
        // Sync the countdown to the server: its retry_after, else the Retry-After header (per-IP throttle).
        const header = Number(res.headers.get('Retry-After'));
        const seconds = Number(data.retry_after) || (Number.isFinite(header) && header > 0 ? header : COOLDOWN_SECONDS);
        startCooldown(Math.ceil(seconds));
        setSentMessage('');
        setRateLimited(true);
        return;
      }
      if (!res.ok) {
        console.error('[forgot-password] request failed', { status: res.status, payload: data, body: raw.slice(0, 500) });
        setError((data.detail || data.error || `COULD NOT FILE THE REQUEST (HTTP ${res.status}).`).toUpperCase());
        return;
      }
      // Same message whether or not the address has an account (the server never says which)
      setRateLimited(false);
      startCooldown(COOLDOWN_SECONDS);
      setSentMessage(data.message || GENERIC_SENT);
    } catch {
      setError('COULD NOT REACH THE SERVER. PLEASE CHECK YOUR CONNECTION.');
    } finally {
      setLoading(false);
    }
  };

  const submit = (e: React.FormEvent) => { e.preventDefault(); void requestLink(); };
  const waitLabel = `WAIT ${remaining}s TO REQUEST ANOTHER LINK`;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles.recoveryModal}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgot-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${styles.modalHead} ${styles.recoveryHead}`}>
          <h2 id="forgot-title" className={styles.modalTitle}>
            <KeyRound size={16} aria-hidden /> PASSPHRASE RECOVERY
          </h2>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close passphrase recovery">
            <X size={16} aria-hidden />
          </button>
        </div>

        {sentMessage ? (
          <>
            <div className={styles.recoveryStampWrap}>
              <span className={`${styles.stamp} ${styles.recoveryStamp}`} aria-hidden>REQUEST FILED</span>
            </div>
            <div className={styles.recoveryNotice} role="status">
              <p className={styles.recoveryNoticeHead}>
                <MailCheck size={16} aria-hidden className={styles.recoveryNoticeIcon} />
                <span>{sentMessage}</span>
              </p>
              <p className={styles.recoveryNoticeHint}>
                The link expires in 30 minutes and can only be used once. Be sure to check your spam or junk folder.
              </p>
            </div>
            <div className={styles.recoveryActions}>
              <button
                type="button"
                className={`${styles.recoveryBtn} ${styles.recoveryResend}`}
                onClick={() => void requestLink()}
                disabled={coolingDown || loading}
                aria-live="polite"
                aria-label={coolingDown ? waitLabel : 'Resend reset link'}
                data-testid="forgot-resend"
              >
                {loading ? 'Filing…' : coolingDown ? `Resend in ${remaining}s` : 'Resend reset link'}
              </button>
              <button type="button" className={`${styles.recoveryBtn} ${styles.recoveryPrimary}`} onClick={onClose}>
                Back to Sign In
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit} noValidate>
            <p className={styles.verifyText}>
              Enter your registered cadet email and the Bureau will send a single-use reset link.
            </p>
            {error && <div className={`${styles.msg} ${styles.msgErr}`} role="alert">{error}</div>}
            {coolingDown && (
              <div className={`${styles.msg} ${styles.msgErr}`} role="status" aria-live="polite" data-testid="forgot-cooldown">
                <TimerReset size={13} aria-hidden style={{ verticalAlign: '-2px', marginRight: 6 }} />
                {rateLimited
                  ? `TOO MANY REQUESTS. A RESET LINK WAS ALREADY REQUESTED. ${waitLabel}.`
                  : `A RESET LINK WAS JUST REQUESTED FOR THIS EMAIL. ${waitLabel}.`}
              </div>
            )}
            <label className={styles.lbl} htmlFor="forgot-email">CADET EMAIL</label>
            <input
              id="forgot-email"
              className={styles.inp}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address here..."
              autoFocus
            />
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalSecondary} onClick={onClose}>Cancel</button>
              <button type="submit" className={styles.btn} disabled={loading || coolingDown} data-testid="forgot-submit">
                {loading ? 'Filing…' : coolingDown ? `WAIT ${remaining}s` : 'Send Reset Link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
