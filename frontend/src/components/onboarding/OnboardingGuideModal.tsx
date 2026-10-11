'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BadgeCheck, BookOpen, CircleCheck, ClipboardList, FileText, Flame,
  Lock, LayoutDashboard, Network, Puzzle, ScanSearch, Search, ShieldAlert, ShieldCheck,
  Activity, Trophy, X, Zap, type LucideIcon,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { markInductionComplete } from '@/lib/induction';
import InspectorCrit from '@/components/brand/InspectorCrit';
import InteractiveDemoSandbox from './InteractiveDemoSandbox';
import styles from './fieldguide.module.css';

interface OnboardingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
  studentId?: string;
  onStartFirstNode?: () => void;
}

const STEPS = [
  { label: 'Welcome & Overview',   short: 'WELCOME' },
  { label: 'Dashboard Navigation', short: 'DASHBOARD' },
  { label: 'Live Simulator',       short: 'SIMULATOR' },
  { label: 'Clearance Confirmation', short: 'CLEARANCE' },
] as const;

const DISCIPLINES: { icon: LucideIcon; case: string; title: string; desc: string }[] = [
  { icon: Network,    case: 'CASE 01', title: 'Text Structure',
    desc: 'Thread shuffled paragraph cards into the right order — narration, definition, comparison, cause & effect.' },
  { icon: Puzzle,     case: 'CASE 02', title: 'Snap-in-Gap',
    desc: 'Snap the correct transition word into each gap: contrast, addition, result or conclusion.' },
  { icon: Search,     case: 'CASE 03', title: 'Tap the Clues',
    desc: 'Tap the context clues around a locked word to reveal its meaning and log it to your clipboard.' },
  { icon: ScanSearch, case: 'CASE 04', title: 'Fact Scanner',
    desc: 'Cross-examine an article with the CRAAP test and quarantine the unreliable sentences.' },
];

// Mirrors ProgressionManagementService.LEVEL_THRESHOLDS
const CLEARANCE_LEVELS = [
  { level: 1, title: 'Novice Analyst',      xp: 0 },
  { level: 2, title: 'Field Investigator',  xp: 800 },
  { level: 3, title: 'Senior Case Officer', xp: 2000 },
  { level: 4, title: 'Chief Inspector',     xp: 4000 },
  { level: 5, title: 'Bureau Chief',        xp: 7000 },
];

/** Field Induction — 4-step onboarding tour (first login + "Field Guide" button). */
export default function OnboardingGuideModal(props: OnboardingGuideModalProps) {
  // Mounted only while open, so every opening starts fresh at step 1
  if (!props.isOpen) return null;
  return <FieldInduction {...props} />;
}

function FieldInduction({
  onClose,
  studentName = 'Investigator',
  studentId = 'guest',
  onStartFirstNode,
}: OnboardingGuideModalProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'fwd' | 'back'>('fwd');
  const [demoCompleted, setDemoCompleted] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const isLast = step === STEPS.length - 1;

  const goTo = useCallback((next: number) => {
    if (next < 0 || next >= STEPS.length || next === step) return;
    setDirection(next > step ? 'fwd' : 'back');
    setStep(next);
  }, [step]);

  // Persist completion (localStorage guarantee + backend profile), then close
  const finish = useCallback(async (then?: () => void) => {
    setFinishing(true);
    markInductionComplete(studentId);
    try {
      await apiFetch('/progression/onboarding/complete/', { method: 'POST' });
    } catch {
      // Offline/guest: localStorage already records completion
    }
    setFinishing(false);
    onClose();
    then?.();
  }, [studentId, onClose]);

  // Keyboard: ← / → to navigate, Esc to skip
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finishing) return;
      if (e.key === 'Escape') { e.preventDefault(); void finish(); }
      else if (e.key === 'ArrowRight') goTo(step + 1);
      else if (e.key === 'ArrowLeft') goTo(step - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, finishing, finish, goTo]);

  useEffect(() => { dialogRef.current?.focus(); }, []);

  return (
    <div className={styles.overlay}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="induction-title"
        tabIndex={-1}
      >
        {/* ── Header ── */}
        <header className={styles.header}>
          <div className={styles.brand}>
            <InspectorCrit height={30} decorative />
            <span id="induction-title" className={styles.brandTitle}>CRITICA {'//'} FIELD INDUCTION</span>
            <span className={styles.classified}>CLASSIFIED · LEVEL 1</span>
          </div>
          <button type="button" className={styles.skipBtn} onClick={() => finish()} disabled={finishing}
                  title="Skip the briefing (Esc)">
            <X size={14} aria-hidden /> Skip Briefing
          </button>
        </header>

        {/* ── Step tracker ── */}
        <nav className={styles.stepper} aria-label="Induction steps">
          {STEPS.map((s, i) => {
            const state = i === step ? styles.stepActive : i < step ? styles.stepDone : '';
            return (
              <button
                key={s.short}
                type="button"
                className={`${styles.step} ${state}`}
                onClick={() => goTo(i)}
                aria-current={i === step ? 'step' : undefined}
              >
                <span className={styles.stepNum}>{i < step ? <CircleCheck size={13} aria-hidden /> : i + 1}</span>
                <span className={styles.stepLabel}>{s.label}</span>
              </button>
            );
          })}
          <div className={styles.stepTrack} aria-hidden>
            <div className={styles.stepTrackFill} style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
          </div>
        </nav>

        {/* ── Body (animated per step) ── */}
        <div className={styles.body}>
          <div key={step} className={`${styles.stepPane} ${direction === 'fwd' ? styles.slideFwd : styles.slideBack}`}>

            {step === 0 && (
              <>
                <CritSays>
                  <strong>Greetings, Investigator {studentName}.</strong>{' '}I&apos;m Inspector Crit, and this
                  is the Forensic Investigation Bureau. Every case here trains a critical-reading skill.
                  Here are the four disciplines you&apos;ll master.
                </CritSays>
                <div className={styles.sectionLabel}>YOUR 4 CORE DISCIPLINES</div>
                <div className={styles.disciplineGrid}>
                  {DISCIPLINES.map(({ icon: Icon, case: caseNo, title, desc }) => (
                    <article key={caseNo} className={styles.disciplineCard}>
                      <div className={styles.disciplineHead}>
                        <span className={styles.disciplineIcon}><Icon size={17} aria-hidden /></span>
                        <div>
                          <div className={styles.caseNo}>{caseNo}</div>
                          <div className={styles.disciplineTitle}>{title}</div>
                        </div>
                      </div>
                      <p className={styles.disciplineDesc}>{desc}</p>
                    </article>
                  ))}
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <CritSays>
                  <strong>The dossier board is your command centre.</strong> Pick a case file, open an
                  unlocked exhibit, and close cases to raise your clearance.
                </CritSays>
                <div className={styles.navGrid}>
                  <Highlight icon={LayoutDashboard} title="Case selection">
                    The four <em>CASE FILE</em> tabs switch disciplines. Exhibit cards inside show their status:
                    <span className={styles.pillRow}>
                      <span className={`${styles.pill} ${styles.pillClosed}`}><CircleCheck size={10} aria-hidden /> Case closed</span>
                      <span className={`${styles.pill} ${styles.pillOpen}`}><ShieldAlert size={10} aria-hidden /> Evidence unlocked</span>
                      <span className={`${styles.pill} ${styles.pillLocked}`}><Lock size={10} aria-hidden /> Classified</span>
                    </span>
                  </Highlight>
                  <Highlight icon={FileText} title="Opening a case">
                    Press <em>Open case file</em> on an unlocked exhibit. Each run is 5 exercises; closing it
                    unlocks the next exhibit in that case.
                  </Highlight>
                  <Highlight icon={Trophy} title="Clearance levels">
                    <span className={styles.levels}>
                      {CLEARANCE_LEVELS.map((l) => (
                        <span key={l.level} className={styles.level}>
                          <b>L{l.level}</b> {l.title} <i>{l.xp.toLocaleString()} XP</i>
                        </span>
                      ))}
                    </span>
                  </Highlight>
                  <Highlight icon={Flame} title="Streak & XP">
                    Train daily to grow your streak. Closing cases, flashcard reviews and daily check-ins
                    earn XP <Zap size={11} aria-hidden className={styles.inlineIcon} /> shown in the top bar.
                  </Highlight>
                  <Highlight icon={ClipboardList} title="Evidence board tools">
                    <em>Lexical Clipboard</em> (vocabulary flashcards), <em>Quick Review</em> (field manual &amp;
                    60s drill) and <em>Metric Log</em> <Activity size={11} aria-hidden className={styles.inlineIcon} /> live
                    in the right-hand sidebar.
                  </Highlight>
                  <Highlight icon={BookOpen} title="Field Guide">
                    Reopen this briefing any time from the <em>Field Guide</em> button in the top bar.
                  </Highlight>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <CritSays>
                  <strong>Hands-on practice — no grades, no pressure.</strong> Thread two evidence cards or
                  snap a transition into a gap to see how the cases play.
                </CritSays>
                <div className={styles.simulator}>
                  <InteractiveDemoSandbox onDemoCompleted={() => setDemoCompleted(true)} />
                </div>
              </>
            )}

            {step === 3 && (
              <div className={styles.clearance}>
                <span className={styles.stamp}>CLEARANCE APPROVED</span>
                <h2 className={styles.clearanceTitle}>FIELD INDUCTION COMPLETE</h2>
                <p className={styles.clearanceText}>
                  Well done, Investigator <strong>{studentName}</strong>. Your clearance is confirmed: the
                  first exhibit of every case file is unsealed on your dossier board.
                </p>
                <ul className={styles.clearanceList}>
                  <li><ShieldCheck size={14} aria-hidden /> Clearance Level 1 — Novice Analyst</li>
                  <li><BadgeCheck size={14} aria-hidden /> Case 01–04 starter exhibits unlocked</li>
                  {demoCompleted && <li><CircleCheck size={14} aria-hidden /> Simulator exercise completed</li>}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer controls ── */}
        <footer className={styles.footer}>
          <button type="button" className={styles.btnGhost} onClick={() => goTo(step - 1)}
                  disabled={step === 0 || finishing}>
            <ArrowLeft size={14} aria-hidden /> Previous
          </button>

          <span className={styles.counter}>STEP {step + 1} / {STEPS.length}</span>

          {isLast ? (
            <div className={styles.footerActions}>
              {onStartFirstNode && (
                <button type="button" className={styles.btnGhost} disabled={finishing}
                        onClick={() => finish(onStartFirstNode)}>
                  Start First Case
                </button>
              )}
              <button type="button" className={styles.btnPrimary} disabled={finishing} onClick={() => finish()}>
                <ShieldCheck size={15} aria-hidden /> {finishing ? 'Filing…' : 'Complete Induction'}
              </button>
            </div>
          ) : (
            <button type="button" className={styles.btnPrimary} onClick={() => goTo(step + 1)} disabled={finishing}>
              Next Step <ArrowRight size={14} aria-hidden />
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function CritSays({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.crit}>
      <div className={styles.critAvatar}>
        <InspectorCrit height={64} />
        <span className={styles.critName}>INSPECTOR CRIT</span>
      </div>
      <p className={styles.critBubble}>{children}</p>
    </div>
  );
}

function Highlight({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <section className={styles.highlight}>
      <h3 className={styles.highlightTitle}><Icon size={14} aria-hidden /> {title}</h3>
      <div className={styles.highlightBody}>{children}</div>
    </section>
  );
}
