'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { MailCheck, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import styles from './auth.module.css';

interface VerificationModalProps {
  open: boolean;
  email: string;
  onClose: () => void;
  /** Request a fresh code as soon as the modal opens (Sign In "resend" path). */
  resendOnOpen?: boolean;
  /** Shown above the code box, e.g. when the first email failed to send. */
  notice?: string;
}

const RESEND_SECONDS = 60;

/**
 * "VERIFICATION SENT" dossier: enter the 6-digit code emailed to the cadet.
 * On success it stores the session exactly like a normal login and redirects.
 */
export default function VerificationModal(props: VerificationModalProps) {
  if (!props.open || typeof document === 'undefined') return null;
  return createPortal(<VerificationDialog {...props} />, document.body);
}

function VerificationDialog({ email, onClose, resendOnOpen, notice }: VerificationModalProps) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [verifying, setVerifying] = useState(false);
  // A code was just emailed at registration, so start the resend cooldown;
  // on the Sign In 'resend' path we request one immediately instead.
  const [cooldown, setCooldown] = useState(resendOnOpen ? 0 : RESEND_SECONDS);
  const resentOnce = useRef(false);

  // countdown for the resend button
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Only sets state after the request resolves (safe to call from an effect)
  const resend = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/resend-verification/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setCooldown(Number(data.retry_after) || RESEND_SECONDS);
        setError(data.error || 'Please wait before requesting another code.');
        return;
      }
      if (!res.ok) { setError(data.error || 'Could not resend the code.'); return; }
      setError('');
      setInfo('A new code is on its way to your inbox.');
      setCooldown(RESEND_SECONDS);
    } catch {
      setError('COULD NOT REACH THE SERVER. PLEASE CHECK YOUR CONNECTION.');
    }
  }, [email]);

  // Sign In 'resend verification' path: request a fresh code once on mount
  useEffect(() => {
    if (resendOnOpen && !resentOnce.current) {
      resentOnce.current = true;
      void resend();
    }
  }, [resendOnOpen, resend]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setInfo('');
    if (!/^\d{6}$/.test(code)) { setError('ENTER THE 6-DIGIT CODE FROM YOUR EMAIL.'); return; }
    setVerifying(true);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-email/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'VERIFICATION FAILED.'); return; }
      localStorage.setItem('accessToken', data.tokens.access);
      localStorage.setItem('refreshToken', data.tokens.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));
      setInfo('CLEARANCE GRANTED — REDIRECTING...');
      setTimeout(() => router.push('/dashboard'), 1000);
    } catch {
      setError('COULD NOT REACH THE SERVER. PLEASE CHECK YOUR CONNECTION.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles.verifyModal}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="verify-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHead}>
          <h2 id="verify-title" className={styles.modalTitle}>
            <MailCheck size={16} aria-hidden /> EMAIL VERIFICATION
          </h2>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close verification">
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className={styles.verifyStampWrap}>
          <span className={`${styles.stamp} ${styles.verifyStamp}`} aria-hidden>VERIFICATION SENT</span>
        </div>

        <p className={styles.verifyText}>
          Verification code sent to cadet inbox. Please verify your email to unlock access.
        </p>
        <p className={styles.verifyEmail}>{email}</p>

        {notice && <div className={`${styles.msg} ${styles.msgErr}`}>{notice}</div>}
        {error && <div className={`${styles.msg} ${styles.msgErr}`} role="alert">{error}</div>}
        {info && <div className={`${styles.msg} ${styles.msgOk}`} role="status">{info}</div>}

        <form onSubmit={verify} noValidate>
          <label className={styles.lbl} htmlFor="verify-code">6-DIGIT VERIFICATION CODE</label>
          <input
            id="verify-code"
            className={`${styles.inp} ${styles.codeInput}`}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            autoFocus
          />

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.modalSecondary}
              onClick={() => { setError(''); setInfo(''); void resend(); }}
              disabled={cooldown > 0}
            >
              <RotateCcw size={13} aria-hidden /> {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
            <button type="submit" className={styles.btn} disabled={verifying || code.length !== 6}>
              <ShieldCheck size={16} aria-hidden /> {verifying ? 'Verifying…' : 'Verify & Unlock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
