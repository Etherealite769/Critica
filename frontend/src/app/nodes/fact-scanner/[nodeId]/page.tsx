'use client'

import {
  useState, useEffect,
  useRef, useCallback,
} from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'

// ── Types ───────────────────────────────────────
interface ArticleSentence {
  sentence_id: string
  text:        string
}

interface FactNodeData {
  node_id:             string
  title:               string
  focus:               string
  craap_criterion:     string
  micro_lesson_text:   string
  reading_passage:     string
  deep_dive_required:  boolean
  article_sentences:   ArticleSentence[]
}

type Phase = 'loading' | 'micro_lesson' | 'deep_dive'
           | 'task'    | 'mastery'      | 'error'

// ── Styles ──────────────────────────────────────
const F = "'Courier New', Courier, monospace"

const S = {
  stamp: {
    display:       'inline-block' as const,
    border:        '2px solid #888',
    padding:       '3px 14px',
    fontSize:      10,
    fontWeight:    700,
    letterSpacing: '0.15em',
    color:         '#aaa',
    marginBottom:  12,
    fontFamily:    F,
  } as React.CSSProperties,
  btnPrimary: {
    padding:       '10px 24px',
    background:    '#f0ece4',
    border:        '2px solid #888',
    borderRadius:  2,
    color:         '#111',
    fontFamily:    F,
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
    fontFamily:   F,
    fontSize:     10,
    fontWeight:   700,
    cursor:       'pointer',
  } as React.CSSProperties,
}

// ── CRAAP criterion color map ────────────────────
const CRITERION_COLOR: Record<string, string> = {
  CURRENCY:   '#3a7bd5',
  RELEVANCE:  '#8e44ad',
  AUTHORITY:  '#c0392b',
  ACCURACY:   '#16a085',
  PURPOSE:    '#d35400',
}

// ── Main component ───────────────────────────────
export default function FactScannerPage() {
  const router = useRouter()
  const params = useParams()
  const nodeId = params.nodeId as string

  // core state
  const [phase, setPhase]       = useState<Phase>('loading')
  const [factNode, setFactNode] = useState<FactNodeData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // task state
  const [quarantined, setQuarantined]   = useState<string[]>([])
  const [flawReasons, setFlawReasons]   = useState<Record<string, string>>({})
  const [evaluating, setEvaluating]     = useState<string | null>(null)
  const [wrongs, setWrongs]             = useState(0)
  const [masteryData, setMasteryData]   = useState<any>(null)
  const [submitting, setSubmitting]     = useState(false)

  // feedback state
  const [fbText, setFbText]   = useState('')
  const [drawer, setDrawer]   = useState(false)

  // hint overlay
  const [hintOverlay, setHintOverlay]         = useState(false)
  const [hintOverlayText, setHintOverlayText] = useState('')
  const [hintOverlayTier, setHintOverlayTier] = useState(0)

  // timer
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const inactiveRef = useRef(0)

  // ── Load ───────────────────────────────────
  useEffect(() => {
    apiFetch(`/nodes/fact-scanner/${nodeId}/`)
      .then((d: FactNodeData) => {
        setFactNode(d)
        setPhase('micro_lesson')
      })
      .catch((e: any) => {
        if (e?.status === 401)               { router.push('/auth');      return }
        if (e?.error === 'Node is locked.')  { router.push('/dashboard'); return }
        setErrorMsg(e?.error ?? 'Failed to load node.')
        setPhase('error')
      })
  }, [nodeId]) // eslint-disable-line

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

  // ── Feedback ───────────────────────────────
  const callFeedback = useCallback(async (
    sentence_id: string,
    inactivity:  boolean,
  ) => {
    try {
      const res = await apiFetch(
        `/nodes/fact-scanner/${nodeId}/feedback/`,
        {
          method: 'POST',
          body: JSON.stringify({
            sentence_id,
            inactivity_seconds: inactivity ? 61 : inactiveRef.current,
          }),
        },
      )
      setFbText(res.explanation ?? 'That sentence does not violate the criterion being tested.')
      setDrawer(true)
    } catch {
      setFbText('That sentence does not violate the CRAAP criterion. Re-read the micro-lesson.')
      setDrawer(true)
    }
  }, [nodeId])

  // ── Hint ───────────────────────────────────
  const fetchHint = useCallback(async (
    isInactivity = false,
  ) => {
    try {
      const res = await apiFetch(
        `/nodes/fact-scanner/${nodeId}/feedback/`,
        {
          method: 'POST',
          body: JSON.stringify({
            sentence_id:        '',
            inactivity_seconds: 61,
          }),
        },
      )
      const text = res.hint
        || res.explanation
        || 'Re-read the micro-lesson and apply the criterion to each sentence carefully.'
      setHintOverlayText(text)
      setHintOverlayTier(res.hint_tier ?? 0)
      setHintOverlay(true)
    } catch {
      setHintOverlayText(
        'Re-read the micro-lesson and apply the criterion to each sentence carefully.')
      setHintOverlay(true)
    }
  }, [nodeId])

  // ── Sentence tap ───────────────────────────
  const handleSentenceTap = async (
    sentence_id: string,
  ) => {
    if (!factNode) return
    if (evaluating) return
    if (quarantined.includes(sentence_id)) return
    if (drawer) return

    resetTimer()
    setEvaluating(sentence_id)

    try {
      const res = await apiFetch(
        `/nodes/fact-scanner/${nodeId}/evaluate-sentence/`,
        {
          method: 'POST',
          body: JSON.stringify({ sentence_id }),
        },
      )

      if (res.result === 'correct') {
        setQuarantined(prev => [...prev, sentence_id])
        setFlawReasons(prev => ({
          ...prev,
          [sentence_id]: res.flaw_reason,
        }))
      } else {
        setWrongs(n => n + 1)
        await callFeedback(sentence_id, false)
      }
    } catch {
      setErrorMsg('Evaluation failed.')
    } finally {
      setEvaluating(null)
    }
  }

  // ── Submit mastery ─────────────────────────
  const handleSubmitMastery = async () => {
    if (!factNode || submitting) return
    setSubmitting(true)
    try {
      const res = await apiFetch(
        `/nodes/fact-scanner/${nodeId}/mastery/`,
        {
          method: 'POST',
          body: JSON.stringify({
            quarantined_ids: quarantined,
          }),
        },
      )
      if (res.status === 'mastered') {
        setMasteryData(res)
        setPhase('mastery')
      }
    } catch (e: any) {
      setFbText(
        e?.status === 'incomplete'
          ? 'Some flawed sentences were missed. Keep scanning.'
          : 'Submission failed. Please try again.',
      )
      setDrawer(true)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Phase: loading ─────────────────────────
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

  // ── Phase: error ───────────────────────────
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
        <button style={S.btnSm}
          onClick={() => router.push('/dashboard')}>
          ← DASHBOARD
        </button>
      </div>
    )
  }

  // ── Phase: micro_lesson ────────────────────
  if (phase === 'micro_lesson') {
    const color = CRITERION_COLOR[
      factNode!.craap_criterion] ?? '#888'
    return (
      <div style={{
        minHeight: '100vh', background: '#6b6b6b',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center',
        padding: 40, fontFamily: F,
      }}>
        <div style={{
          maxWidth: 640, width: '100%',
          background: '#2b2b2b',
          border: '1px solid #444',
          borderRadius: 4, padding: 48,
        }}>
          <div style={S.stamp}>MICRO-LESSON</div>

          {/* CRAAP criterion badge */}
          <div style={{
            display: 'inline-block',
            background: color,
            color: '#fff',
            fontFamily: F,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.18em',
            padding: '4px 14px',
            borderRadius: 2,
            marginBottom: 14,
          }}>
            CRAAP — {factNode!.craap_criterion}
          </div>

          <h2 style={{
            fontSize: 20, fontWeight: 700,
            color: '#f0ece4', margin: '0 0 6px',
            fontFamily: F,
          }}>
            {factNode!.title}
          </h2>
          <p style={{
            fontSize: 12, color: '#aaa',
            margin: '0 0 16px', fontFamily: F,
          }}>
            {factNode!.focus}
          </p>
          <hr style={{
            border: 'none',
            borderTop: '1px solid #444',
            margin: '16px 0',
          }} />
          <p style={{
            fontSize: 13, lineHeight: 1.85,
            color: '#ccc', margin: '0 0 32px',
            fontFamily: F,
          }}>
            {factNode!.micro_lesson_text}
          </p>
          <button
            style={S.btnPrimary}
            onClick={() => setPhase(
              factNode!.deep_dive_required
                ? 'deep_dive' : 'task',
            )}
          >
            Continue →
          </button>
        </div>
      </div>
    )
  }

  // ── Phase: deep_dive ───────────────────────
  if (phase === 'deep_dive') {
    return (
      <div style={{
        minHeight: '100vh', background: '#6b6b6b',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center',
        padding: 40, fontFamily: F,
      }}>
        <div style={{
          maxWidth: 700, width: '100%',
          background: '#2b2b2b',
          border: '1px solid #444',
          borderRadius: 4, padding: 48,
        }}>
          <div style={S.stamp}>DEEP DIVE READING</div>
          <p style={{
            fontSize: 11, color: '#888',
            margin: '0 0 20px', lineHeight: 1.7,
            fontFamily: F,
          }}>
            Read the full article carefully before
            the task unlocks.
          </p>
          <p style={{
            fontSize: 14, lineHeight: 1.95,
            color: '#ddd', background: '#222',
            border: '1px solid #444',
            borderRadius: 4, padding: 28,
            margin: '0 0 32px', fontFamily: F,
          }}>
            {factNode!.reading_passage}
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

  // ── Phase: mastery ─────────────────────────
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
            fontSize: 16, padding: '8px 24px',
          }}>
            ✓ REPORT FILED
          </div>
          <h2 style={{
            fontSize: 20, color: '#4ddd94',
            margin: '8px 0 16px', fontFamily: F,
          }}>
            {factNode!.title}
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
                    `/nodes/fact-scanner/${masteryData.next_node}`,
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

  // ── Phase: task ────────────────────────────
  const allQuarantined =
    factNode!.article_sentences.filter(
      s => quarantined.includes(s.sentence_id)
    ).length > 0
    && factNode!.article_sentences.every(s => {
      // We don't know which are flawed on client
      // allQuarantined is driven by submit button
      // which the backend controls
      return true
    })

  // Better: track total quarantined count
  // Submit activates when at least 1 quarantined
  // Backend validates the full set
  const canSubmit = quarantined.length > 0

  const criterionColor = CRITERION_COLOR[
    factNode!.craap_criterion] ?? '#888'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#686664',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: F,
    }}>
      <div style={{
        display: 'flex', alignItems: 'stretch',
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
            onClick={() => fetchHint()}
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              fontSize: 9, fontWeight: 700,
              letterSpacing: '0.14em', color: '#999',
              background: 'none', border: 'none',
              cursor: 'pointer', padding: '10px 4px',
              fontFamily: F, transition: 'color 0.15s',
            }}
            onMouseEnter={e =>
              (e.currentTarget.style.color = '#eee')}
            onMouseLeave={e =>
              (e.currentTarget.style.color = '#999')}
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
            onMouseEnter={e =>
              (e.currentTarget.style.color = '#aaa')}
            onMouseLeave={e =>
              (e.currentTarget.style.color = '#666')}
          >
            END SESSION
          </button>
        </div>

        {/* main panel */}
        <div style={{
          background: '#b8b3ab',
          borderRadius: '0 6px 6px 0',
          display: 'flex', flexDirection: 'column',
          width: 740, overflow: 'hidden',
        }}>

          {/* banner */}
          <div style={{
            padding: '10px 20px 8px',
            textAlign: 'center',
            background: '#b8b3ab',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              border: '1.5px solid #888',
              padding: '5px 20px',
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.1em', color: '#333',
              background: 'rgba(255,255,255,0.25)',
              fontFamily: F,
            }}>
              <span style={{ color: '#444' }}>
                OBJECTIVE:
              </span>
              <span style={{ color: '#b03030' }}>
                IDENTIFY AND QUARANTINE THE
                SENTENCE THAT VIOLATES
              </span>
              <span style={{
                background: criterionColor,
                color: '#fff',
                padding: '1px 8px',
                borderRadius: 2,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.12em',
              }}>
                {factNode!.craap_criterion}
              </span>
            </div>
          </div>

          {/* progress */}
          <div style={{
            padding: '6px 24px 2px',
            display: 'flex', gap: 8,
            justifyContent: 'center',
          }}>
            {factNode!.article_sentences.map(s => (
              <div key={s.sentence_id} style={{
                width: 20, height: 6, borderRadius: 3,
                background: quarantined.includes(
                  s.sentence_id)
                  ? '#cc3333'
                  : evaluating === s.sentence_id
                  ? '#f0a500'
                  : '#888',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>

          {/* instruction */}
          <div style={{
            padding: '4px 24px 8px',
            textAlign: 'center',
            fontSize: 9, color: '#666',
            fontFamily: F, letterSpacing: '0.1em',
          }}>
            {quarantined.length > 0
              ? `${quarantined.length} SENTENCE${
                  quarantined.length > 1 ? 'S' : ''
                } QUARANTINED`
              : 'TAP A SENTENCE TO EVALUATE IT'}
          </div>

          {/* article sentences */}
          <div style={{
            padding: '8px 24px 16px',
            flex: 1, overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            {factNode!.article_sentences.map(
              (sentence, idx) => {
              const isQuarantined =
                quarantined.includes(
                  sentence.sentence_id)
              const isEvaluating  =
                evaluating === sentence.sentence_id

              return (
                <div
                  key={sentence.sentence_id}
                  onClick={() =>
                    handleSentenceTap(
                      sentence.sentence_id)}
                  style={{
                    position: 'relative',
                    background: isQuarantined
                      ? '#2a0a0a'
                      : '#fff',
                    border: isQuarantined
                      ? '2px solid #cc3333'
                      : isEvaluating
                      ? '2px solid #f0a500'
                      : '1.5px solid #ccc',
                    borderRadius: 5,
                    padding: '14px 18px',
                    cursor: isQuarantined
                      ? 'default'
                      : evaluating
                      ? 'not-allowed'
                      : 'pointer',
                    transition: 'all 0.2s',
                    opacity: evaluating
                      && !isEvaluating ? 0.6 : 1,
                  }}
                >
                  {/* sentence number */}
                  <div style={{
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    color: isQuarantined
                      ? '#cc3333' : '#aaa',
                    marginBottom: 6,
                    fontFamily: F,
                  }}>
                    SENTENCE {idx + 1}
                    {isEvaluating && (
                      <span style={{
                        marginLeft: 8,
                        color: '#f0a500',
                      }}>
                        EVALUATING...
                      </span>
                    )}
                  </div>

                  {/* sentence text */}
                  <p style={{
                    fontSize: 13,
                    lineHeight: 1.75,
                    color: isQuarantined
                      ? '#ffaaaa' : '#1a1a1a',
                    margin: 0,
                    fontFamily: F,
                  }}>
                    {sentence.text}
                  </p>

                  {/* flaw reason (shown after quarantine) */}
                  {isQuarantined &&
                    flawReasons[sentence.sentence_id] && (
                    <div style={{
                      marginTop: 10,
                      padding: '8px 12px',
                      background: '#3a0a0a',
                      border: '1px solid #663333',
                      borderRadius: 3,
                      fontSize: 11,
                      color: '#ffcccc',
                      lineHeight: 1.6,
                      fontFamily: F,
                    }}>
                      <span style={{
                        fontSize: 8,
                        fontWeight: 700,
                        letterSpacing: '0.14em',
                        color: '#cc3333',
                        display: 'block',
                        marginBottom: 4,
                      }}>
                        VIOLATION IDENTIFIED
                      </span>
                      {flawReasons[sentence.sentence_id]}
                    </div>
                  )}

                  {/* quarantined stamp */}
                  {isQuarantined && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      right: 24,
                      transform: 'translateY(-50%) rotate(-8deg)',
                      fontFamily: F,
                      fontSize: 22,
                      fontWeight: 700,
                      color: '#cc3333',
                      border: '3px solid #cc3333',
                      padding: '2px 10px',
                      opacity: 0.85,
                      letterSpacing: '0.1em',
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap',
                    }}>
                      QUARANTINED
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* submit bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 24px 14px',
            background: '#b8b3ab',
          }}>
            <span style={{
              fontSize: 10, color: '#666',
              fontWeight: 700, letterSpacing: '0.08em',
              fontFamily: F,
            }}>
              {quarantined.length} QUARANTINED
              {wrongs > 0 && (
                <span style={{
                  marginLeft: 14, color: '#b03030',
                }}>
                  WRONG TAPS: {wrongs}
                </span>
              )}
            </span>
            <button
              disabled={!canSubmit || submitting}
              onClick={handleSubmitMastery}
              style={{
                display: 'flex',
                alignItems: 'center', gap: 12,
                background: submitting
                  ? '#555'
                  : canSubmit
                  ? '#2b2b2b'
                  : '#888',
                color: '#f0ece4',
                border: 'none', borderRadius: 2,
                padding: '10px 26px',
                fontSize: 11, fontWeight: 700,
                letterSpacing: '0.14em',
                cursor: canSubmit && !submitting
                  ? 'pointer' : 'not-allowed',
                fontFamily: F,
                transition: 'background 0.2s',
              }}
            >
              {submitting
                ? 'FILING REPORT...'
                : 'SUBMIT REPORT →'}
            </button>
          </div>
        </div>
      </div>

      {/* hint overlay — matches all modules */}
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
              fontSize: 9, fontWeight: 700,
              letterSpacing: '0.14em', color: '#888',
              marginBottom: 8, fontFamily: F,
            }}>
              SCAFFOLD HINT
              {hintOverlayTier > 0
                ? ` — TIER ${hintOverlayTier}`
                : ''}
            </div>
            <p style={{
              fontSize: 12, color: '#222',
              lineHeight: 1.65, margin: '0 0 14px',
              fontFamily: F,
            }}>
              {hintOverlayText}
            </p>
            <button
              onClick={() => setHintOverlay(false)}
              style={{
                fontSize: 10, fontWeight: 700,
                color: '#444', background: '#eee',
                border: '1px solid #ccc',
                padding: '5px 14px', cursor: 'pointer',
                fontFamily: F, letterSpacing: '0.06em',
                borderRadius: 2,
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* feedback drawer */}
      {drawer && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#180a0a',
          border: '2px solid #cc3333',
          borderBottom: 'none',
          padding: '20px 32px 28px',
          zIndex: 200, maxHeight: 300,
          overflowY: 'auto', fontFamily: F,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 12,
          }}>
            <div style={{
              ...S.stamp,
              color: '#ff6b6b',
              borderColor: '#ff6b6b',
              marginBottom: 0,
            }}>
              FEEDBACK
            </div>
            <button
              onClick={() => {
                setDrawer(false)
                resetTimer()
              }}
              style={{
                background: 'none', border: 'none',
                color: '#ff6b6b', fontSize: 18,
                cursor: 'pointer', fontFamily: F,
              }}
            >
              ✕
            </button>
          </div>
          <p style={{
            fontSize: 13, color: '#ddd',
            lineHeight: 1.7, marginBottom: 16,
            fontFamily: F,
          }}>
            {fbText}
          </p>
          <button
            style={S.btnSm}
            onClick={() => {
              setDrawer(false)
              resetTimer()
            }}
          >
            Close and reattempt
          </button>
        </div>
      )}
    </div>
  )
}