'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams }             from 'next/navigation'
import { apiFetch }                          from '@/lib/api'
import {
  buildSessionQueue, saveSession, loadSession, clearSession,
  nodeDifficulty, DIFFICULTY_LABELS, DIFFICULTY_COLORS,
} from '@/lib/nodeSession'
import styles from './page.module.css'

// ── Types ────────────────────────────────────────────────────
interface Block { block_id: string; text: string }
interface NodeData {
  node_id:            string
  title:              string
  focus:              string
  difficulty:         number
  micro_lesson_text:  string
  reading_passage:    string
  deep_dive_required: boolean
  paragraph_blocks:   Block[]
}
type Phase       = 'loading' | 'micro_lesson' | 'deep_dive' | 'task' | 'mastery' | 'error'
type SubmitState = 'idle' | 'submitting' | 'correct' | 'incorrect'

const TEXT_STRUCTURE_TUTORIAL_KEY = 'critica_tutorial_seen_logic_thread_first_node'

const TUTORIAL_STEPS = [
  { stepLabel: 'Overview',     bubble: "Welcome to Text Structure Mastery. You will see paragraph cards pinned to a cork bulletin board all out of order.\n\nYour mission: connect them in the correct logical sequence by drawing a red thread between them, just like a detective's case board." },
  { stepLabel: 'Select Card',  bubble: 'Click any card to select it. It will glow with a gold outline and the node dot turns red. Read its content carefully before connecting. You can click the same card again to deselect it.' },
  { stepLabel: 'Draw thread',  bubble: "After selecting the first card, click a second card. A red thread is drawn between them with a numbered circle showing the connection order. Keep going until all cards form a complete sequence." },
  { stepLabel: 'Submit',       bubble: "Once you've connected all cards, hit Submit. Correct connections turn teal. Wrong ones turn red — those connections are cleared so you can try again." },
] as const

// ── Canvas geometry ──────────────────────────────────────────
const CW = 900, CH = 520, CARD_W = 230, CARD_H = 138

const SCATTER = [
  { x: 52,  y: 38  },
  { x: 288, y: 188 },
  { x: 52,  y: 248 },
  { x: 504, y: 48  },
  { x: 504, y: 228 },
  { x: 288, y: 316 },
]

function bezierPath(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  const dx = x2 - x1, dy = y2 - y1
  const L  = Math.sqrt(dx * dx + dy * dy) || 1
  return `M${x1},${y1} Q${mx + (-dy / L) * 58},${my + (dx / L) * 58} ${x2},${y2}`
}

// ── Color palette ─────────────────────────────────────────────
const FONT = "'Courier New', Courier, monospace"

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
} as const

// ── Shared inline style atoms ─────────────────────────────────
const stampS: React.CSSProperties = {
  display: 'inline-block', border: `2px solid ${C.textMid}`,
  padding: '3px 14px', fontSize: 10, fontWeight: 700,
  letterSpacing: '0.15em', color: C.textMid,
  marginBottom: 12, fontFamily: FONT,
}
const btnPrimary: React.CSSProperties = {
  padding: '10px 24px', background: C.btnGold,
  border: `2px solid ${C.btnGoldBdr}`, borderRadius: 10, color: C.textDark,
  fontFamily: FONT, fontSize: 11, fontWeight: 700,
  cursor: 'pointer', letterSpacing: '0.08em',
}
const btnSm: React.CSSProperties = {
  padding: '7px 16px', background: 'transparent',
  border: `1px solid ${C.textMid}`, borderRadius: 2, color: C.textLight,
  fontFamily: FONT, fontSize: 10, fontWeight: 700, cursor: 'pointer',
}

// ── Sub-screens ───────────────────────────────────────────────
function LoadScreen() {
  return (
    <div className={styles.loadingWrap} style={{
      minHeight: '100vh', background: C.pageBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT,
    }}>
      <span style={{ color: C.textLight, fontSize: 12, letterSpacing: '0.18em', fontFamily: FONT }}>
        LOADING NODE
      </span>
      <div className={styles.loadingDots}>
        <div className={styles.dot} />
        <div className={styles.dot} />
        <div className={styles.dot} />
      </div>
    </div>
  )
}

function ErrorScreen({ msg, onBack }: { msg: string; onBack: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT, gap: 16 }}>
      <p style={{ color: '#ff6b6b', fontSize: 13 }}>{msg}</p>
      <button onClick={onBack} style={btnSm}>← DASHBOARD</button>
    </div>
  )
}

function LessonScreen({ node, onContinue }: { node: NodeData; onContinue: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 40, fontFamily: FONT }}>
      <div className={styles.screenCard} style={{ maxWidth: 640, width: '100%',
        background: '#F2DEC1', border: `1px solid ${C.btnGoldBdr}`, borderRadius: 8, padding: 48 }}>
        <div style={stampS}>MICRO-LESSON</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.btnDark, margin: '0 0 6px', fontFamily: FONT }}>
          {node.title}
        </h2>
        <p style={{ fontSize: 12, color: C.textMid, margin: '0 0 16px', fontFamily: FONT }}>{node.focus}</p>
        <hr style={{ border: 'none', borderTop: `1px solid ${C.btnGoldBdr}`, margin: '16px 0' }} />
        <p style={{ fontSize: 14, lineHeight: 1.85, color: C.textDark, margin: '0 0 32px', fontFamily: FONT }}>
          {node.micro_lesson_text}
        </p>
        <button onClick={onContinue} style={btnPrimary}>Continue →</button>
      </div>
    </div>
  )
}

function DeepDiveScreen({ node, onContinue }: { node: NodeData; onContinue: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 40, fontFamily: FONT }}>
      <div className={styles.screenCard} style={{ maxWidth: 700, width: '100%',
        background: '#2A1200', border: `1px solid ${C.btnGoldBdr}`, borderRadius: 8, padding: 48 }}>
        <div style={stampS}>DEEP DIVE READING</div>
        <p style={{ fontSize: 13, color: C.textMid, margin: '0 0 20px', lineHeight: 1.7, fontFamily: FONT }}>
          Read the full passage carefully. Do not skip — cognitive endurance is part of the exercise.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.95, color: C.canvas, background: C.pageBg,
          border: `1px solid ${C.btnGoldBdr}`, borderRadius: 6, padding: 28,
          margin: '0 0 32px', fontFamily: FONT }}>
          {node.reading_passage}
        </p>
        <button onClick={onContinue} style={btnPrimary}>I have finished reading →</button>
      </div>
    </div>
  )
}

function MasteryScreen({ node, data, onDashboard, onNext }:
  { node: NodeData; data: any; onDashboard: () => void; onNext: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
      <div className={styles.screenCard} style={{ maxWidth: 480, width: '100%',
        background: '#0A1E0A', border: '2px solid #4ddd94', borderRadius: 8,
        padding: 52, textAlign: 'center' }}>
        <div style={{ ...stampS, color: '#4ddd94', borderColor: '#4ddd94', fontSize: 16, padding: '8px 24px' }}>
          ✓ NODE MASTERED
        </div>
        <h2 style={{ fontSize: 20, color: '#4ddd94', margin: '8px 0 16px', fontFamily: FONT }}>
          {node.title}
        </h2>
        <p style={{ fontSize: 12, color: C.textLight, margin: '0 0 28px', fontFamily: FONT }}>
          Streak: {data?.streak ?? 0} days
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {data?.next_node && <button onClick={onNext} style={btnPrimary}>NEXT NODE →</button>}
          <button onClick={onDashboard} style={btnSm}>← DASHBOARD</button>
        </div>
      </div>
    </div>
  )
}

// ── Tutorial ──────────────────────────────────────────────────
function TutorialPopup({ open, step, onBack, onNext, onClose, onStart }: {
  open: boolean; step: number
  onBack: () => void; onNext: () => void
  onClose: () => void; onStart: () => void
}) {
  if (!open) return null

  const tutorialCode = `TUT-TSM-${String(step + 1).padStart(3, '0')}`
  const stepCfg  = TUTORIAL_STEPS[step]
  const isFirst  = step === 0
  const isLast   = step === TUTORIAL_STEPS.length - 1

  const navItem = (label: string, index: number) => {
    const complete = index < step
    const active   = index === step
    return (
      <div key={label} className={styles.tutorialNavItem} style={{
        width: 156, height: 76, border: `1px solid ${C.btnGoldBdr}`,
        background: complete ? '#b9dfbf' : active ? C.cardPaper : C.canvas,
        color: C.textDark,
        boxShadow: active ? '0 3px 0 rgba(0,0,0,0.35)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', textAlign: 'center', fontFamily: FONT, fontSize: 12, fontWeight: 700,
      }}>
        <div style={{ position: 'absolute', top: 7, left: '50%', transform: 'translateX(-50%)' }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: complete ? '#36b24a' : active ? C.btnGold : C.cardBdrIdle,
            color: complete ? '#fff' : C.textDark,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700,
          }}>
            {complete ? '✓' : index + 1}
          </div>
        </div>
        <span style={{ marginTop: 20, lineHeight: 1.15 }}>{label}</span>
      </div>
    )
  }

  const renderBoard = () => {
    if (step === 0) return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 34, padding: '18px 14px 12px' }}>
        <div style={{ width: 108, height: 70, border: '1.5px solid #b4b0a8', background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
          boxShadow: '0 3px 10px rgba(0,0,0,0.12)', position: 'relative', marginLeft: 36 }}>
          <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', width: 10, height: 10, borderRadius: '50%', background: '#2049d4' }} />
          <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700 }}>CARD A</div>
          <div style={{ fontFamily: FONT, fontSize: 10, color: '#444', lineHeight: 1.25, textAlign: 'center', marginTop: 4 }}>Opening claim of the argument...</div>
        </div>
        <div style={{ fontFamily: FONT, color: '#222', fontSize: 24, letterSpacing: '0.18em' }}>······→</div>
        <div style={{ width: 108, height: 70, border: '1.5px solid #b4b0a8', background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
          boxShadow: '0 3px 10px rgba(0,0,0,0.12)', position: 'relative', marginLeft: 4 }}>
          <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', width: 10, height: 10, borderRadius: '50%', background: '#d02c5f' }} />
          <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700 }}>CARD B</div>
          <div style={{ fontFamily: FONT, fontSize: 10, color: '#444', lineHeight: 1.25, textAlign: 'center', marginTop: 4 }}>Evidence that supports it...</div>
        </div>
      </div>
    )
    if (step === 1) return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '16px 12px 12px' }}>
        <div style={{ width: 120, height: 96, border: '3px solid #f0c400', borderRadius: 8, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.18)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', width: 10, height: 10, borderRadius: '50%', background: '#d02c5f' }} />
          <div style={{ textAlign: 'center', paddingTop: 12, fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#b49500' }}>SELECTED</div>
          <div style={{ padding: '6px 10px 0', fontFamily: FONT, fontSize: 10, color: '#333', lineHeight: 1.35 }}>Evidence that supports it...</div>
        </div>
        <div style={{ fontFamily: FONT, fontSize: 20, color: '#444' }}>←</div>
        <div style={{ fontFamily: FONT, fontSize: 12, color: '#444', lineHeight: 1.3 }}>glowing border = selected</div>
      </div>
    )
    if (step === 2) return (
      <div style={{ position: 'relative', height: 145, padding: '18px 16px 10px' }}>
        <div style={{ position: 'absolute', left: 28, top: 34, width: 118, height: 80,
          border: '2px solid #58baf7', background: '#fff', boxShadow: '0 3px 10px rgba(0,0,0,0.16)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', width: 10, height: 10, borderRadius: '50%', background: '#0a4ebd' }} />
          <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700 }}>CARD A</div>
          <div style={{ fontFamily: FONT, fontSize: 10, color: '#333', lineHeight: 1.35, textAlign: 'center', marginTop: 2 }}>Opening claim...</div>
        </div>
        <svg width={285} height={112} style={{ position: 'absolute', left: 124, top: 30 }}>
          <path d="M14,56 C62,36 90,36 128,52" stroke="#b67b75" strokeWidth={2.1} fill="none" />
          <circle cx={74} cy={50} r={11} fill="#fff" stroke="#b03030" strokeWidth={1.8} />
          <text x={74} y={54} textAnchor="middle" fontFamily={FONT} fontSize={9} fontWeight={700} fill="#b03030">1</text>
        </svg>
        <div style={{ position: 'absolute', left: 235, top: 34, width: 118, height: 80,
          border: '2px solid #58baf7', background: '#fff', boxShadow: '0 3px 10px rgba(0,0,0,0.16)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', width: 10, height: 10, borderRadius: '50%', background: '#c91f55' }} />
          <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700 }}>CARD B</div>
          <div style={{ fontFamily: FONT, fontSize: 10, color: '#333', lineHeight: 1.35, textAlign: 'center', marginTop: 2 }}>Evidence that supports it...</div>
        </div>
      </div>
    )
    return (
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 20 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, border: '1px solid #59b0e0', background: '#d8efff', color: '#167ab2', padding: '8px 14px', fontFamily: FONT, fontSize: 11, fontWeight: 700, width: 'fit-content', borderRadius: 4 }}>
            <span>✓</span> Correct connection
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, border: '1px solid #d18b84', background: '#f8dddb', color: '#b0443e', padding: '8px 14px', fontFamily: FONT, fontSize: 11, fontWeight: 700, width: 'fit-content', borderRadius: 4 }}>
            <span>✕</span> Wrong — cleared for retry
          </div>
        </div>
      </div>
    )
  }

  const quickNotes: Record<number, string[]> = {
    0: ['Red thread = your connection', 'Nodes turn teal when linked', '6 cards total to sequence'],
    1: ['Gold outline = selected',      'Read content before linking', 'Click again to deselect'],
    2: ['Numbered circle = order',      'Node turns teal once linked',  'Clear All to restart'],
    3: ['Bar fills as gaps placed',     'Submit unlocks at all filled', 'Partial retry on wrong'],
  }

  return (
    <div className={styles.tutorialOverlay} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: FONT,
    }}>
      <div className={styles.tutorialModal} style={{
        width: '100%', maxWidth: 840, background: C.canvas,
        border: `1px solid ${C.btnGoldBdr}`,
        boxShadow: '0 18px 44px rgba(0,0,0,0.55)', padding: '10px 14px 14px',
        borderRadius: 6,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.28em', color: C.textDark }}>
            CRITICA — FIELD BRIEFING
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.18em', color: C.textMuted }}>
            {tutorialCode}
          </div>
        </div>

        <div style={{ background: C.board, border: `1px solid ${C.btnGoldBdr}`, borderRadius: '16px 16px 10px 10px', padding: '30px 24px 22px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -1, left: -1, width: 54, height: 24, borderRadius: '16px 0 14px 0', background: C.board, borderLeft: `1px solid ${C.btnGoldBdr}`, borderTop: `1px solid ${C.btnGoldBdr}` }} />

          {/* Agent bubble */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 42, marginBottom: 28 }}>
            <div style={{ width: 120, textAlign: 'center', flexShrink: 0 }}>
              <div style={{ width: 56, height: 56, border: `2px solid ${C.btnGoldBdr}`, background: C.cardPaper, margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
                <div style={{ width: 34, height: 34, background: C.btnDark, borderRadius: 4, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', background: C.canvas }} />
                  <div style={{ position: 'absolute', bottom: 6, left: 5, right: 5, height: 10, borderRadius: '10px 10px 4px 4px', background: C.canvas }} />
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', color: C.textDark }}>AGENT CRIT</div>
              <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: '0.06em' }}>FIELD INSTRUCTOR</div>
            </div>
            <div style={{ position: 'relative', flex: 1, background: C.cardPaper, border: `1px solid ${C.btnGoldBdr}`, boxShadow: '0 3px 12px rgba(0,0,0,0.18)', padding: '14px 18px', minHeight: 96, borderRadius: 4 }}>
              <div style={{ position: 'absolute', left: -9, top: 38, width: 18, height: 18, background: C.cardPaper, borderLeft: `1px solid ${C.btnGoldBdr}`, borderBottom: `1px solid ${C.btnGoldBdr}`, transform: 'rotate(45deg)' }} />
              <div style={{ fontSize: 13, lineHeight: 1.5, color: C.textDark, whiteSpace: 'pre-line', fontFamily: FONT }}>
                {stepCfg.bubble}
              </div>
            </div>
          </div>

          {/* Step nav */}
          <div style={{ border: `1px solid ${C.btnGoldBdr}`, background: C.canvas, padding: 10, marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              {TUTORIAL_STEPS.map((cfg, index) => navItem(cfg.stepLabel, index))}
            </div>
          </div>

          {/* Board preview + notes */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', background: C.canvas, border: `1px solid ${C.btnGoldBdr}`, padding: 14, borderRadius: 4 }}>
            <div style={{ flex: 1, minHeight: 180, background: C.cardPaper, border: `1px solid ${C.cardBdrIdle}`, padding: 18, position: 'relative', borderRadius: 4 }}>
              <div style={{ position: 'absolute', top: 12, left: 18, fontSize: 11, fontWeight: 700, color: C.textMid, letterSpacing: '0.1em', fontFamily: FONT }}>
                {['THE BOARD', 'SELECTED STATE', 'THREAD DRAWN', 'AFTER SUBMITTING'][step]}
              </div>
              {renderBoard()}
            </div>
            <div style={{ width: 112, background: C.cardPaper, border: `1px solid ${C.cardBdrIdle}`, padding: '12px 12px 14px', borderRadius: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: C.textMid, marginBottom: 12, fontFamily: FONT }}>QUICK NOTES</div>
              {quickNotes[step]?.map((note, i) => (
                <div key={i} style={{ fontSize: 10, lineHeight: 1.55, color: C.textDark, fontFamily: FONT, marginBottom: i < 2 ? 10 : 0 }}>
                  • {note}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 }}>
            <button
              onClick={isFirst ? onClose : onBack}
              className={styles.tutorialSecondaryBtn}
              style={{ minWidth: 160, background: C.canvas, color: C.textDark, border: `1px solid ${C.btnGoldBdr}`, fontSize: 11, letterSpacing: '0.06em', padding: '10px 24px', fontFamily: FONT, fontWeight: 700, cursor: 'pointer', borderRadius: 4 }}
            >
              {isFirst ? 'EXIT TUTORIAL' : '← BACK'}
            </button>
            <button
              onClick={isLast ? onStart : onNext}
              className={styles.tutorialPrimaryBtn}
              style={{ minWidth: 170, background: C.btnDark, color: C.btnGold, border: 'none', fontSize: 11, letterSpacing: '0.06em', padding: '10px 28px', fontFamily: FONT, fontWeight: 700, cursor: 'pointer', borderRadius: 4 }}
            >
              {isLast ? 'START TRAINING →' : 'NEXT →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function LogicThreadPage() {
  const router = useRouter()
  const params = useParams()
  const nodeId = params.nodeId as string

  const [phase,        setPhase]        = useState<Phase>('loading')
  const [node,         setNode]         = useState<NodeData | null>(null)
  const [blocks,       setBlocks]       = useState<Block[]>([])
  const [chain,        setChain]        = useState<string[]>([])
  const [submitState,  setSubmitState]  = useState<SubmitState>('idle')
  const [wrongCount,   setWrongCount]   = useState(0)
  const [showHint,     setShowHint]     = useState(false)
  const [hintText,     setHintText]     = useState('')
  const [masteryData,  setMasteryData]  = useState<any>(null)
  const [errorMsg,     setErrorMsg]     = useState('')
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)

  const [sessionQueue,   setSessionQueue]   = useState<string[]>([])
  const [questionIndex,  setQuestionIndex]  = useState(0)
  const [sessionId,        setSessionId]        = useState<string | null>(null)
  const [sessionExercises, setSessionExercises] = useState<any[]>([])
  const [sessionStartId,   setSessionStartId]   = useState<string | null>(null)
  const [savedNextNode,    setSavedNextNode]    = useState<string | null>(null)
  const [savedStreak,      setSavedStreak]      = useState<number | null>(null)

  // ── Load question ───────────────────────────────────────────
  const loadQuestion = useCallback(async (targetIndex: number, queue: string[]) => {
    setPhase('loading')
    try {
      if (sessionExercises.length > targetIndex) {
        const ex = sessionExercises[targetIndex]
        setBlocks([...ex.paragraph_blocks].sort(() => Math.random() - 0.5))
        setChain([]); setSubmitState('idle'); setWrongCount(0)
        setShowHint(false); setHintText(''); setPhase('task')
        return
      }
      const targetNodeId = queue[targetIndex] || nodeId
      const d = await apiFetch(`/nodes/logic-thread/${targetNodeId}/`)
      setNode(d)
      setBlocks([...d.paragraph_blocks].sort(() => Math.random() - 0.5))
      setChain([]); setSubmitState('idle'); setWrongCount(0)
      setShowHint(false); setHintText(''); setPhase('task')
    } catch (e: any) {
      setErrorMsg(e?.error ?? 'Failed to load next question.'); setPhase('error')
    }
  }, [sessionExercises, nodeId])

  // ── Load node & AI Session ──────────────────────────────────
  useEffect(() => {
    const start = nodeId
    setSessionStartId(start)
    
    // Attempt to load AI-generated 5-question session
    apiFetch(`/ai/session/logic_thread/${start}/`)
      .then((sessionData: any) => {
        setSessionId(sessionData.session_id)
        setSessionExercises(sessionData.exercises || [])
        setNode({
          node_id: sessionData.node_id,
          title: sessionData.title,
          focus: sessionData.focus,
          difficulty: sessionData.difficulty,
          micro_lesson_text: sessionData.micro_lesson_text,
          reading_passage: sessionData.reading_passage,
          deep_dive_required: sessionData.deep_dive_required,
          paragraph_blocks: sessionData.exercises?.[0]?.paragraph_blocks || [],
        })
        const firstBlocks = sessionData.exercises?.[0]?.paragraph_blocks || []
        setBlocks([...firstBlocks].sort(() => Math.random() - 0.5))
        setSessionQueue(['q1', 'q2', 'q3', 'q4', 'q5'])
        setQuestionIndex(0)
        setPhase('micro_lesson')
      })
      .catch(() => {
        // Fallback to legacy static node queue
        const saved = loadSession('logic_thread', start)
        if (saved && saved.sessionQueue.length === 5) {
          setSessionQueue(saved.sessionQueue); setQuestionIndex(saved.questionIndex)
          if (saved.next_node) setSavedNextNode(saved.next_node)
          if (saved.streak !== undefined) setSavedStreak(saved.streak)
          const activeId = saved.sessionQueue[saved.questionIndex] ?? start
          apiFetch(`/nodes/logic-thread/${activeId}/`)
            .then((d: NodeData) => {
              setNode(d); setBlocks([...d.paragraph_blocks].sort(() => Math.random() - 0.5)); setPhase('task')
            })
            .catch((e: any) => {
              if (e?.status === 401)              { router.push('/auth');      return }
              if (e?.error === 'Node is locked.') { router.push('/dashboard'); return }
              setErrorMsg(e?.error ?? 'Failed to load node.'); setPhase('error')
            })
        } else {
          apiFetch(`/nodes/logic-thread/${start}/`)
            .then((d: NodeData) => {
              setNode(d); setBlocks([...d.paragraph_blocks].sort(() => Math.random() - 0.5))
              setPhase('micro_lesson')
              apiFetch('/progression/dashboard/')
                .then((prog: any) => {
                  const unlocked: string[] = prog.unlocked_nodes ?? []
                  const queue = buildSessionQueue('logic_thread', start, unlocked)
                  setSessionQueue(queue); setQuestionIndex(0)
                  saveSession('logic_thread', start, { sessionQueue: queue, questionIndex: 0 })
                })
                .catch(() => { setSessionQueue([start]); setQuestionIndex(0) })
            })
            .catch((e: any) => {
              if (e?.status === 401)              { router.push('/auth');      return }
              if (e?.error === 'Node is locked.') { router.push('/dashboard'); return }
              setErrorMsg(e?.error ?? 'Failed to load node.'); setPhase('error')
            })
        }
      })
  }, [nodeId, router])

  useEffect(() => {
    if (phase !== 'task' || nodeId !== 'log_node_01') return
    const seen = localStorage.getItem(TEXT_STRUCTURE_TUTORIAL_KEY)
    if (seen === '1') return
    localStorage.setItem(TEXT_STRUCTURE_TUTORIAL_KEY, '1')
    setTutorialStep(0); setTutorialOpen(true)
  }, [phase, nodeId])

  const fetchHint = useCallback(async (tier: number) => {
    if (sessionId && sessionExercises.length > questionIndex) {
      try {
        const res = await apiFetch(`/ai/session/${sessionId}/feedback/${questionIndex}/`, {
          method: 'POST',
          body: JSON.stringify({ tier }),
        })
        setHintText(res.hint || res.explanation || 'Try re-reading the passage and look for signal words.')
      } catch {
        setHintText('Try re-reading the passage and look for signal words.')
      }
      setShowHint(true)
      return
    }

    const activeNodeId = node?.node_id ?? nodeId
    try {
      const res = await apiFetch(`/nodes/logic-thread/${activeNodeId}/feedback/`, {
        method: 'POST',
        body: JSON.stringify({ source_id: '', target_id: '', inactivity_seconds: 61 }),
      })
      setHintText(res.hint || res.explanation || 'Try re-reading the passage and look for signal words.')
    } catch {
      setHintText('Try re-reading the passage and look for signal words.')
    }
    setShowHint(true)
  }, [nodeId, node, sessionId, sessionExercises, questionIndex])

  const handleCardClick = (blockId: string) => {
    if (submitState !== 'idle') return
    setChain(prev => {
      const idx = prev.indexOf(blockId)
      if (idx !== -1) return prev.slice(0, idx)
      return [...prev, blockId]
    })
  }

  const handleSubmit = async () => {
    if (!node || submitState !== 'idle') return
    if (chain.length !== blocks.length)  return
    setSubmitState('submitting')

    // 1. AI Dynamic Session Submission
    if (sessionId && sessionExercises.length > questionIndex) {
      const currentEx = sessionExercises[questionIndex]
      const isCorrect = JSON.stringify(chain) === JSON.stringify(currentEx.correct_sequence)

      // Send evaluation telemetry to backend
      apiFetch(`/ai/session/${sessionId}/evaluate/${questionIndex}/`, {
        method: 'POST',
        body: JSON.stringify({ sequence: chain, node_id: nodeId, module: 'logic_thread' }),
      }).catch(() => {})

      if (isCorrect) {
        setSubmitState('correct')
        const nextIdx = questionIndex + 1
        setTimeout(async () => {
          try {
            if (nextIdx < sessionExercises.length) {
              setQuestionIndex(nextIdx)
              loadQuestion(nextIdx, sessionQueue)
            } else {
              // Mastered all 5 questions
              const finalRes = await apiFetch(`/ai/session/${sessionId}/mastery/`, { method: 'POST' })
              if (sessionStartId) clearSession('logic_thread', sessionStartId)
              setMasteryData({
                next_node: finalRes.next_node,
                streak: finalRes.streak ?? 1,
              })
              setPhase('mastery')
            }
          } catch { setSubmitState('idle') }
        }, 1800)
        return
      } else {
        const next = wrongCount + 1
        setWrongCount(next); setSubmitState('incorrect')
        setTimeout(() => { setSubmitState('idle'); setChain([]) }, 1500)
        if (next >= 3) fetchHint(Math.min(next - 2, 3))
        return
      }
    }

    // 2. Legacy Fallback Submission
    try {
      const res = await apiFetch(`/nodes/logic-thread/${node.node_id}/mastery/`, {
        method: 'POST',
        body: JSON.stringify({ sequence: chain, save_progression: false }),
      })
      if (res.status === 'mastered') {
        setSubmitState('correct')
        const nextIdx = questionIndex + 1
        setTimeout(async () => {
          try {
            if (nextIdx < sessionQueue.length) {
              if (sessionStartId) saveSession('logic_thread', sessionStartId, {
                sessionQueue, questionIndex: nextIdx,
                next_node: savedNextNode || undefined,
                streak: savedStreak !== null ? savedStreak : undefined,
              })
              setQuestionIndex(nextIdx); loadQuestion(nextIdx, sessionQueue)
            } else {
              let finalRes = res
              if (sessionStartId) {
                finalRes = await apiFetch(`/nodes/logic-thread/${sessionStartId}/mastery/`,
                  { method: 'POST', body: JSON.stringify({ commit_only: true }) })
              }
              if (sessionStartId) clearSession('logic_thread', sessionStartId)
              setMasteryData({
                next_node: savedNextNode || finalRes.next_node,
                streak: savedStreak !== null ? savedStreak : (finalRes.streak ?? null),
              })
              setPhase('mastery')
            }
          } catch { setSubmitState('idle') }
        }, 2000)
      }
    } catch {
      const next = wrongCount + 1
      setWrongCount(next); setSubmitState('incorrect')
      setTimeout(() => { setSubmitState('idle'); setChain([]) }, 1500)
      if (next >= 3) fetchHint(Math.min(next - 2, 3))
    }
  }

  // ── Phase guards ────────────────────────────────────────────
  if (phase === 'loading')      return <LoadScreen />
  if (phase === 'error')        return <ErrorScreen msg={errorMsg} onBack={() => router.push('/dashboard')} />
  if (phase === 'micro_lesson') return <LessonScreen node={node!} onContinue={() => setPhase(node?.deep_dive_required ? 'deep_dive' : 'task')} />
  if (phase === 'deep_dive')    return <DeepDiveScreen node={node!} onContinue={() => setPhase('task')} />
  if (phase === 'mastery')      return (
    <MasteryScreen node={node!} data={masteryData}
      onDashboard={() => router.push('/dashboard')}
      onNext={() => masteryData?.next_node && router.push(`/nodes/logic-thread/${masteryData.next_node}`)}
    />
  )

  // ── TASK PHASE ──────────────────────────────────────────────
  const allChained    = chain.length === blocks.length
  const lineColor     = submitState === 'correct' ? '#22aa55' : '#cc3333'
  const canvasOutline = submitState === 'correct' ? '3px solid #55aaff' : '3px solid transparent'

  return (
    <div style={{ minHeight: '100vh', background: C.pageBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>

      {/* ── Fixed folder tabs ── */}
      <div style={{ position: 'fixed', left: 0, top: '20%', transform: 'translateY(-20%)',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, zIndex: 100 }}>
        {[
          { label: 'Hint', action: () => fetchHint(Math.min(wrongCount + 1, 3)) },
          { label: 'End Session', action: () => {
            if (sessionStartId && sessionQueue.length > 0) {
              saveSession('logic_thread', sessionStartId, {
                sessionQueue, questionIndex,
                next_node: savedNextNode || undefined,
                streak: savedStreak !== null ? savedStreak : undefined,
              })
            }
            router.push('/dashboard')
          }},
        ].map(({ label, action }) => (
          <button key={label} onClick={action} className={styles.folderTab} style={{
            writingMode: 'vertical-lr',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.13em',
            color: C.textDark, background: C.btnGold,
            border: `1px solid ${C.btnGoldBdr}`, borderLeft: 'none',
            borderRadius: '0 6px 6px 0',
            cursor: 'pointer', padding: '14px 8px',
            fontFamily: FONT, whiteSpace: 'nowrap',
            boxShadow: '3px 2px 8px rgba(0,0,0,0.35)',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = C.btnGoldBdr }}
            onMouseLeave={e => { e.currentTarget.style.background = C.btnGold }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'stretch', boxShadow: '0 12px 48px rgba(0,0,0,0.7)', borderRadius: 6 }}>

        {/* ── Board wrapper ── */}
        <div className={styles.boardEnter} style={{
          background: C.board, border: canvasOutline,
          borderRadius: 6, overflow: 'hidden',
          transition: 'border-color 0.4s',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* ── Header row 1: objective ── */}
          <div style={{ padding: '12px 24px 10px', textAlign: 'center', borderBottom: `1px solid rgba(0,0,0,0.12)` }}>
            <div style={{
              display: 'inline-block', border: `1.5px solid ${C.accentRed}`,
              padding: '7px 28px', fontSize: 13, fontWeight: 700,
              letterSpacing: '0.12em', background: 'rgba(255,255,255,0.3)', fontFamily: FONT,
            }}>
              <span style={{ color: C.textMid }}>OBJECTIVE: </span>
              <span style={{ color: C.accentRed }}>CONNECT THE PARAGRAPHS TO FORM ITS OVERALL MEANING</span>
            </div>
          </div>

          {/* ── Header row 2: meta ── */}
          <div style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(0,0,0,0.12)', borderRadius: 20, padding: '5px 14px' }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: DIFFICULTY_COLORS[node!.difficulty ?? nodeDifficulty(nodeId)], flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: C.btnDark, fontFamily: FONT }}>
                LVL {node!.difficulty ?? nodeDifficulty(nodeId)} — {DIFFICULTY_LABELS[node!.difficulty ?? nodeDifficulty(nodeId)]}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {sessionQueue.length > 0 && (
                <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: C.btnDark, background: 'rgba(0,0,0,0.1)', borderRadius: 20, padding: '5px 14px' }}>
                  Q {questionIndex + 1} / {sessionQueue.length}
                </span>
              )}
              <button
                onClick={() => { setTutorialStep(0); setTutorialOpen(true) }}
                className={styles.tutorialBtn}
                style={{ padding: '7px 18px', background: C.btnGold, border: `1.5px solid ${C.btnGoldBdr}`, borderRadius: 8, color: C.textDark, fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer' }}
              >
                TUTORIAL
              </button>
            </div>
          </div>

          {/* progress bar */}
          {sessionQueue.length > 0 && (
            <div style={{ padding: '0 24px 10px' }}>
              <div style={{ height: 5, background: 'rgba(0,0,0,0.15)', borderRadius: 4, overflow: 'hidden' }}>
                <div className={styles.progressBar} style={{
                  height: '100%',
                  width: `${((questionIndex + (submitState === 'correct' ? 1 : 0)) / sessionQueue.length) * 100}%`,
                  background: 'rgba(0,0,0,0.35)', borderRadius: 4,
                }} />
              </div>
            </div>
          )}

          {/* ── Canvas ── */}
          <div style={{ position: 'relative', width: CW, height: CH, flexShrink: 0, background: C.canvas }}>

            {/* Cards */}
            {blocks.map((block, i) => {
              const pos      = SCATTER[i]
              const inChain  = chain.includes(block.block_id)
              const isLatest = chain[chain.length - 1] === block.block_id && chain.length > 0

              const border =
                submitState === 'correct'   && inChain ? '2px solid #22aa55' :
                submitState === 'incorrect' && inChain ? '2px solid #cc3333' :
                isLatest                               ? `2px solid ${C.btnGold}` :
                                                         `1px solid ${C.cardBdrIdle}`

              const bg =
                submitState === 'correct'   && inChain ? '#f2fff5' :
                submitState === 'incorrect' && inChain ? '#fff2f0' :
                isLatest                               ? '#FFFDE8' : C.cardPaper

              const cardAnim =
                submitState === 'correct'   && inChain ? styles.cardCorrect :
                submitState === 'incorrect' && inChain ? styles.cardIncorrect :
                styles.card

              return (
                <div
                  key={block.block_id}
                  onClick={() => handleCardClick(block.block_id)}
                  className={`${cardAnim} ${styles.cardEnter}`}
                  style={{
                    position: 'absolute', left: pos.x, top: pos.y,
                    width: CARD_W, height: CARD_H,
                    background: bg, border, borderRadius: 10,
                    boxShadow: isLatest ? '0 4px 18px rgba(196,154,90,0.45)' : '0 3px 12px rgba(0,0,0,0.22)',
                    cursor: submitState === 'idle' ? 'pointer' : 'default',
                    padding: '22px 14px 12px',
                    userSelect: 'none', zIndex: 2,
                    display: 'flex', alignItems: 'center', overflow: 'hidden',
                  }}
                >
                  {/* pin hole decoration */}
                  <div style={{
                    position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
                    width: 7, height: 7, borderRadius: '50%',
                    background: isLatest ? C.accentRed : C.cardBdrIdle,
                    boxShadow: isLatest ? `0 0 0 2px rgba(128,0,32,0.25)` : 'none',
                    transition: 'background 0.2s',
                  }} />
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: C.textDark, fontFamily: FONT, fontWeight: inChain ? 600 : 400 }}>
                    {block.text}
                  </p>
                </div>
              )
            })}

            {/* SVG — threads and pins */}
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }} width={CW} height={CH}>
              {chain.slice(0, -1).map((_, i) => {
                const fi = blocks.findIndex(b => b.block_id === chain[i])
                const ti = blocks.findIndex(b => b.block_id === chain[i + 1])
                if (fi < 0 || ti < 0) return null
                const fp = { x: SCATTER[fi].x + CARD_W / 2, y: SCATTER[fi].y }
                const tp = { x: SCATTER[ti].x + CARD_W / 2, y: SCATTER[ti].y }
                return (
                  <path
                    key={`${chain[i]}->${chain[i + 1]}`}
                    className={styles.threadPath}
                    d={bezierPath(fp.x, fp.y, tp.x, tp.y)}
                    stroke={lineColor}
                    strokeWidth={2.5}
                    fill="none"
                    strokeLinecap="round"
                  />
                )
              })}
              {chain.map((blockId, i) => {
                const bi = blocks.findIndex(b => b.block_id === blockId)
                if (bi < 0) return null
                const px = SCATTER[bi].x + CARD_W / 2
                const py = SCATTER[bi].y
                const pinColor = submitState === 'correct' ? '#22aa55'
                  : submitState === 'incorrect' ? '#cc3333'
                  : C.textMid
                return (
                  <g key={`pin-${blockId}-${i}`} className={styles.pin}>
                    <circle cx={px} cy={py} r={13} fill="white" stroke={pinColor} strokeWidth={2} />
                    <text x={px} y={py + 4.5} textAnchor="middle"
                      fontSize={11} fontWeight={700} fill={pinColor} fontFamily={FONT}>
                      {i + 1}
                    </text>
                  </g>
                )
              })}
            </svg>

            {/* Hint overlay */}
            {showHint && (
              <div className={styles.hintOverlay} style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.52)', zIndex: 30,
                display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', padding: 18,
              }}>
                <div className={styles.hintCard} style={{
                  background: C.cardPaper, border: `2px solid ${C.cardBdrIdle}`,
                  borderRadius: 6, padding: '18px 20px 16px',
                  maxWidth: 260, boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: C.accentRed, marginBottom: 10, fontFamily: FONT }}>
                    SCAFFOLD HINT
                  </div>
                  <p style={{ fontSize: 13, color: C.textDark, lineHeight: 1.7, margin: '0 0 16px', fontFamily: FONT }}>
                    {hintText}
                  </p>
                  <button onClick={() => setShowHint(false)} style={{
                    fontSize: 11, fontWeight: 700, color: C.textDark,
                    background: C.btnGold, border: `1px solid ${C.btnGoldBdr}`,
                    padding: '7px 16px', cursor: 'pointer',
                    fontFamily: FONT, letterSpacing: '0.06em', borderRadius: 6,
                  }}>
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Submit bar ── */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 24px 16px', background: C.board,
            borderTop: `2px solid ${C.btnGoldBdr}`,
          }}>
            <span style={{ fontSize: 12, color: C.textMid, fontWeight: 700, letterSpacing: '0.08em', fontFamily: FONT }}>
              {chain.length} / {blocks.length} CONNECTED
              {wrongCount > 0 && (
                <span style={{ marginLeft: 14, color: C.accentRed }}>
                  ATTEMPTS: {wrongCount}{wrongCount >= 3 && ' — HINT AVAILABLE'}
                </span>
              )}
            </span>
            <button
              disabled={!allChained || submitState !== 'idle'}
              onClick={handleSubmit}
              className={`${styles.submitBtn} ${allChained && submitState === 'idle' ? styles.submitBtnReady : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background:
                  submitState === 'correct'   ? '#22aa55' :
                  submitState === 'incorrect' ? '#cc3333' :
                  allChained                  ? C.btnDark : 'rgba(67,40,24,0.35)',
                color:
                  submitState === 'correct'   ? '#fff' :
                  submitState === 'incorrect' ? '#fff' :
                  allChained                  ? C.btnGold : C.textMuted,
                border: `1.5px solid ${allChained ? C.btnGoldBdr : 'transparent'}`,
                borderRadius: 8, padding: '12px 28px',
                fontSize: 14, fontWeight: 700, letterSpacing: '0.14em',
                cursor: allChained && submitState === 'idle' ? 'pointer' : 'not-allowed',
                fontFamily: FONT,
              }}
            >
              {submitState === 'submitting' ? 'CHECKING...' :
               submitState === 'correct'    ? '✓ CORRECT!'  :
               submitState === 'incorrect'  ? '✕ TRY AGAIN' :
               <><span>SUBMIT</span><span style={{ fontSize: 20, lineHeight: 1 }}>→</span></>}
            </button>
          </div>
        </div>
      </div>

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