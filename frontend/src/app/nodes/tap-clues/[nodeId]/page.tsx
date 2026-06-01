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

// ── Color Palette ─────────────────────────────────
const C = {
  pageBg:      '#2D0909',
  sidebarBg:   '#6F1D1B',
  mainBg:      '#F4E6CC',
  passageBg:   '#FFFFFF',
  rightBg:     '#E6DCC6',
  cardBg:      '#FAF5EC',
  accent:      '#800020',
  gold:        '#C49A5A',
  goldDark:    '#8C5A3C',
  darkBrown:   '#2d1000',
  medBrown:    '#774E24',
  textMuted:   '#7a5c3a',
  cream:       '#F4E6CC',
  green:       '#5B6B4A',
  btnBg:       '#FFE6A7',
  btnBorder:   '#C49A5A',
  border:      '#C49A5A',
  borderLight: '#DDD0B8',
  stampRed:    '#800020',
  stampGreen:  '#5B6B4A',
}

// ── Types ──────────────────────────────────────
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

type Phase = 'loading' | 'micro_lesson' | 'deep_dive'
           | 'task'    | 'mastery'      | 'error'

const TAP_CLUES_TUTORIAL_KEY =
  'critica_tutorial_seen_tap_clues_first_node'

const TUTORIAL_STEPS = [
  {
    label: 'Overview',
    code: 'TUT-TTC-001',
    text: 'In Tap the Clues, a target word in the passage is locked. Its meaning is hidden. Your job is to find surrounding words that implicitly reveal its definition, then tap them to fill the Found Clues Tracker.',
    board: 'target',
    notes: [
      'Gold underline = target word',
      'Teal highlight = your clue',
      'Locked stamp = not yet solved',
    ],
  },
  {
    label: 'Find clues',
    code: 'TUT-TTC-002',
    text: 'Look for words that indirectly describe the target word. Think about synonyms, cause-effect, or tone clues. Words like command, dismissing, and imperious all hint at meaning even if they are not direct definitions.',
    board: 'strongWeak',
    notes: [
      'Strong clues match the meaning',
      'Weak clues are too general',
      'Need 3-4 strong clues',
    ],
  },
  {
    label: 'Tap words',
    code: 'TUT-TTC-003',
    text: 'Click any word in the passage to add it as a clue. It highlights teal and fills a slot in the Found Clues Tracker on the right. Fill all 4 slots before you can submit. You cannot tap the target word itself.',
    board: 'tracker',
    notes: [
      'Slot fills on each tap',
      'Tap filled slot to remove',
      '4 slots total to fill',
    ],
  },
  {
    label: 'Unlock word',
    code: 'TUT-TTC-004',
    text: 'With all clue slots filled, hit Submit Clues. If your clues are strong enough, the LOCKED stamp becomes UNLOCKED and the definition is revealed. Weak clues trigger a retry with a hint about what to look for.',
    board: 'unlock',
    notes: [
      'Stamp flips to OPEN',
      'Weak clues = retry + hint',
      'Definition revealed on unlock',
    ],
  },
] as const

// ── Font ─────────────────────────────────────────
const FONT = "'Courier New', Courier, monospace"

// ── Shared style atoms ────────────────────────────
const S = {
  stamp: {
    display:       'inline-block',
    border:        `2px solid ${C.stampRed}`,
    padding:       '3px 14px',
    fontSize:      10,
    fontWeight:    700,
    letterSpacing: '0.15em',
    color:         C.stampRed,
    marginBottom:  12,
    fontFamily:    FONT,
    borderRadius:  2,
  } as React.CSSProperties,
  btnPrimary: {
    padding:       '10px 24px',
    background:    C.btnBg,
    border:        `2px solid ${C.btnBorder}`,
    borderRadius:  2,
    color:         C.darkBrown,
    fontFamily:    FONT,
    fontSize:      11,
    fontWeight:    700,
    cursor:        'pointer',
    letterSpacing: '0.08em',
  } as React.CSSProperties,
  btnSm: {
    padding:      '7px 16px',
    background:   'transparent',
    border:       `1px solid ${C.goldDark}`,
    borderRadius: 2,
    color:        C.goldDark,
    fontFamily:   FONT,
    fontSize:     10,
    fontWeight:   700,
    cursor:       'pointer',
  } as React.CSSProperties,
  tutorialBtn: {
    padding:       '7px 14px',
    background:    C.btnBg,
    border:        `1px solid ${C.btnBorder}`,
    borderRadius:  2,
    color:         C.darkBrown,
    fontFamily:    FONT,
    fontSize:      10,
    fontWeight:    700,
    letterSpacing: '0.08em',
    cursor:        'pointer',
  } as React.CSSProperties,
}

// ── Sub-screens ─────────────────────────────────

function LoadScreen() {
  return (
    <div style={{
      minHeight: '100vh', background: C.pageBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT, color: C.cream, fontSize: 13, letterSpacing: '0.1em',
    }}>
      LOADING NODE...
    </div>
  )
}

function ErrorScreen({ msg, onBack }: { msg: string; onBack: () => void }) {
  return (
    <div style={{
      minHeight: '100vh', background: C.pageBg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT, gap: 16,
    }}>
      <p style={{ color: '#ff6b6b', fontSize: 13 }}>{msg}</p>
      <button onClick={onBack} style={S.btnSm}>← DASHBOARD</button>
    </div>
  )
}

function LessonScreen({ node, onContinue }: { node: TapNodeData; onContinue: () => void }) {
  return (
    <div style={{
      minHeight: '100vh', background: C.pageBg,
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 40, fontFamily: FONT,
    }}>
      <div style={{
        maxWidth: 640, width: '100%', background: C.cardBg,
        border: `2px solid ${C.border}`, borderRadius: 4, padding: 48,
        boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
      }}>
        <div style={{ ...S.stamp, marginBottom: 16 }}>MICRO-LESSON</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.darkBrown, margin: '0 0 6px', fontFamily: FONT }}>
          {node.title}
        </h2>
        <p style={{ fontSize: 12, color: C.textMuted, margin: '0 0 16px', fontFamily: FONT }}>
          {node.focus}
        </p>
        <hr style={{ border: 'none', borderTop: `1px solid ${C.borderLight}`, margin: '16px 0' }} />
        <p style={{ fontSize: 14, lineHeight: 1.85, color: C.darkBrown, margin: '0 0 32px', fontFamily: FONT }}>
          {node.micro_lesson_text}
        </p>
        <button onClick={onContinue} style={S.btnPrimary}>Continue →</button>
      </div>
    </div>
  )
}

function DeepDiveScreen({ node, onContinue }: { node: TapNodeData; onContinue: () => void }) {
  return (
    <div style={{
      minHeight: '100vh', background: C.pageBg,
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 40, fontFamily: FONT,
    }}>
      <div style={{
        maxWidth: 700, width: '100%', background: C.cardBg,
        border: `2px solid ${C.border}`, borderRadius: 4, padding: 48,
        boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
      }}>
        <div style={{ ...S.stamp, marginBottom: 16 }}>DEEP DIVE READING</div>
        <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 20px', lineHeight: 1.7, fontFamily: FONT }}>
          Read the full passage carefully. Do not skip — cognitive endurance is part of the exercise.
        </p>
        <p style={{
          fontSize: 14, lineHeight: 1.95, color: C.darkBrown, background: C.rightBg,
          border: `1px solid ${C.borderLight}`, borderRadius: 4, padding: 28,
          margin: '0 0 32px', fontFamily: FONT,
        }}>
          {node.reading_passage}
        </p>
        <button onClick={onContinue} style={S.btnPrimary}>I have finished reading →</button>
      </div>
    </div>
  )
}

function MasteryScreen({
  node, data, onDashboard, onNext,
}: { node: TapNodeData; data: any; onDashboard: () => void; onNext: () => void }) {
  return (
    <div style={{
      minHeight: '100vh', background: C.pageBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT,
    }}>
      <div style={{
        maxWidth: 480, width: '100%', background: C.cardBg,
        border: `2px solid ${C.green}`, borderRadius: 4, padding: 52, textAlign: 'center',
        boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
      }}>
        <div style={{ ...S.stamp, color: C.green, borderColor: C.green, fontSize: 16, padding: '8px 24px' }}>
          ✓ NODE MASTERED
        </div>
        <h2 style={{ fontSize: 20, color: C.green, margin: '8px 0 16px', fontFamily: FONT }}>
          {node.title}
        </h2>
        <p style={{ fontSize: 12, color: C.textMuted, margin: '0 0 28px', fontFamily: FONT }}>
          Streak: {data?.streak ?? 0} days
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {data?.next_node && (
            <button onClick={onNext} style={S.btnPrimary}>NEXT NODE →</button>
          )}
          <button onClick={onDashboard} style={S.btnSm}>← DASHBOARD</button>
        </div>
      </div>
    </div>
  )
}

// ── Tutorial Popup ──────────────────────────────
function TapCluesTutorialPopup({
  open,
  step,
  onBack,
  onNext,
  onClose,
  onStart,
}: {
  open:    boolean
  step:    number
  onBack:  () => void
  onNext:  () => void
  onClose: () => void
  onStart: () => void
}) {
  if (!open) return null

  const current = TUTORIAL_STEPS[step]
  const isFirst = step === 0
  const isLast  = step === TUTORIAL_STEPS.length - 1

  const stepCard = (label: string, index: number) => {
    const complete = index < step
    const active   = index === step
    return (
      <div key={label} style={{
        width: 156, height: 76,
        border: `1px solid ${C.border}`,
        background: complete ? '#d0e8d4' : active ? C.cardBg : C.rightBg,
        color: C.darkBrown,
        boxShadow: active ? '0 3px 0 rgba(67,40,24,0.25)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', textAlign: 'center',
        fontFamily: FONT, fontSize: 12, fontWeight: 700,
      }}>
        <div style={{ position: 'absolute', top: 7, left: '50%', transform: 'translateX(-50%)' }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: complete ? C.green : active ? C.gold : C.borderLight,
            color: complete ? '#fff' : C.darkBrown,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700,
          }}>{complete ? '✓' : index + 1}</div>
        </div>
        <span style={{ marginTop: 20, lineHeight: 1.15 }}>{label}</span>
      </div>
    )
  }

  const renderBoard = () => {
    if (current.board === 'target') {
      return (
        <div style={{ padding: '16px 14px 12px' }}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 12, letterSpacing: '0.1em' }}>THE TARGET WORD</div>
          <div style={{ fontFamily: FONT, fontSize: 18, lineHeight: 1.55, color: C.darkBrown, wordSpacing: '0.12em' }}>
            A tone of{' '}
            <span style={{ color: C.gold, fontWeight: 700, textDecoration: 'underline' }}>peremptory</span>
            {' '}authority is often associated with those who{' '}
            <span style={{ color: C.green, fontWeight: 700 }}>command</span>
            {' '}without question.
          </div>
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'inline-block', transform: 'rotate(-8deg)',
              color: C.stampRed, border: `1px solid ${C.stampRed}`,
              borderRadius: '50%', padding: '8px 10px',
              fontSize: 12, fontWeight: 700, fontFamily: FONT,
            }}>LOCKED</span>
            <span style={{ fontSize: 13, color: C.darkBrown, fontFamily: FONT }}>→ tap clues to unlock</span>
          </div>
        </div>
      )
    }

    if (current.board === 'strongWeak') {
      return (
        <div style={{ padding: '16px 14px 12px' }}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 12, letterSpacing: '0.1em' }}>STRONG VS WEAK CLUES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ padding: '8px 10px', border: `1px solid ${C.green}`, background: '#e8f0e8', color: C.green, fontFamily: FONT, fontSize: 12, fontWeight: 700, lineHeight: 1.35 }}>
              Strong: "command", "imperious", "dismissing" signal authority/abruptness
            </div>
            <div style={{ padding: '8px 10px', border: `1px solid ${C.border}`, background: C.rightBg, color: C.textMuted, fontFamily: FONT, fontSize: 12, fontWeight: 700, lineHeight: 1.35 }}>
              Weak: "tone", "often", "those" too generic, no semantic link
            </div>
          </div>
        </div>
      )
    }

    if (current.board === 'tracker') {
      return (
        <div style={{ padding: '16px 14px 12px' }}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 12, letterSpacing: '0.1em' }}>FOUND CLUES TRACKER</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: FONT, fontSize: 12, color: C.darkBrown }}>
            <div><span style={{ color: C.green, fontWeight: 700 }}>[1]</span> command — signals ordering without discussion</div>
            <div><span style={{ color: C.green, fontWeight: 700 }}>[2]</span> imperious — near-synonym</div>
            <div><span style={{ fontWeight: 700, color: C.textMuted }}>[3]</span> - TAP A WORD -</div>
          </div>
        </div>
      )
    }

    return (
      <div style={{ padding: '16px 14px 12px' }}>
        <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 12, letterSpacing: '0.1em' }}>LOCK STATE CHANGE</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: FONT, fontSize: 13, color: C.darkBrown }}>
          <span style={{ color: C.stampRed, border: `1px solid ${C.stampRed}`, borderRadius: '50%', padding: '8px 10px', transform: 'rotate(-6deg)', fontWeight: 700 }}>LOCKED</span>
          <span>→</span>
          <span style={{ color: C.stampGreen, border: `1px solid ${C.green}`, borderRadius: '50%', padding: '8px 8px', transform: 'rotate(6deg)', fontWeight: 700 }}>UNLOCKED</span>
        </div>
        <div style={{ display: 'flex', gap: 34, marginTop: 14, fontFamily: FONT, fontSize: 11, color: C.textMuted }}>
          <div>before submit</div>
          <div>after unlock</div>
        </div>
      </div>
    )
  }

  const primaryLabel   = isLast ? 'START TRAINING →' : 'NEXT →'
  const secondaryLabel = isFirst ? 'EXIT TUTORIAL' : 'BACK'

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(67,40,24,0.75)',
      zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: FONT,
    }}>
      <div style={{
        width: '100%', maxWidth: 840,
        background: C.mainBg,
        border: `2px solid ${C.border}`,
        boxShadow: '0 18px 56px rgba(0,0,0,0.5)',
        padding: '10px 14px 14px',
        borderRadius: 4,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.22em', color: C.accent }}>CRITICA — FIELD BRIEFING</div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', color: C.textMuted }}>{current.code}</div>
        </div>

        <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 4, padding: '28px 22px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginBottom: 28 }}>
            <div style={{ width: 120, textAlign: 'center', flexShrink: 0 }}>
              <div style={{
                width: 56, height: 56, border: `2px solid ${C.border}`,
                background: C.rightBg, margin: '0 auto 8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2,
              }}>
                <div style={{ width: 34, height: 34, background: C.goldDark, borderRadius: 4, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', background: C.cream }} />
                  <div style={{ position: 'absolute', bottom: 6, left: 5, right: 5, height: 10, borderRadius: '10px 10px 4px 4px', background: C.cream }} />
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', color: C.darkBrown }}>AGENT CRIT</div>
              <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: '0.06em' }}>FIELD INSTRUCTOR</div>
            </div>

            <div style={{ position: 'relative', flex: 1, background: C.passageBg, border: `1px solid ${C.border}`, boxShadow: '0 3px 10px rgba(67,40,24,0.15)', padding: '12px 16px', minHeight: 96 }}>
              <div style={{ position: 'absolute', left: -9, top: 38, width: 18, height: 18, background: C.passageBg, borderLeft: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, transform: 'rotate(45deg)' }} />
              <div style={{ fontSize: 13, lineHeight: 1.45, color: C.darkBrown, whiteSpace: 'pre-line' }}>{current.text}</div>
            </div>
          </div>

          <div style={{ border: `1px solid ${C.borderLight}`, background: C.rightBg, padding: 10, marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              {TUTORIAL_STEPS.map((stepItem, index) => stepCard(stepItem.label, index))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', background: C.rightBg, border: `1px solid ${C.borderLight}`, padding: 14 }}>
            <div style={{ flex: 1, minHeight: 200, background: C.passageBg, border: `1px solid ${C.borderLight}`, padding: 18 }}>
              {renderBoard()}
            </div>
            <div style={{ width: 112, background: C.passageBg, border: `1px solid ${C.borderLight}`, padding: '10px 10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: C.accent, marginBottom: 10 }}>QUICK NOTES</div>
              {current.notes.map((note, index) => (
                <div key={note} style={{ fontSize: 9, lineHeight: 1.45, color: C.darkBrown }}>
                  {note}
                  {index < current.notes.length - 1 && <div style={{ height: 10 }} />}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 }}>
            <button onClick={isFirst ? onClose : onBack} style={{ ...S.btnSm, minWidth: 160 }}>
              {secondaryLabel}
            </button>
            <button onClick={isLast ? onStart : onNext} style={{ ...S.btnPrimary, minWidth: 170 }}>
              {primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helper: split passage into word tokens ──────
function tokenizePassage(
  passage:     string,
  lockedWords: LockedWordMeta[],
): { text: string; isLocked: boolean; word_id?: string; idx: number }[] {
  const tokens: { text: string; isLocked: boolean; word_id?: string; idx: number }[] = []
  const words = passage.split(/(\s+)/)
  let wordIdx = 0

  words.forEach(chunk => {
    if (/^\s+$/.test(chunk)) {
      tokens.push({ text: chunk, isLocked: false, idx: -1 })
      return
    }
    const clean  = chunk.replace(/[^a-zA-Z']/g, '').toLowerCase()
    const locked = lockedWords.find(
      lw => lw.position_index === wordIdx || lw.word.toLowerCase() === clean,
    )
    tokens.push({ text: chunk, isLocked: !!locked, word_id: locked?.word_id, idx: wordIdx })
    wordIdx++
  })

  return tokens
}

// ── Main component ──────────────────────────────
export default function TapCluesPage() {
  const router = useRouter()
  const params = useParams()
  const nodeId = params.nodeId as string

  const [phase,       setPhase]       = useState<Phase>('loading')
  const [tapNode,     setTapNode]     = useState<TapNodeData | null>(null)
  const [errorMsg,    setErrorMsg]    = useState('')

  const [activeWordId,   setActiveWordId]   = useState<string | null>(null)
  const [foundClues,     setFoundClues]     = useState<Record<string, string[]>>({})
  const [unlockedWords,  setUnlockedWords]  = useState<string[]>([])
  const [defPanel,       setDefPanel]       = useState<DefinitionPanel | null>(null)
  const [pulseClue,      setPulseClue]      = useState<string | null>(null)
  const [masteryData,    setMasteryData]    = useState<any>(null)
  const [submitting,     setSubmitting]     = useState(false)
  const [wrongs,         setWrongs]         = useState(0)

  // session state
  const [sessionQueue,   setSessionQueue]   = useState<string[]>([])
  const [questionIndex,  setQuestionIndex]  = useState(0)
  const [sessionStartId, setSessionStartId] = useState<string | null>(null)
  const [savedNextNode,  setSavedNextNode]  = useState<string | null>(null)
  const [savedStreak,    setSavedStreak]    = useState<number | null>(null)

  // ── Load a question inline ──────────────────
  const loadQuestion = useCallback(async (targetNodeId: string) => {
    setPhase('loading')
    try {
      const d = await apiFetch(`/nodes/tap-clues/${targetNodeId}/`)
      setTapNode(d)
      setActiveWordId(null)
      setFoundClues({})
      setUnlockedWords([])
      setDefPanel(null)
      setPulseClue(null)
      setWrongs(0)
      setFbText('')
      setDrawer(false)
      setHintOverlay(false)
      setHintOverlayText('')
      setHintOverlayTier(0)
      setPhase('task')
    } catch (e: any) {
      setErrorMsg(e?.error ?? 'Failed to load next question.')
      setPhase('error')
    }
  }, [])

  const [fbText,        setFbText]        = useState('')
  const [drawer,        setDrawer]        = useState(false)
  const [tutorialOpen,  setTutorialOpen]  = useState(false)
  const [tutorialStep,  setTutorialStep]  = useState(0)

  const [hintOverlay,     setHintOverlay]     = useState(false)
  const [hintOverlayText, setHintOverlayText] = useState('')
  const [hintOverlayTier, setHintOverlayTier] = useState(0)

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const inactiveRef = useRef(0)

  // ── Load node ──────────────────────────────
  useEffect(() => {
    const start = nodeId
    setSessionStartId(start)
    const saved = loadSession('tap_clues', start)

    if (saved && saved.sessionQueue.length === 5) {
      setSessionQueue(saved.sessionQueue)
      setQuestionIndex(saved.questionIndex)
      if (saved.next_node) setSavedNextNode(saved.next_node)
      if (saved.streak !== undefined) setSavedStreak(saved.streak)

      const activeId = saved.sessionQueue[saved.questionIndex] ?? start
      apiFetch(`/nodes/tap-clues/${activeId}/`)
        .then((d: TapNodeData) => {
          setTapNode(d)
          setPhase('task')
        })
        .catch((e: any) => {
          if (e?.status === 401)              { router.push('/auth');      return }
          if (e?.error === 'Node is locked.') { router.push('/dashboard'); return }
          setErrorMsg(e?.error ?? 'Failed to load node.')
          setPhase('error')
        })
    } else {
      apiFetch(`/nodes/tap-clues/${start}/`)
        .then((d: TapNodeData) => {
          setTapNode(d)
          setPhase('micro_lesson')

          apiFetch('/progression/dashboard/')
            .then((prog: any) => {
              const unlocked: string[] = prog.unlocked_nodes ?? []
              const queue = buildSessionQueue('tap_clues', start, unlocked)
              setSessionQueue(queue)
              setQuestionIndex(0)
              saveSession('tap_clues', start, {
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
  }, [nodeId, router])

  useEffect(() => {
    if (phase !== 'task' || nodeId !== 'tap_node_01') return

    const seen = localStorage.getItem(TAP_CLUES_TUTORIAL_KEY)
    if (seen === '1') return

    localStorage.setItem(TAP_CLUES_TUTORIAL_KEY, '1')
    setTutorialStep(0)
    setTutorialOpen(true)
  }, [phase, nodeId])

  // ── Fetch feedback ─────────────────────────
  const callFeedback = useCallback(async (
    word_id:    string,
    clue_word:  string,
    inactivity: boolean,
  ) => {
    const activeNodeId = tapNode?.node_id ?? nodeId
    try {
      const res = await apiFetch(`/nodes/tap-clues/${activeNodeId}/feedback/`, {
        method: 'POST',
        body: JSON.stringify({
          word_id,
          clue_word,
          inactivity_seconds: inactivity ? 60 : inactiveRef.current,
        }),
      })
      setFbText(res.explanation ?? 'That word is not a valid context clue.')
      setDrawer(true)
    } catch {
      setFbText('That word is not a valid context clue. Look for synonyms or definitions nearby.')
      setDrawer(true)
    }
  }, [nodeId, tapNode])

  // ── Fetch hint ─────────────────────────────
  const fetchHint = useCallback(async (isInactivity = false) => {
    const activeNodeId = tapNode?.node_id ?? nodeId
    try {
      const res = await apiFetch(`/nodes/tap-clues/${activeNodeId}/feedback/`, {
        method: 'POST',
        body: JSON.stringify({
          word_id:            activeWordId ?? '',
          clue_word:          '',
          inactivity_seconds: 61,
        }),
      })
      const text = res.hint || res.explanation || 'Look for words near the locked word that hint at its meaning.'
      setHintOverlayText(text)
      setHintOverlayTier(res.hint_tier ?? 0)
      setHintOverlay(true)
    } catch {
      setHintOverlayText('Look for words near the locked word that hint at its meaning.')
      setHintOverlay(true)
    }
  }, [nodeId, activeWordId, tapNode])

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
  }, [fetchHint])

  useEffect(() => {
    if (phase === 'task') resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, resetTimer])

  // ── Log word to lexical deck ───────────────
  const logWordToLexical = useCallback(async (
    word:             string,
    definition:       string,
    contextual_usage: string,
    translation:      string,
  ) => {
    const activeNodeId = tapNode?.node_id ?? nodeId
    try {
      await apiFetch('/lexical/log/', {
        method: 'POST',
        body: JSON.stringify({
          word_data: { word, definition, contextual_usage, translation },
          task_id: activeNodeId,
        }),
      })
    } catch {
      console.warn('Lexical log failed silently')
    }
  }, [nodeId, tapNode])

  // ── Handle tap on a word span ──────────────
  const handleWordTap = async (
    word:  string,
    token: { text: string; isLocked: boolean; word_id?: string; idx: number },
  ) => {
    if (!tapNode) return
    resetTimer()

    if (!activeWordId) {
      if (token.isLocked && token.word_id && !unlockedWords.includes(token.word_id)) {
        setActiveWordId(token.word_id)
      }
      return
    }

    if (token.isLocked && token.word_id && token.word_id !== activeWordId
        && !unlockedWords.includes(token.word_id)) {
      setActiveWordId(token.word_id)
      return
    }

    if (token.isLocked && token.word_id === activeWordId) {
      setActiveWordId(null)
      return
    }

    if (!token.isLocked) {
      const cleanWord = word.replace(/[^a-zA-Z']/g, '').toLowerCase()
      if (!cleanWord) return
      const currentFound = foundClues[activeWordId] ?? []

      try {
        const res = await apiFetch(`/nodes/tap-clues/${tapNode.node_id}/evaluate-clue/`, {
          method: 'POST',
          body: JSON.stringify({
            word_id:     activeWordId,
            clue_word:   cleanWord,
            found_clues: currentFound,
          }),
        })

        if (res.result === 'correct') {
          setPulseClue(cleanWord)
          setTimeout(() => setPulseClue(null), 600)

          if (res.all_clues_found) {
            setUnlockedWords(prev => [...prev, activeWordId])
            setDefPanel({
              word_id:          activeWordId,
              word:             res.word,
              definition:       res.definition,
              contextual_usage: res.contextual_usage,
              translation:      res.translation,
            })
            setFoundClues(prev => ({ ...prev, [activeWordId]: res.found_clues }))
            setActiveWordId(null)
            await logWordToLexical(res.word, res.definition, res.contextual_usage, res.translation)
          } else {
            setFoundClues(prev => ({ ...prev, [activeWordId]: res.found_clues }))
          }
        } else {
          const nextWrongs = wrongs + 1
          setWrongs(nextWrongs)
          await callFeedback(activeWordId, cleanWord, false)
          if (nextWrongs >= 3) fetchHint()
        }
      } catch {
        setErrorMsg('Evaluation failed.')
      }
    }
  }

  // ── Submit mastery ─────────────────────────
  const handleSubmitMastery = async () => {
    if (!tapNode || submitting) return
    setSubmitting(true)
    try {
      const res = await apiFetch(`/nodes/tap-clues/${tapNode.node_id}/mastery/`, {
        method: 'POST',
        body: JSON.stringify({
          unlocked_word_ids: unlockedWords,
          save_progression: false,
        }),
      })
      if (res.status === 'mastered') {
        const nextIdx = questionIndex + 1

        if (nextIdx < sessionQueue.length) {
          const newNextNode = savedNextNode
          const newStreak = savedStreak

          if (sessionStartId) {
            saveSession('tap_clues', sessionStartId, {
              sessionQueue,
              questionIndex: nextIdx,
              next_node: newNextNode || undefined,
              streak: newStreak !== null ? newStreak : undefined,
            })
          }
          setQuestionIndex(nextIdx)
          loadQuestion(sessionQueue[nextIdx])
        } else {
          let finalRes = res
          if (sessionStartId) {
            finalRes = await apiFetch(
              `/nodes/tap-clues/${sessionStartId}/mastery/`,
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

          if (sessionStartId) clearSession('tap_clues', sessionStartId)
          setMasteryData({
            next_node: newNextNode,
            streak: newStreak,
          })
          setPhase('mastery')
        }
      }
    } catch (e: any) {
      setFbText(
        e?.status === 'incomplete'
          ? 'Some words are still locked. Tap them to find their clues.'
          : 'Submission failed. Please try again.',
      )
      setDrawer(true)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Phase guards ───────────────────────────
  if (phase === 'loading')      return <LoadScreen />
  if (phase === 'error')        return <ErrorScreen msg={errorMsg} onBack={() => router.push('/dashboard')} />
  if (phase === 'micro_lesson') return <LessonScreen node={tapNode!} onContinue={() => setPhase(tapNode?.deep_dive_required ? 'deep_dive' : 'task')} />
  if (phase === 'deep_dive')    return <DeepDiveScreen node={tapNode!} onContinue={() => setPhase('task')} />
  if (phase === 'mastery')      return (
    <MasteryScreen
      node={tapNode!}
      data={masteryData}
      onDashboard={() => router.push('/dashboard')}
      onNext={() => masteryData?.next_node && router.push(`/nodes/tap-clues/${masteryData.next_node}`)}
    />
  )

  // ── TASK PHASE ─────────────────────────────
  const tokens      = tokenizePassage(tapNode!.reading_passage, tapNode!.locked_words)
  const allUnlocked = unlockedWords.length === tapNode!.locked_words.length

  const openTutorial = () => {
    setTutorialStep(0)
    setTutorialOpen(true)
  }

  const activeWordMeta = tapNode!.locked_words.find(lw => lw.word_id === activeWordId)
  const activeClues    = activeWordId ? (foundClues[activeWordId] ?? []) : []
  const MAX_CLUES      = 4

  return (
    <div style={{
      minHeight: '100vh',
      background: C.pageBg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: FONT,
      padding: '24px 0',
    }}>
      {/* ── CARD ── */}
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        boxShadow: '0 16px 64px rgba(0,0,0,0.6)',
        borderRadius: 6,
        border: `2px solid ${C.goldDark}`,
        overflow: 'hidden',
        maxWidth: 1080,
        width: '96vw',
        minHeight: 620,
      }}>

        {/* ── LEFT SIDEBAR ── */}
        <div style={{
          width: 44, background: C.sidebarBg,
          display: 'flex', flexDirection: 'column',
          alignItems: 'flex-start', justifyContent: 'flex-start',
          gap: 8, padding: '20px 0',
          borderRight: `1px solid ${C.goldDark}`,
        }}>
          <button
            title="Get a hint"
            onClick={() => fetchHint()}
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.14em', color: C.darkBrown,
              background: C.btnBg,
              border: `1px solid ${C.btnBorder}`,
              borderLeft: 'none',
              borderRadius: '0 4px 4px 0',
              cursor: 'pointer', padding: '12px 7px',
              fontFamily: FONT, transition: 'background 0.15s',
              boxShadow: '2px 1px 5px rgba(0,0,0,0.22)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = C.cream)}
            onMouseLeave={e => (e.currentTarget.style.background = C.btnBg)}
          >
            HINT
          </button>
          <button
            title="End session"
            onClick={() => {
              if (sessionStartId && sessionQueue.length > 0) {
                saveSession('tap_clues', sessionStartId, {
                  sessionQueue,
                  questionIndex,
                  next_node: savedNextNode || undefined,
                  streak: savedStreak !== null ? savedStreak : undefined,
                })
              }
              router.push('/dashboard')
            }}
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.14em', color: C.darkBrown,
              background: C.btnBg,
              border: `1px solid ${C.btnBorder}`,
              borderLeft: 'none',
              borderRadius: '0 4px 4px 0',
              cursor: 'pointer', padding: '12px 7px',
              fontFamily: FONT, transition: 'background 0.15s',
              boxShadow: '2px 1px 5px rgba(0,0,0,0.22)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = C.cream)}
            onMouseLeave={e => (e.currentTarget.style.background = C.btnBg)}
          >
            END SESSION
          </button>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{
          flex: 1,
          background: C.mainBg,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>

          {/* ── HEADER STRIP ── */}
          <div style={{
            background: C.sidebarBg,
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `2px solid ${C.goldDark}`,
          }}>
            <div style={{
              fontSize: 13, fontWeight: 700,
              letterSpacing: '0.18em',
              color: C.cream, fontFamily: FONT,
            }}>
              TASK: <span style={{ color: C.gold }}>HIGHLIGHT THE CLUES</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: DIFFICULTY_COLORS[tapNode!.difficulty ?? nodeDifficulty(nodeId)] }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: C.cream, fontFamily: FONT }}>
                  LVL {tapNode!.difficulty ?? nodeDifficulty(nodeId)} — {DIFFICULTY_LABELS[tapNode!.difficulty ?? nodeDifficulty(nodeId)]}
                </span>
              </div>
              {sessionQueue.length > 0 && (
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: C.cream, fontFamily: FONT }}>
                  Q {questionIndex + 1} / {sessionQueue.length}
                </span>
              )}
            </div>
          </div>

          {/* ── PROGRESS BAR ── */}
          {sessionQueue.length > 0 && (
            <div style={{ height: 5, background: C.rightBg }}>
              <div style={{
                height: '100%',
                width: `${(questionIndex / sessionQueue.length) * 100}%`,
                background: C.gold,
                transition: 'width 0.3s ease-in-out',
              }} />
            </div>
          )}

          {/* ── WORD PROGRESS DOTS ── */}
          <div style={{ padding: '8px 20px 6px', display: 'flex', gap: 8, alignItems: 'center' }}>
            {tapNode!.locked_words.map(lw => (
              <div key={lw.word_id} style={{
                height: 6, borderRadius: 3, flex: 1,
                background:
                  unlockedWords.includes(lw.word_id) ? C.green
                  : activeWordId === lw.word_id       ? C.gold
                  : C.borderLight,
                transition: 'background 0.3s',
              }} />
            ))}
            <span style={{ fontSize: 9, color: C.textMuted, fontFamily: FONT, letterSpacing: '0.08em', whiteSpace: 'nowrap', marginLeft: 8 }}>
              {unlockedWords.length} / {tapNode!.locked_words.length} UNLOCKED
            </span>
          </div>

          {/* ── TWO-COLUMN CONTENT ── */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* ── LEFT: PASSAGE ── */}
            <div style={{
              flex: 1,
              padding: '14px 20px 16px',
              display: 'flex',
              flexDirection: 'column',
              borderRight: `1px solid ${C.borderLight}`,
              overflowY: 'auto',
            }}>
              <div style={{
                fontSize: 10, color: C.accent, fontFamily: FONT,
                letterSpacing: '0.1em', fontWeight: 700,
                marginBottom: 10, textAlign: 'center',
              }}>
                {activeWordId
                  ? `FINDING CLUES FOR: "${activeWordMeta?.word.toUpperCase()}" — TAP SURROUNDING WORDS`
                  : allUnlocked
                  ? 'ALL WORDS UNLOCKED — SUBMIT TO COMPLETE'
                  : 'TAP A HIGHLIGHTED WORD TO BEGIN'}
              </div>

              <div style={{
                background: C.passageBg,
                border: `1px solid ${C.borderLight}`,
                borderRadius: 3,
                padding: '24px 28px',
                fontSize: 16,
                lineHeight: 2.1,
                color: C.darkBrown,
                fontFamily: FONT,
                flex: 1,
                boxShadow: '0 2px 12px rgba(67,40,24,0.10)',
              }}>
                {tokens.map((token, i) => {
                  if (/^\s+$/.test(token.text)) {
                    return <span key={i}>{token.text}</span>
                  }

                  const isLocked   = token.isLocked
                  const wordId     = token.word_id
                  const isUnlocked = wordId ? unlockedWords.includes(wordId) : false
                  const isActive   = wordId ? activeWordId === wordId : false
                  const cleanWord  = token.text.replace(/[^a-zA-Z']/g, '').toLowerCase()
                  const isPulse    = pulseClue === cleanWord

                  let color      = C.darkBrown
                  let bg         = 'transparent'
                  let border     = 'none'
                  let fontWeight = 400
                  let cursor     = 'pointer'
                  let textDecor  = 'none'

                  if (isLocked && isUnlocked) {
                    color = C.green; fontWeight = 700; textDecor = 'underline'; cursor = 'pointer'
                  } else if (isLocked && isActive) {
                    color = C.goldDark; bg = 'rgba(196,154,90,0.18)'; border = `1.5px solid ${C.gold}`; fontWeight = 700; cursor = 'pointer'
                  } else if (isLocked) {
                    color = C.gold; fontWeight = 700; textDecor = 'underline'; cursor = 'pointer'
                  } else if (activeWordId && !isLocked) {
                    cursor = 'pointer'
                    if (isPulse) { bg = 'rgba(91,107,74,0.25)'; border = `1.5px solid ${C.green}`; color = C.green }
                  }

                  return (
                    <span
                      key={i}
                      onClick={() => handleWordTap(token.text, token)}
                      style={{
                        color, background: bg, border,
                        borderRadius: border !== 'none' ? 2 : 0,
                        fontWeight, cursor, textDecoration: textDecor,
                        padding: border !== 'none' ? '0 3px' : '0',
                        transition: 'all 0.2s', display: 'inline',
                      }}
                    >
                      {token.text}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* ── RIGHT: CLUE CARD ── */}
            <div style={{
              width: 260,
              background: C.rightBg,
              display: 'flex',
              flexDirection: 'column',
              padding: '16px 16px 12px',
              gap: 14,
              overflowY: 'auto',
              flexShrink: 0,
            }}>
              {/* Target Word Card */}
              <div style={{
                background: C.passageBg,
                border: `1px solid ${C.border}`,
                borderRadius: 3,
                padding: '14px 16px',
                boxShadow: '0 2px 8px rgba(67,40,24,0.10)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: C.textMuted, fontFamily: FONT, marginBottom: 2 }}>TARGET WORD</div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: C.textMuted, fontFamily: FONT }}>STATUS</div>
                  </div>
                  {activeWordMeta ? (
                    unlockedWords.includes(activeWordMeta.word_id) ? (
                      <div style={{ border: `2px solid ${C.green}`, borderRadius: '50%', padding: '6px 8px', fontSize: 9, fontWeight: 700, color: C.green, fontFamily: FONT, letterSpacing: '0.08em', transform: 'rotate(6deg)', lineHeight: 1.2, textAlign: 'center' }}>UN<br/>LOCKED</div>
                    ) : (
                      <div style={{ border: `2px solid ${C.stampRed}`, borderRadius: '50%', padding: '6px 8px', fontSize: 9, fontWeight: 700, color: C.stampRed, fontFamily: FONT, letterSpacing: '0.08em', transform: 'rotate(-8deg)', lineHeight: 1.2, textAlign: 'center' }}>LOCK<br/>ED</div>
                    )
                  ) : (
                    <div style={{ border: `2px solid ${C.borderLight}`, borderRadius: '50%', padding: '6px 8px', fontSize: 9, fontWeight: 700, color: C.borderLight, fontFamily: FONT, letterSpacing: '0.08em', transform: 'rotate(-8deg)', lineHeight: 1.2, textAlign: 'center' }}>LOCK<br/>ED</div>
                  )}
                </div>

                <div style={{ fontSize: activeWordMeta ? 20 : 15, fontWeight: 700, color: activeWordMeta ? (unlockedWords.includes(activeWordMeta.word_id) ? C.green : C.gold) : C.borderLight, fontFamily: FONT, marginBottom: 2 }}>
                  {activeWordMeta?.word ?? '— select a word —'}
                </div>
                <div style={{ fontSize: 10, color: C.textMuted, fontFamily: FONT, fontStyle: 'italic', marginBottom: 10 }}>
                  {activeWordMeta ? 'noun / verb / adjective' : ''}
                </div>

                <div style={{ borderTop: `1px solid ${C.borderLight}`, margin: '8px 0' }} />

                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: C.accent, fontFamily: FONT, marginBottom: 6 }}>INSTRUCTIONS</div>
                <div style={{ fontSize: 10, color: C.darkBrown, fontFamily: FONT, lineHeight: 1.55 }}>
                  Locate surrounding words that prove the target word&apos;s actual implicit semantic definition.
                </div>
              </div>

              {/* Found Clues Tracker */}
              <div style={{
                background: C.passageBg,
                border: `1px solid ${C.border}`,
                borderRadius: 3,
                padding: '14px 16px',
                boxShadow: '0 2px 8px rgba(67,40,24,0.10)',
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: C.accent, fontFamily: FONT, marginBottom: 12 }}>FOUND CLUES TRACKER</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Array.from({ length: MAX_CLUES }).map((_, i) => {
                    const clue = activeClues[i]
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: clue ? C.green : C.borderLight, fontFamily: FONT, flexShrink: 0, minWidth: 24 }}>
                          [{i + 1}]
                        </span>
                        <div style={{ flex: 1, borderBottom: `1px solid ${clue ? C.green : C.borderLight}`, paddingBottom: 2, fontSize: 11, color: clue ? C.darkBrown : C.borderLight, fontFamily: FONT, minHeight: 18, fontStyle: clue ? 'normal' : 'italic' }}>
                          {clue ?? ''}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {tapNode!.locked_words.filter(lw => unlockedWords.includes(lw.word_id) && lw.word_id !== activeWordId).length > 0 && (
                  <div style={{ marginTop: 14, borderTop: `1px solid ${C.borderLight}`, paddingTop: 10 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: C.green, fontFamily: FONT, marginBottom: 6 }}>COMPLETED WORDS</div>
                    {tapNode!.locked_words.filter(lw => unlockedWords.includes(lw.word_id) && lw.word_id !== activeWordId).map(lw => (
                      <div key={lw.word_id} style={{ fontSize: 10, color: C.green, fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 8 }}>✓</span>
                        <span style={{ fontWeight: 700 }}>{lw.word}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── BOTTOM BAR ── */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 20px 12px',
            background: C.rightBg,
            borderTop: `1px solid ${C.borderLight}`,
          }}>
            <button onClick={openTutorial} style={S.tutorialBtn}>Show tutorial</button>
            <button
              disabled={!allUnlocked || submitting}
              onClick={handleSubmitMastery}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: submitting ? C.medBrown : allUnlocked ? C.sidebarBg : C.borderLight,
                color: allUnlocked || submitting ? C.cream : C.textMuted,
                border: `2px solid ${allUnlocked ? C.goldDark : C.borderLight}`,
                borderRadius: 2, padding: '9px 24px',
                fontSize: 12, fontWeight: 700,
                letterSpacing: '0.14em',
                cursor: allUnlocked && !submitting ? 'pointer' : 'not-allowed',
                fontFamily: FONT, transition: 'background 0.2s',
              }}
            >
              {submitting ? 'CHECKING...' : <><span>SUBMIT</span><span style={{ fontSize: 18, lineHeight: 1 }}>→</span></>}
            </button>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div style={{
          width: 44, background: 'transparent',
          display: 'flex', flexDirection: 'column',
          alignItems: 'flex-start', justifyContent: 'flex-start',
          padding: '20px 0',
          borderLeft: `1px solid ${C.goldDark}`,
        }}>
          <button
            title="Toggle clue drawer"
            onClick={() => setDrawer(prev => !prev)}
            style={{
              writingMode: 'vertical-rl',
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.14em', color: C.darkBrown,
              background: C.btnBg,
              border: `1px solid ${C.btnBorder}`,
              borderRadius: 6,
              cursor: 'pointer', padding: '10px 6px',
              fontFamily: FONT, transition: 'background 0.15s',
              boxShadow: '0 2px 5px rgba(0,0,0,0.18)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = C.cream)}
            onMouseLeave={e => (e.currentTarget.style.background = C.btnBg)}
          >
            CLUE DRAWER
          </button>
        </div>
      </div>{/* ── end CARD ── */}

      {/* ── TUTORIAL POPUP ── */}
      <TapCluesTutorialPopup
        open={tutorialOpen}
        step={tutorialStep}
        onClose={() => setTutorialOpen(false)}
        onBack={() => setTutorialStep(prev => Math.max(prev - 1, 0))}
        onNext={() => setTutorialStep(prev => Math.min(prev + 1, TUTORIAL_STEPS.length - 1))}
        onStart={() => setTutorialOpen(false)}
      />

      {/* ── DEFINITION PANEL ── */}
      {defPanel && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(67,40,24,0.7)',
          zIndex: 150,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: C.cardBg,
            border: `2px solid ${C.green}`,
            borderRadius: 4,
            padding: '28px 32px',
            maxWidth: 420, width: '90%',
            boxShadow: '0 12px 48px rgba(0,0,0,0.45)',
            fontFamily: FONT,
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: C.green, marginBottom: 6, fontFamily: FONT }}>
              ✓ WORD UNLOCKED
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: C.darkBrown, margin: '0 0 4px', fontFamily: FONT, textTransform: 'uppercase' }}>
              {defPanel.word}
            </h3>
            <div style={{ fontSize: 10, color: C.textMuted, fontStyle: 'italic', marginBottom: 14 }}>noun / verb / adjective</div>
            <div style={{ borderTop: `1px solid ${C.borderLight}`, margin: '0 0 14px' }} />
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: C.textMuted, marginBottom: 4 }}>DEFINITION</div>
            <p style={{ fontSize: 14, color: C.darkBrown, lineHeight: 1.65, margin: '0 0 14px' }}>{defPanel.definition}</p>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: C.textMuted, marginBottom: 4 }}>IN CONTEXT</div>
            <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.65, margin: '0 0 14px', fontStyle: 'italic' }}>
              &ldquo;{defPanel.contextual_usage}&rdquo;
            </p>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: C.textMuted, marginBottom: 4 }}>TRANSLATION (FILIPINO)</div>
            <p style={{ fontSize: 13, color: C.medBrown, margin: '0 0 22px' }}>{defPanel.translation}</p>
            <button onClick={() => setDefPanel(null)} style={{ ...S.btnPrimary, width: '100%', textAlign: 'center' }}>
              Got it — Continue
            </button>
          </div>
        </div>
      )}

      {/* ── HINT OVERLAY ── */}
      {hintOverlay && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(67,40,24,0.4)',
          zIndex: 100,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start',
          padding: 24, pointerEvents: 'none',
        }}>
          <div style={{
            background: C.cardBg,
            border: `2px solid ${C.gold}`,
            borderRadius: 4, padding: '16px 18px 14px',
            maxWidth: 280,
            boxShadow: '0 6px 24px rgba(67,40,24,0.3)',
            pointerEvents: 'all',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: C.gold, marginBottom: 8, fontFamily: FONT }}>
              SCAFFOLD HINT{hintOverlayTier > 0 ? ` — TIER ${hintOverlayTier}` : ''}
            </div>
            <p style={{ fontSize: 12, color: C.darkBrown, lineHeight: 1.65, margin: '0 0 14px', fontFamily: FONT }}>
              {hintOverlayText}
            </p>
            <button onClick={() => setHintOverlay(false)} style={{ ...S.btnSm, fontSize: 10 }}>Close</button>
          </div>
        </div>
      )}

      {/* ── FEEDBACK DRAWER ── */}
      {drawer && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: C.sidebarBg,
          borderTop: `2px solid ${C.goldDark}`,
          padding: '18px 32px 24px',
          zIndex: 200, maxHeight: 280,
          overflowY: 'auto', fontFamily: FONT,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ ...S.stamp, color: C.cream, borderColor: C.gold, marginBottom: 0 }}>FEEDBACK</div>
            <button
              onClick={() => { setDrawer(false); resetTimer() }}
              style={{ background: 'none', border: 'none', color: C.cream, fontSize: 18, cursor: 'pointer', fontFamily: FONT }}
            >
              ✕
            </button>
          </div>
          <p style={{ fontSize: 13, color: C.cream, lineHeight: 1.7, marginBottom: 12, fontFamily: FONT, opacity: 0.9 }}>
            {fbText}
          </p>
          <button style={{ ...S.btnSm, color: C.cream, borderColor: C.gold }} onClick={() => { setDrawer(false); resetTimer() }}>
            Close and reattempt
          </button>
        </div>
      )}
    </div>
  )
}