'use client';

import React, { useState } from 'react';
import { apiFetch } from '@/lib/api';
import InteractiveDemoSandbox from './InteractiveDemoSandbox';
import styles from './onboarding.module.css';

interface OnboardingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
  studentId?: string;
  onStartFirstNode?: () => void;
}

const STEPS = [
  { label: 'WELCOME', title: 'FIELD INDUCTION' },
  { label: 'DASHBOARD', title: 'SYSTEMS OVERVIEW' },
  { label: 'LIVE DEMO', title: 'INTERACTIVE SANDBOX' },
  { label: 'CLEARANCE', title: 'MISSION AUTHORIZATION' },
];

export default function OnboardingGuideModal({
  isOpen,
  onClose,
  studentName = 'Investigator',
  studentId = 'guest',
  onStartFirstNode,
}: OnboardingGuideModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [demoCompleted, setDemoCompleted] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  if (!isOpen) return null;

  // Persist completion/skip to backend and localStorage
  const recordOnboardingComplete = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`critica_onboarding_completed_${studentId}`, 'true');
        localStorage.setItem('critica_onboarding_completed_latest', 'true');
      }
      await apiFetch('/progression/onboarding/complete/', {
        method: 'POST',
      });
    } catch {
      // Backend may be offline or guest user, localStorage is our guarantee
    }
  };

  const handleSkip = async () => {
    setIsFinishing(true);
    await recordOnboardingComplete();
    setIsFinishing(false);
    onClose();
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinishToDashboard = async () => {
    setIsFinishing(true);
    await recordOnboardingComplete();
    setIsFinishing(false);
    onClose();
  };

  const handleDeployToNode = async () => {
    setIsFinishing(true);
    await recordOnboardingComplete();
    setIsFinishing(false);
    onClose();
    if (onStartFirstNode) {
      onStartFirstNode();
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && handleSkip()}>
      <div className={styles.modalContainer}>
        {/* Top Bar / Header */}
        <div className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <span className={styles.sealIcon}>★</span>
            <span className={styles.docTitle}>CRITICA // OFFICIAL FIELD INDUCTION</span>
            <span className={styles.classificationBadge}>CLASSIFIED // LEVEL-1</span>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className={styles.skipBtn}
            disabled={isFinishing}
            title="Skip this guide and enter the dashboard immediately"
          >
            <span>✕</span>
            <span>SKIP BRIEFING</span>
          </button>
        </div>

        {/* Step Navigation Bar */}
        <div className={styles.stepBar}>
          {STEPS.map((step, idx) => {
            const isActive = currentStep === idx;
            const isDone = currentStep > idx;
            return (
              <div
                key={step.label}
                onClick={() => setCurrentStep(idx)}
                className={`${styles.stepPill} ${
                  isActive
                    ? styles.stepPillActive
                    : isDone
                    ? styles.stepPillDone
                    : styles.stepPillPending
                }`}
              >
                <div className={styles.stepNumber}>{isDone ? '✓' : idx + 1}</div>
                <span>{step.label}</span>
              </div>
            );
          })}
        </div>

        {/* Modal Body Content */}
        <div className={styles.bodyArea}>
          {/* ─────────────────────────────────────────────────────────────
              STEP 0: WELCOME & AGENCY INTRODUCTION
             ───────────────────────────────────────────────────────────── */}
          {currentStep === 0 && (
            <>
              {/* Agent Crit Instructor Message */}
              <div className={styles.instructorCard}>
                <div className={styles.avatarWrap}>
                  <div className={styles.avatarBadge}>
                    <span className={styles.avatarInitial}>🕵️‍♂️</span>
                    <div className={styles.avatarStatusDot} />
                  </div>
                  <div className={styles.avatarName}>AGENT CRIT</div>
                  <div className={styles.avatarRole}>OPERATIONS INSTRUCTOR</div>
                </div>

                <div className={styles.speechBubble}>
                  <div className={styles.speechArrow} />
                  <strong>Greetings, Investigator {studentName}.</strong>
                  <br />
                  Welcome to the <strong>Critica Intelligence Agency</strong>. In an era of
                  misinformation, cognitive bias, and academic complexity, you have been selected to
                  sharpen your deductive reading, structural synthesis, and evidence forensics.
                  <br />
                  <br />
                  Before you pull your first live case docket, take this brief walkthrough to master
                  the tools at your disposal, or test the live simulator.
                </div>
              </div>

              {/* The 4 Intelligence Core Modules */}
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#8C5A3C',
                    letterSpacing: '0.12em',
                    marginBottom: 10,
                  }}
                >
                  YOUR 4 CORE INTELLIGENCE DISCIPLINES:
                </div>

                <div className={styles.cardsGrid}>
                  <div className={styles.featureCard}>
                    <div className={styles.featureCardHeader}>
                      <div className={styles.featureCardIcon}>⊕</div>
                      <div className={styles.featureCardTitle}>1. TEXT STRUCTURE</div>
                    </div>
                    <div className={styles.featureCardDesc}>
                      Reconstruct disarranged text by threading causal, chronological, and
                      comparative sequences on the cork case board.
                    </div>
                  </div>

                  <div className={styles.featureCard}>
                    <div className={styles.featureCardHeader}>
                      <div className={styles.featureCardIcon}>⊞</div>
                      <div className={styles.featureCardTitle}>2. SNAP-IN-GAP</div>
                    </div>
                    <div className={styles.featureCardDesc}>
                      Deduce transition signals (contrast, cause-effect, addition) and snap missing
                      connectors into academic arguments.
                    </div>
                  </div>

                  <div className={styles.featureCard}>
                    <div className={styles.featureCardHeader}>
                      <div className={styles.featureCardIcon}>🔍</div>
                      <div className={styles.featureCardTitle}>3. TAP THE CLUES</div>
                    </div>
                    <div className={styles.featureCardDesc}>
                      Detect embedded context clues (synonyms, antonyms, inferences) to unlock
                      advanced tier academic vocabulary.
                    </div>
                  </div>

                  <div className={styles.featureCard}>
                    <div className={styles.featureCardHeader}>
                      <div className={styles.featureCardIcon}>🔎</div>
                      <div className={styles.featureCardTitle}>4. FACT SCANNER</div>
                    </div>
                    <div className={styles.featureCardDesc}>
                      Execute the CRAAP test (Currency, Relevance, Authority, Accuracy, Purpose) to
                      neutralize biased and outdated sources.
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 1: DASHBOARD SYSTEMS OVERVIEW
             ───────────────────────────────────────────────────────────── */}
          {currentStep === 1 && (
            <>
              {/* Agent Crit Instructor Message */}
              <div className={styles.instructorCard}>
                <div className={styles.avatarWrap}>
                  <div className={styles.avatarBadge}>
                    <span className={styles.avatarInitial}>🕵️‍♂️</span>
                    <div className={styles.avatarStatusDot} />
                  </div>
                  <div className={styles.avatarName}>AGENT CRIT</div>
                  <div className={styles.avatarRole}>OPERATIONS INSTRUCTOR</div>
                </div>

                <div className={styles.speechBubble}>
                  <div className={styles.speechArrow} />
                  <strong>The Dossier Terminal is your command center.</strong>
                  <br />
                  Every module is organized into structured node dockets. Master the basics to unlock
                  intermediate and advanced dossiers. Your streak and completed node tally in the
                  top bar keep track of your active clearance level.
                </div>
              </div>

              {/* Dashboard Layout Tour Highlights */}
              <div
                style={{
                  background: '#FFF8ED',
                  border: '1.5px solid #C49A5A',
                  borderRadius: 6,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div
                    style={{
                      background: '#2D0909',
                      color: '#FFF8ED',
                      padding: '6px 12px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    🔥 STREAK & ⭐ NODES
                  </div>
                  <div style={{ fontSize: 11, color: '#432818', lineHeight: 1.4 }}>
                    Train daily to build your active discipline streak. Each completed node unlocks
                    subsequent research papers in that strand.
                  </div>
                </div>

                <div
                  style={{
                    height: 1,
                    background: '#D4C0A0',
                  }}
                />

                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div
                    style={{
                      background: '#C49A5A',
                      color: '#2D0909',
                      padding: '6px 12px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    DOSSIER TABS [1 - 4]
                  </div>
                  <div style={{ fontSize: 11, color: '#432818', lineHeight: 1.4 }}>
                    Switch effortlessly between Text Structure, Snap-in-Gap, Tap Clues, and Fact
                    Scanner tabs. Node cards display status badges: <strong>ACTIVE</strong>,{' '}
                    <strong>LOCKED</strong>, or <strong>COMPLETED</strong>.
                  </div>
                </div>

                <div
                  style={{
                    height: 1,
                    background: '#D4C0A0',
                  }}
                />

                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div
                    style={{
                      background: '#FFFBF0',
                      border: '1px solid #8C5A3C',
                      color: '#8C5A3C',
                      padding: '6px 12px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    PULL PAPER BUTTON
                  </div>
                  <div style={{ fontSize: 11, color: '#432818', lineHeight: 1.4 }}>
                    Hit <em>&quot;PULL PAPER &amp; START TRAINING&quot;</em> on any active node to generate
                    an academic scenario calibrated to your competency level.
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 2: LIVE INTERACTIVE DEMO SANDBOX
             ───────────────────────────────────────────────────────────── */}
          {currentStep === 2 && (
            <>
              {/* Agent Crit Instructor Message */}
              <div className={styles.instructorCard}>
                <div className={styles.avatarWrap}>
                  <div className={styles.avatarBadge}>
                    <span className={styles.avatarInitial}>🕵️‍♂️</span>
                    <div className={styles.avatarStatusDot} />
                  </div>
                  <div className={styles.avatarName}>AGENT CRIT</div>
                  <div className={styles.avatarRole}>OPERATIONS INSTRUCTOR</div>
                </div>

                <div className={styles.speechBubble}>
                  <div className={styles.speechArrow} />
                  <strong>Hands-on practice: Try the Live Simulator below!</strong>
                  <br />
                  No grades, no stress. Test how you connect deductive cards with crimson threads or
                  snap transition clues into missing text gaps.
                </div>
              </div>

              {/* The Live Sandbox */}
              <InteractiveDemoSandbox onDemoCompleted={() => setDemoCompleted(true)} />
            </>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 3: CLEARANCE & READY TO DEPLOY
             ───────────────────────────────────────────────────────────── */}
          {currentStep === 3 && (
            <div className={styles.clearanceCard}>
              <div className={styles.stampApproved}>CLEARANCE APPROVED</div>

              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  color: '#2D0909',
                  marginBottom: 8,
                }}
              >
                FIELD INDUCTION COMPLETED
              </div>

              <p
                style={{
                  fontSize: 12,
                  maxWidth: 580,
                  lineHeight: 1.6,
                  color: '#432818',
                  marginBottom: 16,
                }}
              >
                Congratulations, Investigator <strong>{studentName}</strong>. You have demonstrated
                familiarity with the detective board mechanics and transition deduction protocols.
                Your starter dossier <strong>[Narration — Basics]</strong> is now unsealed on your
                dashboard.
              </p>

              <div className={styles.badgePill}>
                <span>⭐</span>
                <span>ONBOARDING BADGE UNLOCKED: +50 XP REWARD</span>
              </div>

              {demoCompleted && (
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 11,
                    color: '#16a34a',
                    fontWeight: 700,
                  }}
                >
                  ✓ Simulator Training Exercise Completed Successfully!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className={styles.footerBar}>
          <div>
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className={styles.btnSecondary}
                disabled={isFinishing}
              >
                ← BACK
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {currentStep < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className={styles.btnPrimary}
                disabled={isFinishing}
              >
                <span>NEXT STEP</span>
                <span>→</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleFinishToDashboard}
                  className={styles.btnSecondary}
                  disabled={isFinishing}
                >
                  ENTER DASHBOARD
                </button>

                <button
                  type="button"
                  onClick={handleDeployToNode}
                  className={styles.btnPrimary}
                  disabled={isFinishing}
                >
                  <span>DEPLOY TO FIRST MISSION</span>
                  <span>🚀</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
