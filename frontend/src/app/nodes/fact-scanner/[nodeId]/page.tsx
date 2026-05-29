'use client'

import {
  useState, useEffect,
  useRef, useCallback,
} from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'

// ── Types ───────────────────────────────────────
interface ArticleSentence {
  sentence_id: string
  text:        string
}

interface FactNodeData {
  node_id:             string
  title:               string
  focus:               string
  craap_criterion:     string
  micro_lesson_text:   string
  reading_passage:     string
  deep_dive_required:  boolean
  article_sentences:   ArticleSentence[]
}

type Phase = 'loading' | 'micro_lesson' | 'deep_dive'
           | 'task'    | 'mastery'      | 'error'

const FACT_SCANNER_TUTORIAL_KEY =
  'critica_tutorial_seen_fact_scanner_first_node'

const TUTORIAL_STEPS = [
  {
    label: 'Overview',
    code: 'TUT-FS-001',
    text: 'Fact Scanner gives you a passage containing structural or factual flaws, unsupported claims, logical errors, or false statements. Your job is to identify and mark the flawed sentences before they corrupt the argument.',
    board: 'overview',
    notes: [
      'Teal = clean sentence',
      'Strikethrough = detected flaw',
      'Scan carefully - flaws are subtle',
    ],
  },
  {
    label: 'Read Carefully',
    code: 'TUT-FS-002',
    text: 'Read the passage sentence by sentence. Ask: Is this claim supported? Does it contradict something earlier? Is it an overgeneralization? Flaws are often hidden in absolute language "always," "never," "all," "none."',
    board: 'patterns',
    notes: [
      'Watch for "all"/"never"/"always"',
      'Unsupported = a flaw',
      'Context matters - read fully',
    ],
  },
  {
    label: 'Mark Flaws',
    code: 'TUT-FS-003',
    text: "Click any sentence in the passage you believe contains a flaw it will be quarantined with a red underline. Click it again to unmark. A flaw counter on the right panel tracks how many you've flagged. You must find all flaws",
    board: 'marked',
    notes: [
      'Red underline = flagged flaw',
      'Click again to unflag',
      'Counter updates in real time',
    ],
  },
  {
    label: 'Submit Scan',
    code: 'TUT-FS-004',
    text: "When you've flagged all suspected flaws, hit Submit Scan. Correctly identified flaws turn teal. Missed flaws are highlighted in amber. False positives (correct sentences you flagged) are shown in gray.",
    board: 'results',
    notes: [
      'Teal = correct flag',
      'Amber = missed flag',
      'Gray = false positive',
    ],
  },
] as const

// ── Styles ──────────────────────────────────────
const F = "'Courier New', Courier, monospace"

const S = {
  stamp: {
    display:       'inline-block' as const,
    border:        '2px solid #888',
    padding:       '3px 14px',
    fontSize:      10,
    fontWeight:    700,
    letterSpacing: '0.15em',
    color:         '#aaa',
    marginBottom:  12,
    fontFamily:    F,
  } as React.CSSProperties,
  btnPrimary: {
    padding:       '10px 24px',
    background:    '#f0ece4',
    border:        '2px solid #888',
    borderRadius:  2,
    color:         '#111',
    fontFamily:    F,
    fontSize:      11,
    fontWeight:    700,
    cursor:        'pointer',
    letterSpacing: '0.08em',
  } as React.CSSProperties,
  btnSm: {
    padding:      '7px 16px',
    background:   'transparent',
    border:       '1px solid #555',
    borderRadius: 2,
    color:        '#aaa',
    fontFamily:   F,
    fontSize:     10,
    fontWeight:   700,
    cursor:       'pointer',
  } as React.CSSProperties,
  tutorialBtn: {
    padding:       '7px 14px',
    background:    '#2b2b2b',
    border:        '1px solid #555',
    borderRadius:  2,
    color:         '#f0ece4',
    fontFamily:    F,
    fontSize:      10,
    fontWeight:    700,
    letterSpacing: '0.08em',
    cursor:        'pointer',
  } as React.CSSProperties,
}

// ── CRAAP criterion color map ────────────────────
const CRITERION_COLOR: Record<string, string> = {
  CURRENCY:   '#3a7bd5',
  RELEVANCE:  '#8e44ad',
  AUTHORITY:  '#c0392b',
  ACCURACY:   '#16a085',
  PURPOSE:    '#d35400',
}

function FactScannerTutorialPopup({
  open,
  step,
  onBack,
  onNext,
  onClose,
  onStart,
}: {
  open: boolean
  step: number
  onBack: () => void
  onNext: () => void
  onClose: () => void
  onStart: () => void
}) {
  if (!open) return null

  const current = TUTORIAL_STEPS[step]
  const tutorialCode = `TUT-FS-${String(step + 1).padStart(3, '0')}`
  const isFirst = step === 0
  const isLast = step === TUTORIAL_STEPS.length - 1

  const navItem = (label: string, index: number) => {
    const complete = index < step
    const active = index === step

    return (
      <div
        key={label}
        style={{
          width: 156,
          height: 76,
          border: '1px solid #777',
          background: complete ? '#b9dfbf' : active ? '#f8f7f3' : '#c9c7c2',
          color: '#111',
          boxShadow: active ? '0 3px 0 rgba(0,0,0,0.45)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          textAlign: 'center',
          fontFamily: F,
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        <div style={{ position: 'absolute', top: 7, left: '50%', transform: 'translateX(-50%)' }}>
          <div style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: complete ? '#36b24a' : active ? '#ece7dc' : '#dbd8d2',
            color: complete ? '#fff' : '#111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
          }}>
            {complete ? '✓' : index + 1}
          </div>
        </div>
        <span style={{ marginTop: 20, lineHeight: 1.15 }}>{label}</span>
      </div>
    )
  }

  const renderBoard = () => {
    if (current.board === 'overview') {
      return (
        <div style={{ padding: '18px 16px 12px' }}>
          <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: '#333', marginBottom: 10 }}>
            PASSAGE WITH FLAWS
          </div>
          <div style={{ fontFamily: F, fontSize: 16, lineHeight: 1.35, color: '#222' }}>
            Critical reading builds skills.
            <span style={{ color: '#1f8fcb', fontWeight: 700 }}> Evidence must be verified.</span>
            <span style={{ color: '#c23b3b', textDecoration: 'line-through', textDecorationThickness: 2 }}> All sources online are reliable.</span>
            Analysis strengthens arguments.
          </div>
        </div>
      )
    }

    if (current.board === 'patterns') {
      return (
        <div style={{ padding: '16px 14px 12px' }}>
          <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: '#333', marginBottom: 12 }}>
            FLAW PATTERNS TO WATCH
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Overgeneralization:', ' "All studies agree that..."'],
              ['Unsupported Claim:', ' "This is obviously true"'],
              ['False Fact:', ' "A statement that contradicts known evidence."'],
            ].map(([label, example]) => (
              <div key={label} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 6px',
                background: '#c9c7c2',
                border: '1px solid #8c8c8c',
                fontFamily: F,
                fontSize: 10,
                color: '#222',
              }}>
                <span style={{ fontWeight: 700 }}>{label}</span>
                <span style={{ fontWeight: 400 }}>{example}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (current.board === 'marked') {
      return (
        <div style={{ padding: '16px 14px 12px' }}>
          <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: '#333', marginBottom: 12 }}>
            MARKED FLAW
          </div>
          <div style={{ fontFamily: F, fontSize: 16, lineHeight: 1.4, color: '#b23b3b', fontWeight: 700, textDecoration: 'underline', textDecorationThickness: 3, textUnderlineOffset: 4, marginBottom: 18 }}>
            All online sources are completely reliable.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: F, fontSize: 12, color: '#222', fontWeight: 700 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#b03a3a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>2</div>
            FLAWS FLAGGED SO FAR
          </div>
        </div>
      )
    }

    return (
      <div style={{ padding: '16px 14px 12px' }}>
        <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: '#333', marginBottom: 12 }}>
          SCAN RESULTS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingLeft: 8 }}>
          {[
            ['#1da7df', 'Correctly flagged flaw'],
            ['#caa300', 'Missed flaw (not flagged)'],
            ['#c7d1c9', 'False positive (clean sentence flagged)'],
          ].map(([color, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: F, fontSize: 10, color: '#2d2d2d', fontWeight: 700 }}>
              <div style={{ width: 12, height: 12, background: color, border: '1px solid #dcdcdc' }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const primaryLabel = isLast ? 'START TRAINING →' : 'NEXT →'
  const secondaryLabel = isFirst ? 'EXIT TUTORIAL' : 'BACK'

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.48)',
      zIndex: 150,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: F,
    }}>
      <div style={{ width: '100%', maxWidth: 840, background: '#d4d1cb', border: '1px solid #5f5d58', boxShadow: '0 18px 44px rgba(0,0,0,0.4)', padding: '10px 14px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.28em', color: '#111' }}>CRITICA - FIELD BRIEFING DOCUMENT</div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.18em', color: '#111' }}>{tutorialCode}</div>
        </div>

        <div style={{ background: '#d7d7d5', border: '1px solid #65635d', borderRadius: '16px 16px 10px 10px', padding: '30px 24px 22px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -1, left: -1, width: 54, height: 24, borderRadius: '16px 0 14px 0', background: '#d7d7d5', borderLeft: '1px solid #65635d', borderTop: '1px solid #65635d' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 42, marginBottom: 30 }}>
            <div style={{ width: 120, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, border: '2px solid #6c6a64', background: '#fff', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 34, height: 34, background: '#333', borderRadius: 4, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', background: '#d8d8d8' }} />
                  <div style={{ position: 'absolute', bottom: 6, left: 5, right: 5, height: 10, borderRadius: '10px 10px 4px 4px', background: '#d8d8d8' }} />
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.08em', color: '#111' }}>AGENT CRIT</div>
              <div style={{ fontSize: 10, color: '#222', letterSpacing: '0.06em' }}>FIELD INSTRUCTOR</div>
            </div>

            <div style={{ position: 'relative', flex: 1, background: '#fff', border: '1px solid #7b776f', boxShadow: '0 3px 12px rgba(0,0,0,0.18)', padding: '12px 16px', minHeight: 96 }}>
              <div style={{ position: 'absolute', left: -9, top: 38, width: 18, height: 18, background: '#fff', borderLeft: '1px solid #7b776f', borderBottom: '1px solid #7b776f', transform: 'rotate(45deg)' }} />
              <div style={{ fontSize: 13, lineHeight: 1.35, color: '#222', whiteSpace: 'pre-line' }}>{current.text}</div>
            </div>
          </div>

          <div style={{ border: '1px solid #7b776f', background: '#e7e4de', padding: 10, marginBottom: 28 }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              {TUTORIAL_STEPS.map((stepItem, index) => navItem(stepItem.label, index))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', background: '#e7e4de', border: '1px solid #7b776f', padding: 14 }}>
            <div style={{ flex: 1, minHeight: 202, background: '#fff', border: '1px solid #9a968f', padding: 18, position: 'relative' }}>
              {renderBoard()}
            </div>

            <div style={{ width: 112, background: '#fff', border: '1px solid #9a968f', padding: '10px 10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#222', marginBottom: 10 }}>QUICK NOTES</div>
              {current.notes.map((note, index) => (
                <div key={note} style={{ fontSize: 9, lineHeight: 1.45, color: '#333' }}>
                  {note}
                  {index < current.notes.length - 1 && <div style={{ height: 10 }} />}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
            <button onClick={isFirst ? onClose : onBack} style={{ ...S.btnSm, minWidth: 160, background: '#d8d4cc', color: '#111', border: '1px solid #7b776f', fontSize: 11, letterSpacing: '0.06em' }}>
              {secondaryLabel}
            </button>
            <button onClick={isLast ? onStart : onNext} style={{ ...S.btnSm, minWidth: 170, background: '#d8d4cc', color: '#111', border: '1px solid #7b776f', fontSize: 11, letterSpacing: '0.06em' }}>
              {primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


// ── Main component ───────────────────────────────
export default function FactScannerPage() {
  const router = useRouter()
  const params = useParams()
  const nodeId = params.nodeId as string

  // core state
  const [phase, setPhase]       = useState<Phase>('loading')
  const [factNode, setFactNode] = useState<FactNodeData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // task state
  const [quarantined, setQuarantined]   = useState<string[]>([])
  const [flawReasons, setFlawReasons]   = useState<Record<string, string>>({})
  const [evaluating, setEvaluating]     = useState<string | null>(null)
  const [wrongs, setWrongs]             = useState(0)
  const [masteryData, setMasteryData]   = useState<Record<string, unknown> | null>(null)
  const [submitting, setSubmitting]     = useState(false)

  // feedback state
  const [fbText, setFbText]   = useState('')
  const [drawer, setDrawer]   = useState(false)

  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)


  // hint overlay
  const [hintOverlay, setHintOverlay]         = useState(false)
  const [hintOverlayText, setHintOverlayText] = useState('')
  const [hintOverlayTier, setHintOverlayTier] = useState(0)

  // timer
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const inactiveRef = useRef(0)

  // ── Load ───────────────────────────────────
  useEffect(() => {
    apiFetch(`/nodes/fact-scanner/${nodeId}/`)
      .then((d: FactNodeData) => {
        setFactNode(d)
        setPhase('micro_lesson')
      })
      .catch((e) => {
        if ((e as any)?.status === 401)               { router.push('/auth');      return }
        if ((e as any)?.error === 'Node is locked.')  { router.push('/dashboard'); return }
        setErrorMsg((e as any)?.error ?? 'Failed to load node.')
        setPhase('error')
      })
  }, [nodeId]) // eslint-disable-line

  useEffect(() => {
    if (phase !== 'task') return
    const seen = localStorage.getItem(FACT_SCANNER_TUTORIAL_KEY)
    if (seen) return
    localStorage.setItem(FACT_SCANNER_TUTORIAL_KEY, '1')
    setTutorialStep(0)
    setTutorialOpen(true)
  }, [phase])

  // ── Hint ───────────────────────────────────
  const fetchHint = useCallback(async (
    isInactivity = false,
  ) => {
    try {
      const res = await apiFetch(
        `/nodes/fact-scanner/${nodeId}/feedback/`,
        {
          method: 'POST',
          body: JSON.stringify({
            sentence_id:        '',
            inactivity_seconds: isInactivity ? 61 : inactiveRef.current,
          }),
        },
      )
      const text = res.hint
        || res.explanation
        || 'Re-read the micro-lesson and apply the criterion to each sentence carefully.'
      setHintOverlayText(text)
      setHintOverlayTier(res.hint_tier ?? 0)
      setHintOverlay(true)
    } catch {
      setHintOverlayText(
        'Re-read the micro-lesson and apply the criterion to each sentence carefully.')
      setHintOverlay(true)
    }
  }, [nodeId])

  // ── Timer ──────────────────────────────────
  const resetTimer = useCallback(() => {
    inactiveRef.current = 0
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      inactiveRef.current += 1
      if (inactiveRef.current >= 60) {
        clearInterval(timerRef.current!)
        fetchHint(true)
      }
    }, 1000)
  }, [nodeId]) // eslint-disable-line

  useEffect(() => {
    if (phase === 'task') resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase]) // eslint-disable-line

  // ── Feedback ───────────────────────────────
  const callFeedback = useCallback(async (
    sentence_id: string,
    inactivity:  boolean,
  ) => {
    try {
      const res = await apiFetch(
        `/nodes/fact-scanner/${nodeId}/feedback/`,
        {
          method: 'POST',
          body: JSON.stringify({
            sentence_id,
            inactivity_seconds: inactivity ? 61 : inactiveRef.current,
          }),
        },
      )
      setFbText(res.explanation ?? 'That sentence does not violate the criterion being tested.')
      setDrawer(true)
    } catch {
      setFbText('That sentence does not violate the CRAAP criterion. Re-read the micro-lesson.')
      setDrawer(true)
    }
  }, [nodeId])

  // ── Hint ───────────────────────────────────
  

  // ── Sentence tap ───────────────────────────
  const handleSentenceTap = async (
    sentence_id: string,
  ) => {
    if (!factNode) return
    if (evaluating) return
    if (quarantined.includes(sentence_id)) return
    if (drawer) return

    resetTimer()
    setEvaluating(sentence_id)

    try {
      const res = await apiFetch(
        `/nodes/fact-scanner/${nodeId}/evaluate-sentence/`,
        {
          method: 'POST',
          body: JSON.stringify({ sentence_id }),
        },
      )

      if (res.result === 'correct') {
        setQuarantined(prev => [...prev, sentence_id])
        setFlawReasons(prev => ({
          ...prev,
          [sentence_id]: res.flaw_reason,
        }))
      } else {
        setWrongs(n => n + 1)
        await callFeedback(sentence_id, false)
      }
    } catch {
      setErrorMsg('Evaluation failed.')
    } finally {
      setEvaluating(null)
    }
  }

  // ── Submit mastery ─────────────────────────
  const handleSubmitMastery = async () => {
    if (!factNode || submitting) return
    setSubmitting(true)
    try {
      const res = await apiFetch(
        `/nodes/fact-scanner/${nodeId}/mastery/`,
        {
          method: 'POST',
          body: JSON.stringify({
            quarantined_ids: quarantined,
          }),
        },
      )
      if (res.status === 'mastered') {
        setMasteryData(res)
        setPhase('mastery')
      }
    } catch (e) {
      setFbText(
        (e as any)?.status === 'incomplete'
          ? 'Some flawed sentences were missed. Keep scanning.'
          : 'Submission failed. Please try again.',
      )
      setDrawer(true)
    } finally {
      setSubmitting(false)
    }
  }

  const openTutorial = () => {
    setTutorialStep(0)
    setTutorialOpen(true)
  }

  const closeTutorial = () => setTutorialOpen(false)

  const nextTutorialStep = () => {
    setTutorialStep(prev => Math.min(prev + 1, TUTORIAL_STEPS.length - 1))
  }

  const prevTutorialStep = () => {
    setTutorialStep(prev => Math.max(prev - 1, 0))
  }

  

  // ── Phase: loading ─────────────────────────
  if (phase === 'loading') {
    return (
      <div style={{
        minHeight: '100vh', background: '#6b6b6b',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center',
        fontFamily: F, color: '#ddd',
        fontSize: 13, letterSpacing: '0.1em',
      }}>
        LOADING NODE...
      </div>
    )
  }

  // ── Phase: error ───────────────────────────
  if (phase === 'error') {
    return (
      <div style={{
        minHeight: '100vh', background: '#1e1e1e',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: F, gap: 16,
      }}>
        <p style={{ color: '#ff6b6b', fontSize: 13 }}>
          {errorMsg}
        </p>
        <button style={S.btnSm}
          onClick={() => router.push('/dashboard')}>
          ← DASHBOARD
        </button>
      </div>
    )
  }

  // ── Phase: micro_lesson ────────────────────
  if (phase === 'micro_lesson') {
    const color = CRITERION_COLOR[
      factNode!.craap_criterion] ?? '#888'
    return (
      <div style={{
        minHeight: '100vh', background: '#6b6b6b',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center',
        padding: 40, fontFamily: F,
      }}>
        <div style={{
          maxWidth: 640, width: '100%',
          background: '#2b2b2b',
          border: '1px solid #444',
          borderRadius: 4, padding: 48,
        }}>
          <div style={S.stamp}>MICRO-LESSON</div>

          {/* CRAAP criterion badge */}
          <div style={{
            display: 'inline-block',
            background: color,
            color: '#fff',
            fontFamily: F,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.18em',
            padding: '4px 14px',
            borderRadius: 2,
            marginBottom: 14,
          }}>
            CRAAP — {factNode!.craap_criterion}
          </div>

          <h2 style={{
            fontSize: 20, fontWeight: 700,
            color: '#f0ece4', margin: '0 0 6px',
            fontFamily: F,
          }}>
            {factNode!.title}
          </h2>
          <p style={{
            fontSize: 12, color: '#aaa',
            margin: '0 0 16px', fontFamily: F,
          }}>
            {factNode!.focus}
          </p>
          <hr style={{
            border: 'none',
            borderTop: '1px solid #444',
            margin: '16px 0',
          }} />
          <p style={{
            fontSize: 13, lineHeight: 1.85,
            color: '#ccc', margin: '0 0 32px',
            fontFamily: F,
          }}>
            {factNode!.micro_lesson_text}
          </p>
          <button
            style={S.btnPrimary}
            onClick={() => setPhase(
              factNode!.deep_dive_required
                ? 'deep_dive' : 'task',
            )}
          >
            Continue →
          </button>
        </div>
      </div>
    )
  }

  // ── Phase: deep_dive ───────────────────────
  if (phase === 'deep_dive') {
    return (
      <div style={{
        minHeight: '100vh', background: '#6b6b6b',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center',
        padding: 40, fontFamily: F,
      }}>
        <div style={{
          maxWidth: 700, width: '100%',
          background: '#2b2b2b',
          border: '1px solid #444',
          borderRadius: 4, padding: 48,
        }}>
          <div style={S.stamp}>DEEP DIVE READING</div>
          <p style={{
            fontSize: 11, color: '#888',
            margin: '0 0 20px', lineHeight: 1.7,
            fontFamily: F,
          }}>
            Read the full article carefully before
            the task unlocks.
          </p>
          <p style={{
            fontSize: 14, lineHeight: 1.95,
            color: '#ddd', background: '#222',
            border: '1px solid #444',
            borderRadius: 4, padding: 28,
            margin: '0 0 32px', fontFamily: F,
          }}>
            {factNode!.reading_passage}
          </p>
          <button
            style={S.btnPrimary}
            onClick={() => setPhase('task')}
          >
            I have finished reading →
          </button>
        </div>
      </div>
    )
  }

  // ── Phase: mastery ─────────────────────────
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100vh', background: '#1e1e1e',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: F,
      }}>
        <div style={{
          maxWidth: 480, width: '100%',
          background: '#0e1e0e',
          border: '2px solid #4ddd94',
          borderRadius: 4, padding: 52,
          textAlign: 'center',
        }}>
          <div style={{
            ...S.stamp,
            color: '#4ddd94',
            borderColor: '#4ddd94',
            fontSize: 16, padding: '8px 24px',
          }}>
            ✓ REPORT FILED
          </div>
          <h2 style={{
            fontSize: 20, color: '#4ddd94',
            margin: '8px 0 16px', fontFamily: F,
          }}>
            {factNode!.title}
          </h2>
          <p style={{
            fontSize: 12, color: '#aaa',
            margin: '0 0 28px', fontFamily: F,
          }}>
            Streak: {masteryData?.streak ?? 0} days
          </p>
          <div style={{
            display: 'flex', gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            {masteryData?.next_node && (
              <button
                style={S.btnPrimary}
                onClick={() =>
                  router.push(
                    `/nodes/fact-scanner/${masteryData.next_node}`,
                  )
                }
              >
                NEXT NODE →
              </button>
            )}
            <button
              style={S.btnSm}
              onClick={() => router.push('/dashboard')}
            >
              ← DASHBOARD
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Phase: task ────────────────────────────
  // Better: track total quarantined count
  // Submit activates when at least 1 quarantined
  // Backend validates the full set
  const canSubmit = quarantined.length > 0

  const criterionColor = CRITERION_COLOR[
    factNode!.craap_criterion] ?? '#888'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#686664',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: F,
    }}>
      <div style={{
        display: 'flex', alignItems: 'stretch',
        boxShadow: '0 12px 48px rgba(0,0,0,0.55)',
        borderRadius: 6,
      }}>

        {/* sidebar */}
        <div style={{
          width: 34, background: '#2b2b2b',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 0',
          borderRadius: '6px 0 0 6px',
          borderRight: '1px solid #1a1a1a',
        }}>
          <button
            onClick={() => fetchHint()}
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              fontSize: 9, fontWeight: 700,
              letterSpacing: '0.14em', color: '#999',
              background: 'none', border: 'none',
              cursor: 'pointer', padding: '10px 4px',
              fontFamily: F, transition: 'color 0.15s',
            }}
            onMouseEnter={e =>
              (e.currentTarget.style.color = '#eee')}
            onMouseLeave={e =>
              (e.currentTarget.style.color = '#999')}
          >
            HINT
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              fontSize: 9, fontWeight: 700,
              letterSpacing: '0.14em', color: '#666',
              background: 'none', border: 'none',
              cursor: 'pointer', padding: '10px 4px',
              fontFamily: F, transition: 'color 0.15s',
            }}
            onMouseEnter={e =>
              (e.currentTarget.style.color = '#aaa')}
            onMouseLeave={e =>
              (e.currentTarget.style.color = '#666')}
          >
            END SESSION
          </button>
        </div>

        {/* main panel */}
        <div style={{
          background: '#b8b3ab',
          borderRadius: '0 6px 6px 0',
          display: 'flex', flexDirection: 'column',
          width: 740, overflow: 'hidden',
        }}>

          {/* banner */}
          <div style={{
            padding: '10px 20px 8px',
            textAlign: 'center',
            background: '#b8b3ab',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              border: '1.5px solid #888',
              padding: '5px 20px',
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.1em', color: '#333',
              background: 'rgba(255,255,255,0.25)',
              fontFamily: F,
            }}>
              <span style={{ color: '#444' }}>
                OBJECTIVE:
              </span>
              <span style={{ color: '#b03030' }}>
                IDENTIFY AND QUARANTINE THE
                SENTENCE THAT VIOLATES
              </span>
              <span style={{
                background: criterionColor,
                color: '#fff',
                padding: '1px 8px',
                borderRadius: 2,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.12em',
              }}>
                {factNode!.craap_criterion}
              </span>
            </div>
          </div>

          <div style={{ padding: '0 24px 4px', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={openTutorial} style={S.tutorialBtn}>
              Show tutorial
            </button>
          </div>

          {/* progress */}
          <div style={{
            padding: '6px 24px 2px',
            display: 'flex', gap: 8,
            justifyContent: 'center',
          }}>
            {factNode!.article_sentences.map(s => (
              <div key={s.sentence_id} style={{
                width: 20, height: 6, borderRadius: 3,
                background: quarantined.includes(
                  s.sentence_id)
                  ? '#cc3333'
                  : evaluating === s.sentence_id
                  ? '#f0a500'
                  : '#888',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>

          {/* instruction */}
          <div style={{
            padding: '4px 24px 8px',
            textAlign: 'center',
            fontSize: 9, color: '#666',
            fontFamily: F, letterSpacing: '0.1em',
          }}>
            {quarantined.length > 0
              ? `${quarantined.length} SENTENCE${
                  quarantined.length > 1 ? 'S' : ''
                } QUARANTINED`
              : 'TAP A SENTENCE TO EVALUATE IT'}
          </div>

          {/* article sentences */}
          <div style={{
            padding: '8px 24px 16px',
            flex: 1, overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            {factNode!.article_sentences.map(
              (sentence, idx) => {
              const isQuarantined =
                quarantined.includes(
                  sentence.sentence_id)
              const isEvaluating  =
                evaluating === sentence.sentence_id

              return (
                <div
                  key={sentence.sentence_id}
                  onClick={() =>
                    handleSentenceTap(
                      sentence.sentence_id)}
                  style={{
                    position: 'relative',
                    background: isQuarantined
                      ? '#2a0a0a'
                      : '#fff',
                    border: isQuarantined
                      ? '2px solid #cc3333'
                      : isEvaluating
                      ? '2px solid #f0a500'
                      : '1.5px solid #ccc',
                    borderRadius: 5,
                    padding: '14px 18px',
                    cursor: isQuarantined
                      ? 'default'
                      : evaluating
                      ? 'not-allowed'
                      : 'pointer',
                    transition: 'all 0.2s',
                    opacity: evaluating
                      && !isEvaluating ? 0.6 : 1,
                  }}
                >
                  {/* sentence number */}
                  <div style={{
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    color: isQuarantined
                      ? '#cc3333' : '#aaa',
                    marginBottom: 6,
                    fontFamily: F,
                  }}>
                    SENTENCE {idx + 1}
                    {isEvaluating && (
                      <span style={{
                        marginLeft: 8,
                        color: '#f0a500',
                      }}>
                        EVALUATING...
                      </span>
                    )}
                  </div>

                  {/* sentence text */}
                  <p style={{
                    fontSize: 13,
                    lineHeight: 1.75,
                    color: isQuarantined
                      ? '#ffaaaa' : '#1a1a1a',
                    margin: 0,
                    fontFamily: F,
                  }}>
                    {sentence.text}
                  </p>

                  {/* flaw reason (shown after quarantine) */}
                  {isQuarantined &&
                    flawReasons[sentence.sentence_id] && (
                    <div style={{
                      marginTop: 10,
                      padding: '8px 12px',
                      background: '#3a0a0a',
                      border: '1px solid #663333',
                      borderRadius: 3,
                      fontSize: 11,
                      color: '#ffcccc',
                      lineHeight: 1.6,
                      fontFamily: F,
                    }}>
                      <span style={{
                        fontSize: 8,
                        fontWeight: 700,
                        letterSpacing: '0.14em',
                        color: '#cc3333',
                        display: 'block',
                        marginBottom: 4,
                      }}>
                        VIOLATION IDENTIFIED
                      </span>
                      {flawReasons[sentence.sentence_id]}
                    </div>
                  )}

                  {/* quarantined stamp */}
                  {isQuarantined && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      right: 24,
                      transform: 'translateY(-50%) rotate(-8deg)',
                      fontFamily: F,
                      fontSize: 22,
                      fontWeight: 700,
                      color: '#cc3333',
                      border: '3px solid #cc3333',
                      padding: '2px 10px',
                      opacity: 0.85,
                      letterSpacing: '0.1em',
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap',
                    }}>
                      QUARANTINED
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* submit bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 24px 14px',
            background: '#b8b3ab',
          }}>
            <span style={{
              fontSize: 10, color: '#666',
              fontWeight: 700, letterSpacing: '0.08em',
              fontFamily: F,
            }}>
              {quarantined.length} QUARANTINED
              {wrongs > 0 && (
                <span style={{
                  marginLeft: 14, color: '#b03030',
                }}>
                  WRONG TAPS: {wrongs}
                </span>
              )}
            </span>
            <button
              disabled={!canSubmit || submitting}
              onClick={handleSubmitMastery}
              style={{
                display: 'flex',
                alignItems: 'center', gap: 12,
                background: submitting
                  ? '#555'
                  : canSubmit
                  ? '#2b2b2b'
                  : '#888',
                color: '#f0ece4',
                border: 'none', borderRadius: 2,
                padding: '10px 26px',
                fontSize: 11, fontWeight: 700,
                letterSpacing: '0.14em',
                cursor: canSubmit && !submitting
                  ? 'pointer' : 'not-allowed',
                fontFamily: F,
                transition: 'background 0.2s',
              }}
            >
              {submitting
                ? 'FILING REPORT...'
                : 'SUBMIT REPORT →'}
            </button>
          </div>
        </div>
      </div>

        {/* hint overlay — matches all modules */}
      {hintOverlay && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          padding: 24,
          pointerEvents: 'none',
        }}>
          <div style={{
            background: '#fff',
            border: '2px solid #ddd',
            borderRadius: 5,
            padding: '16px 18px 14px',
            maxWidth: 260,
            boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
            pointerEvents: 'all',
          }}>
            <div style={{
              fontSize: 9, fontWeight: 700,
              letterSpacing: '0.14em', color: '#888',
              marginBottom: 8, fontFamily: F,
            }}>
              SCAFFOLD HINT
              {hintOverlayTier > 0
                ? ` — TIER ${hintOverlayTier}`
                : ''}
            </div>
            <p style={{
              fontSize: 12, color: '#222',
              lineHeight: 1.65, margin: '0 0 14px',
              fontFamily: F,
            }}>
              {hintOverlayText}
            </p>
            <button
              onClick={() => setHintOverlay(false)}
              style={{
                fontSize: 10, fontWeight: 700,
                color: '#444', background: '#eee',
                border: '1px solid #ccc',
                padding: '5px 14px', cursor: 'pointer',
                fontFamily: F, letterSpacing: '0.06em',
                borderRadius: 2,
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* feedback drawer */}
      {drawer && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#180a0a',
          border: '2px solid #cc3333',
          borderBottom: 'none',
          padding: '20px 32px 28px',
          zIndex: 200, maxHeight: 300,
          overflowY: 'auto', fontFamily: F,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 12,
          }}>
            <div style={{
              ...S.stamp,
              color: '#ff6b6b',
              borderColor: '#ff6b6b',
              marginBottom: 0,
            }}>
              FEEDBACK
            </div>
            <button
              onClick={() => {
                setDrawer(false)
                resetTimer()
              }}
              style={{
                background: 'none', border: 'none',
                color: '#ff6b6b', fontSize: 18,
                cursor: 'pointer', fontFamily: F,
              }}
            >
              ✕
            </button>
          </div>
          <p style={{
            fontSize: 13, color: '#ddd',
            lineHeight: 1.7, marginBottom: 16,
            fontFamily: F,
          }}>
            {fbText}
          </p>
          <button
            style={S.btnSm}
            onClick={() => {
              setDrawer(false)
              resetTimer()
            }}
          >
            Close and reattempt
          </button>
        </div>
      )}

      <FactScannerTutorialPopup
        open={tutorialOpen}
        step={tutorialStep}
        onClose={closeTutorial}
        onBack={prevTutorialStep}
        onNext={nextTutorialStep}
        onStart={() => setTutorialOpen(false)}
      />
    </div>
  )
}