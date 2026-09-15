/**
 * Realtime Synchronization Engine for Critica
 * Facilitates instantaneous cross-tab, cross-window, and cross-component updates
 * for Lexical Evidence, Daily Flashcards, Streaks, and EXP progression.
 */

export interface LexicalWordSyncData {
  word: string
  definition?: string
  contextual_usage?: string
  translation?: string
  access_count?: number
  next_review_date?: string
  is_starter?: boolean
  is_due_today?: boolean
  is_reviewed_today?: boolean
}

export interface LexicalSyncPayload {
  action: 'word_logged' | 'word_reviewed' | 'daily_completed' | 'deck_refresh'
  wordData?: LexicalWordSyncData
  timestamp?: number
}

export interface ProgressionSyncPayload {
  action: 'streak_updated' | 'xp_awarded' | 'node_mastered' | 'daily_check_in'
  streak?: number
  streak_new_day?: boolean
  xp_awarded?: number
  total_xp?: number
  level?: number
  level_title?: string
  level_up?: boolean
  progress_pct?: number
  timestamp?: number
}

const LEXICAL_CHANNEL_NAME = 'critica_lexical_sync_channel'
const PROGRESSION_CHANNEL_NAME = 'critica_progression_sync_channel'

const LEXICAL_EVENT_NAME = 'critica_lexical_event'
const PROGRESSION_EVENT_NAME = 'critica_progression_event'

// BroadcastChannels (if supported by browser)
let lexicalChannel: BroadcastChannel | null = null
let progressionChannel: BroadcastChannel | null = null

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    lexicalChannel = new BroadcastChannel(LEXICAL_CHANNEL_NAME)
    progressionChannel = new BroadcastChannel(PROGRESSION_CHANNEL_NAME)
  } catch (e) {
    console.warn('BroadcastChannel not supported in this context, falling back to window events', e)
  }
}

/**
 * Emit a realtime Lexical event to all components and browser tabs
 */
export function notifyLexicalUpdated(payload: LexicalSyncPayload): void {
  if (typeof window === 'undefined') return
  const enriched = { ...payload, timestamp: Date.now() }

  // 1. Dispatch custom event for current window
  window.dispatchEvent(new CustomEvent(LEXICAL_EVENT_NAME, { detail: enriched }))

  // 2. Post to BroadcastChannel for other open tabs
  if (lexicalChannel) {
    try {
      lexicalChannel.postMessage(enriched)
    } catch { /* ignore channel post error */ }
  }
}

/**
 * Subscribe to realtime Lexical updates
 * Returns cleanup unsubscription function
 */
export function subscribeToLexicalUpdates(callback: (payload: LexicalSyncPayload) => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const handleWindowCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<LexicalSyncPayload>
    if (custom.detail) {
      callback(custom.detail)
    }
  }

  const handleBroadcastMessage = (event: MessageEvent<LexicalSyncPayload>) => {
    if (event.data) {
      callback(event.data)
    }
  }

  window.addEventListener(LEXICAL_EVENT_NAME, handleWindowCustomEvent)
  if (lexicalChannel) {
    lexicalChannel.addEventListener('message', handleBroadcastMessage)
  }

  return () => {
    window.removeEventListener(LEXICAL_EVENT_NAME, handleWindowCustomEvent)
    if (lexicalChannel) {
      lexicalChannel.removeEventListener('message', handleBroadcastMessage)
    }
  }
}

/**
 * Emit a realtime Progression event (Streak, XP, Level) to all components and tabs
 */
export function notifyProgressionUpdated(payload: ProgressionSyncPayload): void {
  if (typeof window === 'undefined') return
  const enriched = { ...payload, timestamp: Date.now() }

  // 1. Dispatch custom event for current window
  window.dispatchEvent(new CustomEvent(PROGRESSION_EVENT_NAME, { detail: enriched }))

  // 2. Post to BroadcastChannel for other open tabs
  if (progressionChannel) {
    try {
      progressionChannel.postMessage(enriched)
    } catch { /* ignore channel post error */ }
  }
}

/**
 * Subscribe to realtime Progression updates (Streak, XP, Level)
 * Returns cleanup unsubscription function
 */
export function subscribeToProgressionUpdates(callback: (payload: ProgressionSyncPayload) => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const handleWindowCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<ProgressionSyncPayload>
    if (custom.detail) {
      callback(custom.detail)
    }
  }

  const handleBroadcastMessage = (event: MessageEvent<ProgressionSyncPayload>) => {
    if (event.data) {
      callback(event.data)
    }
  }

  window.addEventListener(PROGRESSION_EVENT_NAME, handleWindowCustomEvent)
  if (progressionChannel) {
    progressionChannel.addEventListener('message', handleBroadcastMessage)
  }

  return () => {
    window.removeEventListener(PROGRESSION_EVENT_NAME, handleWindowCustomEvent)
    if (progressionChannel) {
      progressionChannel.removeEventListener('message', handleBroadcastMessage)
    }
  }
}
