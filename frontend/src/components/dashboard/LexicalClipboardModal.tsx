'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import styles from './sidebar-modals.module.css'
import { apiFetch } from '@/lib/api'

export interface LexicalWord {
  word: string
  definition: string
  contextual_usage: string
  translation?: string
  next_review_date: string
  access_count: number
  is_starter?: boolean
}

interface LexicalClipboardModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function LexicalClipboardModal({ isOpen, onClose }: LexicalClipboardModalProps) {
  const [activeTab, setActiveTab] = useState<'index' | 'flashcards' | 'schedule'>('index')
  const [words, setWords] = useState<LexicalWord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [reviewing, setReviewing] = useState(false)

  // Fetch words on open
  const fetchDeck = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiFetch('/lexical/deck/')
      if (Array.isArray(data)) {
        setWords(data)
      }
    } catch (err) {
      console.error('Failed to load lexical deck:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchDeck()
      setIsFlipped(false)
      setCurrentCardIndex(0)
    }
  }, [isOpen, fetchDeck])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') onClose()
      if (activeTab === 'flashcards') {
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
  }, [isOpen, activeTab, isFlipped, currentCardIndex, words.length])

  // Filter words
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
    setCurrentCardIndex(prev => (prev + 1) % (words.length || 1))
  }

  const handlePrevCard = () => {
    setIsFlipped(false)
    setCurrentCardIndex(prev => (prev - 1 + words.length) % (words.length || 1))
  }

  const handleRecordReview = async (word: string) => {
    try {
      setReviewing(true)
      await apiFetch('/lexical/review/', {
        method: 'POST',
        body: JSON.stringify({ word }),
      })
      // Update local state access count
      setWords(prev =>
        prev.map(w => (w.word === word ? { ...w, access_count: (w.access_count || 1) + 1 } : w))
      )
      handleNextCard()
    } catch (err) {
      console.error('Failed to log review:', err)
      handleNextCard()
    } finally {
      setReviewing(false)
    }
  }

  if (!isOpen) return null

  const currentWord = words[currentCardIndex]

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.dossierContainer} onClick={e => e.stopPropagation()}>
        {/* ── Folder Header ── */}
        <div className={styles.folderHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.headerBadge}>DOSSIER // DECK</span>
            <h2 className={styles.headerTitle}>
              <span>📋</span> Lexical Clipboard
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className={styles.stampBox}>CONFIDENTIAL</span>
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
            ⚡ Flashcard Drill
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
              <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>📂 Retaining Evidence Files...</div>
              <p style={{ fontSize: '0.8rem', color: '#8C5A3C' }}>Decrypting student vocabulary records.</p>
            </div>
          ) : words.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', fontFamily: 'var(--font-mono, monospace)' }}>
              <span className={styles.stampBox} style={{ marginBottom: '1rem' }}>NO CASE RECORDS</span>
              <p style={{ marginTop: '1rem', color: '#6A381F', fontSize: '0.9rem' }}>
                Your lexical clipboard is currently unpopulated. Complete Tap the Clues or vocabulary exercises to log forensic evidence terms.
              </p>
            </div>
          ) : activeTab === 'index' ? (
            <div>
              {/* Search bar */}
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
                  onClick={() => {
                    setActiveTab('flashcards')
                    setIsFlipped(false)
                  }}>
                  ⚡ Drill Deck ({filteredWords.length})
                </button>
              </div>

              {/* Grid of cards */}
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
                      <span>Ref #{idx + 1}</span>
                      <span>Review: {item.access_count || 1}x</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'flashcards' && currentWord ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
                <span>CASE DOSSIER #{currentCardIndex + 1} OF {words.length}</span>
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
                          [ Translation: {currentWord.translation} ]
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
                        ARCHIVE CONFIRMED
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
                      <span>Next Interval: +{(currentWord.access_count || 1) * 2} Days</span>
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
                  <span>✓</span> {reviewing ? 'Recording...' : 'Retained / Mastered (Next)'}
                </button>
                <button
                  className={styles.tacticalBtn}
                  onClick={handleNextCard}
                  style={{ flex: '1' }}>
                  Next ▶
                </button>
              </div>
            </div>
          ) : (
            /* ── Retention Schedule Tab ── */
            <div>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.9rem', fontWeight: 'bold', color: '#2D0909', margin: 0 }}>
                    SPACED REPETITION TELEMETRY
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#6A381F', margin: '0.2rem 0 0 0' }}>
                    Automated cognitive reinforcement timeline calculated by SuperMemo-2 spaced intervals.
                  </p>
                </div>
                <span className={styles.stampBox}>ACTIVE SCHEDULE</span>
              </div>

              <table className={styles.retroTable}>
                <thead>
                  <tr>
                    <th>EVIDENCE WORD</th>
                    <th>TRANSLATION / SENSE</th>
                    <th>REVIEWS</th>
                    <th>INTERVAL</th>
                    <th>NEXT REVIEW ETA</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {words.map((w, idx) => {
                    const days = (w.access_count || 1) * 2.5
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 'bold', color: '#2D0909' }}>{w.word}</td>
                        <td>{w.translation || '—'}</td>
                        <td>{w.access_count || 1} reviews</td>
                        <td>~{Math.round(days)} days</td>
                        <td style={{ color: '#6A381F' }}>
                          {w.next_review_date ? new Date(w.next_review_date).toLocaleDateString() : 'Pending'}
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '2px',
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              background: (w.access_count || 1) >= 3 ? '#E2F0D9' : '#FFF2CC',
                              color: (w.access_count || 1) >= 3 ? '#2E6B3A' : '#8C5A3C',
                              border: `1px solid ${(w.access_count || 1) >= 3 ? '#2E6B3A' : '#8C5A3C'}`,
                            }}>
                            {(w.access_count || 1) >= 3 ? 'RETAINED' : 'IN REPETITION'}
                          </span>
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
