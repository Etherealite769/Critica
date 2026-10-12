'use client'

import React from 'react'
import {
  Search,
  Network,
  Puzzle,
  ScanSearch,
  Compass,
  Paperclip,
  BookOpen,
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
  FileText,
  type LucideIcon,
} from 'lucide-react'
import type { ModuleKey } from '@/lib/modules'
import { MODULE_TITLES } from '@/lib/modules'
import InspectorCrit from '@/components/brand/InspectorCrit'
import styles from './case-lesson.module.css'

export interface CaseLessonScreenProps {
  moduleKey: ModuleKey
  nodeId?: string
  phase: 'micro_lesson' | 'deep_dive'
  title: string
  focus?: string
  microLessonText: string
  readingPassage?: string
  deepDiveRequired?: boolean
  difficulty?: string | number
  craapCriterion?: string
  onContinue: () => void
  onBackToDashboard?: () => void
}

const MODULE_ICONS: Record<ModuleKey, LucideIcon> = {
  logic_thread: Network,
  snap_gap: Puzzle,
  tap_clues: Search,
  fact_scanner: ScanSearch,
}

const MODULE_SUBTITLES: Record<ModuleKey, string> = {
  tap_clues: 'Contextual Vocabulary Engine',
  snap_gap: 'Transition & Coherence Analysis',
  logic_thread: 'Paragraph Sequence & Logic Matrix',
  fact_scanner: 'CRAAP Bias & Distortion Detection',
}

function getDifficultyLabel(diff?: string | number): string {
  if (typeof diff === 'number') {
    if (diff <= 1) return 'Novice Tier'
    if (diff === 2) return 'Intermediate'
    if (diff === 3) return 'Advanced'
    return 'Master Tier'
  }
  if (typeof diff === 'string') {
    return diff.charAt(0).toUpperCase() + diff.slice(1)
  }
  return 'Standard Case'
}

export default function CaseLessonScreen({
  moduleKey,
  nodeId,
  phase,
  title,
  focus,
  microLessonText,
  readingPassage,
  deepDiveRequired = false,
  difficulty,
  craapCriterion,
  onContinue,
  onBackToDashboard,
}: CaseLessonScreenProps) {
  const IconComponent = MODULE_ICONS[moduleKey] || Search
  const moduleTitle = MODULE_TITLES[moduleKey] || 'FORENSIC MODULE'
  const moduleSub = MODULE_SUBTITLES[moduleKey] || 'CRITICA INVESTIGATION'
  const diffLabel = getDifficultyLabel(difficulty)

  // Dossier file code
  const dossierRef = nodeId
    ? `CRIT-${nodeId.slice(0, 8).toUpperCase()}`
    : `CRIT-${moduleKey.slice(0, 2).toUpperCase()}-LIVE`

  const isDeepDive = phase === 'deep_dive'

  return (
    <div className={styles.screenBackdrop}>
      {/* Edge vignette & warm lamp ambiance */}
      <div className={styles.vignette} />
      <div className={styles.lampGlow} />

      {/* Decorative Red Evidence Strings */}
      <svg className={styles.redStrings} width="100%" height="100%">
        <line x1="0" y1="22%" x2="28%" y2="0" stroke="#9E2A2B" strokeWidth="1.5" strokeDasharray="6,4" />
        <line x1="72%" y1="0" x2="100%" y2="28%" stroke="#9E2A2B" strokeWidth="1.5" strokeDasharray="6,4" />
        <line x1="0" y1="78%" x2="24%" y2="100%" stroke="#9E2A2B" strokeWidth="1.5" strokeDasharray="6,4" />
        <line x1="76%" y1="100%" x2="100%" y2="78%" stroke="#9E2A2B" strokeWidth="1.5" strokeDasharray="6,4" />
      </svg>

      {/* Main Dossier Folder Frame (Compact & Sleek) */}
      <div className={styles.dossierWrapper}>
        {/* Manila File Tab */}
        <div className={styles.folderTab}>
          <span className={styles.tabClip}><Paperclip size={12} /></span>
          <span>{isDeepDive ? 'PRIMARY EVIDENCE EXHIBIT' : 'CLASSIFIED INTEL BRIEFING'}</span>
          <span className={styles.tabDossierId}>// {dossierRef}</span>
        </div>

        {/* Parchment Case File */}
        <div className={styles.parchmentCard}>
          {/* Top Bar: Module Badge + Stamp */}
          <div className={styles.classifiedBar}>
            <div className={styles.moduleBadgeGroup}>
              <div className={styles.moduleIconBox}>
                <IconComponent size={17} />
              </div>
              <div className={styles.moduleDetails}>
                <div className={styles.moduleTitleText}>{moduleTitle}</div>
                <div className={styles.difficultyPill}>
                  <span className={styles.difficultyDot} />
                  <span>{diffLabel}</span>
                  <span style={{ opacity: 0.5 }}>•</span>
                  <span>{moduleSub}</span>
                </div>
              </div>
            </div>

            {/* Official Weathered Stamp */}
            <div className={styles.weatheredStamp}>
              <span>{isDeepDive ? 'EVIDENCE EXHIBIT' : 'CONFIDENTIAL INTEL'}</span>
              <span className={styles.stampSub}>DECLASSIFIED • CRITICA</span>
            </div>
          </div>

          {/* Case Header & Attached Polaroid Photo Row */}
          <div className={styles.headerWithPhoto}>
            <div className={styles.caseHeaderLeft}>
              <h1 className={styles.caseTitle}>{title}</h1>

              {focus && (
                <div className={styles.objectiveBanner}>
                  <Compass className={styles.objectiveIcon} size={15} />
                  <div className={styles.objectiveContent}>
                    <span className={styles.objectiveLabel}>FIELD DIRECTIVE // TACTICAL OBJECTIVE</span>
                    <span className={styles.objectiveText}>{focus}</span>
                  </div>
                </div>
              )}

              {/* Fact Scanner CRAAP Criterion Badge */}
              {craapCriterion && (
                <div className={styles.craapBadge}>
                  <ShieldAlert size={12} />
                  <span>CRAAP EVALUATION CRITERION: {craapCriterion}</span>
                </div>
              )}
            </div>

            {/* Pinned Evidence Polaroid Photo (like in the dashboard) */}
            <div className={styles.polaroidContainer}>
              <div className={styles.polaroidTape} />
              <div className={styles.polaroidPin} />
              <div className={styles.polaroidFrame}>
                <div className={styles.polaroidPhoto}>
                  <InspectorCrit height={46} priority />
                </div>
                <span className={styles.polaroidCaption}>EXHIBIT // CRIT</span>
              </div>
            </div>
          </div>

          {/* ── Content View: Micro Lesson or Deep Dive ── */}
          {!isDeepDive ? (
            /* Micro-Lesson Intel Briefing */
            <div className={styles.intelBriefingBox}>
              <div className={styles.intelHeader}>
                <div className={styles.intelAgentTag}>
                  <InspectorCrit height={20} decorative />
                  <span>INSPECTOR CRIT'S OPERATIONAL INTEL</span>
                </div>
                <span className={styles.intelTagBadge}>CRITICAL RULE</span>
              </div>

              <p className={styles.lessonBody}>{microLessonText}</p>

              <div className={styles.operationalNote}>
                <FileText size={14} color="#A06520" style={{ flexShrink: 0 }} />
                <span>
                  <strong>OPERATIVE TIP:</strong> Anchor on this principle while analyzing passage evidence to maintain 100% forensic clearance accuracy.
                </span>
              </div>
            </div>
          ) : (
            /* Deep Dive Reading Section */
            <div className={styles.deepDiveSection}>
              <div className={styles.deepDiveHeaderBar}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BookOpen size={14} color="#F3A712" />
                  PRIMARY SOURCE EVIDENCE — EXHIBIT PASSAGE
                </span>
                <span className={styles.deepDiveTimeTag}>
                  <Clock size={12} />
                  MANDATORY ENDURANCE READ
                </span>
              </div>

              <div className={styles.readingPassageViewer}>
                {readingPassage || microLessonText}
              </div>

              <div className={styles.evidenceNotice}>
                <CheckCircle2 size={14} color="#22AA55" style={{ flexShrink: 0 }} />
                <span>Examine all details carefully before unlocking the case investigation task.</span>
              </div>
            </div>
          )}

          {/* ── Footer Navigation & Actions ── */}
          <div className={styles.dossierFooter}>
            <div className={styles.stepIndicator}>
              {deepDiveRequired ? (
                <>
                  <span className={!isDeepDive ? styles.stepDotActive : styles.stepDotPending} />
                  <span style={{ color: !isDeepDive ? '#382414' : '#8C6C4A' }}>1. INTEL BRIEFING</span>
                  <span style={{ opacity: 0.4 }}>──</span>
                  <span className={isDeepDive ? styles.stepDotActive : styles.stepDotPending} />
                  <span style={{ color: isDeepDive ? '#382414' : '#8C6C4A' }}>2. EVIDENCE REVIEW</span>
                </>
              ) : (
                <>
                  <span className={styles.stepDotActive} />
                  <span style={{ color: '#382414' }}>STAGE 1 OF 1: OPERATIVE BRIEFING COMPLETE</span>
                </>
              )}
            </div>

            <div className={styles.actionButtonGroup}>
              {onBackToDashboard && (
                <button
                  type="button"
                  onClick={onBackToDashboard}
                  className={styles.btnBackDesk}
                >
                  <ArrowLeft size={12} />
                  BUREAU DESK
                </button>
              )}

              <button
                type="button"
                onClick={onContinue}
                className={styles.btnPrimaryProceed}
              >
                <span>
                  {isDeepDive
                    ? 'INTEL VERIFIED — COMMENCE CASE'
                    : deepDiveRequired
                      ? 'EXAMINE CASE EVIDENCE'
                      : 'COMMENCE CASE INVESTIGATION'}
                </span>
                <ArrowRight size={13} className={styles.btnArrowIcon} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
