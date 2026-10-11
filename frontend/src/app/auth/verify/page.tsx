'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import InspectorCrit from '@/components/brand/InspectorCrit';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Crosshair, LoaderCircle, ShieldCheck, ShieldX } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { markInductionPending } from '@/lib/induction';
import desk from '@/components/dashboard/desk.module.css';
import styles from '@/components/auth/auth.module.css';

type Phase = 'verifying' | 'success' | 'error';

/** One-click verification link from the "CRITICA BUREAU CLEARANCE" email. */
function VerifyToken() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [phase, setPhase] = useState<Phase>(token ? 'verifying' : 'error');
  const [message, setMessage] = useState(token ? '' : 'This verification link is missing its token.');
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true; // avoid a double submit in React strict mode
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/verify-email/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setPhase('error');
          setMessage(data.error || 'Verification failed.');
          return;
        }
        localStorage.setItem('accessToken', data.tokens.access);
        localStorage.setItem('refreshToken', data.tokens.refresh);
        localStorage.setItem('user', JSON.stringify(data.user));
        markInductionPending(); // brand-new cadet → Field Induction on first dashboard visit
        setPhase('success');
        setTimeout(() => router.push('/dashboard'), 1400);
      } catch {
        setPhase('error');
        setMessage('COULD NOT REACH THE SERVER. PLEASE CHECK YOUR CONNECTION.');
      }
    })();
  }, [token, router]);

  return (
    <div className={styles.verifyPanel}>
      {phase === 'verifying' && (
        <>
          <LoaderCircle size={30} className={styles.spin} aria-hidden />
          <p className={styles.verifyText}>Checking your clearance with the Bureau…</p>
        </>
      )}
      {phase === 'success' && (
        <>
          <span className={`${styles.stamp} ${styles.verifyStamp}`} aria-hidden>CLEARANCE GRANTED</span>
          <ShieldCheck size={30} color="#2f6418" aria-hidden />
          <p className={styles.verifyText} role="status">Email verified. Opening your case files…</p>
        </>
      )}
      {phase === 'error' && (
        <>
          <span className={`${styles.stamp} ${styles.verifyStamp}`} aria-hidden>ACCESS DENIED</span>
          <ShieldX size={30} color="#9e2a2b" aria-hidden />
          <p className={styles.verifyText} role="alert">{message}</p>
          <p className={styles.verifyHint}>
            Sign in to request a new code, or enter the 6-digit code from your email.
          </p>
          <Link href="/auth" className={styles.btn}>Return to Enrollment</Link>
        </>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <main data-auth className={`${desk.desk} ${styles.page}`}>
      <div className={desk.vignette} aria-hidden />
      <div className={desk.lamp} aria-hidden />

      <div className={styles.brand}>
        <InspectorCrit height={48} priority />
        <Crosshair size={17} color="#9e2a2b" aria-hidden />
        CRITICA
        <span className={styles.brandSub}>{'// EMAIL VERIFICATION'}</span>
      </div>

      <div className={styles.folderUnit}>
        <div className={styles.folder} style={{ minHeight: 0 }}>
          <div className={styles.dossierBar}>
            <span>RECRUITMENT DOSSIER {'//'} CLEARANCE CHECK</span>
          </div>
          <Suspense fallback={<div className={styles.verifyPanel}><LoaderCircle size={30} className={styles.spin} aria-hidden /></div>}>
            <VerifyToken />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
