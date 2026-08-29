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

// ── Palette (identical to Logic Thread) ───────────
const C: Record<string, string> = {
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
  green:      '#22aa55',
  greenDark:  '#1a7a3e',
}

const FONT = "'Courier New', Courier, monospace"

// ── Shared style atoms ─────────────────────────────
const stamp: React.CSSProperties = {
  display: 'inline-block', border: `2px solid ${C.btnGoldBdr}`,
  padding: '3px 14px', fontSize: 10, fontWeight: 700,
  letterSpacing: '0.15em', color: C.textMid,
  marginBottom: 12, fontFamily: FONT,
}
const btnPrimary: React.CSSProperties = {
  padding: '10px 24px', background: C.btnGold,
  border: `2px solid ${C.btnGoldBdr}`, borderRadius: 8,
  color: C.textDark, fontFamily: FONT, fontSize: 11,
  fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em',
}
const btnSm: React.CSSProperties = {
  padding: '7px 16px', background: 'transparent',
  border: `1px solid ${C.btnGoldBdr}`, borderRadius: 6,
  color: C.textMid, fontFamily: FONT, fontSize: 10,
  fontWeight: 700, cursor: 'pointer',
}

// ── Types ──────────────────────────────────────────
interface LockedWordMeta {
  word_id:        string
  word:           string
  position_index: number
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

const TAP_CLUES_TUTORIAL_KEY = 'critica_tutorial_seen_tap_clues_first_node'

const TUTORIAL_STEPS = [
  { label: 'Overview',    code: 'TUT-TTC-001', text: 'In Tap the Clues, a target word in the passage is locked. Its meaning is hidden. Your job is to find surrounding words that implicitly reveal its definition, then tap them to fill the Found Clues Tracker.', board: 'target',     notes: ['Gold underline = target word', 'Teal highlight = your clue', 'Locked stamp = not yet solved'] },
  { label: 'Find clues',  code: 'TUT-TTC-002', text: 'Look for words that indirectly describe the target word. Think about synonyms, cause-effect, or tone clues. Words like command, dismissing, and imperious all hint at meaning even if they are not direct definitions.', board: 'strongWeak', notes: ['Strong clues match the meaning', 'Weak clues are too general', 'Need 3-4 strong clues'] },
  { label: 'Tap words',   code: 'TUT-TTC-003', text: 'Click any word in the passage to add it as a clue. It highlights and fills a slot in the Found Clues Tracker on the right. Fill all slots before you can submit. You cannot tap the target word itself.', board: 'tracker',    notes: ['Slot fills on each tap', 'Tap filled slot to remove', '4 slots total to fill'] },
  { label: 'Unlock word', code: 'TUT-TTC-004', text: 'With all clue slots filled, hit Submit Clues. If your clues are strong enough, the LOCKED stamp becomes UNLOCKED and the definition is revealed. Weak clues trigger a retry with a hint about what to look for.', board: 'unlock',     notes: ['Stamp flips to OPEN', 'Weak clues = retry + hint', 'Definition revealed on unlock'] },
] as const

// ── Sub-screens ────────────────────────────────────
function LoadScreen() {
  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: C.textLight, fontSize: 14, letterSpacing: '0.1em' }}>
      LOADING NODE...
    </div>
  )
}

function ErrorScreen({ msg, onBack }: { msg: string; onBack: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, gap: 16 }}>
      <p style={{ color: '#ff8888', fontSize: 14 }}>{msg}</p>
      <button onClick={onBack} style={btnSm}>← DASHBOARD</button>
    </div>
  )
}

function LessonScreen({ node, onContinue }: { node: TapNodeData; onContinue: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, fontFamily: FONT }}>
      <div style={{ maxWidth: 640, width: '100%', background: '#F2DEC1', border: `1px solid ${C.cardBdr}`, borderRadius: 8, padding: 48 }}>
        <div style={stamp}>MICRO-LESSON</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.btnDark, margin: '0 0 6px', fontFamily: FONT }}>{node.title}</h2>
        <p style={{ fontSize: 12, color: C.textMuted, margin: '0 0 16px', fontFamily: FONT }}>{node.focus}</p>
        <hr style={{ border: 'none', borderTop: `1px solid ${C.cardBdr}`, margin: '16px 0' }} />
        <p style={{ fontSize: 14, lineHeight: 1.9, color: C.textDark, margin: '0 0 32px', fontFamily: FONT }}>{node.micro_lesson_text}</p>
        <button onClick={onContinue} style={btnPrimary}>Continue →</button>
      </div>
    </div>
  )
}

function DeepDiveScreen({ node, onContinue }: { node: TapNodeData; onContinue: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, fontFamily: FONT }}>
      <div style={{ maxWidth: 700, width: '100%', background: '#2A1200', border: `1px solid ${C.cardBdr}`, borderRadius: 8, padding: 48 }}>
        <div style={stamp}>DEEP DIVE READING</div>
        <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 20px', lineHeight: 1.7, fontFamily: FONT }}>Read the full passage carefully before the task unlocks.</p>
        <p style={{ fontSize: 14, lineHeight: 2.0, color: C.canvas, background: C.pageBg, border: `1px solid ${C.cardBdr}`, borderRadius: 6, padding: 28, margin: '0 0 28px', fontFamily: FONT }}>
          {node.reading_passage}
        </p>
        <button onClick={onContinue} style={btnPrimary}>I have finished reading →</button>
      </div>
    </div>
  )
}

function MasteryScreen({ node, data, onDashboard, onNext }: {
  node: TapNodeData; data: any; onDashboard: () => void; onNext: () => void
}) {
  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
      <div style={{ maxWidth: 480, width: '100%', background: '#0A1E0A', border: `2px solid ${C.green}`, borderRadius: 8, padding: 52, textAlign: 'center' }}>
        <div style={{ ...stamp, color: C.green, borderColor: C.green, fontSize: 16, padding: '8px 24px' }}>✓ NODE MASTERED</div>
        <h2 style={{ fontSize: 20, color: C.green, margin: '8px 0 16px', fontFamily: FONT }}>{node.title}</h2>
        <p style={{ fontSize: 13, color: C.textLight, margin: '0 0 28px', fontFamily: FONT }}>Streak: {data?.streak ?? 0} days</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {data?.next_node && <button onClick={onNext} style={btnPrimary}>NEXT NODE →</button>}
          <button onClick={onDashboard} style={btnSm}>← DASHBOARD</button>
        </div>
      </div>
    </div>
  )
}

// ── Tutorial ───────────────────────────────────────
function TapCluesTutorialPopup({ open, step, onBack, onNext, onClose, onStart }: {
  open: boolean; step: number
  onBack: () => void; onNext: () => void
  onClose: () => void; onStart: () => void
}) {
  if (!open) return null
  const current = TUTORIAL_STEPS[step]
  const isFirst = step === 0
  const isLast  = step === TUTORIAL_STEPS.length - 1

  const renderBoard = () => {
    if (current.board === 'target') return (
      <div style={{ padding: '16px 14px 12px' }}>
        <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: C.accentRed, marginBottom: 12, letterSpacing: '0.1em' }}>THE TARGET WORD</div>
        <div style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.7, color: C.textDark }}>
          A tone of{' '}
          <span style={{ color: C.btnGoldBdr, fontWeight: 700, textDecoration: 'underline' }}>peremptory</span>
          {' '}authority is often associated with those who{' '}
          <span style={{ color: C.green, fontWeight: 700 }}>command</span>
          {' '}without question.
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-block', transform: 'rotate(-8deg)', color: C.accentRed, border: `2px solid ${C.accentRed}`, borderRadius: '50%', padding: '6px 8px', fontSize: 10, fontWeight: 700, fontFamily: FONT }}>LOCKED</span>
          <span style={{ fontSize: 12, color: C.textDark, fontFamily: FONT }}>→ tap clues to unlock</span>
        </div>
      </div>
    )
    if (current.board === 'strongWeak') return (
      <div style={{ padding: '16px 14px 12px' }}>
        <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: C.accentRed, marginBottom: 12, letterSpacing: '0.1em' }}>STRONG VS WEAK CLUES</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: '8px 12px', border: `1.5px solid ${C.green}`, background: '#f0fff4', color: C.greenDark, fontFamily: FONT, fontSize: 12, fontWeight: 700, lineHeight: 1.4, borderRadius: 4 }}>
            ✓ Strong: "command", "imperious" — signal authority/abruptness
          </div>
          <div style={{ padding: '8px 12px', border: `1.5px solid ${C.cardBdr}`, background: C.canvas, color: C.textMuted, fontFamily: FONT, fontSize: 12, fontWeight: 700, lineHeight: 1.4, borderRadius: 4 }}>
            ✗ Weak: "tone", "often" — too generic, no semantic link
          </div>
        </div>
      </div>
    )
    if (current.board === 'tracker') return (
      <div style={{ padding: '16px 14px 12px' }}>
        <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: C.accentRed, marginBottom: 12, letterSpacing: '0.1em' }}>FOUND CLUES TRACKER</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: FONT, fontSize: 13, color: C.textDark }}>
          <div><span style={{ color: C.green, fontWeight: 700 }}>[1]</span> command</div>
          <div><span style={{ color: C.green, fontWeight: 700 }}>[2]</span> imperious</div>
          <div><span style={{ color: C.cardBdr, fontWeight: 700 }}>[3]</span> <span style={{ color: C.textMuted, fontStyle: 'italic' }}>— tap a word —</span></div>
        </div>
      </div>
    )
    return (
      <div style={{ padding: '16px 14px 12px' }}>
        <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: C.accentRed, marginBottom: 12, letterSpacing: '0.1em' }}>LOCK STATE CHANGE</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontFamily: FONT, fontSize: 13 }}>
          <span style={{ color: C.accentRed, border: `2px solid ${C.accentRed}`, borderRadius: '50%', padding: '6px 8px', transform: 'rotate(-6deg)', fontWeight: 700, fontSize: 11 }}>LOCKED</span>
          <span style={{ color: C.textMid, fontSize: 18 }}>→</span>
          <span style={{ color: C.green, border: `2px solid ${C.green}`, borderRadius: '50%', padding: '6px 5px', transform: 'rotate(6deg)', fontWeight: 700, fontSize: 10 }}>UNLOCKED</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: FONT }}>
      <div style={{ width: '100%', maxWidth: 700, background: C.canvas, border: `1px solid ${C.btnGoldBdr}`, borderRadius: 8, overflow: 'hidden', boxShadow: '0 18px 44px rgba(0,0,0,0.55)' }}>
        <div style={{ background: C.pageBg, padding: '14px 28px', display: 'flex', justifyContent: 'space-between' }}>
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
          {/* agent bubble */}
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
              <p style={{ fontFamily: FONT, fontSize: 13, lineHeight: 1.65, color: C.textDark, margin: 0, whiteSpace: 'pre-line' }}>{current.text}</p>
            </div>
          </div>
          {/* board + notes */}
          <div style={{ background: C.board, border: `1px solid ${C.btnGoldBdr}`, borderRadius: 5, marginBottom: 22, padding: '10px 12px' }}>
            <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.accentRed, marginBottom: 8 }}>QUICK NOTES</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, background: C.cardPaper, border: `1px solid ${C.cardBdr}`, borderRadius: 4, minHeight: 90 }}>
                {renderBoard()}
              </div>
              <div style={{ width: 110, background: C.cardPaper, border: `1px solid ${C.cardBdr}`, borderRadius: 4, padding: '10px 12px' }}>
                {current.notes.map((n, i) => (
                  <div key={i} style={{ fontFamily: FONT, fontSize: 11, color: C.textDark, lineHeight: 1.6, marginBottom: i < current.notes.length - 1 ? 8 : 0 }}>• {n}</div>
                ))}
              </div>
            </div>
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

  const [fbText,       setFbText]       = useState('')
  const [drawer,       setDrawer]       = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)

  const [hintOverlay,     setHintOverlay]     = useState(false)
  const [hintOverlayText, setHintOverlayText] = useState('')
  const [hintOverlayTier, setHintOverlayTier] = useState(0)

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const inactiveRef = useRef(0)

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
        setFbText('')
        setDrawer(false)
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
      setFbText('')
      setDrawer(false)
      setHintOverlay(false)
      setPhase('task')
    } catch (e: any) {
      setErrorMsg(e?.error ?? 'Failed to load next question.')
      setPhase('error')
    }
  }, [sessionExercises, nodeId])

  useEffect(() => {
    const start = nodeId
    setSessionStartId(start)

    // Attempt to load AI-generated 5-question session
    apiFetch(`/ai/session/tap_clues/${start}/`)
      .then((sessionData: any) => {
        setSessionId(sessionData.session_id)
        setSessionExercises(sessionData.exercises || [])
        const firstEx = sessionData.exercises?.[0]
        setTapNode({
          node_id: sessionData.node_id,
          title: sessionData.title,
          focus: sessionData.focus,
          difficulty: sessionData.difficulty,
          micro_lesson_text: sessionData.micro_lesson_text,
          reading_passage: sessionData.reading_passage || firstEx?.reading_passage || '',
          deep_dive_required: sessionData.deep_dive_required,
          locked_words: firstEx?.locked_words || [],
        })
        setSessionQueue(['q1', 'q2', 'q3', 'q4', 'q5'])
        setQuestionIndex(0)
        setPhase('micro_lesson')
      })
      .catch(() => {
        // Fallback to legacy static node queue
        const saved = loadSession('tap_clues', start)
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
              setTapNode(d); setPhase('micro_lesson')
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
      })
  }, [nodeId, router])

  useEffect(() => {
    if (phase !== 'task' || nodeId !== 'tap_node_01') return
    const seen = localStorage.getItem(TAP_CLUES_TUTORIAL_KEY)
    if (seen === '1') return
    localStorage.setItem(TAP_CLUES_TUTORIAL_KEY, '1')
    setTutorialStep(0); setTutorialOpen(true)
  }, [phase, nodeId])

  const callFeedback = useCallback(async (word_id: string, clue_word: string, inactivity: boolean) => {
    if (sessionId && sessionExercises.length > questionIndex) {
      try {
        const res = await apiFetch(`/ai/session/${sessionId}/feedback/${questionIndex}/`, {
          method: 'POST',
          body: JSON.stringify({ word_id, clue_word, tier: 1 }),
        })
        setFbText(res.explanation ?? 'That word is not a valid context clue.'); setDrawer(true)
        return
      } catch {
        setFbText('That word is not a valid context clue. Look for synonyms or definitions nearby.'); setDrawer(true)
        return
      }
    }

    const activeNodeId = tapNode?.node_id ?? nodeId
    try {
      const res = await apiFetch(`/nodes/tap-clues/${activeNodeId}/feedback/`, {
        method: 'POST',
        body: JSON.stringify({ word_id, clue_word, inactivity_seconds: inactivity ? 60 : inactiveRef.current }),
      })
      setFbText(res.explanation ?? 'That word is not a valid context clue.'); setDrawer(true)
    } catch {
      setFbText('That word is not a valid context clue. Look for synonyms or definitions nearby.'); setDrawer(true)
    }
  }, [nodeId, tapNode, sessionId, sessionExercises, questionIndex])

  const fetchHint = useCallback(async (isInactivity = false) => {
    if (sessionId && sessionExercises.length > questionIndex) {
      try {
        const res = await apiFetch(`/ai/session/${sessionId}/feedback/${questionIndex}/`, {
          method: 'POST',
          body: JSON.stringify({ word_id: activeWordId ?? '', clue_word: '', tier: 2 }),
        })
        setHintOverlayText(res.hint || res.explanation || 'Look for words near the locked word that hint at its meaning.')
        setHintOverlayTier(res.hint_tier ?? 2); setHintOverlay(true)
        return
      } catch {
        setHintOverlayText('Look for words near the locked word that hint at its meaning.'); setHintOverlay(true)
        return
      }
    }

    const activeNodeId = tapNode?.node_id ?? nodeId
    try {
      const res = await apiFetch(`/nodes/tap-clues/${activeNodeId}/feedback/`, {
        method: 'POST',
        body: JSON.stringify({ word_id: activeWordId ?? '', clue_word: '', inactivity_seconds: 61 }),
      })
      setHintOverlayText(res.hint || res.explanation || 'Look for words near the locked word that hint at its meaning.')
      setHintOverlayTier(res.hint_tier ?? 0); setHintOverlay(true)
    } catch {
      setHintOverlayText('Look for words near the locked word that hint at its meaning.'); setHintOverlay(true)
    }
  }, [nodeId, activeWordId, tapNode, sessionId, sessionExercises, questionIndex])

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

  const logWordToLexical = useCallback(async (word: string, definition: string, contextual_usage: string, translation: string) => {
    const activeNodeId = tapNode?.node_id ?? nodeId
    try {
      await apiFetch('/lexical/log/', { method: 'POST', body: JSON.stringify({ word_data: { word, definition, contextual_usage, translation }, task_id: activeNodeId }) })
    } catch { console.warn('Lexical log failed silently') }
  }, [nodeId, tapNode])

  const handleWordTap = async (word: string, token: { text: string; isLocked: boolean; word_id?: string; idx: number }) => {
    if (!tapNode) return
    resetTimer()
    if (!activeWordId) {
      if (token.isLocked && token.word_id && !unlockedWords.includes(token.word_id)) setActiveWordId(token.word_id)
      return
    }
    if (token.isLocked && token.word_id && token.word_id !== activeWordId && !unlockedWords.includes(token.word_id)) { setActiveWordId(token.word_id); return }
    if (token.isLocked && token.word_id === activeWordId) { setActiveWordId(null); return }
    if (!token.isLocked) {
      const cleanWord = word.replace(/[^a-zA-Z']/g, '').toLowerCase()
      if (!cleanWord) return
      const currentFound = foundClues[activeWordId] ?? []

      // AI Dynamic Exercise Clue Check
      if (sessionId && sessionExercises.length > questionIndex) {
        const currentEx = sessionExercises[questionIndex]
        const targetLockedWord = currentEx.locked_words?.find((lw: any) => lw.word_id === activeWordId)
        const correctClues = (targetLockedWord?.correct_clue_ids || []).map((c: string) => c.toLowerCase())
        const isClueCorrect = correctClues.some((c: string) => c.includes(cleanWord) || cleanWord.includes(c))

        if (isClueCorrect) {
          setPulseClue(cleanWord); setTimeout(() => setPulseClue(null), 600)
          const updatedFound = Array.from(new Set([...currentFound, cleanWord]))
          const allFound = correctClues.every((c: string) => updatedFound.some((f: string) => c.includes(f) || f.includes(c))) || updatedFound.length >= 1

          if (allFound) {
            setUnlockedWords(prev => [...prev, activeWordId])
            setDefPanel({
              word_id: activeWordId,
              word: targetLockedWord?.word || cleanWord,
              definition: targetLockedWord?.definition || 'Target academic vocabulary unlocked.',
              contextual_usage: targetLockedWord?.contextual_usage || '',
              translation: targetLockedWord?.translation || '',
            })
            setFoundClues(prev => ({ ...prev, [activeWordId]: updatedFound }))
            setActiveWordId(null)
            await logWordToLexical(targetLockedWord?.word, targetLockedWord?.definition, targetLockedWord?.contextual_usage, targetLockedWord?.translation)
          } else {
            setFoundClues(prev => ({ ...prev, [activeWordId]: updatedFound }))
          }
        } else {
          const nextWrongs = wrongs + 1; setWrongs(nextWrongs)
          await callFeedback(activeWordId, cleanWord, false)
          if (nextWrongs >= 3) fetchHint()
        }
        return
      }

      // Legacy Clue Check
      try {
        const res = await apiFetch(`/nodes/tap-clues/${tapNode.node_id}/evaluate-clue/`, {
          method: 'POST',
          body: JSON.stringify({ word_id: activeWordId, clue_word: cleanWord, found_clues: currentFound }),
        })
        if (res.result === 'correct') {
          setPulseClue(cleanWord); setTimeout(() => setPulseClue(null), 600)
          if (res.all_clues_found) {
            setUnlockedWords(prev => [...prev, activeWordId])
            setDefPanel({ word_id: activeWordId, word: res.word, definition: res.definition, contextual_usage: res.contextual_usage, translation: res.translation })
            setFoundClues(prev => ({ ...prev, [activeWordId]: res.found_clues }))
            setActiveWordId(null)
            await logWordToLexical(res.word, res.definition, res.contextual_usage, res.translation)
          } else {
            setFoundClues(prev => ({ ...prev, [activeWordId]: res.found_clues }))
          }
        } else {
          const nextWrongs = wrongs + 1; setWrongs(nextWrongs)
          await callFeedback(activeWordId, cleanWord, false)
          if (nextWrongs >= 3) fetchHint()
        }
      } catch { setErrorMsg('Evaluation failed.') }
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
        const nextIdx = questionIndex + 1
        if (nextIdx < sessionExercises.length) {
          setQuestionIndex(nextIdx)
          loadQuestion(nextIdx, sessionQueue)
          setSubmitting(false)
        } else {
          try {
            const finalRes = await apiFetch(`/ai/session/${sessionId}/mastery/`, { method: 'POST' })
            if (sessionStartId) clearSession('tap_clues', sessionStartId)
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
        setFbText('Some words are still locked. Discover all clue words first.')
        setDrawer(true)
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
        const nextIdx = questionIndex + 1
        if (nextIdx < sessionQueue.length) {
          if (sessionStartId) saveSession('tap_clues', sessionStartId, {
            sessionQueue, questionIndex: nextIdx,
            next_node: savedNextNode || undefined,
            streak: savedStreak !== null ? savedStreak : undefined,
          })
          setQuestionIndex(nextIdx); loadQuestion(nextIdx, sessionQueue)
        } else {
          let finalRes = res
          if (sessionStartId) {
            finalRes = await apiFetch(`/nodes/tap-clues/${sessionStartId}/mastery/`,
              { method: 'POST', body: JSON.stringify({ commit_only: true }) })
          }
          if (sessionStartId) clearSession('tap_clues', sessionStartId)
          setMasteryData({
            next_node: savedNextNode || finalRes.next_node,
            streak: savedStreak !== null ? savedStreak : (finalRes.streak ?? null),
          })
          setPhase('mastery')
        }
      }
    } catch (e: any) {
      setFbText(e?.status === 'incomplete' ? 'Some words are still locked.' : 'Submission failed.')
      setDrawer(true)
    } finally { setSubmitting(false) }
  }

  // ── Phase guards ───────────────────────────────
  if (phase === 'loading')      return <LoadScreen />
  if (phase === 'error')        return <ErrorScreen msg={errorMsg} onBack={() => router.push('/dashboard')} />
  if (phase === 'micro_lesson') return <LessonScreen node={tapNode!} onContinue={() => setPhase(tapNode?.deep_dive_required ? 'deep_dive' : 'task')} />
  if (phase === 'deep_dive')    return <DeepDiveScreen node={tapNode!} onContinue={() => setPhase('task')} />
  if (phase === 'mastery')      return (
    <MasteryScreen node={tapNode!} data={masteryData}
      onDashboard={() => router.push('/dashboard')}
      onNext={() => masteryData?.next_node && router.push(`/nodes/tap-clues/${masteryData.next_node}`)}
    />
  )

  // ── TASK PHASE ─────────────────────────────────
  const tokens         = tokenizePassage(tapNode!.reading_passage, tapNode!.locked_words)
  const allUnlocked    = unlockedWords.length === tapNode!.locked_words.length
  const activeWordMeta = tapNode!.locked_words.find(lw => lw.word_id === activeWordId)
  const activeClues    = activeWordId ? (foundClues[activeWordId] ?? []) : []
  const MAX_CLUES      = 4

  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, padding: '20px 12px' }}>

      {/* ── Fixed folder tabs (same as Logic Thread) ── */}
      <div style={{ position: 'fixed', left: 0, top: '20%', transform: 'translateY(-20%)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, zIndex: 100 }}>
        {[
          { label: 'Hint', action: () => fetchHint() },
          { label: 'End Session', action: () => {
            if (sessionStartId && sessionQueue.length > 0) {
              saveSession('tap_clues', sessionStartId, {
                sessionQueue, questionIndex,
                next_node: savedNextNode || undefined,
                streak: savedStreak !== null ? savedStreak : undefined,
              })
            }
            router.push('/dashboard')
          }},
        ].map(({ label, action }) => (
          <button key={label} onClick={action} style={{
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
            onMouseEnter={e => { e.currentTarget.style.background = C.board }}
            onMouseLeave={e => { e.currentTarget.style.background = C.btnGold }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Main shell ── */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 12px 48px rgba(0,0,0,0.7)',
        borderRadius: 8, overflow: 'hidden',
        width: '100%', maxWidth: 1020, minHeight: 600,
      }}>

        {/* ── HEADER: two rows matching Logic Thread ── */}
        <div style={{ background: C.board, display: 'flex', flexDirection: 'column', borderBottom: `2px solid ${C.btnGoldBdr}` }}>
          {/* row 1: objective */}
          <div style={{ padding: '14px 24px 10px', textAlign: 'center', borderBottom: `1px solid rgba(0,0,0,0.12)` }}>
            <div style={{
              display: 'inline-block', border: `1.5px solid ${C.accentRed}`,
              padding: '7px 28px', fontSize: 13, fontWeight: 700,
              letterSpacing: '0.12em', background: 'rgba(255,255,255,0.3)', fontFamily: FONT,
            }}>
              <span style={{ color: C.textMid }}>OBJECTIVE: </span>
              <span style={{ color: C.accentRed }}>TAP THE CONTEXT CLUES TO UNLOCK THE HIDDEN WORD</span>
            </div>
          </div>
          {/* row 2: meta */}
          <div style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(0,0,0,0.12)', borderRadius: 20, padding: '5px 14px' }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: DIFFICULTY_COLORS[tapNode!.difficulty ?? nodeDifficulty(nodeId)], flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: C.btnDark, fontFamily: FONT }}>
                LVL {tapNode!.difficulty ?? nodeDifficulty(nodeId)} — {DIFFICULTY_LABELS[tapNode!.difficulty ?? nodeDifficulty(nodeId)]}
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
                style={{ padding: '7px 18px', background: C.btnGold, border: `1.5px solid ${C.btnGoldBdr}`, borderRadius: 8, color: C.textDark, fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }}
              >
                TUTORIAL
              </button>
            </div>
          </div>
          {/* progress bar */}
          {sessionQueue.length > 0 && (
            <div style={{ padding: '0 24px 10px' }}>
              <div style={{ height: 5, background: 'rgba(0,0,0,0.15)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(questionIndex / sessionQueue.length) * 100}%`, background: 'rgba(0,0,0,0.35)', borderRadius: 4, transition: 'width 0.3s' }} />
              </div>
            </div>
          )}
        </div>

        {/* ── CANVAS ── */}
        <div style={{ background: C.canvas, display: 'flex', flexDirection: 'column', flex: 1 }}>

          {/* word unlock dots */}
          <div style={{ padding: '12px 24px 8px', display: 'flex', gap: 8, alignItems: 'center' }}>
            {tapNode!.locked_words.map(lw => (
              <div key={lw.word_id} style={{
                height: 7, borderRadius: 4, flex: 1,
                background: unlockedWords.includes(lw.word_id) ? C.green
                  : activeWordId === lw.word_id ? C.btnGoldBdr
                  : C.cardBdr,
                transition: 'background 0.3s',
              }} />
            ))}
            <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: C.textMid, whiteSpace: 'nowrap', marginLeft: 10 }}>
              {unlockedWords.length} / {tapNode!.locked_words.length} UNLOCKED
            </span>
          </div>

          {/* instruction line */}
          <div style={{ textAlign: 'center', padding: '0 24px 10px', fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: C.accentRed }}>
            {activeWordId
              ? `FINDING CLUES FOR: "${activeWordMeta?.word.toUpperCase()}" — TAP SURROUNDING WORDS`
              : allUnlocked
              ? 'ALL WORDS UNLOCKED — SUBMIT TO COMPLETE'
              : 'TAP A GOLD-UNDERLINED WORD TO BEGIN'}
          </div>

          {/* ── two-column: passage | right panel ── */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: '0 24px 16px', gap: 18 }}>

            {/* LEFT: passage */}
            <div style={{
              flex: 1,
              background: C.cardPaper,
              border: `1.5px solid ${C.cardBdr}`,
              borderRadius: 10,
              padding: '24px 28px',
              fontSize: 16, lineHeight: 2.2,
              color: C.textDark, fontFamily: FONT,
              overflowY: 'auto',
              boxShadow: '0 3px 12px rgba(0,0,0,0.1)',
            }}>
              {tokens.map((token, i) => {
                if (/^\s+$/.test(token.text)) return <span key={i}>{token.text}</span>
                const isLocked   = token.isLocked
                const wordId     = token.word_id
                const isUnlocked = wordId ? unlockedWords.includes(wordId) : false
                const isActive   = wordId ? activeWordId === wordId : false
                const cleanWord  = token.text.replace(/[^a-zA-Z']/g, '').toLowerCase()
                const isPulse    = pulseClue === cleanWord

                let color  = C.textDark, bg = 'transparent', border = 'none'
                let fw     = 400, cursor = 'pointer', td = 'none'

                if (isLocked && isUnlocked)  { color = C.green;      fw = 700; td = 'underline' }
                else if (isLocked && isActive){ color = C.btnGoldBdr; fw = 700; bg = 'rgba(196,154,90,0.2)'; border = `1.5px solid ${C.btnGold}` }
                else if (isLocked)            { color = C.btnGoldBdr; fw = 700; td = 'underline' }
                else if (activeWordId && !isLocked && isPulse) { bg = 'rgba(34,170,85,0.2)'; border = `1.5px solid ${C.green}`; color = C.greenDark }

                return (
                  <span key={i} onClick={() => handleWordTap(token.text, token)} style={{
                    color, background: bg, border, borderRadius: border !== 'none' ? 3 : 0,
                    fontWeight: fw, cursor, textDecoration: td,
                    padding: border !== 'none' ? '0 3px' : '0',
                    transition: 'all 0.2s', display: 'inline',
                  }}>
                    {token.text}
                  </span>
                )
              })}
            </div>

            {/* RIGHT: clue panel */}
            <div style={{
              width: 240, flexShrink: 0,
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              {/* target word card */}
              <div style={{ background: C.cardPaper, border: `1.5px solid ${C.cardBdr}`, borderRadius: 10, padding: '16px 18px', boxShadow: '0 3px 10px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: C.textMuted, fontFamily: FONT, marginBottom: 2 }}>TARGET WORD</div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: C.textMuted, fontFamily: FONT }}>STATUS</div>
                  </div>
                  {activeWordMeta ? (
                    unlockedWords.includes(activeWordMeta.word_id) ? (
                      <div style={{ border: `2px solid ${C.green}`, borderRadius: '50%', padding: '6px 8px', fontSize: 9, fontWeight: 700, color: C.green, fontFamily: FONT, transform: 'rotate(6deg)', lineHeight: 1.2, textAlign: 'center' }}>UN<br/>LOCKED</div>
                    ) : (
                      <div style={{ border: `2px solid ${C.accentRed}`, borderRadius: '50%', padding: '6px 8px', fontSize: 9, fontWeight: 700, color: C.accentRed, fontFamily: FONT, transform: 'rotate(-8deg)', lineHeight: 1.2, textAlign: 'center' }}>LOCK<br/>ED</div>
                    )
                  ) : (
                    <div style={{ border: `2px solid ${C.cardBdr}`, borderRadius: '50%', padding: '6px 8px', fontSize: 9, fontWeight: 700, color: C.cardBdr, fontFamily: FONT, transform: 'rotate(-8deg)', lineHeight: 1.2, textAlign: 'center' }}>LOCK<br/>ED</div>
                  )}
                </div>
                <div style={{ fontSize: activeWordMeta ? 20 : 14, fontWeight: 700, color: activeWordMeta ? (unlockedWords.includes(activeWordMeta.word_id) ? C.green : C.btnGoldBdr) : C.cardBdr, fontFamily: FONT, marginBottom: 6 }}>
                  {activeWordMeta?.word ?? '— select a word —'}
                </div>
                <div style={{ borderTop: `1px solid ${C.cardBdr}`, margin: '8px 0' }} />
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: C.accentRed, fontFamily: FONT, marginBottom: 6 }}>INSTRUCTIONS</div>
                <div style={{ fontSize: 11, color: C.textDark, fontFamily: FONT, lineHeight: 1.55 }}>
                  Tap surrounding words that prove the target word&apos;s meaning.
                </div>
              </div>

              {/* found clues tracker */}
              <div style={{ background: C.cardPaper, border: `1.5px solid ${C.cardBdr}`, borderRadius: 10, padding: '16px 18px', boxShadow: '0 3px 10px rgba(0,0,0,0.1)', flex: 1 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: C.accentRed, fontFamily: FONT, marginBottom: 14 }}>FOUND CLUES TRACKER</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {Array.from({ length: MAX_CLUES }).map((_, i) => {
                    const clue = activeClues[i]
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: clue ? C.green : C.cardBdr, fontFamily: FONT, flexShrink: 0, minWidth: 26 }}>[{i + 1}]</span>
                        <div style={{ flex: 1, borderBottom: `1.5px solid ${clue ? C.green : C.cardBdr}`, paddingBottom: 3, fontSize: 12, color: clue ? C.textDark : C.cardBdr, fontFamily: FONT, minHeight: 20, fontStyle: clue ? 'normal' : 'italic', fontWeight: clue ? 700 : 400 }}>
                          {clue ?? ''}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {tapNode!.locked_words.filter(lw => unlockedWords.includes(lw.word_id) && lw.word_id !== activeWordId).length > 0 && (
                  <div style={{ marginTop: 16, borderTop: `1px solid ${C.cardBdr}`, paddingTop: 12 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: C.green, fontFamily: FONT, marginBottom: 8 }}>COMPLETED</div>
                    {tapNode!.locked_words.filter(lw => unlockedWords.includes(lw.word_id) && lw.word_id !== activeWordId).map(lw => (
                      <div key={lw.word_id} style={{ fontSize: 12, color: C.green, fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontWeight: 700 }}>
                        <span style={{ fontSize: 10 }}>✓</span>{lw.word}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── SUBMIT BAR ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 28px 18px', background: C.board,
          borderTop: `2px solid ${C.btnGoldBdr}`,
        }}>
          <span style={{ fontSize: 12, color: C.textMid, fontWeight: 700, letterSpacing: '0.08em', fontFamily: FONT }}>
            {wrongs > 0 && <span style={{ color: C.accentRed }}>WRONG ATTEMPTS: {wrongs}</span>}
          </span>
          <button
            disabled={!allUnlocked || submitting}
            onClick={handleSubmitMastery}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: submitting ? C.textMuted : allUnlocked ? C.btnDark : 'rgba(67,40,24,0.3)',
              color: allUnlocked ? C.btnGold : C.textMuted,
              border: `1.5px solid ${allUnlocked ? C.btnGoldBdr : 'transparent'}`,
              borderRadius: 8, padding: '13px 32px',
              fontSize: 14, fontWeight: 700, letterSpacing: '0.14em',
              cursor: allUnlocked && !submitting ? 'pointer' : 'not-allowed',
              fontFamily: FONT, transition: 'background 0.2s',
              boxShadow: allUnlocked && !submitting ? '0 3px 10px rgba(0,0,0,0.25)' : 'none',
            }}
          >
            {submitting ? 'CHECKING...' : <><span>SUBMIT</span><span style={{ fontSize: 20, lineHeight: 1 }}>→</span></>}
          </button>
        </div>
      </div>

      {/* ── Tutorial ── */}
      <TapCluesTutorialPopup
        open={tutorialOpen} step={tutorialStep}
        onClose={() => setTutorialOpen(false)}
        onBack={() => setTutorialStep(p => Math.max(p - 1, 0))}
        onNext={() => setTutorialStep(p => Math.min(p + 1, TUTORIAL_STEPS.length - 1))}
        onStart={() => setTutorialOpen(false)}
      />

      {/* ── Definition panel ── */}
      {defPanel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: C.cardPaper, border: `2px solid ${C.green}`, borderRadius: 10, padding: '28px 32px', maxWidth: 420, width: '90%', boxShadow: '0 12px 48px rgba(0,0,0,0.45)', fontFamily: FONT }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: C.green, marginBottom: 6 }}>✓ WORD UNLOCKED</div>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: C.textDark, margin: '0 0 4px', fontFamily: FONT, textTransform: 'uppercase' }}>{defPanel.word}</h3>
            <div style={{ fontSize: 10, color: C.textMuted, fontStyle: 'italic', marginBottom: 14 }}>noun / verb / adjective</div>
            <div style={{ borderTop: `1px solid ${C.cardBdr}`, margin: '0 0 14px' }} />
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: C.textMuted, marginBottom: 4 }}>DEFINITION</div>
            <p style={{ fontSize: 14, color: C.textDark, lineHeight: 1.65, margin: '0 0 14px' }}>{defPanel.definition}</p>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: C.textMuted, marginBottom: 4 }}>IN CONTEXT</div>
            <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.65, margin: '0 0 14px', fontStyle: 'italic' }}>&ldquo;{defPanel.contextual_usage}&rdquo;</p>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: C.textMuted, marginBottom: 4 }}>TRANSLATION (FILIPINO)</div>
            <p style={{ fontSize: 13, color: C.textMid, margin: '0 0 22px' }}>{defPanel.translation}</p>
            <button onClick={() => setDefPanel(null)} style={{ ...btnPrimary, width: '100%', textAlign: 'center' }}>Got it — Continue</button>
          </div>
        </div>
      )}

      {/* ── Hint overlay ── */}
      {hintOverlay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.52)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', padding: 28, pointerEvents: 'none' }}>
          <div style={{ background: C.cardPaper, border: `2px solid ${C.cardBdr}`, borderRadius: 8, padding: '18px 20px 16px', maxWidth: 280, boxShadow: '0 8px 28px rgba(0,0,0,0.4)', pointerEvents: 'all' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: C.accentRed, marginBottom: 10, fontFamily: FONT }}>
              SCAFFOLD HINT{hintOverlayTier > 0 ? ` — TIER ${hintOverlayTier}` : ''}
            </div>
            <p style={{ fontSize: 14, color: C.textDark, lineHeight: 1.7, margin: '0 0 16px', fontFamily: FONT }}>{hintOverlayText}</p>
            <button onClick={() => setHintOverlay(false)} style={{ fontSize: 12, fontWeight: 700, color: C.textDark, background: C.btnGold, border: `1px solid ${C.btnGoldBdr}`, padding: '7px 18px', cursor: 'pointer', fontFamily: FONT, letterSpacing: '0.06em', borderRadius: 6 }}>Close</button>
          </div>
        </div>
      )}

      {/* ── Feedback drawer ── */}
      {drawer && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#2A1200', border: `2px solid ${C.btnGoldBdr}`, borderBottom: 'none', padding: '22px 36px 30px', zIndex: 200, maxHeight: 280, overflowY: 'auto', fontFamily: FONT }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', color: C.btnGold, border: `1.5px solid ${C.btnGold}`, padding: '4px 16px', borderRadius: 2 }}>FEEDBACK</div>
            <button onClick={() => { setDrawer(false); resetTimer() }} style={{ background: 'none', border: 'none', color: C.btnGold, fontSize: 20, cursor: 'pointer', fontFamily: FONT }}>✕</button>
          </div>
          <p style={{ fontSize: 15, color: C.canvas, lineHeight: 1.75, marginBottom: 18, fontFamily: FONT }}>{fbText}</p>
          <button style={{ padding: '10px 22px', background: 'transparent', border: `1px solid ${C.btnGoldBdr}`, borderRadius: 3, color: C.textLight, fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}
            onClick={() => { setDrawer(false); resetTimer() }}>
            Close and reattempt
          </button>
        </div>
      )}
    </div>
  )
}