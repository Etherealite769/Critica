'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api';
import { IdCard, KeyRound, MailWarning, ShieldCheck } from 'lucide-react';
import PasswordField from './PasswordField';
import VerificationModal from './VerificationModal';
import styles from './auth.module.css';

export default function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Set when the account exists but its email isn't verified yet
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [resendOnOpen, setResendOnOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setPendingEmail(null);
    if (!email || !password) { setError('EMAIL AND PASSWORD ARE REQUIRED.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.status === 403 && data.code === 'email_unverified') {
        setPendingEmail(data.email || email.trim().toLowerCase());
        return;
      }
      if (!res.ok) { setError(data.error || data.detail || 'LOGIN FAILED. PLEASE CHECK YOUR CREDENTIALS.'); return; }
      localStorage.setItem('accessToken', data.tokens.access);
      localStorage.setItem('refreshToken', data.tokens.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));
      setSuccess('AUTHENTICATION SUCCESSFUL — REDIRECTING...');
      setTimeout(() => router.push('/dashboard'), 1200);
    } catch {
      setError('COULD NOT REACH THE SERVER. PLEASE CHECK YOUR CONNECTION.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Form header with clearance stamp + Inspector Crit's tip */}
      <div className={styles.formHead}>
        <div className={styles.formTitle}>FIELD INVESTIGATOR LOGIN</div>
        <span className={`${styles.stamp} ${styles.stampLong}`} aria-hidden>SECURITY CLEARANCE VERIFICATION</span>
        <p className={styles.tip}>Accessing classified case files requires clearance. — Inspector Crit</p>
      </div>

      {/* Messages */}
      {error && <div className={`${styles.msg} ${styles.msgErr}`} role="alert">{error}</div>}
      {success && <div className={`${styles.msg} ${styles.msgOk}`} role="status">{success}</div>}

      {/* Unverified account: prompt to verify or resend */}
      {pendingEmail && (
        <div className={styles.pendingBox} role="alert">
          <MailWarning size={16} aria-hidden className={styles.pendingIcon} />
          <div>
            <p className={styles.pendingText}>
              Account pending verification. Check your email or resend verification link.
            </p>
            <div className={styles.pendingActions}>
              <button
                type="button"
                className={styles.termsLink}
                onClick={() => { setResendOnOpen(true); setVerifyOpen(true); }}
              >
                Resend verification
              </button>
              <span aria-hidden>·</span>
              <button
                type="button"
                className={styles.termsLink}
                onClick={() => { setResendOnOpen(false); setVerifyOpen(true); }}
              >
                I have a code
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Section: identity */}
        <div className={styles.sec}>
          <IdCard size={14} aria-hidden />
          <span>AGENT IDENTIFICATION</span>
          <div className={styles.secLine} />
        </div>

        <div className={styles.field}>
          <label className={styles.lbl} htmlFor="si-email">CADET EMAIL</label>
          <input
            id="si-email"
            className={styles.inp}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address here..."
            autoComplete="email"
            required
          />
        </div>

        {/* Section: credentials */}
        <div className={styles.sec}>
          <KeyRound size={14} aria-hidden />
          <span>SECURITY CLEARANCE CREDENTIALS</span>
          <div className={styles.secLine} />
        </div>

        <PasswordField
          id="si-pass"
          label="SECURITY PASSPHRASE"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          visible={showPassword}
          onToggleVisible={() => setShowPassword((v) => !v)}
          placeholder="Enter password here..."
          autoComplete="current-password"
        />

        {/* Forgot password — right aligned */}
        <div className={styles.fgtRow}>
          <button type="button" className={styles.fgt} onClick={() => alert('Password recovery coming soon!')}>
            Forgot Password?
          </button>
        </div>

        <div className={styles.subWrap}>
          <button type="submit" disabled={loading} className={styles.btn}>
            <ShieldCheck size={16} aria-hidden />
            {loading ? 'Verifying…' : 'Verify Credentials & Enter'}
          </button>
        </div>
      </form>

      <VerificationModal
        open={verifyOpen && pendingEmail !== null}
        email={pendingEmail ?? ''}
        resendOnOpen={resendOnOpen}
        onClose={() => setVerifyOpen(false)}
      />
    </div>
  );
}
