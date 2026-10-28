'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter }           from 'next/navigation'
import { apiFetch }            from '@/lib/api'
import { isInductionPending, markInductionComplete, shouldAutoOpenInduction } from '@/lib/induction'
import TourGuide, { hasSeenDashboardTour } from '@/components/TourGuide'
import { MODULE_TITLES } from '@/lib/modules'
import LexicalClipboardModal   from './LexicalClipboardModal'
import QuickReviewModal       from './QuickReviewModal'
import MetricLogModal         from './MetricLogModal'
import ProfileSettingsModal   from './ProfileSettingsModal'
import ThemeMusicPlayer       from './ThemeMusicPlayer'
import SettingsModal          from '@/components/SettingsModal'
import { playClickSound }     from '@/lib/sound-effects'
import desk                   from './desk.module.css'
import CaseLoadingLobby       from '@/components/shared/CaseLoadingLobby'
import {
  subscribeToProgressionUpdates,
  subscribeToLexicalUpdates,
} from '@/lib/realtime-sync'
import InspectorCrit          from '@/components/brand/InspectorCrit'
import {
  Activity, CircleCheck, Clipboard, Crosshair, DoorOpen, FileText, Flame,
  FolderOpen, Lock, Network, Paperclip, Pin, Puzzle, RotateCcw,
  ScanSearch, Search, Settings, ShieldAlert, Sparkles, UserRound, Zap, type LucideIcon,
} from 'lucide-react'

interface NodeStatus {
  node_id: string
  status:  'locked' | 'unlocked' | 'completed'
}
interface ModuleStatus {
  module_unlocked: boolean
  nodes:           NodeStatus[]
}
interface DashboardData {
  student_id?:     string
  username:        string
  first_name:      string
  last_name:       string
  streak:          number
  total_xp?:       number
  level?:          number
  rank_title?:     string
  next_level_xp?:  number
  level_progress_pct?: number
  completed_count: number
  onboarding_completed?: boolean
  profile_picture?: string
  module_status: {
    logic_thread:  ModuleStatus
    snap_gap:      ModuleStatus
    tap_clues:     ModuleStatus
    fact_scanner:  ModuleStatus
  }
}

// ── Node content ────────────────────────────────
const NODE_META: Record<string, {
  title: string
  focus: string
  level?: string
  type?:  string
}> = {
  // ── LOGIC THREAD — NARRATION ───────────────
  log_node_01: {
    title: 'Narration — Basics',
    focus: 'Identify simple time-order signals',
    level: 'BASICS', type: 'NARRATION',
  },
  log_node_02: {
    title: 'Narration — Intermediate',
    focus: 'Sequence events using multiple time markers',
    level: 'INTERMEDIATE', type: 'NARRATION',
  },
  log_node_03: {
    title: 'Narration — Advanced',
    focus: 'Map complex chronological narrative development',
    level: 'ADVANCED', type: 'NARRATION',
  },
  // ── LOGIC THREAD — DEFINITION ─────────────
  log_node_04: {
    title: 'Definition — Basics',
    focus: 'Identify a simple three-part definition',
    level: 'BASICS', type: 'DEFINITION',
  },
  log_node_05: {
    title: 'Definition — Intermediate',
    focus: 'Map a multi-part definition with characteristics',
    level: 'INTERMEDIATE', type: 'DEFINITION',
  },
  log_node_06: {
    title: 'Definition — Advanced',
    focus: 'Map a full academic definition with examples',
    level: 'ADVANCED', type: 'DEFINITION',
  },
  // ── LOGIC THREAD — COMPARISON ─────────────
  log_node_07: {
    title: 'Comparison & Contrast — Basics',
    focus: 'Identify simple similarity and difference signals',
    level: 'BASICS', type: 'COMPARISON',
  },
  log_node_08: {
    title: 'Comparison & Contrast — Intermediate',
    focus: 'Map a four-part compare and contrast structure',
    level: 'INTERMEDIATE', type: 'COMPARISON',
  },
  log_node_09: {
    title: 'Comparison & Contrast — Advanced',
    focus: 'Map a complex multi-criteria comparison text',
    level: 'ADVANCED', type: 'COMPARISON',
  },
  // ── LOGIC THREAD — CAUSE & EFFECT ─────────
  log_node_10: {
    title: 'Cause & Effect — Basics',
    focus: 'Identify a simple cause and its direct effect',
    level: 'BASICS', type: 'CAUSE-EFFECT',
  },
  log_node_11: {
    title: 'Cause & Effect — Intermediate',
    focus: 'Map a chained cause-effect academic argument',
    level: 'INTERMEDIATE', type: 'CAUSE-EFFECT',
  },
  log_node_12: {
    title: 'Cause & Effect — Advanced',
    focus: 'Map complex cascading cause-effect relationships',
    level: 'ADVANCED', type: 'CAUSE-EFFECT',
  },
  // ── SNAP-IN GAP — ADDITION ────────────────
  snp_node_01: {
    title: 'Addition & Sequence — Basics',
    focus: 'Identify the simplest addition transition',
    level: 'BASICS', type: 'ADDITION',
  },
  snp_node_02: {
    title: 'Addition & Sequence — Intermediate',
    focus: 'Use addition and sequence in two-pair context',
    level: 'INTERMEDIATE', type: 'ADDITION',
  },
  snp_node_03: {
    title: 'Addition & Sequence — Advanced',
    focus: 'Apply complex addition transitions academically',
    level: 'ADVANCED', type: 'ADDITION',
  },
  // ── SNAP-IN GAP — CONTRAST ────────────────
  snp_node_04: {
    title: 'Contrast & Opposition — Basics',
    focus: 'Identify the most basic contrast transition',
    level: 'BASICS', type: 'CONTRAST',
  },
  snp_node_05: {
    title: 'Contrast & Opposition — Intermediate',
    focus: 'Use contrast transitions in two-pair context',
    level: 'INTERMEDIATE', type: 'CONTRAST',
  },
  snp_node_06: {
    title: 'Contrast & Opposition — Advanced',
    focus: 'Apply nuanced contrast in academic arguments',
    level: 'ADVANCED', type: 'CONTRAST',
  },
  // ── SNAP-IN GAP — CAUSE & EFFECT ──────────
  snp_node_07: {
    title: 'Cause & Effect — Basics',
    focus: 'Identify the simplest cause-effect transition',
    level: 'BASICS', type: 'CAUSE-EFFECT',
  },
  snp_node_08: {
    title: 'Cause & Effect — Intermediate',
    focus: 'Distinguish between two cause-effect signals',
    level: 'INTERMEDIATE', type: 'CAUSE-EFFECT',
  },
  snp_node_09: {
    title: 'Cause & Effect — Advanced',
    focus: 'Apply cause-effect transitions academically',
    level: 'ADVANCED', type: 'CAUSE-EFFECT',
  },
  // ── SNAP-IN GAP — CONCLUSION ──────────────
  snp_node_10: {
    title: 'Conclusion Signals — Basics',
    focus: 'Identify the simplest conclusion transition',
    level: 'BASICS', type: 'CONCLUSION',
  },
  snp_node_11: {
    title: 'Conclusion Signals — Intermediate',
    focus: 'Apply two different conclusion transitions',
    level: 'INTERMEDIATE', type: 'CONCLUSION',
  },
  snp_node_12: {
    title: 'Conclusion Signals — Advanced',
    focus: 'Apply advanced conclusion signals academically',
    level: 'ADVANCED', type: 'CONCLUSION',
  },
  // ── TAP THE CLUES — SYNONYM ───────────────
  tap_node_01: {
    title: 'Synonym Clues — Basics',
    focus: 'Find one synonym clue right beside the word',
    level: 'BASICS', type: 'SYNONYM',
  },
  tap_node_02: {
    title: 'Synonym Clues — Intermediate',
    focus: 'Find two synonym clues in context',
    level: 'INTERMEDIATE', type: 'SYNONYM',
  },
  tap_node_03: {
    title: 'Synonym Clues — Advanced',
    focus: 'Unlock two words using synonym clues',
    level: 'ADVANCED', type: 'SYNONYM',
  },
  // ── TAP THE CLUES — DEFINITION ────────────
  tap_node_04: {
    title: 'Definition Clues — Basics',
    focus: 'Spot a single embedded definition clue',
    level: 'BASICS', type: 'DEFINITION',
  },
  tap_node_05: {
    title: 'Definition Clues — Intermediate',
    focus: 'Find two definition clue words in context',
    level: 'INTERMEDIATE', type: 'DEFINITION',
  },
  tap_node_06: {
    title: 'Definition Clues — Advanced',
    focus: 'Unlock two words using definition clues',
    level: 'ADVANCED', type: 'DEFINITION',
  },
  // ── TAP THE CLUES — ANTONYM ───────────────
  tap_node_07: {
    title: 'Antonym & Contrast Clues — Basics',
    focus: 'Find one antonym clue near the word',
    level: 'BASICS', type: 'ANTONYM',
  },
  tap_node_08: {
    title: 'Antonym & Contrast Clues — Intermediate',
    focus: 'Find two antonym clues in academic context',
    level: 'INTERMEDIATE', type: 'ANTONYM',
  },
  tap_node_09: {
    title: 'Antonym & Contrast Clues — Advanced',
    focus: 'Unlock two words using antonym clues',
    level: 'ADVANCED', type: 'ANTONYM',
  },
  // ── TAP THE CLUES — EXAMPLE/INFERENCE ─────
  tap_node_10: {
    title: 'Example & Inference Clues — Basics',
    focus: 'Infer word meaning from one nearby example',
    level: 'BASICS', type: 'INFERENCE',
  },
  tap_node_11: {
    title: 'Example & Inference Clues — Intermediate',
    focus: 'Infer meaning from two example clues',
    level: 'INTERMEDIATE', type: 'INFERENCE',
  },
  tap_node_12: {
    title: 'Example & Inference Clues — Advanced',
    focus: 'Unlock two words using inference clues',
    level: 'ADVANCED', type: 'INFERENCE',
  },
  // ── FACT SCANNER — CURRENCY ───────────────
  fac_node_01: {
    title: 'Currency — Basics',
    focus: 'Spot a very obviously outdated source',
    level: 'BASICS', type: 'CURRENCY',
  },
  fac_node_02: {
    title: 'Currency — Intermediate',
    focus: 'Identify a moderately outdated source',
    level: 'INTERMEDIATE', type: 'CURRENCY',
  },
  fac_node_03: {
    title: 'Currency — Advanced',
    focus: 'Detect a subtly outdated claim',
    level: 'ADVANCED', type: 'CURRENCY',
  },
  // ── FACT SCANNER — RELEVANCE ──────────────
  fac_node_04: {
    title: 'Relevance — Basics',
    focus: 'Spot a completely off-topic sentence',
    level: 'BASICS', type: 'RELEVANCE',
  },
  fac_node_05: {
    title: 'Relevance — Intermediate',
    focus: 'Identify a moderately off-topic sentence',
    level: 'INTERMEDIATE', type: 'RELEVANCE',
  },
  fac_node_06: {
    title: 'Relevance — Advanced',
    focus: 'Detect a subtly irrelevant sentence',
    level: 'ADVANCED', type: 'RELEVANCE',
  },
  // ── FACT SCANNER — AUTHORITY ──────────────
  fac_node_07: {
    title: 'Authority — Basics',
    focus: 'Spot an obviously unverified claim',
    level: 'BASICS', type: 'AUTHORITY',
  },
  fac_node_08: {
    title: 'Authority — Intermediate',
    focus: 'Identify a moderately unverified source',
    level: 'INTERMEDIATE', type: 'AUTHORITY',
  },
  fac_node_09: {
    title: 'Authority — Advanced',
    focus: 'Detect a subtly unqualified claim',
    level: 'ADVANCED', type: 'AUTHORITY',
  },
  // ── FACT SCANNER — ACCURACY ───────────────
  fac_node_10: {
    title: 'Accuracy — Basics',
    focus: 'Spot a wildly inaccurate claim',
    level: 'BASICS', type: 'ACCURACY',
  },
  fac_node_11: {
    title: 'Accuracy — Intermediate',
    focus: 'Identify a moderately inaccurate claim',
    level: 'INTERMEDIATE', type: 'ACCURACY',
  },
  fac_node_12: {
    title: 'Accuracy — Advanced',
    focus: 'Detect a subtly fabricated statistic',
    level: 'ADVANCED', type: 'ACCURACY',
  },
  // ── FACT SCANNER — PURPOSE ────────────────
  fac_node_13: {
    title: 'Purpose — Basics',
    focus: 'Spot overtly biased or insulting language',
    level: 'BASICS', type: 'PURPOSE',
  },
  fac_node_14: {
    title: 'Purpose — Intermediate',
    focus: 'Identify moderately biased framing',
    level: 'INTERMEDIATE', type: 'PURPOSE',
  },
  fac_node_15: {
    title: 'Purpose — Advanced',
    focus: 'Detect subtly manipulative academic language',
    level: 'ADVANCED', type: 'PURPOSE',
  },
}

// ── Tabs ─────────────────────────────────────────
// All tabs are always clickable.
// Node lock state is shown on the card,
// not on the tab itself.
const TABS = [
  {
    id:         'logic_thread',
    label:      `[1] CASE 01: ${MODULE_TITLES.logic_thread.toUpperCase()}`,
    route_base: '/nodes/logic-thread',
    header:     MODULE_TITLES.logic_thread.toUpperCase(),
    note:       'Follow the signal words — they always point to the culprit.',
  },
  {
    id:         'snap_gap',
    label:      `[2] CASE 02: ${MODULE_TITLES.snap_gap.toUpperCase()}`,
    route_base: '/nodes/snap-gap',
    header:     MODULE_TITLES.snap_gap.toUpperCase(),
    note:       'Bridge the missing evidence gaps to rebuild the sequence of events.',
  },
  {
    id:         'tap_clues',
    label:      `[3] CASE 03: ${MODULE_TITLES.tap_clues.toUpperCase()}`,
    route_base: '/nodes/tap-clues',
    header:     MODULE_TITLES.tap_clues.toUpperCase(),
    note:       "Scan for key facts — don't let red herrings distract you.",
  },
  {
    id:         'fact_scanner',
    label:      `[4] CASE 04: ${MODULE_TITLES.fact_scanner.toUpperCase()}`,
    route_base: '/nodes/fact-scanner',
    header:     MODULE_TITLES.fact_scanner.toUpperCase(),
    note:       'Cross-examine every statement with cold, hard evidence.',
  },
]

// Typewriter accent font (Courier Prime is loaded in globals.css)
const TYPE = "font-['Courier_Prime',ui-monospace,monospace]"

// Top-bar stat badge: slate glass container with consistent padding
const TOPBAR_BADGE =
  'inline-flex items-center gap-1.5 h-8 py-1 px-2.5 rounded-md font-mono text-xs whitespace-nowrap flex-shrink-0 ' +
  'border border-[rgba(255,255,255,0.12)] bg-white/[0.04] transition-all'

// Folder-tab colours by tab index (manila / amber / khaki / sage)
const TAB_COLORS = [
  'bg-[#E8CF8E]',
  'bg-[#D9A441]',
  'bg-[#BFB07A]',
  'bg-[#8FA37A]',
]

// Pencil scribbles & doodles for the lower (empty, lined) part of each
// case-tool index card. Purely decorative; variant = card index.
function CaseScribbles({ variant }: { variant: number }) {
  const pen = { stroke: 'currentColor', strokeWidth: 1.2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg
      className={`${desk.scribble} absolute left-3 right-3 bottom-1.5 h-[42px]`}
      viewBox="0 0 212 42"
      preserveAspectRatio="xMinYMid meet"
      aria-hidden>
      {variant === 0 && (
        <>
          <text x="4" y="16" fontSize="11" fill="currentColor" transform="rotate(-3 4 16)">ubiquitous = everywhere??</text>
          <path {...pen} d="M8 30 q 20 6 44 -2 t 40 2" />
          <text x="98" y="36" fontSize="10" fill="currentColor" transform="rotate(2 98 36)">ctx clue</text>
          <ellipse {...pen} cx="120" cy="32" rx="26" ry="8" transform="rotate(-5 120 32)" />
          {/* magnifying glass */}
          <circle {...pen} cx="172" cy="17" r="8" />
          <path {...pen} d="M178 23 l9 9" strokeWidth={2} />
          <text x="194" y="16" fontSize="13" fill="currentColor">?</text>
        </>
      )}
      {variant === 1 && (
        <>
          <text x="4" y="15" fontSize="11" fill="currentColor" transform="rotate(-2 4 15)">drill #3 — 4/5 → retry!</text>
          {/* crossed-out wrong answer */}
          <text x="6" y="35" fontSize="10" fill="currentColor">furthermore</text>
          <path {...pen} d="M4 31 l62 -1" />
          {/* faint arrow pathway */}
          <path {...pen} d="M72 32 q 18 -14 38 -2 t 30 -6" strokeDasharray="3 3" />
          <path {...pen} d="M136 21 l5 3 -6 3" />
          <text x="146" y="31" fontSize="11" fill="currentColor">however!</text>
          {/* tiny stars */}
          <path {...pen} d="M168 8 l2 5 5 0 -4 3 2 5 -5 -3 -5 3 2 -5 -4 -3 5 0z" strokeWidth={1} />
          <path {...pen} d="M196 12 l1 3 3 0 -2 2 1 3 -3 -2 -3 2 1 -3 -2 -2 3 0z" strokeWidth={1} />
          {/* X marks */}
          <path {...pen} d="M144 4 l6 6 M150 4 l-6 6" />
        </>
      )}
      {variant === 2 && (
        <>
          <text x="4" y="14" fontSize="11" fill="currentColor" transform="rotate(-2 4 14)">acc ↑ 72%?? hints…</text>
          {/* interconnected suspect circles */}
          <circle {...pen} cx="16" cy="31" r="7" />
          <circle {...pen} cx="52" cy="27" r="6" />
          <circle {...pen} cx="84" cy="34" r="6" />
          <path {...pen} d="M23 30 L46 28 M57 30 L78 33 M20 25 q 30 -18 60 3" strokeDasharray="2 2" />
          <text x="49" y="30" fontSize="7" fill="currentColor">A</text>
          {/* little trend squiggle */}
          <path {...pen} d="M104 36 l10 -6 8 4 10 -12 9 5 12 -14" />
          <path {...pen} d="M150 13 l4 -1 -1 4" />
          <text x="166" y="34" fontSize="14" fill="currentColor" transform="rotate(8 166 34)">?</text>
          <path {...pen} d="M184 26 l7 7 M191 26 l-7 7" />
        </>
      )}
    </svg>
  )
}

// Gamemode icons (tabs + node card badges)
const MODULE_ICONS: Record<string, LucideIcon> = {
  logic_thread: Network,
  snap_gap:     Puzzle,
  tap_clues:    Search,
  fact_scanner: ScanSearch,
}

// ── Component ────────────────────────────────────
export default function StudentDashboard() {
  const router = useRouter()

  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null)
  const [activeTab, setActiveTab] =
    useState('logic_thread')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [showMenu, setShowMenu]   = useState(false)
  const [showLexicalModal, setShowLexicalModal] = useState(false)
  const [showQuickReviewModal, setShowQuickReviewModal] = useState(false)
  const [showMetricLogModal, setShowMetricLogModal] = useState(false)
  const [showProfileModal, setShowProfileModal]     = useState(false)
  const [streakPulse, setStreakPulse] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | 'BASICS' | 'INTERMEDIATE' | 'ADVANCED'>('ALL')
  const [topicFilter, setTopicFilter] = useState<string>('ALL')

  // Reset topic filter whenever switching discipline tabs
  useEffect(() => {
    setTopicFilter('ALL')
  }, [activeTab])

  // ── Fetch dashboard ───────────────────────
  const fetchDashboard = useCallback(async () => {
    try {
      const d = await apiFetch('/progression/dashboard/')
      setDashboard(d)

      // Inspector Crit's tour starts by itself on the first sign-in after registration
      // (or when neither the profile nor this browser recorded the induction)
      const studentId = d?.student_id || 'user'
      if (d && shouldAutoOpenInduction(studentId, d.onboarding_completed)
          && (isInductionPending() || !hasSeenDashboardTour())) {
        setShowTour(true)
      }
    } catch (e: unknown) {
      const err = e as { code?: string; detail?: string | { code?: string; detail?: string }; status?: number }
      const code =
        err?.code ?? (typeof err?.detail === 'object' ? err?.detail?.code : '') ?? ''
      const detail =
        typeof err?.detail === 'string'
          ? err.detail
          : (typeof err?.detail === 'object' ? err?.detail?.detail : '') ?? ''

      const isAuthError =
        err?.status === 401 ||
        code === 'token_not_valid' ||
        detail.includes('token') ||
        detail.includes('expired')

      if (isAuthError) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        router.push('/auth')
      } else {
        setError('Could not load dashboard.')
      }
    }
  }, [router])

  useEffect(() => {
    fetchDashboard().finally(() => setLoading(false))

    // Daily streak check-in on dashboard visit
    apiFetch('/progression/streak/check-in/', { method: 'POST' })
      .then(res => {
        if (res && res.streak !== undefined) {
          setDashboard(prev =>
            prev
              ? {
                  ...prev,
                  streak: res.streak,
                  total_xp: res.total_xp,
                  level: res.level,
                  rank_title: res.level_title,
                  level_progress_pct: res.progress_pct,
                }
              : null
          )
          if (res.new_day) {
            setStreakPulse(true)
            setTimeout(() => setStreakPulse(false), 1500)
          }
        }
      })
      .catch(() => { /* silent check-in fail */ })
  }, [fetchDashboard])

  // ── Realtime Synchronization Listeners ──────────────
  useEffect(() => {
    const unsubProgression = subscribeToProgressionUpdates(payload => {
      setDashboard(prev => {
        if (!prev) return prev
        const updated = { ...prev }
        if (payload.streak !== undefined) updated.streak = payload.streak
        if (payload.total_xp !== undefined) updated.total_xp = payload.total_xp
        if (payload.level !== undefined) updated.level = payload.level
        if (payload.level_title !== undefined) updated.rank_title = payload.level_title
        if (payload.progress_pct !== undefined) updated.level_progress_pct = payload.progress_pct
        return updated
      })
      if (payload.streak !== undefined || payload.action === 'streak_updated') {
        setStreakPulse(true)
        setTimeout(() => setStreakPulse(false), 1500)
      }
      if (payload.action === 'node_mastered') {
        fetchDashboard()
      }
    })

    const unsubLexical = subscribeToLexicalUpdates(payload => {
      if (payload.action === 'word_reviewed' || payload.action === 'word_logged') {
        fetchDashboard()
      }
    })

    return () => {
      unsubProgression()
      unsubLexical()
    }
  }, [fetchDashboard])

  // ── Logout ────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    router.push('/auth')
  }

  // ── Route to node ─────────────────────────
  const handleStartNode = (
    route_base: string,
    node_id:    string,
    nodeStatus: string,
  ) => {
    if (nodeStatus === 'locked') return
    router.push(`${route_base}/${node_id}`)
  }

  // ── Reset node ────────────────────────────
  const handleResetNode = async (nodeId: string) => {
    let moduleKey = ''
    if (nodeId.startsWith('log_')) moduleKey = 'logic_thread'
    else if (nodeId.startsWith('snp_')) moduleKey = 'snap_gap'
    else if (nodeId.startsWith('tap_')) moduleKey = 'tap_clues'
    else if (nodeId.startsWith('fac_')) moduleKey = 'fact_scanner'

    if (!moduleKey) return

    localStorage.removeItem(`critica_session__${moduleKey}__${nodeId}`)

    try {
      await apiFetch('/progression/reset/', {
        method: 'POST',
        body: JSON.stringify({ node_id: nodeId }),
      })
      await fetchDashboard()
    } catch {
      console.warn('Failed to reset node on backend')
      await fetchDashboard()
    }
  }

  // ── Get node progress percentage ──────────
  const getNodeProgress = (nodeId: string): number => {
    if (!dashboard) return 0
    const activeNodes = getActiveNodes()
    const found = activeNodes.find(n => n.node_id === nodeId)
    if (found?.status === 'completed') {
      return 100
    }

    let moduleKey = ''
    if (nodeId.startsWith('log_')) moduleKey = 'logic_thread'
    else if (nodeId.startsWith('snp_')) moduleKey = 'snap_gap'
    else if (nodeId.startsWith('tap_')) moduleKey = 'tap_clues'
    else if (nodeId.startsWith('fac_')) moduleKey = 'fact_scanner'

    if (!moduleKey) return 0

    try {
      const raw = localStorage.getItem(`critica_session__${moduleKey}__${nodeId}`)
      if (raw) {
        const data = JSON.parse(raw)
        const qIndex = data.questionIndex ?? 0
        const queueLen = data.sessionQueue?.length ?? 5
        if (queueLen > 0) {
          return Math.round((qIndex / queueLen) * 100)
        }
      }
    } catch { /* ignore */ }
    return 0
  }

  // ── Get nodes for active tab ──────────────
  const getActiveNodes = (): NodeStatus[] => {
    if (!dashboard) return []
    const mod = dashboard.module_status[
      activeTab as keyof
        typeof dashboard.module_status
    ]
    return mod?.nodes ?? []
  }

  const activeNodes = getActiveNodes()
  const ActiveModuleIcon = MODULE_ICONS[activeTab] ?? Network
  const activeTabCfg =
    TABS.find(t => t.id === activeTab) ?? TABS[0]

  // Extract distinct topics available in the current active discipline (Hook called unconditionally)
  const availableTopics = useMemo(() => {
    const topics = new Set<string>()
    for (const node of activeNodes) {
      const meta = NODE_META[node.node_id]
      if (meta?.type) topics.add(meta.type)
    }
    return Array.from(topics)
  }, [activeNodes])

  // Filter exhibits based on selected topic and difficulty (Hook called unconditionally)
  const displayedNodes = useMemo(() => {
    return activeNodes.filter(node => {
      const meta = NODE_META[node.node_id]
      if (!meta) return false
      if (difficultyFilter !== 'ALL' && meta.level !== difficultyFilter) return false
      if (topicFilter !== 'ALL' && meta.type !== topicFilter) return false
      return true
    })
  }, [activeNodes, difficultyFilter, topicFilter])

  // Index of the first open (unlocked, not completed) exhibit among displayed nodes
  const firstOpenIdx = displayedNodes.findIndex(n => n.status === 'unlocked')

  // ── Loading state ─────────────────────────
  if (loading) return (
    <CaseLoadingLobby
      moduleKey="logic_thread"
      title="DETECTIVE BUREAU HEADQUARTERS"
      subtitle="Accessing forensic student records & evidence dossiers…"
      steps={[
        'Decrypting agent dossier & clearance credentials...',
        'Retrieving forensic competency records...',
        'Calibrating reading diagnostic telemetry...',
        'Opening investigation bureau...',
      ]}
    />
  )

  // ── Error state ───────────────────────────
  if (error) return (
    <div
      className={`${desk.desk} min-h-screen flex items-center justify-center font-mono text-red-400 text-sm flex-col gap-4`}>
      <p>{error}</p>
      <button
        onClick={() => router.push('/auth')}
        className="border border-[#BEA791] px-4 py-2
          text-xs text-[#D4B896] hover:text-[#FFF8ED]
          hover:border-[#BEA791] transition-colors">
        Go to Login
      </button>
    </div>
  )

  return (
    <div
      data-dashboard
      className={`${desk.desk} h-screen overflow-hidden flex flex-col text-[var(--parchment)] font-serif`}>
      <div className={desk.vignette} aria-hidden />
      <div className={desk.lamp} aria-hidden />

      {/* ── TOPBAR: brand | stats | profile, always one line ── */}
      <header className="relative z-30 flex-shrink-0 w-full h-12 px-4 overflow-visible
        flex items-center justify-between gap-4
        bg-[rgba(20,24,28,0.95)] backdrop-blur-[8px] border-b border-[rgba(255,255,255,0.08)]
        shadow-[0_6px_18px_rgba(0,0,0,0.45)]">

        {/* ── LEFT: mascot + brand ── */}
        <div
          data-tour="brand-logo"
          className={`${TYPE} flex items-center gap-2 flex-shrink-0 whitespace-nowrap text-[15px] font-bold tracking-[0.16em] text-[var(--parchment)]`}>
          {/* Mascot logo — Inspector Crit, inline with the wordmark */}
          <InspectorCrit
            height={34}
            className="flex-shrink-0 drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]"
            priority
          />
          <Crosshair size={15} className="flex-shrink-0 text-[var(--crimson)]" aria-hidden />
          CRITICA
          <span className="hidden lg:inline font-normal text-[11px] tracking-[0.05em] text-[#b9a98d]">
            {'// FORENSIC INVESTIGATION BUREAU'}
          </span>
        </div>

        {/* ── CENTER: stat badges ── */}
        <div className="flex flex-1 min-w-0 items-center justify-center gap-3 whitespace-nowrap">
          <div data-tour="cadet-stats" className="flex items-center gap-3">
          {/* ── REALTIME STREAK ── */}
          <div
            className={`${TOPBAR_BADGE} duration-300 ${
              streakPulse ? 'scale-110 text-[var(--amber)] font-bold border-[var(--amber)]/60' : 'text-[#e3d6bd]'
            }`}
            title="Daily Active Streak (Updated in Realtime)">
            <Flame size={14} className={`text-[var(--amber)] ${streakPulse ? 'animate-bounce' : ''}`} aria-hidden />
            Streak: <strong className="text-[var(--parchment)]">{dashboard?.streak ?? 0}</strong> Days
          </div>

          {/* ── CASES CLOSED ── */}
          <div className={`${TOPBAR_BADGE} text-[#e3d6bd]`} title="Cases closed">
            <CircleCheck size={14} className="text-[#d04a4b]" aria-hidden />
            Cases closed: <strong className="text-[var(--parchment)]">{dashboard?.completed_count ?? 0}</strong>
          </div>

          {/* ── REALTIME EXP & LEVEL PILL ── */}
          <button
            onClick={() => {
              playClickSound()
              setShowMetricLogModal(true)
            }}
            className={`${TOPBAR_BADGE} text-[var(--parchment)] hover:border-[var(--lime)]/70 cursor-pointer`}
            title="View Experience Dossier & Diagnostic Metrics (Metric Log)">
            <Zap size={14} className="text-[var(--amber)]" aria-hidden />
            <span>LVL {dashboard?.level ?? 1} – {dashboard?.total_xp ?? 0} XP</span>
            <span className="block w-[72px] h-1.5 flex-shrink-0 bg-black/40 rounded-full overflow-hidden">
              <span
                className="block h-full rounded-full bg-[var(--lime)] transition-all duration-500"
                style={{ width: `${dashboard?.level_progress_pct ?? 0}%` }}
              />
            </span>
          </button>
          </div>

          {/* Theme music keeps playing; its controls live in Settings (profile menu) */}
          <ThemeMusicPlayer headless />
        </div>

        {/* ── RIGHT: user profile (mascot avatar) ── */}
        <button
          data-tour="user-profile"
          onClick={() => setShowMenu(!showMenu)}
          aria-expanded={showMenu}
          aria-haspopup="menu"
          className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap font-mono text-xs text-[var(--parchment)]
            hover:text-white cursor-pointer transition-colors">
          <span className="w-8 h-8 flex-shrink-0 rounded-full bg-[var(--parchment)] border-2 border-[var(--lime)] overflow-hidden flex items-center justify-center">
            {dashboard?.profile_picture && dashboard.profile_picture !== 'default' ? (
              <img
                src={dashboard.profile_picture}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <InspectorCrit height={26} decorative />
            )}
          </span>
          <span className="max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap">
            {dashboard?.first_name && dashboard?.last_name
              ? `${dashboard.first_name} ${dashboard.last_name}`
              : (dashboard?.username ?? 'Student')}
          </span>
        </button>
      </header>

      {/* User menu lives outside the header (which clips overflow) */}
      {showMenu && (
        <div
          role="menu"
          className={`${desk.indexCard} fixed top-[52px] right-4 rounded-sm z-50 min-w-[200px] overflow-hidden`}>
          <button
            role="menuitem"
            onClick={() => {
              setShowMenu(false)
              playClickSound()
              setShowProfileModal(true)
            }}
            className="w-full text-left px-4 py-2.5 text-xs font-mono text-[var(--ink)]
              hover:bg-[var(--manila)]/60 transition-colors flex items-center gap-2">
            <UserRound size={14} aria-hidden /> Cadet Profile
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setShowMenu(false)
              playClickSound()
              setShowSettings(true)
            }}
            className="w-full text-left px-4 py-2 text-xs font-mono text-[var(--ink)]
              hover:bg-[var(--manila)]/60 transition-colors flex items-center gap-2 border-b border-[#bea791]/35">
            <Settings size={14} aria-hidden /> Settings
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setShowMenu(false)
              setShowTour(true)
            }}
            className="w-full text-left px-4 py-2 text-xs font-mono text-[var(--ink)]
              hover:bg-[var(--manila)]/60 transition-colors flex items-center gap-2">
            <Search size={14} aria-hidden /> Tour with Inspector Crit
          </button>
          <button
            role="menuitem"
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-xs font-mono text-[var(--crimson)]
              hover:bg-[var(--manila)]/60 transition-colors flex items-center gap-2">
            <DoorOpen size={14} aria-hidden /> Logout
          </button>
        </div>
      )}

      {/* ── SPACER ── */}
      <div className="h-6 flex-shrink-0" />

      {/* ── BODY ── */}
      <div className="flex-1 min-h-0 flex justify-center px-10 2xl:px-16 pb-6
        bg-transparent">

        {/* ── CENTER CONTAINER ── */}
        <div className="relative w-full max-w-[min(1600px,86vw)] h-[calc(100vh-120px)] flex items-start gap-6">

          {/* Forensic red string: pins on the case-tool cards → behind the folder */}
          <svg
            className="absolute right-0 top-0 z-0 pointer-events-none"
            width={312}
            height={560}
            viewBox="0 0 312 560"
            fill="none"
            aria-hidden>
            <g stroke="#c22b2d" strokeWidth="2.2" strokeLinecap="round" opacity="0.85">
              <path d="M192 79 Q 95 150 0 140" />
              <path d="M192 79 Q 215 160 192 229" />
              <path d="M192 229 Q 90 290 0 320" />
              <path d="M192 379 Q 130 330 192 229" />
              <path d="M192 379 Q 80 460 0 490" />
            </g>
          </svg>

          {/* ── LEFT COLUMN (tabs + folder) ── */}
          <div className="relative z-10 flex-1 flex flex-col min-w-0 h-full">

          {/* ── FOLDER TABS ── */}
          <div data-tour="game-mode-tabs" className={`${desk.noScrollbar} flex items-end gap-1 flex-shrink-0 pl-2`}>
            {TABS.map((tab, i) => {
              const isActive = activeTab === tab.id
              const TabIcon = MODULE_ICONS[tab.id] ?? Network
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    playClickSound()
                    setActiveTab(tab.id)
                  }}
                  className={`relative flex flex-col items-start justify-center gap-0.5 px-4 py-1.5
                    max-w-[260px] text-left
                    rounded-t-lg border border-b-0 border-black/20
                    outline-none transition-all cursor-pointer
                    focus-visible:ring-2 focus-visible:ring-[var(--lime)]
                    ${isActive
                      ? `${desk.paper} bg-[var(--manila)] text-[var(--ink)] min-h-[58px] z-10 -mb-px shadow-[0_-4px_12px_rgba(0,0,0,0.3)]`
                      : `${TAB_COLORS[i] ?? 'bg-[#D9A441]'} text-[var(--ink)] min-h-[50px] hover:brightness-110 shadow-[inset_0_-8px_10px_-8px_rgba(0,0,0,0.45)]`
                    }`}>
                  {isActive && (
                    <Paperclip
                      size={26}
                      strokeWidth={1.75}
                      className="absolute -top-3 right-2 rotate-[30deg] text-[#8d8a84]"
                      aria-hidden />
                  )}
                  <span className={`${TYPE} text-[10px] font-bold tracking-[0.18em] ${isActive ? 'text-[var(--crimson)]' : 'text-[var(--ink)]/75'}`}>
                    [{i + 1}] CASE {String(i + 1).padStart(2, '0')}:
                  </span>
                  <span className={`${TYPE} flex items-start gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] leading-tight`}>
                    <TabIcon size={13} className="flex-shrink-0 mt-px" aria-hidden />
                    {tab.header}
                  </span>
                </button>
              )
            })}
          </div>

          {/* ── FOLDER BODY (stacked manila sheets) ── */}
          <div className={`${desk.folder} relative flex-1 overflow-hidden flex flex-col min-h-0`}>

            {/* Paperclip clamping the sheets on the folder's right edge (clear of the header text) */}
            <Paperclip
              size={34}
              strokeWidth={1.6}
              className="absolute right-1 top-20 rotate-[100deg] text-[#8d8a84] drop-shadow-[0_2px_1px_rgba(0,0,0,0.35)] pointer-events-none z-20"
              aria-hidden />

            {/* ── FIXED DOSSIER HEADER (never scrolls) ── */}
            <div className="flex-shrink-0 px-8 pt-6 pb-3 text-[var(--ink)] border-b border-[rgba(139,115,85,0.3)]">

              {/* Doc Header */}
              <div className={`${TYPE} flex items-center justify-between gap-4 pr-4 text-xs tracking-[0.15em] text-[var(--ink)] mb-5`}>
                <span className="flex items-center gap-2">
                  <FolderOpen size={15} className="text-[var(--hat)]" aria-hidden />
                  CASE FILE {'//'} EVIDENCE DOSSIER
                </span>
                <span>CLASSIFICATION: TRAINING</span>
              </div>

              {/* Case stamp + Inspector Crit's handwritten note (follows the active case) */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 min-h-[72px] mb-1">
                <div
                  className={`${TYPE} ${desk.wornStamp} col-start-2 justify-self-center flex items-center gap-2 px-4 py-1.5
                    text-[15px] font-bold uppercase tracking-[0.1em] whitespace-nowrap`}
                  style={{ transform: 'rotate(-2deg)' }}>
                  <ActiveModuleIcon size={17} aria-hidden />
                  CASE {String(TABS.findIndex(t => t.id === activeTabCfg.id) + 1).padStart(2, '0')}: {activeTabCfg.header}
                </div>
                <p
                  key={activeTabCfg.id}
                  data-tour="inspector-note"
                  className={`${desk.handwritten} hidden xl:block col-start-3 justify-self-end self-start max-w-[240px] text-[12.5px] leading-snug -rotate-3`}>
                  {activeTabCfg.note}
                  <span className="block text-right">— Inspector Crit</span>
                </p>
              </div>

              {/* ── TOPIC & DIFFICULTY EXPLORATION CONTROLS ── */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 pb-0.5 border-t border-[rgba(139,115,85,0.25)] text-xs">
                {/* Topic selector */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`${TYPE} text-[10px] uppercase tracking-wider text-[#6b6255] font-bold mr-0.5`}>
                    Topic:
                  </span>
                  <button
                    onClick={() => { playClickSound(); setTopicFilter('ALL') }}
                    className={`${TYPE} px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                      topicFilter === 'ALL'
                        ? 'bg-[var(--hat)] text-[var(--parchment)] border-[var(--hat)] shadow-sm'
                        : 'bg-black/5 hover:bg-black/10 text-[#4a4339] border-black/15'
                    }`}>
                    All Topics
                  </button>
                  {availableTopics.map(topic => (
                    <button
                      key={topic}
                      onClick={() => { playClickSound(); setTopicFilter(topic) }}
                      className={`${TYPE} px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                        topicFilter === topic
                          ? 'bg-[var(--hat)] text-[var(--parchment)] border-[var(--hat)] shadow-sm'
                          : 'bg-black/5 hover:bg-black/10 text-[#4a4339] border-black/15'
                      }`}>
                      {topic.replace('-', ' ')}
                    </button>
                  ))}
                </div>

                {/* Difficulty selector */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`${TYPE} text-[10px] uppercase tracking-wider text-[#6b6255] font-bold mr-0.5`}>
                    Difficulty:
                  </span>
                  {(['ALL', 'BASICS', 'INTERMEDIATE', 'ADVANCED'] as const).map(diff => (
                    <button
                      key={diff}
                      onClick={() => { playClickSound(); setDifficultyFilter(diff) }}
                      className={`${TYPE} px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border flex items-center gap-1 ${
                        difficultyFilter === diff
                          ? 'bg-[var(--ink)] text-[var(--parchment)] border-[var(--ink)] shadow-sm'
                          : 'bg-black/5 hover:bg-black/10 text-[#4a4339] border-black/15'
                      }`}>
                      {diff === 'BASICS' && <span className="w-1.5 h-1.5 rounded-full bg-[#4ddd94]" />}
                      {diff === 'INTERMEDIATE' && <span className="w-1.5 h-1.5 rounded-full bg-[#5bc0f8]" />}
                      {diff === 'ADVANCED' && <span className="w-1.5 h-1.5 rounded-full bg-[#f5a623]" />}
                      {diff === 'ALL' ? 'All Tiers' : diff}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── SCROLLING EXHIBITS ── */}
            <div data-tour="case-exhibits" className={`${desk.noScrollbar} flex-1 min-h-0 overflow-y-auto px-8 pt-5 pb-8 text-[var(--ink)]`}>

              {/* Empty state */}
              {displayedNodes.length === 0 && (
                <div className="font-mono text-xs text-[var(--hat)] text-center py-10 flex flex-col items-center gap-2">
                  <span>No evidence files match the selected topic or difficulty filters.</span>
                  {(topicFilter !== 'ALL' || difficultyFilter !== 'ALL') && (
                    <button
                      onClick={() => { setTopicFilter('ALL'); setDifficultyFilter('ALL') }}
                      className={`${TYPE} text-[11px] underline text-[var(--crimson)] hover:text-[var(--ink)] cursor-pointer`}>
                      Reset filters to show all exhibits
                    </button>
                  )}
                </div>
              )}

              {/* ── EXHIBIT CARDS ── */}
              <div className="grid grid-cols-1 min-[1700px]:grid-cols-2 gap-4">
              {displayedNodes.map((node, idx) => {
                const meta = NODE_META[node.node_id]
                if (!meta) return null

                const isDone   = node.status === 'completed'
                const isReady  = node.status === 'unlocked'
                const isLocked = node.status === 'locked'
                const progress = getNodeProgress(node.node_id)
                const canonicalIdx = activeNodes.findIndex(n => n.node_id === node.node_id)

                return (
                  <div
                    key={node.node_id}
                    className={`relative min-w-0 rounded-sm border border-[#a8915f] border-l-4
                      px-4 py-2.5 max-h-[150px] shadow-[0_3px_8px_rgba(60,40,20,0.18)]
                      ${isDone
                        ? `${desk.paper} bg-[var(--parchment)] border-l-[var(--crimson)]`
                        : isLocked
                        ? 'bg-[#e6dcc4] border-l-[#9b9384]'
                        : `${desk.paper} bg-[var(--parchment)] border-l-[var(--lime)]`
                      }`}>
                    {/* Paperclip on the exhibit corner */}
                    {/* Paperclip on the exhibit */}
                    <Paperclip
                      size={20}
                      strokeWidth={1.6}
                      className="absolute -top-3 -left-2 -rotate-[35deg] text-[#8d8a84] pointer-events-none"
                      aria-hidden />

                    {/* Top row */}
                    <div className="flex justify-between items-start gap-3 mb-1.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-sm flex items-center justify-center flex-shrink-0
                          ${isLocked ? 'bg-[#9b9384] text-[var(--parchment)]' : 'bg-[var(--ink)] text-[var(--parchment)]'}`}>
                          {isLocked
                            ? <Lock size={14} aria-hidden />
                            : <ActiveModuleIcon size={14} aria-hidden />}
                        </div>
                        <div className={`${TYPE} min-w-0 leading-tight ${isLocked ? 'text-[#4a4339]' : 'text-[var(--ink)]'}`}>
                          <div className="text-[10px] tracking-[0.15em]">
                            EXHIBIT {String((canonicalIdx >= 0 ? canonicalIdx : idx) + 1).padStart(2, '0')}{meta.level && <> · {meta.level}</>}
                          </div>
                          <div className="text-xs font-bold uppercase tracking-wider truncate">
                            {meta.title}
                          </div>
                        </div>
                      </div>

                      {/* Status pill */}
                      <div className={`${TYPE} inline-flex items-center gap-1 flex-shrink-0
                        text-[10px] font-extrabold tracking-[0.12em] uppercase px-2 py-0.5 rounded-sm -rotate-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]
                        ${isDone
                          ? 'bg-[var(--crimson)] text-white border-2 border-[#7d1f20]'
                          : isReady
                          ? 'border-2 border-[#4f8f2f] text-[#2f6418] bg-[var(--lime)]/15'
                          : 'border-2 border-[#6d665a] text-[#4a4339] bg-[#9b9384]/10'
                        }`}>
                        {isDone
                          ? <><CircleCheck size={11} aria-hidden /> Case closed</>
                          : isReady
                          ? <><ShieldAlert size={11} aria-hidden /> Evidence unlocked</>
                          : <><Lock size={11} aria-hidden /> Classified</>}
                      </div>
                    </div>

                    {/* Focus description */}
                    <p className={`text-[13px] leading-snug mb-2 line-clamp-2 ${isLocked ? 'text-[#4a4339]' : 'text-[#1f170f]'}`}>
                      {meta.focus}
                    </p>

                    {/* Handwritten note on the first open exhibit */}
                    {idx === firstOpenIdx && (
                      <span className={`${desk.handwritten} absolute right-40 top-8 text-xs -rotate-6 pointer-events-none`}>
                        start here →
                      </span>
                    )}

                    {/* Progress gauge + actions */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="h-2 rounded-full bg-[#d9ccad] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[var(--lime)] transition-all duration-500"
                            style={{ width: `${progress}%` }} />
                        </div>
                        <div className={`${TYPE} mt-1 text-[10px] text-[var(--ink)]`}>
                          {progress}% · {Math.round(progress / 100 * 5)}/5 exercises
                        </div>
                      </div>

                      <div className="flex gap-2 items-center flex-shrink-0">
                        {!isDone && progress > 0 && (
                          <button
                            onClick={() => handleResetNode(node.node_id)}
                            className={`${TYPE} inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide
                              whitespace-nowrap px-3 py-1.5 rounded-sm border border-[var(--crimson)]/60 text-[var(--crimson)]
                              hover:bg-[var(--crimson)] hover:text-[var(--parchment)] transition-all cursor-pointer`}>
                            <RotateCcw size={12} aria-hidden />
                            Reset
                          </button>
                        )}
                        <button
                          disabled={isLocked}
                          onClick={() => {
                            if (isDone) {
                              handleResetNode(node.node_id)
                            } else {
                              handleStartNode(
                                activeTabCfg.route_base,
                                node.node_id,
                                node.status,
                              )
                            }
                          }}
                          className={`${TYPE} inline-flex items-center gap-1.5 text-[11px] font-bold
                            uppercase tracking-wide whitespace-nowrap px-3.5 py-1.5 rounded-sm transition-all
                            ${isLocked
                              ? 'border border-[#9b9384] text-[#6d665a] cursor-not-allowed'
                              : isDone
                              ? 'border border-[var(--hat)] text-[var(--hat)] bg-[var(--parchment)] hover:bg-[var(--hat)] hover:text-[var(--parchment)] cursor-pointer'
                              : 'bg-[var(--hat)] text-[var(--parchment)] hover:bg-[var(--hat-dark)] cursor-pointer shadow-[0_2px_0_rgba(0,0,0,0.35)]'
                            }`}>
                          {isDone
                            ? <><RotateCcw size={12} aria-hidden /> Reopen case</>
                            : isLocked
                            ? <><Lock size={12} aria-hidden /> Locked</>
                            : progress > 0
                            ? <><Search size={12} aria-hidden /> Continue case</>
                            : <><FileText size={12} aria-hidden /> Open case file</>}
                        </button>
                      </div>
                    </div>

                    {/* Stamp overlays */}
                    {isDone && (
                      <div className="absolute top-1/2 left-[58%] -translate-y-1/2 -rotate-[8deg] pointer-events-none">
                        <div className={`${TYPE} ${desk.wornStamp} px-2.5 text-lg font-extrabold tracking-[0.12em] whitespace-nowrap opacity-80`}>
                          CASE CLOSED
                        </div>
                      </div>
                    )}
                    {isLocked && (
                      <div className="absolute top-1/2 left-[58%] -translate-y-1/2 rotate-[6deg] pointer-events-none">
                        <div className={`${TYPE} ${desk.wornStamp} px-2.5 text-lg font-extrabold tracking-[0.12em] whitespace-nowrap opacity-70`}>
                          CLASSIFIED
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              </div>

            </div>
          </div>
        </div>

        {/* ── SIDEBAR: EVIDENCE BOARD // CASE TOOLS ── */}
        <aside className={`${desk.noScrollbar} relative z-10 w-[240px] flex-shrink-0
          flex flex-col gap-[18px] pt-[14px] overflow-y-auto h-full pb-4`}>
          <div className={`${TYPE} h-[40px] flex items-start gap-2 text-[12px] font-bold tracking-[0.12em] text-[var(--parchment)] leading-tight`}>
            <Pin size={15} className="text-[var(--crimson)] mt-0.5 flex-shrink-0" aria-hidden />
            EVIDENCE BOARD {'//'} CASE TOOLS
          </div>
          {[
            {
              tour:    'lexical-clipboard',
              icon:    Clipboard,
              label:   'LEXICAL\nCLIPBOARD',
              note:    'Vocabulary evidence log',
              tilt:    'rotate-[-1.2deg]',
              onClick: () => {
                playClickSound()
                setShowLexicalModal(true)
              },
            },
            {
              tour:    'quick-review',
              icon:    FileText,
              label:   'QUICK\nREVIEW',
              note:    'Field manual & 60s drill',
              tilt:    'rotate-[0.9deg]',
              onClick: () => {
                playClickSound()
                setShowQuickReviewModal(true)
              },
            },
            {
              tour:    'metric-log',
              icon:    Activity,
              label:   'METRIC\nLOG',
              note:    'Case performance audit',
              tilt:    'rotate-[-0.6deg]',
              onClick: () => {
                playClickSound()
                setShowMetricLogModal(true)
              },
            },
          ].map((item, idx) => (
            <button
              key={idx}
              data-tour={item.tour}
              onClick={item.onClick}
              className={`${desk.indexCard} ${item.tilt} relative h-[132px] flex-shrink-0
                rounded-[2px] flex flex-row items-start gap-3 px-3.5 pt-6 pb-3 text-left cursor-pointer
                transition-all hover:rotate-0 hover:-translate-y-1 hover:scale-[1.02]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lime)]`}>
              {/* Worn tape across the top */}
              <span className={`${desk.tape} absolute -top-2 left-1/2 -translate-x-1/2 w-20 h-5 -rotate-3`} aria-hidden />
              {/* Red push pin */}
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full ring-1 ring-black/30
                  bg-[radial-gradient(circle_at_35%_35%,#ff8a8a,#c0392b_45%,#7a1717)]
                  shadow-[2px_5px_4px_rgba(0,0,0,0.5)]"
                aria-hidden />
              <span className="w-9 h-9 rounded-sm bg-[var(--ink)] text-[var(--parchment)] flex items-center justify-center flex-shrink-0 shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
                <item.icon size={18} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className={`${TYPE} block text-[13px] font-bold uppercase tracking-wider
                  text-[var(--ink)] leading-tight whitespace-pre-line`}>
                  {item.label}
                </span>
                <span className={`${desk.handwrittenInk} block mt-1.5 text-[11px] leading-snug -rotate-1`}>
                  {item.note}
                </span>
              </span>
              {/* Detective pencil scribbles in the empty lined area */}
              <CaseScribbles variant={idx} />
            </button>
          ))}
        </aside>
        </div>{/* end center container */}
      </div>{/* end body */}

      {/* ── INSPECTOR CRIT'S DASHBOARD TOUR ── */}
      <TourGuide
        isOpen={showTour}
        onClose={() => {
          setShowTour(false)
          // The tour is the induction now: record it locally and on the profile
          markInductionComplete(dashboard?.student_id || 'user')
          apiFetch('/progression/onboarding/complete/', { method: 'POST' }).catch(() => {})
        }}
      />

      {/* ── SIDEBAR INVESTIGATIVE MODALS ── */}
      <LexicalClipboardModal
        isOpen={showLexicalModal}
        onClose={() => setShowLexicalModal(false)}
      />
      <QuickReviewModal
        isOpen={showQuickReviewModal}
        onClose={() => setShowQuickReviewModal(false)}
      />
      <MetricLogModal
        isOpen={showMetricLogModal}
        onClose={() => setShowMetricLogModal(false)}
      />
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
      <ProfileSettingsModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onUserUpdated={(updated) => {
          setDashboard((prev) => (prev ? {
            ...prev,
            first_name: updated.first_name,
            last_name: updated.last_name,
            profile_picture: updated.profile_picture !== undefined ? updated.profile_picture : prev.profile_picture,
          } : prev))
        }}
      />
    </div>
  )
}