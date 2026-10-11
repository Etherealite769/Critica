'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { KeyRound, MailCheck, X } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { EMAIL_RE } from './passwordPolicy';
import styles from './auth.module.css';

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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email.trim())) { setError('PLEASE ENTER A VALID EMAIL ADDRESS.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      // Read as text first so non-JSON error pages are still reported
      const raw = await res.text();
      let data: { message?: string; error?: string; detail?: string } = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { /* non-JSON body */ }
      if (!res.ok) {
        console.error('[forgot-password] request failed', { status: res.status, payload: data, body: raw.slice(0, 500) });
        if (res.status === 429) { setError('TOO MANY REQUESTS. PLEASE TRY AGAIN LATER.'); return; }
        setError((data.detail || data.error || `COULD NOT FILE THE REQUEST (HTTP ${res.status}).`).toUpperCase());
        return;
      }
      setSentMessage(data.message || 'If that cadet email is registered, a passphrase reset link is on its way.');
    } catch {
      setError('COULD NOT REACH THE SERVER. PLEASE CHECK YOUR CONNECTION.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles.verifyModal}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgot-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHead}>
          <h2 id="forgot-title" className={styles.modalTitle}>
            <KeyRound size={16} aria-hidden /> PASSPHRASE RECOVERY
          </h2>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close passphrase recovery">
            <X size={16} aria-hidden />
          </button>
        </div>

        {sentMessage ? (
          <>
            <div className={styles.verifyStampWrap}>
              <span className={`${styles.stamp} ${styles.verifyStamp}`} aria-hidden>REQUEST FILED</span>
            </div>
            <p className={styles.verifyText} role="status">
              <MailCheck size={15} aria-hidden style={{ verticalAlign: '-3px', marginRight: 6 }} />
              {sentMessage}
            </p>
            <p className={styles.verifyHint}>The link expires in 30 minutes and works once. Check your spam folder too.</p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btn} onClick={onClose}>Back to Sign In</button>
            </div>
          </>
        ) : (
          <form onSubmit={submit} noValidate>
            <p className={styles.verifyText}>
              Enter your registered cadet email and the Bureau will send a single-use reset link.
            </p>
            {error && <div className={`${styles.msg} ${styles.msgErr}`} role="alert">{error}</div>}
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
              <button type="submit" className={styles.btn} disabled={loading}>
                {loading ? 'Filing…' : 'Send Reset Link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
