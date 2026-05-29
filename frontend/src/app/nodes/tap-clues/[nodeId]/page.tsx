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
  word_id:         string
  word:            string
  definition:      string
  contextual_usage:string
  translation:     string
}

type Phase = 'loading' | 'micro_lesson' | 'deep_dive'
           | 'task'    | 'mastery'      | 'error'

// ── Style constants ─────────────────────────────
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

// ── Helper: split passage into word tokens ──────
function tokenizePassage(
  passage:     string,
  lockedWords: LockedWordMeta[],
): { text: string; isLocked: boolean; word_id?: string; idx: number }[] {
  const tokens: {
    text: string; isLocked: boolean;
    word_id?: string; idx: number
  }[] = []

  // Build a map of position_index → locked word
  const posMap: Record<number, LockedWordMeta> = {}
  lockedWords.forEach(lw => {
    posMap[lw.position_index] = lw
  })

  // Split on spaces, keeping punctuation attached
  const words = passage.split(/(\s+)/)
  let wordIdx = 0

  words.forEach((chunk, i) => {
    if (/^\s+$/.test(chunk)) {
      tokens.push({
        text: chunk, isLocked: false, idx: -1,
      })
      return
    }
    // Strip trailing punctuation to match word
    const clean = chunk.replace(/[^a-zA-Z']/g, '')
      .toLowerCase()
    const locked = lockedWords.find(
      lw => lw.position_index === wordIdx
        || lw.word.toLowerCase() === clean,
    )
    tokens.push({
      text:     chunk,
      isLocked: !!locked,
      word_id:  locked?.word_id,
      idx:      wordIdx,
    })
    if (!/^\s+$/.test(chunk)) wordIdx++
  })

  return tokens
}

// ── Main component ──────────────────────────────
export default function TapCluesPage() {
  const router = useRouter()
  const params = useParams()
  const nodeId = params.nodeId as string

  // core state
  const [phase, setPhase]       = useState<Phase>('loading')
  const [tapNode, setTapNode]   = useState<TapNodeData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // task state
  const [activeWordId, setActiveWordId]   = useState<string | null>(null)
  const [foundClues, setFoundClues]       = useState<Record<string, string[]>>({})
  const [unlockedWords, setUnlockedWords] = useState<string[]>([])
  const [defPanel, setDefPanel]           = useState<DefinitionPanel | null>(null)
  const [pulseClue, setPulseClue]         = useState<string | null>(null)
  const [masteryData, setMasteryData]     = useState<any>(null)
  const [submitting, setSubmitting]       = useState(false)

  // feedback state
  const [fbText, setFbText]     = useState('')
  const [drawer, setDrawer]     = useState(false)

  // hint overlay (matches Module 1/2 format)
  const [hintOverlay, setHintOverlay]         = useState(false)
  const [hintOverlayText, setHintOverlayText] = useState('')
  const [hintOverlayTier, setHintOverlayTier] = useState(0)

  // timer
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

  // ── Fetch feedback ─────────────────────────
  const callFeedback = useCallback(async (
    word_id:    string,
    clue_word:  string,
    inactivity: boolean,
  ) => {
    try {
      const res = await apiFetch(
        `/nodes/tap-clues/${nodeId}/feedback/`,
        {
          method: 'POST',
          body: JSON.stringify({
            word_id,
            clue_word,
            inactivity_seconds: inactivity ? 60 : inactiveRef.current,
          }),
        },
      )
      setFbText(res.explanation ?? 'That word is not a valid context clue.')
      setDrawer(true)
    } catch {
      setFbText('That word is not a valid context clue. Look for synonyms or definitions nearby.')
      setDrawer(true)
    }
  }, [nodeId])

  // ── Fetch hint (HINT button) ───────────────
  const fetchHint = useCallback(async (
    isInactivity = false,
  ) => {
    try {
      const res = await apiFetch(
        `/nodes/tap-clues/${nodeId}/feedback/`,
        {
          method: 'POST',
          body: JSON.stringify({
            word_id:            activeWordId ?? '',
            clue_word:          '',
            inactivity_seconds: isInactivity ? 61 : 61,
          }),
        },
      )
      const text = res.hint
        || res.explanation
        || 'Look for words near the locked word that hint at its meaning.'
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
    word:            string,
    definition:      string,
    contextual_usage:string,
    translation:     string,
  ) => {
    try {
      await apiFetch('/lexical/log/', {
        method: 'POST',
        body: JSON.stringify({
          word_data: {
            word, definition,
            contextual_usage, translation,
          },
          task_id: nodeId,
        }),
      })
    } catch {
      // Non-blocking — lexical logging failure
      // does not block mastery
      console.warn('Lexical log failed silently')
    }
  }, [nodeId])

  // ── Handle tap on a word span ──────────────
  const handleWordTap = async (
    word:    string,
    token:   { text: string; isLocked: boolean; word_id?: string; idx: number },
  ) => {
    if (!tapNode) return
    resetTimer()

    // If no active word yet — tap must be on a locked word
    if (!activeWordId) {
      if (token.isLocked && token.word_id) {
        // Only activate if not already unlocked
        if (!unlockedWords.includes(token.word_id)) {
          setActiveWordId(token.word_id)
        }
      }
      return
    }

    // If tapping a different locked word — switch active
    if (token.isLocked && token.word_id
        && token.word_id !== activeWordId
        && !unlockedWords.includes(token.word_id)) {
      setActiveWordId(token.word_id)
      return
    }

    // If tapping the active locked word — deselect
    if (token.isLocked && token.word_id === activeWordId) {
      setActiveWordId(null)
      return
    }

    // Tapping a regular word as a clue
    if (!token.isLocked) {
      // Clean the word for comparison
      const cleanWord = word.replace(/[^a-zA-Z']/g, '').toLowerCase()
      if (!cleanWord) return

      const currentFound = foundClues[activeWordId] ?? []

      try {
        const res = await apiFetch(
          `/nodes/tap-clues/${nodeId}/evaluate-clue/`,
          {
            method: 'POST',
            body: JSON.stringify({
              word_id:     activeWordId,
              clue_word:   cleanWord,
              found_clues: currentFound,
            }),
          },
        )

        if (res.result === 'correct') {
          // Visual pulse animation
          setPulseClue(cleanWord)
          setTimeout(() => setPulseClue(null), 600)

          if (res.all_clues_found) {
            // Word unlocked
            setUnlockedWords(prev => [
              ...prev, activeWordId,
            ])
            setDefPanel({
              word_id:          activeWordId,
              word:             res.word,
              definition:       res.definition,
              contextual_usage: res.contextual_usage,
              translation:      res.translation,
            })
            setFoundClues(prev => ({
              ...prev,
              [activeWordId]: res.found_clues,
            }))
            setActiveWordId(null)
            // Log to lexical deck
            await logWordToLexical(
              res.word,
              res.definition,
              res.contextual_usage,
              res.translation,
            )
          } else {
            setFoundClues(prev => ({
              ...prev,
              [activeWordId]: res.found_clues,
            }))
          }
        } else {
          await callFeedback(
            activeWordId, cleanWord, false)
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
      const res = await apiFetch(
        `/nodes/tap-clues/${nodeId}/mastery/`,
        {
          method: 'POST',
          body: JSON.stringify({
            unlocked_word_ids: unlockedWords,
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
          ? 'Some words are still locked. Tap them to find their clues.'
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
          <h2 style={{
            fontSize: 20, fontWeight: 700,
            color: '#f0ece4', margin: '0 0 6px',
            fontFamily: F,
          }}>
            {tapNode!.title}
          </h2>
          <p style={{
            fontSize: 12, color: '#aaa',
            margin: '0 0 16px', fontFamily: F,
          }}>
            {tapNode!.focus}
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
            {tapNode!.micro_lesson_text}
          </p>
          <button
            style={S.btnPrimary}
            onClick={() => setPhase(
              tapNode!.deep_dive_required
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
            {tapNode!.reading_passage}
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
            ✓ NODE MASTERED
          </div>
          <h2 style={{
            fontSize: 20, color: '#4ddd94',
            margin: '8px 0 16px', fontFamily: F,
          }}>
            {tapNode!.title}
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
                    `/nodes/tap-clues/${masteryData.next_node}`,
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
  const tokens = tokenizePassage(
    tapNode!.reading_passage,
    tapNode!.locked_words,
  )
  const allUnlocked =
    unlockedWords.length === tapNode!.locked_words.length

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
          width: 700,
          overflow: 'hidden',
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
              <span style={{ color: '#444' }}>
                OBJECTIVE:{' '}
              </span>
              <span style={{ color: '#b03030' }}>
                TAP THE LOCKED WORDS,
                THEN TAP SURROUNDING CLUE WORDS
                TO UNLOCK THEIR MEANING
              </span>
            </div>
          </div>

          {/* word progress dots */}
          <div style={{
            padding: '6px 24px 4px',
            display: 'flex', gap: 8,
            justifyContent: 'center',
          }}>
            {tapNode!.locked_words.map(lw => (
              <div key={lw.word_id} style={{
                width: 28, height: 6, borderRadius: 3,
                background:
                  unlockedWords.includes(lw.word_id)
                    ? '#4ddd94'
                    : activeWordId === lw.word_id
                    ? '#f0a500'
                    : '#888',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>

          {/* instruction line */}
          <div style={{
            padding: '4px 24px 8px',
            textAlign: 'center',
            fontSize: 9, color: '#666',
            fontFamily: F, letterSpacing: '0.1em',
          }}>
            {activeWordId
              ? `FINDING CLUES FOR: "${
                  tapNode!.locked_words.find(
                    lw => lw.word_id === activeWordId
                  )?.word.toUpperCase()
                }" — ${
                  (foundClues[activeWordId] ?? []).length
                } OF ${
                  tapNode!.locked_words.find(
                    lw => lw.word_id === activeWordId
                  )
                    ? '?' : '?'
                } CLUES FOUND`
              : allUnlocked
              ? 'ALL WORDS UNLOCKED'
              : 'TAP A HIGHLIGHTED WORD TO BEGIN'}
          </div>

          {/* passage */}
          <div style={{
            padding: '16px 28px 20px',
            flex: 1,
            overflowY: 'auto',
          }}>
            <div style={{
              background: '#fff',
              border: '1.5px solid #ccc',
              borderRadius: 5,
              padding: '20px 22px',
              fontSize: 14,
              lineHeight: 2.0,
              color: '#1a1a1a',
              fontFamily: F,
            }}>
              {tokens.map((token, i) => {
                if (/^\s+$/.test(token.text)) {
                  return (
                    <span key={i}>{token.text}</span>
                  )
                }

                const isLocked    = token.isLocked
                const wordId      = token.word_id
                const isUnlocked  = wordId
                  ? unlockedWords.includes(wordId)
                  : false
                const isActive    = wordId
                  ? activeWordId === wordId
                  : false
                const cleanWord   = token.text
                  .replace(/[^a-zA-Z']/g, '')
                  .toLowerCase()
                const isPulse     = pulseClue === cleanWord

                let color     = '#1a1a1a'
                let bg        = 'transparent'
                let border    = 'none'
                let fontWeight: number = 400
                let cursor    = 'pointer'
                let textDecor = 'none'

                if (isLocked && isUnlocked) {
                  // Unlocked word — green
                  color      = '#2e7d32'
                  fontWeight = 700
                  textDecor  = 'underline'
                  cursor     = 'pointer'
                } else if (isLocked && isActive) {
                  // Active locked word — gold/amber
                  color      = '#b06000'
                  bg         = 'rgba(240,165,0,0.15)'
                  border     = '1px solid #f0a500'
                  fontWeight = 700
                  cursor     = 'pointer'
                } else if (isLocked) {
                  // Unactivated locked word — amber
                  color      = '#b06000'
                  fontWeight = 700
                  textDecor  = 'underline'
                  cursor     = 'pointer'
                } else if (activeWordId && !isLocked) {
                  // Clue mode — all non-locked words tappable
                  cursor = 'pointer'
                  if (isPulse) {
                    // Pulse animation on correct clue
                    bg     = 'rgba(77,221,148,0.3)'
                    border = '1px solid #4ddd94'
                    color  = '#2e7d32'
                  }
                }

                return (
                  <span
                    key={i}
                    onClick={() =>
                      handleWordTap(token.text, token)}
                    style={{
                      color,
                      background:     bg,
                      border,
                      borderRadius:   border !== 'none'
                        ? 2 : 0,
                      fontWeight,
                      cursor,
                      textDecoration: textDecor,
                      padding:        border !== 'none'
                        ? '0 2px' : '0',
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
              {unlockedWords.length} /{' '}
              {tapNode!.locked_words.length} WORDS UNLOCKED
            </span>
            <button
              disabled={!allUnlocked || submitting}
              onClick={handleSubmitMastery}
              style={{
                display: 'flex',
                alignItems: 'center', gap: 12,
                background: submitting
                  ? '#555'
                  : allUnlocked
                  ? '#2b2b2b'
                  : '#888',
                color: '#f0ece4',
                border: 'none', borderRadius: 2,
                padding: '10px 26px',
                fontSize: 11, fontWeight: 700,
                letterSpacing: '0.14em',
                cursor: allUnlocked && !submitting
                  ? 'pointer' : 'not-allowed',
                fontFamily: F,
                transition: 'background 0.2s',
              }}
            >
              {submitting ? 'CHECKING...' : 'SUBMIT →'}
            </button>
          </div>
        </div>
      </div>

      {/* definition panel */}
      {defPanel && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 150,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff',
            border: '2px solid #4ddd94',
            borderRadius: 6,
            padding: '28px 32px',
            maxWidth: 380, width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            fontFamily: F,
          }}>
            <div style={{
              fontSize: 9, fontWeight: 700,
              letterSpacing: '0.14em',
              color: '#4ddd94', marginBottom: 6,
              fontFamily: F,
            }}>
              ✓ WORD UNLOCKED
            </div>
            <h3 style={{
              fontSize: 20, fontWeight: 700,
              color: '#1a1a1a', margin: '0 0 12px',
              fontFamily: F,
              textTransform: 'uppercase',
            }}>
              {defPanel.word}
            </h3>
            <div style={{
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.12em', color: '#888',
              marginBottom: 4, fontFamily: F,
            }}>
              DEFINITION
            </div>
            <p style={{
              fontSize: 13, color: '#222',
              lineHeight: 1.6, margin: '0 0 14px',
              fontFamily: F,
            }}>
              {defPanel.definition}
            </p>
            <div style={{
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.12em', color: '#888',
              marginBottom: 4, fontFamily: F,
            }}>
              IN CONTEXT
            </div>
            <p style={{
              fontSize: 12, color: '#444',
              lineHeight: 1.6, margin: '0 0 14px',
              fontStyle: 'italic', fontFamily: F,
            }}>
              "{defPanel.contextual_usage}"
            </p>
            <div style={{
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.12em', color: '#888',
              marginBottom: 4, fontFamily: F,
            }}>
              TRANSLATION (FILIPINO)
            </div>
            <p style={{
              fontSize: 13, color: '#555',
              margin: '0 0 20px', fontFamily: F,
            }}>
              {defPanel.translation}
            </p>
            <button
              onClick={() => setDefPanel(null)}
              style={{
                ...S.btnPrimary,
                width: '100%',
                textAlign: 'center',
              }}
            >
              Got it — Continue
            </button>
          </div>
        </div>
      )}

      {/* hint overlay — matches Module 1/2 format */}
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

      {/* feedback drawer — wrong clue */}
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
            lineHeight: 1.7, marginBottom: 12,
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