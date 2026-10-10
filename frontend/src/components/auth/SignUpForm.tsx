'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api';
import { IdCard, KeyRound, LoaderCircle, Stamp } from 'lucide-react';
import PasswordField from './PasswordField';
import PasswordStrength from './PasswordStrength';
import TermsModal from './TermsModal';
import VerificationModal from './VerificationModal';
import { EMAIL_RE, passwordMeetsPolicy } from './passwordPolicy';
import styles from './auth.module.css';

interface SignUpFormData {
  firstName: string; lastName: string; email: string; password: string; passwordConfirm: string;
}

type EmailStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'error';

const EMAIL_TAKEN_MSG = 'Cadet email is already registered in the Bureau database.';

export default function SignUpForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<SignUpFormData>({
    firstName: '', lastName: '', email: '', password: '', passwordConfirm: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle');
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [verifyNotice, setVerifyNotice] = useState('');
  const checkAbort = useRef<AbortController | null>(null);
  const lastChecked = useRef('');  // skip duplicate checks (debounce + blur)

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'email') { setEmailStatus('idle'); lastChecked.current = ''; }
  };

  // ── Async email availability check (debounced while typing, immediate on blur) ──
  const checkEmail = useCallback(async (raw: string) => {
    const email = raw.trim();
    if (!email) { setEmailStatus('idle'); return; }
    if (!EMAIL_RE.test(email)) { setEmailStatus('invalid'); return; }
    if (email.toLowerCase() === lastChecked.current) return;
    lastChecked.current = email.toLowerCase();
    checkAbort.current?.abort();
    const ctrl = new AbortController();
    checkAbort.current = ctrl;
    setEmailStatus('checking');
    try {
      const res = await fetch(`${API_BASE}/auth/check-email/?email=${encodeURIComponent(email)}`, { signal: ctrl.signal });
      if (!res.ok) { lastChecked.current = ''; setEmailStatus('error'); return; }
      const data = await res.json();
      setEmailStatus(data.available ? 'available' : 'taken');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') { lastChecked.current = ''; setEmailStatus('error'); }
    }
  }, []);

  useEffect(() => {
    if (!formData.email.trim()) return;
    const t = setTimeout(() => { void checkEmail(formData.email); }, 500);
    return () => clearTimeout(t);
  }, [formData.email, checkEmail]);

  useEffect(() => () => checkAbort.current?.abort(), []);

  const passwordsMismatch =
    formData.password.length > 0 &&
    formData.passwordConfirm.length > 0 &&
    formData.password !== formData.passwordConfirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const { firstName, lastName, email, password, passwordConfirm } = formData;
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !passwordConfirm) { setError('ALL FIELDS ARE REQUIRED.'); return; }
    if (!EMAIL_RE.test(email.trim())) { setError('PLEASE ENTER A VALID EMAIL ADDRESS.'); return; }
    if (emailStatus === 'taken') { setError(EMAIL_TAKEN_MSG.toUpperCase()); return; }
    if (password !== passwordConfirm) { setError('PASSWORDS DO NOT MATCH.'); return; }
    if (!passwordMeetsPolicy(password)) { setError('PASSWORD DOES NOT MEET ALL SECURITY REQUIREMENTS.'); return; }
    if (!agreedToTerms) { setError('YOU MUST AGREE TO THE BUREAU FIELD RULES & TERMS OF SERVICE.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, email, password, password_confirm: passwordConfirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'email_taken') setEmailStatus('taken');
        setError(data.error || JSON.stringify(data));
        return;
      }
      // New flow: account is created unverified → enter the emailed code
      if (data.status === 'unverified') {
        setSuccess('INDUCTION FORM FILED — VERIFY YOUR EMAIL TO CONTINUE.');
        setVerifyNotice(data.email_sent === false ? "We couldn't send the email just now — use \"Resend code\"." : '');
        setVerifyEmail(data.email || email.trim().toLowerCase());
        return;
      }
      // Backwards compatible: a backend that still returns tokens directly
      localStorage.setItem('accessToken', data.tokens.access);
      localStorage.setItem('refreshToken', data.tokens.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));
      setSuccess('ENROLLMENT SUCCESSFUL — REDIRECTING...');
      setTimeout(() => router.push('/dashboard'), 1200);
    } catch {
      setError('COULD NOT REACH THE SERVER. PLEASE CHECK YOUR CONNECTION.');
    } finally {
      setLoading(false);
    }
  };

  const emailHint = {
    idle: null,
    invalid: <p className={styles.fieldHint}>Enter a valid email address.</p>,
    checking: (
      <p className={`${styles.fieldHint} ${styles.fieldHintMuted}`}>
        <LoaderCircle size={11} className={styles.spin} aria-hidden /> Checking Bureau records…
      </p>
    ),
    available: <p className={`${styles.fieldHint} ${styles.fieldHintOk}`}>Email clear for enrollment.</p>,
    taken: <p className={styles.fieldHint} role="alert">{EMAIL_TAKEN_MSG}</p>,
    error: null, // network hiccup: the server re-checks on submit anyway
  }[emailStatus];

  return (
    <div>
      {/* Form header with CONFIDENTIAL stamp + Inspector Crit's tip */}
      <div className={styles.formHead}>
        <div className={styles.formTitle}>FIELD CADET INDUCTION FORM</div>
        <span className={styles.stamp} aria-hidden>CONFIDENTIAL</span>
        <p className={styles.tip}>Fill in all credentials carefully, Cadet. — Inspector Crit</p>
      </div>

      {/* Messages */}
      {error && <div className={`${styles.msg} ${styles.msgErr}`} role="alert">{error}</div>}
      {success && <div className={`${styles.msg} ${styles.msgOk}`} role="status">{success}</div>}

      {/* noValidate: our themed checks below replace the browser's native bubbles */}
      <form onSubmit={handleSubmit} noValidate>
        {/* Section: identity */}
        <div className={styles.sec}>
          <IdCard size={14} aria-hidden />
          <span>CADET IDENTITY</span>
          <div className={styles.secLine} />
        </div>

        <div className={styles.twoCol}>
          <div className={styles.field}>
            <label className={styles.lbl} htmlFor="su-first">FIRST NAME</label>
            <input id="su-first" className={styles.inp} type="text" name="firstName" value={formData.firstName} onChange={handle} autoComplete="given-name" required />
          </div>
          <div className={styles.field}>
            <label className={styles.lbl} htmlFor="su-last">LAST NAME</label>
            <input id="su-last" className={styles.inp} type="text" name="lastName" value={formData.lastName} onChange={handle} autoComplete="family-name" required />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.lbl} htmlFor="su-email">EMAIL ADDRESS</label>
          <input
            id="su-email"
            className={`${styles.inp} ${emailStatus === 'taken' || emailStatus === 'invalid' ? styles.inpError : ''}`}
            type="email"
            name="email"
            value={formData.email}
            onChange={handle}
            onBlur={() => { void checkEmail(formData.email); }}
            autoComplete="email"
            aria-invalid={emailStatus === 'taken' || emailStatus === 'invalid'}
            required
          />
          {emailHint}
        </div>

        {/* Section: credentials */}
        <div className={styles.sec}>
          <KeyRound size={14} aria-hidden />
          <span>SECURITY CLEARANCE CREDENTIALS</span>
          <div className={styles.secLine} />
        </div>

        <div className={styles.twoCol}>
          <PasswordField
            id="su-pass"
            label="PASSWORD"
            name="password"
            value={formData.password}
            onChange={handle}
            visible={showPassword}
            onToggleVisible={() => setShowPassword((v) => !v)}
            autoComplete="new-password"
          />
          <PasswordField
            id="su-pass2"
            label="CONFIRM PASSWORD"
            name="passwordConfirm"
            value={formData.passwordConfirm}
            onChange={handle}
            visible={showConfirmPassword}
            onToggleVisible={() => setShowConfirmPassword((v) => !v)}
            autoComplete="new-password"
          />
        </div>
        <PasswordStrength password={formData.password} />
        {passwordsMismatch && (
          <p className={styles.fieldHint} role="status">Passphrases don&apos;t match yet.</p>
        )}

        {/* Terms & Conditions */}
        <div className={styles.terms}>
          <input
            id="su-terms"
            type="checkbox"
            className={styles.checkbox}
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
          />
          <label htmlFor="su-terms" className={styles.termsLabel}>
            I agree to the{' '}
            <button type="button" className={styles.termsLink} onClick={() => setShowTerms(true)}>
              Bureau Field Rules &amp; Terms of Service
            </button>
          </label>
        </div>
        {!agreedToTerms && (
          <p className={styles.termsNote}>Tick the box to file your induction form.</p>
        )}

        <div className={styles.subWrap}>
          <button type="submit" disabled={loading || !agreedToTerms || emailStatus === 'taken'} className={styles.btn}>
            <Stamp size={16} aria-hidden />
            {loading ? 'Stamping…' : 'Stamp & Enroll'}
          </button>
        </div>
      </form>

      <TermsModal
        open={showTerms}
        onClose={() => setShowTerms(false)}
        onAccept={() => setAgreedToTerms(true)}
      />
      <VerificationModal
        open={verifyEmail !== null}
        email={verifyEmail ?? ''}
        notice={verifyNotice}
        onClose={() => setVerifyEmail(null)}
      />
    </div>
  );
}
