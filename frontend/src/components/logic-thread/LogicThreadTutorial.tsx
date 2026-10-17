'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, FileText, X } from 'lucide-react'
import InspectorCrit from '@/components/brand/InspectorCrit'
import styles from './overlays.module.css'

/** localStorage flag: the Node 01 walkthrough has been finished or skipped. */
export const LOGIC_THREAD_TUTORIAL_KEY = 'hasSeenLogicThreadTutorial'

export function hasSeenLogicThreadTutorial(): boolean {
  try { return localStorage.getItem(LOGIC_THREAD_TUTORIAL_KEY) === 'true' } catch { return false }
}

function markSeen() {
  try { localStorage.setItem(LOGIC_THREAD_TUTORIAL_KEY, 'true') } catch { /* storage blocked */ }
}

interface Step {
  /** `data-tutorial` values to spotlight (their union). */
  targets: string[]
  /** Marked on <html data-lt-tutorial> so the page can animate small details (e.g. pulsing pegs). */
  focus?: string
  title: string
  text: string
}

const STEPS: Step[] = [
  {
    targets: ['exhibits'],
    title: 'Arranging Exhibits',
    text: 'Welcome to Node 01, Cadet! Drag and position exhibit cards anywhere on your board to organize your evidence.',
  },
  {
    targets: ['exhibits'],
    focus: 'pegs',
    title: 'Threading the Sequence',
    text: 'Connect paragraph cards in chronological sequence by drawing evidence threads from one node peg to the next. Click a card to pin it, then the card that comes next.',
  },
  {
    targets: ['sidebar'],
    title: 'Sidebar & Hints',
    text: "If the case stalls, hover over 'HINT' on the left and I'll analyze the signal words for you.",
  },
  {
    targets: ['submit'],
    title: 'Submission & Tries',
    text: 'You have 3 attempts per case to thread the sequence correctly. Submit when your thread sequence is locked!',
  },
]

const PAD = 8, GAP = 14, MARGIN = 16

interface Box { top: number; left: number; width: number; height: number }

/** Union of the visible targets, clipped to the viewport. */
function measure(targets: string[]): Box | null {
  let top = Infinity, left = Infinity, right = -Infinity, bottom = -Infinity
  for (const t of targets) {
    document.querySelectorAll<HTMLElement>(`[data-tutorial="${t}"]`).forEach(el => {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return
      top = Math.min(top, r.top); left = Math.min(left, r.left)
      right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom)
    })
  }
  if (top === Infinity) return null
  top = Math.max(top, 0); left = Math.max(left, 0)
  right = Math.min(right, window.innerWidth); bottom = Math.min(bottom, window.innerHeight)
  return { top: top - PAD, left: left - PAD, width: right - left + PAD * 2, height: bottom - top + PAD * 2 }
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, Math.max(min, max)))

/** Below → above → right → left of the spotlight; else the roomier side, overlapping its edge. */
function place(spot: Box | null, w: number, h: number, vw: number, vh: number) {
  if (!spot) return { top: (vh - h) / 2, left: (vw - w) / 2 }
  const cx = spot.left + spot.width / 2 - w / 2
  const cy = spot.top + spot.height / 2 - h / 2
  const below = spot.top + spot.height + GAP
  if (below + h <= vh - MARGIN) return { top: below, left: clamp(cx, MARGIN, vw - w - MARGIN) }
  const above = spot.top - GAP - h
  if (above >= MARGIN) return { top: above, left: clamp(cx, MARGIN, vw - w - MARGIN) }
  const right = spot.left + spot.width + GAP
  if (right + w <= vw - MARGIN) return { top: clamp(cy, MARGIN, vh - h - MARGIN), left: right }
  const left = spot.left - GAP - w
  if (left >= MARGIN) return { top: clamp(cy, MARGIN, vh - h - MARGIN), left }
  // Nothing fits cleanly (very tall target): use whichever side has more room, overlapping the edge least
  const roomAbove = spot.top, roomBelow = vh - (spot.top + spot.height)
  const top = roomAbove >= roomBelow ? spot.top - GAP - h : below
  return { top: clamp(top, MARGIN, vh - h - MARGIN), left: clamp(cx, MARGIN, vw - w - MARGIN) }
}

interface LogicThreadTutorialProps {
  open: boolean
  onClose: () => void
}

/** Inspector Crit's spotlight walkthrough of Node 01 (auto on first visit, replayable via TUTORIAL). */
export default function LogicThreadTutorial({ open, onClose }: LogicThreadTutorialProps) {
  // Mounted only while open, so each run starts at step 1
  if (!open) return null
  return <Walkthrough onClose={onClose} />
}

function Walkthrough({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [spot, setSpot] = useState<Box | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [viewport, setViewport] = useState({ w: 0, h: 0 })
  const dialogRef = useRef<HTMLDivElement>(null)

  const current = STEPS[step]
  const isFirst = step === 0
  const isLast = step === STEPS.length - 1

  const finish = useCallback(() => { markSeen(); onClose() }, [onClose])
  const goTo = useCallback((n: number) => { if (n >= 0 && n < STEPS.length) setStep(n) }, [])

  // Follow the target while the board settles (entrance animation, fit-to-viewport scaling) and on resize
  useEffect(() => {
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        setSpot(measure(current.targets))
        setViewport({ w: window.innerWidth, h: window.innerHeight })
      })
    }
    update()
    const settle = window.setInterval(update, 250)
    const stopSettling = window.setTimeout(() => window.clearInterval(settle), 1500)
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      window.clearInterval(settle); window.clearTimeout(stopSettling)
      window.removeEventListener('resize', update)
    }
  }, [current])

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.target.getBoundingClientRect()
      setSize({ w: r.width, h: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); finish() }
      else if (e.key === 'ArrowRight') { if (isLast) finish(); else goTo(step + 1) }
      else if (e.key === 'ArrowLeft') goTo(step - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, isLast, finish, goTo])

  useEffect(() => { dialogRef.current?.focus() }, [step])

  // Let the page highlight details inside the spotlight (the pegs pulse on step 2)
  useEffect(() => {
    const root = document.documentElement
    if (current.focus) root.dataset.ltTutorial = current.focus
    return () => { delete root.dataset.ltTutorial }
  }, [current])

  const measured = size.w > 0 && viewport.w > 0
  const pos = measured ? place(spot, size.w, size.h, viewport.w, viewport.h) : { top: 0, left: 0 }

  return (
    <div className={`${styles.root} ${styles.tutorial}`}>
      {/* The board stays inert while Crit is talking */}
      <div className={styles.tutorialShield} onClick={e => e.stopPropagation()} />

      {spot
        ? <div className={styles.spotlight} style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }} aria-hidden />
        : <div className={styles.tutorialDim} aria-hidden />}

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lt-tutorial-title"
        aria-describedby="lt-tutorial-text"
        tabIndex={-1}
        className={`${styles.tutorialCard} ${styles.paper}`}
        style={{ top: pos.top, left: pos.left, visibility: measured ? 'visible' : 'hidden' }}>
        <header className={styles.tutorialHead}>
          <span className={styles.tutorialStep}>NODE 01 BRIEFING {'//'} {step + 1} OF {STEPS.length}</span>
          <button type="button" className={styles.tutorialSkip} onClick={finish} title="Skip the tutorial (Esc)">
            <X size={12} aria-hidden /> Skip Tutorial
          </button>
        </header>

        <div className={styles.tutorialBody}>
          <div className={styles.tutorialCrit}>
            <InspectorCrit height={64} decorative />
          </div>
          <div className={styles.tutorialBubble}>
            <h2 id="lt-tutorial-title" className={styles.tutorialTitle}>{current.title}</h2>
            <p id="lt-tutorial-text" className={styles.tutorialText}>{current.text}</p>
          </div>
        </div>

        <div className={styles.tutorialPips} aria-hidden>
          {STEPS.map((_, i) => <i key={i} className={i === step ? styles.pipActive : i < step ? styles.pipDone : ''} />)}
        </div>

        <footer className={styles.tutorialFoot}>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => goTo(step - 1)} disabled={isFirst}>
            <ArrowLeft size={13} aria-hidden /> Back
          </button>
          {isLast ? (
            <button type="button" className={styles.btn} onClick={finish}>
              <FileText size={13} aria-hidden /> Start Case
            </button>
          ) : (
            <button type="button" className={styles.btn} onClick={() => goTo(step + 1)}>
              Next <ArrowRight size={13} aria-hidden />
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
