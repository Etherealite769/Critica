'use client';

import React, { useState } from 'react';
import Link from 'next/navigation';
import styles from './landing.module.css';

export default function LandingPage() {
  // ── Sandbox Demo State ──
  const [demoMode, setDemoMode] = useState<'thread' | 'snap' | 'fact'>('thread');

  // Logic Thread state
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [threadConnected, setThreadConnected] = useState(false);

  // Snap-in Gap state
  const [selectedSnapChoice, setSelectedSnapChoice] = useState<string | null>(null);
  const [snapResult, setSnapResult] = useState<'idle' | 'correct' | 'wrong'>('idle');

  // Fact Scanner state
  const [factVerifiedClaims, setFactVerifiedClaims] = useState<Record<number, 'verified' | 'unverified'>>({});

  // Logic Thread interaction
  const handleCardClick = (id: string) => {
    if (threadConnected) return;

    if (!selectedCard) {
      setSelectedCard(id);
    } else if (selectedCard === id) {
      setSelectedCard(null);
    } else {
      setThreadConnected(true);
      setSelectedCard(null);
    }
  };

  // Snap-in Gap interaction
  const handleSnapClick = (choice: string) => {
    setSelectedSnapChoice(choice);
    if (choice === 'Consequently') {
      setSnapResult('correct');
    } else {
      setSnapResult('wrong');
    }
  };

  // Fact Scanner interaction
  const handleVerifyClaim = (claimId: number, status: 'verified' | 'unverified') => {
    setFactVerifiedClaims((prev) => ({
      ...prev,
      [claimId]: status,
    }));
  };

  // Reset demo
  const handleResetDemo = () => {
    if (demoMode === 'thread') {
      setSelectedCard(null);
      setThreadConnected(false);
    } else if (demoMode === 'snap') {
      setSelectedSnapChoice(null);
      setSnapResult('idle');
    } else {
      setFactVerifiedClaims({});
    }
  };

  return (
    <div className={styles.pageRoot}>
      {/* ── Top Dossier Navigation ── */}
      <header className={styles.navHeader}>
        <div className={styles.navInner}>
          <a href="#" className={styles.brandGroup}>
            <div className={styles.brandSeal}>★</div>
            <div className={styles.brandTitle}>Critica</div>
            <span className={styles.brandTag}>CASE FILE ARCHIVES // EST. 2026</span>
          </a>

          <nav className={styles.navLinks}>
            <a href="#sandbox" className={styles.navLink}>
              // 01. LIVE SANDBOX
            </a>
            <a href="#modules" className={styles.navLink}>
              // 02. INVESTIGATIVE MODULES
            </a>
            <a href="#workbench" className={styles.navLink}>
              // 03. WORKBENCH TOOLS
            </a>
            <a href="#blueprint" className={styles.navLink}>
              // 04. METHODOLOGY
            </a>
          </nav>

          <div className={styles.navActions}>
            <a href="/auth" className={styles.signInBtn}>
              ENTER ARCHIVES
            </a>
            <a href="/auth" className={styles.primaryCtaBtn}>
              <span>★</span>
              <span>COMMENCE TRAINING</span>
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero Section: The Analytical Case Desk ── */}
      <section className={styles.heroSection}>
        <div className={styles.heroDossierWrapper}>
          {/* Manila Folder Tab Row */}
          <div className={styles.heroFolderTabRow}>
            <div className={styles.folderTabHeader}>
              DOSSIER FILE #CR-2026 // FORENSIC REASONING
            </div>
            <div className={styles.folderSecurityMark}>
              SECURITY CLEARANCE: LEVEL-1 AUTHORIZED
            </div>
          </div>

          {/* Dossier Sheet Inside */}
          <div className={styles.heroDossierBody}>
            {/* Binder Punch Holes */}
            <div className={styles.binderHoles}>
              <div className={styles.binderHole} />
              <div className={styles.binderHole} />
              <div className={styles.binderHole} />
              <div className={styles.binderHole} />
            </div>

            {/* Header Classification Row */}
            <div className={styles.heroHeaderRow}>
              <div className={styles.classificationCode}>
                <span>[CLASSIFIED DOCUMENT]</span>
                <span>//</span>
                <span>DIRECTIVE: COGNITIVE RIGOR</span>
              </div>
              <div className={styles.stampApproved}>
                APPROVED FOR FIELD USE
              </div>
            </div>

            {/* Main Headline */}
            <h1 className={styles.heroHeadline}>
              Decode the truth{' '}
              <span className={styles.heroAccentText}>beneath the text.</span>
            </h1>

            {/* Mission Narrative */}
            <p className={styles.heroDescription}>
              Standard reading comprehension tests passive recall. <strong>Critica</strong> trains you as a forensic textual investigator—tracing deductive logic threads across evidence corkboards, snapping fractured syntax bridges, unmasking contextual clues, and cross-examining published claims across deep academic domains.
            </p>

            {/* CTA Buttons */}
            <div className={styles.heroCtaRow}>
              <a href="/auth" className={styles.heroPrimaryBtn}>
                <span>⊕</span>
                <span>OPEN DOSSIER & COMMENCE TRAINING</span>
              </a>
              <a href="#sandbox" className={styles.heroSecondaryBtn}>
                <span>⊞</span>
                <span>TEST LIVE FIELD SANDBOX</span>
              </a>
            </div>

            {/* Archival Telemetry Strip */}
            <div className={styles.statsStrip}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>4 DISCIPLINES</span>
                <span className={styles.statLabel}>Logic, Syntax, Clues, Facts</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>48+ NODES</span>
                <span className={styles.statLabel}>Scaffolded Cognitive Tiers</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>DYNAMIC AI</span>
                <span className={styles.statLabel}>Fresh Academic Scenarios</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>100% GROUNDED</span>
                <span className={styles.statLabel}>Empirical Evidentiary Rigor</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Field Sandbox (Directly on Landing Page) ── */}
      <section id="sandbox" className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionPretag}>[HANDS-ON SIMULATION]</span>
          <h2 className={styles.sectionTitle}>Interactive Field Sandbox</h2>
          <p className={styles.sectionSubtitle}>
            Interact directly with the training engine below. Test causal deduction, discourse repairs, and claim verification in real time.
          </p>
        </div>

        <div className={styles.sandboxCard}>
          {/* Sandbox Top Control Bar */}
          <div className={styles.sandboxBar}>
            <div className={styles.sandboxBarTitle}>
              <span>★ FIELD SIMULATOR //</span>
              <span style={{ color: '#C49A5A' }}>
                {demoMode === 'thread'
                  ? 'MODULE 01: LOGIC THREAD'
                  : demoMode === 'snap'
                  ? 'MODULE 02: TRANSITION SNAP'
                  : 'MODULE 04: FACT SCANNER'}
              </span>
            </div>

            <div className={styles.sandboxModeToggle}>
              <button
                type="button"
                onClick={() => {
                  setDemoMode('thread');
                  handleResetDemo();
                }}
                className={`${styles.sandboxModeBtn} ${
                  demoMode === 'thread' ? styles.sandboxModeBtnActive : ''
                }`}
              >
                1. LOGIC THREAD
              </button>
              <button
                type="button"
                onClick={() => {
                  setDemoMode('snap');
                  handleResetDemo();
                }}
                className={`${styles.sandboxModeBtn} ${
                  demoMode === 'snap' ? styles.sandboxModeBtnActive : ''
                }`}
              >
                2. SNAP-IN GAP
              </button>
              <button
                type="button"
                onClick={() => {
                  setDemoMode('fact');
                  handleResetDemo();
                }}
                className={`${styles.sandboxModeBtn} ${
                  demoMode === 'fact' ? styles.sandboxModeBtnActive : ''
                }`}
              >
                3. FACT SCANNER
              </button>
              <button
                type="button"
                onClick={handleResetDemo}
                className={styles.sandboxResetBtn}
                title="Reset simulation state"
              >
                ↻ RESET
              </button>
            </div>
          </div>

          {/* MODE 1: LOGIC THREAD CORKBOARD */}
          {demoMode === 'thread' && (
            <div>
              <div className={styles.corkboard}>
                {/* SVG Crimson Connecting Thread */}
                {threadConnected && (
                  <svg
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                      zIndex: 5,
                    }}
                  >
                    <path
                      d="M 280 140 Q 450 60 620 140"
                      stroke="#800020"
                      strokeWidth="3.5"
                      fill="none"
                    />
                    {/* Badge circle */}
                    <circle
                      cx="450"
                      cy="98"
                      r="14"
                      fill="#FFFBF0"
                      stroke="#800020"
                      strokeWidth="2.5"
                    />
                    <text
                      x="450"
                      y="103"
                      textAnchor="middle"
                      fontFamily="'Courier New', Courier, monospace"
                      fontSize="12"
                      fontWeight="700"
                      fill="#800020"
                    >
                      1
                    </text>
                  </svg>
                )}

                {/* Evidence Card A */}
                <div
                  onClick={() => handleCardClick('A')}
                  className={`${styles.evidenceCard} ${
                    selectedCard === 'A' ? styles.evidenceCardSelected : ''
                  } ${threadConnected ? styles.evidenceCardConnected : ''}`}
                >
                  <div
                    className={`${styles.pushPin} ${
                      threadConnected ? styles.pushPinGreen : ''
                    }`}
                  />
                  <div className={styles.cardTag}>[PREMISE // CAUSAL TRIGGER]</div>
                  <div className={styles.cardBodyText}>
                    Hydrothermal vents emit mineral-dense chemical plumes reaching 400°C into pitch-black abyssal trenches.
                  </div>
                </div>

                {/* Evidence Card B */}
                <div
                  onClick={() => handleCardClick('B')}
                  className={`${styles.evidenceCard} ${
                    selectedCard === 'B' ? styles.evidenceCardSelected : ''
                  } ${threadConnected ? styles.evidenceCardConnected : ''}`}
                >
                  <div
                    className={`${styles.pushPin} ${
                      threadConnected ? styles.pushPinGreen : ''
                    }`}
                  />
                  <div className={styles.cardTag}>[CONSEQUENCE // DEDUCTIVE RESULT]</div>
                  <div className={styles.cardBodyText}>
                    Chemosynthetic microbial colonies thrive in total absence of solar radiation, forming the base of a unique trophic food pyramid.
                  </div>
                </div>
              </div>

              <div className={styles.sandboxFeedback}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{threadConnected ? '✓' : '💡'}</span>
                  <strong>
                    {threadConnected
                      ? 'DEDUCTION CONFIRMED: Crimson thread successfully ties the primary causal premise to the biological outcome.'
                      : selectedCard
                      ? 'First card pinned! Now click the second card to weave the deductive evidence thread.'
                      : 'Investigation Task: Click Card A, then Card B to establish the causal logic link.'}
                  </strong>
                </div>
                {threadConnected && (
                  <span style={{ color: '#16a34a', fontWeight: 700 }}>
                    STAMP: VERIFIED (+50 PTS)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* MODE 2: SNAP-IN GAP TRANSITIONS */}
          {demoMode === 'snap' && (
            <div className={styles.snapDemoSurface}>
              <div className={styles.snapSentence}>
                The deep-sea submersible lost main telemetry power during the descent;{' '}
                <span
                  className={`${styles.snapSlot} ${
                    snapResult === 'correct' ? styles.snapSlotCorrect : ''
                  }`}
                >
                  {selectedSnapChoice || '[SELECT TRANSITION]'}
                </span>
                , the automated auxiliary buoyancy failsafe engaged to resurface the vessel safely.
              </div>

              <div className={styles.snapChoicesRow}>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, fontWeight: 700 }}>
                  CHOOSE LOGICAL CONNECTOR:
                </span>
                {['Consequently', 'However', 'In contrast', 'Meanwhile'].map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => handleSnapClick(choice)}
                    className={`${styles.snapChoiceBtn} ${
                      selectedSnapChoice === choice ? styles.snapChoiceBtnActive : ''
                    }`}
                  >
                    {choice}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: '1.25rem' }} className={styles.sandboxFeedback}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{snapResult === 'correct' ? '✓' : snapResult === 'wrong' ? '✗' : '💡'}</span>
                  <span>
                    {snapResult === 'correct'
                      ? 'CORRECT BRIDGE: "Consequently" marks the direct causal resolution triggered by the loss of main telemetry.'
                      : snapResult === 'wrong'
                      ? 'COHESION FLAW: That marker indicates contrast or parallelism, but the failsafe engagement is a direct causal effect.'
                      : 'Select the transition that correctly bridges the cause and its structural remedy.'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* MODE 3: FACT SCANNER */}
          {demoMode === 'fact' && (
            <div className={styles.factScannerSurface}>
              <div className={styles.factArticleExcerpt}>
                <strong>SOURCE PASSAGE // EXCERPT FROM GEOPHYSICAL REPORT:</strong>
                <p style={{ marginTop: 6, fontStyle: 'italic' }}>
                  "Core sampling across the Mariana Arc identified basal basalt layers dated at 160 million years. Preliminary seismic readings suggest subterranean mantle thermal plumes; however, commercial seabed mining claims of infinite rare-earth abundance remain unsupported by peer-reviewed benthic surveys."
                </p>
              </div>

              <div className={styles.factClaimsList}>
                <div className={styles.factClaimCard}>
                  <div className={styles.factClaimText}>
                    <strong>Claim 01:</strong> "Core samples date basal basalt layers at approximately 160 million years."
                  </div>
                  <div className={styles.factButtons}>
                    {factVerifiedClaims[1] ? (
                      <span className={styles.factBadgeVerified}>
                        {factVerifiedClaims[1] === 'verified' ? '✓ VERIFIED FACT' : 'FLAGGED'}
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleVerifyClaim(1, 'verified')}
                          className={styles.snapChoiceBtn}
                        >
                          VERIFY FROM SOURCE
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerifyClaim(1, 'unverified')}
                          className={styles.snapChoiceBtn}
                        >
                          FLAG BIAS
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className={styles.factClaimCard}>
                  <div className={styles.factClaimText}>
                    <strong>Claim 02:</strong> "Commercial seabed operations are guaranteed infinite rare-earth element extraction."
                  </div>
                  <div className={styles.factButtons}>
                    {factVerifiedClaims[2] ? (
                      <span className={styles.factBadgeUnverified}>
                        {factVerifiedClaims[2] === 'unverified' ? '✗ UNFOUNDED SPECULATION' : 'VERIFIED'}
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleVerifyClaim(2, 'verified')}
                          className={styles.snapChoiceBtn}
                        >
                          VERIFY FROM SOURCE
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerifyClaim(2, 'unverified')}
                          className={styles.snapChoiceBtn}
                        >
                          FLAG AS UNFOUNDED
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.25rem' }} className={styles.sandboxFeedback}>
                <div>
                  <strong>SCANNER STATUS:</strong> Evaluate published statements against source evidence to uncover exaggeration or rhetorical distortion.
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── The 4 Investigative Modules ── */}
      <section id="modules" className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionPretag}>[CORE DISCIPLINES]</span>
          <h2 className={styles.sectionTitle}>The Four Investigative Modules</h2>
          <p className={styles.sectionSubtitle}>
            Each module is structured like an archival case dossier, progressing from foundational principles to complex academic argumentation.
          </p>
        </div>

        <div className={styles.modulesGrid}>
          {/* Module 1: Logic Thread */}
          <div className={styles.moduleFolderCard}>
            <div className={`${styles.moduleFolderTab} ${styles.moduleFolderTabActive}`}>
              <span>MODULE 01</span>
              <span>⊕ LOGIC THREAD</span>
            </div>
            <div className={styles.moduleCardBody}>
              <div className={styles.moduleHeaderIcon}>⊕</div>
              <h3 className={styles.moduleCardTitle}>Logic Thread</h3>
              <p className={styles.moduleCardDescription}>
                Pin isolated evidence cards to the corkboard and weave crimson yarn to track narrative chronology, multi-part definitions, comparison sets, and cascading cause-and-effect arguments.
              </p>
              <div className={styles.modulePillList}>
                <span className={styles.modulePill}>Causal Chains</span>
                <span className={styles.modulePill}>Chronology</span>
                <span className={styles.modulePill}>Definitions</span>
                <span className={styles.modulePill}>Contrast Sets</span>
              </div>
              <div className={styles.moduleCardFooter}>
                <span className={styles.moduleTierTag}>12 NODES // BASICS TO ADVANCED</span>
                <a href="/auth" className={styles.moduleActionLink}>
                  <span>OPEN DOSSIER</span>
                  <span>→</span>
                </a>
              </div>
            </div>
          </div>

          {/* Module 2: Snap-in Gap */}
          <div className={styles.moduleFolderCard}>
            <div className={styles.moduleFolderTab}>
              <span>MODULE 02</span>
              <span>⊞ SNAP-IN GAP</span>
            </div>
            <div className={styles.moduleCardBody}>
              <div className={styles.moduleHeaderIcon}>⊞</div>
              <h3 className={styles.moduleCardTitle}>Snap-in Gap</h3>
              <p className={styles.moduleCardDescription}>
                Detect rhetorical fractures in damaged academic texts. Inspect syntax, assess discourse transitions, and snap the missing logical connector into place to restore paragraph cohesion.
              </p>
              <div className={styles.modulePillList}>
                <span className={styles.modulePill}>Transitions</span>
                <span className={styles.modulePill}>Cohesion</span>
                <span className={styles.modulePill}>Concession</span>
                <span className={styles.modulePill}>Syntax Repair</span>
              </div>
              <div className={styles.moduleCardFooter}>
                <span className={styles.moduleTierTag}>12 NODES // BASICS TO ADVANCED</span>
                <a href="/auth" className={styles.moduleActionLink}>
                  <span>OPEN DOSSIER</span>
                  <span>→</span>
                </a>
              </div>
            </div>
          </div>

          {/* Module 3: Tap Clues */}
          <div className={styles.moduleFolderCard}>
            <div className={styles.moduleFolderTab}>
              <span>MODULE 03</span>
              <span>🔍 TAP CLUES</span>
            </div>
            <div className={styles.moduleCardBody}>
              <div className={styles.moduleHeaderIcon}>🔍</div>
              <h3 className={styles.moduleCardTitle}>Tap Clues</h3>
              <p className={styles.moduleCardDescription}>
                Perform forensic lexical extraction. Tap into subtle context clues, dissect unfamiliar etymologies, detect authorial irony, and decode veiled academic subtexts.
              </p>
              <div className={styles.modulePillList}>
                <span className={styles.modulePill}>Context Clues</span>
                <span className={styles.modulePill}>Tone Dissection</span>
                <span className={styles.modulePill}>Lexical Analysis</span>
                <span className={styles.modulePill}>Subtext</span>
              </div>
              <div className={styles.moduleCardFooter}>
                <span className={styles.moduleTierTag}>12 NODES // BASICS TO ADVANCED</span>
                <a href="/auth" className={styles.moduleActionLink}>
                  <span>OPEN DOSSIER</span>
                  <span>→</span>
                </a>
              </div>
            </div>
          </div>

          {/* Module 4: Fact Scanner */}
          <div className={styles.moduleFolderCard}>
            <div className={styles.moduleFolderTab}>
              <span>MODULE 04</span>
              <span>⚖️ FACT SCANNER</span>
            </div>
            <div className={styles.moduleCardBody}>
              <div className={styles.moduleHeaderIcon}>⚖️</div>
              <h3 className={styles.moduleCardTitle}>Fact Scanner</h3>
              <p className={styles.moduleCardDescription}>
                Weigh claims against primary empirical evidence. Identify logical fallacies, cross-examine unsubstantiated extrapolations, and flag ideological distortion in published literature.
              </p>
              <div className={styles.modulePillList}>
                <span className={styles.modulePill}>Evidentiary Rigor</span>
                <span className={styles.modulePill}>Fallacy Detection</span>
                <span className={styles.modulePill}>Bias Cross-Exam</span>
                <span className={styles.modulePill}>Verification</span>
              </div>
              <div className={styles.moduleCardFooter}>
                <span className={styles.moduleTierTag}>12 NODES // BASICS TO ADVANCED</span>
                <a href="/auth" className={styles.moduleActionLink}>
                  <span>OPEN DOSSIER</span>
                  <span>→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Archival Workbench (Dashboard Tools Showcase) ── */}
      <section id="workbench" className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionPretag}>[INVESTIGATIVE INSTRUMENTS]</span>
          <h2 className={styles.sectionTitle}>The Archival Workbench</h2>
          <p className={styles.sectionSubtitle}>
            Every investigator is equipped with onboard forensic tools to document terminology, review past case briefs, and measure diagnostic accuracy.
          </p>
        </div>

        <div className={styles.workbenchContainer}>
          <div className={styles.workbenchGrid}>
            <div className={styles.toolCard}>
              <div className={styles.toolIcon}>📋</div>
              <div>
                <h4 className={styles.toolTitle}>Lexical Clipboard</h4>
                <p className={styles.toolDesc}>
                  Live terminal for recording unmasked vocabulary, etymological roots, and evidentiary notes for ongoing case references.
                </p>
              </div>
            </div>

            <div className={styles.toolCard}>
              <div className={styles.toolIcon}>📄</div>
              <div>
                <h4 className={styles.toolTitle}>Quick Review</h4>
                <p className={styles.toolDesc}>
                  Rapid spaced-repetition case summaries and cognitive flash nodes to cement reading schemas before tier promotion.
                </p>
              </div>
            </div>

            <div className={styles.toolCard}>
              <div className={styles.toolIcon}>📈</div>
              <div>
                <h4 className={styles.toolTitle}>Metric Log</h4>
                <p className={styles.toolDesc}>
                  Telemetry monitor tracking streak continuity, node clearance velocity, and detailed pedagogical diagnostic metrics.
                </p>
              </div>
            </div>

            <div className={styles.toolCard}>
              <div className={styles.toolIcon}>📖</div>
              <div>
                <h4 className={styles.toolTitle}>Field Manual & Induction</h4>
                <p className={styles.toolDesc}>
                  Complete multi-step onboarding guide and interactive corkboard simulator built into the dashboard command deck.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4-Step Investigation Blueprint ── */}
      <section id="blueprint" className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionPretag}>[TRAINING METHODOLOGY]</span>
          <h2 className={styles.sectionTitle}>Anatomy of an Investigation</h2>
          <p className={styles.sectionSubtitle}>
            How Critica systematically deconstructs passive reading habits into active forensic inquiry.
          </p>
        </div>

        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>01</div>
            <h4 className={styles.stepTitle}>Unredact Primary Text</h4>
            <p className={styles.stepBody}>
              Access authentic academic texts spanning 32 specialized domains—from marine abyssal biology and astrophysics to cognitive linguistics and archaeology.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>02</div>
            <h4 className={styles.stepTitle}>Isolate Evidence Nodes</h4>
            <p className={styles.stepBody}>
              Break dense paragraphs down into isolated claims, discourse transition markers, contextual clues, and empirical premises.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>03</div>
            <h4 className={styles.stepTitle}>Weave Cognitive Proof</h4>
            <p className={styles.stepBody}>
              Physically manipulate pins, thread causal connections, test syntactic slots, and evaluate factual assertions on your archival workbench.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>04</div>
            <h4 className={styles.stepTitle}>Secure Field Clearance</h4>
            <p className={styles.stepBody}>
              Submit your analysis for automated pedagogical evaluation. Receive immediate diagnostic breakdowns and earn clearance stamps.
            </p>
          </div>
        </div>
      </section>

      {/* ── Debriefs & Case Testimonials ── */}
      <section className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionPretag}>[CLASSIFIED DEBRIEFS]</span>
          <h2 className={styles.sectionTitle}>Investigator Testimonials</h2>
          <p className={styles.sectionSubtitle}>
            Feedback logged by researchers, university students, and debaters training inside the Critica archives.
          </p>
        </div>

        <div className={styles.testimonialsGrid}>
          <div className={styles.testimonialCard}>
            <div className={styles.quoteIcon}>“</div>
            <p className={styles.quoteText}>
              "Critica completely cured my passive skim-reading. Physically weaving deductive threads between causal premises forced me to examine sentence-level logic that I previously glossed over."
            </p>
            <div className={styles.authorRow}>
              <div>
                <div className={styles.authorName}>M. Chen</div>
                <div className={styles.authorRole}>Cognitive Science Candidate</div>
              </div>
              <span className={styles.verifiedBadge}>VERIFIED // LVL-3</span>
            </div>
          </div>

          <div className={styles.testimonialCard}>
            <div className={styles.quoteIcon}>“</div>
            <p className={styles.quoteText}>
              "The Snap-in Gap exercises solved rhetorical transition errors my composition students were making for years. The tactile slotting mechanism makes abstract discourse cohesion instantly tangible."
            </p>
            <div className={styles.authorRow}>
              <div>
                <div className={styles.authorName}>Dr. J. Vance</div>
                <div className={styles.authorRole}>Rhetoric & Discourse Studies</div>
              </div>
              <span className={styles.verifiedBadge}>ACADEMIC REVIEW</span>
            </div>
          </div>

          <div className={styles.testimonialCard}>
            <div className={styles.quoteIcon}>“</div>
            <p className={styles.quoteText}>
              "Most reading platforms feel like elementary multiple-choice quizzes. Critica feels like an actual intelligence agency case file desk. The Fact Scanner is indispensable training for legal analysis."
            </p>
            <div className={styles.authorRow}>
              <div>
                <div className={styles.authorName}>A. Rostova</div>
                <div className={styles.authorRole}>Pre-Law Investigator</div>
              </div>
              <span className={styles.verifiedBadge}>VERIFIED // LVL-2</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Grand Clearance Call to Action ── */}
      <section id="clearance" className={styles.sectionContainer}>
        <div className={styles.ctaEnclosure}>
          <span className={styles.sectionPretag} style={{ borderColor: '#C49A5A', color: '#FFF8ED' }}>
            ★ READY FOR INDUCTION?
          </span>
          <h2 className={styles.ctaHeadline}>
            Obtain Your Field Clearance Today.
          </h2>
          <p className={styles.ctaSubtext}>
            Enter the archives, open your student case file folder, and train your analytical intellect across 48 investigative nodes.
          </p>
          <div className={styles.ctaButtonsGroup}>
            <a href="/auth" className={styles.heroPrimaryBtn} style={{ padding: '14px 32px' }}>
              <span>★</span>
              <span>REQUEST INVESTIGATOR CLEARANCE (FREE)</span>
            </a>
            <a href="/auth" className={styles.heroSecondaryBtn} style={{ padding: '14px 28px' }}>
              <span>📁</span>
              <span>ACCESS EXISTING CASE DOSSIER</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Official Archival Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div className={styles.footerCol} style={{ maxWidth: 360 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div className={styles.brandSeal}>★</div>
                <div className={styles.brandTitle}>Critica</div>
              </div>
              <p style={{ fontSize: 12, color: '#A89078', lineHeight: 1.6 }}>
                Advanced forensic reading comprehension and cognitive reasoning academy. Engineered with authentic investigative case dossier architectures.
              </p>
            </div>

            <div className={styles.footerCol}>
              <div className={styles.footerColTitle}>CASE MODULES</div>
              <a href="/auth" className={styles.footerLink}>// Logic Thread</a>
              <a href="/auth" className={styles.footerLink}>// Snap-in Gap</a>
              <a href="/auth" className={styles.footerLink}>// Tap Clues</a>
              <a href="/auth" className={styles.footerLink}>// Fact Scanner</a>
            </div>

            <div className={styles.footerCol}>
              <div className={styles.footerColTitle}>WORKBENCH</div>
              <a href="/auth" className={styles.footerLink}>// Lexical Clipboard</a>
              <a href="/auth" className={styles.footerLink}>// Quick Review Briefs</a>
              <a href="/auth" className={styles.footerLink}>// Metric Diagnostic Log</a>
              <a href="/auth" className={styles.footerLink}>// Field Induction Manual</a>
            </div>

            <div className={styles.footerCol}>
              <div className={styles.footerColTitle}>CLEARANCE</div>
              <a href="/auth" className={styles.footerLink}>// Request Access (Sign Up)</a>
              <a href="/auth" className={styles.footerLink}>// Officer Login (Sign In)</a>
              <a href="#sandbox" className={styles.footerLink}>// Interactive Simulator</a>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <div>
              © 2026 CRITICA ARCHIVAL SYSTEMS. ALL RIGHTS RESERVED. // CLASSIFIED COGNITIVE REASONING INITIATIVE.
            </div>
            <div className={styles.footerStatusBadge}>
              <div className={styles.statusDot} />
              <span>CASE ARCHIVE SYSTEM ONLINE // LEVEL-1 ACTIVE</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
