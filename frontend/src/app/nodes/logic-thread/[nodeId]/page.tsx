'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams }             from 'next/navigation'
import { apiFetch }                          from '@/lib/api'
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
import CaseDebriefModal, { type DocketDebrief, type MissedCase } from '@/components/logic-thread/CaseDebriefModal'
import LessonManual, { type NodeLesson } from '@/components/logic-thread/LessonManual'
import LogicThreadTutorial, { hasSeenLogicThreadTutorial } from '@/components/logic-thread/LogicThreadTutorial'
import CritRemark, { type Remark, type RemarkKind } from '@/components/logic-thread/CritRemark'
import { analyzeSequence } from '@/components/logic-thread/sequenceFeedback'
import {
  ArrowRight, BookOpen, FileText, FolderOpen, HelpCircle, Lightbulb, LogOut, Network, Paperclip, RotateCcw,
} from 'lucide-react'
import desk from '@/components/dashboard/desk.module.css'
import { Montserrat } from 'next/font/google'
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
/** Fields read from the mastery endpoints' responses. */
interface MasteryResponse { status?: string; next_node?: string | null; streak?: number; xp_awarded?: number }

/** True Fisher-Yates array shuffle for non-predictable card scattering */
function shuffleBlocks(arr: Block[]): Block[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy
}

// Exhibit card text: Montserrat, self-hosted by next/font
const cardFont = Montserrat({ subsets: ['latin'], weight: ['500', '600'], display: 'swap' })

/**
 * Card typography. The card's ruled lines are spaced at `rule` px (= the line-height), and the
 * top padding puts each text baseline right on a rule (Montserrat baseline ≈ rule/2 + 0.36·size).
 */
function getCardTypography(text: string, cardCount: number) {
  const len = text.length
  let fontSize = 17, rule = 28                       // text-lg on 1.75rem lines
  if (len > 140)      { fontSize = 14; rule = 24 }
  else if (len > 110) { fontSize = 15; rule = 26 }
  else if (len > 70)  { fontSize = 16; rule = 28 }  // text-base, leading-[1.75rem]
  if (cardCount >= 5) fontSize = Math.min(fontSize, 16)
  const paddingTop = Math.round(23 + rule / 2 - 0.36 * fontSize)
  return { fontSize, rule, paddingTop }
}


// Inspector Crit's lower-left side remarks
const CORRECT_REMARKS = ['Good job!', 'Well done, Cadet!', 'Sharp deduction!', 'Textbook detective work!', 'That thread holds — nicely done!']
const MAX_ATTEMPTS = 3
const RETRY_REMARKS = ['Not quite — re-thread the cards and try again.', 'Close, Cadet. Check the signal words and give it another go.', 'One link snapped. Find it and resubmit.']
const CHAIN_DONE_REMARKS = ['All exhibits threaded. Submit when you are sure.', 'Every card is pinned — give it one last look.']
const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)]

/** Inspector Crit's walkthrough of the correct thread after the last failed attempt. */
function explainCorrectThread(answerKey: string[] | null, blocks: Block[]): string {
  const snip = (id: string) => {
    const words = (blocks.find(b => b.block_id === id)?.text ?? '').split(/\s+/)
    return words.slice(0, 5).join(' ').replace(/[,.;:]$/, '') + (words.length > 5 ? '…' : '')
  }
  if (!answerKey || answerKey.length === 0) {
    return 'Three strikes on this exhibit, Cadet — it goes in the file as unverified. Study how each card opens: the signal words set the order. On to the next case.'
  }
  const thread = answerKey.map((id, i) => `${i + 1}) “${snip(id)}”`).join(' → ')
  return `Three strikes — this one is filed as unverified. The thread runs: ${thread}. Notice how each opening signal word fixes its place.`
}
const HINT_FALLBACK = 'Re-read how each card opens — signal words like First, Then, Meanwhile and Finally give the order away.'
const THINKING_TEXT = 'Inspector Crit is examining the evidence trail'
const SOCRATIC_FALLBACK = 'Ask yourself which event has to happen before each card. Which one could only come last?'

// Missed cases survive a reload, so a resumed docket can't close with an unsolved case
const SKIPPED_KEY = (startId: string) => `critica_skipped_logic_thread_${startId}`
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


// ── Canvas geometry ──────────────────────────────────────────
const CW = 1100, CH = 520, CARD_W = 270, CARD_H = 190
// Card layouts below were drawn for a 900px-wide board (rightmost card at x=625);
// stretch them so the widest layout spans the wider board with a small margin
const LAYOUT_MAX_X = 625
const X_STRETCH = (CW - CARD_W - 8) / LAYOUT_MAX_X
// Room kept free beside the dossier: the retracted side tabs only show their icons
const SIDE_GUTTER = 64
// Slight hand-pinned tilt per index card (degrees)
// Pointer travel (board px) before a press becomes a drag instead of a click
const DRAG_THRESHOLD = 5
const CARD_TILTS = [-1.2, 0.8, -0.5, 1.1, -0.9, 0.6]

export function getScatterPositions(count: number) {
  return layoutFor(count).map(p => ({ x: Math.round(p.x * X_STRETCH), y: p.y }))
}

function layoutFor(count: number) {
  // Basics: exactly 3 cards (Triangle / V-stagger formation)
  if (count <= 3) {
    return [
      { x: 45,  y: 50 },
      { x: 315, y: 290 },
      { x: 585, y: 60 },
    ]
  }
  // Intermediate: exactly 4 cards (Staggered 2x2 detective formation)
  if (count === 4) {
    return [
      { x: 80,  y: 45 },
      { x: 550, y: 55 },
      { x: 130, y: 265 },
      { x: 500, y: 275 },
    ]
  }
  // Advanced: exactly 5 cards (3 top, 2 bottom staggered formation)
  if (count === 5) {
    return [
      { x: 45,  y: 35 },
      { x: 335, y: 30 },
      { x: 625, y: 40 },
      { x: 175, y: 255 },
      { x: 505, y: 260 },
    ]
  }
  // Fallback for 6+ cards (two staggered rows of three)
  return [
    { x: 30,  y: 30  },
    { x: 315, y: 50  },
    { x: 600, y: 30  },
    { x: 30,  y: 300 },
    { x: 315, y: 320 },
    { x: 600, y: 300 },
  ]
}

function bezierPath(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  const dx = x2 - x1, dy = y2 - y1
  const L  = Math.sqrt(dx * dx + dy * dy) || 1
  return `M${x1},${y1} Q${mx + (-dy / L) * 58},${my + (dx / L) * 58} ${x2},${y2}`
}

// ── Color palette ─────────────────────────────────────────────
const FONT = "'Courier New', Courier, monospace"

const C = {
  pageBg:      'radial-gradient(ellipse at center, #566049 0%, #4a543f 45%, #414833 100%)',
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
const btnSm: React.CSSProperties = {
  padding: '7px 16px', background: 'transparent',
  border: `1px solid ${C.textMid}`, borderRadius: 2, color: C.textLight,
  fontFamily: FONT, fontSize: 10, fontWeight: 700, cursor: 'pointer',
}

// ── Sub-screens ───────────────────────────────────────────────
function BriefingGenerationScreen({ title, onCancel }: { title?: string; onCancel?: () => void }) {
  return <CaseLoadingLobby moduleKey="logic_thread" title={title} onCancel={onCancel} />
}

function ErrorScreen({ msg, onBack }: { msg: string; onBack: () => void }) {
  return (
    <div className={desk.desk} style={{ minHeight: '100vh', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT, gap: 16 }}>
      <p style={{ color: '#ff6b6b', fontSize: 13 }}>{msg}</p>
      <button onClick={onBack} style={btnSm}>← DASHBOARD</button>
    </div>
  )
}

function LessonScreen({ node, onContinue, onDashboard }: { node: NodeData; onContinue: () => void; onDashboard?: () => void }) {
  return (
    <CaseLessonScreen
      moduleKey="logic_thread"
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

function DeepDiveScreen({ node, onContinue, onDashboard }: { node: NodeData; onContinue: () => void; onDashboard?: () => void }) {
  return (
    <CaseLessonScreen
      moduleKey="logic_thread"
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
  { node: NodeData; data: any; onDashboard: () => void; onNext: () => void; onReplay?: () => void }) {
  return (
    <div className={desk.desk} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
      <NodeEvaluationReport
        moduleKey="logic_thread"
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

// ── Main component ───────────────────────────────────────────
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
  const [socraticLoading, setSocraticLoading] = useState(false)
  const [masteryData,  setMasteryData]  = useState<any>(null)
  const [errorMsg,     setErrorMsg]     = useState('')
  const [tutorialOpen, setTutorialOpen] = useState(false)

  const [sessionQueue,     setSessionQueue]     = useState<string[]>([])
  const [questionIndex,    setQuestionIndex]    = useState(0)
  const [sessionId,        setSessionId]        = useState<string | null>(null)
  const [sessionExercises, setSessionExercises] = useState<any[]>([])
  const [sessionStartId,   setSessionStartId]   = useState<string | null>(null)
  const [savedNextNode,    setSavedNextNode]    = useState<string | null>(null)
  const [savedStreak,      setSavedStreak]      = useState<number | null>(null)

  // session accuracy evaluation state
  const [sessionResults,   setSessionResults]   = useState<CaseResult[]>([])
  const sessionStartTimeRef = useRef<number>(Date.now())

  // Inspector Crit's post-case debrief, the lesson manual and viewport fitting
  const [debrief,    setDebrief]    = useState<DocketDebrief | null>(null)
  const [missedCases, setMissedCases] = useState<MissedCase[]>([])
  const [remark,     setRemark]     = useState<Remark | null>(null)
  const [lesson,     setLesson]     = useState<NodeLesson | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [fitScale,   setFitScale]   = useState(1)
  const fitRef = useRef<HTMLDivElement>(null)

  // Freeform card dragging: dragged cards keep their own board position (keyed by block id)
  const [cardPos,    setCardPos]    = useState<Record<string, { x: number; y: number }>>({})
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const dragRef = useRef<{ id: string; startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null)
  const suppressClickRef = useRef(false)   // a drag must not also count as a click (select/thread)
  const closeManual = useCallback(() => setManualOpen(false), [])

  // ── Load question ───────────────────────────────────────────
  const loadQuestion = useCallback(async (targetIndex: number, queue: string[]) => {
    setPhase('loading')
    try {
      if (sessionExercises.length > targetIndex) {
        const ex = sessionExercises[targetIndex]
        setNode(prev => prev ? ({
          ...prev,
          title: ex.topic_title || prev.title,
          reading_passage: ex.reading_passage || prev.reading_passage,
          paragraph_blocks: ex.paragraph_blocks || prev.paragraph_blocks,
        }) : ex)
        setBlocks(shuffleBlocks(ex.paragraph_blocks))
        setChain([]); setCardPos({}); setSubmitState('idle'); setWrongCount(0)
        setShowHint(false); setPhase('task')
        return
      }
      const targetNodeId = queue[targetIndex] || nodeId
      const d = await apiFetch(`/nodes/logic-thread/${targetNodeId}/`)
      setNode(d)
      setLesson({ nodeId: d.node_id, title: d.title, focus: d.focus, text: d.micro_lesson_text })
      setBlocks(shuffleBlocks(d.paragraph_blocks))
      setChain([]); setCardPos({}); setSubmitState('idle'); setWrongCount(0)
      setShowHint(false); setPhase('task')
    } catch (e: any) {
      setErrorMsg(e?.error ?? 'Failed to load next question.'); setPhase('error')
    }
  }, [sessionExercises, nodeId])

  // ── Load node & AI Session ──────────────────────────────────
  const startSession = useCallback(async (forceFresh = false) => {
    setPhase('loading')
    const start = nodeId
    setSessionStartId(start)
    if (forceFresh) {
      // Retry / Fresh Case: wipe the whole docket, not just the failed case
      setSessionResults([]); setMissedCases([])
      writeSkipped(start, [])
      sessionStartTimeRef.current = Date.now()
    }

    try {
      const sessionData = await fetchNodeSession('logic_thread', start, forceFresh)
      setSessionId(sessionData.session_id)
      setSessionExercises(sessionData.exercises || [])
      
      // A fresh start (Retry / Fresh Case) always opens a brand-new full docket at case 1
      const resumeIdx = forceFresh ? 0 : Math.min(
        sessionData.current_index ?? 0,
        Math.max(0, (sessionData.exercises?.length ?? 1) - 1)
      )
      const activeExercise = sessionData.exercises?.[resumeIdx] || sessionData.exercises?.[0]

      setLesson({
        nodeId: sessionData.node_id, title: sessionData.title,
        focus: sessionData.focus, text: sessionData.micro_lesson_text,
      })
      setNode({
        node_id: sessionData.node_id,
        title: activeExercise?.topic_title || sessionData.title,
        focus: sessionData.focus,
        difficulty: sessionData.difficulty,
        micro_lesson_text: sessionData.micro_lesson_text,
        reading_passage: activeExercise?.reading_passage || sessionData.reading_passage,
        deep_dive_required: sessionData.deep_dive_required,
        paragraph_blocks: activeExercise?.paragraph_blocks || [],
      })
      const activeBlocks = activeExercise?.paragraph_blocks || []
      setBlocks(shuffleBlocks(activeBlocks))
      const totalQ = sessionData.exercises?.length || 5
      const queue = Array.from({ length: totalQ }, (_, i) => `q${i + 1}`)
      setSessionQueue(queue)
      setQuestionIndex(resumeIdx)
      setChain([]); setCardPos({}); setSubmitState('idle'); setWrongCount(0)
      setShowHint(false)
      
      if (forceFresh || resumeIdx === 0) {
        setSessionResults([])
        setMissedCases([])
        writeSkipped(start, [])
        sessionStartTimeRef.current = Date.now()
      }

      saveSession('logic_thread', start, {
        sessionQueue: queue,
        questionIndex: resumeIdx,
      })
      
      setPhase((resumeIdx > 0 || forceFresh) ? 'task' : 'micro_lesson')
    } catch {
      // Fallback to legacy static node queue
      if (forceFresh) clearSession('logic_thread', start)
      const saved = forceFresh ? null : loadSession('logic_thread', start)
      if (saved && saved.sessionQueue.length === 5) {
        setSessionQueue(saved.sessionQueue); setQuestionIndex(saved.questionIndex)
        if (saved.next_node) setSavedNextNode(saved.next_node)
        if (saved.streak !== undefined) setSavedStreak(saved.streak)
        const activeId = saved.sessionQueue[saved.questionIndex] ?? start
        apiFetch(`/nodes/logic-thread/${activeId}/`)
          .then((d: NodeData) => {
            setNode(d); setBlocks(shuffleBlocks(d.paragraph_blocks)); setPhase('task')
            setLesson({ nodeId: d.node_id, title: d.title, focus: d.focus, text: d.micro_lesson_text })
          })
          .catch((e: any) => {
            if (e?.status === 401)              { router.push('/auth');      return }
            if (e?.error === 'Node is locked.') { router.push('/dashboard'); return }
            setErrorMsg(e?.error ?? 'Failed to load node.'); setPhase('error')
          })
      } else {
        apiFetch(`/nodes/logic-thread/${start}/`)
          .then((d: NodeData) => {
            setNode(d); setBlocks(shuffleBlocks(d.paragraph_blocks))
            setLesson({ nodeId: d.node_id, title: d.title, focus: d.focus, text: d.micro_lesson_text })
            setPhase(forceFresh ? 'task' : 'micro_lesson')
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
    }
  }, [nodeId, router])

  useEffect(() => {
    startSession(false)
  }, [startSession])

  useEffect(() => {
    if (phase !== 'task' || nodeId !== 'log_node_01') return
    // First visit to Node 01: Inspector Crit walks the cadet through the board
    if (hasSeenLogicThreadTutorial()) return
    setTutorialOpen(true)
  }, [phase, nodeId])

  // Inspector Crit speaks from the lower-left corner: remarks fade on their own, hints stay until dismissed
  const say = useCallback((text: string, kind: RemarkKind = 'remark') => setRemark({ id: Date.now(), text, kind }), [])

  const fetchHint = useCallback(async (tier: number) => {
    setShowHint(true)   // counts as a hint used on this case
    say(THINKING_TEXT, 'thinking')   // Inspector Crit ponders while the hint loads
    let text = HINT_FALLBACK
    try {
      const res = sessionId && sessionExercises.length > questionIndex
        ? await apiFetch(`/ai/session/${sessionId}/feedback/${questionIndex}/`, {
            method: 'POST',
            body: JSON.stringify({ tier }),
          })
        : await apiFetch(`/nodes/logic-thread/${node?.node_id ?? nodeId}/feedback/`, {
            method: 'POST',
            body: JSON.stringify({ source_id: '', target_id: '', inactivity_seconds: 61 }),
          })
      text = res.hint || res.explanation || HINT_FALLBACK
    } catch { /* keep the fallback hint */ }
    say(text, 'hint')
  }, [nodeId, node, sessionId, sessionExercises, questionIndex, say])

  const handleAskSocraticAdvice = async () => {
    if (!sessionId) return
    setSocraticLoading(true)
    say(THINKING_TEXT, 'thinking')
    try {
      const res = await fetchLiveSocraticHint(sessionId, questionIndex, { sequence: chain }, wrongCount + 1)
      say(res.socratic_hint || SOCRATIC_FALLBACK, 'hint')
    } catch {
      say(SOCRATIC_FALLBACK, 'hint')
    } finally {
      setSocraticLoading(false)
    }
  }

  // ── Card dragging (pointer events: mouse, pen and touch) ────
  const handleCardPointerDown = (e: React.PointerEvent<HTMLDivElement>, blockId: string, pos: { x: number; y: number }) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { id: blockId, startX: e.clientX, startY: e.clientY, originX: pos.x, originY: pos.y, moved: false }
  }

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    // Pointer deltas are in screen pixels; the dossier is scaled to fit, so convert to board pixels
    const dx = (e.clientX - drag.startX) / fitScale
    const dy = (e.clientY - drag.startY) / fitScale
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      drag.moved = true
      setDraggingId(drag.id)
    }
    // Keep the whole card inside the evidence board (inside its 1px border)
    const x = Math.min(Math.max(0, drag.originX + dx), CW - 2 - CARD_W)
    const y = Math.min(Math.max(0, drag.originY + dy), CH - 2 - CARD_H)
    setCardPos(prev => ({ ...prev, [drag.id]: { x, y } }))
  }

  const handleCardPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    if (drag.moved) suppressClickRef.current = true
    dragRef.current = null
    setDraggingId(null)
  }

  const handleCardClick = (blockId: string) => {
    if (suppressClickRef.current) { suppressClickRef.current = false; return }
    if (submitState !== 'idle') return
    const idx = chain.indexOf(blockId)
    const nextChain = idx !== -1 ? chain.slice(0, idx) : [...chain, blockId]
    setChain(nextChain)
    if (idx === -1 && nextChain.length === blocks.length) say(pick(CHAIN_DONE_REMARKS))
  }

  // Attempts left on the active case (wrongCount resets to 0 whenever a case loads)
  const attemptsLeft = Math.max(0, MAX_ATTEMPTS - wrongCount)

  const totalCases = sessionId && sessionExercises.length > 0
    ? sessionExercises.length
    : (sessionQueue.length || 1)

  /** Record how this case was decided and return the updated results list. */
  const recordCase = (correct: boolean): CaseResult[] => {
    const res: CaseResult = {
      caseNumber: questionIndex + 1,
      correct,
      firstTry: correct && wrongCount === 0,
      hintsUsed: showHint ? 1 : 0,
      attempts: correct ? wrongCount + 1 : MAX_ATTEMPTS,
    }
    const updated = [...sessionResults.filter(r => r.caseNumber !== questionIndex + 1), res]
    setSessionResults(updated)
    return updated
  }

  /** Save the docket position so the session resumes at `nextIdx`. */
  const persistProgress = (nextIdx: number) => {
    if (sessionId) updateSessionProgress(sessionId, nextIdx).catch(() => {})
    if (sessionStartId) saveSession('logic_thread', sessionStartId, {
      sessionQueue, questionIndex: nextIdx,
      next_node: savedNextNode || undefined,
      streak: savedStreak !== null ? savedStreak : undefined,
    })
  }

  /** Cases missed this docket (this run's misses plus misses saved before a reload). */
  const unsolvedCases = (updated: CaseResult[]) =>
    new Set([...updated.filter(r => !r.correct).map(r => r.caseNumber), ...readSkipped(sessionStartId)]).size

  /** Last case submitted: commit mastery only when no case was missed, then build the report. */
  const closeDocket = async (updated: CaseResult[], legacyRes?: MasteryResponse) => {
    const solved = updated.filter(r => r.correct).length
    const cleared = unsolvedCases(updated) === 0
    let finalRes: MasteryResponse = legacyRes ?? {}
    if (cleared) {
      playVictorySound()
      try {
        if (sessionId && sessionExercises.length > 0) {
          finalRes = await apiFetch(`/ai/session/${sessionId}/mastery/`, { method: 'POST' })
        } else if (sessionStartId) {
          finalRes = await apiFetch(`/nodes/logic-thread/${sessionStartId}/mastery/`,
            { method: 'POST', body: JSON.stringify({ commit_only: true }) })
        }
      } catch { /* the report still shows; the docket can be replayed */ }
    }
    if (sessionStartId) clearSession('logic_thread', sessionStartId)
    writeSkipped(sessionStartId, [])
    setMasteryData({
      next_node: cleared ? (savedNextNode || finalRes.next_node) : null,
      streak: savedStreak !== null ? savedStreak : (finalRes.streak ?? null),
      accuracy: Math.round((solved / Math.max(1, totalCases)) * 100),
      totalCases,
      correctCases: solved,
      hintsUsed: updated.reduce((acc, r) => acc + (r.hintsUsed || 0), 0),
      timeTakenSeconds: Math.max(1, Math.round((Date.now() - sessionStartTimeRef.current) / 1000)),
      caseResults: updated,
    })
    return {
      xp: cleared && typeof finalRes.xp_awarded === 'number' ? finalRes.xp_awarded : null,
      nextNode: cleared ? (savedNextNode || finalRes.next_node || null) : null,
    }
  }

  // Up to MAX_ATTEMPTS submissions per case: a wrong answer with attempts left can be re-arranged
  // and resubmitted; a correct answer or the last failed attempt decides the case and moves on.
  // Inspector Crit's debrief only opens after the last case of the docket.
  const handleSubmit = async () => {
    if (!node || submitState !== 'idle' || chain.length !== blocks.length) return
    setSubmitState('submitting')

    let isCorrect = false
    let answerKey: string[] | null = null
    let legacyRes: MasteryResponse | undefined

    if (sessionId && sessionExercises.length > questionIndex) {
      // 1. AI session: the answer key ships with the exercise
      const currentEx = sessionExercises[questionIndex]
      answerKey = currentEx.correct_sequence ?? null
      isCorrect = JSON.stringify(chain) === JSON.stringify(currentEx.correct_sequence)
      apiFetch(`/ai/session/${sessionId}/evaluate/${questionIndex}/`, {
        method: 'POST',
        body: JSON.stringify({ sequence: chain, node_id: nodeId, module: 'logic_thread' }),
      }).catch(() => {})
    } else {
      // 2. Legacy fallback: the backend checks the sequence
      try {
        legacyRes = await apiFetch(`/nodes/logic-thread/${node.node_id}/mastery/`, {
          method: 'POST',
          body: JSON.stringify({ sequence: chain, save_progression: false }),
        })
        isCorrect = legacyRes?.status === 'mastered'
      } catch { isCorrect = false }
    }

    const caseNumber = questionIndex + 1
    const isFinal = caseNumber >= totalCases
    const attemptsLeftAfter = isCorrect ? attemptsLeft : attemptsLeft - 1

    // Wrong but attempts remain: keep the chain so the cadet can re-arrange it and try again
    if (!isCorrect && attemptsLeftAfter > 0) {
      playWrongSound()
      setWrongCount(c => c + 1)
      setSubmitState('incorrect')
      say(pick(RETRY_REMARKS))
      setTimeout(() => setSubmitState('idle'), 1400)
      return
    }

    // The case is decided: solved, or out of attempts
    const updated = recordCase(isCorrect)
    let notes = missedCases
    if (!isCorrect) {
      // Third strike: the case is filed as unsolved and Crit walks through the correct thread
      setWrongCount(c => c + 1)
      writeSkipped(sessionStartId, [...readSkipped(sessionStartId), caseNumber])
      const v = analyzeSequence(chain, blocks, answerKey)
      notes = [...missedCases.filter(m => m.caseNumber !== caseNumber),
        { caseNumber, title: node.title, notes: v.notes, correctSlots: v.correctSlots, total: v.total }]
      setMissedCases(notes)
      say(explainCorrectThread(answerKey, blocks), 'explain')
      playWrongSound()
    } else {
      playRightAnswerSound()
      say(pick(CORRECT_REMARKS))
    }
    setSubmitState(isCorrect ? 'correct' : 'incorrect')

    setTimeout(async () => {
      if (!isFinal) {
        const nextIdx = questionIndex + 1
        persistProgress(nextIdx)
        setQuestionIndex(nextIdx)
        loadQuestion(nextIdx, sessionQueue)
        // Leave Crit's explanation of a failed case up while the next case loads
        if (isCorrect) say(`Case ${nextIdx + 1} of ${totalCases} — fresh evidence on the board.`)
        return
      }
      const unsolved = unsolvedCases(updated)   // read before closeDocket clears the saved misses
      const { xp, nextNode } = await closeDocket(updated, legacyRes)
      setDebrief({
        verdict: unsolved === 0 ? 'perfect' : 'partial',
        solved: totalCases - unsolved,
        total: totalCases,
        xpAwarded: xp,
        nextNode,
        missed: notes,
      })
    }, isCorrect ? 1400 : 2600)
  }

  // ── Debrief actions ─────────────────────────────────────────
  const handleRetryDocket = useCallback(() => {
    setDebrief(null); setMissedCases([]); setRemark(null)
    startSession(true)
  }, [startSession])

  const handleNextDocket = () => {
    const next = debrief?.nextNode
    setDebrief(null)
    if (next) router.push(`/nodes/logic-thread/${next}`)
    else setPhase('mastery')
  }

  const handleViewReport = () => { setDebrief(null); setPhase('mastery') }

  // Scale the dossier down so the whole board fits the 100vh viewport
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

  // ── Phase guards ────────────────────────────────────────────
  if (phase === 'loading')      return <BriefingGenerationScreen title={node?.title} onCancel={() => router.push('/dashboard')} />
  if (phase === 'error')        return <ErrorScreen msg={errorMsg} onBack={() => router.push('/dashboard')} />
  if (phase === 'micro_lesson') return (
    <LessonScreen
      node={node!}
      onContinue={() => setPhase(node?.deep_dive_required ? 'deep_dive' : 'task')}
      onDashboard={() => router.push('/dashboard')}
    />
  )
  if (phase === 'deep_dive')    return (
    <DeepDiveScreen
      node={node!}
      onContinue={() => setPhase('task')}
      onDashboard={() => router.push('/dashboard')}
    />
  )
  if (phase === 'mastery')      return (
    <MasteryScreen node={node!} data={masteryData}
      onDashboard={() => router.push('/dashboard')}
      onNext={() => masteryData?.next_node && router.push(`/nodes/logic-thread/${masteryData.next_node}`)}
      onReplay={() => startSession(true)}
    />
  )

  // ── TASK PHASE ──────────────────────────────────────────────
  const allChained = chain.length === blocks.length
  const threadColor = submitState === 'correct' ? '#2f6418' : '#a83232'
  const level = node!.difficulty ?? nodeDifficulty(nodeId)

  return (
    <div className={`${desk.desk} ${styles.screen}`}>
      <div className={desk.vignette} aria-hidden />
      <div className={desk.lamp} aria-hidden />

      {/* ── Side folder tabs ── */}
      <div className={styles.sideTabs}>
        {[
          { label: 'Hint', icon: Lightbulb, action: () => fetchHint(Math.min(wrongCount + 1, 3)) },
          { label: 'Fresh Case', icon: RotateCcw, action: handleRetryDocket },
          { label: 'End Session', icon: LogOut, action: () => {
            if (sessionId) {
              updateSessionProgress(sessionId, questionIndex).catch(() => {})
            }
            if (sessionStartId && sessionQueue.length > 0) {
              saveSession('logic_thread', sessionStartId, {
                sessionQueue, questionIndex,
                next_node: savedNextNode || undefined,
                streak: savedStreak !== null ? savedStreak : undefined,
              })
            }
            router.push('/dashboard')
          }},
        ].map(({ label, icon: Icon, action }) => (
          <button key={label} type="button" onClick={action} className={styles.sideTab} title={label} data-tutorial="sidebar">
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
            <span className={styles.tabIndex}>[1] CASE 01:</span>
            <span className={styles.tabLabel}><Network size={13} aria-hidden /> {MODULE_TITLES.logic_thread}</span>
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
                <FolderOpen size={14} aria-hidden /> CASE FILE {'//'} EVIDENCE BOARD
              </span>
              <h1 className={styles.title}>{node!.title}</h1>
            </div>
            <div className={styles.headerRight}>
              <button type="button" className={`${styles.caseBtn} ${styles.caseBtnGhost}`}
                onClick={() => setTutorialOpen(true)}>
                <HelpCircle size={14} aria-hidden /> Tutorial
              </button>
              <button type="button" className={styles.caseBtn} onClick={() => setManualOpen(true)}>
                <BookOpen size={14} aria-hidden /> Lesson Manual
              </button>
            </div>
          </header>

          {/* Objective stamp + progress */}
          <div className={styles.objectiveRow}>
            <span className={styles.objective}>
              OBJECTIVE: CONNECT ALL {blocks.length || 3} PARAGRAPHS IN LOGICAL SEQUENCE
            </span>
            <span className={`${desk.handwritten} ${styles.objectiveNote}`}>follow the signal words →</span>
          </div>
          {sessionQueue.length > 0 && (
            <div className={styles.progress} aria-hidden>
              <div className={styles.progressFill} style={{ width: `${((questionIndex + 1) / sessionQueue.length) * 100}%` }} />
            </div>
          )}

          {/* ── Evidence board ── */}
          <div className={styles.board} style={{ width: CW, height: CH }}>
            {(() => {
              // Dragged cards use their own position; the rest keep the scattered layout
              const scatter = getScatterPositions(blocks.length)
              const posOf = (id: string, i: number) => cardPos[id] ?? scatter[i] ?? { x: 50 + i * 140, y: 100 }
              const positions = blocks.map((b, i) => posOf(b.block_id, i))
              return (
                <>
                  {blocks.map((block, index) => {
                    const pos      = positions[index] ?? { x: 50 + index * 140, y: 100 }
                    const inChain  = chain.includes(block.block_id)
                    const isLatest = chain.length > 0 && chain[chain.length - 1] === block.block_id

                    const state =
                      submitState === 'correct'   && inChain ? styles.indexCorrect :
                      submitState === 'incorrect' && inChain ? styles.indexIncorrect :
                      isLatest                               ? styles.indexLatest :
                      inChain                                ? styles.indexChained : ''

                    const cardAnim =
                      submitState === 'correct'   && inChain ? styles.cardCorrect :
                      submitState === 'incorrect' && inChain ? styles.cardIncorrect :
                      styles.card

                    const typo = getCardTypography(block.text, blocks.length)

                    return (
                      <div
                        key={block.block_id}
                        data-tutorial="exhibits"
                        role="button"
                        tabIndex={submitState === 'idle' ? 0 : -1}
                        aria-pressed={inChain}
                        onClick={() => handleCardClick(block.block_id)}
                        onPointerDown={e => handleCardPointerDown(e, block.block_id, pos)}
                        onPointerMove={handleCardPointerMove}
                        onPointerUp={handleCardPointerUp}
                        onPointerCancel={handleCardPointerUp}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(block.block_id) } }}
                        className={`${desk.indexCard} ${styles.indexCard} ${cardAnim} ${styles.cardEnter} ${state} ${draggingId === block.block_id ? styles.dragging : ''}`}
                        style={{
                          left: pos.x, top: pos.y, width: CARD_W, height: CARD_H,
                          paddingTop: typo.paddingTop,
                          ['--rule' as string]: `${typo.rule}px`,
                          transform: `rotate(${CARD_TILTS[index % CARD_TILTS.length]}deg)`,
                        }}
                      >
                        <span className={styles.pushPin} aria-hidden />
                        <span className={styles.exhibitNo}>EXHIBIT {String.fromCharCode(65 + index)}</span>
                        <div className={styles.cardText}>
                          <p className={cardFont.className} style={{ fontSize: typo.fontSize, lineHeight: `${typo.rule}px`, fontWeight: inChain ? 600 : 500 }}>
                            {block.text}
                          </p>
                        </div>
                      </div>
                    )
                  })}

                  {/* SVG — crimson threads and numbered pins */}
                  <svg className={styles.threads} width={CW} height={CH}>
                    <defs>
                      <filter id="threadShadow" x="-10%" y="-10%" width="120%" height="120%">
                        <feDropShadow dx="0" dy="2" stdDeviation="1.2" floodColor="#000" floodOpacity="0.35" />
                      </filter>
                    </defs>
                    {chain.slice(0, -1).map((_, i) => {
                      const fi = blocks.findIndex(b => b.block_id === chain[i])
                      const ti = blocks.findIndex(b => b.block_id === chain[i + 1])
                      if (fi < 0 || ti < 0) return null
                      const fp = { x: (positions[fi]?.x ?? 0) + CARD_W / 2, y: positions[fi]?.y ?? 0 }
                      const tp = { x: (positions[ti]?.x ?? 0) + CARD_W / 2, y: positions[ti]?.y ?? 0 }
                      return (
                        <path
                          key={`${chain[i]}->${chain[i + 1]}`}
                          className={styles.threadPath}
                          d={bezierPath(fp.x, fp.y, tp.x, tp.y)}
                          stroke={threadColor}
                          strokeWidth={2.6}
                          fill="none"
                          strokeLinecap="round"
                          filter="url(#threadShadow)"
                        />
                      )
                    })}
                    {chain.map((blockId, i) => {
                      const bi = blocks.findIndex(b => b.block_id === blockId)
                      if (bi < 0) return null
                      const px = (positions[bi]?.x ?? 0) + CARD_W / 2
                      const py = positions[bi]?.y ?? 0
                      const pinColor = submitState === 'correct' ? '#2f6418' : '#a83232'
                      return (
                        <g key={`pin-${blockId}-${i}`} className={styles.pin}>
                          <circle cx={px} cy={py} r={13} fill="#faf6ed" stroke={pinColor} strokeWidth={2.2} />
                          <text x={px} y={py + 4.5} textAnchor="middle"
                            fontSize={12} fontWeight={700} fill={pinColor} fontFamily={FONT}>
                            {i + 1}
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                </>
              )
            })()}

          </div>

          {/* ── Submit bar ── */}
          <div className={styles.submitBar}>
            <span className={styles.counter}>
              {chain.length} / {blocks.length} CONNECTED
              {wrongCount > 0 && attemptsLeft > 0 && submitState !== 'correct' && (
                <span className={styles.attemptMsg} role="status">
                  Incorrect sequence. Attempts remaining: {attemptsLeft}/{MAX_ATTEMPTS}
                </span>
              )}
            </span>
            <div className={styles.submitGroup} data-tutorial="submit">
              <span className={`${styles.attemptBadge} ${attemptsLeft <= 1 ? styles.attemptBadgeLow : ''}`}
                aria-label={`Attempts remaining: ${attemptsLeft} of ${MAX_ATTEMPTS}`}>
                ATTEMPTS: {attemptsLeft}/{MAX_ATTEMPTS}
                <span className={styles.attemptPips} aria-hidden>
                  {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
                    <i key={i} className={i < attemptsLeft ? styles.pipOn : ''} />
                  ))}
                </span>
              </span>
            <button
              type="button"
              disabled={!allChained || submitState !== 'idle'}
              onClick={handleSubmit}
              className={`${styles.submitBtn} ${styles.submit} ${allChained && submitState === 'idle' ? styles.submitBtnReady : ''}
                ${submitState === 'correct' ? styles.submitCorrect : submitState === 'incorrect' ? styles.submitIncorrect : ''}`}
            >
              {submitState === 'submitting' ? 'CHECKING…' :
               submitState === 'correct'    ? '✓ EVIDENCE VERIFIED' :
               submitState === 'incorrect'  ? '✕ SEQUENCE DISPUTED' :
               <><FileText size={16} aria-hidden /> SUBMIT <ArrowRight size={18} aria-hidden /></>}
            </button>
            </div>
          </div>
        </div>
      </div>

      <LogicThreadTutorial open={tutorialOpen} onClose={() => setTutorialOpen(false)} />

      <LessonManual open={manualOpen} onClose={closeManual} lesson={lesson} />

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
