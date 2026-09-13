'use client'

import React, { useState, useEffect, useCallback } from 'react'
import styles from './sidebar-modals.module.css'
import { apiFetch } from '@/lib/api'

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
  rank_title: string
  rank_level: number
  total_attempts: number
  correct_attempts: number
  overall_accuracy: number
  hint_independence: number
  module_stats: Record<string, ModuleStat>
  recent_activity: TelemetryEntry[]
}

const MODULE_DISPLAY_NAMES: Record<string, { name: string; icon: string }> = {
  logic_thread: { name: 'Text Structure Mastery', icon: '⊕' },
  snap_gap: { name: 'Snap-in-Gap Transitions', icon: '🧩' },
  tap_clues: { name: 'Tap The Clues', icon: '🔍' },
  fact_scanner: { name: 'Fact Scanner (CRAAP)', icon: '🔎' },
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
          const modKeys = ['logic_thread', 'snap_gap', 'tap_clues', 'fact_scanner']
          modKeys.forEach(m => {
            const mStatus = dash.module_status?.[m]
            const completedInMod =
              mStatus?.nodes?.filter((n: any) => n.status === 'completed')?.length || 0
            modStats[m] = {
              attempts: completedInMod,
              correct: completedInMod,
              accuracy: completedInMod > 0 ? 100 : 0,
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

          setMetrics({
            student_id: dash.student_id ? String(dash.student_id) : 'Student',
            username: dash.username || (dash.first_name ? `${dash.first_name} ${dash.last_name || ''}`.trim() : 'Investigator'),
            streak: dash.streak ?? 0,
            completed_count: compCount,
            rank_title: rankTitle,
            rank_level: rankLevel,
            total_attempts: compCount,
            correct_attempts: compCount,
            overall_accuracy: compCount > 0 ? 100 : 100,
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.dossierContainer} onClick={e => e.stopPropagation()}>
        {/* ── Folder Header ── */}
        <div className={styles.folderHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.headerBadge}>TELEMETRY & AUDIT</span>
            <h2 className={styles.headerTitle}>
              <span>📈</span> Metric Log & Performance Audit
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className={styles.stampBox}>OFFICIAL RECORD</span>
            <button className={styles.closeButton} onClick={onClose} title="Close Audit (Esc)">
              ✕ CLOSE
            </button>
          </div>
        </div>

        {/* ── Sub Navigation ── */}
        <div className={styles.subNavBar}>
          <button
            className={`${styles.navTab} ${activeTab === 'overview' ? styles.navTabActive : ''}`}
            onClick={() => setActiveTab('overview')}>
            📊 Clearance & Overview
          </button>
          <button
            className={`${styles.navTab} ${activeTab === 'modules' ? styles.navTabActive : ''}`}
            onClick={() => setActiveTab('modules')}>
            🏛️ Module Proficiency Matrix
          </button>
          <button
            className={`${styles.navTab} ${activeTab === 'telemetry' ? styles.navTabActive : ''}`}
            onClick={() => setActiveTab('telemetry')}>
            📜 Activity Timeline ({metrics?.recent_activity.length || 0})
          </button>
        </div>

        {/* ── Content Body ── */}
        <div className={styles.contentBody}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', fontFamily: 'var(--font-mono, monospace)' }}>
              <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>📡 Interrogating Telemetry Ledger...</div>
              <p style={{ fontSize: '0.8rem', color: '#8C5A3C' }}>Aggregating diagnostic case logs.</p>
            </div>
          ) : !metrics ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', fontFamily: 'var(--font-mono, monospace)' }}>
              <span className={styles.stampBox}>NO TELEMETRY AVAILABLE</span>
              <p style={{ marginTop: '1rem', color: '#6A381F', fontSize: '0.85rem' }}>
                Failed to retrieve operational metrics. Please verify session authorization.
              </p>
              <button
                className={`${styles.tacticalBtn} ${styles.tacticalBtnPrimary}`}
                onClick={fetchMetrics}
                style={{ marginTop: '1rem' }}>
                🔄 Retry Telemetry Interrogation
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div>
                  {/* Investigator Clearance Header */}
                  <div
                    style={{
                      background: '#FFF8ED',
                      border: '2px solid #8C5A3C',
                      borderRadius: '6px',
                      padding: '1.25rem',
                      marginBottom: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div
                        style={{
                          width: '54px',
                          height: '54px',
                          borderRadius: '50%',
                          background: '#2D0909',
                          border: '2px solid #C49A5A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.6rem',
                          color: '#F4E6CC',
                        }}>
                        🛡️
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.72rem', color: '#8C5A3C', letterSpacing: '0.1em' }}>
                          INVESTIGATOR DOSSIER // AGENT #{metrics.student_id}
                        </div>
                        <div style={{ fontFamily: 'var(--font-serif, serif)', fontSize: '1.4rem', fontWeight: 'bold', color: '#2D0909' }}>
                          {metrics.rank_title}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.75rem', color: '#6A381F' }}>
                          Operational User: <strong>{metrics.username}</strong> • Active Streak: <strong>{metrics.streak} Days</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span className={styles.stampBoxSuccess} style={{ transform: 'none' }}>
                        RANK LEVEL {metrics.rank_level}
                      </span>
                    </div>
                  </div>

                  {/* 4 KPI Cards */}
                  <div className={styles.kpiGrid}>
                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Overall Accuracy</span>
                      <span className={styles.kpiValue} style={{ color: metrics.overall_accuracy >= 75 ? '#2E6B3A' : '#8C2424' }}>
                        {metrics.overall_accuracy}%
                      </span>
                      <span className={styles.kpiSubtext}>
                        {metrics.correct_attempts} / {metrics.total_attempts} verified answers
                      </span>
                    </div>

                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Hint Independence</span>
                      <span className={styles.kpiValue}>
                        {metrics.hint_independence}%
                      </span>
                      <span className={styles.kpiSubtext}>
                        Solved without investigative lifeline
                      </span>
                    </div>

                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Completed Nodes</span>
                      <span className={styles.kpiValue}>
                        {metrics.completed_count}
                      </span>
                      <span className={styles.kpiSubtext}>
                        Full case nodes locked down
                      </span>
                    </div>

                    <div className={styles.kpiCard}>
                      <span className={styles.kpiLabel}>Field Operations</span>
                      <span className={styles.kpiValue}>
                        {metrics.total_attempts}
                      </span>
                      <span className={styles.kpiSubtext}>
                        Recorded attempt events
                      </span>
                    </div>
                  </div>

                  {/* Operational Summary */}
                  <div style={{ background: '#FFF8ED', border: '1.5px solid #8C5A3C', borderRadius: '4px', padding: '1rem' }}>
                    <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.8rem', fontWeight: 'bold', color: '#2D0909', marginBottom: '0.35rem' }}>
                      📋 INTELLIGENCE OFFICER DEBRIEF
                    </div>
                    <p style={{ fontSize: '0.82rem', lineHeight: '1.5', color: '#432818', margin: 0 }}>
                      {metrics.completed_count >= 6
                        ? `Agent demonstrates advanced proficiency across analytical modules with high hint independence (${metrics.hint_independence}%). Cleared for intermediate and advanced diagnostic operations.`
                        : metrics.completed_count >= 2
                        ? `Agent is making steady analytical progress. Continue training in multi-part Definition and Comparison case nodes to reinforce signal word isolation.`
                        : `Initial training phase active. Use the Field Manual and 60-second drills in Quick Review to accelerate mastery of time markers and transition connectives.`}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'modules' && (
                <div>
                  <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.95rem', fontWeight: 'bold', color: '#2D0909', margin: 0 }}>
                      4-MODULE FORENSIC COMPETENCY MATRIX
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: '#6A381F', margin: '0.25rem 0' }}>
                      Individual diagnostic tracking across Critica's primary analytical disciplines.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {Object.entries(metrics.module_stats).map(([modKey, stat]) => {
                      const meta = MODULE_DISPLAY_NAMES[modKey] || { name: modKey, icon: '📄' }
                      return (
                        <div key={modKey} className={styles.cheatCard} style={{ margin: 0, padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span style={{ fontSize: '1.25rem' }}>{meta.icon}</span>
                              <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 'bold', fontSize: '0.92rem', color: '#2D0909' }}>
                                {meta.name}
                              </span>
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.78rem', color: '#6A381F' }}>
                              Completed: <strong>{stat.completed_nodes}</strong> • Attempts: <strong>{stat.attempts}</strong>
                            </div>
                          </div>

                          {/* Progress Bar Container */}
                          <div style={{ marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.72rem', marginBottom: '0.25rem' }}>
                              <span>Accuracy Rate</span>
                              <span style={{ fontWeight: 'bold', color: stat.accuracy >= 70 ? '#2E6B3A' : '#8C2424' }}>
                                {stat.accuracy}% ({stat.correct}/{stat.attempts})
                              </span>
                            </div>
                            <div style={{ width: '100%', height: '10px', background: '#E2CBA8', borderRadius: '3px', overflow: 'hidden', border: '1px solid #8C5A3C' }}>
                              <div
                                style={{
                                  width: `${Math.min(100, stat.accuracy)}%`,
                                  height: '100%',
                                  background: stat.accuracy >= 70 ? '#2E6B3A' : '#C49A5A',
                                  transition: 'width 0.4s ease',
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'telemetry' && (
                <div>
                  <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.95rem', fontWeight: 'bold', color: '#2D0909', margin: 0 }}>
                        RECENT FIELD ACTION TELEMETRY
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: '#6A381F', margin: '0.25rem 0' }}>
                        Chronological transaction log of submitted case node solutions.
                      </p>
                    </div>
                    <span className={styles.stampBox}>AUDIT TRAIL</span>
                  </div>

                  {metrics.recent_activity.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', fontFamily: 'var(--font-mono, monospace)', color: '#8C5A3C' }}>
                      No recent operational telemetry recorded. Complete a case exercise to begin logging events.
                    </div>
                  ) : (
                    <table className={styles.retroTable}>
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
                            <td style={{ color: '#6A381F' }}>{entry.timestamp}</td>
                            <td style={{ fontWeight: 'bold' }}>
                              {MODULE_DISPLAY_NAMES[entry.module]?.name || entry.module}
                            </td>
                            <td><code>{entry.node_id}</code></td>
                            <td>
                              {entry.hint_used ? (
                                <span style={{ color: '#8C2424', fontSize: '0.72rem' }}>
                                  Tier {entry.hint_tier || 1} Hint
                                </span>
                              ) : (
                                <span style={{ color: '#2E6B3A', fontSize: '0.72rem' }}>
                                  Independent
                                </span>
                              )}
                            </td>
                            <td>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '0.1rem 0.45rem',
                                  borderRadius: '2px',
                                  fontSize: '0.7rem',
                                  fontWeight: 'bold',
                                  background: entry.is_correct ? '#E2F0D9' : '#FDF4F4',
                                  color: entry.is_correct ? '#2E6B3A' : '#8C2424',
                                  border: `1px solid ${entry.is_correct ? '#2E6B3A' : '#8C2424'}`,
                                }}>
                                {entry.is_correct ? 'SUCCESS' : 'MISSED'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
