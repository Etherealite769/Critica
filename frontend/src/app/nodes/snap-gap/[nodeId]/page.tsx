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
  fetchNodeSession, fetchLiveSocraticHint,
} from '@/lib/nodeSession'

// ── Types ─────────────────────────────────────────
interface SentencePair {
  pair_id:    string
  sentence_a: string
  sentence_b: string
}

interface SnapNodeData {
  node_id:              string
  title:                string
  focus:                string
  difficulty:           number
  micro_lesson_text:    string
  reading_passage:      string
  deep_dive_required:   boolean
  sentence_pairs:       SentencePair[]
  transition_tile_dock: string[]
}

type Phase     = 'loading' | 'micro_lesson' | 'deep_dive' | 'task' | 'mastery' | 'error'
type TileState = 'idle' | 'correct' | 'incorrect'

const SNAP_GAP_TUTORIAL_KEY =
  'critica_tutorial_seen_snap_gap_first_node'

const TUTORIAL_STEPS = [
  {
    label: 'Read the passage',
    code: 'TUT-SIG-001',
    text: 'In Snap-in-Gap, you will see a passage with blank gaps missing transition words. A tile bank on the right holds word options.\n\nYour mission: drag or click the correct tile into each gap to restore the paragraph\'s logical flow.',
    board: 'passage',
    notes: [
      'Drag a tile to fill the gap',
      'Gap turns teal when filled',
      'Click gap to clear it',
    ],
  },
  {
    label: 'Pick a tile',
    code: 'TUT-SIG-002',
    text: 'Look at the word tile bank on the right. Read the context before and after each gap. Ask yourself: is this a contrast? A result? An addition? Then click a tile to select it, it will highlight gold.',
    board: 'tiles',
    notes: [
      'Gold outline = current selected',
      'Faded tiles are already used',
      'Drag or click to place in gap',
    ],
  },
  {
    label: 'Fill the gap',
    code: 'TUT-SIG-003',
    text: 'After selecting a tile, click a gap in the passage to place it or drag the tile directly onto the gap. The gap will snap closed and turn teal. Click a filled gap to clear it and try again.',
    board: 'beforeAfter',
    notes: [
      'Teal snap = tile placed',
      'Click filled gap to clear',
      'One tile per gap only',
    ],
  },
  {
    label: 'Submit',
    code: 'TUT-SIG-004',
    text: 'When all gaps are filled, the Submit button activates. Hit it to check your answers. Correct gaps stay teal, wrong gaps turn red and clear giving you a chance to retry only the incorrect ones.',
    board: 'submit',
    notes: [
      'Bar fills as gaps are placed',
      'Submit unlocks at 4/4 filled',
      'Partial retry on wrong answers',
    ],
  },
] as const

// ── Color palette ─────────────────────────────────
const C = {
  pageBg:     '#2D0909',
  board:      '#D4A86A',
  canvas:     '#E8D5B0',
  cardPaper:  '#FFFBF0',
  cardBdr:    '#C9A06A',
  btnGold:    '#FFDFA7',
  btnDark:    '#432818',
  btnGoldBdr: '#8C5A3C',
  textDark:   '#1C0800',
  textMid:    '#8C5A3C',
  textLight:  '#C49A5A',
  textMuted:  '#A07850',
  accentRed:  '#800020',
  progressFg: '#432818',
  progressBg: '#C9A06A',
  dockBg:     '#C9A06A',
  tileGreen:  '#22aa55',
  tileRed:    '#cc3333',
}

// ── Shared styles ──────────────────────────────────
const F = "'Courier New', Courier, monospace"

const S = {
  page: {
    minHeight: '100vh',
    background: C.pageBg,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    fontFamily: F,
  },
  card: {
    maxWidth: 640,
    width: '100%',
    background: C.cardPaper,
    border: `1px solid ${C.cardBdr}`,
    borderRadius: 8,
    padding: 48,
    fontFamily: F,
  },
  stamp: {
    display: 'inline-block' as const,
    border: `2px solid ${C.btnGoldBdr}`,
    padding: '3px 14px',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.15em',
    color: C.textMid,
    marginBottom: 12,
    fontFamily: F,
  } as React.CSSProperties,
  h2: {
    fontSize: 20,
    fontWeight: 700,
    color: C.textDark,
    margin: '0 0 6px',
    fontFamily: F,
  } as React.CSSProperties,
  sub: {
    fontSize: 12,
    color: C.textMuted,
    margin: '0 0 16px',
    fontFamily: F,
  } as React.CSSProperties,
  body: {
    fontSize: 13,
    lineHeight: 1.85,
    color: C.textDark,
    margin: '0 0 32px',
    fontFamily: F,
  } as React.CSSProperties,
  hr: {
    border: 'none',
    borderTop: `1px solid ${C.cardBdr}`,
    margin: '16px 0',
  } as React.CSSProperties,
  btnPrimary: {
    padding: '10px 24px',
    background: C.btnGold,
    border: `2px solid ${C.btnGoldBdr}`,
    borderRadius: 8,
    color: C.textDark,
    fontFamily: F,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.08em',
  } as React.CSSProperties,
  btnSm: {
    padding: '7px 16px',
    background: 'transparent',
    border: `1px solid ${C.btnGoldBdr}`,
    borderRadius: 6,
    color: C.textMid,
    fontFamily: F,
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
  } as React.CSSProperties,
  tutorialBtn: {
    padding: '7px 14px',
    background: C.btnGold,
    border: `1px solid ${C.btnGoldBdr}`,
    borderRadius: 8,
    color: C.textDark,
    fontFamily: F,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    cursor: 'pointer',
  } as React.CSSProperties,
}

// ── Sub-screens ───────────────────────────────────
function BriefingGenerationScreen({ title }: { title?: string }) {
  const [stepIndex, setStepIndex] = useState(0)
  const steps = [
    'Calibrating coherence & transition markers...',
    'Synthesizing novel academic sentence pairs...',
    'Calibrating transition tiles & distractor logic...',
    'Finalizing dynamic 5-case session...',
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex(prev => (prev + 1) % steps.length)
    }, 1200)
    return () => clearInterval(timer)
  }, [steps.length])

  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: F, padding: 24, textAlign: 'center' }}>
      <div style={{
        maxWidth: 500, width: '100%', background: '#F2DEC1',
        border: `2px solid ${C.btnGoldBdr}`, borderRadius: 8, padding: '36px 30px',
        boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
      }}>
        <div style={S.stamp}>CRITICA PEDAGOGICAL ENGINE</div>
        <h3 style={{ fontSize: 17, color: C.textDark, margin: '8px 0 14px', fontFamily: F }}>
          {title ? title.toUpperCase() : 'GENERATING SNAP-IN GAP CASE FILE'}
        </h3>
        <div style={{
          background: C.cardPaper, border: `1px solid ${C.cardBdr}`, borderRadius: 6,
          padding: '14px 18px', margin: '0 0 20px', minHeight: 52,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <p style={{ margin: 0, fontSize: 12, color: C.textDark, fontFamily: F, fontWeight: 600 }}>
            {steps[stepIndex]}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.textLight }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.btnGold }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.textMid }} />
        </div>
      </div>
    </div>
  )
}

function ErrorScreen({ msg, onBack }: { msg: string; onBack: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: F, gap: 16 }}>
      <p style={{ color: C.tileRed, fontSize: 13 }}>{msg}</p>
      <button onClick={onBack} style={S.btnSm}>← DASHBOARD</button>
    </div>
  )
}

function LessonScreen({ node, onContinue }: { node: SnapNodeData; onContinue: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 40, fontFamily: F }}>
      <div style={{ maxWidth: 640, width: '100%', background: '#F2DEC1',
        border: `1px solid ${C.cardBdr}`, borderRadius: 8, padding: 48 }}>
        <div style={S.stamp}>MICRO-LESSON</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.textDark, margin: '0 0 6px' }}>
          {node.title}
        </h2>
        <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 16px' }}>{node.focus}</p>
        <hr style={S.hr} />
        <p style={{ fontSize: 14, lineHeight: 1.85, color: '#1C0800', margin: '0 0 32px' }}>
          {node.micro_lesson_text}
        </p>
        <button onClick={onContinue} style={S.btnPrimary}>Continue →</button>
      </div>
    </div>
  )
}

function DeepDiveScreen({ node, onContinue }: { node: SnapNodeData; onContinue: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 40, fontFamily: F }}>
      <div style={{ maxWidth: 700, width: '100%', background: C.cardPaper,
        border: `1px solid ${C.cardBdr}`, borderRadius: 8, padding: 48 }}>
        <div style={S.stamp}>DEEP DIVE READING</div>
        <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 20px', lineHeight: 1.7 }}>
          Read the full passage carefully. Do not skip — cognitive endurance is part of the exercise.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.95, color: C.textDark, background: C.canvas,
          border: `1px solid ${C.cardBdr}`, borderRadius: 6, padding: 28, margin: '0 0 32px' }}>
          {node.reading_passage}
        </p>
        <button onClick={onContinue} style={S.btnPrimary}>I have finished reading →</button>
      </div>
    </div>
  )
}

function MasteryScreen({ node, data, onDashboard, onNext, onReplay }:
  { node: SnapNodeData; data: any; onDashboard: () => void; onNext: () => void; onReplay?: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: F }}>
      <div style={{ maxWidth: 520, width: '100%', background: C.cardPaper,
        border: `2px solid ${C.tileGreen}`, borderRadius: 8, padding: 48, textAlign: 'center' }}>
        <div style={{ ...S.stamp, color: C.tileGreen, borderColor: C.tileGreen,
          fontSize: 16, padding: '8px 24px' }}>
          ✓ NODE MASTERED
        </div>
        <h2 style={{ fontSize: 20, color: C.tileGreen, margin: '8px 0 16px', fontFamily: F }}>
          {node.title}
        </h2>
        <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 28px' }}>
          Streak: {data?.streak ?? 0} days
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {data?.next_node && (
            <button onClick={onNext} style={S.btnPrimary}>NEXT NODE →</button>
          )}
          {onReplay && (
            <button onClick={onReplay} style={{ ...S.btnPrimary, background: '#22aa55', color: '#fff', borderColor: '#4ddd94' }}>
              REPLAY WITH FRESH QUESTIONS ↻
            </button>
          )}
          <button onClick={onDashboard} style={S.btnSm}>← DASHBOARD</button>
        </div>
      </div>
    </div>
  )
}

// ── Tutorial Popup ────────────────────────────────
function SnapGapTutorialPopup({
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
  const isFirst = step === 0
  const isLast = step === TUTORIAL_STEPS.length - 1

  const stepBox = (label: string, index: number) => {
    const complete = index < step
    const active = index === step
    return (
      <div key={label} style={{
        width: 156, height: 76,
        border: `1px solid ${C.cardBdr}`,
        background: complete ? '#c8e8d0' : active ? C.cardPaper : C.canvas,
        color: C.textDark,
        boxShadow: active ? '0 3px 0 rgba(0,0,0,0.25)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', textAlign: 'center',
        fontFamily: F, fontSize: 12, fontWeight: 700,
      }}>
        <div style={{ position: 'absolute', top: 7, left: '50%', transform: 'translateX(-50%)' }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: complete ? C.tileGreen : active ? C.btnGold : C.board,
            color: complete ? '#fff' : C.textDark, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700,
          }}>{complete ? '✓' : index + 1}</div>
        </div>
        <span style={{ marginTop: 20, lineHeight: 1.15 }}>{label}</span>
      </div>
    )
  }

  const renderBoard = () => {
    if (current.board === 'passage') {
      return (
        <div style={{ padding: '18px 16px 12px' }}>
          <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: C.textMid, marginBottom: 10 }}>EXAMPLE GAP</div>
          <div style={{ fontFamily: F, fontSize: 12, color: C.textDark, lineHeight: 1.4 }}>
            Reading is essential.
            <span style={{ display: 'inline-block', width: 96, height: 20, border: `1px dashed ${C.cardBdr}`, background: C.canvas, verticalAlign: 'middle', margin: '0 6px' }} />
            it builds critical thinking.
          </div>
        </div>
      )
    }

    if (current.board === 'tiles') {
      return (
        <div style={{ padding: '16px 14px 12px' }}>
          <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: C.textMid, marginBottom: 12 }}>WORD TILE BANK</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['FURTHERMORE', 'HOWEVER', 'ALTHOUGH', 'HENCE'].map((tile, i) => (
              <div key={tile} style={{
                padding: '8px 12px', minWidth: 92, textAlign: 'center',
                border: `2px solid ${i === 0 ? C.btnGoldBdr : C.cardBdr}`,
                background: i === 3 ? C.canvas : C.cardPaper,
                color: i === 3 ? C.textMuted : C.textDark,
                fontFamily: F, fontWeight: 700, fontSize: 11,
              }}>{tile}</div>
            ))}
          </div>
        </div>
      )
    }

    if (current.board === 'beforeAfter') {
      return (
        <div style={{ padding: '16px 14px 12px' }}>
          <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: C.textMid, marginBottom: 12 }}>BEFORE & AFTER</div>
          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', rowGap: 12, alignItems: 'center' }}>
            <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: C.textDark }}>BEFORE :</div>
            <div style={{ width: 88, height: 20, border: `1px dashed ${C.cardBdr}`, background: C.canvas }} />
            <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: C.textDark }}>AFTER :</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', border: `1px solid ${C.btnGoldBdr}`, background: C.btnGold, color: C.textDark, fontFamily: F, fontSize: 11, fontWeight: 700, width: 'fit-content' }}>FURTHERMORE</div>
          </div>
        </div>
      )
    }

    return (
      <div style={{ padding: '16px 14px 12px' }}>
        <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: C.textMid, marginBottom: 12 }}>PROGRESS BAR</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1, height: 10, background: C.canvas, border: `1px solid ${C.cardBdr}`, overflow: 'hidden' }}>
            <div style={{ width: '75%', height: '100%', background: C.progressFg }} />
          </div>
          <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: C.textDark, minWidth: 28, textAlign: 'right' }}>3 / 4</div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '8px 12px', background: C.btnGold, border: `1px solid ${C.btnGoldBdr}`, fontFamily: F, fontSize: 12, fontWeight: 700, color: C.textDark }}>SUBMIT →</div>
      </div>
    )
  }

  const primaryLabel = isLast ? 'START TRAINING →' : 'NEXT →'
  const secondaryLabel = isFirst ? 'EXIT TUTORIAL' : 'BACK'

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: F,
    }}>
      <div style={{ width: '100%', maxWidth: 840, background: C.canvas, border: `1px solid ${C.cardBdr}`, boxShadow: '0 18px 44px rgba(0,0,0,0.4)', padding: '10px 14px 14px', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.28em', color: C.textDark }}>CRITICA - FIELD BRIEFING DOCUMENT</div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.18em', color: C.textDark }}>{current.code}</div>
        </div>

        <div style={{ background: C.cardPaper, border: `1px solid ${C.cardBdr}`, borderRadius: '16px 16px 10px 10px', padding: '30px 24px 22px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -1, left: -1, width: 54, height: 24, borderRadius: '16px 0 14px 0', background: C.cardPaper, borderLeft: `1px solid ${C.cardBdr}`, borderTop: `1px solid ${C.cardBdr}` }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 42, marginBottom: 30 }}>
            <div style={{ width: 120, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, border: `2px solid ${C.btnGoldBdr}`, background: C.canvas, margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>
                <div style={{ width: 34, height: 34, background: C.btnDark, borderRadius: 4, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', background: C.btnGold }} />
                  <div style={{ position: 'absolute', bottom: 6, left: 5, right: 5, height: 10, borderRadius: '10px 10px 4px 4px', background: C.btnGold }} />
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.08em', color: C.textDark }}>AGENT CRIT</div>
              <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: '0.06em' }}>FIELD INSTRUCTOR</div>
            </div>

            <div style={{ position: 'relative', flex: 1, background: C.cardPaper, border: `1px solid ${C.cardBdr}`, boxShadow: '0 3px 12px rgba(0,0,0,0.12)', padding: '12px 16px', minHeight: 96, borderRadius: 6 }}>
              <div style={{ position: 'absolute', left: -9, top: 38, width: 18, height: 18, background: C.cardPaper, borderLeft: `1px solid ${C.cardBdr}`, borderBottom: `1px solid ${C.cardBdr}`, transform: 'rotate(45deg)' }} />
              <div style={{ fontSize: 13, lineHeight: 1.35, color: C.textDark, whiteSpace: 'pre-line' }}>{current.text}</div>
            </div>
          </div>

          <div style={{ border: `1px solid ${C.cardBdr}`, background: C.canvas, padding: 10, marginBottom: 28, borderRadius: 4 }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              {TUTORIAL_STEPS.map((stepItem, index) => stepBox(stepItem.label, index))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', background: C.canvas, border: `1px solid ${C.cardBdr}`, padding: 14, borderRadius: 4 }}>
            <div style={{ flex: 1, minHeight: 202, background: C.cardPaper, border: `1px solid ${C.cardBdr}`, padding: 18, position: 'relative', borderRadius: 4 }}>
              {renderBoard()}
            </div>

            <div style={{ width: 112, background: C.cardPaper, border: `1px solid ${C.cardBdr}`, padding: '10px 10px 12px', borderRadius: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: C.textMid, marginBottom: 10 }}>QUICK NOTES</div>
              {current.notes.map((note, index) => (
                <div key={note} style={{ fontSize: 9, lineHeight: 1.45, color: C.textDark }}>
                  {note}
                  {index < current.notes.length - 1 && <div style={{ height: 10 }} />}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
            <button onClick={isFirst ? onClose : onBack} style={{ ...S.btnSm, minWidth: 160, background: C.canvas, color: C.textDark, border: `1px solid ${C.btnGoldBdr}`, fontSize: 11, letterSpacing: '0.06em' }}>
              {secondaryLabel}
            </button>
            <button onClick={isLast ? onStart : onNext} style={{ ...S.btnPrimary, minWidth: 170, fontSize: 11, letterSpacing: '0.06em' }}>
              {primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────
export default function SnapInGapPage() {
  const router = useRouter()
  const params = useParams()
  const nodeId = params.nodeId as string

  const [phase,       setPhase]       = useState<Phase>('loading')
  const [snapNode,    setSnapNode]     = useState<SnapNodeData | null>(null)
  const [errorMsg,    setErrorMsg]    = useState('')

  const [pairIdx,     setPairIdx]     = useState(0)
  const [board,       setBoard]       = useState<Record<string, string>>({})
  const [locked,      setLocked]      = useState<string[]>([])
  const [tileState,   setTileState]   = useState<TileState>('idle')
  const [wrongs,      setWrongs]      = useState(0)
  const [masteryData, setMasteryData] = useState<any>(null)
  const [submitting,  setSubmitting]  = useState(false)

  // feedback state
  const [fbText,        setFbText]        = useState('')
  const [hintText,      setHintText]      = useState('')
  const [hintTier,      setHintTier]      = useState(0)
  const [drawer,        setDrawer]        = useState(false)
  const [tutorialOpen,  setTutorialOpen]  = useState(false)
  const [tutorialStep,  setTutorialStep]  = useState(0)

  // hint overlay state
  const [hintOverlay,     setHintOverlay]     = useState(false)
  const [hintOverlayText, setHintOverlayText] = useState('')
  const [hintOverlayTier, setHintOverlayTier] = useState(0)

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const inactiveRef = useRef(0)

  // session state
  const [sessionQueue,   setSessionQueue]   = useState<string[]>([])
  const [questionIndex,  setQuestionIndex]  = useState(0)
  const [sessionId,      setSessionId]      = useState<string | null>(null)
  const [sessionExercises, setSessionExercises] = useState<any[]>([])
  const [sessionStartId, setSessionStartId] = useState<string | null>(null)
  const [savedNextNode,  setSavedNextNode]  = useState<string | null>(null)
  const [savedStreak,    setSavedStreak]    = useState<number | null>(null)

  // ── Load a question inline ──────────────────
  const loadQuestion = useCallback(async (targetIndex: number, queue: string[]) => {
    setPhase('loading')
    try {
      if (sessionExercises.length > targetIndex) {
        const ex = sessionExercises[targetIndex]
        setSnapNode(prev => prev ? ({
          ...prev,
          title: ex.topic_title || prev.title,
          reading_passage: ex.reading_passage || prev.reading_passage,
          sentence_pairs: ex.sentence_pairs || prev.sentence_pairs,
          transition_tile_dock: ex.transition_tile_dock || prev.transition_tile_dock,
        }) : ex)
        setPairIdx(0)
        setBoard({})
        setLocked([])
        setTileState('idle')
        setWrongs(0)
        setFbText('')
        setHintText('')
        setHintTier(0)
        setDrawer(false)
        setHintOverlay(false)
        setHintOverlayText('')
        setHintOverlayTier(0)
        setPhase('task')
        return
      }

      const targetNodeId = queue[targetIndex] || nodeId
      const d = await apiFetch(`/nodes/snap-gap/${targetNodeId}/`)
      setSnapNode(d)
      setPairIdx(0)
      setBoard({})
      setLocked([])
      setTileState('idle')
      setWrongs(0)
      setFbText('')
      setHintText('')
      setHintTier(0)
      setDrawer(false)
      setHintOverlay(false)
      setHintOverlayText('')
      setHintOverlayTier(0)
      setPhase('task')
    } catch (e: any) {
      setErrorMsg(e?.error ?? 'Failed to load next question.')
      setPhase('error')
    }
  }, [sessionExercises, nodeId])

  // ── startSession ──────────────────────────────────
  const startSession = useCallback(async (forceFresh = false) => {
    setPhase('loading')
    const start = nodeId
    setSessionStartId(start)

    try {
      const sessionData = await fetchNodeSession('snap_gap', start, forceFresh)
      setSessionId(sessionData.session_id)
      setSessionExercises(sessionData.exercises || [])
      const firstEx = sessionData.exercises?.[0]
      setSnapNode({
        node_id: sessionData.node_id,
        title: sessionData.title,
        focus: sessionData.focus,
        difficulty: sessionData.difficulty,
        micro_lesson_text: sessionData.micro_lesson_text,
        reading_passage: sessionData.reading_passage || firstEx?.reading_passage || '',
        deep_dive_required: sessionData.deep_dive_required,
        sentence_pairs: firstEx?.sentence_pairs || [],
        transition_tile_dock: firstEx?.transition_tile_dock || [],
      })
      setSessionQueue(['q1', 'q2', 'q3', 'q4', 'q5'])
      setQuestionIndex(0)
      setPairIdx(0)
      setBoard({})
      setLocked([])
      setTileState('idle')
      setWrongs(0)
      setFbText('')
      setHintText('')
      setDrawer(false)
      setHintOverlay(false)
      setPhase(forceFresh ? 'task' : 'micro_lesson')
    } catch {
      // Fallback to legacy static node queue
      const saved = loadSession('snap_gap', start)
      if (saved && saved.sessionQueue.length === 5) {
        setSessionQueue(saved.sessionQueue)
        setQuestionIndex(saved.questionIndex)
        if (saved.next_node) setSavedNextNode(saved.next_node)
        if (saved.streak !== undefined) setSavedStreak(saved.streak)

        const activeId = saved.sessionQueue[saved.questionIndex] ?? start
        apiFetch(`/nodes/snap-gap/${activeId}/`)
          .then((d: SnapNodeData) => {
            setSnapNode(d)
            setPhase('task')
          })
          .catch((e: any) => {
            if (e?.status === 401)              { router.push('/auth');      return }
            if (e?.error === 'Node is locked.') { router.push('/dashboard'); return }
            setErrorMsg(e?.error ?? 'Failed to load node.')
            setPhase('error')
          })
      } else {
        apiFetch(`/nodes/snap-gap/${start}/`)
          .then((d: SnapNodeData) => {
            setSnapNode(d)
            setPhase('micro_lesson')

            apiFetch('/progression/dashboard/')
              .then((prog: any) => {
                const unlocked: string[] = prog.unlocked_nodes ?? []
                const queue = buildSessionQueue('snap_gap', start, unlocked)
                setSessionQueue(queue)
                setQuestionIndex(0)
                saveSession('snap_gap', start, {
                  sessionQueue: queue,
                  questionIndex: 0,
                })
              })
              .catch(() => {
                setSessionQueue([start])
                setQuestionIndex(0)
              })
          })
          .catch((e: any) => {
            if (e?.status === 401)              { router.push('/auth');      return }
            if (e?.error === 'Node is locked.') { router.push('/dashboard'); return }
            setErrorMsg(e?.error ?? 'Failed to load node.')
            setPhase('error')
          })
      }
    }
  }, [nodeId, router])

  useEffect(() => {
    startSession(false)
  }, [startSession])

  useEffect(() => {
    if (phase !== 'task' || nodeId !== 'snp_node_01') return

    const seen = localStorage.getItem(SNAP_GAP_TUTORIAL_KEY)
    if (seen === '1') return

    localStorage.setItem(SNAP_GAP_TUTORIAL_KEY, '1')
    setTutorialStep(0)
    setTutorialOpen(true)
  }, [phase, nodeId])

  // ── feedback ──────────────────────────────────────
  const callFeedback = useCallback(async (pair_id: string, tile: string, inactivity: boolean) => {
    if (sessionId && sessionExercises.length > questionIndex) {
      try {
        const res = await apiFetch(`/ai/session/${sessionId}/feedback/${questionIndex}/`, {
          method: 'POST',
          body: JSON.stringify({ pair_id, selected_tile: tile, tier: 1 }),
        })
        setFbText(res.explanation ?? 'That transition does not fit here. Re-read both sentences.')
        setHintText(res.hint ?? '')
        setHintTier(res.hint_tier ?? 1)
        setDrawer(true)
        return
      } catch {
        setFbText('That transition does not fit here. Re-read both sentences.')
        setHintText('')
        setDrawer(true)
        return
      }
    }

    const activeNodeId = snapNode?.node_id ?? nodeId
    try {
      const res = await apiFetch(`/nodes/snap-gap/${activeNodeId}/feedback/`, {
        method: 'POST',
        body: JSON.stringify({
          pair_id,
          selected_tile: tile,
          inactivity_seconds: inactivity ? 60 : inactiveRef.current,
        }),
      })
      setFbText(res.explanation ?? '')
      setHintText(res.hint ?? '')
      setHintTier(res.hint_tier ?? 0)
      setDrawer(true)
    } catch {
      setFbText('That transition does not fit here. Re-read both sentences.')
      setHintText('')
      setDrawer(true)
    }
  }, [nodeId, snapNode, sessionId, sessionExercises, questionIndex])

  // ── timer ─────────────────────────────────────────
  const resetTimer = useCallback(() => {
    inactiveRef.current = 0
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      inactiveRef.current += 1
      if (inactiveRef.current >= 60) {
        clearInterval(timerRef.current!)
        callFeedback('', '', true)
      }
    }, 1000)
  }, [callFeedback])

  useEffect(() => {
    if (phase === 'task') resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, resetTimer])

  // ── fetch hint overlay ────────────────────────────
  const fetchHint = useCallback(async () => {
    if (sessionId && sessionExercises.length > questionIndex) {
      try {
        const res = await apiFetch(`/ai/session/${sessionId}/feedback/${questionIndex}/`, {
          method: 'POST',
          body: JSON.stringify({ tier: 2 }),
        })
        const text = res.hint || res.explanation || 'Re-read the two sentences and think about how they relate logically.'
        setHintOverlayText(text)
        setHintOverlayTier(res.hint_tier ?? 2)
        setHintOverlay(true)
        return
      } catch {
        setHintOverlayText('Re-read the two sentences and think about how they relate logically.')
        setHintOverlay(true)
        return
      }
    }

    const activeNodeId = snapNode?.node_id ?? nodeId
    try {
      const res = await apiFetch(`/nodes/snap-gap/${activeNodeId}/feedback/`, {
        method: 'POST',
        body: JSON.stringify({
          pair_id: '',
          selected_tile: '',
          inactivity_seconds: 61,
        }),
      })
      const text = res.hint || res.explanation || 'Re-read the two sentences and think about how they relate logically.'
      setHintOverlayText(text)
      setHintOverlayTier(res.hint_tier ?? 0)
      setHintOverlay(true)
    } catch {
      setHintOverlayText('Re-read the two sentences and think about how they relate logically.')
      setHintOverlay(true)
    }
  }, [nodeId, snapNode, sessionId, sessionExercises, questionIndex])

  // ── tile click ────────────────────────────────────
  const handleTile = async (tile: string) => {
    if (!snapNode || tileState !== 'idle' || drawer) return
    resetTimer()
    const pair = snapNode.sentence_pairs[pairIdx]
    if (!pair) return

    // AI Dynamic Exercise Evaluation
    if (sessionId && sessionExercises.length > questionIndex) {
      const currentEx = sessionExercises[questionIndex]
      const correctTile = currentEx.correct_tile_map?.[pair.pair_id]
      const isCorrect = (correctTile === tile)

      if (isCorrect) {
        setTileState('correct')
        setBoard(prev => ({ ...prev, [pair.pair_id]: tile }))
        setLocked(prev => [...prev, pair.pair_id])
        setTimeout(() => {
          setTileState('idle')
          if (pairIdx < snapNode.sentence_pairs.length - 1) setPairIdx(i => i + 1)
        }, 900)
      } else {
        setTileState('incorrect')
        const nextWrongs = wrongs + 1
        setWrongs(nextWrongs)
        setTimeout(() => setTileState('idle'), 600)
        await callFeedback(pair.pair_id, tile, false)
        if (nextWrongs >= 3) fetchHint()
      }
      return
    }

    // Legacy Evaluation
    try {
      const res = await apiFetch(`/nodes/snap-gap/${snapNode.node_id}/evaluate-gap/`, {
        method: 'POST',
        body: JSON.stringify({ pair_id: pair.pair_id, selected_tile: tile }),
      })
      if (res.result === 'correct') {
        setTileState('correct')
        setBoard(prev => ({ ...prev, [pair.pair_id]: tile }))
        setLocked(prev => [...prev, pair.pair_id])
        setTimeout(() => {
          setTileState('idle')
          if (pairIdx < snapNode.sentence_pairs.length - 1) setPairIdx(i => i + 1)
        }, 900)
      } else {
        setTileState('incorrect')
        const nextWrongs = wrongs + 1
        setWrongs(nextWrongs)
        setTimeout(() => setTileState('idle'), 600)
        await callFeedback(pair.pair_id, tile, false)
        if (nextWrongs >= 3) fetchHint()
      }
    } catch { setErrorMsg('Evaluation failed.') }
  }

  // ── submit ────────────────────────────────────────
  const handleSubmit = async () => {
    if (!snapNode || submitting) return
    setSubmitting(true)

    // 1. AI Dynamic Session Submission
    if (sessionId && sessionExercises.length > questionIndex) {
      const currentEx = sessionExercises[questionIndex]
      const correctTileMap = currentEx.correct_tile_map || {}
      const isCorrect = Object.keys(correctTileMap).every(pid => board[pid] === correctTileMap[pid])

      apiFetch(`/ai/session/${sessionId}/evaluate/${questionIndex}/`, {
        method: 'POST',
        body: JSON.stringify({ board_state: board, node_id: nodeId, module: 'snap_gap' }),
      }).catch(() => {})

      if (isCorrect) {
        const nextIdx = questionIndex + 1
        if (nextIdx < sessionExercises.length) {
          setQuestionIndex(nextIdx)
          loadQuestion(nextIdx, sessionQueue)
          setSubmitting(false)
        } else {
          // Finished all 5 questions
          try {
            const finalRes = await apiFetch(`/ai/session/${sessionId}/mastery/`, { method: 'POST' })
            if (sessionStartId) clearSession('snap_gap', sessionStartId)
            setMasteryData({
              next_node: finalRes.next_node,
              streak: finalRes.streak ?? 1,
            })
            setPhase('mastery')
          } catch {
            setSubmitting(false)
          }
        }
        return
      } else {
        setFbText('Some pairs are incorrect. Check and retry.')
        setHintText('')
        setDrawer(true)
        setSubmitting(false)
        return
      }
    }

    // 2. Legacy Submission
    try {
      const res = await apiFetch(`/nodes/snap-gap/${snapNode.node_id}/mastery/`, {
        method: 'POST',
        body: JSON.stringify({
          board_state: board,
          save_progression: false,
        }),
      })
      if (res.status === 'mastered') {
        const nextIdx = questionIndex + 1

        if (nextIdx < sessionQueue.length) {
          const newNextNode = savedNextNode
          const newStreak = savedStreak

          if (sessionStartId) {
            saveSession('snap_gap', sessionStartId, {
              sessionQueue,
              questionIndex: nextIdx,
              next_node: newNextNode || undefined,
              streak: newStreak !== null ? newStreak : undefined,
            })
          }
          setQuestionIndex(nextIdx)
          loadQuestion(nextIdx, sessionQueue)
        } else {
          let finalRes = res
          if (sessionStartId) {
            finalRes = await apiFetch(
              `/nodes/snap-gap/${sessionStartId}/mastery/`,
              {
                method: 'POST',
                body: JSON.stringify({
                  commit_only: true,
                }),
              },
            )
          }

          const newNextNode = savedNextNode || finalRes.next_node
          const newStreak = savedStreak !== null ? savedStreak : (finalRes.streak ?? null)

          if (sessionStartId) clearSession('snap_gap', sessionStartId)
          setMasteryData({
            next_node: newNextNode,
            streak: newStreak,
          })
          setPhase('mastery')
        }
      }
    } catch (e: any) {
      setFbText(e?.status === 'incomplete'
        ? 'Some pairs are incorrect. Check and retry.'
        : 'Submission failed. Please try again.')
      setHintText('')
      setDrawer(true)
    } finally { setSubmitting(false) }
  }

  // ── phase guards ──────────────────────────────────
  if (phase === 'loading')      return <BriefingGenerationScreen title={snapNode?.title} />
  if (phase === 'error')        return <ErrorScreen msg={errorMsg} onBack={() => router.push('/dashboard')} />
  if (phase === 'micro_lesson') return <LessonScreen node={snapNode!} onContinue={() => setPhase(snapNode!.deep_dive_required ? 'deep_dive' : 'task')} />
  if (phase === 'deep_dive')    return <DeepDiveScreen node={snapNode!} onContinue={() => setPhase('task')} />
  if (phase === 'mastery')      return (
    <MasteryScreen
      node={snapNode!} data={masteryData}
      onDashboard={() => router.push('/dashboard')}
      onNext={() => masteryData?.next_node && router.push(`/nodes/snap-gap/${masteryData.next_node}`)}
      onReplay={() => startSession(true)}
    />
  )

  // ── TASK PHASE ────────────────────────────────────
  const currentPair = snapNode!.sentence_pairs[pairIdx]
  const allDone     = locked.length === snapNode!.sentence_pairs.length

  const openTutorial  = () => { setTutorialStep(0); setTutorialOpen(true) }
  const closeTutorial = () => setTutorialOpen(false)
  const nextTutorialStep = () => setTutorialStep(prev => Math.min(prev + 1, TUTORIAL_STEPS.length - 1))
  const prevTutorialStep = () => setTutorialStep(prev => Math.max(prev - 1, 0))

  return (
    <div style={{ minHeight: '100vh', background: C.pageBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F }}>

      {/* ── FIXED LEFT FOLDER TABS ── */}
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
            boxShadow: '3px 2px 8px rgba(0,0,0,0.35)',
            fontFamily: F,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = C.board)}
          onMouseLeave={e => (e.currentTarget.style.background = C.btnGold)}
        >HINT</button>
        <button
          onClick={() => startSession(true)}
          style={{
            writingMode: 'vertical-lr',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.13em',
            color: C.textDark, background: C.btnGold,
            border: `1px solid ${C.btnGoldBdr}`, borderLeft: 'none',
            borderRadius: '0 6px 6px 0',
            cursor: 'pointer', padding: '14px 8px',
            boxShadow: '3px 2px 8px rgba(0,0,0,0.35)',
            fontFamily: F,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = C.board)}
          onMouseLeave={e => (e.currentTarget.style.background = C.btnGold)}
        >FRESH CASE ↻</button>
        <button
          onClick={() => {
            if (sessionStartId && sessionQueue.length > 0) {
              saveSession('snap_gap', sessionStartId, {
                sessionQueue,
                questionIndex,
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
            boxShadow: '3px 2px 8px rgba(0,0,0,0.35)',
            fontFamily: F,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = C.board)}
          onMouseLeave={e => (e.currentTarget.style.background = C.btnGold)}
        >END SESSION</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'stretch',
        boxShadow: '0 12px 48px rgba(0,0,0,0.55)', borderRadius: 6 }}>

        {/* ── BOARD ── */}
        <div style={{
          background: C.board, borderRadius: 6,
          overflow: 'hidden', display: 'flex', flexDirection: 'column', width: 900,
        }}>

          {/* banner */}
          <div style={{ padding: '12px 20px 10px', textAlign: 'center', background: C.board }}>
            <div style={{
              display: 'inline-block', border: `1.5px solid ${C.btnGoldBdr}`,
              padding: '7px 24px', fontSize: 14, fontWeight: 700,
              letterSpacing: '0.1em', color: C.textDark,
              background: 'rgba(255,255,255,0.18)', fontFamily: F,
            }}>
              <span style={{ color: C.textMid }}>OBJECTIVE: </span>
              <span style={{ color: C.accentRed }}>
                SELECT THE CORRECT TRANSITION TILE TO BRIDGE THE GAP
              </span>
            </div>
          </div>

          {/* difficulty badge + Q counter */}
          <div style={{ padding: '6px 16px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* difficulty pill */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(0,0,0,0.15)', borderRadius: 20, padding: '4px 12px',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: DIFFICULTY_COLORS[snapNode!.difficulty ?? nodeDifficulty(nodeId)],
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: C.btnDark, fontFamily: F }}>
                LVL {snapNode!.difficulty ?? nodeDifficulty(nodeId)} — {DIFFICULTY_LABELS[snapNode!.difficulty ?? nodeDifficulty(nodeId)]}
              </span>
            </div>
            {/* Q counter pill */}
            {sessionQueue.length > 0 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center',
                background: 'rgba(0,0,0,0.15)', borderRadius: 20, padding: '4px 12px',
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.btnDark, fontFamily: F }}>
                  Q {questionIndex + 1} / {sessionQueue.length}
                </span>
              </div>
            )}
          </div>
          {/* progress bar */}
          {sessionQueue.length > 0 && (
            <div style={{ padding: '2px 16px 6px' }}>
              <div style={{ height: 4, background: 'rgba(0,0,0,0.15)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(questionIndex / sessionQueue.length) * 100}%`,
                  background: 'rgba(0,0,0,0.35)',
                  borderRadius: 4,
                  transition: 'width 0.3s ease-in-out',
                }} />
              </div>
            </div>
          )}

          {/* progress dots */}
          {snapNode!.sentence_pairs.length > 0 && (
            <div style={{ padding: '4px 24px 6px', display: 'flex', gap: 6, justifyContent: 'center' }}>
              {snapNode!.sentence_pairs.map((p, i) => (
                <div key={p.pair_id} style={{
                  width: 24, height: 5, borderRadius: 3,
                  background: locked.includes(p.pair_id)
                    ? C.tileGreen
                    : i === pairIdx
                      ? C.btnDark
                      : 'rgba(0,0,0,0.15)',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>
          )}

          {/* ── 3-COLUMN LAYOUT: sentence A | tile dock | sentence B ── */}
          <div style={{ display: 'flex', gap: 20, padding: '22px 28px 0', background: C.canvas, alignItems: 'stretch', flex: 1 }}>

            {/* LEFT — Sentence A */}
            <div style={{
              flex: 1, background: C.cardPaper, border: `1.5px solid ${C.cardBdr}`,
              borderRadius: 8, padding: '20px 22px',
              fontSize: 14, lineHeight: 1.85, color: C.textDark, fontFamily: F,
            }}>
              {currentPair ? currentPair.sentence_a : ''}
            </div>

            {/* MIDDLE — Scrollable tile dock */}
            <div style={{ width: 168, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              {/* dock label */}
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.13em',
                color: C.textMid, fontFamily: F, textAlign: 'center',
              }}>
                TRANSITION TILE DOCK
              </div>

              {/* gap state indicator */}
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', fontFamily: F,
                textAlign: 'center', minHeight: 18, transition: 'all 0.25s',
                color: tileState === 'correct'   ? C.tileGreen
                     : tileState === 'incorrect' ? C.tileRed
                     : 'transparent',
              }}>
                {tileState === 'correct'
                  ? `✓ ${currentPair ? (board[currentPair.pair_id] ?? '') : ''}`
                  : tileState === 'incorrect' ? '✕ WRONG' : '·'}
              </div>

              {/* scrollable tile list */}
              <div style={{
                flex: 1, overflowY: 'auto', width: '100%',
                background: '#F4E6CC',
                border: `1.5px solid ${C.cardBdr}`,
                borderRadius: 8,
                display: 'flex', flexDirection: 'column',
                boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.06), 3px 0 0 ${C.cardBdr}`,
                maxHeight: 280,
              }}>
                {snapNode!.transition_tile_dock.map((tile, idx) => (
                  <button
                    key={tile}
                    disabled={tileState !== 'idle' || allDone}
                    onClick={() => handleTile(tile)}
                    style={{
                      padding: '13px 14px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: idx < snapNode!.transition_tile_dock.length - 1
                        ? `1px solid ${C.cardBdr}` : 'none',
                      fontSize: 12, fontWeight: 700, fontFamily: F,
                      color: C.textDark,
                      cursor: tileState !== 'idle' || allDone ? 'not-allowed' : 'pointer',
                      opacity: tileState !== 'idle' || allDone ? 0.45 : 1,
                      textAlign: 'center',
                      letterSpacing: '0.05em',
                      transition: 'background 0.15s, color 0.15s',
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => {
                      if (tileState === 'idle' && !allDone) {
                        e.currentTarget.style.background = C.btnGold
                        e.currentTarget.style.color = C.textDark
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = C.textDark
                    }}
                  >
                    {tile}
                  </button>
                ))}
              </div>
            </div>

            {/* RIGHT — Sentence B */}
            <div style={{
              flex: 1, background: C.cardPaper, border: `1.5px solid ${C.cardBdr}`,
              borderRadius: 8, padding: '20px 22px',
              fontSize: 14, lineHeight: 1.85, color: C.textDark, fontFamily: F,
            }}>
              {currentPair ? currentPair.sentence_b : ''}
            </div>
          </div>

          {/* all done message + bottom padding */}
          <div style={{ background: C.canvas, padding: '10px 28px 18px', minHeight: 36, textAlign: 'center' }}>
            {allDone && (
              <div style={{
                fontSize: 13, color: C.tileGreen,
                fontWeight: 700, letterSpacing: '0.1em', fontFamily: F,
              }}>
                ALL GAPS BRIDGED — SUBMIT WHEN READY
              </div>
            )}
          </div>

          {/* submit bar */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 24px 16px', background: C.board,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={openTutorial} style={S.tutorialBtn}>
                Show tutorial
              </button>
              <span style={{
                fontSize: 10, color: C.textMid,
                fontWeight: 700, letterSpacing: '0.08em',
                fontFamily: F,
              }}>
                {locked.length} / {snapNode!.sentence_pairs.length} PAIRS BRIDGED
                {wrongs > 0 && (
                  <span style={{ marginLeft: 14, color: C.accentRed }}>
                    ATTEMPTS: {wrongs}
                  </span>
                )}
              </span>
            </div>
            <button
              disabled={!allDone || submitting}
              onClick={handleSubmit}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: submitting ? C.textMuted : allDone ? '#FFDFA7' : 'rgba(255,223,167,0.45)',
                color: C.textDark, border: `1.5px solid ${C.btnGoldBdr}`, borderRadius: 10,
                padding: '12px 30px', fontSize: 13, fontWeight: 700,
                letterSpacing: '0.14em',
                cursor: allDone && !submitting ? 'pointer' : 'not-allowed',
                fontFamily: F, transition: 'background 0.2s',
              }}
            >
              {submitting ? 'CHECKING...' : <>SUBMIT <span style={{ fontSize: 18, lineHeight: 1 }}>→</span></>}
            </button>
          </div>
        </div>
      </div>

      <SnapGapTutorialPopup
        open={tutorialOpen}
        step={tutorialStep}
        onClose={closeTutorial}
        onBack={prevTutorialStep}
        onNext={nextTutorialStep}
        onStart={() => setTutorialOpen(false)}
      />

      {/* hint overlay */}
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
            background: C.cardPaper,
            border: `2px solid ${C.cardBdr}`,
            borderRadius: 8,
            padding: '16px 18px 14px',
            maxWidth: 260,
            boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
            pointerEvents: 'all',
          }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
              color: C.textMid, marginBottom: 8, fontFamily: F,
            }}>
              SCAFFOLD HINT{hintOverlayTier > 0 ? ` — TIER ${hintOverlayTier}` : ''}
            </div>
            <p style={{
              fontSize: 12, color: C.textDark, lineHeight: 1.65,
              margin: '0 0 14px', fontFamily: F,
            }}>
              {hintOverlayText}
            </p>
            <button
              onClick={() => setHintOverlay(false)}
              style={{
                fontSize: 10, fontWeight: 700, color: C.textDark,
                background: C.btnGold, border: `1px solid ${C.btnGoldBdr}`,
                padding: '5px 14px', cursor: 'pointer',
                fontFamily: F, letterSpacing: '0.06em', borderRadius: 6,
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
          background: C.pageBg, border: `2px solid ${C.accentRed}`, borderBottom: 'none',
          padding: '20px 36px 28px', zIndex: 200, maxHeight: 300,
          overflowY: 'auto', fontFamily: F,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ ...S.stamp, color: C.accentRed, borderColor: C.accentRed, marginBottom: 0 }}>
              FEEDBACK
            </div>
            <button
              onClick={() => { setDrawer(false); resetTimer() }}
              style={{ background: 'none', border: 'none', color: C.accentRed, fontSize: 20, cursor: 'pointer', fontFamily: F }}
            >
              ✕
            </button>
          </div>
          {fbText && (
            <p style={{ fontSize: 14, color: C.canvas, lineHeight: 1.7, marginBottom: 12, fontFamily: F }}>
              {fbText}
            </p>
          )}
          {hintText && (
            <div style={{ background: '#3D1A00', border: `1px solid ${C.btnGoldBdr}`, borderRadius: 3, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: C.textLight, marginBottom: 6, fontFamily: F }}>
                SCAFFOLD HINT — TIER {hintTier}
              </div>
              <p style={{ fontSize: 13, color: C.canvas, lineHeight: 1.7, margin: 0, fontFamily: F }}>
                {hintText}
              </p>
            </div>
          )}
          <button style={S.btnSm} onClick={() => { setDrawer(false); resetTimer() }}>
            Close and reattempt
          </button>
        </div>
      )}
    </div>
  )
}