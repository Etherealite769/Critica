'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import InspectorCrit from '@/components/brand/InspectorCrit';
import { Crosshair, FolderLock, Paperclip } from 'lucide-react';
import SignUpForm from '@/components/auth/SignUpForm';
import SignInForm from '@/components/auth/SignInForm';
import desk from '@/components/dashboard/desk.module.css';
import styles from '@/components/auth/auth.module.css';

// Red-string pins around the dossier: [left %, top %, pin colour]
const PINS: [number, number, 'red' | 'amber'][] = [
  [3, 6, 'red'],
  [97, 12, 'red'],
  [2, 90, 'amber'],
  [98, 78, 'red'],
];

export default function AuthPage() {
  // useSearchParams needs a Suspense boundary for static prerendering
  return (
    <Suspense fallback={null}>
      <AuthDossier />
    </Suspense>
  );
}

function AuthDossier() {
  // /auth?mode=signin opens the Sign In tab (e.g. after a passphrase reset)
  const initialMode = useSearchParams().get('mode') === 'signin' ? 'signin' : 'signup';
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>(initialMode);

  return (
    <main data-auth className={`${desk.desk} ${styles.page}`}>
      <div className={desk.vignette} aria-hidden />
      <div className={desk.lamp} aria-hidden />

      {/* Bureau header */}
      <div className={styles.brand}>
        <InspectorCrit height={48} priority />
        <Crosshair size={17} color="#9e2a2b" aria-hidden />
        CRITICA
        <span className={styles.brandSub}>{'// CADET ENROLLMENT'}</span>
      </div>

      <div className={styles.folderUnit}>

        {/* Red forensic string from the dossier to the board */}
        <div className={styles.strings} aria-hidden>
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <g stroke="#c22b2d" strokeWidth="2" fill="none" opacity="0.85">
              <path d="M3 6 Q 10 20 18 22" vectorEffect="non-scaling-stroke" />
              <path d="M97 12 Q 90 26 83 28" vectorEffect="non-scaling-stroke" />
              <path d="M2 90 Q 10 80 18 76" vectorEffect="non-scaling-stroke" />
              <path d="M98 78 Q 90 70 83 66" vectorEffect="non-scaling-stroke" />
              <path d="M3 6 Q 1 50 2 90" vectorEffect="non-scaling-stroke" />
            </g>
          </svg>
          {PINS.map(([x, y, c]) => (
            <span
              key={`${x}-${y}`}
              className={`${styles.pin} ${c === 'amber' ? styles.pinAmber : ''}`}
              style={{ left: `${x}%`, top: `${y}%` }}
            />
          ))}
        </div>

        {/* Folder Tabs */}
        <div className={styles.tabRow} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={authMode === 'signup'}
            onClick={() => setAuthMode('signup')}
            className={`${styles.tab} ${authMode === 'signup' ? styles.tabActive : styles.tabInactive}`}
          >
            {authMode === 'signup' && <Paperclip size={24} strokeWidth={1.75} className={styles.tabClip} aria-hidden />}
            SIGN UP
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={authMode === 'signin'}
            onClick={() => setAuthMode('signin')}
            className={`${styles.tab} ${authMode === 'signin' ? styles.tabActive : styles.tabInactive}`}
          >
            {authMode === 'signin' && <Paperclip size={24} strokeWidth={1.75} className={styles.tabClip} aria-hidden />}
            SIGN IN
          </button>
        </div>

        {/* Recruitment dossier */}
        <div className={styles.folder}>
          <Paperclip size={36} strokeWidth={1.6} className={styles.folderClip} aria-hidden />

          {/* Binder rings */}
          <div className={styles.rings} aria-hidden>
            <div className={styles.ring} />
            <div className={styles.ring} />
            <div className={styles.ring} />
            <div className={styles.ring} />
          </div>

          <div className={styles.dossierBar}>
            <span>
              <FolderLock size={14} color="#4e3629" aria-hidden />
              RECRUITMENT DOSSIER {'//'} PERSONNEL FILE
            </span>
            <span className={styles.fileNo}>
              FILE NO. {authMode === 'signup' ? 'CR-NEW' : 'CR-ACT'}
            </span>
          </div>

          {/* Same locked dossier for both tabs; the form fades in on switch */}
          <div className={styles.folderScroll}>
            <div key={authMode} className={styles.formSwap}>
              {authMode === 'signup' ? <SignUpForm /> : <SignInForm />}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
