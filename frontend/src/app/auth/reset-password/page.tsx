'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Crosshair, KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import InspectorCrit from '@/components/brand/InspectorCrit';
import PasswordField from '@/components/auth/PasswordField';
import PasswordStrength from '@/components/auth/PasswordStrength';
import { passwordMeetsPolicy } from '@/components/auth/passwordPolicy';
import desk from '@/components/dashboard/desk.module.css';
import styles from '@/components/auth/auth.module.css';

/** Reset form reached from the "PASSPHRASE RESET" email link (?token=…&uid=…). */
function ResetPassphraseForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const uid = params.get('uid') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState(token && uid ? '' : 'This reset link is incomplete. Request a new one from Sign In.');
  const [linkDead, setLinkDead] = useState(!(token && uid));
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const mismatch = password.length > 0 && confirm.length > 0 && password !== confirm;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password || !confirm) { setError('BOTH FIELDS ARE REQUIRED.'); return; }
    if (password !== confirm) { setError('PASSWORDS DO NOT MATCH.'); return; }
    if (!passwordMeetsPolicy(password)) { setError('PASSWORD DOES NOT MEET ALL SECURITY REQUIREMENTS.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, token, new_password: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === 'invalid_link' || data.code === 'expired') setLinkDead(true);
        setError(res.status === 429 ? 'TOO MANY ATTEMPTS. PLEASE TRY AGAIN LATER.' : (data.error || 'RESET FAILED.'));
        return;
      }
      setSuccess('PASSPHRASE UPDATED — REDIRECTING TO SIGN IN...');
      setTimeout(() => router.push('/auth?mode=signin'), 1800);
    } catch {
      setError('COULD NOT REACH THE SERVER. PLEASE CHECK YOUR CONNECTION.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className={styles.formHead}>
        <div className={styles.formTitle}>PASSPHRASE RESET ORDER</div>
        <span className={styles.stamp} aria-hidden>{success ? 'APPROVED' : 'RESTRICTED'}</span>
        <p className={styles.tip}>Choose a passphrase no suspect could guess. — Inspector Crit</p>
      </div>

      {error && <div className={`${styles.msg} ${styles.msgErr}`} role="alert">{error}</div>}
      {success && <div className={`${styles.msg} ${styles.msgOk}`} role="status">{success}</div>}

      {linkDead ? (
        <div className={styles.verifyPanel}>
          <p className={styles.verifyHint}>
            Use <strong>Forgot Password?</strong> on the Sign In tab to request a fresh link.
          </p>
          <Link href="/auth?mode=signin" className={styles.btn}>Return to Sign In</Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className={styles.sec}>
            <KeyRound size={14} aria-hidden />
            <span>NEW SECURITY CLEARANCE CREDENTIALS</span>
            <div className={styles.secLine} />
          </div>

          <div className={styles.twoCol}>
            <PasswordField
              id="rp-pass"
              label="NEW PASSWORD"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              visible={showPassword}
              onToggleVisible={() => setShowPassword((v) => !v)}
              autoComplete="new-password"
            />
            <PasswordField
              id="rp-pass2"
              label="CONFIRM PASSWORD"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              visible={showConfirm}
              onToggleVisible={() => setShowConfirm((v) => !v)}
              autoComplete="new-password"
            />
          </div>
          <PasswordStrength password={password} />
          {mismatch && <p className={styles.fieldHint} role="status">Passphrases don&apos;t match yet.</p>}

          <div className={styles.subWrap}>
            <button type="submit" className={styles.btn} disabled={loading || !!success}>
              <ShieldCheck size={16} aria-hidden />
              {loading ? 'Updating…' : 'Update Passphrase'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main data-auth className={`${desk.desk} ${styles.page}`}>
      <div className={desk.vignette} aria-hidden />
      <div className={desk.lamp} aria-hidden />

      <div className={styles.brand}>
        <InspectorCrit height={48} priority />
        <Crosshair size={17} color="#9e2a2b" aria-hidden />
        CRITICA
        <span className={styles.brandSub}>{'// PASSPHRASE RESET'}</span>
      </div>

      <div className={styles.folderUnit}>
        <div className={styles.folder} style={{ minHeight: 0 }}>
          <div className={styles.dossierBar}>
            <span>RECRUITMENT DOSSIER {'//'} CREDENTIAL RECOVERY</span>
          </div>
          <div className={styles.folderScroll}>
            <Suspense fallback={<div className={styles.verifyPanel}><LoaderCircle size={30} className={styles.spin} aria-hidden /></div>}>
              <ResetPassphraseForm />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}
