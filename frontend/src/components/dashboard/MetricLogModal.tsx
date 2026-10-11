'use client'

import React, { useState, useEffect, useCallback } from 'react'
import styles from './metric-log.module.css'
import { apiFetch } from '@/lib/api'
import { MODULE_KEYS, MODULE_TITLES, moduleTitle } from '@/lib/modules'
import { subscribeToProgressionUpdates } from '@/lib/realtime-sync'
import {
  BadgeCheck, Crosshair, FileText, FolderCheck, FolderOpen, Footprints, Network, Paperclip, Puzzle,
  RefreshCw, ScanSearch, Search, ShieldCheck, X, type LucideIcon,
} from 'lucide-react'

interface MetricLogModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ModuleStat {
  attempts: number
  correct: number
  accuracy: number
  completed_nodes: number
}

interface TelemetryEntry {
  node_id: string
  module: string
  is_correct: boolean
  hint_used: boolean
  hint_tier: number | null
  timestamp: string
}

interface MetricsData {
  student_id: string
  username: string
  streak: number
  completed_count: number
  total_xp?: number
  rank_title: string
  rank_level: number
  current_level_min_xp?: number
  next_level_xp?: number
  xp_in_level?: number
  xp_needed_in_level?: number
  level_progress_pct?: number
  total_attempts: number
  correct_attempts: number
  overall_accuracy: number
  hint_independence: number
  module_stats: Record<string, ModuleStat>
  recent_activity: TelemetryEntry[]
}

// Titles come from @/lib/modules so they match the dashboard tabs
const MODULE_ICONS: Record<string, LucideIcon> = {
  logic_thread: Network,
  snap_gap:     Puzzle,
  tap_clues:    Search,
  fact_scanner: ScanSearch,
}

/** The four disciplines in case order, then any unknown modules the backend reports. */
function moduleOrder(stats: Record<string, ModuleStat>): string[] {
  const known = (MODULE_KEYS as string[]).filter(k => k in stats)
  return [...known, ...Object.keys(stats).filter(k => !known.includes(k))]
}

export default function MetricLogModal({ isOpen, onClose }: MetricLogModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'modules' | 'telemetry'>('overview')
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiFetch('/progression/metrics/')
      if (data && typeof data === 'object') {
        setMetrics(data)
        return
      }
    } catch (err) {
      console.warn('Direct /progression/metrics/ endpoint unavailable, querying dashboard telemetry fallback:', err)
      try {
        // Resilient fallback using /progression/dashboard/ (available on all deployments)
        const dash = await apiFetch('/progression/dashboard/')
        if (dash) {
          const compCount = dash.completed_count ?? (dash.completed_nodes ? dash.completed_nodes.length : 0)
          let rankTitle = 'Novice Analyst (Level 1)'
          let rankLevel = 1
          if (compCount >= 12) {
            rankTitle = 'Chief Inspector (Level 4)'
            rankLevel = 4
          } else if (compCount >= 6) {
            rankTitle = 'Senior Case Officer (Level 3)'
            rankLevel = 3
          } else if (compCount >= 2) {
            rankTitle = 'Field Investigator (Level 2)'
            rankLevel = 2
          }

          const modStats: Record<string, ModuleStat> = {}
          const modKeys = MODULE_KEYS
          let totAtt = 0
          let totCor = 0

          modKeys.forEach(m => {
            const mStatus = dash.module_status?.[m]
            const completedInMod =
              mStatus?.nodes?.filter((n: { status?: string }) => n.status === 'completed')?.length || 0
            const backendStat = dash.module_stats?.[m]
            const attempts = backendStat?.attempts ?? completedInMod
            const correct = backendStat?.correct ?? completedInMod
            const accuracy = backendStat?.accuracy ?? (attempts > 0 ? Math.round((correct / attempts) * 100) : 0)

            totAtt += attempts
            totCor += correct

            modStats[m] = {
              attempts,
              correct,
              accuracy,
              completed_nodes: completedInMod,
            }
          })

          const recentLogs: TelemetryEntry[] = (dash.completed_nodes || [])
            .slice(-5)
            .reverse()
            .map((nid: string) => ({
              node_id: nid,
              module: nid.startsWith('log')
                ? 'logic_thread'
                : nid.startsWith('snp')
                ? 'snap_gap'
                : nid.startsWith('tap')
                ? 'tap_clues'
                : 'fact_scanner',
              is_correct: true,
              hint_used: false,
              hint_tier: null,
              timestamp: 'Verified Case Milestone',
            }))

          const computedAccuracy = dash.overall_accuracy ?? (totAtt > 0 ? Math.round((totCor / totAtt) * 100) : (compCount > 0 ? 100 : 0))

          setMetrics({
            student_id: dash.student_id ? String(dash.student_id) : 'Student',
            username: dash.username || (dash.first_name ? `${dash.first_name} ${dash.last_name || ''}`.trim() : 'Investigator'),
            streak: dash.streak ?? 0,
            completed_count: compCount,
            rank_title: rankTitle,
            rank_level: rankLevel,
            total_attempts: totAtt || compCount,
            correct_attempts: totCor || compCount,
            overall_accuracy: computedAccuracy,
            hint_independence: 100,
            module_stats: modStats,
            recent_activity: recentLogs,
          })
        }
      } catch (fallbackErr) {
        console.error('Failed to load telemetry from fallback:', fallbackErr)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchMetrics()
    }
  }, [isOpen, fetchMetrics])

  useEffect(() => {
    if (!isOpen) return
    const unsub = subscribeToProgressionUpdates(payload => {
      setMetrics(prev => {
        if (!prev) return prev
        return {
          ...prev,
          streak: payload.streak !== undefined ? payload.streak : prev.streak,
          total_xp: payload.total_xp !== undefined ? payload.total_xp : prev.total_xp,
          rank_level: payload.level !== undefined ? payload.level : prev.rank_level,
          rank_title: payload.level_title !== undefined ? payload.level_title : prev.rank_title,
          level_progress_pct: payload.progress_pct !== undefined ? payload.progress_pct : prev.level_progress_pct,
        }
      })
    })
    return () => unsub()
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const tabs: { id: typeof activeTab; label: string; icon: LucideIcon; count?: number }[] = [
    { id: 'overview',  label: 'Clearance & Overview',      icon: ShieldCheck },
    { id: 'modules',   label: 'Module Proficiency Matrix', icon: Crosshair },
    { id: 'telemetry', label: 'Activity Timeline',         icon: Footprints, count: metrics?.recent_activity.length ?? 0 },
  ]

  // The weakest attempted discipline gets Inspector Crit's red-ink "focus here" note
  const weakest = metrics
    ? moduleOrder(metrics.module_stats)
        .filter(k => metrics.module_stats[k].attempts > 0)
        .sort((a, b) => metrics.module_stats[a].accuracy - metrics.module_stats[b].accuracy)[0]
    : undefined

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.shell}
        role="dialog"
        aria-modal="true"
        aria-labelledby="metric-log-title"
        onClick={e => e.stopPropagation()}>

        {/* ── Folder tabs ── */}
        <div className={styles.tabs} role="tablist" aria-label="Audit sections">
          {tabs.map((t, i) => {
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`${styles.tab} ${active ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(t.id)}>
                {active && <Paperclip size={18} strokeWidth={1.75} className={styles.tabClip} aria-hidden />}
                <span className={styles.tabIndex}>[{i + 1}] SECTION {String(i + 1).padStart(2, '0')}:</span>
                <span className={styles.tabLabel}>
                  <t.icon size={13} aria-hidden />
                  {t.label}
                  {t.count !== undefined && <span className={styles.tabCount}>{t.count}</span>}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Manila folder ── */}
        <div className={styles.folder}>
          <Paperclip size={26} strokeWidth={1.6} className={styles.folderClip} aria-hidden />

          {/* Fixed dossier header */}
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <span className={styles.kicker}>
                <FolderOpen size={14} aria-hidden /> CASE FILE {'//'} TELEMETRY & AUDIT
              </span>
              <h2 id="metric-log-title" className={styles.title}>Metric Log & Performance Audit</h2>
            </div>
            <div className={styles.headerRight}>
              <span className={styles.stamp}>Official Record</span>
              <button type="button" className={styles.caseBtn} onClick={onClose} title="Close Audit (Esc)">
                <X size={13} aria-hidden /> Close File
              </button>
            </div>
          </header>

          {/* Scrolling body */}
          <div
            className={`${styles.body} ${activeTab === 'overview' ? styles.bodyFit : styles.bodyScroll}`}
            role="tabpanel">
            {loading ? (
              <div className={styles.state}>
                <div className={styles.stateTitle}>Interrogating Telemetry Ledger...</div>
                <p className={styles.stateText}>Aggregating diagnostic case logs.</p>
              </div>
            ) : !metrics ? (
              <div className={styles.state}>
                <span className={styles.stamp}>No Telemetry Available</span>
                <p className={styles.stateText}>
                  Failed to retrieve operational metrics. Please verify session authorization.
                </p>
                <button type="button" className={styles.caseBtn} onClick={fetchMetrics}>
                  <RefreshCw size={13} aria-hidden /> Retry Telemetry Interrogation
                </button>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <div className={`${styles.pane} ${styles.paneCompact}`}>
                    {/* Investigator clearance */}
                    <div className={`${styles.exhibit} ${styles.clearance}`}>
                      <Paperclip size={16} strokeWidth={1.6} className={styles.clip} aria-hidden />
                      <div className={styles.clearanceWho}>
                        <div className={styles.seal}>
                          <BadgeCheck size={18} aria-hidden />
                        </div>
                        <div>
                          <div className={styles.label}>INVESTIGATOR DOSSIER {'//'} AGENT #{metrics.student_id}</div>
                          <div className={styles.rankTitle}>{metrics.rank_title}</div>
                          <div className={styles.agentMeta}>
                            Operational User: <strong>{metrics.username}</strong> • Active Streak: <strong>{metrics.streak} Days</strong>
                          </div>
                        </div>
                      </div>
                      <div className={styles.clearanceStamps}>
                        <span className={styles.stamp}>
                          <ShieldCheck size={11} aria-hidden /> Rank Level {metrics.rank_level}
                        </span>
                        <span className={`${styles.stamp} ${styles.stampSmall}`}>Classified</span>
                      </div>
                    </div>

                    {/* EXP progression */}
                    <div className={`${styles.exhibit} ${styles.exhibitGood}`}>
                      <Paperclip size={16} strokeWidth={1.6} className={styles.clip} aria-hidden />
                      <div className={styles.row}>
                        <span className={styles.labelStrong}>Clearance Experience (EXP) Progression</span>
                        <span className={styles.figure}>
                          <strong>{metrics.total_xp ?? 0}</strong> / {metrics.next_level_xp ?? 800} XP ({metrics.level_progress_pct ?? 0}%)
                        </span>
                      </div>
                      <div className={styles.gauge}>
                        <div className={styles.gaugeFill} style={{ width: `${metrics.level_progress_pct ?? 0}%` }} />
                      </div>
                      <div className={styles.gaugeFoot}>
                        <span>Tier Floor: {metrics.current_level_min_xp ?? 0} XP</span>
                        <span>
                          {metrics.next_level_xp
                            ? `${Math.max(0, metrics.next_level_xp - (metrics.total_xp ?? 0))} XP to Next Rank Promotion`
                            : 'Maximum Clearance Achieved'}
                        </span>
                      </div>
                    </div>

                    {/* KPIs */}
                    <div className={styles.kpiGrid}>
                      {[
                        { icon: Crosshair,   label: 'Overall Accuracy',  value: `${metrics.overall_accuracy}%`,
                          sub: `${metrics.correct_attempts} / ${metrics.total_attempts} verified answers`,
                          tone: metrics.overall_accuracy >= 75 ? styles.good : styles.poor },
                        { icon: Search,      label: 'Hint Independence', value: `${metrics.hint_independence}%`,
                          sub: 'Solved without investigative lifeline' },
                        { icon: FolderCheck, label: 'Completed Nodes',   value: metrics.completed_count,
                          sub: 'Full case nodes locked down' },
                        { icon: Footprints,  label: 'Field Operations',  value: metrics.total_attempts,
                          sub: 'Recorded attempt events' },
                      ].map(k => (
                        <div key={k.label} className={`${styles.exhibit} ${styles.kpiCard}`}>
                          <Paperclip size={16} strokeWidth={1.6} className={styles.clip} aria-hidden />
                          <div className={styles.kpiHead}>
                            <span className={styles.iconBox}><k.icon size={13} aria-hidden /></span>
                            <span className={styles.labelStrong}>{k.label}</span>
                          </div>
                          <div className={`${styles.kpiValue} ${k.tone ?? ''}`}>{k.value}</div>
                          <div className={styles.kpiSub}>{k.sub}</div>
                        </div>
                      ))}
                    </div>

                    {/* Inspector Crit's debrief, handwritten */}
                    <div className={`${styles.exhibit} ${styles.exhibitBad}`}>
                      <Paperclip size={16} strokeWidth={1.6} className={styles.clip} aria-hidden />
                      <span className={styles.labelStrong}>Intelligence Officer Debrief</span>
                      <p className={`${styles.note} ${styles.debrief}`}>
                        {metrics.completed_count >= 6
                          ? `Advanced proficiency across all four disciplines, with ${metrics.hint_independence}% hint independence. Cleared for intermediate and advanced operations.`
                          : metrics.completed_count >= 2
                          ? `Steady progress, Cadet. Keep training on multi-part ${MODULE_TITLES.logic_thread} cases — follow the signal words, they always point to the culprit.`
                          : `Training phase active. Run the 60-second drills in Quick Review to master time markers and transition connectives.`}
                        <span className={styles.signature}>— Inspector Crit</span>
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'modules' && (
                  <div className={styles.pane}>
                    <div className={styles.sectionHead}>
                      <div>
                        <h3 className={styles.sectionTitle}>4-MODULE FORENSIC COMPETENCY MATRIX</h3>
                        <p className={styles.sectionSub}>Individual diagnostic tracking across Critica&apos;s four detective disciplines.</p>
                      </div>
                      <span className={styles.stamp}>Evidence Review</span>
                    </div>

                    <div className={styles.moduleList}>
                      {moduleOrder(metrics.module_stats).map(modKey => {
                        const stat = metrics.module_stats[modKey]
                        const ModIcon = MODULE_ICONS[modKey] ?? FileText
                        const caseNo = (MODULE_KEYS as string[]).indexOf(modKey) + 1
                        const strong = stat.accuracy >= 70
                        return (
                          <div key={modKey} className={`${styles.exhibit} ${strong ? styles.exhibitGood : styles.exhibitBad}`}>
                            <Paperclip size={16} strokeWidth={1.6} className={styles.clip} aria-hidden />
                            <div className={styles.moduleHead}>
                              <div className={styles.moduleName}>
                                <span className={styles.iconBox}><ModIcon size={13} aria-hidden /></span>
                                <span>
                                  {caseNo > 0 && <span className={styles.label}>CASE {String(caseNo).padStart(2, '0')}</span>}
                                  <span className={styles.moduleTitle} style={{ display: 'block' }}>{moduleTitle(modKey)}</span>
                                </span>
                              </div>
                              <div className={styles.moduleStats}>
                                Completed: <strong>{stat.completed_nodes}</strong> • Attempts: <strong>{stat.attempts}</strong>
                              </div>
                            </div>
                            {modKey === weakest && !strong && (
                              <span className={`${styles.note} ${styles.noteAside}`} style={{ right: 240, top: 16 }}>
                                focus here →
                              </span>
                            )}
                            <div className={styles.row}>
                              <span className={styles.figure}>Accuracy Rate</span>
                              <span className={`${styles.figure} ${strong ? styles.good : styles.poor}`}>
                                <strong className={strong ? styles.good : styles.poor}>{stat.accuracy}%</strong> ({stat.correct}/{stat.attempts})
                              </span>
                            </div>
                            <div className={styles.gauge}>
                              <div
                                className={`${styles.gaugeFill} ${strong ? '' : styles.gaugeFillLow}`}
                                style={{ width: `${Math.min(100, stat.accuracy)}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {activeTab === 'telemetry' && (
                  <div className={styles.pane}>
                    <div className={styles.sectionHead}>
                      <div>
                        <h3 className={styles.sectionTitle}>RECENT FIELD ACTION TELEMETRY</h3>
                        <p className={styles.sectionSub}>Chronological transaction log of submitted case node solutions.</p>
                      </div>
                      <span className={styles.stamp}>Audit Trail</span>
                    </div>

                    {metrics.recent_activity.length === 0 ? (
                      <div className={styles.empty}>
                        No recent operational telemetry recorded. Complete a case exercise to begin logging events.
                      </div>
                    ) : (
                      <div className={styles.tableWrap}>
                        <table className={styles.table}>
                          <thead>
                            <tr>
                              <th>TIMESTAMP</th>
                              <th>MODULE</th>
                              <th>NODE ID</th>
                              <th>HINT STATUS</th>
                              <th>OUTCOME</th>
                            </tr>
                          </thead>
                          <tbody>
                            {metrics.recent_activity.map((entry, idx) => (
                              <tr key={idx}>
                                <td className={styles.muted}>{entry.timestamp}</td>
                                <td className={styles.strong}>{moduleTitle(entry.module)}</td>
                                <td><code>{entry.node_id}</code></td>
                                <td className={entry.hint_used ? styles.poor : styles.good}>
                                  {entry.hint_used ? `Tier ${entry.hint_tier || 1} Hint` : 'Independent'}
                                </td>
                                <td>
                                  <span className={`${styles.stamp} ${styles.stampSmall} ${entry.is_correct ? styles.stampOk : ''}`}>
                                    {entry.is_correct ? 'Solved' : 'Missed'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
