'use client'

import {
  useState, useEffect,
  useRef, useCallback,
} from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import {
  buildSessionQueue, saveSession, loadSession, clearSession,
  nodeDifficulty, DIFFICULTY_LABELS, DIFFICULTY_COLORS,
} from '@/lib/nodeSession'

interface ArticleSentence {
  sentence_id: string
  text:        string
}
interface FactNodeData {
  node_id:            string
  title:              string
  focus:              string
  craap_criterion:    string
  micro_lesson_text:  string
  reading_passage:    string
  deep_dive_required: boolean
  difficulty:         number
  article_sentences:  ArticleSentence[]
}
type Phase = 'loading' | 'micro_lesson' | 'deep_dive' | 'task' | 'mastery' | 'error'

const FACT_SCANNER_TUTORIAL_KEY = 'critica_tutorial_seen_fact_scanner_first_node'
const FONT = "'Courier New', Courier, monospace"

// ── Shared palette (matches Logic Thread) ────────────────────
const C = {
  pageBg:      '#2D0909',
  board:       '#D4A86A',
  canvas:      '#E8D5B0',
  cardPaper:   '#FFFBF0',
  cardBdrIdle: '#C9A06A',
  btnGold:     '#FFDFA7',
  btnDark:     '#432818',
  btnGoldBdr:  '#8C5A3C',
  textDark:    '#1C0800',
  textMid:     '#8C5A3C',
  textLight:   '#C49A5A',
  textMuted:   '#A07850',
  accentRed:   '#800020',
  panel:       '#CBA070',
} as const

const CRAAP_TABS = ['CURRENCY', 'RELEVANCE', 'AUTHORITY', 'ACCURACY', 'PURPOSE']

const CRITERION_QUESTIONS: Record<string, string> = {
  CURRENCY:  'Is the information timely and up-to-date?',
  RELEVANCE: 'Does the information relate to your topic?',
  AUTHORITY: 'Who is the source? Are they qualified?',
  ACCURACY:  'Is the information supported by evidence?',
  PURPOSE:   'Why does this information exist?',
}

const TUTORIAL_STEPS = [
  { label: 'Overview',       code: 'TUT-FS-001', text: 'Fact Scanner gives you a passage containing flaws, unsupported claims, or false statements. Identify and quarantine the flawed sentences.',    notes: ['Beige = unscanned', 'Red border = quarantined', 'Scan carefully'] },
  { label: 'Read Carefully', code: 'TUT-FS-002', text: 'Read each sentence. Ask: Is this claim supported? Does it contradict evidence? Watch for absolute language: "always," "never," "all," "none."', notes: ['Watch for absolutes', 'Unsupported = flaw', 'Context matters'] },
  { label: 'Mark Flaws',     code: 'TUT-FS-003', text: 'Click a sentence you believe is flawed. The right panel shows the SCAN AND QUARANTINE button. Click it to evaluate your selection.',              notes: ['Select sentence first', 'Then click button', 'Counter updates live'] },
  { label: 'Submit Report',  code: 'TUT-FS-004', text: "When you've quarantined all flaws, hit Submit Report. Stats show your attempts, flaws found, and hints used.",                                   notes: ['Attempts = total taps', 'Flaws found = correct', 'Hints used = scaffold'] },
] as const

// ── Shared button styles (same as Logic Thread) ──────────────
const btnPrimary: React.CSSProperties = {
  padding: '10px 24px', background: C.btnGold,
  border: `2px solid ${C.btnGoldBdr}`, borderRadius: 10,
  color: C.textDark, fontFamily: FONT, fontSize: 11,
  fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em',
}
const btnSm: React.CSSProperties = {
  padding: '7px 16px', background: 'transparent',
  border: `1px solid ${C.textMid}`, borderRadius: 2,
  color: C.textLight, fontFamily: FONT, fontSize: 10,
  fontWeight: 700, cursor: 'pointer',
}
const stampS: React.CSSProperties = {
  display: 'inline-block', border: `2px solid ${C.textMid}`,
  padding: '3px 14px', fontSize: 10, fontWeight: 700,
  letterSpacing: '0.15em', color: C.textMid,
  marginBottom: 12, fontFamily: FONT,
}

// ── Tutorial ─────────────────────────────────────────────────
function TutorialPopup({ open, step, onBack, onNext, onClose, onStart }: {
  open: boolean; step: number
  onBack: () => void; onNext: () => void
  onClose: () => void; onStart: () => void
}) {
  if (!open) return null
  const current = TUTORIAL_STEPS[step]
  const isFirst = step === 0
  const isLast  = step === TUTORIAL_STEPS.length - 1

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: FONT }}>
      <div style={{ width: '100%', maxWidth: 700, background: C.canvas, border: `1px solid ${C.btnGoldBdr}`, borderRadius: 6, boxShadow: '0 18px 44px rgba(0,0,0,0.55)', overflow: 'hidden' }}>
        {/* header */}
        <div style={{ background: C.pageBg, padding: '12px 24px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', color: C.canvas }}>CRITICA — FIELD BRIEFING</span>
          <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', color: C.canvas }}>{current.code}</span>
        </div>

        <div style={{ padding: '28px 28px 24px' }}>
          {/* step nav */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
            {TUTORIAL_STEPS.map((s, i) => (
              <div key={s.label} style={{
                flex: 1, padding: '8px 4px', textAlign: 'center',
                background: i < step ? '#b9dfbf' : i === step ? C.cardPaper : C.board,
                border: `1px solid ${C.btnGoldBdr}`, borderRadius: 3,
                fontFamily: FONT, fontSize: 11, fontWeight: 700,
                color: i < step ? '#fff' : C.textDark,
              }}>
                {i < step ? '✓' : i + 1}. {s.label}
              </div>
            ))}
          </div>

          {/* speech bubble */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
            <div style={{ flexShrink: 0, textAlign: 'center', width: 80 }}>
              <div style={{ width: 48, height: 48, border: `2px solid ${C.btnGoldBdr}`, background: C.cardPaper, margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
                <div style={{ width: 30, height: 30, background: C.btnDark, borderRadius: 3, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 5, left: '50%', transform: 'translateX(-50%)', width: 12, height: 12, borderRadius: '50%', background: C.canvas }} />
                  <div style={{ position: 'absolute', bottom: 5, left: 4, right: 4, height: 8, borderRadius: '8px 8px 3px 3px', background: C.canvas }} />
                </div>
              </div>
              <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: C.textDark }}>AGENT CRIT</div>
            </div>
            <div style={{ flex: 1, background: C.cardPaper, border: `1px solid ${C.btnGoldBdr}`, borderRadius: 5, padding: '14px 18px', position: 'relative' }}>
              <div style={{ position: 'absolute', left: -9, top: 18, width: 16, height: 16, background: C.cardPaper, borderLeft: `1px solid ${C.btnGoldBdr}`, borderBottom: `1px solid ${C.btnGoldBdr}`, transform: 'rotate(45deg)' }} />
              <p style={{ fontFamily: FONT, fontSize: 13, lineHeight: 1.65, color: C.textDark, margin: 0 }}>{current.text}</p>
            </div>
          </div>

          {/* notes */}
          <div style={{ background: C.board, border: `1px solid ${C.btnGoldBdr}`, borderRadius: 4, padding: '12px 16px', marginBottom: 22 }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: C.accentRed, marginBottom: 8, letterSpacing: '0.1em' }}>QUICK NOTES</div>
            {current.notes.map((n, i) => (
              <div key={i} style={{ fontFamily: FONT, fontSize: 12, color: C.textDark, lineHeight: 1.6 }}>• {n}</div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={isFirst ? onClose : onBack} style={{ padding: '10px 24px', background: C.canvas, border: `1.5px solid ${C.btnGoldBdr}`, borderRadius: 3, fontFamily: FONT, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: C.textDark }}>
              {isFirst ? 'EXIT TUTORIAL' : '← BACK'}
            </button>
            <button onClick={isLast ? onStart : onNext} style={{ padding: '10px 28px', background: C.btnDark, border: 'none', borderRadius: 3, fontFamily: FONT, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: C.btnGold }}>
              {isLast ? 'START TRAINING →' : 'NEXT →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function FactScannerPage() {
  const router = useRouter()
  const params = useParams()
  const nodeId = params.nodeId as string

  const [phase,      setPhase]      = useState<Phase>('loading')
  const [factNode,   setFactNode]   = useState<FactNodeData | null>(null)
  const [errorMsg,   setErrorMsg]   = useState('')

  const [sessionQueue,   setSessionQueue]   = useState<string[]>([])
  const [questionIndex,  setQuestionIndex]  = useState(0)
  const [sessionStartId, setSessionStartId] = useState<string | null>(null)
  const [savedNextNode,  setSavedNextNode]  = useState<string | null>(null)
  const [savedStreak,    setSavedStreak]    = useState<number | null>(null)

  const [selected,    setSelected]    = useState<string | null>(null)
  const [quarantined, setQuarantined] = useState<string[]>([])
  const [flawReasons, setFlawReasons] = useState<Record<string, string>>({})
  const [evaluating,  setEvaluating]  = useState(false)
  const [attempts,    setAttempts]    = useState(0)
  const [flawsFound,  setFlawsFound]  = useState(0)
  const [hintsUsed,   setHintsUsed]   = useState(0)
  const [masteryData, setMasteryData] = useState<Record<string, unknown> | null>(null)
  const [submitting,  setSubmitting]  = useState(false)

  const [fbText,  setFbText]  = useState('')
  const [drawer,  setDrawer]  = useState(false)

  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)

  const [hintOverlay,     setHintOverlay]     = useState(false)
  const [hintOverlayText, setHintOverlayText] = useState('')
  const [hintOverlayTier, setHintOverlayTier] = useState(0)

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const inactiveRef = useRef(0)

  // ── Load question ──────────────────────────────────────────
  const loadQuestion = useCallback(async (targetNodeId: string) => {
    setPhase('loading')
    try {
      const d = await apiFetch(`/nodes/fact-scanner/${targetNodeId}/`)
      setFactNode(d)
      setSelected(null); setQuarantined([]); setFlawReasons({})
      setEvaluating(false); setAttempts(0); setFlawsFound(0); setHintsUsed(0)
      setFbText(''); setDrawer(false); setHintOverlay(false)
      setPhase('task')
    } catch (e: any) {
      setErrorMsg(e?.error ?? 'Failed to load next question.')
      setPhase('error')
    }
  }, [])

  // ── Init ──────────────────────────────────────────────────
  useEffect(() => {
    const start = nodeId
    setSessionStartId(start)
    const saved = loadSession('fact_scanner', start)
    if (saved && saved.sessionQueue.length === 5) {
      setSessionQueue(saved.sessionQueue); setQuestionIndex(saved.questionIndex)
      if (saved.next_node) setSavedNextNode(saved.next_node)
      if (saved.streak !== undefined) setSavedStreak(saved.streak)
      const activeId = saved.sessionQueue[saved.questionIndex] ?? start
      apiFetch(`/nodes/fact-scanner/${activeId}/`)
        .then((d: FactNodeData) => { setFactNode(d); setPhase('task') })
        .catch((e: any) => {
          if (e?.status === 401) { router.push('/auth'); return }
          if (e?.error === 'Node is locked.') { router.push('/dashboard'); return }
          setErrorMsg(e?.error ?? 'Failed to load node.'); setPhase('error')
        })
    } else {
      apiFetch(`/nodes/fact-scanner/${start}/`)
        .then((d: FactNodeData) => {
          setFactNode(d); setPhase('micro_lesson')
          apiFetch('/progression/dashboard/')
            .then((prog: any) => {
              const unlocked: string[] = prog.unlocked_nodes ?? []
              const queue = buildSessionQueue('fact_scanner', start, unlocked)
              setSessionQueue(queue); setQuestionIndex(0)
              saveSession('fact_scanner', start, { sessionQueue: queue, questionIndex: 0 })
            })
            .catch(() => { setSessionQueue([start]); setQuestionIndex(0) })
        })
        .catch((e: any) => {
          if (e?.status === 401) { router.push('/auth'); return }
          if (e?.error === 'Node is locked.') { router.push('/dashboard'); return }
          setErrorMsg(e?.error ?? 'Failed to load node.'); setPhase('error')
        })
    }
  }, [nodeId, router])

  useEffect(() => {
    if (phase !== 'task') return
    const seen = localStorage.getItem(FACT_SCANNER_TUTORIAL_KEY)
    if (seen) return
    localStorage.setItem(FACT_SCANNER_TUTORIAL_KEY, '1')
    setTutorialStep(0); setTutorialOpen(true)
  }, [phase])

  // ── Hint ─────────────────────────────────────────────────
  const fetchHint = useCallback(async (isInactivity = false) => {
    const activeNodeId = factNode?.node_id ?? nodeId
    try {
      const res = await apiFetch(
        `/nodes/fact-scanner/${activeNodeId}/feedback/`,
        { method: 'POST', body: JSON.stringify({ sentence_id: '', inactivity_seconds: isInactivity ? 61 : inactiveRef.current }) },
      )
      setHintOverlayText(res.hint || res.explanation || 'Re-read the micro-lesson carefully.')
      setHintOverlayTier(res.hint_tier ?? 0)
      setHintOverlay(true); setHintsUsed(h => h + 1)
    } catch {
      setHintOverlayText('Re-read the micro-lesson and apply the criterion to each sentence.')
      setHintOverlay(true)
    }
  }, [nodeId, factNode])

  // ── Timer ────────────────────────────────────────────────
  const resetTimer = useCallback(() => {
    inactiveRef.current = 0
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      inactiveRef.current += 1
      if (inactiveRef.current >= 60) { clearInterval(timerRef.current!); fetchHint(true) }
    }, 1000)
  }, [fetchHint])

  useEffect(() => {
    if (phase === 'task') resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, resetTimer])

  // ── Select sentence ───────────────────────────────────────
  const handleSelectSentence = (sentence_id: string) => {
    if (!factNode || evaluating || quarantined.includes(sentence_id) || drawer) return
    resetTimer()
    setSelected(prev => prev === sentence_id ? null : sentence_id)
  }

  // ── Scan and quarantine ───────────────────────────────────
  const handleScanAndQuarantine = async () => {
    if (!factNode || !selected || evaluating) return
    resetTimer(); setEvaluating(true); setAttempts(a => a + 1)
    try {
      const res = await apiFetch(
        `/nodes/fact-scanner/${factNode.node_id}/evaluate-sentence/`,
        { method: 'POST', body: JSON.stringify({ sentence_id: selected }) },
      )
      if (res.result === 'correct') {
        setQuarantined(prev => [...prev, selected])
        setFlawReasons(prev => ({ ...prev, [selected]: res.flaw_reason }))
        setFlawsFound(f => f + 1); setSelected(null)
      } else {
        try {
          const fb = await apiFetch(
            `/nodes/fact-scanner/${factNode.node_id}/feedback/`,
            { method: 'POST', body: JSON.stringify({ sentence_id: selected, inactivity_seconds: inactiveRef.current }) },
          )
          setFbText(fb.explanation ?? 'That sentence does not violate the criterion.')
        } catch { setFbText('That sentence does not violate the CRAAP criterion.') }
        setDrawer(true); setSelected(null)
      }
    } catch { setErrorMsg('Evaluation failed.') }
    finally { setEvaluating(false) }
  }

  // ── Submit mastery ────────────────────────────────────────
  const handleSubmitMastery = async () => {
    if (!factNode || submitting) return
    setSubmitting(true)
    try {
      const res = await apiFetch(
        `/nodes/fact-scanner/${factNode.node_id}/mastery/`,
        { method: 'POST', body: JSON.stringify({ quarantined_ids: quarantined, save_progression: false }) },
      )
      if (res.status === 'mastered') {
        const nextIdx = questionIndex + 1
        if (nextIdx < sessionQueue.length) {
          if (sessionStartId) saveSession('fact_scanner', sessionStartId, {
            sessionQueue, questionIndex: nextIdx,
            next_node: savedNextNode || undefined,
            streak: savedStreak !== null ? savedStreak : undefined,
          })
          setQuestionIndex(nextIdx); loadQuestion(sessionQueue[nextIdx])
        } else {
          let finalRes = res
          if (sessionStartId) {
            finalRes = await apiFetch(
              `/nodes/fact-scanner/${sessionStartId}/mastery/`,
              { method: 'POST', body: JSON.stringify({ commit_only: true }) },
            )
          }
          if (sessionStartId) clearSession('fact_scanner', sessionStartId)
          setMasteryData({
            next_node: savedNextNode || finalRes.next_node,
            streak: savedStreak !== null ? savedStreak : (finalRes.streak ?? null),
          })
          setPhase('mastery')
        }
      }
    } catch (e) {
      setFbText((e as any)?.status === 'incomplete'
        ? 'Some flawed sentences were missed. Keep scanning.'
        : 'Submission failed. Please try again.')
      setDrawer(true)
    } finally { setSubmitting(false) }
  }

  // ── Loading ───────────────────────────────────────────────
  if (phase === 'loading') return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: C.textLight, fontSize: 14, letterSpacing: '0.1em' }}>
      LOADING NODE...
    </div>
  )

  if (phase === 'error') return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, gap: 16 }}>
      <p style={{ color: '#ff8888', fontSize: 14 }}>{errorMsg}</p>
      <button style={btnSm} onClick={() => router.push('/dashboard')}>← DASHBOARD</button>
    </div>
  )

  // ── Micro lesson ──────────────────────────────────────────
  if (phase === 'micro_lesson') return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, fontFamily: FONT }}>
      <div style={{ maxWidth: 660, width: '100%', background: '#F2DEC1', border: `1px solid ${C.btnGoldBdr}`, borderRadius: 4, padding: 48 }}>
        <div style={stampS}>FACT SCANNER — MICRO-LESSON</div>
        <div style={{ display: 'inline-block', background: C.btnGold, color: C.textDark, fontFamily: FONT, fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', padding: '4px 14px', borderRadius: 3, marginBottom: 16 }}>
          CRAAP — {factNode!.craap_criterion}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.btnDark, margin: '0 0 8px', fontFamily: FONT }}>{factNode!.title}</h2>
        <p style={{ fontSize: 12, color: C.textMid, margin: '0 0 16px', fontFamily: FONT }}>{factNode!.focus}</p>
        <hr style={{ border: 'none', borderTop: `1px solid ${C.btnGoldBdr}`, margin: '16px 0' }} />
        <p style={{ fontSize: 14, lineHeight: 1.9, color: C.textDark, margin: '0 0 32px', fontFamily: FONT }}>{factNode!.micro_lesson_text}</p>
        <button onClick={() => setPhase(factNode!.deep_dive_required ? 'deep_dive' : 'task')} style={btnPrimary}>CONTINUE →</button>
      </div>
    </div>
  )

  // ── Deep dive ─────────────────────────────────────────────
  if (phase === 'deep_dive') return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, fontFamily: FONT }}>
      <div style={{ maxWidth: 720, width: '100%', background: '#2A1200', border: `1px solid ${C.btnGoldBdr}`, borderRadius: 4, padding: 48 }}>
        <div style={stampS}>DEEP DIVE READING</div>
        <p style={{ fontSize: 13, color: C.textMid, margin: '0 0 20px', lineHeight: 1.7, fontFamily: FONT }}>Read the full article carefully before the task unlocks.</p>
        <p style={{ fontSize: 14, lineHeight: 2.0, color: C.canvas, background: C.pageBg, border: `1px solid ${C.btnGoldBdr}`, borderRadius: 4, padding: 28, margin: '0 0 28px', fontFamily: FONT }}>
          {factNode!.reading_passage}
        </p>
        <button onClick={() => setPhase('task')} style={btnPrimary}>I HAVE FINISHED READING →</button>
      </div>
    </div>
  )

  // ── Mastery ───────────────────────────────────────────────
  if (phase === 'mastery') return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
      <div style={{ maxWidth: 480, width: '100%', background: '#0A1E0A', border: '2px solid #4ddd94', borderRadius: 4, padding: 52, textAlign: 'center' }}>
        <div style={{ ...stampS, color: '#4ddd94', borderColor: '#4ddd94', fontSize: 16, padding: '8px 24px' }}>
          ✓ REPORT FILED
        </div>
        <h2 style={{ fontSize: 20, color: '#4ddd94', margin: '8px 0 16px', fontFamily: FONT }}>{factNode!.title}</h2>
        <p style={{ fontSize: 12, color: C.textLight, margin: '0 0 28px', fontFamily: FONT }}>Streak: {String(masteryData?.streak ?? 0)} days</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {!!masteryData?.next_node && (
            <button style={btnPrimary} onClick={() => router.push(`/nodes/fact-scanner/${masteryData.next_node}`)}>NEXT NODE →</button>
          )}
          <button style={btnSm} onClick={() => router.push('/dashboard')}>← DASHBOARD</button>
        </div>
      </div>
    </div>
  )

  // ── Task phase ────────────────────────────────────────────
  const canSubmit = quarantined.length > 0

  return (
    <div style={{
      minHeight: '100vh',
      background: C.pageBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT, padding: '20px 12px',
    }}>

      {/* ── Fixed folder tabs (same as Logic Thread) ── */}
      <div style={{
        position: 'fixed', left: 0, top: '20%',
        transform: 'translateY(-20%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', gap: 6, zIndex: 100,
      }}>
        <button
          onClick={() => fetchHint()}
          style={{
            writingMode: 'vertical-lr',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.13em',
            color: C.textDark, background: C.btnGold,
            border: `1px solid ${C.btnGoldBdr}`, borderLeft: 'none',
            borderRadius: '0 6px 6px 0',
            cursor: 'pointer', padding: '14px 8px',
            fontFamily: FONT, whiteSpace: 'nowrap',
            transition: 'background 0.15s',
            boxShadow: '3px 2px 8px rgba(0,0,0,0.35)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.btnGoldBdr }}
          onMouseLeave={e => { e.currentTarget.style.background = C.btnGold }}
        >
          Hint
        </button>
        <button
          onClick={() => {
            if (sessionStartId && sessionQueue.length > 0) {
              saveSession('fact_scanner', sessionStartId, {
                sessionQueue, questionIndex,
                next_node: savedNextNode || undefined,
                streak: savedStreak !== null ? savedStreak : undefined,
              })
            }
            router.push('/dashboard')
          }}
          style={{
            writingMode: 'vertical-lr',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.13em',
            color: C.textDark, background: C.btnGold,
            border: `1px solid ${C.btnGoldBdr}`, borderLeft: 'none',
            borderRadius: '0 6px 6px 0',
            cursor: 'pointer', padding: '14px 8px',
            fontFamily: FONT, whiteSpace: 'nowrap',
            transition: 'background 0.15s',
            boxShadow: '3px 2px 8px rgba(0,0,0,0.35)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.btnGoldBdr }}
          onMouseLeave={e => { e.currentTarget.style.background = C.btnGold }}
        >
          End Session
        </button>
      </div>

      {/* ── Main shell ── */}
      <div style={{
        display: 'flex', alignItems: 'stretch',
        boxShadow: '0 12px 48px rgba(0,0,0,0.7)',
        borderRadius: 6, overflow: 'hidden',
        width: '100%', maxWidth: 980, minHeight: 600,
      }}>

        {/* ── Left column: sentence cards ── */}
        <div style={{
          flex: 1, background: C.canvas,
          display: 'flex', flexDirection: 'column',
          borderRight: `2px solid ${C.cardBdrIdle}`,
        }}>
          {/* top strip */}
<div style={{
  background: C.board,
  borderBottom: `2px solid ${C.btnGoldBdr}`,
  padding: '0',
  display: 'flex',
  flexDirection: 'column',
}}>
  {/* row 1: objective full width */}
  <div style={{
    padding: '12px 20px 10px',
    borderBottom: `1px solid rgba(0,0,0,0.12)`,
    textAlign: 'center',
  }}>
    <div style={{
      display: 'inline-block',
      border: `1.5px solid ${C.accentRed}`,
      padding: '7px 24px',
      fontSize: 13, fontWeight: 700,
      letterSpacing: '0.12em',
      background: 'rgba(255,255,255,0.35)',
      fontFamily: FONT,
    }}>
      <span style={{ color: C.textMid }}>OBJECTIVE: </span>
      <span style={{ color: C.accentRed }}>
        IDENTIFY AND QUARANTINE THE FLAWED SENTENCE
      </span>
    </div>
  </div>

  {/* row 2: meta controls */}
  <div style={{
    padding: '8px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  }}>
    {/* difficulty pill */}
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      background: 'rgba(0,0,0,0.12)',
      borderRadius: 20, padding: '5px 14px',
    }}>
      <div style={{
        width: 9, height: 9, borderRadius: '50%',
        background: DIFFICULTY_COLORS[factNode!.difficulty ?? nodeDifficulty(nodeId)],
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
        color: C.btnDark, fontFamily: FONT,
      }}>
        LVL {factNode!.difficulty ?? nodeDifficulty(nodeId)} —{' '}
        {DIFFICULTY_LABELS[factNode!.difficulty ?? nodeDifficulty(nodeId)]}
      </span>
    </div>

    {/* right side: Q counter + tutorial */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      {sessionQueue.length > 0 && (
        <span style={{
          fontFamily: FONT, fontSize: 12, fontWeight: 700,
          letterSpacing: '0.1em', color: C.btnDark,
          background: 'rgba(0,0,0,0.1)',
          borderRadius: 20, padding: '5px 14px',
        }}>
          Q {questionIndex + 1} / {sessionQueue.length}
        </span>
      )}
      <button
        onClick={() => { setTutorialStep(0); setTutorialOpen(true) }}
        style={{
          padding: '7px 18px',
          background: C.btnGold,
          border: `1.5px solid ${C.btnGoldBdr}`,
          borderRadius: 8,
          color: C.textDark, fontFamily: FONT,
          fontSize: 11, fontWeight: 700,
          letterSpacing: '0.08em', cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
        }}
      >
        TUTORIAL
      </button>
    </div>
  </div>

  {/* progress bar */}
  {sessionQueue.length > 0 && (
    <div style={{ padding: '0 20px 10px' }}>
      <div style={{ height: 5, background: 'rgba(0,0,0,0.15)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${(questionIndex / sessionQueue.length) * 100}%`,
          background: 'rgba(0,0,0,0.35)',
          borderRadius: 4, transition: 'width 0.3s',
        }} />
      </div>
    </div>
  )}
</div>
          {/* sentence cards */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {factNode!.article_sentences.map((sentence, idx) => {
              const isQuarantined = quarantined.includes(sentence.sentence_id)
              const isSelected    = selected === sentence.sentence_id

              return (
                <div
                  key={sentence.sentence_id}
                  onClick={() => handleSelectSentence(sentence.sentence_id)}
                  style={{
                    position: 'relative',
                    background: isQuarantined ? '#FFF0E8' : C.cardPaper,
                    border: isQuarantined
                      ? `2.5px solid ${C.accentRed}`
                      : isSelected
                      ? `2.5px solid ${C.btnGold}`
                      : `1.5px solid ${C.cardBdrIdle}`,
                    borderRadius: 10,
                    padding: '16px 20px',
                    cursor: isQuarantined ? 'default' : evaluating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.18s',
                    opacity: evaluating && !isQuarantined ? 0.7 : 1,
                    boxShadow: isSelected
                      ? `0 0 0 3px rgba(255,223,167,0.45)`
                      : isQuarantined
                      ? `0 2px 8px rgba(128,0,32,0.18)`
                      : '0 3px 10px rgba(0,0,0,0.12)',
                  }}
                >
                  {/* header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: isQuarantined ? C.accentRed : isSelected ? C.btnGoldBdr : C.cardBdrIdle,
                      color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, fontFamily: FONT, flexShrink: 0,
                    }}>
                      {idx + 1}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: isQuarantined ? C.accentRed : isSelected ? C.btnGoldBdr : C.textMuted, fontFamily: FONT }}>
                      SENTENCE {idx + 1}
                      {isSelected && !isQuarantined && <span style={{ marginLeft: 10, color: C.btnGoldBdr }}>● SELECTED</span>}
                    </span>
                  </div>

                  {/* text */}
                  <p style={{ fontSize: 15, lineHeight: 1.85, margin: 0, color: isQuarantined ? '#5a1010' : C.textDark, fontFamily: FONT, fontWeight: isSelected ? 700 : 400 }}>
                    {sentence.text}
                  </p>

                  {/* flaw reason */}
                  {isQuarantined && flawReasons[sentence.sentence_id] && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: '#FFF4EE', border: `1px solid ${C.cardBdrIdle}`, borderRadius: 4, fontFamily: FONT }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: C.accentRed, display: 'block', marginBottom: 6 }}>
                        VIOLATION IDENTIFIED
                      </span>
                      <span style={{ fontSize: 13, color: C.btnDark, lineHeight: 1.6 }}>
                        {flawReasons[sentence.sentence_id]}
                      </span>
                    </div>
                  )}

                  {/* quarantine stamp */}
                  {isQuarantined && (
                    <div style={{
                      position: 'absolute', top: '50%', right: 18,
                      transform: 'translateY(-50%) rotate(-8deg)',
                      fontFamily: FONT, fontSize: 18, fontWeight: 700,
                      color: C.accentRed, border: `3px solid ${C.accentRed}`,
                      padding: '2px 12px', opacity: 0.65,
                      letterSpacing: '0.1em', pointerEvents: 'none', whiteSpace: 'nowrap',
                    }}>
                      QUARANTINED
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Right panel: criterion + controls ── */}
        <div style={{
          width: 280,
          background: C.panel,
          display: 'flex', flexDirection: 'column',
          borderRight: `2px solid ${C.cardBdrIdle}`,
        }}>

          {/* TASK banner */}
          <div style={{
            margin: '16px 16px 0',
            border: `2px solid ${C.accentRed}`,
            borderRadius: 4, padding: '10px 14px',
            background: 'rgba(255,255,255,0.35)',
          }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: C.textDark, marginBottom: 4 }}>
              TASK:
            </div>
            <div style={{ fontFamily: FONT, fontSize: 13, lineHeight: 1.55, color: C.accentRed, fontWeight: 700 }}>
              Identify and quarantine sentences that violate the CRAAP framework criteria
            </div>
          </div>

          {/* criterion box */}
          <div style={{
            margin: '14px 16px 0',
            background: C.cardPaper,
            border: `1px solid ${C.cardBdrIdle}`,
            borderRadius: 6, padding: '18px 16px',
          }}>
            <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.textDark, marginBottom: 12, letterSpacing: '0.06em' }}>
              TARGET CRITERION: {factNode!.craap_criterion}
            </div>
            <div style={{ fontFamily: FONT, fontSize: 13, lineHeight: 1.65, color: C.btnDark }}>
              {CRITERION_QUESTIONS[factNode!.craap_criterion] ?? 'Does this sentence pass the CRAAP test?'}
            </div>
          </div>

          {/* selected preview */}
          <div style={{ margin: '12px 16px 0', flex: 1 }}>
            {selected ? (
              <div style={{
                background: 'rgba(255,255,255,0.5)',
                border: `1.5px solid ${C.btnGold}`,
                borderRadius: 5, padding: '12px 14px',
              }}>
                <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: C.btnGoldBdr, marginBottom: 8 }}>
                  SELECTED FOR EVALUATION
                </div>
                <p style={{ fontFamily: FONT, fontSize: 12, lineHeight: 1.65, color: C.textDark, margin: 0 }}>
                  {factNode!.article_sentences.find(s => s.sentence_id === selected)?.text}
                </p>
              </div>
            ) : (
              <div style={{
                background: 'rgba(255,255,255,0.3)',
                border: `1.5px dashed ${C.cardBdrIdle}`,
                borderRadius: 5, padding: '16px 14px', textAlign: 'center',
              }}>
                <p style={{ fontFamily: FONT, fontSize: 12, color: C.textMid, margin: 0, lineHeight: 1.6 }}>
                  {quarantined.length > 0
                    ? `${quarantined.length} sentence${quarantined.length > 1 ? 's' : ''} quarantined`
                    : 'Click a sentence on the left to select it'}
                </p>
              </div>
            )}
          </div>

          {/* scan button */}
          <div style={{ margin: '14px 16px' }}>
            <button
              disabled={!selected || evaluating}
              onClick={handleScanAndQuarantine}
              style={{
                width: '100%', padding: '14px 0',
                background: selected && !evaluating ? C.btnGold : C.cardBdrIdle,
                border: `2px solid ${selected && !evaluating ? C.btnGoldBdr : C.cardBdrIdle}`,
                borderRadius: 8, fontFamily: FONT, fontSize: 14, fontWeight: 700,
                letterSpacing: '0.12em', color: C.textDark,
                cursor: selected && !evaluating ? 'pointer' : 'not-allowed',
                transition: 'all 0.18s',
                boxShadow: selected && !evaluating ? '0 3px 8px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              {evaluating ? 'EVALUATING...' : 'SCAN AND QUARANTINE'}
            </button>
          </div>

          {/* stats */}
          <div style={{
            margin: '0 16px 16px',
            background: 'rgba(255,255,255,0.4)',
            border: `1px solid ${C.cardBdrIdle}`,
            borderRadius: 5, padding: '10px 0', display: 'flex',
          }}>
            {[
              { label: 'ATTEMPTS',    value: attempts   },
              { label: 'FLAWS FOUND', value: flawsFound },
              { label: 'HINTS USED',  value: hintsUsed  },
            ].map((stat, i) => (
              <div key={stat.label} style={{
                flex: 1, textAlign: 'center',
                borderRight: i < 2 ? `1px solid ${C.cardBdrIdle}` : 'none',
                padding: '4px 0',
              }}>
                <div style={{ fontFamily: FONT, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: C.textMid, marginBottom: 4 }}>
                  {stat.label}
                </div>
                <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, color: C.textDark }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* submit report */}
          <div style={{ margin: '0 16px 16px' }}>
            <button
              disabled={!canSubmit || submitting}
              onClick={handleSubmitMastery}
              style={{
                width: '100%', padding: '13px 0',
                background: canSubmit && !submitting ? C.btnDark : C.textMuted,
                border: 'none', borderRadius: 8, fontFamily: FONT, fontSize: 13,
                fontWeight: 700, letterSpacing: '0.1em', color: C.btnGold,
                cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed',
                transition: 'background 0.18s',
              }}
            >
              {submitting ? 'FILING...' : 'SUBMIT REPORT →'}
            </button>
          </div>
        </div>

        {/* ── CRAAP tabs ── */}
        <div style={{
          width: 32, background: C.btnGoldBdr,
          display: 'flex', flexDirection: 'column',
          borderRadius: '0 6px 6px 0',
        }}>
          {CRAAP_TABS.map((tab, i) => {
            const isActive = factNode!.craap_criterion === tab
            return (
              <div key={tab} style={{
                flex: 1,
                background: isActive ? C.btnGold : C.cardBdrIdle,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderBottom: i < CRAAP_TABS.length - 1 ? `1px solid ${C.btnGoldBdr}` : 'none',
                borderRadius: i === CRAAP_TABS.length - 1 ? '0 0 5px 0' : i === 0 ? '0 6px 0 0' : 0,
                position: 'relative',
              }}>
                <span style={{
                  writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                  fontFamily: FONT, fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: isActive ? C.textDark : C.textMuted,
                }}>
                  {tab}
                </span>
                {isActive && (
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: C.accentRed }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Hint overlay ── */}
      {hintOverlay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.52)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', padding: 28, pointerEvents: 'none' }}>
          <div style={{ background: C.cardPaper, border: `2px solid ${C.cardBdrIdle}`, borderRadius: 6, padding: '18px 20px 16px', maxWidth: 280, boxShadow: '0 8px 28px rgba(0,0,0,0.4)', pointerEvents: 'all' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: C.accentRed, marginBottom: 10, fontFamily: FONT }}>
              SCAFFOLD HINT{hintOverlayTier > 0 ? ` — TIER ${hintOverlayTier}` : ''}
            </div>
            <p style={{ fontSize: 14, color: C.textDark, lineHeight: 1.7, margin: '0 0 16px', fontFamily: FONT }}>
              {hintOverlayText}
            </p>
            <button
              onClick={() => setHintOverlay(false)}
              style={{ fontSize: 12, fontWeight: 700, color: C.textDark, background: C.btnGold, border: `1px solid ${C.btnGoldBdr}`, padding: '7px 18px', cursor: 'pointer', fontFamily: FONT, letterSpacing: '0.06em', borderRadius: 3 }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Feedback drawer ── */}
      {drawer && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#2A1200', border: `2px solid ${C.btnGoldBdr}`, borderBottom: 'none', padding: '22px 36px 30px', zIndex: 200, maxHeight: 280, overflowY: 'auto', fontFamily: FONT }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', color: C.btnGold, border: `1.5px solid ${C.btnGold}`, padding: '4px 16px', borderRadius: 2 }}>
              FEEDBACK
            </div>
            <button onClick={() => { setDrawer(false); resetTimer() }} style={{ background: 'none', border: 'none', color: C.btnGold, fontSize: 20, cursor: 'pointer', fontFamily: FONT }}>✕</button>
          </div>
          <p style={{ fontSize: 15, color: C.canvas, lineHeight: 1.75, marginBottom: 18, fontFamily: FONT }}>{fbText}</p>
          <button
            style={{ padding: '10px 22px', background: 'transparent', border: `1px solid ${C.btnGoldBdr}`, borderRadius: 3, color: C.textLight, fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}
            onClick={() => { setDrawer(false); resetTimer() }}
          >
            Close and reattempt
          </button>
        </div>
      )}

      <TutorialPopup
        open={tutorialOpen} step={tutorialStep}
        onClose={() => setTutorialOpen(false)}
        onBack={() => setTutorialStep(p => Math.max(p - 1, 0))}
        onNext={() => setTutorialStep(p => Math.min(p + 1, TUTORIAL_STEPS.length - 1))}
        onStart={() => setTutorialOpen(false)}
      />
    </div>
  )
}