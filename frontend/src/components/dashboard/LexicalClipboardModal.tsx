'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import styles from './sidebar-modals.module.css'
import { apiFetch } from '@/lib/api'
import {
  notifyLexicalUpdated,
  subscribeToLexicalUpdates,
  notifyProgressionUpdated,
  LexicalSyncPayload,
} from '@/lib/realtime-sync'

export interface LexicalWord {
  word: string
  definition: string
  contextual_usage: string
  translation?: string
  next_review_date: string
  access_count: number
  is_starter?: boolean
  is_due_today?: boolean
  is_reviewed_today?: boolean
}

export interface DeckStatus {
  total_count: number
  due_count: number
  reviewed_today_count: number
  future_count: number
  seconds_until_refresh: number
  is_daily_complete: boolean
}

interface LexicalClipboardModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function LexicalClipboardModal({ isOpen, onClose }: LexicalClipboardModalProps) {
  const [activeTab, setActiveTab] = useState<'index' | 'flashcards' | 'schedule'>('index')
  const [words, setWords] = useState<LexicalWord[]>([])
  const [deckStatus, setDeckStatus] = useState<DeckStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [reviewing, setReviewing] = useState(false)

  // Flashcard Drill Mode: 'daily' (due today) vs 'all' (free practice)
  const [drillMode, setDrillMode] = useState<'daily' | 'all'>('daily')

  // Direct Evidence Log Form Drawer
  const [showAddDrawer, setShowAddDrawer] = useState(false)
  const [newWord, setNewWord] = useState('')
  const [newDef, setNewDef] = useState('')
  const [newTranslation, setNewTranslation] = useState('')
  const [newUsage, setNewUsage] = useState('')
  const [savingWord, setSavingWord] = useState(false)

  // Realtime XP Toast
  const [xpToast, setXpToast] = useState<{ amount: number; message: string } | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  // Fetch words and status
  const fetchDeck = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiFetch('/lexical/deck/?mode=enriched')
      if (data && data.words) {
        setWords(data.words)
        if (data.deck_status) {
          setDeckStatus(data.deck_status)
          setRemainingSeconds(data.deck_status.seconds_until_refresh || 0)
        }
      } else if (Array.isArray(data)) {
        setWords(data)
      }
    } catch (err) {
      console.error('Failed to load lexical deck:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load on open
  useEffect(() => {
    if (isOpen) {
      fetchDeck()
      setIsFlipped(false)
      setCurrentCardIndex(0)
    }
  }, [isOpen, fetchDeck])

  // Daily Refresh Countdown Ticker
  useEffect(() => {
    if (!isOpen || remainingSeconds <= 0) return
    const interval = setInterval(() => {
      setRemainingSeconds(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [isOpen, remainingSeconds])

  // Realtime Subscription and Polling Heartbeat
  useEffect(() => {
    if (!isOpen) return

    // 1. Subscribe to instant local / cross-tab broadcast events
    const unsubscribe = subscribeToLexicalUpdates((payload: LexicalSyncPayload) => {
      if (payload.action === 'word_logged' && payload.wordData) {
        const logged = payload.wordData as LexicalWord
        setWords(prev => {
          const exists = prev.some(w => w.word.toLowerCase() === logged.word.toLowerCase())
          if (exists) {
            return prev.map(w => (w.word.toLowerCase() === logged.word.toLowerCase() ? { ...w, ...logged } : w))
          }
          return [{ ...logged, is_due_today: true, access_count: logged.access_count || 1 }, ...prev]
        })
        setDeckStatus(prev =>
          prev
            ? {
                ...prev,
                total_count: prev.total_count + 1,
                due_count: prev.due_count + 1,
                is_daily_complete: false,
              }
            : null
        )
      } else if (payload.action === 'word_reviewed' && payload.wordData) {
        const reviewedWord = payload.wordData.word
        setWords(prev =>
          prev.map(w =>
            w.word.toLowerCase() === reviewedWord.toLowerCase()
              ? {
                  ...w,
                  access_count: (w.access_count || 1) + 1,
                  is_due_today: false,
                  is_reviewed_today: true,
                }
              : w
          )
        )
      } else if (payload.action === 'deck_refresh') {
        fetchDeck()
      }
    })

    // 2. Periodic background heartbeat check (every 4 seconds)
    const heartbeat = setInterval(async () => {
      try {
        const status = await apiFetch('/lexical/status/')
        if (status) {
          setDeckStatus(prev => {
            if (
              !prev ||
              prev.total_count !== status.total_count ||
              prev.due_count !== status.due_count ||
              prev.reviewed_today_count !== status.reviewed_today_count
            ) {
              // Status counts shifted from another session; sync deck smoothly
              fetchDeck()
            }
            return status
          })
        }
      } catch {
        /* silent polling fail */
      }
    }, 4000)

    return () => {
      unsubscribe()
      clearInterval(heartbeat)
    }
  }, [isOpen, fetchDeck])

  // Format countdown string
  const formatCountdown = (secs: number) => {
    const hours = Math.floor(secs / 3600)
    const minutes = Math.floor((secs % 3600) / 60)
    const seconds = secs % 60
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') {
        if (showAddDrawer) {
          setShowAddDrawer(false)
          return
        }
        onClose()
      }
      if (activeTab === 'flashcards' && !showAddDrawer) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          setIsFlipped(prev => !prev)
        } else if (e.key === 'ArrowRight') {
          handleNextCard()
        } else if (e.key === 'ArrowLeft') {
          handlePrevCard()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, activeTab, isFlipped, showAddDrawer])

  // Active flashcard deck calculation
  const activeDeck = useMemo(() => {
    if (drillMode === 'daily') {
      const due = words.filter(w => w.is_due_today !== false && !w.is_reviewed_today)
      return due
    }
    return words
  }, [words, drillMode])

  // Word Index search filter
  const filteredWords = useMemo(() => {
    if (!searchQuery.trim()) return words
    const q = searchQuery.toLowerCase()
    return words.filter(
      w =>
        w.word.toLowerCase().includes(q) ||
        w.definition.toLowerCase().includes(q) ||
        (w.translation && w.translation.toLowerCase().includes(q)) ||
        (w.contextual_usage && w.contextual_usage.toLowerCase().includes(q))
    )
  }, [words, searchQuery])

  const handleNextCard = () => {
    setIsFlipped(false)
    setCurrentCardIndex(prev => (prev + 1) % (activeDeck.length || 1))
  }

  const handlePrevCard = () => {
    setIsFlipped(false)
    setCurrentCardIndex(prev => (prev - 1 + activeDeck.length) % (activeDeck.length || 1))
  }

  // Record review with XP awards & realtime broadcast
  const handleRecordReview = async (word: string) => {
    try {
      setReviewing(true)
      const res = await apiFetch('/lexical/review/', {
        method: 'POST',
        body: JSON.stringify({ word }),
      })

      // Trigger XP Toast
      const xpGained = res.xp_awarded || 10
      const bonusText = res.bonus_awarded > 0 ? ' (Includes +30 Daily Quota Bonus!)' : ''
      setXpToast({
        amount: xpGained,
        message: `+${xpGained} XP Awarded${bonusText}`,
      })
      setTimeout(() => setXpToast(null), 3500)

      // Broadcast progression update so topbar streak & XP update instantly
      notifyProgressionUpdated({
        action: 'xp_awarded',
        xp_awarded: xpGained,
        total_xp: res.total_xp,
        level: res.level,
        level_title: res.level_title,
        level_up: res.level_up,
        streak: res.streak,
        streak_new_day: res.streak_new_day,
      })

      // Broadcast lexical review event
      notifyLexicalUpdated({
        action: 'word_reviewed',
        wordData: { word },
      })

      // Update local words state
      setWords(prev =>
        prev.map(w =>
          w.word === word
            ? {
                ...w,
                access_count: (w.access_count || 1) + 1,
                next_review_date: res.next_review_date,
                is_due_today: false,
                is_reviewed_today: true,
              }
            : w
        )
      )

      if (res.deck_status) {
        setDeckStatus(res.deck_status)
      }

      handleNextCard()
    } catch (err) {
      console.error('Failed to log review:', err)
      handleNextCard()
    } finally {
      setReviewing(false)
    }
  }

  // Handle direct manual word entry
  const handleAddEvidenceTerm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWord.trim()) return

    try {
      setSavingWord(true)
      const wordPayload = {
        word: newWord.trim(),
        definition: newDef.trim(),
        translation: newTranslation.trim(),
        contextual_usage: newUsage.trim(),
      }

      const res = await apiFetch('/lexical/log/', {
        method: 'POST',
        body: JSON.stringify({ word_data: wordPayload }),
      })

      const completeWord: LexicalWord = {
        ...wordPayload,
        access_count: 1,
        next_review_date: res.next_review_date || new Date().toISOString(),
        is_due_today: true,
        is_reviewed_today: false,
      }

      // Add to local state immediately
      setWords(prev => [completeWord, ...prev])

      // Broadcast in real-time
      notifyLexicalUpdated({
        action: 'word_logged',
        wordData: completeWord,
      })

      // Reset form
      setNewWord('')
      setNewDef('')
      setNewTranslation('')
      setNewUsage('')
      setShowAddDrawer(false)
    } catch (err) {
      console.error('Failed to log direct term:', err)
    } finally {
      setSavingWord(false)
    }
  }

  if (!isOpen) return null

  const currentWord = activeDeck[currentCardIndex]
  const isDailyCompleted = drillMode === 'daily' && activeDeck.length === 0

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.dossierContainer} onClick={e => e.stopPropagation()}>
        {/* ── XP Toast Notification ── */}
        {xpToast && (
          <div className={styles.xpToast}>
            <span>⚡</span>
            <span>{xpToast.message}</span>
          </div>
        )}

        {/* ── Folder Header ── */}
        <div className={styles.folderHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.headerBadge}>DOSSIER // EVIDENCE DECK</span>
            <h2 className={styles.headerTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span>📋</span> Lexical Clipboard
              <span className={styles.livePulseBadge} title="Realtime cross-tab evidence synchronization active">
                <span className={styles.liveDot} /> LIVE SYNC ACTIVE
              </span>
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className={styles.stampBox}>EVIDENCE VAULT</span>
            <button className={styles.closeButton} onClick={onClose} title="Close Dossier (Esc)">
              ✕ CLOSE
            </button>
          </div>
        </div>

        {/* ── Sub Navigation ── */}
        <div className={styles.subNavBar}>
          <button
            className={`${styles.navTab} ${activeTab === 'index' ? styles.navTabActive : ''}`}
            onClick={() => setActiveTab('index')}>
            📁 Word Index ({words.length})
          </button>
          <button
            className={`${styles.navTab} ${activeTab === 'flashcards' ? styles.navTabActive : ''}`}
            onClick={() => {
              setActiveTab('flashcards')
              setIsFlipped(false)
            }}>
            ⚡ Flashcard Drill {deckStatus && deckStatus.due_count > 0 && `(${deckStatus.due_count} Due)`}
          </button>
          <button
            className={`${styles.navTab} ${activeTab === 'schedule' ? styles.navTabActive : ''}`}
            onClick={() => setActiveTab('schedule')}>
            🗓️ Retention Schedule
          </button>
        </div>

        {/* ── Content Body ── */}
        <div className={styles.contentBody}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', fontFamily: 'var(--font-mono, monospace)' }}>
              <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>📂 Synchronizing Evidence Files...</div>
              <p style={{ fontSize: '0.8rem', color: '#8C5A3C' }}>Connecting to realtime lexical ledger.</p>
            </div>
          ) : activeTab === 'index' ? (
            <div>
              {/* Search & Action Bar */}
              <div className={styles.searchBarRow}>
                <input
                  type="text"
                  placeholder="🔍 Search words, definitions, translations, or context..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
                <button
                  className={`${styles.tacticalBtn} ${styles.tacticalBtnPrimary}`}
                  onClick={() => setShowAddDrawer(!showAddDrawer)}>
                  {showAddDrawer ? '▲ Close Form' : '+ Log Evidence Term'}
                </button>
                <button
                  className={`${styles.tacticalBtn} ${styles.tacticalBtnSuccess}`}
                  onClick={() => {
                    setDrillMode('daily')
                    setActiveTab('flashcards')
                    setIsFlipped(false)
                  }}>
                  ⚡ Drill Today's Due ({deckStatus?.due_count ?? 0})
                </button>
              </div>

              {/* Direct Evidence Log Drawer */}
              {showAddDrawer && (
                <form onSubmit={handleAddEvidenceTerm} className={styles.evidenceForm}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={styles.headerBadge} style={{ background: '#2D0909', color: '#FFF8ED' }}>
                      NEW EVIDENCE TRANSCRIPT
                    </span>
                    <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono, monospace)', color: '#8C5A3C' }}>
                      Realtime Ledger Entry
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono, monospace)', color: '#432818', marginBottom: '0.2rem' }}>
                        Vocabulary Term *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ubiquitous"
                        value={newWord}
                        onChange={e => setNewWord(e.target.value)}
                        className={styles.searchInput}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono, monospace)', color: '#432818', marginBottom: '0.2rem' }}>
                        Translation / Sense (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Omnipresent / Everywhere"
                        value={newTranslation}
                        onChange={e => setNewTranslation(e.target.value)}
                        className={styles.searchInput}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono, monospace)', color: '#432818', marginBottom: '0.2rem' }}>
                      Definition *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Present, appearing, or found everywhere."
                      value={newDef}
                      onChange={e => setNewDef(e.target.value)}
                      className={styles.searchInput}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono, monospace)', color: '#432818', marginBottom: '0.2rem' }}>
                      Contextual Usage / Evidence Sentence (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Cellular telephones have become ubiquitous in daily life."
                      value={newUsage}
                      onChange={e => setNewUsage(e.target.value)}
                      className={styles.searchInput}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button
                      type="button"
                      className={styles.tacticalBtn}
                      onClick={() => setShowAddDrawer(false)}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingWord}
                      className={`${styles.tacticalBtn} ${styles.tacticalBtnPrimary}`}>
                      {savingWord ? 'Logging Term...' : '✓ Log & Sync Term'}
                    </button>
                  </div>
                </form>
              )}

              {/* Grid of cards */}
              {words.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', fontFamily: 'var(--font-mono, monospace)' }}>
                  <span className={styles.stampBox} style={{ marginBottom: '1rem' }}>NO EVIDENCE RECORDS</span>
                  <p style={{ marginTop: '1rem', color: '#6A381F', fontSize: '0.9rem' }}>
                    Your lexical clipboard is empty. Solve clues in Tap the Clues or use "+ Log Evidence Term" above.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
                    gap: '1rem',
                  }}>
                  {filteredWords.map((item, idx) => (
                    <div key={idx} className={styles.wordCard}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <h3
                            style={{
                              fontFamily: 'var(--font-serif, serif)',
                              fontSize: '1.2rem',
                              fontWeight: 'bold',
                              color: '#2D0909',
                              margin: 0,
                            }}>
                            {item.word}
                          </h3>
                          {item.translation && (
                            <span
                              style={{
                                fontFamily: 'var(--font-mono, monospace)',
                                fontSize: '0.65rem',
                                background: '#C49A5A',
                                color: '#2D0909',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '2px',
                                fontWeight: 'bold',
                              }}>
                              {item.translation}
                            </span>
                          )}
                        </div>

                        <p style={{ fontSize: '0.82rem', lineHeight: '1.4', color: '#432818', marginBottom: '0.75rem' }}>
                          {item.definition}
                        </p>

                        {item.contextual_usage && (
                          <div
                            style={{
                              fontStyle: 'italic',
                              fontSize: '0.75rem',
                              color: '#6A381F',
                              borderLeft: '2px solid #C49A5A',
                              paddingLeft: '0.5rem',
                              marginBottom: '0.75rem',
                            }}>
                            "{item.contextual_usage}"
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderTop: '1px solid rgba(140, 90, 60, 0.25)',
                          paddingTop: '0.5rem',
                          marginTop: '0.5rem',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: '0.7rem',
                          color: '#8C5A3C',
                        }}>
                        <span>
                          Status:{' '}
                          {item.is_reviewed_today ? (
                            <strong style={{ color: '#2E6B3A' }}>Reviewed Today</strong>
                          ) : item.is_due_today !== false ? (
                            <strong style={{ color: '#8C5A3C' }}>Due for Review</strong>
                          ) : (
                            <span>Retained</span>
                          )}
                        </span>
                        <span>Reviews: {item.access_count || 1}x</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'flashcards' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Mode Toggle & Daily Status Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  maxWidth: '580px',
                  marginBottom: '1rem',
                }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => {
                      setDrillMode('daily')
                      setCurrentCardIndex(0)
                      setIsFlipped(false)
                    }}
                    style={{
                      padding: '0.3rem 0.75rem',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: '0.75rem',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      border: '1.5px solid #8C5A3C',
                      background: drillMode === 'daily' ? '#2D0909' : '#FFF8ED',
                      color: drillMode === 'daily' ? '#FFF8ED' : '#432818',
                      fontWeight: drillMode === 'daily' ? 'bold' : 'normal',
                    }}>
                    ⚡ Daily Due Drill ({words.filter(w => w.is_due_today !== false && !w.is_reviewed_today).length})
                  </button>
                  <button
                    onClick={() => {
                      setDrillMode('all')
                      setCurrentCardIndex(0)
                      setIsFlipped(false)
                    }}
                    style={{
                      padding: '0.3rem 0.75rem',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: '0.75rem',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      border: '1.5px solid #8C5A3C',
                      background: drillMode === 'all' ? '#2D0909' : '#FFF8ED',
                      color: drillMode === 'all' ? '#FFF8ED' : '#432818',
                      fontWeight: drillMode === 'all' ? 'bold' : 'normal',
                    }}>
                    📖 Practice All Cards ({words.length})
                  </button>
                </div>

                <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.72rem', color: '#6A381F' }}>
                  Daily Refresh: <strong>{formatCountdown(remainingSeconds)}</strong>
                </div>
              </div>

              {/* ── Daily Clearance Complete State ── */}
              {isDailyCompleted ? (
                <div className={styles.dailyCompleteBanner}>
                  <span className={styles.stampBoxSuccess} style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                    DAILY QUOTA CLEARED
                  </span>
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif, serif)',
                      fontSize: '1.75rem',
                      color: '#2D0909',
                      marginTop: '0.75rem',
                      marginBottom: '0.5rem',
                    }}>
                    🎉 All Evidence Terms Reviewed For Today!
                  </h3>
                  <p style={{ color: '#6A381F', fontSize: '0.88rem', maxWidth: '440px', margin: '0 auto 1.5rem' }}>
                    Excellent work, Agent. You have fulfilled your active spaced repetition quota.
                    New terms will refresh automatically at midnight.
                  </p>

                  <div
                    style={{
                      background: 'rgba(196, 154, 90, 0.2)',
                      border: '1px solid #C49A5A',
                      padding: '0.75rem',
                      borderRadius: '4px',
                      display: 'inline-block',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: '0.85rem',
                      color: '#2D0909',
                      marginBottom: '1.5rem',
                    }}>
                    ⏱️ Next Daily Refresh In: <strong>{formatCountdown(remainingSeconds)}</strong>
                  </div>

                  <div>
                    <button
                      className={`${styles.tacticalBtn} ${styles.tacticalBtnPrimary}`}
                      onClick={() => {
                        setDrillMode('all')
                        setCurrentCardIndex(0)
                        setIsFlipped(false)
                      }}>
                      📖 Free Practice ({words.length} Total Cards)
                    </button>
                  </div>
                </div>
              ) : currentWord ? (
                <>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: '0.75rem',
                      color: '#6A381F',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                    }}>
                    <span>
                      CASE DOSSIER #{currentCardIndex + 1} OF {activeDeck.length}
                    </span>
                    <span className={styles.stampBox} style={{ fontSize: '0.65rem' }}>
                      {isFlipped ? 'REVEALED' : 'TAP TO DECRYPT'}
                    </span>
                  </div>

                  {/* 3D Flip Card */}
                  <div className={styles.flashcardPerspective} style={{ width: '100%' }}>
                    <div
                      className={`${styles.flashcard} ${isFlipped ? styles.flashcardFlipped : ''}`}
                      onClick={() => setIsFlipped(!isFlipped)}>
                      {/* FRONT */}
                      <div className={styles.flashcardFace}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className={styles.headerBadge}>CLASSIFIED EVIDENCE</span>
                          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.75rem', color: '#8C5A3C' }}>
                            SPACE / CLICK TO FLIP
                          </span>
                        </div>

                        <div style={{ textAlign: 'center', margin: '2rem 0' }}>
                          <h2
                            style={{
                              fontSize: '2.5rem',
                              fontFamily: 'var(--font-serif, serif)',
                              fontWeight: 'bold',
                              color: '#2D0909',
                              letterSpacing: '0.04em',
                              marginBottom: '0.5rem',
                            }}>
                            {currentWord.word}
                          </h2>
                          {currentWord.translation && (
                            <p style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.9rem', color: '#8C5A3C' }}>
                              [ Translation / Sense: {currentWord.translation} ]
                            </p>
                          )}
                        </div>

                        <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.75rem', color: '#6A381F' }}>
                          (Click card or press spacebar to verify definition)
                        </div>
                      </div>

                      {/* BACK */}
                      <div className={`${styles.flashcardFace} ${styles.flashcardBack}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className={styles.headerBadge} style={{ background: '#2D0909', color: '#FFF8ED' }}>
                            VERIFIED DEFINITION
                          </span>
                          <span className={styles.stampBoxSuccess} style={{ fontSize: '0.65rem' }}>
                            CONFIRMED EVIDENCE
                          </span>
                        </div>

                        <div style={{ margin: '1.25rem 0' }}>
                          <h3
                            style={{
                              fontSize: '1.5rem',
                              fontFamily: 'var(--font-serif, serif)',
                              color: '#2D0909',
                              marginBottom: '0.5rem',
                            }}>
                            {currentWord.word}
                          </h3>
                          <p style={{ fontSize: '0.95rem', lineHeight: '1.5', color: '#432818', marginBottom: '1rem' }}>
                            {currentWord.definition}
                          </p>
                          {currentWord.contextual_usage && (
                            <div
                              style={{
                                background: 'rgba(196, 154, 90, 0.2)',
                                borderLeft: '3px solid #8C5A3C',
                                padding: '0.75rem',
                                fontSize: '0.85rem',
                                fontStyle: 'italic',
                                color: '#2D0909',
                              }}>
                              "{currentWord.contextual_usage}"
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '0.75rem',
                            color: '#8C5A3C',
                          }}>
                          <span>Reviewed: {currentWord.access_count || 1} times</span>
                          <span>Next Interval: +{Math.max(1, Math.round((currentWord.access_count || 1) * 2.5))} Days</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', width: '100%', maxWidth: '580px' }}>
                    <button
                      className={styles.tacticalBtn}
                      onClick={handlePrevCard}
                      style={{ flex: '1' }}>
                      ◀ Previous
                    </button>
                    <button
                      className={`${styles.tacticalBtn} ${styles.tacticalBtnSuccess}`}
                      onClick={() => handleRecordReview(currentWord.word)}
                      disabled={reviewing}
                      style={{ flex: '2' }}>
                      <span>✓</span> {reviewing ? 'Recording...' : 'Retained / Mastered (+10 XP)'}
                    </button>
                    <button
                      className={styles.tacticalBtn}
                      onClick={handleNextCard}
                      style={{ flex: '1' }}>
                      Next ▶
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', fontFamily: 'var(--font-mono, monospace)' }}>
                  <span className={styles.stampBox} style={{ marginBottom: '1rem' }}>NO DRILL CARDS</span>
                  <p style={{ marginTop: '1rem', color: '#6A381F', fontSize: '0.9rem' }}>
                    No terms are available in this mode. Add new terms in the Word Index tab.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* ── Retention Schedule Tab ── */
            <div>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.9rem', fontWeight: 'bold', color: '#2D0909', margin: 0 }}>
                    SPACED REPETITION TELEMETRY & DAILY QUEUE
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#6A381F', margin: '0.2rem 0 0 0' }}>
                    Cognitive retention timeline calculated by SuperMemo-2 intervals with midnight daily refreshes.
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={styles.stampBox}>ACTIVE RETENTION CYCLE</span>
                  <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.68rem', color: '#8C5A3C', marginTop: '0.2rem' }}>
                    Refresh In: {formatCountdown(remainingSeconds)}
                  </div>
                </div>
              </div>

              <table className={styles.retroTable}>
                <thead>
                  <tr>
                    <th>EVIDENCE WORD</th>
                    <th>TRANSLATION / SENSE</th>
                    <th>REVIEWS</th>
                    <th>INTERVAL</th>
                    <th>NEXT REVIEW ETA</th>
                    <th>DAILY STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {words.map((w, idx) => {
                    const days = Math.max(1, Math.round((w.access_count || 1) * 2.5))
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 'bold', color: '#2D0909' }}>{w.word}</td>
                        <td>{w.translation || '—'}</td>
                        <td>{w.access_count || 1} reviews</td>
                        <td>~{days} days</td>
                        <td style={{ color: '#6A381F' }}>
                          {w.next_review_date ? new Date(w.next_review_date).toLocaleDateString() : 'Pending'}
                        </td>
                        <td>
                          {w.is_reviewed_today ? (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '2px',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                background: '#E2F0D9',
                                color: '#2E6B3A',
                                border: '1px solid #2E6B3A',
                              }}>
                              ✓ REVIEWED TODAY
                            </span>
                          ) : w.is_due_today !== false ? (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '2px',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                background: '#FFF2CC',
                                color: '#8C5A3C',
                                border: '1px solid #8C5A3C',
                              }}>
                              ⚡ DUE TODAY
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '2px',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                background: '#F5E6CC',
                                color: '#6A381F',
                                border: '1px solid #C49A5A',
                              }}>
                              IN MEMORY CYCLE
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
