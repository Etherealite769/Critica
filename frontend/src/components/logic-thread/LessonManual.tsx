'use client'

import { Fragment, useEffect, useRef } from 'react'
import { BookOpen, Crosshair, KeyRound, Paperclip, X } from 'lucide-react'
import styles from './overlays.module.css'

/** The lesson assigned to the active case node. */
export interface NodeLesson {
  nodeId: string
  title: string
  focus?: string
  text?: string
}

interface LessonManualProps {
  open: boolean
  onClose: () => void
  lesson: NodeLesson | null
}

// Signal words the manual can call out, with what each one tells the detective
const SIGNALS: { word: string; role: string }[] = [
  { word: 'first',            role: 'Opens the sequence — the earliest event.' },
  { word: 'then',             role: 'Moves the story one step forward.' },
  { word: 'next',             role: 'The very next step after the previous card.' },
  { word: 'meanwhile',        role: 'Happens at the same time as the card before it.' },
  { word: 'after that',       role: 'Follows directly from the previous event.' },
  { word: 'later',            role: 'Jumps forward in time from the previous event.' },
  { word: 'finally',          role: 'Closes the sequence — the last event.' },
  { word: 'eventually',       role: 'Arrives near the end, after a stretch of time.' },
  { word: 'in the end',       role: 'The outcome — it goes last.' },
  { word: 'however',          role: 'Contrast — it pushes against the card before it.' },
  { word: 'as a result',      role: 'Effect — it comes after the cause it describes.' },
  { word: 'because',          role: 'Cause — it explains the event it is attached to.' },
  { word: 'for example',      role: 'Illustrates the general point right before it.' },
  { word: 'similarly',        role: 'Comparison — pairs with the card it echoes.' },
  { word: 'in contrast',      role: 'Comparison — sets up the opposite side.' },
]

// The four time-order signals every narration lesson rests on
const CORE = ['first', 'then', 'meanwhile', 'finally']

const escapeRe = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Signal words mentioned in this node's lesson (falls back to the four core time-order words). */
function signalsFor(lesson: NodeLesson | null) {
  const hay = `${lesson?.text ?? ''} ${lesson?.focus ?? ''}`.toLowerCase()
  const found = SIGNALS.filter(s => new RegExp(`\\b${escapeRe(s.word)}\\b`).test(hay))
  return found.length > 0 ? found : SIGNALS.filter(s => CORE.includes(s.word))
}

/** Lesson text with the called-out signal words in bold. */
function emphasize(text: string, words: string[]) {
  if (words.length === 0) return text
  const re = new RegExp(`\\b(${words.map(escapeRe).join('|')})\\b`, 'gi')
  return text.split(re).map((part, i) =>
    i % 2 === 1 ? <strong key={i} className={styles.keyTerm}>{part}</strong> : <Fragment key={i}>{part}</Fragment>)
}

/** Lesson Manual: the lesson filed for the active node, laid out as a field-guidance dossier. */
export default function LessonManual({ open, onClose, lesson }: LessonManualProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const text = lesson?.text?.trim()
  const signals = signalsFor(lesson)

  return (
    <div className={`${styles.root} ${styles.backdrop}`} onClick={onClose}>
      <div
        className={`${styles.manual} ${styles.paper}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-title"
        onClick={e => e.stopPropagation()}>
        <Paperclip size={30} strokeWidth={1.6} className={styles.clip} style={{ top: -14, left: 22, transform: 'rotate(-30deg)' }} aria-hidden />
        <Paperclip size={30} strokeWidth={1.6} className={styles.clip} style={{ top: 70, right: -10, transform: 'rotate(100deg)' }} aria-hidden />

        <header className={styles.manualHead}>
          <div className={styles.manualHeadLeft}>
            <div className={styles.manualKicker}>LESSON MANUAL {'//'} CASE NODE {lesson?.nodeId.toUpperCase() ?? '—'}</div>
            <h2 id="manual-title" className={styles.manualTitle}>{lesson?.title ?? 'Lesson Manual'}</h2>
          </div>
          <div className={styles.manualHeadRight}>
            <button ref={closeRef} type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose} aria-label="Close lesson manual (Esc)">
              <X size={14} aria-hidden /> Close
            </button>
          </div>
        </header>

        <div className={styles.manualBody}>
          {lesson?.focus && (
            <div className={styles.directive}>
              <Crosshair size={16} aria-hidden />
              <div>
                <div className={styles.directiveLabel}>FIELD DIRECTIVE</div>
                <div className={styles.directiveText}>{lesson.focus}</div>
              </div>
            </div>
          )}

          <section className={styles.section}>
            <Paperclip size={18} strokeWidth={1.6} className={styles.clip} style={{ top: -10, left: -7, transform: 'rotate(-35deg)' }} aria-hidden />
            <h3 className={styles.sectionTitle}><BookOpen size={14} aria-hidden /> Lesson Briefing</h3>
            <p className={styles.prose}>
              {text ? emphasize(text, signals.map(s => s.word)) : 'No lesson has been filed for this case node yet.'}
            </p>
          </section>

          <section>
            <h3 className={styles.sectionTitle}><KeyRound size={14} aria-hidden /> Key Signal Words</h3>
            <div className={styles.callouts}>
              {signals.map((s, i) => (
                <div key={s.word} className={styles.callout} style={{ transform: `rotate(${[-1.2, 0.8, -0.6, 1][i % 4]}deg)` }}>
                  <span className={styles.calloutPin} aria-hidden />
                  <div className={styles.calloutWord}>{s.word}</div>
                  <div className={styles.calloutRole}>{s.role}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
