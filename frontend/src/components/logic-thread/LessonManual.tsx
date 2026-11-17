'use client'

import { Fragment, useEffect, useRef } from 'react'
import { BookOpen, Crosshair, KeyRound, Paperclip, X } from 'lucide-react'
import styles from './overlays.module.css'

/** The lesson assigned to the active case node (shared by all four game modules). */
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

// What common signal words tell the reader (shown under a key-signal card when the word matches)
const ROLES: Record<string, string> = {
  'first':        'Opens the sequence: the earliest event or step.',
  'then':         'Moves one step forward from the sentence before it.',
  'next':         'The very next step after the previous one.',
  'after':        'Follows the event it names.',
  'after that':   'Follows directly from the previous event.',
  'subsequently': 'Comes later, after the previous event.',
  'meanwhile':    'Happens at the same time as the sentence before it.',
  'later':        'Jumps forward in time from the previous event.',
  'finally':      'Closes the sequence: the last event or point.',
  'eventually':   'Arrives near the end, after a stretch of time.',
  'in the end':   'The outcome: it goes last.',
  'however':      'Contrast: it pushes against the sentence before it.',
  'in contrast':  'Comparison: sets up the opposite side.',
  'nevertheless': 'Concession: admits the point, then goes on anyway.',
  'as a result':  'Effect: it comes after the cause it describes.',
  'therefore':    'Result: what follows from the point before it.',
  'because':      'Cause: it explains the event it is attached to.',
  'for example':  'Illustrates the general point right before it.',
  'in addition':  'Addition: one more point in the same direction.',
  'moreover':     'Addition: a further point of equal weight.',
  'similarly':    'Comparison: pairs with the idea it echoes.',
  'in conclusion': 'Conclusion: sums up what came before.',
  'unlike':       'Contrast clue: the nearby word means the opposite.',
  'or':           'Synonym clue: the words after it restate the meaning.',
  'such as':      'Example clue: introduces examples of the word.',
}

// Fallback for lessons without quoted terms: the words above, if the text mentions them
const LEGACY_SIGNALS = Object.keys(ROLES)

const escapeRe = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// 'quoted' terms in a lesson. A quote opens after a non-letter and closes before one, so
// apostrophes in words like "Earth's" or "students'" are not mistaken for quotes.
const QUOTED = /(?<![A-Za-z])'([^'\n]{1,48}?)'(?![A-Za-z])/g
const MAX_SIGNAL_WORDS = 4      // longer quotes are example sentences, not signals
const MAX_CARDS = 12

/** The node's own key terms: short 'quoted' terms in its lesson, else known signal words it mentions. */
function signalsFor(lesson: NodeLesson | null): { words: string[]; quoted: boolean } {
  const text = lesson?.text ?? ''
  const seen = new Set<string>()
  const quoted: string[] = []
  for (const m of text.matchAll(QUOTED)) {
    const term = m[1].trim().replace(/[,;:]$/, '')
    const key = term.toLowerCase()
    if (!term || term.split(/\s+/).length > MAX_SIGNAL_WORDS || /[.;]/.test(term) || seen.has(key)) continue
    seen.add(key)
    quoted.push(term)
  }
  if (quoted.length > 0) return { words: quoted.slice(0, MAX_CARDS), quoted: true }

  const hay = `${text} ${lesson?.focus ?? ''}`.toLowerCase()
  return { words: LEGACY_SIGNALS.filter(w => new RegExp(`\\b${escapeRe(w)}\\b`).test(hay)), quoted: false }
}

/** Lesson text with its key terms highlighted ('quoted' terms keep their quotes). */
function emphasize(text: string, words: string[], quoted: boolean) {
  if (words.length === 0) return text
  const alternatives = words.map(escapeRe).join('|')
  const re = quoted ? new RegExp(`('(?:${alternatives})[,;:]?')`, 'gi') : new RegExp(`\\b(${alternatives})\\b`, 'gi')
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
  const { words: signals, quoted } = signalsFor(lesson)

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
              {text ? emphasize(text, signals, quoted) : 'No lesson has been filed for this case node yet.'}
            </p>
          </section>

          {/* Omitted when the lesson names no key terms */}
          {signals.length > 0 && (
            <section>
              <h3 className={styles.sectionTitle}><KeyRound size={14} aria-hidden /> Key Signal Words</h3>
              <div className={styles.callouts}>
                {signals.map((word, i) => {
                  const role = ROLES[word.toLowerCase()]
                  return (
                    <div key={word} className={styles.callout} style={{ transform: `rotate(${[-1.2, 0.8, -0.6, 1][i % 4]}deg)` }}>
                      <span className={styles.calloutPin} aria-hidden />
                      <div className={styles.calloutWord}>{word}</div>
                      {role && <div className={styles.calloutRole}>{role}</div>}
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
