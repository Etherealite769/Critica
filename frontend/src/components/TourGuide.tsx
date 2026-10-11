'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck, X } from 'lucide-react';
import InspectorCrit from '@/components/brand/InspectorCrit';

// ── Persistence ───────────────────────────────────────────────
export const TOUR_SEEN_KEY = 'hasSeenDashboardTour';

export function hasSeenDashboardTour(): boolean {
  try {
    return localStorage.getItem(TOUR_SEEN_KEY) === 'true';
  } catch {
    return false; // storage blocked (private mode, etc.)
  }
}

export function markDashboardTourSeen(): void {
  try {
    localStorage.setItem(TOUR_SEEN_KEY, 'true');
  } catch {
    // storage blocked: the tour may simply show again
  }
}

// ── Script ────────────────────────────────────────────────────
interface TourStep {
  /** `data-tour` values to spotlight (their union); none → centred briefing. */
  targets: string[];
  title: string;
  text: string;
  /** Shown instead of `text` when the target is hidden at this screen size. */
  fallback?: string;
}

const STEPS: TourStep[] = [
  {
    targets: ['brand-logo'],
    title: 'Welcome to the Bureau',
    text: "Good day, Cadet! Inspector Crit here to show you around the Bureau. Keep your magnifying glass handy — this won't take long.",
  },
  {
    targets: ['cadet-stats'],
    title: 'Your Service Record',
    text: 'Your daily streak, cases closed and XP live up here. Show up every day to keep the streak burning, and close cases to earn XP — enough of it raises your clearance rank from Novice Analyst all the way to Bureau Chief.',
  },
  {
    targets: ['field-guide-btn'],
    title: 'The Field Guide',
    text: "Lost your bearings? Press the Field Guide any time and I'll walk you through the Bureau again, step by step.",
  },
  {
    targets: ['user-profile'],
    title: 'Your Credentials',
    text: 'Your clearance credentials are pinned here. Open this menu for your account settings, another tour with me, or to sign off duty.',
  },
  {
    targets: ['game-mode-tabs'],
    title: 'The Four Disciplines',
    text: 'Each folder tab is a discipline: Text Structure, Snap-in-Gap transitions, Tap the Clues and the Fact Scanner. Flip between them whenever you like.',
  },
  {
    targets: ['case-exhibits'],
    title: 'Case Exhibits',
    text: 'Every exhibit is a case. Press OPEN CASE FILE to start one. CLASSIFIED files stay sealed until you close the case before them — solve your way up the tiers.',
  },
  {
    targets: ['inspector-note'],
    title: "Inspector's Notes",
    text: 'I scribble a live hint on each case folder. It changes with the discipline you have open, so glance at it before you dig in.',
    fallback: 'On wider screens I scribble a live hint in the corner of each case folder. It changes with the discipline you have open — widen the window to read it.',
  },
  {
    targets: ['lexical-clipboard'],
    title: 'Lexical Clipboard',
    text: 'Every word you crack with context clues is logged here as vocabulary evidence — the word, its meaning and the clues that gave it away.',
  },
  {
    targets: ['quick-review', 'metric-log'],
    title: 'Quick Review & Metric Log',
    text: 'Quick Review runs timed 60-second drills to keep your instincts sharp. The Metric Log audits your accuracy and XP, case by case. That concludes your induction, Cadet — the Bureau is yours.',
  },
];

// ── Geometry ──────────────────────────────────────────────────
const PAD = 8;      // spotlight padding around the target
const GAP = 14;     // distance between spotlight and dialog
const MARGIN = 16;  // keep the dialog this far from the viewport edge

interface Box { top: number; left: number; width: number; height: number }

/** Union of the visible targets' rects, clipped to the viewport; null if none are visible. */
function measure(targets: string[]): Box | null {
  let top = Infinity, left = Infinity, right = -Infinity, bottom = -Infinity;
  for (const id of targets) {
    const el = document.querySelector<HTMLElement>(`[data-tour="${id}"]`);
    const r = el?.getBoundingClientRect();
    if (!r || r.width === 0 || r.height === 0) continue; // missing or display:none
    top = Math.min(top, r.top);
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }
  if (top === Infinity) return null;
  top = Math.max(top, 0);
  left = Math.max(left, 0);
  right = Math.min(right, window.innerWidth);
  bottom = Math.min(bottom, window.innerHeight);
  return {
    top: top - PAD,
    left: left - PAD,
    width: right - left + PAD * 2,
    height: bottom - top + PAD * 2,
  };
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, Math.max(min, max)));

/** Below → above → right → left of the spotlight, whichever fits first. */
function placeDialog(spot: Box | null, w: number, h: number, vw: number, vh: number) {
  if (!spot) return { top: (vh - h) / 2, left: (vw - w) / 2 };
  const centerX = spot.left + spot.width / 2 - w / 2;
  const centerY = spot.top + spot.height / 2 - h / 2;
  const fitsX = (x: number) => x >= MARGIN && x + w <= vw - MARGIN;

  const below = spot.top + spot.height + GAP;
  if (below + h <= vh - MARGIN) return { top: below, left: clamp(centerX, MARGIN, vw - w - MARGIN) };
  const above = spot.top - GAP - h;
  if (above >= MARGIN) return { top: above, left: clamp(centerX, MARGIN, vw - w - MARGIN) };
  const right = spot.left + spot.width + GAP;
  if (fitsX(right)) return { top: clamp(centerY, MARGIN, vh - h - MARGIN), left: right };
  const left = spot.left - GAP - w;
  if (fitsX(left)) return { top: clamp(centerY, MARGIN, vh - h - MARGIN), left };
  // Nothing fits (huge target): float over its bottom edge
  return { top: vh - h - MARGIN, left: clamp(centerX, MARGIN, vw - w - MARGIN) };
}

// ── Component ─────────────────────────────────────────────────
interface TourGuideProps {
  isOpen: boolean;
  /** Called once the tour is skipped or completed (it is marked as seen first). */
  onClose: () => void;
}

/** Inspector Crit's element-by-element dashboard tour. */
export default function TourGuide(props: TourGuideProps) {
  // Mounted only while open, so every run starts at step 1
  if (!props.isOpen) return null;
  return <Tour onClose={props.onClose} />;
}

function Tour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [spot, setSpot] = useState<Box | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const dialogRef = useRef<HTMLDivElement>(null);

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  const finish = useCallback(() => {
    markDashboardTourSeen();
    onClose();
  }, [onClose]);

  const goTo = useCallback((next: number) => {
    if (next >= 0 && next < STEPS.length) setStep(next);
  }, []);

  // Track the target: bring it into view, then follow resizes / scrolling
  useEffect(() => {
    const first = document.querySelector<HTMLElement>(`[data-tour="${current.targets[0]}"]`);
    first?.scrollIntoView({ block: 'nearest', inline: 'nearest' });

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setSpot(measure(current.targets));
        setViewport({ w: window.innerWidth, h: window.innerHeight });
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [current]);

  // Measure the dialog so it can be placed beside the spotlight
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.target.getBoundingClientRect();
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keyboard: ← / → to navigate, Esc to skip
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); finish(); }
      else if (e.key === 'ArrowRight') { if (isLast) finish(); else goTo(step + 1); }
      else if (e.key === 'ArrowLeft') goTo(step - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, isLast, finish, goTo]);

  useEffect(() => { dialogRef.current?.focus(); }, [step]);

  const measured = size.w > 0 && viewport.w > 0;
  const pos = measured ? placeDialog(spot, size.w, size.h, viewport.w, viewport.h) : { top: 0, left: 0 };
  const text = !spot && current.fallback ? current.fallback : current.text;

  return (
    <div className="fixed inset-0 z-[1000]" aria-live="polite">
      {/* Click shield: the dashboard stays inert during the tour */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      {/* Spotlight (its giant shadow dims everything else) */}
      {spot ? (
        <div
          aria-hidden
          className="absolute pointer-events-none rounded-md border-2 border-[#d4a359]
            shadow-[0_0_0_9999px_rgba(10,12,15,0.72),0_0_22px_4px_rgba(212,163,89,0.55)]
            transition-all duration-300 ease-out"
          style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0 pointer-events-none bg-[rgba(10,12,15,0.72)]" />
      )}

      {/* Inspector Crit's briefing card */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-text"
        tabIndex={-1}
        className="absolute w-[min(400px,calc(100vw-32px))] outline-none
          rounded-md border border-[#59616b] bg-[#1f2328] text-[#d8dee3]
          shadow-[0_18px_40px_rgba(0,0,0,0.6)] font-mono
          transition-[top,left] duration-300 ease-out"
        style={{ top: pos.top, left: pos.left, visibility: measured ? 'visible' : 'hidden' }}>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-white/10">
          <span className="text-[10px] font-bold tracking-[0.18em] text-[#d4a359]">
            INDUCTION TOUR {'//'} {String(step + 1).padStart(2, '0')} OF {String(STEPS.length).padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={finish}
            title="Skip the tour (Esc)"
            className="flex items-center gap-1 text-[10px] tracking-[0.12em] uppercase text-[#a3aab3]
              hover:text-white transition-colors cursor-pointer
              focus-visible:outline-2 focus-visible:outline-[#d4a359] focus-visible:outline-offset-2">
            <X size={12} aria-hidden /> Skip Tour
          </button>
        </div>

        {/* Crit + speech bubble */}
        <div className="flex items-start gap-3 px-4 pt-4 pb-3">
          <div className="flex-shrink-0 flex flex-col items-center gap-1">
            <span className="w-14 h-14 rounded-full bg-[#f4efe6] border-2 border-[#d4a359] overflow-hidden flex items-end justify-center">
              <InspectorCrit height={50} decorative />
            </span>
            <span className="text-[8.5px] font-bold tracking-[0.14em] text-[#a3aab3]">INSP. CRIT</span>
          </div>
          <div className="relative flex-1 min-w-0 rounded-md bg-[#f4efe6] text-[#2b2620] px-3.5 py-2.5
            before:content-[''] before:absolute before:top-5 before:-left-[7px]
            before:border-y-[7px] before:border-y-transparent before:border-r-[7px] before:border-r-[#f4efe6]">
            <h2 id="tour-title" className="m-0 mb-1 text-[12px] font-bold uppercase tracking-[0.1em] text-[#9e2a2b]">
              {current.title}
            </h2>
            <p id="tour-text" className="m-0 text-[12px] leading-relaxed">{text}</p>
          </div>
        </div>

        {/* Progress pips */}
        <div className="flex justify-center gap-1.5 pb-3" aria-hidden>
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-4 bg-[#d4a359]' : i < step ? 'w-1.5 bg-[#76b852]' : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-white/10">
          <button
            type="button"
            onClick={() => goTo(step - 1)}
            disabled={isFirst}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-[0.1em]
              border border-[#59616b] text-[#d8dee3] hover:border-[#a3aab3] hover:text-white cursor-pointer
              disabled:opacity-40 disabled:cursor-not-allowed transition-colors
              focus-visible:outline-2 focus-visible:outline-[#d4a359] focus-visible:outline-offset-2">
            <ArrowLeft size={13} aria-hidden /> Previous
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={finish}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-[0.1em]
                bg-[#d4a359] border border-[#d4a359] text-[#1f2328] hover:bg-[#e0b36c] cursor-pointer transition-colors
                focus-visible:outline-2 focus-visible:outline-[#f4efe6] focus-visible:outline-offset-2">
              <ShieldCheck size={13} aria-hidden /> Complete Induction
            </button>
          ) : (
            <button
              type="button"
              onClick={() => goTo(step + 1)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-[0.1em]
                bg-[#d4a359] border border-[#d4a359] text-[#1f2328] hover:bg-[#e0b36c] cursor-pointer transition-colors
                focus-visible:outline-2 focus-visible:outline-[#f4efe6] focus-visible:outline-offset-2">
              Next <ArrowRight size={13} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
