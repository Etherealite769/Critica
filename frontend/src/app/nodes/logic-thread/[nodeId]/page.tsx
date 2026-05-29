'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams }             from 'next/navigation'
import { apiFetch }                          from '@/lib/api'

// ── Types ────────────────────────────────────────────────────
interface Block { block_id: string; text: string }
interface NodeData {
  node_id:            string
  title:              string
  focus:              string
  micro_lesson_text:  string
  reading_passage:    string
  deep_dive_required: boolean
  paragraph_blocks:   Block[]
}
type Phase       = 'loading' | 'micro_lesson' | 'deep_dive' | 'task' | 'mastery' | 'error'
type SubmitState = 'idle' | 'submitting' | 'correct' | 'incorrect'

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

function cardCentre(i: number) {
  return { x: SCATTER[i].x + CARD_W / 2, y: SCATTER[i].y + CARD_H / 2 }
}

function bezierPath(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  const dx = x2 - x1, dy = y2 - y1
  const L  = Math.sqrt(dx * dx + dy * dy) || 1
  return `M${x1},${y1} Q${mx + (-dy / L) * 58},${my + (dx / L) * 58} ${x2},${y2}`
}

// ── Shared style atoms ────────────────────────────────────────
const FONT = "'Courier New', Courier, monospace"
const stampS: React.CSSProperties = {
  display: 'inline-block', border: '2px solid #888',
  padding: '3px 14px', fontSize: 10, fontWeight: 700,
  letterSpacing: '0.15em', color: '#aaa',
  marginBottom: 12, fontFamily: FONT,
}
const btnPrimary: React.CSSProperties = {
  padding: '10px 24px', background: '#f0ece4',
  border: '2px solid #888', borderRadius: 2, color: '#111',
  fontFamily: FONT, fontSize: 11, fontWeight: 700,
  cursor: 'pointer', letterSpacing: '0.08em',
}
const btnSm: React.CSSProperties = {
  padding: '7px 16px', background: 'transparent',
  border: '1px solid #555', borderRadius: 2, color: '#aaa',
  fontFamily: FONT, fontSize: 10, fontWeight: 700, cursor: 'pointer',
}

// ── Sub-screens ───────────────────────────────────────────────
function LoadScreen() {
  return (
    <div style={{ minHeight: '100vh', background: '#6b6b6b', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT, color: '#ddd', fontSize: 13, letterSpacing: '0.1em' }}>
      LOADING NODE...
    </div>
  )
}

function ErrorScreen({ msg, onBack }: { msg: string; onBack: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: '#1e1e1e', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT, gap: 16 }}>
      <p style={{ color: '#ff6b6b', fontSize: 13 }}>{msg}</p>
      <button onClick={onBack} style={btnSm}>← DASHBOARD</button>
    </div>
  )
}

function LessonScreen({ node, onContinue }: { node: NodeData; onContinue: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: '#6b6b6b', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 40, fontFamily: FONT }}>
      <div style={{ maxWidth: 640, width: '100%', background: '#2b2b2b',
        border: '1px solid #444', borderRadius: 4, padding: 48 }}>
        <div style={stampS}>MICRO-LESSON</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f0ece4', margin: '0 0 6px' }}>
          {node.title}
        </h2>
        <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 16px' }}>{node.focus}</p>
        <hr style={{ border: 'none', borderTop: '1px solid #444', margin: '16px 0' }} />
        <p style={{ fontSize: 14, lineHeight: 1.85, color: '#ccc', margin: '0 0 32px' }}>
          {node.micro_lesson_text}
        </p>
        <button onClick={onContinue} style={btnPrimary}>Continue →</button>
      </div>
    </div>
  )
}

function DeepDiveScreen({ node, onContinue }: { node: NodeData; onContinue: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: '#6b6b6b', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 40, fontFamily: FONT }}>
      <div style={{ maxWidth: 700, width: '100%', background: '#2b2b2b',
        border: '1px solid #444', borderRadius: 4, padding: 48 }}>
        <div style={stampS}>DEEP DIVE READING</div>
        <p style={{ fontSize: 13, color: '#888', margin: '0 0 20px', lineHeight: 1.7 }}>
          Read the full passage carefully. Do not skip — cognitive endurance is part of the exercise.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.95, color: '#ddd', background: '#222',
          border: '1px solid #444', borderRadius: 4, padding: 28, margin: '0 0 32px' }}>
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
    <div style={{ minHeight: '100vh', background: '#1e1e1e', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
      <div style={{ maxWidth: 480, width: '100%', background: '#0e1e0e',
        border: '2px solid #4ddd94', borderRadius: 4, padding: 52, textAlign: 'center' }}>
        <div style={{ ...stampS, color: '#4ddd94', borderColor: '#4ddd94',
          fontSize: 16, padding: '8px 24px' }}>
          ✓ NODE MASTERED
        </div>
        <h2 style={{ fontSize: 20, color: '#4ddd94', margin: '8px 0 16px', fontFamily: FONT }}>
          {node.title}
        </h2>
        <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 28px' }}>
          Streak: {data?.streak ?? 0} days
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {data?.next_node && (
            <button onClick={onNext} style={btnPrimary}>NEXT NODE →</button>
          )}
          <button onClick={onDashboard} style={btnSm}>← DASHBOARD</button>
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



  const [phase,       setPhase]       = useState<Phase>('loading')
  const [node,        setNode]        = useState<NodeData | null>(null)
  const [blocks,      setBlocks]      = useState<Block[]>([])
  const [chain,       setChain]       = useState<string[]>([])
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [wrongCount,  setWrongCount]  = useState(0)
  const [showHint,    setShowHint]    = useState(false)
  const [hintText,    setHintText]    = useState('')
  const [masteryData, setMasteryData] = useState<any>(null)
  const [errorMsg,    setErrorMsg]    = useState('')

  // ── Load node ──────────────────────────────────────────────
  useEffect(() => {
    apiFetch(`/nodes/logic-thread/${nodeId}/`)
      .then((d: NodeData) => {
        setNode(d)
        setBlocks([...d.paragraph_blocks].sort(() => Math.random() - 0.5))
        setPhase('micro_lesson')
      })
      .catch((e: any) => {
        if (e?.status === 401)             { router.push('/auth');      return }
        if (e?.error === 'Node is locked.'){ router.push('/dashboard'); return }
        setErrorMsg(e?.error ?? 'Failed to load node.')
        setPhase('error')
      })
  }, [nodeId])

  // ── Fetch hint ─────────────────────────────────────────────
  const fetchHint = useCallback(async (tier: number) => {
    try {
      const res = await apiFetch(`/nodes/logic-thread/${nodeId}/feedback/`, {
        method: 'POST',
        body: JSON.stringify({ source_id: '', target_id: '', inactivity_seconds: 61 }),
      })
      setHintText(res.hint || res.explanation || 'Try re-reading the passage and look for signal words.')
    } catch {
      setHintText('Try re-reading the passage and look for signal words.')
    }
    setShowHint(true)
  }, [nodeId])

  // ── Card click ─────────────────────────────────────────────
  const handleCardClick = (blockId: string) => {
    if (submitState !== 'idle') return
    setChain(prev => {
      const idx = prev.indexOf(blockId)
      if (idx !== -1) return prev.slice(0, idx)
      return [...prev, blockId]
    })
  }

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!node || submitState !== 'idle') return
    if (chain.length !== blocks.length)  return
    setSubmitState('submitting')
    try {
      const res = await apiFetch(`/nodes/logic-thread/${nodeId}/mastery/`, {
        method: 'POST',
        body: JSON.stringify({ sequence: chain }),
      })
      if (res.status === 'mastered') {
        setSubmitState('correct')
        setMasteryData(res)
        setTimeout(() => setPhase('mastery'), 2000)
      }
    } catch {
      const next = wrongCount + 1
      setWrongCount(next)
      setSubmitState('incorrect')
      setTimeout(() => {
        setSubmitState('idle')
        setChain([])
      }, 1500)
      // Auto-hint after 3 wrong attempts
      if (next >= 3) fetchHint(Math.min(next - 2, 3))
    }
  }

  // ── Phase guards ───────────────────────────────────────────
  if (phase === 'loading')      return <LoadScreen />
  if (phase === 'error')        return <ErrorScreen msg={errorMsg} onBack={() => router.push('/dashboard')} />
  if (phase === 'micro_lesson') return <LessonScreen node={node!} onContinue={() => setPhase(node?.deep_dive_required ? 'deep_dive' : 'task')} />
  if (phase === 'deep_dive')    return <DeepDiveScreen node={node!} onContinue={() => setPhase('task')} />
  if (phase === 'mastery')      return (
    <MasteryScreen
      node={node!} data={masteryData}
      onDashboard={() => router.push('/dashboard')}
      onNext={() => masteryData?.next_node && router.push(`/nodes/logic-thread/${masteryData.next_node}`)}
    />
  )

  // ── TASK PHASE ─────────────────────────────────────────────
  const allChained = chain.length === blocks.length

  // Thread is red while building, green only after correct submit
  const lineColor = submitState === 'correct' ? '#22aa55' : '#cc3333'

  // Canvas outline: blue glow on correct, invisible otherwise
  const canvasOutline = submitState === 'correct' ? '3px solid #55aaff' : '3px solid transparent'

  return (
    <div style={{
      minHeight: '100vh', background: '#686664',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', alignItems: 'stretch',
        boxShadow: '0 12px 48px rgba(0,0,0,0.55)', borderRadius: 6 }}>

        {/* ── LEFT SIDEBAR ── */}
        <div style={{
          width: 34, background: '#2b2b2b',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 0', borderRadius: '6px 0 0 6px',
          borderRight: '1px solid #1a1a1a',
        }}>
          {/* HINT button — always available */}
          <button
            title="Get a hint"
            onClick={() => fetchHint(Math.min(wrongCount + 1, 3))}
            style={{
              writingMode: 'vertical-rl', transform: 'rotate(180deg)',
              fontSize: 14, fontWeight: 700, letterSpacing: '0.14em',
              color: '#999', background: 'none', border: 'none',
              cursor: 'pointer', padding: '10px 4px', fontFamily: FONT,
              transition: 'color 0.15s',
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
              writingMode: 'vertical-rl', transform: 'rotate(180deg)',
              fontSize: 14, fontWeight: 700, letterSpacing: '0.14em',
              color: '#666', background: 'none', border: 'none',
              cursor: 'pointer', padding: '10px 4px', fontFamily: FONT,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
            onMouseLeave={e => (e.currentTarget.style.color = '#666')}
          >
            END SESSION
          </button>
        </div>

        {/* ── CANVAS WRAPPER ── */}
        <div style={{
          background: '#b8b3ab',
          border: canvasOutline,
          borderRadius: '0 6px 6px 0',
          overflow: 'hidden',
          transition: 'border-color 0.4s',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* Objective banner */}
          <div style={{ padding: '10px 20px 8px', textAlign: 'center', background: '#b8b3ab' }}>
            <div style={{
              display: 'inline-block', border: '1.5px solid #888',
              padding: '5px 20px', fontSize: 14, fontWeight: 700,
              letterSpacing: '0.1em', color: '#333',
              background: 'rgba(255,255,255,0.25)',
            }}>
              <span style={{ color: '#444' }}>OBJECTIVE: </span>
              <span style={{ color: '#b03030' }}>
                CONNECT THE PARAGRAPHS TO FORM ITS OVERALL MEANING
              </span>
            </div>
          </div>

          {/* Canvas */}
          <div style={{ position: 'relative', width: CW, height: CH, flexShrink: 0 }}>

            {/* SVG connection lines */}
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}
              width={CW} height={CH}>

              {chain.slice(0, -1).map((_, i) => {
                const fi = blocks.findIndex(b => b.block_id === chain[i])
                const ti = blocks.findIndex(b => b.block_id === chain[i + 1])
                if (fi < 0 || ti < 0) return null
                const fc = cardCentre(fi), tc = cardCentre(ti)
                return (
                  <path
                    key={`${chain[i]}->${chain[i + 1]}`}
                    d={bezierPath(fc.x, fc.y, tc.x, tc.y)}
                    stroke={lineColor}
                    strokeWidth={2.2}
                    fill="none"
                    opacity={submitState === 'correct' ? 1 : 0.82}
                    strokeLinecap="round"
                  />
                )
              })}

              {/* Numbered circles on each segment */}
              {chain.slice(0, -1).map((_, i) => {
                const fi = blocks.findIndex(b => b.block_id === chain[i])
                const ti = blocks.findIndex(b => b.block_id === chain[i + 1])
                if (fi < 0 || ti < 0) return null
                const fc = cardCentre(fi), tc = cardCentre(ti)
                const mx = (fc.x + tc.x) / 2, my = (fc.y + tc.y) / 2
                const dx = tc.x - fc.x, dy = tc.y - fc.y
                const L  = Math.sqrt(dx * dx + dy * dy) || 1
                const cx = mx + (-dy / L) * 28
                const cy = my + (dx / L) * 28
                return (
                  <g key={`num-${i}`}>
                    <circle cx={cx} cy={cy} r={11}
                      fill="white" stroke={lineColor} strokeWidth={1.8} />
                    <text x={cx} y={cy + 4} textAnchor="middle"
                      fontSize={9} fontWeight={700} fill={lineColor} fontFamily={FONT}>
                      {i + 1}
                    </text>
                  </g>
                )
              })}

              {/* Final node number badge */}
              {chain.length > 0 && (() => {
                const li = blocks.findIndex(b => b.block_id === chain[chain.length - 1])
                if (li < 0) return null
                const lc = cardCentre(li)
                const sc = submitState === 'correct' ? '#22aa55' : '#888'
                return (
                  <g>
                    <circle cx={lc.x} cy={lc.y - CARD_H / 2 - 2} r={11}
                      fill="white" stroke={sc} strokeWidth={1.8} />
                    <text x={lc.x} y={lc.y - CARD_H / 2 + 2} textAnchor="middle"
                      fontSize={9} fontWeight={700} fill={sc} fontFamily={FONT}>
                      {chain.length}
                    </text>
                  </g>
                )
              })()}
            </svg>

            {/* Cards */}
            {blocks.map((block, i) => {
              const pos      = SCATTER[i]
              const inChain  = chain.includes(block.block_id)
              const isLatest = chain[chain.length - 1] === block.block_id && chain.length > 0

              const border =
                submitState === 'correct' && inChain   ? '2px solid #22aa55' :
                submitState === 'incorrect' && inChain ? '2px solid #cc3333' :
                isLatest                               ? '2px solid #5599ee' :
                                                         '2px solid #e0ddd8'

              const bg =
                submitState === 'correct' && inChain   ? '#f2fff5' :
                submitState === 'incorrect' && inChain ? '#fff2f0' :
                isLatest                               ? '#f0f5ff' : '#ffffff'

              return (
                <div
                  key={block.block_id}
                  onClick={() => handleCardClick(block.block_id)}
                  style={{
                    position: 'absolute',
                    left: pos.x, top: pos.y,
                    width: CARD_W, height: CARD_H,
                    background: bg, border,
                    borderRadius: 5,
                    boxShadow: isLatest
                      ? '0 3px 16px rgba(85,153,238,0.35)'
                      : '0 2px 10px rgba(0,0,0,0.18)',
                    cursor: submitState === 'idle' ? 'pointer' : 'default',
                    padding: '10px 13px',
                    userSelect: 'none',
                    zIndex: 2,
                    transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
                    display: 'flex', alignItems: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <p style={{
                    margin: 0, fontSize: 14, lineHeight: 1.7,
                    color: '#1a1a1a', fontFamily: FONT,
                    fontWeight: inChain ? 600 : 400,
                  }}>
                    {block.text}
                  </p>
                </div>
              )
            })}

            {/* ── HINT OVERLAY ── */}
            {showHint && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.52)',
                zIndex: 30,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                padding: 18,
              }}>
                <div style={{
                  background: '#fff',
                  border: '2px solid #ddd',
                  borderRadius: 5,
                  padding: '16px 18px 14px',
                  maxWidth: 250,
                  boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
                }}>
                  <div style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
                    color: '#888', marginBottom: 8, fontFamily: FONT,
                  }}>
                    SCAFFOLD HINT
                  </div>
                  <p style={{
                    fontSize: 12, color: '#222', lineHeight: 1.65,
                    margin: '0 0 14px', fontFamily: FONT,
                  }}>
                    {hintText}
                  </p>
                  <button
                    onClick={() => setShowHint(false)}
                    style={{
                      fontSize: 10, fontWeight: 700, color: '#444',
                      background: '#eee', border: '1px solid #ccc',
                      padding: '5px 14px', cursor: 'pointer',
                      fontFamily: FONT, letterSpacing: '0.06em',
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── SUBMIT BAR ── */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', padding: '10px 20px 14px',
            background: '#b8b3ab',
          }}>
            <span style={{ fontSize: 10, color: '#666', fontWeight: 700, letterSpacing: '0.08em', fontFamily: FONT }}>
              {chain.length} / {blocks.length} CONNECTED
              {wrongCount > 0 && (
                <span style={{ marginLeft: 14, color: '#b03030' }}>
                  ATTEMPTS: {wrongCount}
                  {wrongCount >= 3 && '  — HINT AVAILABLE'}
                </span>
              )}
            </span>
            <button
              disabled={!allChained || submitState !== 'idle'}
              onClick={handleSubmit}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background:
                  submitState === 'correct'   ? '#22aa55' :
                  submitState === 'incorrect' ? '#cc3333' :
                  allChained                  ? '#2b2b2b' : '#888',
                color: '#f0ece4',
                border: 'none', borderRadius: 2,
                padding: '10px 26px',
                fontSize: 13, fontWeight: 700,
                letterSpacing: '0.14em',
                cursor: allChained && submitState === 'idle' ? 'pointer' : 'not-allowed',
                fontFamily: FONT, transition: 'background 0.2s',
              }}
            >
              {submitState === 'submitting' ? 'CHECKING...'  :
               submitState === 'correct'    ? '✓ CORRECT!'   :
               submitState === 'incorrect'  ? '✕ TRY AGAIN'  :
               <><span>SUBMIT</span><span style={{ fontSize: 18, lineHeight: 1 }}>→</span></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}