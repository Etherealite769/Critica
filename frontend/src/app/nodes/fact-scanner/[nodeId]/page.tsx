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
import { notifyProgressionUpdated } from '@/lib/realtime-sync'
import CaseLoadingLobby from '@/components/shared/CaseLoadingLobby'
import NodeEvaluationReport, { type CaseResult } from '@/components/shared/NodeEvaluationReport'
import CaseLessonScreen from '@/components/shared/CaseLessonScreen'
import { playRightAnswerSound, playWrongSound, playVictorySound } from '@/lib/sound-effects'
import { MODULE_TITLES } from '@/lib/modules'
import CritRemark, { type Remark, type RemarkKind } from '@/components/logic-thread/CritRemark'
import CaseDebriefModal, { type DocketDebrief, type MissedCase } from '@/components/logic-thread/CaseDebriefModal'
import { SpotlightTutorial, hasSeenTutorial, type TutorialStep } from '@/components/logic-thread/LogicThreadTutorial'
import {
  ArrowRight, FileText, FolderOpen, HelpCircle, Lightbulb, LogOut, Paperclip, RotateCcw, Scale, ShieldAlert,
} from 'lucide-react'
import { Montserrat } from 'next/font/google'
import desk from '@/components/dashboard/desk.module.css'
import styles from './page.module.css'

// Testimony and evidence text: Montserrat, self-hosted by next/font
const bodyFont = Montserrat({ subsets: ['latin'], weight: ['500', '600'], display: 'swap' })

interface ArticleSentence {
  sentence_id: string
  text:        string
}
/** An AI exercise sentence carries its answer key. */
interface ExerciseSentence extends ArticleSentence {
  is_flawed?:   boolean
  flaw_reason?: string
}
interface FactExercise {
  topic_title?:       string
  reading_passage?:   string
  craap_criterion?:   string
  article_sentences?: ExerciseSentence[]
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

/** Fields read from the mastery endpoints' responses. */
interface MasteryResponse {
  status?: string; next_node?: string | null; streak?: number; streak_new_day?: boolean
  xp_awarded?: number; total_xp?: number; level?: number; level_title?: string; level_up?: boolean; progress_pct?: number
}

const FONT = "'Courier New', Courier, monospace"

const CRAAP_TABS = ['CURRENCY', 'RELEVANCE', 'AUTHORITY', 'ACCURACY', 'PURPOSE']

const CRITERION_QUESTIONS: Record<string, string> = {
  CURRENCY:  'Is the information timely and up-to-date?',
  RELEVANCE: 'Does the information relate to your topic?',
  AUTHORITY: 'Who is the source? Are they qualified?',
  ACCURACY:  'Is the information supported by evidence?',
  PURPOSE:   'Why does this information exist?',
}

const btnSm: React.CSSProperties = {
  padding: '7px 16px', background: 'transparent',
  border: '1px solid #8C5A3C', borderRadius: 2,
  color: '#C49A5A', fontFamily: FONT, fontSize: 10,
  fontWeight: 700, cursor: 'pointer',
}

// Inspector Crit's spotlight walkthrough (first visit, or the TUTORIAL button)
const CROSS_EXAM_TUTORIAL_KEY = 'hasSeenCrossExamTutorial'
const CROSS_EXAM_TUTORIAL: TutorialStep[] = [
  {
    targets: ['statements'],
    title: 'Arranging Testimony',
    text: 'Welcome to Witness Cross Examination, Cadet! Each witness statement is an index card — drag the cards anywhere on the board. Threads tie suspect testimony to the evidence.',
  },
  {
    targets: ['evidence', 'statements'],
    title: 'Finding Contradictions',
    text: "Test every statement against the target criterion on the evidence card. Click a statement that fails the test, then press 'SCAN & QUARANTINE' to lock it away.",
  },
  {
    targets: ['sidebar'],
    title: 'Hints',
    text: "Stuck? Hover over 'HINT' on the left and I'll cross-examine the witnesses with you.",
  },
  {
    targets: ['submit'],
    title: 'Submission & Tries',
    text: 'You have 3 tries per case — a wrong scan or report costs one. Quarantine every flawed statement, then submit your report to close the case!',
  },
]

// Three tries per case; misses 1-2 get encouragement only, the third reveals the flaws and moves on
const MAX_ATTEMPTS = 3
const REVEAL_MS = 4500
const RETRY_REMARKS = [
  'Close, Cadet. Re-examine the witness statement against the physical evidence and try again.',
  'That testimony holds up. Which statement would fail the criterion on the evidence card?',
  'Not that one. Look for claims with no source, stale dates or loaded language.',
  'Steady, Cadet. Read each statement as if the witness were under oath.',
]
const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)]
const HINT_FALLBACK = 'Re-read the micro-lesson and apply the criterion to each sentence.'
const THINKING_TEXT = 'Inspector Crit is cross-examining the witnesses'
const SOCRATIC_FALLBACK = 'Re-read the target criterion question and check if the claim has proper backing evidence.'

// Cases failed after three tries survive a reload, so a resumed docket can't close with an unsolved case
const SKIPPED_KEY = (startId: string) => `critica_skipped_fact_scanner_${startId}`
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

// ── Evidence board geometry ──────────────────────
// Room kept free beside the dossier: the retracted side tabs only show their icons
const SIDE_GUTTER = 64
const BOARD_W = 1100, BOARD_H = 460
const EVIDENCE_CARD = '__evidence'
const EVIDENCE_W = 268, EVIDENCE_H = 262
const EVIDENCE_DEFAULT = { x: 814, y: 16 }
const STATEMENT_W = 376

/** Statement cards default to two columns left of the evidence card; height shrinks to fit the rows. */
function statementLayout(count: number) {
  const rows = Math.max(1, Math.ceil(count / 2))
  const h = Math.min(184, Math.floor((BOARD_H - 32 - (rows - 1) * 16) / rows))
  return { h, pos: (i: number) => ({ x: 18 + (i % 2) * 394, y: 16 + Math.floor(i / 2) * (h + 16) }) }
}

function bezierPath(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  const dx = x2 - x1, dy = y2 - y1
  const L  = Math.sqrt(dx * dx + dy * dy) || 1
  return `M${x1},${y1} Q${mx + (-dy / L) * 40},${my + (dx / L) * 40} ${x2},${y2}`
}

function BriefingGenerationScreen({ title, onCancel }: { title?: string; onCancel?: () => void }) {
  return <CaseLoadingLobby moduleKey="fact_scanner" title={title} onCancel={onCancel} />
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

  // session accuracy evaluation state
  const [sessionResults,   setSessionResults]   = useState<CaseResult[]>([])
  const attemptsMapRef = useRef<Record<number, number>>({})
  const pendingQueueRef = useRef<number[]>([])
  const [attemptsMap,  setAttemptsMap]  = useState<Record<number, number>>({})
  const [pendingQueue, setPendingQueue] = useState<number[]>([])
  const [sessionStartedAt, setSessionStartedAt] = useState(() => Date.now())

  const [selected,    setSelected]    = useState<string | null>(null)
  const [quarantined, setQuarantined] = useState<string[]>([])
  const [flawReasons, setFlawReasons] = useState<Record<string, string>>({})
  const [evaluating,  setEvaluating]  = useState(false)
  const [attempts,    setAttempts]    = useState(0)
  const [flawsFound,  setFlawsFound]  = useState(0)
  const [hintsUsed,   setHintsUsed]   = useState(0)
  const [masteryData, setMasteryData] = useState<Record<string, unknown> | null>(null)
  const [submitting,  setSubmitting]  = useState(false)

  const [tutorialOpen, setTutorialOpen] = useState(false)

  // Hints and feedback are spoken by Inspector Crit's lower-left bubble
  const [socraticLoading, setSocraticLoading] = useState(false)
  const [remark,          setRemark]          = useState<Remark | null>(null)
  const say = useCallback((text: string, kind: RemarkKind = 'remark') => setRemark({ id: Date.now(), text, kind }), [])

  // Attempts: a wrong scan / report stays "disputed" until the next pick; the third reveals the flaws
  const [wrongs,    setWrongs]    = useState(0)
  const [disputed,  setDisputed]  = useState(false)
  const [revealing, setRevealing] = useState<string[] | null>(null)

  // End-of-docket debrief and notes on cases failed along the way
  const [debrief,     setDebrief]     = useState<DocketDebrief | null>(null)
  const [missedCases, setMissedCases] = useState<MissedCase[]>([])

  // Evidence board: dossier scaled to the viewport, draggable statement / evidence cards
  const [fitScale,   setFitScale]   = useState(1)
  const fitRef = useRef<HTMLDivElement>(null)
  const [cardPos,    setCardPos]    = useState<Record<string, { x: number; y: number }>>({})
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const dragRef = useRef<{ id: string; startX: number; startY: number; originX: number; originY: number; w: number; h: number; moved: boolean } | null>(null)
  const suppressClickRef = useRef(false)   // a drag ends with a click on the card; don't treat it as a pick


  const [sessionId,        setSessionId]        = useState<string | null>(null)
  const [sessionExercises, setSessionExercises] = useState<FactExercise[]>([])

  /** Clear everything that belongs to a single case. */
  const resetCase = useCallback(() => {
    setSelected(null); setQuarantined([]); setFlawReasons({})
    setEvaluating(false); setAttempts(0); setFlawsFound(0); setHintsUsed(0)
    setWrongs(0); setDisputed(false); setRevealing(null); setCardPos({})
  }, [])

  // ── Load question ──────────────────────────────────────────
  const loadQuestion = useCallback(async (targetIndex: number, queue: string[]) => {
    setPhase('loading')
    try {
      if (sessionExercises.length > targetIndex) {
        const ex = sessionExercises[targetIndex]
        setFactNode(prev => prev ? ({
          ...prev,
          title: ex.topic_title || prev.title,
          craap_criterion: ex.craap_criterion || prev.craap_criterion,
          reading_passage: ex.reading_passage || prev.reading_passage,
          article_sentences: ex.article_sentences || prev.article_sentences,
        }) : prev)
        resetCase()
        setPhase('task')
        return
      }

      const targetNodeId = queue[targetIndex] || nodeId
      const d = await apiFetch(`/nodes/fact-scanner/${targetNodeId}/`)
      setFactNode(d)
      resetCase()
      setPhase('task')
    } catch (e: any) {
      setErrorMsg(e?.error ?? 'Failed to load next question.')
      setPhase('error')
    }
  }, [sessionExercises, nodeId, resetCase])

  // ── startSession ───────────────────────────────────────────
  const startSession = useCallback(async (forceFresh = false) => {
    setPhase('loading')
    const start = nodeId
    setSessionStartId(start)

    try {
      const sessionData = await fetchNodeSession('fact_scanner', start, forceFresh)
      setSessionId(sessionData.session_id)
      setSessionExercises(sessionData.exercises || [])

      // A fresh start (Retry / Fresh Case) always opens a new full docket at case 1
      const resumeIdx = forceFresh ? 0 : Math.min(
        sessionData.current_index ?? 0,
        Math.max(0, (sessionData.exercises?.length ?? 1) - 1)
      )
      const activeEx = sessionData.exercises?.[resumeIdx] || sessionData.exercises?.[0]

      setFactNode({
        node_id: sessionData.node_id,
        title: activeEx?.topic_title || sessionData.title,
        focus: sessionData.focus,
        craap_criterion: activeEx?.craap_criterion || 'CURRENCY',
        difficulty: sessionData.difficulty,
        micro_lesson_text: sessionData.micro_lesson_text,
        reading_passage: activeEx?.reading_passage || sessionData.reading_passage || '',
        deep_dive_required: sessionData.deep_dive_required,
        article_sentences: activeEx?.article_sentences || [],
      })
      const totalQ = sessionData.exercises?.length || 5
      const queue = Array.from({ length: totalQ }, (_, i) => `q${i + 1}`)
      setSessionQueue(queue)
      setQuestionIndex(resumeIdx)
      resetCase()
      if (forceFresh || resumeIdx === 0) {
        setSessionResults([])
        setMissedCases([])
        writeSkipped(start, [])
        setSessionStartedAt(Date.now())
      }

      saveSession('fact_scanner', start, {
        sessionQueue: queue,
        questionIndex: resumeIdx,
      })

      setPhase((resumeIdx > 0 || forceFresh) ? 'task' : 'micro_lesson')
    } catch {
      // Fallback to legacy static node queue
      if (forceFresh) clearSession('fact_scanner', start)
      const saved = forceFresh ? null : loadSession('fact_scanner', start)
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
            setFactNode(d); setPhase(forceFresh ? 'task' : 'micro_lesson')
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
    }
  }, [nodeId, router, resetCase])

  useEffect(() => {
    startSession(false)
  }, [startSession])

  useEffect(() => {
    if (phase !== 'task') return
    // First visit: Inspector Crit walks the cadet through the board
    if (hasSeenTutorial(CROSS_EXAM_TUTORIAL_KEY)) return
    setTutorialOpen(true)
  }, [phase])

  const aiCase = !!sessionId && sessionExercises.length > questionIndex

  /** Explanation for a sound statement that was scanned (used in the third-strike reveal). */
  const callFeedback = useCallback(async (sentence_id: string): Promise<string> => {
    const fallback = 'That sentence does not violate the CRAAP criterion.'
    try {
      const fb = aiCase
        ? await apiFetch(`/ai/session/${sessionId}/feedback/${questionIndex}/`,
            { method: 'POST', body: JSON.stringify({ sentence_id, tier: 1 }) })
        : await apiFetch(`/nodes/fact-scanner/${factNode?.node_id ?? nodeId}/feedback/`,
            { method: 'POST', body: JSON.stringify({ sentence_id, inactivity_seconds: 0 }) })
      return fb.explanation || fallback
    } catch {
      return fallback
    }
  }, [aiCase, sessionId, questionIndex, factNode, nodeId])

  // ── Hint: Crit thinks, then speaks the scaffold hint ───────
  const fetchHint = useCallback(async () => {
    say(THINKING_TEXT, 'thinking')
    let text = HINT_FALLBACK
    try {
      const res = aiCase
        ? await apiFetch(`/ai/session/${sessionId}/feedback/${questionIndex}/`,
            { method: 'POST', body: JSON.stringify({ tier: 2 }) })
        : await apiFetch(`/nodes/fact-scanner/${factNode?.node_id ?? nodeId}/feedback/`,
            { method: 'POST', body: JSON.stringify({ sentence_id: '', inactivity_seconds: 61 }) })
      text = res.hint || res.explanation || HINT_FALLBACK
      setHintsUsed(h => h + 1)
    } catch { /* keep the fallback hint */ }
    say(text, 'hint')
  }, [aiCase, nodeId, factNode, sessionId, questionIndex, say])

  // ── Dig deeper: a live Socratic clue from the AI ───────────
  const handleAskSocraticAdvice = async () => {
    if (!sessionId) return
    setSocraticLoading(true)
    say(THINKING_TEXT, 'thinking')
    try {
      const res = await fetchLiveSocraticHint(
        sessionId,
        questionIndex,
        { quarantined_ids: quarantined, selected_id: selected, attempts, flaws_found: flawsFound },
        wrongs + 1,
      )
      say(res.socratic_hint || 'Consider applying the CRAAP criterion strictly to each claim.', 'hint')
    } catch {
      say(SOCRATIC_FALLBACK, 'hint')
    } finally {
      setSocraticLoading(false)
    }
  }

  // ── Case outcome helpers ───────────────────────────────────
  const totalCases = sessionExercises.length || sessionQueue.length || 1

  /** Cases left unsolved this docket (this run's misses plus misses saved before a reload). */
  const unsolvedCases = (updated: CaseResult[]) =>
    new Set([...updated.filter(r => !r.correct).map(r => r.caseNumber), ...readSkipped(sessionStartId)]).size

  /** Answer key for this case (AI exercises only; the legacy endpoint keeps it server-side). */
  const caseKey = (): ExerciseSentence[] => (aiCase ? sessionExercises[questionIndex].article_sentences : null) ?? []

  /** Close the docket: mastery only when every case was solved, then the debrief. */
  const finishDocket = async (updated: CaseResult[], finishedAt: number, missed: MissedCase[]) => {
    const unsolved = unsolvedCases(updated)   // read before the saved misses are cleared
    const cleared = unsolved === 0
    let finalRes: MasteryResponse = {}
    if (cleared) {
      playVictorySound()
      try {
        if (aiCase) finalRes = await apiFetch(`/ai/session/${sessionId}/mastery/`, { method: 'POST' })
        else if (sessionStartId) finalRes = await apiFetch(`/nodes/fact-scanner/${sessionStartId}/mastery/`,
          { method: 'POST', body: JSON.stringify({ commit_only: true }) })
      } catch { /* the debrief still opens; the report shows no next node */ }
    }
    if (sessionStartId) clearSession('fact_scanner', sessionStartId)
    writeSkipped(sessionStartId, [])

    const nextNode = cleared ? (savedNextNode || finalRes.next_node || null) : null
    setMasteryData({
      next_node: nextNode,
      streak: savedStreak !== null ? savedStreak : (finalRes.streak ?? 1),
      accuracy: (() => {
        const correctCount = updated.filter(r => r.correct).length
        const totalTries = updated.reduce((acc, r) => acc + (r.attempts || (r.correct ? 1 : 0)), 0)
        return totalTries > 0 ? Math.round((correctCount / totalTries) * 100) : 100
      })(),
      totalCases,
      correctCases: updated.filter(r => r.correct).length,
      hintsUsed: updated.reduce((acc, r) => acc + (r.hintsUsed || 0), 0),
      timeTakenSeconds: Math.max(1, Math.round((finishedAt - sessionStartedAt) / 1000)),
      caseResults: updated,
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
      solved: Math.max(0, totalCases - unsolved),
      total: totalCases,
      xpAwarded: cleared && typeof finalRes.xp_awarded === 'number' ? finalRes.xp_awarded : null,
      nextNode,
      missed,
    })
  }

  /** Save progress and open the next case, or close the docket after the last one. */
  const advanceCase = async (updated: CaseResult[], finishedAt: number, missed: MissedCase[]) => {
    const nextIdx = questionIndex + 1
    if (nextIdx < totalCases) {
      if (sessionId) updateSessionProgress(sessionId, nextIdx).catch(() => {})
      if (sessionStartId) {
        saveSession('fact_scanner', sessionStartId, {
          sessionQueue, questionIndex: nextIdx,
          next_node: savedNextNode || undefined,
          streak: savedStreak !== null ? savedStreak : undefined,
        })
      }
      setQuestionIndex(nextIdx)
      await loadQuestion(nextIdx, sessionQueue)
      return false
    }
    await finishDocket(updated, finishedAt, missed)
    return true
  }

  /** Third miss: file the case as unsolved and move on (or close the docket without mastery). */
  const failCase = async (explanation: string, notes: MissedCase, decidedAt: number) => {
    const caseNumber = questionIndex + 1
    const res: CaseResult = { caseNumber, correct: false, firstTry: false, hintsUsed, attempts: MAX_ATTEMPTS }
    const updated = [...sessionResults.filter(r => r.caseNumber !== caseNumber), res]
    setSessionResults(updated)
    writeSkipped(sessionStartId, [...readSkipped(sessionStartId), caseNumber])
    const missed = [...missedCases.filter(m => m.caseNumber !== caseNumber), notes].sort((a, b) => a.caseNumber - b.caseNumber)
    const closed = await advanceCase(updated, decidedAt, missed)
    if (!closed) say(explanation, 'explain')   // keep Crit's explanation up on the next case
  }

  /** Wrong scan or report: misses 1-2 get encouragement only; the third reveals the flaws, explains, and advances. */
  const handleWrongAttempt = async (sentenceId: string | null) => {
    playWrongSound()
    setDisputed(true)
    const nextWrongs = wrongs + 1
    setWrongs(nextWrongs)
    attemptsMapRef.current[questionIndex] = nextWrongs
    setAttemptsMap({ ...attemptsMapRef.current })

    if (sessionId) {
      apiFetch(`/ai/session/${sessionId}/log-attempt/`, {
        method: 'POST',
        body: JSON.stringify({ is_correct: false, word_id: sentenceId ?? 'report', clue_word: '' }),
      }).catch(() => {})
    }
    say(pick(RETRY_REMARKS))
  }

  // ── Select sentence ───────────────────────────────────────
  const handleSelectSentence = (sentence_id: string) => {
    if (!factNode || evaluating || revealing || quarantined.includes(sentence_id)) return
    setDisputed(false)
    setSelected(prev => prev === sentence_id ? null : sentence_id)
  }

  /** Correct scan: lock the statement away and pin the violation to it. */
  const quarantine = (sentenceId: string, reason: string) => {
    playRightAnswerSound()
    setQuarantined(prev => [...prev, sentenceId])
    setFlawReasons(prev => ({ ...prev, [sentenceId]: reason }))
    setFlawsFound(f => f + 1); setSelected(null)
    say(`Good catch, Cadet — that testimony doesn't hold. ${reason}`)
  }

  // ── Scan and quarantine ───────────────────────────────────
  const handleScanAndQuarantine = async () => {
    if (!factNode || !selected || evaluating || revealing) return
    const pickedId = selected
    setEvaluating(true); setAttempts(a => a + 1)

    // AI Dynamic Exercise Evaluation
    if (aiCase) {
      const sentence = caseKey().find(s => s.sentence_id === pickedId)
      if (sentence?.is_flawed) {
        quarantine(pickedId, sentence.flaw_reason || 'Violates the CRAAP criterion.')
        apiFetch(`/ai/session/${sessionId}/log-attempt/`, {
          method: 'POST',
          body: JSON.stringify({ is_correct: true, word_id: pickedId, clue_word: '' }),
        }).catch(() => {})
      } else {
        setSelected(null)
        await handleWrongAttempt(pickedId)
      }
      setEvaluating(false)
      return
    }

    // Legacy Evaluation
    try {
      const res = await apiFetch(
        `/nodes/fact-scanner/${factNode.node_id}/evaluate-sentence/`,
        { method: 'POST', body: JSON.stringify({ sentence_id: pickedId }) },
      )
      if (res.result === 'correct') {
        quarantine(pickedId, res.flaw_reason)
      } else {
        setSelected(null)
        await handleWrongAttempt(pickedId)
      }
    } catch {
      playWrongSound()
      setErrorMsg('Evaluation failed.')
    }
    finally { setEvaluating(false) }
  }

  /** The case is closed correctly: record it and move on. */
  const solveCase = async () => {
    const caseNumber = questionIndex + 1
    const totalTries = wrongs + 1
    attemptsMapRef.current[questionIndex] = totalTries
    setAttemptsMap({ ...attemptsMapRef.current })
    pendingQueueRef.current = pendingQueueRef.current.filter(idx => idx !== questionIndex)
    setPendingQueue([...pendingQueueRef.current])
    const res: CaseResult = { caseNumber, correct: true, firstTry: wrongs === 0, hintsUsed, attempts: totalTries }
    const updated = [...sessionResults.filter(r => r.caseNumber !== caseNumber), res]
    setSessionResults(updated)
    if (questionIndex + 1 < totalCases) playRightAnswerSound()
    const finishedAt = Date.now()
    await advanceCase(updated, finishedAt, missedCases)
  }

  // ── Submit report ─────────────────────────────────────────
  const handleSubmitMastery = async () => {
    if (!factNode || submitting || revealing) return
    setSubmitting(true)

    // 1. AI Dynamic Session Submission
    if (aiCase) {
      const flawedIds = caseKey().filter(s => s.is_flawed).map(s => s.sentence_id)
      const isMastered = flawedIds.every(id => quarantined.includes(id)) && quarantined.length === flawedIds.length

      apiFetch(`/ai/session/${sessionId}/evaluate/${questionIndex}/`, {
        method: 'POST',
        body: JSON.stringify({ quarantined_ids: quarantined, node_id: nodeId, module: 'fact_scanner' }),
      }).catch(() => {})

      try {
        if (isMastered) await solveCase()
        else await handleWrongAttempt(null)
      } finally { setSubmitting(false) }
      return
    }

    // 2. Legacy Submission
    try {
      const res = await apiFetch(
        `/nodes/fact-scanner/${factNode.node_id}/mastery/`,
        { method: 'POST', body: JSON.stringify({ quarantined_ids: quarantined, save_progression: false }) },
      )
      if (res.status === 'mastered') await solveCase()
      else await handleWrongAttempt(null)
    } catch (e) {
      if ((e as any)?.status === 'incomplete') await handleWrongAttempt(null)
      else { playWrongSound(); say('Submission failed. Please try again.', 'feedback') }
    } finally { setSubmitting(false) }
  }

  // ── Card dragging (pointer events: mouse, pen and touch) ──
  const handleCardPointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string, pos: { x: number; y: number }, w: number, h: number) => {
    suppressClickRef.current = false
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
    const drag = dragRef.current
    if (!drag) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    suppressClickRef.current = drag.moved
    dragRef.current = null
    setDraggingId(null)
  }

  const handleStatementClick = (sentenceId: string) => {
    if (suppressClickRef.current) { suppressClickRef.current = false; return }
    handleSelectSentence(sentenceId)
  }

  // ── Fit the dossier inside the 100vh viewport ──
  const handleSkipAndReturn = () => {
    attemptsMapRef.current[questionIndex] = wrongs
    setAttemptsMap({ ...attemptsMapRef.current })
    if (!pendingQueueRef.current.includes(questionIndex)) {
      pendingQueueRef.current.push(questionIndex)
      setPendingQueue([...pendingQueueRef.current])
    }

    const totalCasesCount = sessionId && sessionExercises.length > 0 ? sessionExercises.length : totalCases
    const completedIndices = new Set(sessionResults.map(r => r.caseNumber - 1))
    let nextIdx = -1
    for (let i = questionIndex + 1; i < totalCasesCount; i++) {
      if (!completedIndices.has(i) && i !== questionIndex) {
        nextIdx = i
        break
      }
    }
    if (nextIdx === -1) {
      for (let i = 0; i < totalCasesCount; i++) {
        if (!completedIndices.has(i) && i !== questionIndex) {
          nextIdx = i
          break
        }
      }
    }

    if (nextIdx !== -1) {
      if (sessionId) updateSessionProgress(sessionId, nextIdx).catch(() => {})
      setQuestionIndex(nextIdx)
      loadQuestion(nextIdx, sessionQueue)
      say(`Case postponed. Loading Case ${nextIdx + 1} — you can return to pending cases later.`)
    }
  }

  const handleSubmitUnresolved = async () => {
    attemptsMapRef.current[questionIndex] = wrongs
    setAttemptsMap({ ...attemptsMapRef.current })
    const totalCasesCount = sessionId && sessionExercises.length > 0 ? sessionExercises.length : totalCases
    const completedIndices = new Set(sessionResults.map(r => r.caseNumber - 1))
    let updated = [...sessionResults]
    for (let i = 0; i < totalCasesCount; i++) {
      if (!completedIndices.has(i)) {
        const tries = attemptsMapRef.current[i] || (i === questionIndex ? wrongs : 0)
        const res: CaseResult = {
          caseNumber: i + 1,
          correct: false,
          firstTry: false,
          hintsUsed,
          attempts: tries,
        }
        updated = [...updated.filter(r => r.caseNumber !== i + 1), res]
      }
    }
    setSessionResults(updated)
    const timeTakenSeconds = Math.max(1, Math.round((Date.now() - sessionStartedAt) / 1000))
    setMasteryData({
      next_node: null,
      streak: savedStreak !== null ? savedStreak : 0,
      accuracy: Math.round((updated.filter(r => r.correct).length / Math.max(1, totalCasesCount)) * 100),
      totalCases: totalCasesCount,
      correctCases: updated.filter(r => r.correct).length,
      hintsUsed: updated.reduce((acc, r) => acc + (r.hintsUsed || 0), 0),
      timeTakenSeconds,
      caseResults: updated,
    })
    setDebrief({
      verdict: 'partial',
      solved: updated.filter(r => r.correct).length,
      total: totalCasesCount,
      xpAwarded: null,
      nextNode: null,
      missed: missedCases,
    })
  }

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
    if (next) router.push(`/nodes/fact-scanner/${next}`)
    else setPhase('mastery')
  }

  const handleViewReport = () => { setDebrief(null); setPhase('mastery') }

  // ── Loading ───────────────────────────────────────────────
  if (phase === 'loading') return <BriefingGenerationScreen title={factNode?.title} onCancel={() => router.push('/dashboard')} />

  if (phase === 'error') return (
    <div className={desk.desk} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, gap: 16 }}>
      <p style={{ color: '#ff8888', fontSize: 14 }}>{errorMsg}</p>
      <button style={btnSm} onClick={() => router.push('/dashboard')}>← DASHBOARD</button>
    </div>
  )

  // ── Micro lesson ──────────────────────────────────────────
  if (phase === 'micro_lesson') return (
    <CaseLessonScreen
      moduleKey="fact_scanner"
      nodeId={factNode!.node_id}
      phase="micro_lesson"
      title={factNode!.title}
      focus={factNode!.focus}
      microLessonText={factNode!.micro_lesson_text}
      readingPassage={factNode!.reading_passage}
      deepDiveRequired={!!factNode!.deep_dive_required}
      difficulty={factNode!.difficulty}
      craapCriterion={factNode!.craap_criterion}
      onContinue={() => setPhase(factNode!.deep_dive_required ? 'deep_dive' : 'task')}
      onBackToDashboard={() => router.push('/dashboard')}
    />
  )

  // ── Deep dive ─────────────────────────────────────────────
  if (phase === 'deep_dive') return (
    <CaseLessonScreen
      moduleKey="fact_scanner"
      nodeId={factNode!.node_id}
      phase="deep_dive"
      title={factNode!.title}
      focus={factNode!.focus}
      microLessonText={factNode!.micro_lesson_text}
      readingPassage={factNode!.reading_passage}
      deepDiveRequired={!!factNode!.deep_dive_required}
      difficulty={factNode!.difficulty}
      craapCriterion={factNode!.craap_criterion}
      onContinue={() => setPhase('task')}
      onBackToDashboard={() => router.push('/dashboard')}
    />
  )

  // ── Mastery ───────────────────────────────────────────────
  if (phase === 'mastery') return (
    <div className={desk.desk} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
      <NodeEvaluationReport
        moduleKey="fact_scanner"
        title={factNode?.title || MODULE_TITLES.fact_scanner}
        accuracy={(masteryData as any)?.accuracy ?? 100}
        totalCases={(masteryData as any)?.totalCases ?? 5}
        correctCases={(masteryData as any)?.correctCases ?? 5}
        hintsUsed={(masteryData as any)?.hintsUsed ?? 0}
        timeTakenSeconds={(masteryData as any)?.timeTakenSeconds ?? 0}
        streak={Number(masteryData?.streak ?? 0)}
        caseResults={(masteryData as any)?.caseResults}
        nextNodeId={(masteryData?.next_node as string) || null}
        onNext={() => !!masteryData?.next_node && router.push(`/nodes/fact-scanner/${masteryData.next_node}`)}
        onReplay={() => startSession(true)}
        onDashboard={() => router.push('/dashboard')}
      />
    </div>
  )

  // ── TASK PHASE ────────────────────────────────────────────
  const sentences     = factNode!.article_sentences
  const criterion     = factNode!.craap_criterion
  const level         = factNode!.difficulty ?? nodeDifficulty(nodeId)
  const attemptsLeft  = Math.max(0, MAX_ATTEMPTS - wrongs)   // wrongs resets to 0 on every new case
  const flawTotal     = aiCase ? caseKey().filter(s => s.is_flawed).length : null
  const canSubmit     = quarantined.length > 0
  const layout        = statementLayout(sentences.length)
  const evidencePos   = cardPos[EVIDENCE_CARD] ?? EVIDENCE_DEFAULT
  const statementCards = sentences.map((s, i) => ({ s, i, pos: cardPos[s.sentence_id] ?? layout.pos(i) }))

  // Threads: quarantined, revealed and selected statements → the evidence card (nearest side)
  const threads = statementCards.flatMap(({ s, pos }) => {
    const isQ = quarantined.includes(s.sentence_id)
    const isR = !isQ && !!revealing?.includes(s.sentence_id)
    const isS = selected === s.sentence_id
    if (!isQ && !isR && !isS) return []
    const leftOfEvidence = pos.x + STATEMENT_W / 2 < evidencePos.x + EVIDENCE_W / 2
    const x1 = leftOfEvidence ? pos.x + STATEMENT_W - 6 : pos.x + 6
    const x2 = leftOfEvidence ? evidencePos.x + 6 : evidencePos.x + EVIDENCE_W - 6
    return [{
      key: s.sentence_id,
      d: bezierPath(x1, pos.y + layout.h / 2, x2, evidencePos.y + EVIDENCE_H / 2),
      color: isQ ? '#a83232' : isR ? '#2f6418' : '#4e3629',
      dashed: !isQ,
    }]
  })

  const endSession = () => {
    if (sessionId) {
      updateSessionProgress(sessionId, questionIndex).catch(() => {})
    }
    if (sessionStartId && sessionQueue.length > 0) {
      saveSession('fact_scanner', sessionStartId, {
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
        <button type="button" onClick={() => fetchHint()} className={styles.sideTab} title="Hint" data-tutorial="sidebar">
          <span className={styles.sideTabLabel}>Hint</span>
          <span className={styles.sideTabIcon}><Lightbulb size={18} aria-hidden /></span>
        </button>
        <button type="button" onClick={handleRetryDocket} className={styles.sideTab} title="Fresh Case" data-tutorial="sidebar">
          <span className={styles.sideTabLabel}>Fresh Case</span>
          <span className={styles.sideTabIcon}><RotateCcw size={18} aria-hidden /></span>
        </button>
        <button type="button" onClick={endSession} className={styles.sideTab} title="End Session" data-tutorial="sidebar">
          <span className={styles.sideTabLabel}>End Session</span>
          <span className={styles.sideTabIcon}><LogOut size={18} aria-hidden /></span>
        </button>
      </div>

      {/* ── Dossier (scaled to fit the viewport) ── */}
      <div ref={fitRef} className={`${styles.boardEnter} ${styles.dossier}`} style={{ transform: `scale(${fitScale})` }}>

        {/* Folder tabs */}
        <div className={styles.dossierTabs}>
          <div className={`${styles.dossierTab} ${styles.dossierTabActive}`}>
            <Paperclip size={22} strokeWidth={1.75} className={styles.tabClip} aria-hidden />
            <span className={styles.tabIndex}>[4] CASE 04:</span>
            <span className={styles.tabLabel}><Scale size={13} aria-hidden /> {MODULE_TITLES.fact_scanner}</span>
          </div>
          {sessionQueue.length > 0 && (
            <div className={styles.dossierTab}>
              <span className={styles.tabIndex}>DOCKET</span>
              <span className={styles.tabLabel}>CASE {questionIndex + 1} / {totalCases}</span>
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
                <FolderOpen size={14} aria-hidden /> CASE FILE {'//'} {factNode!.title}
              </span>
              <h1 className={styles.title}>{MODULE_TITLES.fact_scanner}</h1>
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
              OBJECTIVE: QUARANTINE THE TESTIMONY THAT FAILS THE {criterion} TEST
            </span>
            <span className={`${desk.handwritten} ${styles.objectiveNote}`}>
              which witness can&apos;t be trusted? →
            </span>
          </div>
          {sessionQueue.length > 0 && (
            <div className={styles.progress} aria-hidden>
              <div className={styles.progressFill} style={{ width: `${((questionIndex + 1) / totalCases) * 100}%` }} />
            </div>
          )}

          {/* ── Evidence board ── */}
          <div className={styles.board} style={{ width: BOARD_W, height: BOARD_H }}>
            {/* Threads sit under the cards */}
            <svg className={styles.threads} width={BOARD_W} height={BOARD_H} aria-hidden>
              {threads.map(t => (
                <path
                  key={t.key}
                  className={styles.threadPath}
                  d={t.d}
                  stroke={t.color}
                  strokeWidth={2.4}
                  strokeDasharray={t.dashed ? '7 6' : undefined}
                  fill="none"
                  strokeLinecap="round"
                />
              ))}
            </svg>

            {/* Witness statements (draggable; click to pick) */}
            {statementCards.map(({ s, i, pos }) => {
              const isQ = quarantined.includes(s.sentence_id)
              const isR = !isQ && !!revealing?.includes(s.sentence_id)
              const isS = selected === s.sentence_id
              const state = isQ ? styles.statementQuarantined : isR ? styles.statementRevealed : isS ? styles.statementSelected : ''
              return (
                <div
                  key={s.sentence_id}
                  role="button"
                  tabIndex={isQ || revealing ? -1 : 0}
                  aria-pressed={isS}
                  className={`${desk.indexCard} ${styles.statementCard} ${state} ${draggingId === s.sentence_id ? styles.dragging : ''}`}
                  style={{ left: pos.x, top: pos.y, width: STATEMENT_W, height: layout.h }}
                  onPointerDown={e => handleCardPointerDown(e, s.sentence_id, pos, STATEMENT_W, layout.h)}
                  onPointerMove={handleCardPointerMove}
                  onPointerUp={handleCardPointerUp}
                  onPointerCancel={handleCardPointerUp}
                  onClick={() => handleStatementClick(s.sentence_id)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectSentence(s.sentence_id) } }}
                  data-tutorial="statements"
                >
                  <span className={styles.pushPin} aria-hidden />
                  <div className={styles.statementHead}>
                    <span className={styles.statementNo}>WITNESS STATEMENT {String(i + 1).padStart(2, '0')}</span>
                    {isS && <span className={styles.statementTag}>● SELECTED</span>}
                  </div>
                  <p className={`${bodyFont.className} ${styles.statementText}`}>{s.text}</p>
                  {isQ && flawReasons[s.sentence_id] && (
                    <p className={`${bodyFont.className} ${styles.statementReason}`} title={flawReasons[s.sentence_id]}>
                      Violation: {flawReasons[s.sentence_id]}
                    </p>
                  )}
                  {isQ && <span className={styles.statementStamp}>QUARANTINED</span>}
                  {isR && <span className={`${styles.statementStamp} ${styles.statementStampFlaw}`}>FLAWED</span>}
                </div>
              )
            })}

            {/* Physical evidence: the target criterion (draggable) */}
            <div
              className={`${desk.indexCard} ${styles.evidenceCard} ${draggingId === EVIDENCE_CARD ? styles.dragging : ''}`}
              style={{ left: evidencePos.x, top: evidencePos.y, width: EVIDENCE_W, height: EVIDENCE_H }}
              onPointerDown={e => handleCardPointerDown(e, EVIDENCE_CARD, evidencePos, EVIDENCE_W, EVIDENCE_H)}
              onPointerMove={handleCardPointerMove}
              onPointerUp={handleCardPointerUp}
              onPointerCancel={handleCardPointerUp}
              data-tutorial="evidence"
            >
              <span className={styles.pushPin} aria-hidden />
              <span className={styles.exhibitNo}>EXHIBIT A {'//'} PHYSICAL EVIDENCE</span>
              <span className={styles.evidenceLabel}>TARGET CRITERION</span>
              <div className={`${bodyFont.className} ${styles.evidenceWord}`}>{criterion}</div>
              <p className={`${bodyFont.className} ${styles.evidenceQuestion}`}>
                {CRITERION_QUESTIONS[criterion] ?? 'Does this sentence pass the CRAAP test?'}
              </p>
              <div className={styles.craapStrip} aria-label="CRAAP criteria">
                {CRAAP_TABS.map(tab => (
                  <span key={tab} className={`${styles.craapChip} ${tab === criterion ? styles.craapChipActive : ''}`} title={tab}>
                    {tab[0]}
                  </span>
                ))}
              </div>
              <div className={styles.evidenceMeta}>
                FLAWS QUARANTINED {flawTotal !== null ? `${Math.min(quarantined.length, flawTotal)}/${flawTotal}` : quarantined.length}
              </div>
            </div>
          </div>

          {/* ── Footer bar ── */}
          <div className={styles.submitBar}>
            <span className={styles.counter}>
              {quarantined.length} {flawTotal !== null ? `/ ${flawTotal} ` : ''}STATEMENT{quarantined.length === 1 && flawTotal === null ? '' : 'S'} QUARANTINED
              {flawTotal !== null && quarantined.length >= flawTotal && !revealing && (
                <span className={styles.allDone}>ALL FLAWS QUARANTINED — FILE YOUR REPORT</span>
              )}
              {!revealing && wrongs > 0 && attemptsLeft > 0 && (
                <span className={`${bodyFont.className} ${styles.attemptMsg}`} role="status">
                  Testimony disputed. Attempts remaining: {attemptsLeft}/{MAX_ATTEMPTS}
                </span>
              )}
            </span>
            <div className={styles.submitGroup} data-tutorial="submit">
              <span className={styles.attemptBadge} aria-label={`Current attempt: ${wrongs + 1}`}>
                ATTEMPT #{wrongs + 1}
              </span>
              {wrongs >= 3 && !submitting && !revealing && (
                <button
                  type="button"
                  onClick={handleSkipAndReturn}
                  style={{
                    border: '1px solid rgba(243, 167, 18, 0.6)',
                    background: 'rgba(243, 167, 18, 0.15)',
                    color: '#F3A712',
                    fontFamily: 'inherit',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    padding: '6px 12px',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                  title="Move to next question and return to this one later"
                >
                  SKIP &amp; RETURN LATER →
                </button>
              )}
              {wrongs >= 3 && !submitting && !revealing && (
                <button
                  type="button"
                  onClick={handleSubmitUnresolved}
                  style={{
                    border: '1px solid rgba(239, 68, 68, 0.6)',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#EF4444',
                    fontFamily: 'inherit',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    padding: '6px 12px',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                  title={`Submit session and skip this question (0/${wrongs} tries)`}
                >
                  SUBMIT (0/{wrongs} TRIES)
                </button>
              )}
              {disputed || revealing ? (
                // Wrong scan / report: a crimson alert stands in for the actions until the next pick
                <span className={styles.disputedBadge} role="status">✕ TESTIMONY DISPUTED</span>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={!selected || evaluating}
                    onClick={handleScanAndQuarantine}
                    className={`${styles.caseBtn} ${styles.scanBtn}`}
                  >
                    <ShieldAlert size={15} aria-hidden /> {evaluating ? 'SCANNING…' : 'SCAN & QUARANTINE'}
                  </button>
                  <button
                    type="button"
                    disabled={!canSubmit || submitting}
                    onClick={handleSubmitMastery}
                    className={`${styles.submitBtn} ${styles.submit} ${canSubmit && !submitting ? styles.submitBtnReady : ''}`}
                  >
                    {submitting ? 'FILING…' : <><FileText size={16} aria-hidden /> SUBMIT REPORT <ArrowRight size={18} aria-hidden /></>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <SpotlightTutorial
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        steps={CROSS_EXAM_TUTORIAL}
        storageKey={CROSS_EXAM_TUTORIAL_KEY}
        heading="CROSS EXAMINATION BRIEFING"
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
