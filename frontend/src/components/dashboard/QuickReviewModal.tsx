'use client'

import React, { useState, useEffect } from 'react'
import styles from './sidebar-modals.module.css'

interface QuickReviewModalProps {
  isOpen: boolean
  onClose: () => void
}

// ── DRILL QUESTIONS POOL ─────────────────────────────
const DRILL_QUESTIONS = [
  {
    id: 1,
    category: 'TEXT STRUCTURE',
    question: 'Which signal words exclusively indicate a Chronological / Narration text structure?',
    options: [
      'In contrast, conversely, on the other hand',
      'Subsequently, prior to, simultaneously, thereafter',
      'Consequently, owing to, as an outcome',
      'Refers to, is characterized by, denotes',
    ],
    correct: 1,
    explanation:
      '"Subsequently", "prior to", and "simultaneously" specify temporal sequencing and time markers.',
  },
  {
    id: 2,
    category: 'SNAP-IN-GAP',
    question:
      'Sentence 1 describes a theory. Sentence 2 presents counter-evidence that contradicts it. Which transition is required?',
    options: [
      'Furthermore / In addition (Continuity)',
      'Nevertheless / Conversely (Adversative)',
      'Therefore / Consequently (Causal)',
      'Similarly / Likewise (Analogy)',
    ],
    correct: 1,
    explanation:
      'Adversative transitions ("Nevertheless", "Conversely") signal that Sentence 2 qualifies or contradicts Sentence 1.',
  },
  {
    id: 3,
    category: 'TAP THE CLUES',
    question:
      '"The suspect\'s alibi was tenuous—in other words, extremely weak and lacking verifiable evidence." What clue type unlocks "tenuous"?',
    options: [
      'Antonym Clue',
      'Definition / Restatement Clue',
      'Inference from Action Clue',
      'Chronological Clue',
    ],
    correct: 1,
    explanation:
      '"In other words" directly signals a definition/restatement clue explaining what "tenuous" means.',
  },
  {
    id: 4,
    category: 'FACT SCANNER',
    question:
      'Under the CRAAP test, evaluating whether the author has verifiable institutional credentials and no undeclared conflict of interest tests which dimension?',
    options: [
      'Currency',
      'Relevance',
      'Authority',
      'Purpose',
    ],
    correct: 2,
    explanation:
      'Authority evaluates source credentials, organizational affiliation, peer reviews, and expertise.',
  },
  {
    id: 5,
    category: 'SNAP-IN-GAP',
    question:
      'Which transition word belongs to the "Causal / Consequence" matrix category?',
    options: [
      'Hence',
      'Whereas',
      'Meanwhile',
      'Moreover',
    ],
    correct: 0,
    explanation:
      '"Hence" indicates a direct logical result or causal deduction ("for this reason").',
  },
]

export default function QuickReviewModal({ isOpen, onClose }: QuickReviewModalProps) {
  const [activeTab, setActiveTab] = useState<
    'text_structure' | 'snap_gap' | 'tap_clues' | 'craap' | 'drill'
  >('text_structure')

  // Drill State
  const [drillRunning, setDrillRunning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(60)
  const [drillScore, setDrillScore] = useState<number | null>(null)
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [drillQuestions, setDrillQuestions] = useState(DRILL_QUESTIONS.slice(0, 3))

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Drill Timer
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (drillRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            finishDrill()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [drillRunning, timeLeft])

  const startDrill = () => {
    // Shuffle and pick 3
    const shuffled = [...DRILL_QUESTIONS].sort(() => 0.5 - Math.random()).slice(0, 3)
    setDrillQuestions(shuffled)
    setTimeLeft(60)
    setCurrentQIndex(0)
    setSelectedAnswers({})
    setDrillScore(null)
    setDrillRunning(true)
  }

  const handleSelectAnswer = (qIdx: number, optIdx: number) => {
    if (!drillRunning) return
    setSelectedAnswers(prev => ({ ...prev, [qIdx]: optIdx }))
  }

  const finishDrill = () => {
    setDrillRunning(false)
    let score = 0
    drillQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correct) score++
    })
    setDrillScore(score)
  }

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.dossierContainer} onClick={e => e.stopPropagation()}>
        {/* ── Folder Header ── */}
        <div className={styles.folderHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.headerBadge}>TACTICAL FIELD GUIDE</span>
            <h2 className={styles.headerTitle}>
              <span>📄</span> Quick Review & Field Manual
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className={styles.stampBox}>AUTHORIZED REFERENCE</span>
            <button className={styles.closeButton} onClick={onClose} title="Close Manual (Esc)">
              ✕ CLOSE
            </button>
          </div>
        </div>

        {/* ── Sub Navigation ── */}
        <div className={styles.subNavBar}>
          <button
            className={`${styles.navTab} ${activeTab === 'text_structure' ? styles.navTabActive : ''}`}
            onClick={() => setActiveTab('text_structure')}>
            1. Text Structure
          </button>
          <button
            className={`${styles.navTab} ${activeTab === 'snap_gap' ? styles.navTabActive : ''}`}
            onClick={() => setActiveTab('snap_gap')}>
            2. Snap-in-Gap Matrix
          </button>
          <button
            className={`${styles.navTab} ${activeTab === 'tap_clues' ? styles.navTabActive : ''}`}
            onClick={() => setActiveTab('tap_clues')}>
            3. Context Clues
          </button>
          <button
            className={`${styles.navTab} ${activeTab === 'craap' ? styles.navTabActive : ''}`}
            onClick={() => setActiveTab('craap')}>
            4. CRAAP Scanner
          </button>
          <button
            className={`${styles.navTab} ${activeTab === 'drill' ? styles.navTabActive : ''}`}
            onClick={() => {
              setActiveTab('drill')
              if (!drillRunning && drillScore === null) {
                startDrill()
              }
            }}>
            ⚡ 60s Field Drill
          </button>
        </div>

        {/* ── Content Body ── */}
        <div className={styles.contentBody}>
          {activeTab === 'text_structure' && (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.95rem', fontWeight: 'bold', color: '#2D0909', margin: 0 }}>
                  THE 4 TEXT STRUCTURE ARCHETYPES
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#6A381F', margin: '0.25rem 0' }}>
                  Forensic guide to recognizing logical progression across academic prose.
                </p>
              </div>

              <div className={styles.cheatCard}>
                <div className={styles.cheatCardTitle}>
                  <span>[01] NARRATION / CHRONOLOGY</span>
                  <span className={styles.headerBadge}>ORDER OF EVENTS</span>
                </div>
                <p style={{ fontSize: '0.82rem', lineHeight: '1.4', margin: '0.35rem 0 0.5rem 0' }}>
                  Organizes events in time order. Traces development, history, or forensic step-by-step procedures.
                </p>
                <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.75rem', color: '#6A381F' }}>
                  <strong>SIGNAL WORDS:</strong> First, previously, simultaneously, thereafter, subsequent to, finally.
                </div>
              </div>

              <div className={styles.cheatCard}>
                <div className={styles.cheatCardTitle}>
                  <span>[02] DEFINITION & CLASSIFICATION</span>
                  <span className={styles.headerBadge}>CONCEPT BREAKDOWN</span>
                </div>
                <p style={{ fontSize: '0.82rem', lineHeight: '1.4', margin: '0.35rem 0 0.5rem 0' }}>
                  Explains what an entity or phenomenon is, its class of belonging, and distinctive features that separate it from others.
                </p>
                <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.75rem', color: '#6A381F' }}>
                  <strong>SIGNAL WORDS:</strong> Refers to, is defined as, characterized by, denotes, consists of.
                </div>
              </div>

              <div className={styles.cheatCard}>
                <div className={styles.cheatCardTitle}>
                  <span>[03] COMPARISON & CONTRAST</span>
                  <span className={styles.headerBadge}>SIMILARITY VS DIVERGENCE</span>
                </div>
                <p style={{ fontSize: '0.82rem', lineHeight: '1.4', margin: '0.35rem 0 0.5rem 0' }}>
                  Examines two or more subjects across specific criteria to illuminate common traits and critical divergences.
                </p>
                <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.75rem', color: '#6A381F' }}>
                  <strong>SIGNAL WORDS:</strong> Similarly, whereas, conversely, in comparison, in contrast, distinct from.
                </div>
              </div>

              <div className={styles.cheatCard}>
                <div className={styles.cheatCardTitle}>
                  <span>[04] CAUSE & EFFECT</span>
                  <span className={styles.headerBadge}>RATIONALE & REPERCUSSION</span>
                </div>
                <p style={{ fontSize: '0.82rem', lineHeight: '1.4', margin: '0.35rem 0 0.5rem 0' }}>
                  Links antecedents (causes) with downstream consequences (effects). Can be linear, multi-causal, or feedback-driven.
                </p>
                <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.75rem', color: '#6A381F' }}>
                  <strong>SIGNAL WORDS:</strong> As a result, consequently, leads to, stems from, owing to, thus.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'snap_gap' && (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.95rem', fontWeight: 'bold', color: '#2D0909', margin: 0 }}>
                  TRANSITION REPOSITORY & MATRIX
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#6A381F', margin: '0.25rem 0' }}>
                  Use this matrix to identify which connective phrase snaps the logical fracture between sentences.
                </p>
              </div>

              <table className={styles.retroTable}>
                <thead>
                  <tr>
                    <th>CATEGORY</th>
                    <th>FUNCTION</th>
                    <th>PRIMARY CONNECTIVES</th>
                    <th>INVESTIGATOR RULE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: '#2D0909' }}>ADDITION / CONTINUITY</td>
                    <td>Supplements or expands an ongoing thesis</td>
                    <td>Furthermore, Moreover, In addition, Additionally</td>
                    <td>Ensure Sentence 2 supports the same polarity as Sentence 1.</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: '#2D0909' }}>CONTRAST / ADVERSATIVE</td>
                    <td>Pivots, refutes, or qualifies preceding premise</td>
                    <td>However, Nevertheless, Conversely, On the other hand</td>
                    <td>Look for conflicting valence (positive vs negative claim).</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: '#2D0909' }}>CAUSAL / CONSEQUENCE</td>
                    <td>Marks logical deduction or direct outcome</td>
                    <td>Therefore, Consequently, As a result, Hence, Thus</td>
                    <td>Check that Sentence 1 is the driver and Sentence 2 is the fallout.</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: '#2D0909' }}>EXEMPLIFICATION</td>
                    <td>Grounds an abstract claim into concrete proof</td>
                    <td>For instance, Specifically, To illustrate, In particular</td>
                    <td>Sentence 2 must serve as a specific sample of Sentence 1.</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginTop: '1.25rem', background: '#FFF8ED', border: '1.5px solid #8C5A3C', padding: '1rem', borderRadius: '4px' }}>
                <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.8rem', fontWeight: 'bold', color: '#8C2424', marginBottom: '0.25rem' }}>
                  ⚠️ COMMON PITFALL: PSEUDO-CONNECTIVES
                </div>
                <p style={{ fontSize: '0.78rem', lineHeight: '1.4', color: '#432818', margin: 0 }}>
                  Never pick "Furthermore" when Sentence 2 introduces counter-arguments. Always test the two surrounding sentences by reading them without the connector first.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'tap_clues' && (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.95rem', fontWeight: 'bold', color: '#2D0909', margin: 0 }}>
                  THE 4 FORENSIC CONTEXT CLUE TYPES
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#6A381F', margin: '0.25rem 0' }}>
                  Protocols for isolating unfamiliar words using adjacent textual evidence.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div className={styles.cheatCard}>
                  <div className={styles.cheatCardTitle}>
                    <span>1. SYNONYM CLUES</span>
                    <span className={styles.headerBadge}>PARALLEL</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#432818', lineHeight: '1.4' }}>
                    Author pairs the target word with an equivalent term or phrase joined by "and", "or", or commas.
                  </p>
                  <div style={{ background: '#FAF0DF', padding: '0.5rem', fontSize: '0.75rem', fontStyle: 'italic', borderLeft: '2px solid #8C5A3C' }}>
                    "The plan was <strong>audacious</strong>, showing extreme boldness and daring."
                  </div>
                </div>

                <div className={styles.cheatCard}>
                  <div className={styles.cheatCardTitle}>
                    <span>2. ANTONYM CLUES</span>
                    <span className={styles.headerBadge}>POLARITY</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#432818', lineHeight: '1.4' }}>
                    Author provides the exact opposite meaning using words like "unlike", "instead of", "rather than".
                  </p>
                  <div style={{ background: '#FAF0DF', padding: '0.5rem', fontSize: '0.75rem', fontStyle: 'italic', borderLeft: '2px solid #8C5A3C' }}>
                    "Unlike her <strong>gregarious</strong> brother who loved parties, Leah stayed quiet and reserved."
                  </div>
                </div>

                <div className={styles.cheatCard}>
                  <div className={styles.cheatCardTitle}>
                    <span>3. DEFINITION CLUES</span>
                    <span className={styles.headerBadge}>EXPLICIT</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#432818', lineHeight: '1.4' }}>
                    The target word is explicitly defined inside appositive phrases, em-dashes, or brackets.
                  </p>
                  <div style={{ background: '#FAF0DF', padding: '0.5rem', fontSize: '0.75rem', fontStyle: 'italic', borderLeft: '2px solid #8C5A3C' }}>
                    "He suffered from <strong>somnambulism</strong>—the habit of walking while asleep."
                  </div>
                </div>

                <div className={styles.cheatCard}>
                  <div className={styles.cheatCardTitle}>
                    <span>4. INFERENCE CLUES</span>
                    <span className={styles.headerBadge}>DEDUCTION</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#432818', lineHeight: '1.4' }}>
                    Meaning must be deduced from situational details, reactions, or behavioral consequences.
                  </p>
                  <div style={{ background: '#FAF0DF', padding: '0.5rem', fontSize: '0.75rem', fontStyle: 'italic', borderLeft: '2px solid #8C5A3C' }}>
                    "The judge was <strong>scrupulous</strong>; she re-examined every single receipt three times."
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'craap' && (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.95rem', fontWeight: 'bold', color: '#2D0909', margin: 0 }}>
                  CRAAP FORENSIC EVIDENCE EVALUATION
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#6A381F', margin: '0.25rem 0' }}>
                  Standard evaluation checklist for determining source integrity and deception.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  {
                    letter: 'C',
                    name: 'CURRENCY',
                    question: 'When was the information published or revised?',
                    redFlag: 'Citing a 1998 medical consensus on cutting-edge 2026 treatments.',
                  },
                  {
                    letter: 'R',
                    name: 'RELEVANCE',
                    question: 'Does the evidence directly support the specific claim?',
                    redFlag: 'Introducing broad demographic trivia in a focused economic query.',
                  },
                  {
                    letter: 'A',
                    name: 'AUTHORITY',
                    question: 'Who is the author, publisher, and sponsor?',
                    redFlag: 'Anonymous blog with no citations or peer-reviewed credentials.',
                  },
                  {
                    letter: 'A',
                    name: 'ACCURACY',
                    question: 'Is the data corroborated by independent secondary sources?',
                    redFlag: 'Broken references, obvious fabricated stats, or unverified claims.',
                  },
                  {
                    letter: 'P',
                    name: 'PURPOSE',
                    question: 'Why does this information exist? (Inform, Sell, Deceive, Persuade)',
                    redFlag: 'Sponsored content disguised as unbiased academic study.',
                  },
                ].map((item, idx) => (
                  <div key={idx} className={styles.cheatCard} style={{ margin: 0, padding: '0.85rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontWeight: '900',
                            fontSize: '1.2rem',
                            color: '#8C2424',
                            border: '1.5px solid #8C2424',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '2px',
                          }}>
                          {item.letter}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 'bold', fontSize: '0.9rem', color: '#2D0909' }}>
                          {item.name}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#6A381F', fontFamily: 'var(--font-mono, monospace)' }}>
                        {item.question}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#8C2424', fontFamily: 'var(--font-mono, monospace)', background: 'rgba(140, 36, 36, 0.08)', padding: '0.35rem 0.6rem', borderRadius: '3px' }}>
                      ⚠️ <strong>RED FLAG:</strong> {item.redFlag}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'drill' && (
            <div>
              {/* Header Bar with Countdown */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.95rem', fontWeight: 'bold', color: '#2D0909', margin: 0 }}>
                    ⚡ 60-SECOND DIAGNOSTIC DRILL
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#6A381F', margin: '0.2rem 0 0 0' }}>
                    Rapid assessment of text structure, transitions, and forensic clues.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: '1.25rem',
                      fontWeight: 'bold',
                      color: timeLeft <= 15 ? '#8C2424' : '#2D0909',
                      background: '#FFF8ED',
                      border: `1.5px solid ${timeLeft <= 15 ? '#8C2424' : '#8C5A3C'}`,
                      padding: '0.3rem 0.75rem',
                      borderRadius: '3px',
                    }}>
                    ⏱️ {timeLeft}s
                  </div>
                  <button className={`${styles.tacticalBtn} ${styles.tacticalBtnPrimary}`} onClick={startDrill}>
                    🔄 Reset Drill
                  </button>
                </div>
              </div>

              {drillScore !== null ? (
                /* ── Score Debrief ── */
                <div style={{ textAlign: 'center', padding: '2rem 1rem', background: '#FFF8ED', border: '2px solid #8C5A3C', borderRadius: '6px' }}>
                  <span
                    className={drillScore >= 2 ? styles.stampBoxSuccess : styles.stampBox}
                    style={{ fontSize: '1rem', padding: '0.4rem 1rem', marginBottom: '1rem' }}>
                    {drillScore >= 2 ? 'DRILL CERTIFIED' : 'RE-ANALYSIS ADVISED'}
                  </span>
                  <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-mono, monospace)', color: '#2D0909', margin: '0.75rem 0' }}>
                    Score: {drillScore} / {drillQuestions.length}
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: '#432818', maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
                    {drillScore === 3
                      ? 'Exceptional forensic proficiency! All analytical markers accurately identified.'
                      : drillScore === 2
                      ? 'Solid performance. Minor calibration suggested on subtle transition nuances.'
                      : 'Review the field manual tabs above before your next real case node attempt.'}
                  </p>

                  <div style={{ textAlign: 'left', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {drillQuestions.map((q, idx) => {
                      const userAns = selectedAnswers[idx]
                      const isCorrect = userAns === q.correct
                      return (
                        <div key={idx} style={{ padding: '0.75rem', border: '1px solid #C49A5A', background: isCorrect ? '#F2FAED' : '#FDF4F4', borderRadius: '4px' }}>
                          <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.75rem', fontWeight: 'bold', color: isCorrect ? '#2E6B3A' : '#8C2424', marginBottom: '0.25rem' }}>
                            {isCorrect ? '✓ CORRECT' : '✗ INCORRECT'} — {q.category}
                          </div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#2D0909', marginBottom: '0.35rem' }}>
                            {q.question}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#432818' }}>
                            <strong>Your Answer:</strong> {userAns !== undefined ? q.options[userAns] : 'No answer'}
                          </div>
                          {!isCorrect && (
                            <div style={{ fontSize: '0.75rem', color: '#2E6B3A', marginTop: '0.2rem' }}>
                              <strong>Correct Answer:</strong> {q.options[q.correct]}
                            </div>
                          )}
                          <div style={{ fontSize: '0.72rem', color: '#6A381F', marginTop: '0.25rem', fontStyle: 'italic' }}>
                            Note: {q.explanation}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <button
                    className={`${styles.tacticalBtn} ${styles.tacticalBtnPrimary}`}
                    onClick={startDrill}
                    style={{ marginTop: '1.5rem' }}>
                    ⚡ Run Drill Again
                  </button>
                </div>
              ) : (
                /* ── Ongoing Question ── */
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    {drillQuestions.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentQIndex(idx)}
                        style={{
                          flex: 1,
                          padding: '0.4rem',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          borderRadius: '2px',
                          border: currentQIndex === idx ? '2px solid #8C2424' : '1px solid #8C5A3C',
                          background:
                            selectedAnswers[idx] !== undefined
                              ? '#E2F0D9'
                              : currentQIndex === idx
                              ? '#F2DEC1'
                              : '#FFF8ED',
                          color: '#2D0909',
                          cursor: 'pointer',
                        }}>
                        Q{idx + 1} {selectedAnswers[idx] !== undefined ? '✓' : ''}
                      </button>
                    ))}
                  </div>

                  <div className={styles.cheatCard} style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span className={styles.headerBadge}>{drillQuestions[currentQIndex].category}</span>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.75rem', color: '#8C5A3C' }}>
                        QUESTION {currentQIndex + 1} OF {drillQuestions.length}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1.05rem', color: '#2D0909', marginBottom: '1.25rem', lineHeight: '1.4' }}>
                      {drillQuestions[currentQIndex].question}
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {drillQuestions[currentQIndex].options.map((opt, optIdx) => {
                        const isSelected = selectedAnswers[currentQIndex] === optIdx
                        return (
                          <button
                            key={optIdx}
                            onClick={() => handleSelectAnswer(currentQIndex, optIdx)}
                            style={{
                              textAlign: 'left',
                              padding: '0.85rem 1rem',
                              fontFamily: 'var(--font-mono, monospace)',
                              fontSize: '0.82rem',
                              borderRadius: '4px',
                              border: isSelected ? '2px solid #8C2424' : '1.5px solid #C49A5A',
                              background: isSelected ? '#FBEBEB' : '#FFF8ED',
                              color: '#2D0909',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              transition: 'all 0.1s ease',
                            }}>
                            <span
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                border: '1px solid #8C5A3C',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                background: isSelected ? '#8C2424' : 'transparent',
                                color: isSelected ? '#FFF' : '#432818',
                              }}>
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span>{opt}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                    <button
                      className={styles.tacticalBtn}
                      onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentQIndex === 0}>
                      ◀ Previous Question
                    </button>

                    {currentQIndex < drillQuestions.length - 1 ? (
                      <button
                        className={`${styles.tacticalBtn} ${styles.tacticalBtnPrimary}`}
                        onClick={() => setCurrentQIndex(prev => prev + 1)}>
                        Next Question ▶
                      </button>
                    ) : (
                      <button
                        className={`${styles.tacticalBtn} ${styles.tacticalBtnSuccess}`}
                        onClick={finishDrill}>
                        ✓ Submit Drill Answers
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
