'use client'

import {
  useState, useEffect,
  useRef, useCallback,
} from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'

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

// ── Shared style atoms ──────────────────────────
const FONT = "'Courier New', Courier, monospace"

const S = {
  stamp: {
    display:       'inline-block',
    border:        '2px solid #888',
    padding:       '3px 14px',
    fontSize:      10,
    fontWeight:    700,
    letterSpacing: '0.15em',
    color:         '#aaa',
    marginBottom:  12,
    fontFamily:    FONT,
  } as React.CSSProperties,
  btnPrimary: {
    padding:       '10px 24px',
    background:    '#f0ece4',
    border:        '2px solid #888',
    borderRadius:  2,
    color:         '#111',
    fontFamily:    FONT,
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
    fontFamily:   FONT,
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
      minHeight: '100vh', background: '#6b6b6b',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT, color: '#ddd', fontSize: 13, letterSpacing: '0.1em',
    }}>
      LOADING NODE...
    </div>
  )
}

function ErrorScreen({ msg, onBack }: { msg: string; onBack: () => void }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#1e1e1e',
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
      minHeight: '100vh', background: '#6b6b6b',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 40, fontFamily: FONT,
    }}>
      <div style={{
        maxWidth: 640, width: '100%', background: '#2b2b2b',
        border: '1px solid #444', borderRadius: 4, padding: 48,
      }}>
        <div style={S.stamp}>MICRO-LESSON</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f0ece4', margin: '0 0 6px', fontFamily: FONT }}>
          {node.title}
        </h2>
        <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 16px', fontFamily: FONT }}>
          {node.focus}
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #444', margin: '16px 0' }} />
        <p style={{ fontSize: 14, lineHeight: 1.85, color: '#ccc', margin: '0 0 32px', fontFamily: FONT }}>
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
      minHeight: '100vh', background: '#6b6b6b',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 40, fontFamily: FONT,
    }}>
      <div style={{
        maxWidth: 700, width: '100%', background: '#2b2b2b',
        border: '1px solid #444', borderRadius: 4, padding: 48,
      }}>
        <div style={S.stamp}>DEEP DIVE READING</div>
        <p style={{ fontSize: 13, color: '#888', margin: '0 0 20px', lineHeight: 1.7, fontFamily: FONT }}>
          Read the full passage carefully. Do not skip — cognitive endurance is part of the exercise.
        </p>
        <p style={{
          fontSize: 14, lineHeight: 1.95, color: '#ddd', background: '#222',
          border: '1px solid #444', borderRadius: 4, padding: 28,
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
      minHeight: '100vh', background: '#1e1e1e',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT,
    }}>
      <div style={{
        maxWidth: 480, width: '100%', background: '#0e1e0e',
        border: '2px solid #4ddd94', borderRadius: 4, padding: 52, textAlign: 'center',
      }}>
        <div style={{ ...S.stamp, color: '#4ddd94', borderColor: '#4ddd94', fontSize: 16, padding: '8px 24px' }}>
          ✓ NODE MASTERED
        </div>
        <h2 style={{ fontSize: 20, color: '#4ddd94', margin: '8px 0 16px', fontFamily: FONT }}>
          {node.title}
        </h2>
        <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 28px', fontFamily: FONT }}>
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
        border: '1px solid #777',
        background: complete ? '#b9dfbf' : active ? '#f8f7f3' : '#c9c7c2',
        color: '#111',
        boxShadow: active ? '0 3px 0 rgba(0,0,0,0.45)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', textAlign: 'center',
        fontFamily: FONT, fontSize: 12, fontWeight: 700,
      }}>
        <div style={{ position: 'absolute', top: 7, left: '50%', transform: 'translateX(-50%)' }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: complete ? '#36b24a' : active ? '#ece7dc' : '#dbd8d2',
            color: complete ? '#fff' : '#111',
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
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: '#111', marginBottom: 12 }}>THE TARGET WORD</div>
          <div style={{ fontFamily: FONT, fontSize: 22, lineHeight: 1.45, color: '#111', wordSpacing: '0.12em' }}>
            A tone of{' '}
            <span style={{ color: '#caa400', fontWeight: 700, textDecoration: 'underline' }}>peremptory</span>
            {' '}authority is often associated with those who{' '}
            <span style={{ color: '#2f8fcb', fontWeight: 700 }}>command</span>
            {' '}without question.
          </div>
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-block', transform: 'rotate(-8deg)', color: '#c45a50', border: '1px solid #d6a8a0', borderRadius: '50%', padding: '8px 10px', fontSize: 12, fontWeight: 700 }}>LOCKED</span>
            <span style={{ fontSize: 13, color: '#222', fontFamily: FONT }}>→ tap clues to unlock</span>
          </div>
        </div>
      )
    }

    if (current.board === 'strongWeak') {
      return (
        <div style={{ padding: '16px 14px 12px' }}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: '#111', marginBottom: 12 }}>STRONG VS WEAK CLUES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ padding: '8px 10px', border: '1px solid #58baf7', background: '#d8efff', color: '#0f5f9a', fontFamily: FONT, fontSize: 12, fontWeight: 700, lineHeight: 1.35 }}>
              Strong: "command", "imperious", "dismissing" signal authority/abruptness
            </div>
            <div style={{ padding: '8px 10px', border: '1px solid #cda25a', background: '#efe3d0', color: '#8a5c12', fontFamily: FONT, fontSize: 12, fontWeight: 700, lineHeight: 1.35 }}>
              Weak: "tone", "often", "those" too generic, no semantic link
            </div>
          </div>
        </div>
      )
    }

    if (current.board === 'tracker') {
      return (
        <div style={{ padding: '16px 14px 12px' }}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: '#111', marginBottom: 12 }}>FOUND CLUES TRACKER</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: FONT, fontSize: 12, color: '#111' }}>
            <div><span style={{ color: '#2f8fcb', fontWeight: 700 }}>[1]</span> command — signals ordering without discussion</div>
            <div><span style={{ color: '#2f8fcb', fontWeight: 700 }}>[2]</span> imperious — near-synonym</div>
            <div><span style={{ fontWeight: 700 }}>[3]</span> - TAP A WORD -</div>
          </div>
        </div>
      )
    }

    return (
      <div style={{ padding: '16px 14px 12px' }}>
        <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: '#111', marginBottom: 12 }}>LOCK STATE CHANGE</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: FONT, fontSize: 13, color: '#111' }}>
          <span style={{ color: '#c45a50', border: '1px solid #e3b3ab', borderRadius: '50%', padding: '8px 10px', transform: 'rotate(-6deg)' }}>LOCKED</span>
          <span>→</span>
          <span style={{ color: '#2ca04f', border: '1px solid #a8d6b3', borderRadius: '50%', padding: '8px 8px', transform: 'rotate(6deg)' }}>UNLOCKED</span>
        </div>
        <div style={{ display: 'flex', gap: 34, marginTop: 14, fontFamily: FONT, fontSize: 11, color: '#333' }}>
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
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.48)',
      zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: FONT,
    }}>
      <div style={{ width: '100%', maxWidth: 840, background: '#d4d1cb', border: '1px solid #5f5d58', boxShadow: '0 18px 44px rgba(0,0,0,0.4)', padding: '10px 14px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.28em', color: '#111' }}>CRITICA - FIELD BRIEFING DOCUMENT</div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.18em', color: '#111' }}>{current.code}</div>
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
              {TUTORIAL_STEPS.map((stepItem, index) => stepCard(stepItem.label, index))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', background: '#e7e4de', border: '1px solid #7b776f', padding: 14 }}>
            <div style={{ flex: 1, minHeight: 202, background: '#fff', border: '1px solid #9a968f', padding: 18, position: 'relative' }}>
              {renderBoard()}
            </div>

            <div style={{ width: 112, background: '#fff', border: '1px solid #9a968f', padding: '10px 10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#111', marginBottom: 10 }}>QUICK NOTES</div>
              {current.notes.map((note, index) => (
                <div key={note} style={{ fontSize: 9, lineHeight: 1.45, color: '#111' }}>
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
    apiFetch(`/nodes/tap-clues/${nodeId}/`)
      .then((d: TapNodeData) => {
        setTapNode(d)
        setPhase('micro_lesson')
      })
      .catch((e: any) => {
        if (e?.status === 401)              { router.push('/auth');      return }
        if (e?.error === 'Node is locked.') { router.push('/dashboard'); return }
        setErrorMsg(e?.error ?? 'Failed to load node.')
        setPhase('error')
      })
  }, [nodeId]) // eslint-disable-line

  useEffect(() => {
    if (phase !== 'task' || nodeId !== 'tap_node_01') return

    const seen = localStorage.getItem(TAP_CLUES_TUTORIAL_KEY)
    if (seen === '1') return

    localStorage.setItem(TAP_CLUES_TUTORIAL_KEY, '1')
    setTutorialStep(0)
    setTutorialOpen(true)
  }, [phase, nodeId])

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

  // ── Fetch feedback ─────────────────────────
  const callFeedback = useCallback(async (
    word_id:    string,
    clue_word:  string,
    inactivity: boolean,
  ) => {
    try {
      const res = await apiFetch(`/nodes/tap-clues/${nodeId}/feedback/`, {
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
  }, [nodeId])

  // ── Fetch hint ─────────────────────────────
  const fetchHint = useCallback(async (isInactivity = false) => {
    try {
      const res = await apiFetch(`/nodes/tap-clues/${nodeId}/feedback/`, {
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
  }, [nodeId, activeWordId])

  // ── Log word to lexical deck ───────────────
  const logWordToLexical = useCallback(async (
    word:             string,
    definition:       string,
    contextual_usage: string,
    translation:      string,
  ) => {
    try {
      await apiFetch('/lexical/log/', {
        method: 'POST',
        body: JSON.stringify({
          word_data: { word, definition, contextual_usage, translation },
          task_id: nodeId,
        }),
      })
    } catch {
      console.warn('Lexical log failed silently')
    }
  }, [nodeId])

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
        const res = await apiFetch(`/nodes/tap-clues/${nodeId}/evaluate-clue/`, {
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
          await callFeedback(activeWordId, cleanWord, false)
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
      const res = await apiFetch(`/nodes/tap-clues/${nodeId}/mastery/`, {
        method: 'POST',
        body: JSON.stringify({ unlocked_word_ids: unlockedWords }),
      })
      if (res.status === 'mastered') {
        setMasteryData(res)
        setPhase('mastery')
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

  return (
    <div style={{
      minHeight: '100vh',
      background: '#686664',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: FONT,
    }}>
      <div style={{
        display: 'flex', alignItems: 'stretch',
        boxShadow: '0 12px 48px rgba(0,0,0,0.55)',
        borderRadius: 6,
      }}>

        {/* ── LEFT SIDEBAR ── */}
        <div style={{
          width: 34, background: '#2b2b2b',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 0',
          borderRadius: '6px 0 0 6px',
          borderRight: '1px solid #1a1a1a',
        }}>
          <button
            title="Get a hint"
            onClick={() => fetchHint()}
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              fontSize: 14, fontWeight: 700,
              letterSpacing: '0.14em', color: '#999',
              background: 'none', border: 'none',
              cursor: 'pointer', padding: '10px 4px',
              fontFamily: FONT, transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#eee')}
            onMouseLeave={e => (e.currentTarget.style.color = '#999')}
          >
            HINT
          </button>
          <button
            title="End session"
            onClick={() => router.push('/dashboard')}
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              fontSize: 14, fontWeight: 700,
              letterSpacing: '0.14em', color: '#666',
              background: 'none', border: 'none',
              cursor: 'pointer', padding: '10px 4px',
              fontFamily: FONT, transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
            onMouseLeave={e => (e.currentTarget.style.color = '#666')}
          >
            END SESSION
          </button>
        </div>

        {/* ── MAIN PANEL ── */}
        <div style={{
          background: '#b8b3ab',
          borderRadius: '0 6px 6px 0',
          display: 'flex', flexDirection: 'column',
          width: 820,
          overflow: 'hidden',
        }}>

          {/* ── OBJECTIVE BANNER ── */}
          <div style={{ padding: '10px 20px 8px', textAlign: 'center', background: '#b8b3ab' }}>
            <div style={{
              display: 'inline-block', border: '1.5px solid #888',
              padding: '5px 20px', fontSize: 14, fontWeight: 700,
              letterSpacing: '0.1em', color: '#333',
              background: 'rgba(255,255,255,0.25)', fontFamily: FONT,
            }}>
              <span style={{ color: '#444' }}>OBJECTIVE: </span>
              <span style={{ color: '#b03030' }}>
                TAP THE LOCKED WORDS, THEN TAP SURROUNDING CLUE WORDS TO UNLOCK THEIR MEANING
              </span>
            </div>
          </div>

          {/* ── WORD PROGRESS DOTS ── */}
          <div style={{
            padding: '6px 24px 4px',
            display: 'flex', gap: 8, justifyContent: 'center',
          }}>
            {tapNode!.locked_words.map(lw => (
              <div key={lw.word_id} style={{
                width: 28, height: 6, borderRadius: 3,
                background:
                  unlockedWords.includes(lw.word_id) ? '#4ddd94'
                  : activeWordId === lw.word_id       ? '#f0a500'
                  : '#888',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>

          {/* ── INSTRUCTION LINE ── */}
          <div style={{
            padding: '4px 24px 8px', textAlign: 'center',
            fontSize: 10, color: '#555', fontFamily: FONT, letterSpacing: '0.1em',
            fontWeight: 700,
          }}>
            {activeWordId
              ? `FINDING CLUES FOR: "${
                  tapNode!.locked_words.find(lw => lw.word_id === activeWordId)?.word.toUpperCase()
                }" — ${(foundClues[activeWordId] ?? []).length} CLUE(S) FOUND SO FAR`
              : allUnlocked
              ? 'ALL WORDS UNLOCKED — SUBMIT TO COMPLETE'
              : 'TAP A HIGHLIGHTED WORD TO BEGIN'}
          </div>

          {/* ── PASSAGE CARD ── */}
          <div style={{ padding: '12px 24px 16px', flex: 1, overflowY: 'auto' }}>
            <div style={{
              background: '#ffffff',
              border: '2px solid #e0ddd8',
              borderRadius: 5,
              padding: '28px 32px',
              fontSize: 17,
              lineHeight: 2.2,
              color: '#1a1a1a',
              fontFamily: FONT,
              boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
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

                let color      = '#1a1a1a'
                let bg         = 'transparent'
                let border     = 'none'
                let fontWeight = 400
                let cursor     = 'pointer'
                let textDecor  = 'none'

                if (isLocked && isUnlocked) {
                  color      = '#2e7d32'
                  fontWeight = 700
                  textDecor  = 'underline'
                  cursor     = 'pointer'
                } else if (isLocked && isActive) {
                  color      = '#b06000'
                  bg         = 'rgba(240,165,0,0.18)'
                  border     = '1.5px solid #f0a500'
                  fontWeight = 700
                  cursor     = 'pointer'
                } else if (isLocked) {
                  color      = '#b06000'
                  fontWeight = 700
                  textDecor  = 'underline'
                  cursor     = 'pointer'
                } else if (activeWordId && !isLocked) {
                  cursor = 'pointer'
                  if (isPulse) {
                    bg     = 'rgba(77,221,148,0.35)'
                    border = '1.5px solid #4ddd94'
                    color  = '#2e7d32'
                  }
                }

                return (
                  <span
                    key={i}
                    onClick={() => handleWordTap(token.text, token)}
                    style={{
                      color,
                      background:     bg,
                      border,
                      borderRadius:   border !== 'none' ? 2 : 0,
                      fontWeight,
                      cursor,
                      textDecoration: textDecor,
                      padding:        border !== 'none' ? '0 3px' : '0',
                      transition:     'all 0.2s',
                      display:        'inline',
                    }}
                  >
                    {token.text}
                  </span>
                )
              })}
            </div>
          </div>

          {/* ── SUBMIT BAR ── */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', padding: '10px 24px 14px',
            background: '#b8b3ab',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={openTutorial} style={S.tutorialBtn}>
                Show tutorial
              </button>
              <span style={{
                fontSize: 10, color: '#111',
                fontWeight: 700, letterSpacing: '0.08em',
                fontFamily: FONT,
              }}>
                {unlockedWords.length} / {tapNode!.locked_words.length} WORDS UNLOCKED
              </span>
            </div>
            <button
              disabled={!allUnlocked || submitting}
              onClick={handleSubmitMastery}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background:
                  submitting    ? '#555'
                  : allUnlocked ? '#2b2b2b'
                  : '#888',
                color: '#f0ece4',
                border: 'none', borderRadius: 2,
                padding: '10px 26px',
                fontSize: 13, fontWeight: 700,
                letterSpacing: '0.14em',
                cursor: allUnlocked && !submitting ? 'pointer' : 'not-allowed',
                fontFamily: FONT, transition: 'background 0.2s',
              }}
            >
              {submitting
                ? 'CHECKING...'
                : <><span>SUBMIT</span><span style={{ fontSize: 18, lineHeight: 1 }}>→</span></>}
            </button>
          </div>
        </div>
      </div>

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
          background: 'rgba(0,0,0,0.55)',
          zIndex: 150,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff',
            border: '2px solid #4ddd94',
            borderRadius: 6,
            padding: '28px 32px',
            maxWidth: 400, width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            fontFamily: FONT,
          }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
              color: '#4ddd94', marginBottom: 6, fontFamily: FONT,
            }}>
              ✓ WORD UNLOCKED
            </div>
            <h3 style={{
              fontSize: 22, fontWeight: 700, color: '#1a1a1a',
              margin: '0 0 14px', fontFamily: FONT, textTransform: 'uppercase',
            }}>
              {defPanel.word}
            </h3>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
              color: '#888', marginBottom: 4, fontFamily: FONT,
            }}>
              DEFINITION
            </div>
            <p style={{ fontSize: 14, color: '#222', lineHeight: 1.65, margin: '0 0 14px', fontFamily: FONT }}>
              {defPanel.definition}
            </p>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
              color: '#888', marginBottom: 4, fontFamily: FONT,
            }}>
              IN CONTEXT
            </div>
            <p style={{
              fontSize: 13, color: '#444', lineHeight: 1.65,
              margin: '0 0 14px', fontStyle: 'italic', fontFamily: FONT,
            }}>
              "{defPanel.contextual_usage}"
            </p>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
              color: '#888', marginBottom: 4, fontFamily: FONT,
            }}>
              TRANSLATION (FILIPINO)
            </div>
            <p style={{ fontSize: 14, color: '#555', margin: '0 0 22px', fontFamily: FONT }}>
              {defPanel.translation}
            </p>
            <button
              onClick={() => setDefPanel(null)}
              style={{ ...S.btnPrimary, width: '100%', textAlign: 'center' }}
            >
              Got it — Continue
            </button>
          </div>
        </div>
      )}

      {/* ── HINT OVERLAY ── */}
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
              fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
              color: '#888', marginBottom: 8, fontFamily: FONT,
            }}>
              SCAFFOLD HINT{hintOverlayTier > 0 ? ` — TIER ${hintOverlayTier}` : ''}
            </div>
            <p style={{
              fontSize: 12, color: '#222', lineHeight: 1.65,
              margin: '0 0 14px', fontFamily: FONT,
            }}>
              {hintOverlayText}
            </p>
            <button
              onClick={() => setHintOverlay(false)}
              style={{
                fontSize: 10, fontWeight: 700, color: '#444',
                background: '#eee', border: '1px solid #ccc',
                padding: '5px 14px', cursor: 'pointer',
                fontFamily: FONT, letterSpacing: '0.06em', borderRadius: 2,
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── FEEDBACK DRAWER ── */}
      {drawer && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#180a0a',
          border: '2px solid #cc3333',
          borderBottom: 'none',
          padding: '20px 32px 28px',
          zIndex: 200, maxHeight: 300,
          overflowY: 'auto', fontFamily: FONT,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 12,
          }}>
            <div style={{ ...S.stamp, color: '#ff6b6b', borderColor: '#ff6b6b', marginBottom: 0 }}>
              FEEDBACK
            </div>
            <button
              onClick={() => { setDrawer(false); resetTimer() }}
              style={{
                background: 'none', border: 'none',
                color: '#ff6b6b', fontSize: 18,
                cursor: 'pointer', fontFamily: FONT,
              }}
            >
              ✕
            </button>
          </div>
          <p style={{ fontSize: 14, color: '#ddd', lineHeight: 1.7, marginBottom: 12, fontFamily: FONT }}>
            {fbText}
          </p>
          <button style={S.btnSm} onClick={() => { setDrawer(false); resetTimer() }}>
            Close and reattempt
          </button>
        </div>
      )}
    </div>
  )
}