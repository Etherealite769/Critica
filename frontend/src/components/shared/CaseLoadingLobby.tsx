'use client'

import { useState, useEffect, useMemo } from 'react'
import { Network, Puzzle, Search, ScanSearch, type LucideIcon } from 'lucide-react'
import type { ModuleKey } from '@/lib/modules'
import { MODULE_TITLES } from '@/lib/modules'
import lobby from './case-loading-lobby.module.css'

// ── Module-specific loading steps ───────────────────────────────
const MODULE_STEPS: Record<ModuleKey, string[]> = {
  logic_thread: [
    'Calibrating reading competency parameters...',
    'Synthesizing novel academic case scenarios...',
    'Verifying logical paragraph sequence & distractor traps...',
    'Finalizing dynamic 5-case session...',
  ],
  snap_gap: [
    'Calibrating coherence & transition markers...',
    'Synthesizing novel academic sentence pairs...',
    'Calibrating transition tiles & distractor logic...',
    'Finalizing dynamic 5-case session...',
  ],
  tap_clues: [
    'Calibrating contextual vocabulary clues...',
    'Synthesizing novel academic reading passages...',
    'Calibrating target academic terms & synonym anchors...',
    'Finalizing dynamic 5-case session...',
  ],
  fact_scanner: [
    'Scanning CRAAP bias & factual distortion markers...',
    'Synthesizing novel deceptive & scholarly articles...',
    'Calibrating subtle epistemological flaws & sentence bounds...',
    'Finalizing dynamic 5-case session...',
  ],
}

// ── Pop-out words per module ────────────────────────────────────
const MODULE_POPWORDS: Record<ModuleKey, string[]> = {
  logic_thread: [
    'ANALYZING NARRATIVE',
    'TRACING SIGNAL WORDS',
    'MAPPING CAUSE & EFFECT',
    'SEQUENCING EVIDENCE',
    'CROSS-REFERENCING',
    'PATTERN DETECTED',
  ],
  snap_gap: [
    'SCANNING FOR GAPS',
    'LOADING TRANSITIONS',
    'BRIDGING EVIDENCE',
    'COHERENCE CHECK',
    'RECONSTRUCTION',
    'SIGNAL LOCK-ON',
  ],
  tap_clues: [
    'HUNTING CLUES',
    'DECODING SYNONYMS',
    'CONTEXT ANALYSIS',
    'VOCABULARY SCAN',
    'INFERENCE ENGINE',
    'UNLOCKING WORDS',
  ],
  fact_scanner: [
    'VERIFYING SOURCES',
    'CROSS-CHECKING DATA',
    'SCANNING FOR BIAS',
    'AUTHORITY CHECK',
    'ACCURACY AUDIT',
    'TRUTH DETECTED',
  ],
}

// ── Background ambient words (faint, drifting) ──────────────────
const AMBIENT_WORDS = [
  'CLASSIFIED', 'EVIDENCE', 'FORENSIC', 'CONFIDENTIAL', 'ANALYSIS',
  'SUSPECT', 'WITNESS', 'DOSSIER', 'INVESTIGATION', 'CROSS-EXAMINE',
  'CORROBORATE', 'TESTIMONY', 'VERIFIED', 'INTEL', 'REDACTED',
]

// ── Module icons ────────────────────────────────────────────────
const MODULE_ICONS: Record<ModuleKey, LucideIcon> = {
  logic_thread: Network,
  snap_gap:     Puzzle,
  tap_clues:    Search,
  fact_scanner: ScanSearch,
}

// ── Pop-word positions (staggered across the viewport) ──────────
const POP_POSITIONS = [
  { top: '12%', left: '8%' },
  { top: '20%', right: '10%' },
  { top: '35%', left: '5%' },
  { top: '65%', right: '7%' },
  { top: '75%', left: '12%' },
  { top: '85%', right: '14%' },
]

// ── Ambient word seed positions ─────────────────────────────────
const AMBIENT_POSITIONS = [
  { top: '6%',  left: '15%', fontSize: 22, rotate: -8 },
  { top: '14%', left: '68%', fontSize: 18, rotate: 5 },
  { top: '28%', left: '3%',  fontSize: 26, rotate: -3 },
  { top: '38%', left: '78%', fontSize: 20, rotate: 7 },
  { top: '52%', left: '10%', fontSize: 16, rotate: -5 },
  { top: '58%', left: '85%', fontSize: 24, rotate: 4 },
  { top: '72%', left: '22%', fontSize: 19, rotate: -6 },
  { top: '78%', left: '60%', fontSize: 21, rotate: 3 },
  { top: '88%', left: '40%', fontSize: 17, rotate: -4 },
  { top: '92%', left: '75%', fontSize: 23, rotate: 6 },
]

// ── Props ───────────────────────────────────────────────────────
interface CaseLoadingLobbyProps {
  /** Module key to determine theme, steps, and pop words */
  moduleKey?: ModuleKey
  /** Optional title override (e.g. the node title) */
  title?: string
  /** Optional subtitle override */
  subtitle?: string
  /** Optional custom loading steps (overrides module defaults) */
  steps?: string[]
  /** Optional abort/cancel handler to return to dashboard */
  onCancel?: () => void
}

// ── Component ───────────────────────────────────────────────────
export default function CaseLoadingLobby({
  moduleKey = 'logic_thread',
  title,
  subtitle,
  steps: customSteps,
  onCancel,
}: CaseLoadingLobbyProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [progressPct, setProgressPct] = useState(0)

  const steps = customSteps ?? MODULE_STEPS[moduleKey]
  const popWords = MODULE_POPWORDS[moduleKey]
  const ModuleIcon = MODULE_ICONS[moduleKey]
  const moduleLabel = MODULE_TITLES[moduleKey]

  // Shuffle ambient words on mount to feel organic each time
  const ambientWords = useMemo(() => {
    const shuffled = [...AMBIENT_WORDS].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, AMBIENT_POSITIONS.length)
  }, [])

  // Rotate status steps
  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex(prev => (prev + 1) % steps.length)
    }, 1200)
    return () => clearInterval(timer)
  }, [steps.length])

  // Animate progress bar
  useEffect(() => {
    const timer = setInterval(() => {
      setProgressPct(prev => {
        if (prev >= 92) return 92 // never quite hit 100 — feel of loading
        return prev + Math.random() * 4 + 1
      })
    }, 500)
    return () => clearInterval(timer)
  }, [])

  const fallbackTitle = `OPENING ${moduleLabel.toUpperCase()} CASE FILE`

  return (
    <div className={lobby.lobby}>
      {/* Atmosphere layers */}
      <div className={lobby.vignette} aria-hidden />
      <div className={lobby.lamp} aria-hidden />

      {/* Animated red string web */}
      <svg className={lobby.redStrings} viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <g stroke="#c22b2d" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7">
          <path d="M200 180 Q 500 400 350 600 T 250 900" strokeDasharray="8 6" />
          <path d="M1700 120 Q 1500 350 1650 550 T 1750 850" strokeDasharray="8 6" />
          <path d="M400 80 Q 700 200 960 180 T 1500 120" strokeDasharray="6 8" />
          <path d="M300 900 Q 700 800 960 850 T 1600 780" strokeDasharray="6 8" />
        </g>
        {/* Push pins at string intersections */}
        {[
          [200, 180], [350, 600], [1700, 120], [1650, 550],
          [400, 80], [960, 180], [300, 900], [960, 850],
        ].map(([cx, cy], i) => (
          <g key={i}>
            <circle cx={cx + 2} cy={cy + 3} r="6" fill="#000" opacity="0.3" />
            <circle cx={cx} cy={cy} r="6" fill={i % 3 === 0 ? '#f3a712' : '#c0392b'} />
            <circle cx={cx - 1.5} cy={cy - 1.5} r="2" fill="#fff" opacity="0.5" />
          </g>
        ))}
      </svg>

      {/* Ambient drifting words (very faint) */}
      <div className={lobby.wordsLayer} aria-hidden>
        {ambientWords.map((word, i) => {
          const pos = AMBIENT_POSITIONS[i]
          return (
            <span
              key={`amb-${i}`}
              className={lobby.word}
              style={{
                top: pos.top,
                left: pos.left,
                fontSize: pos.fontSize,
                transform: `rotate(${pos.rotate}deg)`,
                animationDelay: `${i * 1.1}s`,
              }}
            >
              {word}
            </span>
          )
        })}
      </div>

      {/* Pop-out forensic words */}
      <div className={lobby.wordsLayer} aria-hidden>
        {popWords.map((word, i) => {
          const pos = POP_POSITIONS[i] || POP_POSITIONS[0]
          return (
            <span
              key={`pop-${i}`}
              className={lobby.popWord}
              style={pos}
            >
              {word}
            </span>
          )
        })}
      </div>

      {/* Centre case envelope */}
      <div className={lobby.envelope}>
        <div className={lobby.stamp}>CRITICA PEDAGOGICAL ENGINE</div>

        {/* Module icon badge */}
        <div className={lobby.moduleBadge}>
          <ModuleIcon size={13} />
          <span className={lobby.moduleBadgeText}>{moduleLabel}</span>
        </div>

        <h3 className={lobby.caseTitle}>
          {title ? title.toUpperCase() : fallbackTitle}
        </h3>
        <p className={lobby.caseSubtitle}>
          {subtitle || 'Generating AI-powered case evidence…'}
        </p>

        {/* Progress bar */}
        <div className={lobby.progressTrack}>
          <div
            className={lobby.progressFill}
            style={{ width: `${Math.min(progressPct, 92)}%` }}
          />
        </div>

        {/* Status ticker */}
        <div className={lobby.statusBox}>
          <p className={lobby.statusText}>
            {steps[stepIndex]}
          </p>
        </div>

        {/* Loading dots */}
        <div className={lobby.loadingDots}>
          <div className={lobby.dot} />
          <div className={lobby.dot} />
          <div className={lobby.dot} />
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              marginTop: 18,
              background: 'transparent',
              border: '1px solid rgba(196, 168, 130, 0.4)',
              borderRadius: 6,
              padding: '6px 16px',
              color: '#BEA791',
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#F3A712'
              e.currentTarget.style.color = '#F3A712'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(196, 168, 130, 0.4)'
              e.currentTarget.style.color = '#BEA791'
            }}
          >
            ← Cancel & Return to Bureau
          </button>
        )}
      </div>
    </div>
  )
}
