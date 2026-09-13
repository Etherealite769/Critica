'use client';

import React, { useState } from 'react';
import styles from './onboarding.module.css';

interface InteractiveDemoSandboxProps {
  onDemoCompleted?: () => void;
}

export default function InteractiveDemoSandbox({ onDemoCompleted }: InteractiveDemoSandboxProps) {
  const [demoMode, setDemoMode] = useState<'thread' | 'snap'>('thread');

  // Logic Thread Demo State
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // Snap-in-Gap Demo State
  const [selectedTransition, setSelectedTransition] = useState<string | null>(null);
  const [snapStatus, setSnapStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');

  // Handle Logic Thread clicks
  const handleCardClick = (id: string) => {
    if (connected) return;

    if (!selectedCard) {
      setSelectedCard(id);
    } else if (selectedCard === id) {
      setSelectedCard(null); // deselect
    } else {
      // Connect card 1 and 2
      setConnected(true);
      setSelectedCard(null);
      if (onDemoCompleted) onDemoCompleted();
    }
  };

  // Handle Snap-in-Gap choice
  const handleChoiceClick = (choice: string) => {
    setSelectedTransition(choice);
    if (choice === 'However') {
      setSnapStatus('correct');
      if (onDemoCompleted) onDemoCompleted();
    } else {
      setSnapStatus('wrong');
    }
  };

  // Reset current demo
  const resetDemo = () => {
    if (demoMode === 'thread') {
      setSelectedCard(null);
      setConnected(false);
    } else {
      setSelectedTransition(null);
      setSnapStatus('idle');
    }
  };

  return (
    <div className={styles.sandboxContainer}>
      {/* Sandbox Toolbar */}
      <div className={styles.sandboxToolbar}>
        <div className={styles.modeToggleGroup}>
          <button
            type="button"
            onClick={() => {
              setDemoMode('thread');
              setSelectedCard(null);
              setConnected(false);
            }}
            className={`${styles.modeBtn} ${demoMode === 'thread' ? styles.modeBtnActive : ''}`}
          >
            DEMO 1: LOGIC THREAD
          </button>
          <button
            type="button"
            onClick={() => {
              setDemoMode('snap');
              setSelectedTransition(null);
              setSnapStatus('idle');
            }}
            className={`${styles.modeBtn} ${demoMode === 'snap' ? styles.modeBtnActive : ''}`}
          >
            DEMO 2: TRANSITION SNAP
          </button>
        </div>

        <button
          type="button"
          onClick={resetDemo}
          className={styles.resetMiniBtn}
          title="Reset the interactive simulation"
        >
          ↻ RESET DEMO
        </button>
      </div>

      {/* Mode 1: Logic Thread Corkboard */}
      {demoMode === 'thread' && (
        <div>
          <div className={styles.corkboard}>
            {/* SVG Connecting Thread */}
            {connected && (
              <svg
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              >
                {/* Thread Path */}
                <path
                  d="M 230 115 Q 380 40 530 115"
                  stroke="#800020"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray="none"
                />
                {/* Order Marker Badge */}
                <circle cx="380" cy="78" r="13" fill="#FFFBF0" stroke="#800020" strokeWidth="2.5" />
                <text
                  x="380"
                  y="82"
                  textAnchor="middle"
                  fontFamily="'Courier New', Courier, monospace"
                  fontSize="11"
                  fontWeight="700"
                  fill="#800020"
                >
                  1
                </text>
              </svg>
            )}

            {/* Card A: Premise */}
            <div
              onClick={() => handleCardClick('A')}
              className={`${styles.demoCard} ${selectedCard === 'A' ? styles.demoCardSelected : ''} ${
                connected ? styles.demoCardConnected : ''
              }`}
            >
              <div className={`${styles.cardPin} ${connected ? styles.cardPinGreen : ''}`} />
              <div className={styles.demoCardTag}>[PREMISE / CAUSE]</div>
              <div className={styles.demoCardContent}>
                Atmospheric carbon concentrations surpassed 420 ppm during early monitoring trials.
              </div>
            </div>

            {/* Card B: Consequence */}
            <div
              onClick={() => handleCardClick('B')}
              className={`${styles.demoCard} ${selectedCard === 'B' ? styles.demoCardSelected : ''} ${
                connected ? styles.demoCardConnected : ''
              }`}
            >
              <div className={`${styles.cardPin} ${connected ? styles.cardPinGreen : ''}`} />
              <div className={styles.demoCardTag}>[CONSEQUENCE / EFFECT]</div>
              <div className={styles.demoCardContent}>
                Ocean surface acidification accelerated dramatically across all monitored coral zones.
              </div>
            </div>
          </div>

          {/* Real-time Coach Guidance */}
          <div
            style={{
              marginTop: 10,
              fontSize: 11,
              fontFamily: "'Courier New', Courier, monospace",
              color: connected ? '#16a34a' : '#432818',
              fontWeight: 700,
              background: '#FFF8ED',
              border: `1px solid ${connected ? '#16a34a' : '#C49A5A'}`,
              borderRadius: 4,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>{connected ? '✓' : '💡'}</span>
            <span>
              {connected
                ? 'DEDUCTION VERIFIED: The crimson thread binds the premise to the resulting consequence!'
                : selectedCard
                ? 'Card selected! Now click the second card to weave the deductive thread.'
                : 'Click Card [A], then click Card [B] to thread the deductive connection!'}
            </span>
          </div>
        </div>
      )}

      {/* Mode 2: Snap-in-Gap Transition Clues */}
      {demoMode === 'snap' && (
        <div className={styles.snapContainer}>
          <div className={styles.passageLine}>
            The preliminary lab trials yielded inconclusive readings;{' '}
            <span
              className={`${styles.snapSlot} ${snapStatus === 'correct' ? styles.snapSlotFilled : ''}`}
            >
              {selectedTransition || '[ CLICK TRANSITION BELOW ]'}
            </span>
            , the subsequent field evaluations confirmed the compound&apos;s efficacy.
          </div>

          <div style={{ borderTop: '1px dashed #C49A5A', paddingTop: 12 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#8C5A3C',
                letterSpacing: '0.08em',
                marginBottom: 8,
              }}
            >
              SELECT THE ACCURATE TRANSITION BADGE:
            </div>

            <div className={styles.choicesRow}>
              {[
                { word: 'However', type: 'Contrast Signal (Accurate)' },
                { word: 'Furthermore', type: 'Addition Signal' },
                { word: 'Because', type: 'Causal Signal' },
              ].map((item) => {
                const isSelected = selectedTransition === item.word;
                let extraClass = '';
                if (isSelected && snapStatus === 'correct') {
                  extraClass = styles.choiceChipSelected;
                } else if (isSelected && snapStatus === 'wrong') {
                  extraClass = styles.choiceChipWrong;
                }

                return (
                  <button
                    key={item.word}
                    type="button"
                    onClick={() => handleChoiceClick(item.word)}
                    className={`${styles.choiceChip} ${extraClass}`}
                  >
                    {item.word}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coach Guidance for Snap */}
          <div
            style={{
              fontSize: 11,
              fontFamily: "'Courier New', Courier, monospace",
              color: snapStatus === 'correct' ? '#16a34a' : snapStatus === 'wrong' ? '#b91c1c' : '#432818',
              fontWeight: 700,
              background: snapStatus === 'correct' ? '#eafaf1' : snapStatus === 'wrong' ? '#fee2e2' : '#FFF8ED',
              border: `1px solid ${
                snapStatus === 'correct' ? '#16a34a' : snapStatus === 'wrong' ? '#b91c1c' : '#C49A5A'
              }`,
              borderRadius: 4,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>{snapStatus === 'correct' ? '✓' : snapStatus === 'wrong' ? '✕' : '💡'}</span>
            <span>
              {snapStatus === 'correct'
                ? "EXCELLENT WORK: 'However' signals contrast between inconclusive trials and conclusive results."
                : snapStatus === 'wrong'
                ? "INCORRECT TRANSITION: The two halves contrast with each other. Look for an opposition transition word."
                : "Click 'However' above to snap the transition word into place!"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
