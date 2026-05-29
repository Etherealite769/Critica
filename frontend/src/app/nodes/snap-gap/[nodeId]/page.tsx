'use client'

import {
  useState, useEffect,
  useRef, useCallback,
} from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'

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
  micro_lesson_text:    string
  reading_passage:      string
  deep_dive_required:   boolean
  sentence_pairs:       SentencePair[]
  transition_tile_dock: string[]
}

type Phase     = 'loading' | 'micro_lesson' | 'deep_dive' | 'task' | 'mastery' | 'error'
type TileState = 'idle' | 'correct' | 'incorrect'

// ── Shared styles ──────────────────────────────────
const F = "'Courier New', Courier, monospace"

const S = {
  page: {
    minHeight: '100vh',
    background: '#686664',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    fontFamily: F,
  },
  card: {
    maxWidth: 640,
    width: '100%',
    background: '#2b2b2b',
    border: '1px solid #444',
    borderRadius: 4,
    padding: 48,
    fontFamily: F,
  },
  stamp: {
    display: 'inline-block' as const,
    border: '2px solid #888',
    padding: '3px 14px',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.15em',
    color: '#aaa',
    marginBottom: 12,
    fontFamily: F,
  } as React.CSSProperties,
  h2: {
    fontSize: 20,
    fontWeight: 700,
    color: '#f0ece4',
    margin: '0 0 6px',
    fontFamily: F,
  } as React.CSSProperties,
  sub: {
    fontSize: 12,
    color: '#aaa',
    margin: '0 0 16px',
    fontFamily: F,
  } as React.CSSProperties,
  body: {
    fontSize: 13,
    lineHeight: 1.85,
    color: '#ccc',
    margin: '0 0 32px',
    fontFamily: F,
  } as React.CSSProperties,
  hr: {
    border: 'none',
    borderTop: '1px solid #444',
    margin: '16px 0',
  } as React.CSSProperties,
  btnPrimary: {
    padding: '10px 24px',
    background: '#f0ece4',
    border: '2px solid #888',
    borderRadius: 2,
    color: '#111',
    fontFamily: F,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.08em',
  } as React.CSSProperties,
  btnSm: {
    padding: '7px 16px',
    background: 'transparent',
    border: '1px solid #555',
    borderRadius: 2,
    color: '#aaa',
    fontFamily: F,
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
  } as React.CSSProperties,
}

// ── Main component ─────────────────────────────────
export default function SnapInGapPage() {
  const router = useRouter()
  const params = useParams()
  const nodeId = params.nodeId as string

  // core state
  const [phase, setPhase]           = useState<Phase>('loading')
  const [snapNode, setSnapNode]     = useState<SnapNodeData | null>(null)
  const [errorMsg, setErrorMsg]     = useState('')

  // task state
  const [pairIdx, setPairIdx]       = useState(0)
  const [board, setBoard]           = useState<Record<string, string>>({})
  const [locked, setLocked]         = useState<string[]>([])
  const [tileState, setTileState]   = useState<TileState>('idle')
  const [wrongs, setWrongs]         = useState(0)
  const [masteryData, setMasteryData] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  // feedback state
  const [fbText, setFbText]         = useState('')
  const [hintText, setHintText]     = useState('')
  const [hintTier, setHintTier]     = useState(0)
  const [drawer, setDrawer]         = useState(false)

  // timer
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const inactiveRef = useRef(0)

  // ── load ─────────────────────────────────────────
  useEffect(() => {
    apiFetch(`/nodes/snap-gap/${nodeId}/`)
      .then((d: SnapNodeData) => {
        setSnapNode(d)
        setPhase('micro_lesson')
      })
      .catch((e: any) => {
        if (e?.status === 401)            { router.push('/auth');      return }
        if (e?.error === 'Node is locked.') { router.push('/dashboard'); return }
        setErrorMsg(e?.error ?? 'Failed to load node.')
        setPhase('error')
      })
  }, [nodeId]) // eslint-disable-line

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
  }, [nodeId]) // eslint-disable-line

  useEffect(() => {
    if (phase === 'task') resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase]) // eslint-disable-line

  // ── feedback ──────────────────────────────────────
  const callFeedback = useCallback(async (
    pair_id: string,
    tile: string,
    inactivity: boolean,
  ) => {
    try {
      const res = await apiFetch(
        `/nodes/snap-gap/${nodeId}/feedback/`,
        {
          method: 'POST',
          body: JSON.stringify({
            pair_id,
            selected_tile: tile,
            inactivity_seconds: inactivity ? 60 : inactiveRef.current,
          }),
        },
      )
      setFbText(res.explanation ?? '')
      setHintText(res.hint ?? '')
      setHintTier(res.hint_tier ?? 0)
      setDrawer(true)
    } catch {
      setFbText('That transition does not fit here. Re-read both sentences.')
      setHintText('')
      setDrawer(true)
    }
  }, [nodeId])

  // ── tile click ────────────────────────────────────
  const handleTile = async (tile: string) => {
    if (!snapNode || tileState !== 'idle' || drawer) return
    resetTimer()

    const pair = snapNode.sentence_pairs[pairIdx]
    if (!pair) return

    try {
      const res = await apiFetch(
        `/nodes/snap-gap/${nodeId}/evaluate-gap/`,
        {
          method: 'POST',
          body: JSON.stringify({
            pair_id: pair.pair_id,
            selected_tile: tile,
          }),
        },
      )

      if (res.result === 'correct') {
        setTileState('correct')
        setBoard(prev => ({ ...prev, [pair.pair_id]: tile }))
        setLocked(prev => [...prev, pair.pair_id])
        setTimeout(() => {
          setTileState('idle')
          if (pairIdx < snapNode.sentence_pairs.length - 1) {
            setPairIdx(i => i + 1)
          }
        }, 900)
      } else {
        setTileState('incorrect')
        setWrongs(n => n + 1)
        setTimeout(() => setTileState('idle'), 600)
        await callFeedback(pair.pair_id, tile, false)
      }
    } catch {
      setErrorMsg('Evaluation failed.')
    }
  }

  // ── submit ────────────────────────────────────────
  const handleSubmit = async () => {
    if (!snapNode || submitting) return
    setSubmitting(true)
    try {
      const res = await apiFetch(
        `/nodes/snap-gap/${nodeId}/mastery/`,
        {
          method: 'POST',
          body: JSON.stringify({ board_state: board }),
        },
      )
      if (res.status === 'mastered') {
        setMasteryData(res)
        setPhase('mastery')
      }
    } catch (e: any) {
      setFbText(
        e?.status === 'incomplete'
          ? 'Some pairs are incorrect. Check and retry.'
          : 'Submission failed. Please try again.',
      )
      setHintText('')
      setDrawer(true)
    } finally {
      setSubmitting(false)
    }
  }

  // ── phase: loading ────────────────────────────────
  if (phase === 'loading') {
    return (
      <div style={{
        minHeight: '100vh', background: '#6b6b6b',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center',
        fontFamily: F, color: '#ddd',
        fontSize: 13, letterSpacing: '0.1em',
      }}>
        LOADING NODE...
      </div>
    )
  }

  // ── phase: error ──────────────────────────────────
  if (phase === 'error') {
    return (
      <div style={{
        minHeight: '100vh', background: '#1e1e1e',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: F, gap: 16,
      }}>
        <p style={{ color: '#ff6b6b', fontSize: 13 }}>
          {errorMsg}
        </p>
        <button
          style={S.btnSm}
          onClick={() => router.push('/dashboard')}
        >
          ← DASHBOARD
        </button>
      </div>
    )
  }

  // ── phase: micro_lesson ───────────────────────────
  if (phase === 'micro_lesson') {
    return (
      <div style={{
        ...S.page,
        background: '#6b6b6b',
        padding: 40,
      }}>
        <div style={S.card}>
          <div style={S.stamp}>MICRO-LESSON</div>
          <h2 style={S.h2}>{snapNode!.title}</h2>
          <p style={S.sub}>{snapNode!.focus}</p>
          <hr style={S.hr} />
          <p style={S.body}>{snapNode!.micro_lesson_text}</p>
          <button
            style={S.btnPrimary}
            onClick={() =>
              setPhase(
                snapNode!.deep_dive_required
                  ? 'deep_dive'
                  : 'task',
              )
            }
          >
            Continue →
          </button>
        </div>
      </div>
    )
  }

  // ── phase: deep_dive ──────────────────────────────
  if (phase === 'deep_dive') {
    return (
      <div style={{
        ...S.page,
        background: '#6b6b6b',
        padding: 40,
      }}>
        <div style={{ ...S.card, maxWidth: 700 }}>
          <div style={S.stamp}>DEEP DIVE READING</div>
          <p style={{
            fontSize: 11, color: '#888',
            margin: '0 0 20px', lineHeight: 1.7,
            fontFamily: F,
          }}>
            Read the full passage carefully before
            the task unlocks.
          </p>
          <p style={{
            fontSize: 14, lineHeight: 1.95,
            color: '#ddd', background: '#222',
            border: '1px solid #444',
            borderRadius: 4, padding: 28,
            margin: '0 0 32px', fontFamily: F,
          }}>
            {snapNode!.reading_passage}
          </p>
          <button
            style={S.btnPrimary}
            onClick={() => setPhase('task')}
          >
            I have finished reading →
          </button>
        </div>
      </div>
    )
  }

  // ── phase: mastery ────────────────────────────────
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100vh', background: '#1e1e1e',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: F,
      }}>
        <div style={{
          maxWidth: 480, width: '100%',
          background: '#0e1e0e',
          border: '2px solid #4ddd94',
          borderRadius: 4, padding: 52,
          textAlign: 'center',
        }}>
          <div style={{
            ...S.stamp,
            color: '#4ddd94',
            borderColor: '#4ddd94',
            fontSize: 16,
            padding: '8px 24px',
          }}>
            ✓ NODE MASTERED
          </div>
          <h2 style={{
            fontSize: 20, color: '#4ddd94',
            margin: '8px 0 16px', fontFamily: F,
          }}>
            {snapNode!.title}
          </h2>
          <p style={{
            fontSize: 12, color: '#aaa',
            margin: '0 0 28px', fontFamily: F,
          }}>
            Streak: {masteryData?.streak ?? 0} days
          </p>
          <div style={{
            display: 'flex', gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            {masteryData?.next_node && (
              <button
                style={S.btnPrimary}
                onClick={() =>
                  router.push(
                    `/nodes/snap-gap/${masteryData.next_node}`,
                  )
                }
              >
                NEXT NODE →
              </button>
            )}
            <button
              style={S.btnSm}
              onClick={() => router.push('/dashboard')}
            >
              ← DASHBOARD
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── phase: task ───────────────────────────────────
  const currentPair   = snapNode!.sentence_pairs[pairIdx]
  const allDone       = locked.length === snapNode!.sentence_pairs.length

  return (
    <div style={S.page}>
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        boxShadow: '0 12px 48px rgba(0,0,0,0.55)',
        borderRadius: 6,
      }}>

        {/* sidebar */}
        <div style={{
          width: 34, background: '#2b2b2b',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 0',
          borderRadius: '6px 0 0 6px',
          borderRight: '1px solid #1a1a1a',
        }}>
          <button
            onClick={() => callFeedback(currentPair?.pair_id ?? '', '', false)}
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              fontSize: 9, fontWeight: 700,
              letterSpacing: '0.14em', color: '#999',
              background: 'none', border: 'none',
              cursor: 'pointer', padding: '10px 4px',
              fontFamily: F, transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#eee')}
            onMouseLeave={e => (e.currentTarget.style.color = '#999')}
          >
            HINT
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              fontSize: 9, fontWeight: 700,
              letterSpacing: '0.14em', color: '#666',
              background: 'none', border: 'none',
              cursor: 'pointer', padding: '10px 4px',
              fontFamily: F, transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
            onMouseLeave={e => (e.currentTarget.style.color = '#666')}
          >
            END SESSION
          </button>
        </div>

        {/* board */}
        <div style={{
          background: '#b8b3ab',
          borderRadius: '0 6px 6px 0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          width: 700,
        }}>

          {/* banner */}
          <div style={{
            padding: '10px 20px 8px',
            textAlign: 'center',
            background: '#b8b3ab',
          }}>
            <div style={{
              display: 'inline-block',
              border: '1.5px solid #888',
              padding: '5px 20px',
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.1em', color: '#333',
              background: 'rgba(255,255,255,0.25)',
              fontFamily: F,
            }}>
              <span style={{ color: '#444' }}>OBJECTIVE: </span>
              <span style={{ color: '#b03030' }}>
                SELECT THE CORRECT TRANSITION TILE TO BRIDGE THE GAP
              </span>
            </div>
          </div>

          {/* progress dots */}
          <div style={{
            padding: '6px 24px 4px',
            display: 'flex', gap: 8,
            justifyContent: 'center',
          }}>
            {snapNode!.sentence_pairs.map((p, i) => (
              <div key={p.pair_id} style={{
                width: 28, height: 6, borderRadius: 3,
                background: locked.includes(p.pair_id)
                  ? '#4ddd94'
                  : i === pairIdx
                  ? '#55aaff'
                  : '#888',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>

          {/* sentence pair */}
          <div style={{ padding: '24px 32px 16px', flex: 1 }}>
            {currentPair && (
              <div>
                {/* sentence A */}
                <div style={{
                  background: '#fff',
                  border: '1.5px solid #ccc',
                  borderRadius: 5,
                  padding: '14px 18px',
                  fontSize: 13, lineHeight: 1.7,
                  color: '#1a1a1a', fontFamily: F,
                  marginBottom: 12,
                }}>
                  {currentPair.sentence_a}
                </div>

                {/* gap */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center',
                  margin: '8px 0', gap: 10,
                }}>
                  <div style={{
                    flex: 1, height: 1,
                    background: '#888', opacity: 0.5,
                  }} />
                  <div style={{
                    border: tileState === 'correct'
                      ? '2px solid #4ddd94'
                      : tileState === 'incorrect'
                      ? '2px solid #cc3333'
                      : '2px dashed #888',
                    borderRadius: 4,
                    padding: '6px 20px',
                    fontSize: 11, fontWeight: 700,
                    letterSpacing: '0.12em',
                    color: tileState === 'correct'
                      ? '#4ddd94'
                      : tileState === 'incorrect'
                      ? '#cc3333'
                      : '#888',
                    background: tileState === 'correct'
                      ? 'rgba(77,221,148,0.1)'
                      : tileState === 'incorrect'
                      ? 'rgba(204,51,51,0.1)'
                      : 'rgba(255,255,255,0.3)',
                    fontFamily: F,
                    minWidth: 160,
                    textAlign: 'center',
                    transition: 'all 0.25s',
                  }}>
                    {tileState === 'correct'
                      ? `✓ ${board[currentPair.pair_id] ?? ''}`
                      : tileState === 'incorrect'
                      ? '✕ INCORRECT'
                      : '[ SELECT A TILE ]'}
                  </div>
                  <div style={{
                    flex: 1, height: 1,
                    background: '#888', opacity: 0.5,
                  }} />
                </div>

                {/* sentence B */}
                <div style={{
                  background: '#fff',
                  border: '1.5px solid #ccc',
                  borderRadius: 5,
                  padding: '14px 18px',
                  fontSize: 13, lineHeight: 1.7,
                  color: '#1a1a1a', fontFamily: F,
                  marginTop: 12,
                }}>
                  {currentPair.sentence_b}
                </div>
              </div>
            )}

            {allDone && (
              <div style={{
                textAlign: 'center',
                padding: '20px 0 8px',
                fontSize: 11, color: '#4ddd94',
                fontWeight: 700, letterSpacing: '0.1em',
                fontFamily: F,
              }}>
                ALL GAPS BRIDGED — SUBMIT WHEN READY
              </div>
            )}
          </div>

          {/* tile dock */}
          <div style={{
            background: '#a8a39b',
            borderTop: '1px solid #888',
            padding: '14px 24px',
          }}>
            <div style={{
              fontSize: 9, fontWeight: 700,
              letterSpacing: '0.12em', color: '#555',
              marginBottom: 10, fontFamily: F,
            }}>
              TRANSITION TILE DOCK
            </div>
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 8,
            }}>
              {snapNode!.transition_tile_dock.map(tile => (
                <button
                  key={tile}
                  disabled={tileState !== 'idle' || allDone}
                  onClick={() => handleTile(tile)}
                  style={{
                    padding: '8px 16px',
                    background: '#f0ece4',
                    border: '1.5px solid #888',
                    borderRadius: 3,
                    fontSize: 11, fontWeight: 700,
                    fontFamily: F,
                    cursor: tileState !== 'idle' || allDone
                      ? 'not-allowed' : 'pointer',
                    opacity: tileState !== 'idle' || allDone
                      ? 0.5 : 1,
                    color: '#1a1a1a',
                    transition: 'all 0.12s',
                    letterSpacing: '0.04em',
                  }}
                  onMouseEnter={e => {
                    if (tileState === 'idle' && !allDone) {
                      e.currentTarget.style.background = '#1a1a1a'
                      e.currentTarget.style.color = '#f0ece4'
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#f0ece4'
                    e.currentTarget.style.color = '#1a1a1a'
                  }}
                >
                  {tile}
                </button>
              ))}
            </div>
          </div>

          {/* submit bar */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 24px 14px',
            background: '#b8b3ab',
          }}>
            <span style={{
              fontSize: 10, color: '#666',
              fontWeight: 700, letterSpacing: '0.08em',
              fontFamily: F,
            }}>
              {locked.length} / {snapNode!.sentence_pairs.length} PAIRS BRIDGED
              {wrongs > 0 && (
                <span style={{ marginLeft: 14, color: '#b03030' }}>
                  ATTEMPTS: {wrongs}
                </span>
              )}
            </span>
            <button
              disabled={!allDone || submitting}
              onClick={handleSubmit}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: submitting ? '#555' : allDone ? '#2b2b2b' : '#888',
                color: '#f0ece4',
                border: 'none', borderRadius: 2,
                padding: '10px 26px',
                fontSize: 11, fontWeight: 700,
                letterSpacing: '0.14em',
                cursor: allDone && !submitting ? 'pointer' : 'not-allowed',
                fontFamily: F, transition: 'background 0.2s',
              }}
            >
              {submitting ? 'CHECKING...' : 'SUBMIT →'}
            </button>
          </div>
        </div>
      </div>

      {/* feedback drawer */}
      {drawer && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#180a0a',
          border: '2px solid #cc3333', borderBottom: 'none',
          padding: '20px 32px 28px',
          zIndex: 200, maxHeight: 300, overflowY: 'auto',
          fontFamily: F,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 12,
          }}>
            <div style={{
              ...S.stamp,
              color: '#ff6b6b', borderColor: '#ff6b6b',
              marginBottom: 0,
            }}>
              FEEDBACK
            </div>
            <button
              onClick={() => { setDrawer(false); resetTimer() }}
              style={{
                background: 'none', border: 'none',
                color: '#ff6b6b', fontSize: 18,
                cursor: 'pointer', fontFamily: F,
              }}
            >
              ✕
            </button>
          </div>

          {fbText && (
            <p style={{
              fontSize: 13, color: '#ddd',
              lineHeight: 1.7, marginBottom: 12,
              fontFamily: F,
            }}>
              {fbText}
            </p>
          )}

          {hintText && (
            <div style={{
              background: '#2b1010',
              border: '1px solid #663333',
              borderRadius: 3, padding: 12,
              marginBottom: 16,
            }}>
              <div style={{
                fontSize: 9, fontWeight: 700,
                letterSpacing: '0.12em', color: '#aa5533',
                marginBottom: 6, fontFamily: F,
              }}>
                SCAFFOLD HINT — TIER {hintTier}
              </div>
              <p style={{
                fontSize: 12, color: '#ddd',
                lineHeight: 1.7, margin: 0, fontFamily: F,
              }}>
                {hintText}
              </p>
            </div>
          )}

          <button
            style={S.btnSm}
            onClick={() => { setDrawer(false); resetTimer() }}
          >
            Close and reattempt
          </button>
        </div>
      )}
    </div>
  )
}