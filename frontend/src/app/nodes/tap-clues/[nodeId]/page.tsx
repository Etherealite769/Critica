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
import { notifyLexicalUpdated, notifyProgressionUpdated } from '@/lib/realtime-sync'
import CaseLoadingLobby from '@/components/shared/CaseLoadingLobby'
import NodeEvaluationReport, { type CaseResult } from '@/components/shared/NodeEvaluationReport'
import CaseLessonScreen from '@/components/shared/CaseLessonScreen'
import { playRightAnswerSound, playWrongSound, playVictorySound } from '@/lib/sound-effects'
import { MODULE_TITLES } from '@/lib/modules'
import CritRemark, { type Remark, type RemarkKind } from '@/components/logic-thread/CritRemark'
import CaseDebriefModal, { type DocketDebrief, type MissedCase } from '@/components/logic-thread/CaseDebriefModal'
import { SpotlightTutorial, hasSeenTutorial, type TutorialStep } from '@/components/logic-thread/LogicThreadTutorial'
import {
  ArrowRight, BookOpen, FileText, FolderOpen, HelpCircle, Lightbulb, LogOut, Paperclip, RotateCcw, Search, X,
} from 'lucide-react'
import { Montserrat } from 'next/font/google'
import desk from '@/components/dashboard/desk.module.css'
import styles from './page.module.css'

// Passage, clue and definition text: Montserrat, self-hosted by next/font
const bodyFont = Montserrat({ subsets: ['latin'], weight: ['500', '600'], display: 'swap' })


// ── Palette (identical to Logic Thread) ───────────
const C: Record<string, string> = {
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
  green:      '#22aa55',
  greenDark:  '#1a7a3e',
}

const FONT = "'Courier New', Courier, monospace"

// ── Shared style atoms ─────────────────────────────
const btnSm: React.CSSProperties = {
  padding: '7px 16px', background: 'transparent',
  border: `1px solid ${C.btnGoldBdr}`, borderRadius: 6,
  color: C.textMid, fontFamily: FONT, fontSize: 10,
  fontWeight: 700, cursor: 'pointer',
}

// ── Types ──────────────────────────────────────────
interface LockedWordMeta {
  word_id:             string
  word:                string
  position_index:      number
  target_clues_count?: number
  correct_clue_ids?:   string[]
  context_clues?:      string[]
  definition?:         string
  contextual_usage?:   string
  translation?:        string
}
interface TapNodeData {
  node_id:            string
  title:              string
  focus:              string
  difficulty:         number
  micro_lesson_text:  string
  reading_passage:    string
  deep_dive_required: boolean
  locked_words:       LockedWordMeta[]
}
interface DefinitionPanel {
  word_id:          string
  word:             string
  definition:       string
  contextual_usage: string
  translation:      string
}
type Phase = 'loading' | 'micro_lesson' | 'deep_dive' | 'task' | 'mastery' | 'error'

// Inspector Crit's spotlight walkthrough (first visit to tap_node_01, or the TUTORIAL button)
const CLUE_EXTRACTION_TUTORIAL_KEY = 'hasSeenClueExtractionTutorial'
const CLUE_EXTRACTION_TUTORIAL: TutorialStep[] = [
  {
    targets: ['clue-cards'],
    title: 'Arranging Evidence',
    text: 'Welcome to Clue Extraction, Cadet! The target-word card and every clue you pin are evidence cards — drag them anywhere on the board. The threads follow.',
  },
  {
    targets: ['passage'],
    title: 'Tapping Clues',
    text: 'The gold-underlined word is locked. Tap the surrounding words that prove what it means — each correct clue is pinned to your board. Tap a pinned clue again to remove it.',
  },
  {
    targets: ['sidebar'],
    title: 'Hints',
    text: "Stuck? Hover over 'HINT' on the left and I'll examine the evidence trail with you.",
  },
  {
    targets: ['submit'],
    title: 'Submission & Tries',
    text: 'You have 3 wrong taps per case. Unlock every word, then submit to close the case!',
  },
]

// Three tries per case; wrong taps 1-2 get encouragement only, the third reveals the clues and moves on
const MAX_ATTEMPTS = 3
const REVEAL_MS = 4500
const RETRY_REMARKS = [
  'Close, Cadet. Re-examine the text and give it another go.',
  'Not that one. Which words would only make sense if you knew the meaning?',
  'Keep digging — look for a synonym, an example or a contrast near the locked word.',
  'Steady, Cadet. Read the whole sentence around the gold word again.',
]
const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)]
const HINT_FALLBACK = 'Look for words near the locked word that hint at its meaning.'
const THINKING_TEXT = 'Inspector Crit is examining the evidence trail'
const SOCRATIC_FALLBACK = 'Focus on words in the sentence that provide direct context or cause-and-effect signals.'

// Cases failed after three tries survive a reload, so a resumed docket can't close with an unsolved case
const SKIPPED_KEY = (startId: string) => `critica_skipped_tap_clues_${startId}`
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

/** Fields read from the mastery endpoints' responses. */
interface MasteryResponse {
  status?: string; next_node?: string | null; streak?: number; streak_new_day?: boolean
  xp_awarded?: number; total_xp?: number; level?: number; level_title?: string; level_up?: boolean; progress_pct?: number
}

// ── Evidence board geometry ──────────────────────
// Room kept free beside the dossier: the retracted side tabs only show their icons
const SIDE_GUTTER = 64
const BOARD_W = 1100, BOARD_H = 460
const TARGET_CARD = '__target'
const TARGET_W = 380, TARGET_H = 196
const TARGET_DEFAULT = { x: 680, y: 20 }
const CLUE_W = 170, CLUE_H = 62
/** Default spot for the i-th pinned clue: two columns under the target card. */
const clueDefault = (i: number) => ({ x: 680 + (i % 2) * 205, y: 244 + Math.floor(i / 2) * 72 })

function bezierPath(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  const dx = x2 - x1, dy = y2 - y1
  const L  = Math.sqrt(dx * dx + dy * dy) || 1
  return `M${x1},${y1} Q${mx + (-dy / L) * 40},${my + (dx / L) * 40} ${x2},${y2}`
}

// ── Sub-screens ────────────────────────────────────
function BriefingGenerationScreen({ title, onCancel }: { title?: string; onCancel?: () => void }) {
  return <CaseLoadingLobby moduleKey="tap_clues" title={title} onCancel={onCancel} />
}

function ErrorScreen({ msg, onBack }: { msg: string; onBack: () => void }) {
  return (
    <div className={desk.desk} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, gap: 16 }}>
      <p style={{ color: '#ff8888', fontSize: 14 }}>{msg}</p>
      <button onClick={onBack} style={btnSm}>← DASHBOARD</button>
    </div>
  )
}

function LessonScreen({ node, onContinue, onDashboard }: { node: TapNodeData; onContinue: () => void; onDashboard?: () => void }) {
  return (
    <CaseLessonScreen
      moduleKey="tap_clues"
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

function DeepDiveScreen({ node, onContinue, onDashboard }: { node: TapNodeData; onContinue: () => void; onDashboard?: () => void }) {
  return (
    <CaseLessonScreen
      moduleKey="tap_clues"
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

function MasteryScreen({ node, data, onDashboard, onNext, onReplay }: {
  node: TapNodeData; data: any; onDashboard: () => void; onNext: () => void; onReplay?: () => void
}) {
  return (
    <div className={desk.desk} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
      <NodeEvaluationReport
        moduleKey="tap_clues"
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

// ── Helper ─────────────────────────────────────────
function tokenizePassage(
  passage:     string,
  lockedWords: LockedWordMeta[],
): { text: string; isLocked: boolean; word_id?: string; idx: number }[] {
  const tokens: { text: string; isLocked: boolean; word_id?: string; idx: number }[] = []
  const words = passage.split(/(\s+)/)
  let wordIdx = 0
  words.forEach(chunk => {
    if (/^\s+$/.test(chunk)) { tokens.push({ text: chunk, isLocked: false, idx: -1 }); return }
    const clean  = chunk.replace(/[^a-zA-Z']/g, '').toLowerCase()
    const locked = lockedWords.find(lw => lw.position_index === wordIdx || lw.word.toLowerCase() === clean)
    tokens.push({ text: chunk, isLocked: !!locked, word_id: locked?.word_id, idx: wordIdx })
    wordIdx++
  })
  return tokens
}

/** A tapped word matches a clue: exact, a word of a multi-word clue, or a stem (4+ letters, so "a" never matches "detail"). */
function clueMatches(clue: string, tapped: string): boolean {
  const c = clue.toLowerCase().trim(), w = tapped.toLowerCase().trim()
  if (!c || !w) return false
  if (c === w || c.split(/\s+/).includes(w)) return true
  return Math.min(c.length, w.length) >= 4 && (c.includes(w) || w.includes(c))
}

// ── Main component ─────────────────────────────────
export default function TapCluesPage() {
  const router = useRouter()
  const params = useParams()
  const nodeId = params.nodeId as string

  const [phase,       setPhase]       = useState<Phase>('loading')
  const [tapNode,     setTapNode]     = useState<TapNodeData | null>(null)
  const [errorMsg,    setErrorMsg]    = useState('')

  const [activeWordId,  setActiveWordId]  = useState<string | null>(null)
  const [foundClues,    setFoundClues]    = useState<Record<string, string[]>>({})
  const [unlockedWords, setUnlockedWords] = useState<string[]>([])
  const [defPanel,      setDefPanel]      = useState<DefinitionPanel | null>(null)
  const [pulseClue,     setPulseClue]     = useState<string | null>(null)
  const [masteryData,   setMasteryData]   = useState<any>(null)
  const [submitting,    setSubmitting]    = useState(false)
  const [wrongs,        setWrongs]        = useState(0)

  const [sessionQueue,   setSessionQueue]   = useState<string[]>([])
  const [questionIndex,  setQuestionIndex]  = useState(0)
  const [sessionStartId, setSessionStartId] = useState<string | null>(null)
  const [savedNextNode,  setSavedNextNode]  = useState<string | null>(null)
  const [savedStreak,    setSavedStreak]    = useState<number | null>(null)

  // session accuracy evaluation state
  const [sessionResults, setSessionResults] = useState<CaseResult[]>([])
  const [sessionStartedAt, setSessionStartedAt] = useState(() => Date.now())

  const [tutorialOpen, setTutorialOpen] = useState(false)

  // Hints and feedback are spoken by Inspector Crit's lower-left bubble
  const [hintOverlay,     setHintOverlay]     = useState(false)   // a hint was used on this case
  const [socraticLoading, setSocraticLoading] = useState(false)
  const [remark,          setRemark]          = useState<Remark | null>(null)
  const say = useCallback((text: string, kind: RemarkKind = 'remark') => setRemark({ id: Date.now(), text, kind }), [])

  // Attempts: a wrong tap stays "disputed" until the next tap; the third reveals the clues (word id → clues)
  const [disputed,  setDisputed]  = useState(false)
  const [revealing, setRevealing] = useState<Record<string, string[]> | null>(null)

  // End-of-docket debrief and notes on cases failed along the way
  const [debrief,     setDebrief]     = useState<DocketDebrief | null>(null)
  const [missedCases, setMissedCases] = useState<MissedCase[]>([])

  // Evidence board: dossier scaled to the viewport, draggable target / clue cards
  const [fitScale,   setFitScale]   = useState(1)
  const fitRef = useRef<HTMLDivElement>(null)
  const [cardPos,    setCardPos]    = useState<Record<string, { x: number; y: number }>>({})
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const dragRef = useRef<{ id: string; startX: number; startY: number; originX: number; originY: number; w: number; h: number; moved: boolean } | null>(null)


  const [sessionId,        setSessionId]        = useState<string | null>(null)
  const [sessionExercises, setSessionExercises] = useState<any[]>([])

  const loadQuestion = useCallback(async (targetIndex: number, queue: string[]) => {
    setPhase('loading')
    try {
      if (sessionExercises.length > targetIndex) {
        const ex = sessionExercises[targetIndex]
        setTapNode(prev => prev ? ({
          ...prev,
          title: ex.topic_title || prev.title,
          reading_passage: ex.reading_passage || prev.reading_passage,
          locked_words: ex.locked_words || prev.locked_words,
        }) : ex)
        setActiveWordId(null)
        setUnlockedWords([])
        setFoundClues({})
        setDefPanel(null)
        setWrongs(0)
        setDisputed(false); setRevealing(null); setCardPos({})
        setHintOverlay(false)
        setPhase('task')
        return
      }

      const targetNodeId = queue[targetIndex] || nodeId
      const d = await apiFetch(`/nodes/tap-clues/${targetNodeId}/`)
      setTapNode(d)
      setActiveWordId(null)
      setUnlockedWords([])
      setFoundClues({})
      setDefPanel(null)
      setWrongs(0)
      setDisputed(false); setRevealing(null); setCardPos({})
      setHintOverlay(false)
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
      const sessionData = await fetchNodeSession('tap_clues', start, forceFresh)
      setSessionId(sessionData.session_id)
      setSessionExercises(sessionData.exercises || [])

      // A fresh start (Retry / Fresh Case) always opens a new full docket at case 1
      const resumeIdx = forceFresh ? 0 : Math.min(
        sessionData.current_index ?? 0,
        Math.max(0, (sessionData.exercises?.length ?? 1) - 1)
      )
      const activeEx = sessionData.exercises?.[resumeIdx] || sessionData.exercises?.[0]

      setTapNode({
        node_id: sessionData.node_id,
        title: activeEx?.topic_title || sessionData.title,
        focus: sessionData.focus,
        difficulty: sessionData.difficulty,
        micro_lesson_text: sessionData.micro_lesson_text,
        reading_passage: activeEx?.reading_passage || sessionData.reading_passage || '',
        deep_dive_required: sessionData.deep_dive_required,
        locked_words: activeEx?.locked_words || [],
      })
      const totalQ = sessionData.exercises?.length || 5
      const queue = Array.from({ length: totalQ }, (_, i) => `q${i + 1}`)
      setSessionQueue(queue)
      setQuestionIndex(resumeIdx)
      setUnlockedWords([])
      setActiveWordId(null)
      setFoundClues({})
      setDefPanel(null)
      setWrongs(0)
      setDisputed(false); setRevealing(null); setCardPos({})
      setHintOverlay(false)
      if (forceFresh || resumeIdx === 0) {
        setSessionResults([])
        setMissedCases([])
        writeSkipped(start, [])
        setSessionStartedAt(Date.now())
      }

      saveSession('tap_clues', start, {
        sessionQueue: queue,
        questionIndex: resumeIdx,
      })

      setPhase((resumeIdx > 0 || forceFresh) ? 'task' : 'micro_lesson')
    } catch {
      // Fallback to legacy static node queue
      if (forceFresh) clearSession('tap_clues', start)
      const saved = forceFresh ? null : loadSession('tap_clues', start)
      if (saved && saved.sessionQueue.length === 5) {
        setSessionQueue(saved.sessionQueue); setQuestionIndex(saved.questionIndex)
        if (saved.next_node) setSavedNextNode(saved.next_node)
        if (saved.streak !== undefined) setSavedStreak(saved.streak)
        const activeId = saved.sessionQueue[saved.questionIndex] ?? start
        apiFetch(`/nodes/tap-clues/${activeId}/`)
          .then((d: TapNodeData) => { setTapNode(d); setPhase('task') })
          .catch((e: any) => {
            if (e?.status === 401)              { router.push('/auth');      return }
            if (e?.error === 'Node is locked.') { router.push('/dashboard'); return }
            setErrorMsg(e?.error ?? 'Failed.'); setPhase('error')
          })
      } else {
        apiFetch(`/nodes/tap-clues/${start}/`)
          .then((d: TapNodeData) => {
            setTapNode(d); setPhase(forceFresh ? 'task' : 'micro_lesson')
            apiFetch('/progression/dashboard/')
              .then((prog: any) => {
                const unlocked: string[] = prog.unlocked_nodes ?? []
                const queue = buildSessionQueue('tap_clues', start, unlocked)
                setSessionQueue(queue); setQuestionIndex(0)
                saveSession('tap_clues', start, { sessionQueue: queue, questionIndex: 0 })
              })
              .catch(() => { setSessionQueue([start]); setQuestionIndex(0) })
          })
          .catch((e: any) => {
            if (e?.status === 401)              { router.push('/auth');      return }
            if (e?.error === 'Node is locked.') { router.push('/dashboard'); return }
            setErrorMsg(e?.error ?? 'Failed.'); setPhase('error')
          })
      }
    }
  }, [nodeId, router])

  useEffect(() => {
    startSession(false)
  }, [startSession])

  // Auto-select first locked word if none active
  useEffect(() => {
    if (tapNode && tapNode.locked_words && tapNode.locked_words.length > 0) {
      if (!activeWordId) {
        const firstUnsolved = tapNode.locked_words.find(lw => !unlockedWords.includes(lw.word_id)) || tapNode.locked_words[0]
        if (firstUnsolved) setActiveWordId(firstUnsolved.word_id)
      }
    }
  }, [tapNode, unlockedWords, activeWordId])

  useEffect(() => {
    if (phase !== 'task' || nodeId !== 'tap_node_01') return
    // First visit to Node 01: Inspector Crit walks the cadet through the board
    if (hasSeenTutorial(CLUE_EXTRACTION_TUTORIAL_KEY)) return
    setTutorialOpen(true)
  }, [phase, nodeId])

  /** Explanation for a wrong clue (used in the third-strike reveal). Also logs the attempt server-side. */
  const callFeedback = useCallback(async (word_id: string, clue_word: string, inactivity: boolean): Promise<string> => {
    const fallback = 'That word is not a valid context clue. Look for synonyms or definitions nearby.'
    try {
      const res = sessionId && sessionExercises.length > questionIndex
        ? await apiFetch(`/ai/session/${sessionId}/feedback/${questionIndex}/`, {
            method: 'POST',
            body: JSON.stringify({ word_id, clue_word, tier: 1 }),
          })
        : await apiFetch(`/nodes/tap-clues/${tapNode?.node_id ?? nodeId}/feedback/`, {
            method: 'POST',
            body: JSON.stringify({ word_id, clue_word, inactivity_seconds: inactivity ? 60 : 0 }),
          })
      return res.explanation || fallback
    } catch {
      return fallback
    }
  }, [nodeId, tapNode, sessionId, sessionExercises, questionIndex])

  /** HINT: Crit thinks, then speaks the scaffold hint. */
  const fetchHint = useCallback(async (tier = 1) => {
    setHintOverlay(true)
    say(THINKING_TEXT, 'thinking')
    let text = HINT_FALLBACK
    try {
      const res = sessionId && sessionExercises.length > questionIndex
        ? await apiFetch(`/ai/session/${sessionId}/feedback/${questionIndex}/`, {
            method: 'POST',
            body: JSON.stringify({ word_id: activeWordId ?? '', clue_word: '', tier }),
          })
        : await apiFetch(`/nodes/tap-clues/${tapNode?.node_id ?? nodeId}/feedback/`, {
            method: 'POST',
            body: JSON.stringify({ word_id: activeWordId ?? '', clue_word: '', inactivity_seconds: 61 }),
          })
      text = res.hint || res.explanation || HINT_FALLBACK
    } catch { /* keep the fallback hint */ }
    say(text, 'hint')
  }, [nodeId, activeWordId, tapNode, sessionId, sessionExercises, questionIndex, say])

  /** Dig deeper: a live Socratic clue from the AI. */
  const handleAskSocraticAdvice = useCallback(async () => {
    if (!sessionId) return
    setSocraticLoading(true)
    say(THINKING_TEXT, 'thinking')
    try {
      const res = await fetchLiveSocraticHint(
        sessionId,
        questionIndex,
        { word_id: activeWordId, found_clues: activeWordId ? (foundClues[activeWordId] ?? []) : [] },
        wrongs + 1,
      )
      say(res.socratic_hint || SOCRATIC_FALLBACK, 'hint')
    } catch {
      say(SOCRATIC_FALLBACK, 'hint')
    } finally {
      setSocraticLoading(false)
    }
  }, [sessionId, questionIndex, activeWordId, foundClues, wrongs, say])

  const logWordToLexical = useCallback(async (word: string, definition: string, contextual_usage: string, translation: string) => {
    const activeNodeId = tapNode?.node_id ?? nodeId
    try {
      await apiFetch('/lexical/log/', { method: 'POST', body: JSON.stringify({ word_data: { word, definition, contextual_usage, translation }, task_id: activeNodeId }) })
      notifyLexicalUpdated({
        action: 'word_logged',
        wordData: { word, definition, contextual_usage, translation },
      })
    } catch { console.warn('Lexical log failed silently') }
  }, [nodeId, tapNode])

  const handleRemoveClue = (clueToRemove: string) => {
    if (!activeWordId) return
    const current = foundClues[activeWordId] ?? []
    const updated = current.filter(c => c.toLowerCase() !== clueToRemove.toLowerCase())
    setFoundClues(prev => ({ ...prev, [activeWordId]: updated }))
  }

  const handleWordTap = async (word: string, token: { text: string; isLocked: boolean; word_id?: string; idx: number }) => {
    if (!tapNode || revealing) return
    setDisputed(false)

    // 1. Tapping a locked word directly selects it
    if (token.isLocked && token.word_id) {
      setActiveWordId(token.word_id)
      return
    }

    // 2. Resolve target word ID (use active or first unsolved)
    const targetWordId = activeWordId || tapNode.locked_words.find(lw => !unlockedWords.includes(lw.word_id))?.word_id || tapNode.locked_words[0]?.word_id
    if (!targetWordId) return
    if (!activeWordId) setActiveWordId(targetWordId)

    if (!token.isLocked) {
      const cleanWord = word.replace(/[^a-zA-Z']/g, '').toLowerCase().trim()
      if (!cleanWord) return
      const currentFound = foundClues[targetWordId] ?? []

      // If clue already found, tapping it removes it
      if (currentFound.some(c => clueMatches(c, cleanWord))) {
        handleRemoveClue(cleanWord)
        return
      }

      // AI Dynamic Exercise Clue Check
      if (sessionId && sessionExercises.length > questionIndex) {
        const currentEx = sessionExercises[questionIndex]
        const targetLockedWord = currentEx.locked_words?.find((lw: any) => lw.word_id === targetWordId)
        const rawClues = targetLockedWord?.correct_clue_ids || targetLockedWord?.context_clues || []
        const correctClues = rawClues.map((c: string) => c.toLowerCase().trim())
        const isClueCorrect = correctClues.some((c: string) => clueMatches(c, cleanWord))

        if (isClueCorrect) {
          playRightAnswerSound()
          setPulseClue(cleanWord)
          setTimeout(() => setPulseClue(null), 600)
          apiFetch(`/ai/session/${sessionId}/log-attempt/`, {
            method: 'POST',
            body: JSON.stringify({ is_correct: true, word_id: targetWordId, clue_word: cleanWord }),
          }).catch(() => {})
          const updatedFound = Array.from(new Set([...currentFound, cleanWord]))
          const requiredCount = targetLockedWord?.target_clues_count || correctClues.length || 2
          const allFound = updatedFound.length >= requiredCount || (correctClues.length > 0 && correctClues.every((c: string) => updatedFound.some((f: string) => clueMatches(c, f))))

          setFoundClues(prev => ({ ...prev, [targetWordId]: updatedFound }))

          if (allFound) {
            setUnlockedWords(prev => Array.from(new Set([...prev, targetWordId])))
            const wordToLog = targetLockedWord?.word || cleanWord
            const defToLog = targetLockedWord?.definition || 'Target academic vocabulary unlocked.'
            const usageToLog = targetLockedWord?.contextual_usage || ''
            const transToLog = targetLockedWord?.translation || ''
            setDefPanel({
              word_id: targetWordId,
              word: wordToLog,
              definition: defToLog,
              contextual_usage: usageToLog,
              translation: transToLog,
            })
            await logWordToLexical(wordToLog, defToLog, usageToLog, transToLog)
          }
        } else {
          await handleWrongClue(targetWordId, cleanWord)
        }
        return
      }

      // Legacy / Static Node Clue Check
      try {
        const res = await apiFetch(`/nodes/tap-clues/${tapNode.node_id}/evaluate-clue/`, {
          method: 'POST',
          body: JSON.stringify({ word_id: targetWordId, clue_word: cleanWord, found_clues: currentFound }),
        })
        if (res.result === 'correct') {
          playRightAnswerSound()
          setPulseClue(cleanWord)
          setTimeout(() => setPulseClue(null), 600)
          const newFound = res.found_clues || [...currentFound, cleanWord]
          setFoundClues(prev => ({ ...prev, [targetWordId]: newFound }))

          if (res.all_clues_found) {
            setUnlockedWords(prev => Array.from(new Set([...prev, targetWordId])))
            setDefPanel({ word_id: targetWordId, word: res.word, definition: res.definition, contextual_usage: res.contextual_usage, translation: res.translation })
            await logWordToLexical(res.word, res.definition, res.contextual_usage, res.translation)
          }
        } else {
          await handleWrongClue(targetWordId, cleanWord)
        }
      } catch {
        playWrongSound()
        setErrorMsg('Evaluation failed.')
      }
    }
  }

  const handleSubmitMastery = async () => {
    if (!tapNode || submitting) return
    setSubmitting(true)

    // 1. AI Dynamic Session Submission
    if (sessionId && sessionExercises.length > questionIndex) {
      const currentEx = sessionExercises[questionIndex]
      const totalWords = currentEx.locked_words?.length || 1
      const isMastered = unlockedWords.length >= totalWords

      apiFetch(`/ai/session/${sessionId}/evaluate/${questionIndex}/`, {
        method: 'POST',
        body: JSON.stringify({ unlocked_word_ids: unlockedWords, node_id: nodeId, module: 'tap_clues' }),
      }).catch(() => {})

      if (isMastered) {
        const currentCaseRes: CaseResult = {
          caseNumber: questionIndex + 1,
          correct: true,
          firstTry: wrongs === 0,
          hintsUsed: hintOverlay ? 1 : 0,
          attempts: wrongs + 1,
        }
        const updatedCases = [...sessionResults.filter(r => r.caseNumber !== questionIndex + 1), currentCaseRes]
        setSessionResults(updatedCases)

        // Log all locked words of current exercise to Lexical Deck
        if (currentEx?.locked_words) {
          for (const lw of currentEx.locked_words) {
            if (lw.word) {
              logWordToLexical(lw.word, lw.definition || '', lw.contextual_usage || '', lw.translation || '')
            }
          }
        }

        const nextIdx = questionIndex + 1
        if (sessionId) {
          updateSessionProgress(sessionId, nextIdx).catch(() => {})
        }
        if (sessionStartId) {
          saveSession('tap_clues', sessionStartId, {
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
          try {
            const unsolved = unsolvedCases(updatedCases)   // read before the saved misses are cleared
            const cleared = unsolved === 0
            let finalRes: MasteryResponse = {}
            if (cleared) {
              playVictorySound()
              finalRes = await apiFetch(`/ai/session/${sessionId}/mastery/`, { method: 'POST' })
            }
            if (sessionStartId) clearSession('tap_clues', sessionStartId)
            writeSkipped(sessionStartId, [])
            const totalCases = sessionExercises.length || sessionQueue.length || 5
            const correctCases = updatedCases.filter(r => r.correct).length
            const firstTryCases = updatedCases.filter(r => r.firstTry).length
            const totalHints = updatedCases.reduce((acc, r) => acc + (r.hintsUsed || 0), 0)
            const accuracy = Math.round((firstTryCases / Math.max(1, totalCases)) * 100)
            const timeTakenSeconds = Math.max(1, Math.round((Date.now() - sessionStartedAt) / 1000))

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
            if (cleared) {
              notifyProgressionUpdated({
                action: 'node_mastered',
                streak: finalRes.streak,
                streak_new_day: finalRes.streak_new_day,
                xp_awarded: finalRes.xp_awarded,
                total_xp: finalRes.total_xp,
                level: finalRes.level,
                level_title: finalRes.level_title,
                level_up: finalRes.level_up,
                progress_pct: finalRes.progress_pct,
              })
            }
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
        say('Some words are still locked. Discover all clue words first.', 'feedback')
        setSubmitting(false)
        return
      }
    }

    // 2. Legacy Submission
    try {
      const res = await apiFetch(`/nodes/tap-clues/${tapNode.node_id}/mastery/`, {
        method: 'POST',
        body: JSON.stringify({ unlocked_word_ids: unlockedWords, save_progression: false }),
      })
      if (res.status === 'mastered') {
        const currentCaseRes: CaseResult = {
          caseNumber: questionIndex + 1,
          correct: true,
          firstTry: wrongs === 0,
          hintsUsed: hintOverlay ? 1 : 0,
          attempts: wrongs + 1,
        }
        const updatedCases = [...sessionResults.filter(r => r.caseNumber !== questionIndex + 1), currentCaseRes]
        setSessionResults(updatedCases)

        if (tapNode?.locked_words) {
          for (const lw of tapNode.locked_words) {
            if (lw.word) {
              logWordToLexical(lw.word, lw.definition || '', lw.contextual_usage || '', lw.translation || '')
            }
          }
        }
        const nextIdx = questionIndex + 1
        if (nextIdx < sessionQueue.length) {
          playRightAnswerSound()
          if (sessionStartId) saveSession('tap_clues', sessionStartId, {
            sessionQueue, questionIndex: nextIdx,
            next_node: savedNextNode || undefined,
            streak: savedStreak !== null ? savedStreak : undefined,
          })
          setQuestionIndex(nextIdx); loadQuestion(nextIdx, sessionQueue)
        } else {
          const unsolved = unsolvedCases(updatedCases)   // read before the saved misses are cleared
          const cleared = unsolved === 0
          if (cleared) playVictorySound()
          let finalRes: MasteryResponse = res
          if (sessionStartId && cleared) {
            finalRes = await apiFetch(`/nodes/tap-clues/${sessionStartId}/mastery/`,
              { method: 'POST', body: JSON.stringify({ commit_only: true }) })
          }
          if (sessionStartId) clearSession('tap_clues', sessionStartId)
          writeSkipped(sessionStartId, [])
          const totalCases = sessionQueue.length || 5
          const correctCases = updatedCases.filter(r => r.correct).length
          const firstTryCases = updatedCases.filter(r => r.firstTry).length
          const totalHints = updatedCases.reduce((acc, r) => acc + (r.hintsUsed || 0), 0)
          const accuracy = Math.round((firstTryCases / Math.max(1, totalCases)) * 100)
          const timeTakenSeconds = Math.max(1, Math.round((Date.now() - sessionStartedAt) / 1000))

          setMasteryData({
            next_node: cleared ? (savedNextNode || finalRes.next_node) : null,
            streak: savedStreak !== null ? savedStreak : (finalRes.streak ?? null),
            accuracy,
            totalCases,
            correctCases,
            hintsUsed: totalHints,
            timeTakenSeconds,
            caseResults: updatedCases,
          })
          if (cleared) {
            notifyProgressionUpdated({
              action: 'node_mastered',
              streak: finalRes.streak,
              streak_new_day: finalRes.streak_new_day,
              xp_awarded: finalRes.xp_awarded,
              total_xp: finalRes.total_xp,
              level: finalRes.level,
              level_title: finalRes.level_title,
              level_up: finalRes.level_up,
              progress_pct: finalRes.progress_pct,
            })
          }
          setDebrief({
            verdict: cleared ? 'perfect' : 'partial',
            solved: totalCases - unsolved,
            total: totalCases,
            xpAwarded: cleared && typeof finalRes.xp_awarded === 'number' ? finalRes.xp_awarded : null,
            nextNode: cleared ? (savedNextNode || finalRes.next_node || null) : null,
            missed: missedCases,
          })
        }
      } else {
        playWrongSound()
        say('Some words are still locked. Discover all clue words first.', 'feedback')
      }
    } catch (e: any) {
      playWrongSound()
      say(e?.status === 'incomplete' ? 'Some words are still locked.' : 'Submission failed.', 'feedback')
    } finally { setSubmitting(false) }
  }

  // ── Case outcome helpers ───────────────────────
  const totalCases = sessionId && sessionExercises.length > 0
    ? sessionExercises.length
    : (sessionQueue.length || 1)

  /** Cases left unsolved this docket (this run's misses plus misses saved before a reload). */
  const unsolvedCases = (updated: CaseResult[]) =>
    new Set([...updated.filter(r => !r.correct).map(r => r.caseNumber), ...readSkipped(sessionStartId)]).size

  /** Correct clues for every word still locked on this case (word id → clues). */
  const cluesToReveal = (): Record<string, string[]> => {
    const source: LockedWordMeta[] = (sessionId && sessionExercises.length > questionIndex
      ? sessionExercises[questionIndex].locked_words
      : tapNode?.locked_words) ?? []
    const out: Record<string, string[]> = {}
    for (const lw of source) {
      if (unlockedWords.includes(lw.word_id)) continue
      out[lw.word_id] = (lw.correct_clue_ids || lw.context_clues || []).map(c => c.toLowerCase().trim()).filter(Boolean)
    }
    return out
  }

  /** Third miss: file the case as unsolved and move on (or close the docket without mastery). */
  const failCase = (explanation: string, notes: MissedCase, decidedAt: number) => {
    const caseNumber = questionIndex + 1
    const res: CaseResult = { caseNumber, correct: false, firstTry: false, hintsUsed: hintOverlay ? 1 : 0, attempts: MAX_ATTEMPTS }
    const updated = [...sessionResults.filter(r => r.caseNumber !== caseNumber), res]
    setSessionResults(updated)
    writeSkipped(sessionStartId, [...readSkipped(sessionStartId), caseNumber])
    const missed = [...missedCases.filter(m => m.caseNumber !== caseNumber), notes].sort((a, b) => a.caseNumber - b.caseNumber)

    const nextIdx = questionIndex + 1
    if (nextIdx < totalCases) {
      if (sessionId) updateSessionProgress(sessionId, nextIdx).catch(() => {})
      if (sessionStartId) {
        saveSession('tap_clues', sessionStartId, {
          sessionQueue, questionIndex: nextIdx,
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
    if (sessionStartId) clearSession('tap_clues', sessionStartId)
    writeSkipped(sessionStartId, [])
    setMasteryData({
      next_node: null,
      streak: savedStreak,
      accuracy: Math.round((updated.filter(r => r.firstTry).length / Math.max(1, totalCases)) * 100),
      totalCases,
      correctCases: updated.filter(r => r.correct).length,
      hintsUsed: updated.reduce((acc, r) => acc + (r.hintsUsed || 0), 0),
      timeTakenSeconds: Math.max(1, Math.round((decidedAt - sessionStartedAt) / 1000)),
      caseResults: updated,
    })
    setDebrief({ verdict: 'partial', solved: Math.max(0, totalCases - unsolved), total: totalCases, xpAwarded: null, nextNode: null, missed })
  }

  /** Wrong clue: taps 1-2 get encouragement only; the third reveals the clues, explains, and advances. */
  const handleWrongClue = async (wordId: string, clue: string) => {
    playWrongSound()
    setDisputed(true)
    const nextWrongs = wrongs + 1
    setWrongs(nextWrongs)

    if (nextWrongs < MAX_ATTEMPTS) {
      if (sessionId) {
        apiFetch(`/ai/session/${sessionId}/log-attempt/`, {
          method: 'POST',
          body: JSON.stringify({ is_correct: false, word_id: wordId, clue_word: clue }),
        }).catch(() => {})
      }
      say(pick(RETRY_REMARKS))
      return
    }

    // Third strike: highlight the correct clues, explain, then move on
    const reveal = cluesToReveal()
    setRevealing(reveal)
    const why = await callFeedback(wordId, clue, false)
    const wordOf = (id: string) => tapNode?.locked_words.find(lw => lw.word_id === id)?.word ?? 'the locked word'
    const lines = Object.entries(reveal).filter(([, c]) => c.length > 0)
      .map(([id, c]) => `for “${wordOf(id)}”: ${c.map(x => `“${x}”`).join(', ')}`)
    const cluesLine = lines.length ? `The context clues were ${lines.join('; ')}.` : 'The context clues stay sealed in this file.'
    const explanation = `Three strikes, Cadet — this case is filed as unverified. ${cluesLine}\n\n${why}`
    const caseNumber = questionIndex + 1
    const notes: MissedCase = {
      caseNumber, title: tapNode?.title ?? `Case ${caseNumber}`,
      notes: [cluesLine, why], correctSlots: null, total: tapNode?.locked_words.length ?? 1,
    }
    setMissedCases(prev => [...prev.filter(m => m.caseNumber !== caseNumber), notes])
    say(explanation, 'explain')
    // eslint-disable-next-line react-hooks/purity -- runs from a word tap handler, never during render
    const decidedAt = Date.now()
    setTimeout(() => failCase(explanation, notes, decidedAt), REVEAL_MS)
  }

  // ── Card dragging (pointer events: mouse, pen and touch) ──
  const handleCardPointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string, pos: { x: number; y: number }, w: number, h: number) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return   // buttons keep their clicks
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, originX: pos.x, originY: pos.y, w, h, moved: false }
  }

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    // Pointer deltas are screen pixels; the dossier is scaled to fit, so convert to board pixels
    const dx = (e.clientX - drag.startX) / fitScale
    const dy = (e.clientY - drag.startY) / fitScale
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < 5) return
      drag.moved = true
      setDraggingId(drag.id)
    }
    // Keep the whole card inside the evidence board (inside its 1px border)
    const x = Math.min(Math.max(0, drag.originX + dx), BOARD_W - 2 - drag.w)
    const y = Math.min(Math.max(0, drag.originY + dy), BOARD_H - 2 - drag.h)
    setCardPos(prev => ({ ...prev, [drag.id]: { x, y } }))
  }

  const handleCardPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    dragRef.current = null
    setDraggingId(null)
  }

  // ── Fit the dossier inside the 100vh viewport ──
  useEffect(() => {
    if (phase !== 'task') return
    const el = fitRef.current
    if (!el) return
    const fit = () => {
      const maxW = Math.min(window.innerWidth * 0.92, window.innerWidth - 2 * SIDE_GUTTER)
      const s = Math.min(1, maxW / el.offsetWidth, (window.innerHeight - 28) / el.offsetHeight)
      setFitScale(s > 0 ? s : 1)
    }
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    window.addEventListener('resize', fit)
    return () => { ro.disconnect(); window.removeEventListener('resize', fit) }
  }, [phase])

  // ── Debrief actions ────────────────────────────
  /** RETRY CASE / Fresh Case: wipe the docket and load a brand-new 5-case set. */
  const handleRetryDocket = () => {
    setDebrief(null); setMissedCases([]); setRemark(null)
    startSession(true)
  }

  /** NEXT DOCKET: on to the unlocked node, or the case report when nothing was unlocked. */
  const handleNextDocket = () => {
    const next = debrief?.nextNode
    setDebrief(null)
    if (next) router.push(`/nodes/tap-clues/${next}`)
    else setPhase('mastery')
  }

  const handleViewReport = () => { setDebrief(null); setPhase('mastery') }

  // ── Phase guards ───────────────────────────────
  if (phase === 'loading')      return <BriefingGenerationScreen title={tapNode?.title} onCancel={() => router.push('/dashboard')} />
  if (phase === 'error')        return <ErrorScreen msg={errorMsg} onBack={() => router.push('/dashboard')} />
  if (phase === 'micro_lesson') return (
    <LessonScreen
      node={tapNode!}
      onContinue={() => setPhase(tapNode?.deep_dive_required ? 'deep_dive' : 'task')}
      onDashboard={() => router.push('/dashboard')}
    />
  )
  if (phase === 'deep_dive')    return (
    <DeepDiveScreen
      node={tapNode!}
      onContinue={() => setPhase('task')}
      onDashboard={() => router.push('/dashboard')}
    />
  )
  if (phase === 'mastery')      return (
    <MasteryScreen node={tapNode!} data={masteryData}
      onDashboard={() => router.push('/dashboard')}
      onNext={() => masteryData?.next_node && router.push(`/nodes/tap-clues/${masteryData.next_node}`)}
      onReplay={() => startSession(true)}
    />
  )

  // ── TASK PHASE ─────────────────────────────────
  const tokens         = tokenizePassage(tapNode!.reading_passage, tapNode!.locked_words)
  const allUnlocked    = unlockedWords.length === tapNode!.locked_words.length
  const activeWordMeta = tapNode!.locked_words.find(lw => lw.word_id === activeWordId)
  const activeClues    = activeWordId ? (foundClues[activeWordId] ?? []) : []
  const requiredCluesCount = activeWordMeta?.target_clues_count
    || activeWordMeta?.correct_clue_ids?.length
    || activeWordMeta?.context_clues?.length
    || 2
  const level          = tapNode!.difficulty ?? nodeDifficulty(nodeId)
  const attemptsLeft   = Math.max(0, MAX_ATTEMPTS - wrongs)   // wrongs resets to 0 on every new case
  const activeUnlocked = activeWordMeta ? unlockedWords.includes(activeWordMeta.word_id) : false
  const revealedWords  = revealing ? Object.values(revealing).flat() : []
  const isRevealedClue = (clean: string) => revealedWords.some(c => clueMatches(c, clean))

  // Evidence cards on the board: the target-word card plus one pinned card per found clue
  const targetPos = cardPos[TARGET_CARD] ?? TARGET_DEFAULT
  const clueCards = activeClues.map((clue, i) => {
    const key = `${activeWordId}:${clue}`
    return { key, clue, pos: cardPos[key] ?? clueDefault(i) }
  })

  const endSession = () => {
    if (sessionId) {
      updateSessionProgress(sessionId, questionIndex).catch(() => {})
    }
    if (sessionStartId && sessionQueue.length > 0) {
      saveSession('tap_clues', sessionStartId, {
        sessionQueue, questionIndex,
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
            <span className={styles.tabIndex}>[3] CASE 03:</span>
            <span className={styles.tabLabel}><Search size={13} aria-hidden /> {MODULE_TITLES.tap_clues}</span>
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
                <FolderOpen size={14} aria-hidden /> CASE FILE {'//'} {tapNode!.title}
              </span>
              <h1 className={styles.title}>{MODULE_TITLES.tap_clues}</h1>
            </div>
            <div className={styles.headerRight}>
              <button type="button" className={`${styles.caseBtn} ${styles.caseBtnGhost}`} onClick={() => setTutorialOpen(true)}>
                <HelpCircle size={14} aria-hidden /> Tutorial
              </button>
            </div>
          </header>

          {/* Objective stamp + progress */}
          <div className={styles.objectiveRow}>
            <span className={styles.objective}>
              OBJECTIVE: TAP THE CONTEXT CLUES TO UNLOCK THE HIDDEN WORD
            </span>
            <span className={`${desk.handwritten} ${styles.objectiveNote}`}>
              {activeWordMeta && !activeUnlocked ? `clues for “${activeWordMeta.word}” →` : 'find what proves the meaning →'}
            </span>
          </div>
          {sessionQueue.length > 0 && (
            <div className={styles.progress} aria-hidden>
              <div className={styles.progressFill} style={{ width: `${((questionIndex + 1) / sessionQueue.length) * 100}%` }} />
            </div>
          )}

          {/* ── Evidence board ── */}
          <div className={styles.board} style={{ width: BOARD_W, height: BOARD_H }}>
            {/* Passage exhibit (fixed reading surface; tap words to collect clues) */}
            <article className={`${desk.indexCard} ${styles.passage}`} data-tutorial="passage">
              <span className={styles.pushPin} aria-hidden />
              <span className={styles.exhibitNo}>EXHIBIT A {'//'} WITNESS STATEMENT</span>
              <div className={`${bodyFont.className} ${styles.passageText}`}>
                {tokens.map((token, i) => {
                  if (/^\s+$/.test(token.text)) return <span key={i}>{token.text}</span>
                  const wordId     = token.word_id
                  const isUnlocked = wordId ? unlockedWords.includes(wordId) : false
                  const isActive   = wordId ? activeWordId === wordId : false
                  const cleanWord  = token.text.replace(/[^a-zA-Z']/g, '').toLowerCase().trim()
                  const isFoundClue = !!cleanWord && activeClues.some((c: string) => clueMatches(c, cleanWord))
                  const cls =
                    token.isLocked && isUnlocked ? styles.wordUnlocked :
                    token.isLocked && isActive   ? styles.wordTargetActive :
                    token.isLocked               ? styles.wordTarget :
                    isFoundClue                  ? styles.wordClue :
                    revealing && cleanWord && isRevealedClue(cleanWord) ? styles.wordRevealed :
                    pulseClue === cleanWord      ? styles.wordPulse : ''
                  return (
                    <span
                      key={i}
                      onClick={() => handleWordTap(token.text, token)}
                      title={isFoundClue ? 'Found context clue (click to remove)' : undefined}
                      className={`${styles.word} ${cls}`}
                    >
                      {token.text}
                    </span>
                  )
                })}
              </div>
            </article>

            {/* Crimson threads: each clue card → the target-word card */}
            <svg className={styles.threads} width={BOARD_W} height={BOARD_H} aria-hidden>
              {clueCards.map(({ key, pos }) => (
                <path
                  key={key}
                  className={styles.threadPath}
                  d={bezierPath(pos.x + CLUE_W / 2, pos.y + 4, targetPos.x + TARGET_W / 2, targetPos.y + TARGET_H - 4)}
                  stroke={activeUnlocked ? '#2f6418' : '#a83232'}
                  strokeWidth={2.4}
                  fill="none"
                  strokeLinecap="round"
                />
              ))}
            </svg>

            {/* Target-word card (draggable) */}
            <div
              className={`${desk.indexCard} ${styles.targetCard} ${draggingId === TARGET_CARD ? styles.dragging : ''}`}
              style={{ left: targetPos.x, top: targetPos.y, width: TARGET_W, height: TARGET_H }}
              onPointerDown={e => handleCardPointerDown(e, TARGET_CARD, targetPos, TARGET_W, TARGET_H)}
              onPointerMove={handleCardPointerMove}
              onPointerUp={handleCardPointerUp}
              onPointerCancel={handleCardPointerUp}
              data-tutorial="clue-cards"
            >
              <span className={styles.pushPin} aria-hidden />
              <div className={styles.targetHead}>
                <span className={styles.exhibitNo} style={{ position: 'static' }}>TARGET WORD</span>
                <span className={`${styles.lockStamp} ${activeUnlocked ? styles.lockStampOpen : ''}`}>
                  {activeUnlocked ? 'UNLOCKED' : 'LOCKED'}
                </span>
              </div>
              <div className={`${bodyFont.className} ${styles.targetWord} ${activeUnlocked ? styles.targetWordOpen : ''}`}>
                {activeWordMeta?.word ?? '— select a word —'}
              </div>
              <div className={styles.targetMeta}>
                CLUES FOUND {Math.min(activeClues.length, requiredCluesCount)}/{requiredCluesCount}
                {activeUnlocked && activeWordMeta && (
                  <button type="button" className={styles.linkBtn}
                    onClick={() => setDefPanel({
                      word_id: activeWordMeta.word_id,
                      word: activeWordMeta.word,
                      definition: activeWordMeta.definition || 'Target academic vocabulary unlocked.',
                      contextual_usage: activeWordMeta.contextual_usage || '',
                      translation: activeWordMeta.translation || '',
                    })}>
                    <BookOpen size={12} aria-hidden /> Definition
                  </button>
                )}
              </div>
              {tapNode!.locked_words.length > 1 && (
                <div className={styles.wordChips}>
                  {tapNode!.locked_words.map(lw => (
                    <button key={lw.word_id} type="button"
                      className={`${styles.wordChip} ${lw.word_id === activeWordId ? styles.wordChipActive : ''} ${unlockedWords.includes(lw.word_id) ? styles.wordChipDone : ''}`}
                      onClick={() => setActiveWordId(lw.word_id)}>
                      {unlockedWords.includes(lw.word_id) ? '✓ ' : ''}{lw.word}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Found clues, pinned as small index cards (draggable) */}
            {clueCards.map(({ key, clue, pos }) => (
              <div
                key={key}
                className={`${desk.indexCard} ${styles.clueCard} ${draggingId === key ? styles.dragging : ''}`}
                style={{ left: pos.x, top: pos.y, width: CLUE_W, height: CLUE_H }}
                onPointerDown={e => handleCardPointerDown(e, key, pos, CLUE_W, CLUE_H)}
                onPointerMove={handleCardPointerMove}
                onPointerUp={handleCardPointerUp}
                onPointerCancel={handleCardPointerUp}
                data-tutorial="clue-cards"
              >
                <span className={styles.pushPinSm} aria-hidden />
                <span className={styles.clueLabel}>CLUE</span>
                <span className={`${bodyFont.className} ${styles.clueText}`}>{clue}</span>
                {!activeUnlocked && (
                  <button type="button" className={styles.clueRemove} title="Remove clue" aria-label={`Remove clue ${clue}`}
                    onClick={() => handleRemoveClue(clue)}>
                    <X size={12} aria-hidden />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* ── Footer bar ── */}
          <div className={styles.submitBar}>
            <span className={styles.counter}>
              {unlockedWords.length} / {tapNode!.locked_words.length} WORDS UNLOCKED
              {allUnlocked && <span className={styles.allDone}>ALL WORDS UNLOCKED — SUBMIT WHEN READY</span>}
              {!allUnlocked && !revealing && wrongs > 0 && attemptsLeft > 0 && (
                <span className={`${bodyFont.className} ${styles.attemptMsg}`} role="status">
                  Incorrect clue. Attempts remaining: {attemptsLeft}/{MAX_ATTEMPTS}
                </span>
              )}
            </span>
            <div className={styles.submitGroup} data-tutorial="submit">
              <span className={`${styles.attemptBadge} ${attemptsLeft <= 1 ? styles.attemptBadgeLow : ''}`}
                aria-label={`Attempts remaining: ${attemptsLeft} of ${MAX_ATTEMPTS}`}>
                ATTEMPTS: {attemptsLeft}/{MAX_ATTEMPTS}
                <span className={styles.attemptPips} aria-hidden>
                  {Array.from({ length: MAX_ATTEMPTS }, (_, i) => <i key={i} className={i < attemptsLeft ? styles.pipOn : ''} />)}
                </span>
              </span>
              {(disputed || revealing) && !allUnlocked ? (
                // Wrong clue: a crimson alert stands in for SUBMIT until the next tap
                <span className={styles.disputedBadge} role="status">✕ CLUES DISPUTED</span>
              ) : (
                <button
                  type="button"
                  disabled={!allUnlocked || submitting}
                  onClick={handleSubmitMastery}
                  className={`${styles.submitBtn} ${styles.submit} ${allUnlocked && !submitting ? styles.submitBtnReady : ''}`}
                >
                  {submitting ? 'CHECKING…' : <><FileText size={16} aria-hidden /> SUBMIT <ArrowRight size={18} aria-hidden /></>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Word unlocked: definition card ── */}
      {defPanel && (
        <div className={styles.defBackdrop}>
          <div className={`${desk.indexCard} ${styles.defCard}`} role="dialog" aria-labelledby="tc-def-title">
            <span className={styles.pushPin} aria-hidden />
            <div className={styles.defStamp}>✓ WORD UNLOCKED</div>
            <h3 id="tc-def-title" className={`${bodyFont.className} ${styles.defWord}`}>{defPanel.word}</h3>
            <div className={styles.defLabel}>DEFINITION</div>
            <p className={`${bodyFont.className} ${styles.defText}`}>{defPanel.definition}</p>
            {defPanel.contextual_usage && (
              <>
                <div className={styles.defLabel}>IN CONTEXT</div>
                <p className={`${bodyFont.className} ${styles.defText} ${styles.defItalic}`}>&ldquo;{defPanel.contextual_usage}&rdquo;</p>
              </>
            )}
            {defPanel.translation && (
              <>
                <div className={styles.defLabel}>TRANSLATION (FILIPINO)</div>
                <p className={`${bodyFont.className} ${styles.defText}`}>{defPanel.translation}</p>
              </>
            )}
            <button
              type="button"
              className={styles.caseBtn}
              onClick={() => {
                setDefPanel(null)
                if (tapNode) {
                  const nextUnsolved = tapNode.locked_words.find(lw => !unlockedWords.includes(lw.word_id) && lw.word_id !== defPanel.word_id)
                  if (nextUnsolved) setActiveWordId(nextUnsolved.word_id)
                }
              }}
            >
              Got it — Continue <ArrowRight size={14} aria-hidden />
            </button>
          </div>
        </div>
      )}

      <SpotlightTutorial
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        steps={CLUE_EXTRACTION_TUTORIAL}
        storageKey={CLUE_EXTRACTION_TUTORIAL_KEY}
        heading="CLUE EXTRACTION BRIEFING"
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
