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
  fetchNodeSession, fetchLiveSocraticHint, updateSessionProgress,
} from '@/lib/nodeSession'
import CaseLoadingLobby from '@/components/shared/CaseLoadingLobby'
import NodeEvaluationReport, { type CaseResult } from '@/components/shared/NodeEvaluationReport'
import CaseLessonScreen from '@/components/shared/CaseLessonScreen'
import { playRightAnswerSound, playWrongSound, playVictorySound } from '@/lib/sound-effects'
import { MODULE_TITLES } from '@/lib/modules'
import CritRemark, { type Remark, type RemarkKind } from '@/components/logic-thread/CritRemark'
import CaseDebriefModal, { type DocketDebrief, type MissedCase } from '@/components/logic-thread/CaseDebriefModal'
import {
  ArrowRight, FileText, FolderOpen, HelpCircle, Lightbulb, LogOut, Paperclip, Puzzle, RotateCcw,
} from 'lucide-react'
import { Montserrat } from 'next/font/google'
import desk from '@/components/dashboard/desk.module.css'
import styles from './page.module.css'

// Exhibit and tile text: Montserrat, self-hosted by next/font
const bodyFont = Montserrat({ subsets: ['latin'], weight: ['500', '600'], display: 'swap' })

// Room kept free beside the dossier: the retracted side tabs only show their icons
const SIDE_GUTTER = 64

const HINT_FALLBACK = 'Re-read the two sentences and think about how they relate logically.'
const THINKING_TEXT = 'Inspector Crit is examining the evidence trail'
// Three tries per case; misses 1-2 get encouragement only, the third reveals the answer and moves on
const MAX_ATTEMPTS = 3
const REVEAL_MS = 4500   // how long the reveal stays on this case before auto-advancing
const RETRY_REMARKS = [
  'Keep digging, Cadet! Re-examine the relationship between Exhibit A and Exhibit B.',
  'Almost there! Focus on the signal transition — does B add to A, push against it, or follow from it?',
  'Not that one. Read Exhibit B again: is it a surprise, a consequence, or more of the same?',
  'Steady, Cadet. Ask what job the gap word must do between the two exhibits.',
]
const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)]

// Cases failed after three tries survive a reload, so a resumed docket can't close with an unsolved case
const SKIPPED_KEY = (startId: string) => `critica_skipped_snap_gap_${startId}`
function readSkipped(startId: string | null): number[] {
  if (!startId) return []
  try { return JSON.parse(localStorage.getItem(SKIPPED_KEY(startId)) || '[]') } catch { return [] }
}
function writeSkipped(startId: string | null, cases: number[]) {
  if (!startId) return
  try {
    if (cases.length) localStorage.setItem(SKIPPED_KEY(startId), JSON.stringify(cases))
    else localStorage.removeItem(SKIPPED_KEY(startId))
  } catch { /* storage blocked */ }
}

const WRONG_TILE_FALLBACK = 'That transition does not fit here. Re-read both sentences.'
const SOCRATIC_FALLBACK = 'Re-read both sentences and think about how the second one builds on, contrasts with, or results from the first.'


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

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy
}

const SNAP_GAP_TUTORIAL_KEY =
  'critica_tutorial_seen_snap_gap_first_node'

const TUTORIAL_STEPS = [
  {
    label: 'Read the passage',
    code: 'TUT-SIG-001',
    text: 'In Scene Reconstruction, you will see a passage with blank gaps missing transition words. A tile bank on the right holds word options.\n\nYour mission: drag or click the correct tile into each gap to restore the paragraph\'s logical flow.',
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
  pageBg:     'radial-gradient(ellipse at center, #566049 0%, #4a543f 45%, #414833 100%)',
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
    maxWidth: 760,
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
function BriefingGenerationScreen({ title, onCancel }: { title?: string; onCancel?: () => void }) {
  return <CaseLoadingLobby moduleKey="snap_gap" title={title} onCancel={onCancel} />
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

function LessonScreen({ node, onContinue, onDashboard }: { node: SnapNodeData; onContinue: () => void; onDashboard?: () => void }) {
  return (
    <CaseLessonScreen
      moduleKey="snap_gap"
      nodeId={node.node_id}
      phase="micro_lesson"
      title={node.title}
      focus={node.focus}
      microLessonText={node.micro_lesson_text}
      readingPassage={node.reading_passage}
      deepDiveRequired={!!node.deep_dive_required}
      difficulty={node.difficulty}
      onContinue={onContinue}
      onBackToDashboard={onDashboard}
    />
  )
}

function DeepDiveScreen({ node, onContinue, onDashboard }: { node: SnapNodeData; onContinue: () => void; onDashboard?: () => void }) {
  return (
    <CaseLessonScreen
      moduleKey="snap_gap"
      nodeId={node.node_id}
      phase="deep_dive"
      title={node.title}
      focus={node.focus}
      microLessonText={node.micro_lesson_text}
      readingPassage={node.reading_passage}
      deepDiveRequired={!!node.deep_dive_required}
      difficulty={node.difficulty}
      onContinue={onContinue}
      onBackToDashboard={onDashboard}
    />
  )
}

function MasteryScreen({ node, data, onDashboard, onNext, onReplay }:
  { node: SnapNodeData; data: any; onDashboard: () => void; onNext: () => void; onReplay?: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
      <NodeEvaluationReport
        moduleKey="snap_gap"
        title={node.title}
        accuracy={data?.accuracy ?? 100}
        totalCases={data?.totalCases ?? 5}
        correctCases={data?.correctCases ?? 5}
        hintsUsed={data?.hintsUsed ?? 0}
        timeTakenSeconds={data?.timeTakenSeconds ?? 0}
        streak={data?.streak ?? 0}
        caseResults={data?.caseResults}
        nextNodeId={data?.next_node}
        onNext={onNext}
        onReplay={onReplay}
        onDashboard={onDashboard}
      />
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
      <div key={label} className={styles.tutorialNavItem} style={{
        width: 156, height: 76,
        border: `1px solid ${C.cardBdr}`,
        background: complete ? '#b9dfbf' : active ? C.cardPaper : C.canvas,
        color: C.textDark,
        boxShadow: active ? '0 3px 0 rgba(0,0,0,0.35)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', textAlign: 'center',
        fontFamily: F, fontSize: 12, fontWeight: 700,
      }}>
        <div style={{ position: 'absolute', top: 7, left: '50%', transform: 'translateX(-50%)' }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: complete ? '#36b24a' : active ? C.btnGold : C.board,
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
    <div className={styles.tutorialOverlay} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: F,
    }}>
      <div className={styles.tutorialModal} style={{ width: '100%', maxWidth: 840, background: C.canvas, border: `1px solid ${C.cardBdr}`, boxShadow: '0 18px 44px rgba(0,0,0,0.4)', padding: '10px 14px 14px', borderRadius: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.28em', color: C.textDark }}>CRITICA - FIELD BRIEFING DOCUMENT</div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.18em', color: C.textDark }}>{current.code}</div>
        </div>

        <div style={{ background: C.cardPaper, border: `1px solid ${C.cardBdr}`, borderRadius: '16px 16px 10px 10px', padding: '30px 24px 22px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -1, left: -1, width: 54, height: 24, borderRadius: '16px 0 14px 0', background: C.cardPaper, borderLeft: `1px solid ${C.cardBdr}`, borderTop: `1px solid ${C.cardBdr}` }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 42, marginBottom: 30 }}>
            <div style={{ width: 120, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, border: `2px solid ${C.btnGoldBdr}`, background: C.canvas, margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
                <div style={{ width: 34, height: 34, background: C.btnDark, borderRadius: 4, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', background: C.btnGold }} />
                  <div style={{ position: 'absolute', bottom: 6, left: 5, right: 5, height: 10, borderRadius: '10px 10px 4px 4px', background: C.btnGold }} />
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.08em', color: C.textDark }}>AGENT CRIT</div>
              <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: '0.06em' }}>FIELD INSTRUCTOR</div>
            </div>

            <div style={{ position: 'relative', flex: 1, background: C.cardPaper, border: `1px solid ${C.cardBdr}`, boxShadow: '0 3px 12px rgba(0,0,0,0.12)', padding: '12px 16px', minHeight: 96, borderRadius: 4 }}>
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
            <button onClick={isFirst ? onClose : onBack} className={styles.tutorialSecondaryBtn} style={{ ...S.btnSm, minWidth: 160, background: C.canvas, color: C.textDark, border: `1px solid ${C.btnGoldBdr}`, fontSize: 11, letterSpacing: '0.06em' }}>
              {secondaryLabel}
            </button>
            <button onClick={isLast ? onStart : onNext} className={styles.tutorialPrimaryBtn} style={{ ...S.btnPrimary, minWidth: 170, fontSize: 11, letterSpacing: '0.06em' }}>
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
  const [hintTier,      setHintTier]      = useState(0)
  const [tutorialOpen,  setTutorialOpen]  = useState(false)
  const [tutorialStep,  setTutorialStep]  = useState(0)

  // hint state: hints are spoken by Inspector Crit's lower-left bubble
  const [hintOverlay,     setHintOverlay]     = useState(false)   // a hint was used on this case
  const [socraticLoading, setSocraticLoading] = useState(false)
  const [remark,          setRemark]          = useState<Remark | null>(null)
  // After the third miss: the case is decided, the dock locks and the correct tile is shown
  const [revealing,       setRevealing]       = useState<{ tile: string | null } | null>(null)
  // A wrong tile stays "disputed" (crimson badge in place of SUBMIT) until the next tile is tried
  const [disputed,        setDisputed]        = useState(false)
  // End-of-docket debrief ("Docket Under Review") and the notes on cases failed along the way
  const [debrief,         setDebrief]         = useState<DocketDebrief | null>(null)
  const [missedCases,     setMissedCases]     = useState<MissedCase[]>([])
  // Inspector Crit speaks from the lower-left corner: remarks fade, hints / feedback stay until dismissed
  const say = useCallback((text: string, kind: RemarkKind = 'remark') => setRemark({ id: Date.now(), text, kind }), [])

  // dossier scaled to fit the 100vh viewport
  const [fitScale, setFitScale] = useState(1)
  const fitRef = useRef<HTMLDivElement>(null)

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

  // session accuracy evaluation state
  const [sessionResults, setSessionResults] = useState<CaseResult[]>([])
  const sessionStartTimeRef = useRef<number>(Date.now())

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
          transition_tile_dock: shuffleArray(ex.transition_tile_dock || prev.transition_tile_dock || []),
        }) : ex)
        setPairIdx(0)
        setBoard({})
        setLocked([])
        setTileState('idle')
        setWrongs(0)
        setRevealing(null)
        setDisputed(false)
        setHintTier(0)
        setHintOverlay(false)
        setRemark(null)
        setPhase('task')
        return
      }

      const targetNodeId = queue[targetIndex] || nodeId
      const d = await apiFetch(`/nodes/snap-gap/${targetNodeId}/`)
      setSnapNode({ ...d, transition_tile_dock: shuffleArray(d.transition_tile_dock || []) })
      setPairIdx(0)
      setBoard({})
      setLocked([])
      setTileState('idle')
      setWrongs(0)
      setRevealing(null)
      setDisputed(false)
      setHintTier(0)
      setHintOverlay(false)
      setRemark(null)
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

      // A fresh start (Retry / Fresh Case) always opens a new full docket at case 1
      const resumeIdx = forceFresh ? 0 : Math.min(
        sessionData.current_index ?? 0,
        Math.max(0, (sessionData.exercises?.length ?? 1) - 1)
      )
      const activeEx = sessionData.exercises?.[resumeIdx] || sessionData.exercises?.[0]

      setSnapNode({
        node_id: sessionData.node_id,
        title: activeEx?.topic_title || sessionData.title,
        focus: sessionData.focus,
        difficulty: sessionData.difficulty,
        micro_lesson_text: sessionData.micro_lesson_text,
        reading_passage: activeEx?.reading_passage || sessionData.reading_passage || '',
        deep_dive_required: sessionData.deep_dive_required,
        sentence_pairs: activeEx?.sentence_pairs || [],
        transition_tile_dock: shuffleArray(activeEx?.transition_tile_dock || []),
      })
      const totalQ = sessionData.exercises?.length || 5
      const queue = Array.from({ length: totalQ }, (_, i) => `q${i + 1}`)
      setSessionQueue(queue)
      setQuestionIndex(resumeIdx)
      setPairIdx(0)
      setBoard({})
      setLocked([])
      setTileState('idle')
      setWrongs(0)
      setRevealing(null)
      setDisputed(false)
      setHintOverlay(false)
      if (forceFresh || resumeIdx === 0) {
        setSessionResults([])
        setMissedCases([])
        writeSkipped(start, [])
        sessionStartTimeRef.current = Date.now()
      }

      saveSession('snap_gap', start, {
        sessionQueue: queue,
        questionIndex: resumeIdx,
      })

      setPhase((resumeIdx > 0 || forceFresh) ? 'task' : 'micro_lesson')
    } catch {
      // Fallback to legacy static node queue
      if (forceFresh) clearSession('snap_gap', start)
      const saved = forceFresh ? null : loadSession('snap_gap', start)
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
            setPhase(forceFresh ? 'task' : 'micro_lesson')

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

  // ── feedback (spoken by Inspector Crit, board stays visible) ──
  /** Fetch the explanation + scaffold hint for a wrong tile; Crit says it unless `speak` is false. Returns the explanation. */
  const callFeedback = useCallback(async (pair_id: string, tile: string, inactivity: boolean, speak = true) => {
    let explanation = WRONG_TILE_FALLBACK
    let hint = ''
    try {
      const res = sessionId && sessionExercises.length > questionIndex
        ? await apiFetch(`/ai/session/${sessionId}/feedback/${questionIndex}/`, {
            method: 'POST',
            body: JSON.stringify({ pair_id, selected_tile: tile, tier: 1 }),
          })
        : await apiFetch(`/nodes/snap-gap/${snapNode?.node_id ?? nodeId}/feedback/`, {
            method: 'POST',
            body: JSON.stringify({
              pair_id,
              selected_tile: tile,
              inactivity_seconds: inactivity ? 60 : inactiveRef.current,
            }),
          })
      explanation = res.explanation || WRONG_TILE_FALLBACK
      hint = res.hint ?? ''
      setHintTier(res.hint_tier ?? (sessionId ? 1 : 0))
    } catch { /* keep the fallback explanation */ }
    const text = hint ? `${explanation}\n\nHint: ${hint}` : explanation
    if (speak) say(text, 'feedback')
    return explanation   // a follow-up hint replaces the first-tier hint, so only the explanation carries over
  }, [nodeId, snapNode, sessionId, sessionExercises, questionIndex, say])

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

  // ── hints (spoken by Inspector Crit) ──────────────
  // tier scales with wrong-attempt count (mirrors logic-thread's fetchHint)
  const fetchHint = useCallback(async (tier: number) => {
    setHintOverlay(true)
    say(THINKING_TEXT, 'thinking')
    let text = HINT_FALLBACK
    try {
      const res = sessionId && sessionExercises.length > questionIndex
        ? await apiFetch(`/ai/session/${sessionId}/feedback/${questionIndex}/`, {
            method: 'POST',
            body: JSON.stringify({ tier }),
          })
        : await apiFetch(`/nodes/snap-gap/${snapNode?.node_id ?? nodeId}/feedback/`, {
            method: 'POST',
            body: JSON.stringify({ pair_id: '', selected_tile: '', inactivity_seconds: 61 }),
          })
      text = res.hint || res.explanation || HINT_FALLBACK
    } catch { /* keep the fallback hint */ }
    say(text, 'hint')
  }, [nodeId, snapNode, sessionId, sessionExercises, questionIndex, say])

  // ── case outcome helpers ──────────────────────────
  const totalCases = sessionId && sessionExercises.length > 0
    ? sessionExercises.length
    : (sessionQueue.length || 1)

  /** Report numbers for the evaluation screen. */
  const buildReport = (updated: CaseResult[], nextNode: string | null, streak: number | null, timeTakenSeconds: number) => ({
    next_node: nextNode,
    streak,
    accuracy: Math.round((updated.filter(r => r.firstTry).length / Math.max(1, totalCases)) * 100),
    totalCases,
    correctCases: updated.filter(r => r.correct).length,
    hintsUsed: updated.reduce((acc, r) => acc + (r.hintsUsed || 0), 0),
    timeTakenSeconds,
    caseResults: updated,
  })

  /** Cases left unsolved this docket (this run's misses plus misses saved before a reload). */
  const unsolvedCases = (updated: CaseResult[]) =>
    new Set([...updated.filter(r => !r.correct).map(r => r.caseNumber), ...readSkipped(sessionStartId)]).size

  /** Missed-case notes including `caseNumber` (its notes may still be in a pending state update). */
  const missedCasesWith = (caseNumber: number, explanation: string): MissedCase[] => {
    const listed = missedCases.find(m => m.caseNumber === caseNumber)
    const current: MissedCase = listed ?? {
      caseNumber, title: snapNode?.title ?? `Case ${caseNumber}`,
      notes: explanation.split('\n\n'), correctSlots: null, total: snapNode?.sentence_pairs.length ?? 1,
    }
    return [...missedCases.filter(m => m.caseNumber !== caseNumber), current].sort((a, b) => a.caseNumber - b.caseNumber)
  }

  /** Third miss: file the case as unsolved and move on (or close the docket without mastery). */
  const failCase = (explanation: string, decidedAt: number) => {
    const caseNumber = questionIndex + 1
    const res: CaseResult = {
      caseNumber,
      correct: false,
      firstTry: false,
      hintsUsed: (hintTier || 0) + (hintOverlay ? 1 : 0),
      attempts: MAX_ATTEMPTS,
    }
    const updated = [...sessionResults.filter(r => r.caseNumber !== caseNumber), res]
    setSessionResults(updated)
    writeSkipped(sessionStartId, [...readSkipped(sessionStartId), caseNumber])

    const nextIdx = questionIndex + 1
    if (nextIdx < totalCases) {
      if (sessionId) updateSessionProgress(sessionId, nextIdx).catch(() => {})
      if (sessionStartId) {
        saveSession('snap_gap', sessionStartId, {
          sessionQueue,
          questionIndex: nextIdx,
          next_node: savedNextNode || undefined,
          streak: savedStreak !== null ? savedStreak : undefined,
        })
      }
      setQuestionIndex(nextIdx)
      loadQuestion(nextIdx, sessionQueue)
      say(explanation, 'explain')   // keep Crit's explanation up on the next case
      return
    }
    // Last case: the docket closes unsolved, so no mastery call and no next node
    const unsolved = unsolvedCases(updated)   // read before the saved misses are cleared
    if (sessionStartId) clearSession('snap_gap', sessionStartId)
    writeSkipped(sessionStartId, [])
    const timeTakenSeconds = Math.max(1, Math.round((decidedAt - sessionStartTimeRef.current) / 1000))
    setMasteryData(buildReport(updated, null, savedStreak, timeTakenSeconds))
    setDebrief({
      verdict: 'partial',
      solved: Math.max(0, totalCases - unsolved),
      total: totalCases,
      xpAwarded: null,
      nextNode: null,
      missed: missedCasesWith(caseNumber, explanation),
    })
  }

  /** Wrong tile: tries 1-2 get encouragement only; the third reveals the answer, explains, and advances. */
  const handleWrongTile = async (pairId: string, tile: string, correctTile: string | null) => {
    playWrongSound()
    setTileState('incorrect')
    setDisputed(true)
    const nextWrongs = wrongs + 1
    setWrongs(nextWrongs)

    if (nextWrongs < MAX_ATTEMPTS) {
      setTimeout(() => setTileState('idle'), 600)
      // Telemetry for the miss (the explanation isn't fetched until the last try)
      if (sessionId) {
        apiFetch(`/ai/session/${sessionId}/log-attempt/`, {
          method: 'POST',
          body: JSON.stringify({ is_correct: false }),
        }).catch(() => {})
      }
      // A plain handwritten nudge; the attempts left are shown in the footer
      say(pick(RETRY_REMARKS))
      return
    }

    // Third strike: the dock stays locked (tileState stays 'incorrect') while Crit explains
    setRevealing({ tile: correctTile })
    const why = await callFeedback(pairId, tile, false, false)
    const reveal = correctTile
      ? `Three strikes, Cadet — this case is filed as unverified. The correct tile was “${correctTile}”.`
      : 'Three strikes, Cadet — this case is filed as unverified.'
    const explanation = `${reveal}\n\n${why}`
    const caseNumber = questionIndex + 1
    const notes = [correctTile ? `The correct tile was “${correctTile}”.` : 'The correct tile stays sealed in this file.', why]
    setMissedCases(prev => [...prev.filter(m => m.caseNumber !== caseNumber),
      { caseNumber, title: snapNode?.title ?? `Case ${caseNumber}`, notes, correctSlots: null, total: snapNode?.sentence_pairs.length ?? 1 }])
    say(explanation, 'explain')
    // eslint-disable-next-line react-hooks/purity -- runs from a tile click handler, never during render
    const decidedAt = Date.now()
    setTimeout(() => failCase(explanation, decidedAt), REVEAL_MS)
  }

  // ── tile click ────────────────────────────────────
  const handleTile = async (tile: string) => {
    if (!snapNode || tileState !== 'idle' || revealing) return
    setDisputed(false)
    resetTimer()
    const pair = snapNode.sentence_pairs[pairIdx]
    if (!pair) return

    const placeCorrectTile = () => {
      playRightAnswerSound()
      setTileState('correct')
      setBoard(prev => ({ ...prev, [pair.pair_id]: tile }))
      setLocked(prev => [...prev, pair.pair_id])
      setTimeout(() => {
        setTileState('idle')
        if (pairIdx < snapNode.sentence_pairs.length - 1) setPairIdx(i => i + 1)
      }, 900)
    }

    // AI Dynamic Exercise Evaluation
    if (sessionId && sessionExercises.length > questionIndex) {
      const currentEx = sessionExercises[questionIndex]
      const correctTile: string | undefined = currentEx.correct_tile_map?.[pair.pair_id]
      const isCorrect = correctTile && (correctTile.trim().toLowerCase() === tile.trim().toLowerCase())
      if (isCorrect) placeCorrectTile()
      else await handleWrongTile(pair.pair_id, tile, correctTile ?? null)
      return
    }

    // Legacy Evaluation (the answer key stays on the server, so the reveal can't name the tile)
    try {
      const res = await apiFetch(`/nodes/snap-gap/${snapNode.node_id}/evaluate-gap/`, {
        method: 'POST',
        body: JSON.stringify({ pair_id: pair.pair_id, selected_tile: tile }),
      })
      if (res.result === 'correct') placeCorrectTile()
      else await handleWrongTile(pair.pair_id, tile, null)
    } catch {
      playWrongSound()
      setErrorMsg('Evaluation failed.')
    }
  }

  // ── ask Inspector Crit for a live socratic hint ───
  const handleAskSocraticAdvice = useCallback(async () => {
    if (!sessionId) return
    setSocraticLoading(true)
    say(THINKING_TEXT, 'thinking')
    try {
      const res = await fetchLiveSocraticHint(
        sessionId,
        questionIndex,
        { board_state: board, pair_id: snapNode?.sentence_pairs[pairIdx]?.pair_id },
        wrongs + 1,
      )
      say(res.socratic_hint || SOCRATIC_FALLBACK, 'hint')
    } catch {
      say(SOCRATIC_FALLBACK, 'hint')
    } finally {
      setSocraticLoading(false)
    }
  }, [sessionId, questionIndex, board, snapNode, pairIdx, wrongs, say])

  // ── fit the dossier inside the 100vh viewport ──────
  useEffect(() => {
    if (phase !== 'task') return
    const el = fitRef.current
    if (!el) return
    const fit = () => {
      const maxW = Math.min(window.innerWidth * 0.92, window.innerWidth - 2 * SIDE_GUTTER)   // w-[92vw]
      const s = Math.min(1, maxW / el.offsetWidth, (window.innerHeight - 28) / el.offsetHeight)
      setFitScale(s > 0 ? s : 1)
    }
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    window.addEventListener('resize', fit)
    return () => { ro.disconnect(); window.removeEventListener('resize', fit) }
  }, [phase])

  // ── submit ────────────────────────────────────────
  const handleSubmit = async () => {
    if (!snapNode || submitting) return
    setSubmitting(true)

    // 1. AI Dynamic Session Submission
    if (sessionId && sessionExercises.length > questionIndex) {
      const currentEx = sessionExercises[questionIndex]
      const correctTileMap = currentEx.correct_tile_map || {}
      const isCorrect = Object.keys(correctTileMap).every(pid => {
        const studentTile = (board[pid] || '').trim().toLowerCase()
        const expectedTile = (correctTileMap[pid] || '').trim().toLowerCase()
        return studentTile === expectedTile
      })

      apiFetch(`/ai/session/${sessionId}/evaluate/${questionIndex}/`, {
        method: 'POST',
        body: JSON.stringify({ board_state: board, node_id: nodeId, module: 'snap_gap' }),
      }).catch(() => {})

      if (isCorrect) {
        const currentHints = (hintTier || 0) + (hintOverlay ? 1 : 0)
        const currentCaseRes: CaseResult = {
          caseNumber: questionIndex + 1,
          correct: true,
          firstTry: wrongs === 0,
          hintsUsed: currentHints,
          attempts: wrongs + 1,
        }
        const updatedCases = [...sessionResults.filter(r => r.caseNumber !== questionIndex + 1), currentCaseRes]
        setSessionResults(updatedCases)

        const nextIdx = questionIndex + 1
        if (sessionId) {
          updateSessionProgress(sessionId, nextIdx).catch(() => {})
        }
        if (sessionStartId) {
          saveSession('snap_gap', sessionStartId, {
            sessionQueue,
            questionIndex: nextIdx,
            next_node: savedNextNode || undefined,
            streak: savedStreak !== null ? savedStreak : undefined,
          })
        }
        if (nextIdx < sessionExercises.length) {
          playRightAnswerSound()
          setQuestionIndex(nextIdx)
          loadQuestion(nextIdx, sessionQueue)
          setSubmitting(false)
        } else {
          // Finished all 5 questions; mastery only when no case was failed
          try {
            const unsolved = unsolvedCases(updatedCases)   // read before the saved misses are cleared
            const cleared = unsolved === 0
            let finalRes: { next_node?: string | null; streak?: number; xp_awarded?: number } = {}
            if (cleared) {
              playVictorySound()
              finalRes = await apiFetch(`/ai/session/${sessionId}/mastery/`, { method: 'POST' })
            }
            if (sessionStartId) clearSession('snap_gap', sessionStartId)
            writeSkipped(sessionStartId, [])
            const totalCases = sessionExercises.length || sessionQueue.length || 5
            const correctCases = updatedCases.filter(r => r.correct).length
            const firstTryCases = updatedCases.filter(r => r.firstTry).length
            const totalHints = updatedCases.reduce((acc, r) => acc + (r.hintsUsed || 0), 0)
            const accuracy = Math.round((firstTryCases / Math.max(1, totalCases)) * 100)
            const timeTakenSeconds = Math.max(1, Math.round((Date.now() - sessionStartTimeRef.current) / 1000))

            setMasteryData({
              next_node: cleared ? finalRes.next_node : null,
              streak: finalRes.streak ?? 1,
              accuracy,
              totalCases,
              correctCases,
              hintsUsed: totalHints,
              timeTakenSeconds,
              caseResults: updatedCases,
            })
            setDebrief({
              verdict: cleared ? 'perfect' : 'partial',
              solved: totalCases - unsolved,
              total: totalCases,
              xpAwarded: cleared && typeof finalRes.xp_awarded === 'number' ? finalRes.xp_awarded : null,
              nextNode: cleared ? (finalRes.next_node ?? null) : null,
              missed: missedCases,
            })
          } catch {
            setSubmitting(false)
          }
        }
        return
      } else {
        playWrongSound()
        say('Some pairs are incorrect. Check and retry.', 'feedback')
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
        const currentHints = (hintTier || 0) + (hintOverlay ? 1 : 0)
        const currentCaseRes: CaseResult = {
          caseNumber: questionIndex + 1,
          correct: true,
          firstTry: wrongs === 0,
          hintsUsed: currentHints,
          attempts: wrongs + 1,
        }
        const updatedCases = [...sessionResults.filter(r => r.caseNumber !== questionIndex + 1), currentCaseRes]
        setSessionResults(updatedCases)

        const nextIdx = questionIndex + 1

        if (nextIdx < sessionQueue.length) {
          playRightAnswerSound()
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
          const unsolved = unsolvedCases(updatedCases)   // read before the saved misses are cleared
          const cleared = unsolved === 0
          if (cleared) playVictorySound()
          let finalRes = res
          if (sessionStartId && cleared) {
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

          const newNextNode = cleared ? (savedNextNode || finalRes.next_node) : null
          const newStreak = savedStreak !== null ? savedStreak : (finalRes.streak ?? null)

          if (sessionStartId) clearSession('snap_gap', sessionStartId)
          writeSkipped(sessionStartId, [])
          const totalCases = sessionQueue.length || 5
          const correctCases = updatedCases.filter(r => r.correct).length
          const firstTryCases = updatedCases.filter(r => r.firstTry).length
          const totalHints = updatedCases.reduce((acc, r) => acc + (r.hintsUsed || 0), 0)
          const accuracy = Math.round((firstTryCases / Math.max(1, totalCases)) * 100)
          const timeTakenSeconds = Math.max(1, Math.round((Date.now() - sessionStartTimeRef.current) / 1000))

          setMasteryData({
            next_node: newNextNode,
            streak: newStreak,
            accuracy,
            totalCases,
            correctCases,
            hintsUsed: totalHints,
            timeTakenSeconds,
            caseResults: updatedCases,
          })
          setDebrief({
            verdict: cleared ? 'perfect' : 'partial',
            solved: totalCases - unsolved,
            total: totalCases,
            xpAwarded: cleared && typeof finalRes.xp_awarded === 'number' ? finalRes.xp_awarded : null,
            nextNode: newNextNode ?? null,
            missed: missedCases,
          })
        }
      }
    } catch (e: any) {
      playWrongSound()
      say(e?.status === 'incomplete'
        ? 'Some pairs are incorrect. Check and retry.'
        : 'Submission failed. Please try again.', 'feedback')
    } finally { setSubmitting(false) }
  }

  // ── debrief actions ───────────────────────────────
  /** RETRY CASE / Fresh Case: wipe the docket and load a brand-new 5-case set. */
  const handleRetryDocket = () => {
    setDebrief(null); setMissedCases([]); setRemark(null)
    startSession(true)
  }

  /** NEXT DOCKET: on to the unlocked node, or the case report when nothing was unlocked. */
  const handleNextDocket = () => {
    const next = debrief?.nextNode
    setDebrief(null)
    if (next) router.push(`/nodes/snap-gap/${next}`)
    else setPhase('mastery')
  }

  const handleViewReport = () => { setDebrief(null); setPhase('mastery') }

  // ── phase guards ──────────────────────────────────
  if (phase === 'loading')      return <BriefingGenerationScreen title={snapNode?.title} onCancel={() => router.push('/dashboard')} />
  if (phase === 'error')        return <ErrorScreen msg={errorMsg} onBack={() => router.push('/dashboard')} />
  if (phase === 'micro_lesson') return (
    <LessonScreen
      node={snapNode!}
      onContinue={() => setPhase(snapNode!.deep_dive_required ? 'deep_dive' : 'task')}
      onDashboard={() => router.push('/dashboard')}
    />
  )
  if (phase === 'deep_dive')    return (
    <DeepDiveScreen
      node={snapNode!}
      onContinue={() => setPhase('task')}
      onDashboard={() => router.push('/dashboard')}
    />
  )
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
  const level       = snapNode!.difficulty ?? nodeDifficulty(nodeId)
  const attemptsLeft = Math.max(0, MAX_ATTEMPTS - wrongs)   // wrongs resets to 0 on every new case
  const sentenceB   = currentPair?.sentence_b
    ? currentPair.sentence_b.charAt(0).toUpperCase() + currentPair.sentence_b.slice(1)
    : ''

  const openTutorial  = () => { setTutorialStep(0); setTutorialOpen(true) }
  const closeTutorial = () => setTutorialOpen(false)
  const nextTutorialStep = () => setTutorialStep(prev => Math.min(prev + 1, TUTORIAL_STEPS.length - 1))
  const prevTutorialStep = () => setTutorialStep(prev => Math.max(prev - 1, 0))

  const endSession = () => {
    if (sessionId) {
      updateSessionProgress(sessionId, questionIndex).catch(() => {})
    }
    if (sessionStartId && sessionQueue.length > 0) {
      saveSession('snap_gap', sessionStartId, {
        sessionQueue,
        questionIndex,
        next_node: savedNextNode || undefined,
        streak: savedStreak !== null ? savedStreak : undefined,
      })
    }
    router.push('/dashboard')
  }

  return (
    <div className={`${desk.desk} ${styles.screen}`}>
      <div className={desk.vignette} aria-hidden />
      <div className={desk.lamp} aria-hidden />

      {/* ── Slide-out action tabs (icons peek from the left edge) ── */}
      <div className={styles.sideTabs}>
        {[
          { label: 'Hint',        icon: Lightbulb, action: () => fetchHint(Math.min(wrongs + 1, 3)) },
          { label: 'Fresh Case',  icon: RotateCcw, action: handleRetryDocket },
          { label: 'End Session', icon: LogOut,    action: endSession },
        ].map(({ label, icon: Icon, action }) => (
          <button key={label} type="button" onClick={action} className={styles.sideTab} title={label}>
            <span className={styles.sideTabLabel}>{label}</span>
            <span className={styles.sideTabIcon}><Icon size={18} aria-hidden /></span>
          </button>
        ))}
      </div>

      {/* ── Dossier (scaled to fit the viewport) ── */}
      <div ref={fitRef} className={`${styles.boardEnter} ${styles.dossier}`} style={{ transform: `scale(${fitScale})` }}>

        {/* Folder tabs */}
        <div className={styles.dossierTabs}>
          <div className={`${styles.dossierTab} ${styles.dossierTabActive}`}>
            <Paperclip size={22} strokeWidth={1.75} className={styles.tabClip} aria-hidden />
            <span className={styles.tabIndex}>[2] CASE 02:</span>
            <span className={styles.tabLabel}><Puzzle size={13} aria-hidden /> {MODULE_TITLES.snap_gap}</span>
          </div>
          {sessionQueue.length > 0 && (
            <div className={styles.dossierTab}>
              <span className={styles.tabIndex}>DOCKET</span>
              <span className={styles.tabLabel}>CASE {questionIndex + 1} / {sessionQueue.length}</span>
            </div>
          )}
          <div className={styles.dossierTab}>
            <span className={styles.tabIndex}>CLEARANCE</span>
            <span className={styles.tabLabel}>
              <span className={styles.levelDot} style={{ background: DIFFICULTY_COLORS[level] }} />
              LVL {level} — {DIFFICULTY_LABELS[level]}
            </span>
          </div>
        </div>

        <div className={`${desk.folder} ${styles.folder}`}>
          <Paperclip size={34} strokeWidth={1.6} className={styles.folderClip} aria-hidden />

          {/* Header bar */}
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <span className={styles.kicker}>
                <FolderOpen size={14} aria-hidden /> CASE FILE {'//'} EVIDENCE BRIDGE
              </span>
              <h1 className={styles.title}>{snapNode!.title}</h1>
            </div>
            <div className={styles.headerRight}>
              <button type="button" className={`${styles.caseBtn} ${styles.caseBtnGhost}`} onClick={openTutorial}>
                <HelpCircle size={14} aria-hidden /> Tutorial
              </button>
            </div>
          </header>

          {/* Objective stamp + progress */}
          <div className={styles.objectiveRow}>
            <span className={styles.objective}>
              OBJECTIVE: SELECT THE CORRECT TRANSITION TILE TO BRIDGE THE GAP
            </span>
            <span className={`${desk.handwritten} ${styles.objectiveNote}`}>contrast? result? addition? →</span>
          </div>
          {sessionQueue.length > 0 && (
            <div className={styles.progress} aria-hidden>
              <div className={styles.progressFill} style={{ width: `${((questionIndex + 1) / sessionQueue.length) * 100}%` }} />
            </div>
          )}

          {/* Pair progress pips */}
          {snapNode!.sentence_pairs.length > 1 && (
            <div className={styles.pairPips} aria-label={`Pair ${pairIdx + 1} of ${snapNode!.sentence_pairs.length}`}>
              {snapNode!.sentence_pairs.map((p, i) => (
                <i key={p.pair_id}
                  className={locked.includes(p.pair_id) ? styles.pipDone : i === pairIdx ? styles.pipActive : ''} />
              ))}
            </div>
          )}

          {/* ── Evidence board: Exhibit A | tile dock | Exhibit B ── */}
          <div className={`${styles.board} ${tileState === 'correct' ? styles.boardCorrect : ''}`}>
            <article className={`${desk.indexCard} ${styles.exhibit}`} style={{ transform: 'rotate(-0.8deg)' }}>
              <span className={styles.pushPin} aria-hidden />
              <span className={styles.exhibitNo}>EXHIBIT A</span>
              <p className={`${bodyFont.className} ${styles.exhibitText}`}>{currentPair ? currentPair.sentence_a : ''}</p>
            </article>

            <div className={styles.dock}>
              <div className={styles.dockLabel}>TRANSITION TILE DOCK</div>
              <div className={`${styles.dockStatus} ${tileState === 'correct' ? styles.dockStatusOk : tileState === 'incorrect' ? styles.dockStatusBad : ''}`}
                role="status">
                {revealing
                  ? 'CASE FILED — NEXT CASE INCOMING'
                  : tileState === 'correct'
                    ? `✓ ${currentPair ? (board[currentPair.pair_id] ?? '') : ''}`
                    : tileState === 'incorrect' ? '✕ WRONG TILE' : 'bridge the gap'}
              </div>
              <div className={styles.tiles}>
                {snapNode!.transition_tile_dock.map(tile => (
                  <button
                    key={tile}
                    type="button"
                    disabled={tileState !== 'idle' || allDone || !!revealing}
                    onClick={() => handleTile(tile)}
                    className={`${bodyFont.className} ${styles.tile} ${revealing?.tile && revealing.tile.trim().toLowerCase() === tile.trim().toLowerCase() ? styles.tileReveal : ''}`}
                  >
                    {tile}
                  </button>
                ))}
              </div>
            </div>

            <article className={`${desk.indexCard} ${styles.exhibit}`} style={{ transform: 'rotate(0.7deg)' }}>
              <span className={styles.pushPin} aria-hidden />
              <span className={styles.exhibitNo}>EXHIBIT B</span>
              <p className={`${bodyFont.className} ${styles.exhibitText}`}>{sentenceB}</p>
            </article>
          </div>

          {/* ── Footer bar ── */}
          <div className={styles.submitBar}>
            <span className={styles.counter}>
              {locked.length} / {snapNode!.sentence_pairs.length} PAIRS BRIDGED
              {allDone && <span className={styles.allDone}>ALL GAPS BRIDGED — SUBMIT WHEN READY</span>}
              {!allDone && !revealing && wrongs > 0 && attemptsLeft > 0 && (
                <span className={`${bodyFont.className} ${styles.attemptMsg}`} role="status">
                  Incorrect bridge. Attempts remaining: {attemptsLeft}/{MAX_ATTEMPTS}
                </span>
              )}
            </span>
            <div className={styles.submitGroup}>
              <span className={`${styles.attemptBadge} ${attemptsLeft <= 1 ? styles.attemptBadgeLow : ''}`}
                aria-label={`Attempts remaining: ${attemptsLeft} of ${MAX_ATTEMPTS}`}>
                ATTEMPTS: {attemptsLeft}/{MAX_ATTEMPTS}
                <span className={styles.attemptPips} aria-hidden>
                  {Array.from({ length: MAX_ATTEMPTS }, (_, i) => <i key={i} className={i < attemptsLeft ? styles.pipOn : ''} />)}
                </span>
              </span>
              {disputed && !allDone ? (
                // Wrong tile: a crimson alert stands in for SUBMIT until the next tile is tried
                <span className={styles.disputedBadge} role="status">✕ BRIDGE DISPUTED</span>
              ) : (
                <button
                  type="button"
                  disabled={!allDone || submitting}
                  onClick={handleSubmit}
                  className={`${styles.submitBtn} ${styles.submit} ${allDone && !submitting ? styles.submitBtnReady : ''}`}
                >
                  {submitting ? 'CHECKING…' : <><FileText size={16} aria-hidden /> SUBMIT <ArrowRight size={18} aria-hidden /></>}
                </button>
              )}
            </div>
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

      <CaseDebriefModal
        debrief={debrief}
        onRetry={handleRetryDocket}
        onNext={handleNextDocket}
        onReport={handleViewReport}
      />

      {!debrief && (
        <CritRemark
          remark={remark}
          onDismiss={() => setRemark(null)}
          onAskMore={sessionId ? handleAskSocraticAdvice : undefined}
          asking={socraticLoading}
        />
      )}
    </div>
  )
}
