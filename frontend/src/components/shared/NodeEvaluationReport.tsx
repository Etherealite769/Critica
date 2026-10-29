'use client'

import { useMemo, useEffect } from 'react'
import { Flame, Clock, Award, ShieldAlert, CheckCircle2, AlertCircle, HelpCircle, ArrowRight, RotateCcw } from 'lucide-react'
import type { ModuleKey } from '@/lib/modules'
import { MODULE_TITLES } from '@/lib/modules'
import { playVictorySound } from '@/lib/sound-effects'
import styles from './node-evaluation-report.module.css'

export interface CaseResult {
  caseNumber: number
  correct: boolean
  firstTry?: boolean
  hintsUsed?: number
  attempts?: number
}

export interface NodeEvaluationReportProps {
  moduleKey?: ModuleKey
  title: string
  accuracy: number // 0 - 100
  totalCases: number
  correctCases: number
  hintsUsed: number
  timeTakenSeconds?: number
  streak?: number | null
  caseResults?: CaseResult[]
  nextNodeId?: string | null
  onNext?: () => void
  onReplay?: () => void
  onDashboard: () => void
}

export default function NodeEvaluationReport({
  moduleKey,
  title,
  accuracy,
  totalCases,
  correctCases,
  hintsUsed,
  timeTakenSeconds = 0,
  streak = 0,
  caseResults,
  nextNodeId,
  onNext,
  onReplay,
  onDashboard,
}: NodeEvaluationReportProps) {
  // Play victory fanfare sound on debriefing clearance screen
  useEffect(() => {
    playVictorySound();
  }, []);

  // Format MM:SS
  const formattedTime = useMemo(() => {
    const mins = Math.floor(timeTakenSeconds / 60)
    const secs = timeTakenSeconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }, [timeTakenSeconds])

  // Fallback case items if none provided
  const displayCases = useMemo(() => {
    if (caseResults && caseResults.length > 0) return caseResults
    const generated: CaseResult[] = []
    for (let i = 1; i <= Math.max(totalCases, 5); i++) {
      generated.push({
        caseNumber: i,
        correct: i <= correctCases,
        firstTry: i <= correctCases,
        hintsUsed: 0,
        attempts: 1,
      })
    }
    return generated
  }, [caseResults, totalCases, correctCases])

  // Total attempts taken across all cases
  const totalAttemptsTaken = useMemo(() => {
    return displayCases.reduce((sum, c) => sum + (c.attempts || (c.correct ? 1 : 0)), 0)
  }, [displayCases])

  // Overall accuracy based on attempts: sum(correct) / sum(attempts) (e.g. 5 correct over 14 attempts = 36%)
  const effectiveAccuracy = useMemo(() => {
    if (displayCases.length > 0 && totalAttemptsTaken > 0) {
      const totalCorrect = displayCases.filter(c => c.correct).length
      return Math.min(100, Math.max(0, Math.round((totalCorrect / totalAttemptsTaken) * 100)))
    }
    return accuracy
  }, [displayCases, totalAttemptsTaken, accuracy])

  // Determine performance tier & badge based on overall attempts accuracy
  const tier = useMemo(() => {
    if (effectiveAccuracy >= 95) {
      return {
        grade: 'S',
        label: 'EXEMPLARY CLEARANCE',
        color: '#FFD700',
        stampClass: styles.stampS,
      }
    }
    if (effectiveAccuracy >= 80) {
      return {
        grade: 'A',
        label: 'CASE RESOLVED',
        color: '#4DDD94',
        stampClass: styles.stampA,
      }
    }
    if (effectiveAccuracy >= 60) {
      return {
        grade: 'B',
        label: 'PARTIAL INTEL',
        color: '#F3A712',
        stampClass: styles.stampB,
      }
    }
    return {
      grade: 'C',
      label: 'NEEDS REVIEW',
      color: '#EF4444',
      stampClass: styles.stampC,
    }
  }, [effectiveAccuracy])

  // Circular gauge values (radius = 50, circumference = 2 * PI * 50 = 314.16)
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, effectiveAccuracy)) / 100) * circumference

  const moduleLabel = moduleKey ? MODULE_TITLES[moduleKey] : 'FORENSIC INVESTIGATION'

  return (
    <div className={styles.reportOverlay}>
      <div className={styles.reportCard}>
        {/* Banner with stamp */}
        <div className={styles.confidentialBanner}>
          <div className={styles.bannerTag}>
            <span>DOSSIER // {moduleLabel.toUpperCase()}</span>
          </div>
          <div className={`${styles.stampBadge} ${tier.stampClass}`}>
            ★ TIER {tier.grade} — {tier.label}
          </div>
        </div>

        {/* Title Area */}
        <div className={styles.titleArea}>
          <h2 className={styles.nodeTitle}>{title}</h2>
          <p className={styles.nodeSubtitle}>
            CASE FILE EVALUATION &amp; FORENSIC ACCURACY DEBRIEF
          </p>
        </div>

        {/* Gauge & Key Stats */}
        <div className={styles.gaugeRow}>
          <div className={styles.gaugeWrapper}>
            <svg className={styles.gaugeSvg} viewBox="0 0 120 120">
              <circle
                className={styles.gaugeBgTrack}
                cx="60"
                cy="60"
                r={radius}
              />
              <circle
                className={styles.gaugeFillTrack}
                cx="60"
                cy="60"
                r={radius}
                stroke={tier.color}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className={styles.gaugeCenterContent}>
              <span className={styles.gaugePercent} style={{ color: tier.color }}>
                {effectiveAccuracy}%
              </span>
              <span className={styles.gaugeLabel}>ACCURACY</span>
            </div>
          </div>

          <div className={styles.quickMetrics}>
            <div className={styles.metricItem}>
              <span className={styles.metricName}>
                <Award size={13} /> Clearances Verified
              </span>
              <span className={styles.metricVal}>
                {correctCases} / {totalCases} Cases
              </span>
            </div>

            <div className={styles.metricItem}>
              <span className={styles.metricName}>
                <HelpCircle size={13} /> Hints Requested
              </span>
              <span className={styles.metricVal}>
                {hintsUsed === 0 ? '0 (Independent)' : `${hintsUsed} Used`}
              </span>
            </div>

            {timeTakenSeconds > 0 && (
              <div className={styles.metricItem}>
                <span className={styles.metricName}>
                  <Clock size={13} /> Time Elapsed
                </span>
                <span className={styles.metricVal}>{formattedTime}</span>
              </div>
            )}

            <div className={styles.metricItem}>
              <span className={styles.metricName}>
                <Flame size={13} /> Detective Streak
              </span>
              <span className={styles.metricVal} style={{ color: '#F3A712' }}>
                {streak ?? 0} {streak === 1 ? 'Day' : 'Days'}
              </span>
            </div>
          </div>
        </div>

        {/* Per-Case Breakdown Grid */}
        <div className={styles.casesSection}>
          <div className={styles.casesSectionHeader}>
            <span>5-CASE SESSION VERIFICATION LOG</span>
            <span>{effectiveAccuracy}% OVERALL ACCURACY ({correctCases}/{totalAttemptsTaken} TRIES)</span>
          </div>
          <div className={styles.casePillsGrid}>
            {displayCases.slice(0, 5).map((c) => {
              const triesTaken = c.attempts ?? (c.correct ? 1 : 0)
              const isPerfect = c.correct && (c.firstTry ?? (triesTaken === 1))
              const pillClass = c.correct
                ? (isPerfect ? styles.casePillSuccess : styles.casePillWarning)
                : styles.casePillDanger
              const iconColor = isPerfect ? '#4DDD94' : c.correct ? '#F3A712' : '#EF4444'
              const detailText = c.correct
                ? `1/${triesTaken} ${triesTaken === 1 ? 'try' : 'tries'}`
                : `0/${triesTaken} ${triesTaken === 1 ? 'try' : 'tries'}`

              return (
                <div
                  key={c.caseNumber}
                  className={`${styles.casePill} ${pillClass}`}
                >
                  <span className={styles.casePillTitle}>CASE #{c.caseNumber}</span>
                  <span
                    className={styles.casePillIcon}
                    style={{ color: iconColor }}
                  >
                    {c.correct ? (isPerfect ? '✓' : '▲') : '✗'}
                  </span>
                  <span className={styles.casePillDetail} style={{ fontWeight: 600 }}>
                    {detailText}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action Controls */}
        <div className={styles.actionsBar}>
          {nextNodeId && onNext && (
            <button className={styles.btnNext} onClick={onNext}>
              NEXT CASE NODE →
            </button>
          )}

          {onReplay && (
            <button className={styles.btnReplay} onClick={onReplay}>
              ↻ REPLAY FRESH DRILL
            </button>
          )}

          <button className={styles.btnDashboard} onClick={onDashboard}>
            ← DASHBOARD
          </button>
        </div>
      </div>
    </div>
  )
}
