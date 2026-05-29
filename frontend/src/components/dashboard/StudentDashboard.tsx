'use client'

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { apiFetch }            from '@/lib/api'

// ── Types ───────────────────────────────────────
interface NodeStatus {
  node_id: string
  status:  'locked' | 'unlocked' | 'completed'
}
interface ModuleStatus {
  module_unlocked: boolean
  nodes:           NodeStatus[]
}
interface DashboardData {
  username:        string
  streak:          number
  completed_count: number
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
  icon:  string
  level?: string
  type?:  string
}> = {
  // ── LOGIC THREAD — NARRATION ───────────────
  log_node_01: {
    title: 'Narration — Basics',
    focus: 'Identify simple time-order signals',
    icon: '⊕', level: 'BASICS', type: 'NARRATION',
  },
  log_node_02: {
    title: 'Narration — Intermediate',
    focus: 'Sequence events using multiple time markers',
    icon: '⊕', level: 'INTERMEDIATE', type: 'NARRATION',
  },
  log_node_03: {
    title: 'Narration — Advanced',
    focus: 'Map complex chronological narrative development',
    icon: '⊕', level: 'ADVANCED', type: 'NARRATION',
  },
  // ── LOGIC THREAD — DEFINITION ─────────────
  log_node_04: {
    title: 'Definition — Basics',
    focus: 'Identify a simple three-part definition',
    icon: '⊕', level: 'BASICS', type: 'DEFINITION',
  },
  log_node_05: {
    title: 'Definition — Intermediate',
    focus: 'Map a multi-part definition with characteristics',
    icon: '⊕', level: 'INTERMEDIATE', type: 'DEFINITION',
  },
  log_node_06: {
    title: 'Definition — Advanced',
    focus: 'Map a full academic definition with examples',
    icon: '⊕', level: 'ADVANCED', type: 'DEFINITION',
  },
  // ── LOGIC THREAD — COMPARISON ─────────────
  log_node_07: {
    title: 'Comparison & Contrast — Basics',
    focus: 'Identify simple similarity and difference signals',
    icon: '⊕', level: 'BASICS', type: 'COMPARISON',
  },
  log_node_08: {
    title: 'Comparison & Contrast — Intermediate',
    focus: 'Map a four-part compare and contrast structure',
    icon: '⊕', level: 'INTERMEDIATE', type: 'COMPARISON',
  },
  log_node_09: {
    title: 'Comparison & Contrast — Advanced',
    focus: 'Map a complex multi-criteria comparison text',
    icon: '⊕', level: 'ADVANCED', type: 'COMPARISON',
  },
  // ── LOGIC THREAD — CAUSE & EFFECT ─────────
  log_node_10: {
    title: 'Cause & Effect — Basics',
    focus: 'Identify a simple cause and its direct effect',
    icon: '⊕', level: 'BASICS', type: 'CAUSE-EFFECT',
  },
  log_node_11: {
    title: 'Cause & Effect — Intermediate',
    focus: 'Map a chained cause-effect academic argument',
    icon: '⊕', level: 'INTERMEDIATE', type: 'CAUSE-EFFECT',
  },
  log_node_12: {
    title: 'Cause & Effect — Advanced',
    focus: 'Map complex cascading cause-effect relationships',
    icon: '⊕', level: 'ADVANCED', type: 'CAUSE-EFFECT',
  },
  // ── SNAP-IN GAP — ADDITION ────────────────
  snp_node_01: {
    title: 'Addition & Sequence — Basics',
    focus: 'Identify the simplest addition transition',
    icon: '⊞', level: 'BASICS', type: 'ADDITION',
  },
  snp_node_02: {
    title: 'Addition & Sequence — Intermediate',
    focus: 'Use addition and sequence in two-pair context',
    icon: '⊞', level: 'INTERMEDIATE', type: 'ADDITION',
  },
  snp_node_03: {
    title: 'Addition & Sequence — Advanced',
    focus: 'Apply complex addition transitions academically',
    icon: '⊞', level: 'ADVANCED', type: 'ADDITION',
  },
  // ── SNAP-IN GAP — CONTRAST ────────────────
  snp_node_04: {
    title: 'Contrast & Opposition — Basics',
    focus: 'Identify the most basic contrast transition',
    icon: '⊞', level: 'BASICS', type: 'CONTRAST',
  },
  snp_node_05: {
    title: 'Contrast & Opposition — Intermediate',
    focus: 'Use contrast transitions in two-pair context',
    icon: '⊞', level: 'INTERMEDIATE', type: 'CONTRAST',
  },
  snp_node_06: {
    title: 'Contrast & Opposition — Advanced',
    focus: 'Apply nuanced contrast in academic arguments',
    icon: '⊞', level: 'ADVANCED', type: 'CONTRAST',
  },
  // ── SNAP-IN GAP — CAUSE & EFFECT ──────────
  snp_node_07: {
    title: 'Cause & Effect — Basics',
    focus: 'Identify the simplest cause-effect transition',
    icon: '⊞', level: 'BASICS', type: 'CAUSE-EFFECT',
  },
  snp_node_08: {
    title: 'Cause & Effect — Intermediate',
    focus: 'Distinguish between two cause-effect signals',
    icon: '⊞', level: 'INTERMEDIATE', type: 'CAUSE-EFFECT',
  },
  snp_node_09: {
    title: 'Cause & Effect — Advanced',
    focus: 'Apply cause-effect transitions academically',
    icon: '⊞', level: 'ADVANCED', type: 'CAUSE-EFFECT',
  },
  // ── SNAP-IN GAP — CONCLUSION ──────────────
  snp_node_10: {
    title: 'Conclusion Signals — Basics',
    focus: 'Identify the simplest conclusion transition',
    icon: '⊞', level: 'BASICS', type: 'CONCLUSION',
  },
  snp_node_11: {
    title: 'Conclusion Signals — Intermediate',
    focus: 'Apply two different conclusion transitions',
    icon: '⊞', level: 'INTERMEDIATE', type: 'CONCLUSION',
  },
  snp_node_12: {
    title: 'Conclusion Signals — Advanced',
    focus: 'Apply advanced conclusion signals academically',
    icon: '⊞', level: 'ADVANCED', type: 'CONCLUSION',
  },
  // ── TAP THE CLUES — SYNONYM ───────────────
  tap_node_01: {
    title: 'Synonym Clues — Basics',
    focus: 'Find one synonym clue right beside the word',
    icon: '🔍', level: 'BASICS', type: 'SYNONYM',
  },
  tap_node_02: {
    title: 'Synonym Clues — Intermediate',
    focus: 'Find two synonym clues in context',
    icon: '🔍', level: 'INTERMEDIATE', type: 'SYNONYM',
  },
  tap_node_03: {
    title: 'Synonym Clues — Advanced',
    focus: 'Unlock two words using synonym clues',
    icon: '🔍', level: 'ADVANCED', type: 'SYNONYM',
  },
  // ── TAP THE CLUES — DEFINITION ────────────
  tap_node_04: {
    title: 'Definition Clues — Basics',
    focus: 'Spot a single embedded definition clue',
    icon: '🔍', level: 'BASICS', type: 'DEFINITION',
  },
  tap_node_05: {
    title: 'Definition Clues — Intermediate',
    focus: 'Find two definition clue words in context',
    icon: '🔍', level: 'INTERMEDIATE', type: 'DEFINITION',
  },
  tap_node_06: {
    title: 'Definition Clues — Advanced',
    focus: 'Unlock two words using definition clues',
    icon: '🔍', level: 'ADVANCED', type: 'DEFINITION',
  },
  // ── TAP THE CLUES — ANTONYM ───────────────
  tap_node_07: {
    title: 'Antonym & Contrast Clues — Basics',
    focus: 'Find one antonym clue near the word',
    icon: '🔍', level: 'BASICS', type: 'ANTONYM',
  },
  tap_node_08: {
    title: 'Antonym & Contrast Clues — Intermediate',
    focus: 'Find two antonym clues in academic context',
    icon: '🔍', level: 'INTERMEDIATE', type: 'ANTONYM',
  },
  tap_node_09: {
    title: 'Antonym & Contrast Clues — Advanced',
    focus: 'Unlock two words using antonym clues',
    icon: '🔍', level: 'ADVANCED', type: 'ANTONYM',
  },
  // ── TAP THE CLUES — EXAMPLE/INFERENCE ─────
  tap_node_10: {
    title: 'Example & Inference Clues — Basics',
    focus: 'Infer word meaning from one nearby example',
    icon: '🔍', level: 'BASICS', type: 'INFERENCE',
  },
  tap_node_11: {
    title: 'Example & Inference Clues — Intermediate',
    focus: 'Infer meaning from two example clues',
    icon: '🔍', level: 'INTERMEDIATE', type: 'INFERENCE',
  },
  tap_node_12: {
    title: 'Example & Inference Clues — Advanced',
    focus: 'Unlock two words using inference clues',
    icon: '🔍', level: 'ADVANCED', type: 'INFERENCE',
  },
  // ── FACT SCANNER — CURRENCY ───────────────
  fac_node_01: {
    title: 'Currency — Basics',
    focus: 'Spot a very obviously outdated source',
    icon: '🔎', level: 'BASICS', type: 'CURRENCY',
  },
  fac_node_02: {
    title: 'Currency — Intermediate',
    focus: 'Identify a moderately outdated source',
    icon: '🔎', level: 'INTERMEDIATE', type: 'CURRENCY',
  },
  fac_node_03: {
    title: 'Currency — Advanced',
    focus: 'Detect a subtly outdated claim',
    icon: '🔎', level: 'ADVANCED', type: 'CURRENCY',
  },
  // ── FACT SCANNER — RELEVANCE ──────────────
  fac_node_04: {
    title: 'Relevance — Basics',
    focus: 'Spot a completely off-topic sentence',
    icon: '🔎', level: 'BASICS', type: 'RELEVANCE',
  },
  fac_node_05: {
    title: 'Relevance — Intermediate',
    focus: 'Identify a moderately off-topic sentence',
    icon: '🔎', level: 'INTERMEDIATE', type: 'RELEVANCE',
  },
  fac_node_06: {
    title: 'Relevance — Advanced',
    focus: 'Detect a subtly irrelevant sentence',
    icon: '🔎', level: 'ADVANCED', type: 'RELEVANCE',
  },
  // ── FACT SCANNER — AUTHORITY ──────────────
  fac_node_07: {
    title: 'Authority — Basics',
    focus: 'Spot an obviously unverified claim',
    icon: '🔎', level: 'BASICS', type: 'AUTHORITY',
  },
  fac_node_08: {
    title: 'Authority — Intermediate',
    focus: 'Identify a moderately unverified source',
    icon: '🔎', level: 'INTERMEDIATE', type: 'AUTHORITY',
  },
  fac_node_09: {
    title: 'Authority — Advanced',
    focus: 'Detect a subtly unqualified claim',
    icon: '🔎', level: 'ADVANCED', type: 'AUTHORITY',
  },
  // ── FACT SCANNER — ACCURACY ───────────────
  fac_node_10: {
    title: 'Accuracy — Basics',
    focus: 'Spot a wildly inaccurate claim',
    icon: '🔎', level: 'BASICS', type: 'ACCURACY',
  },
  fac_node_11: {
    title: 'Accuracy — Intermediate',
    focus: 'Identify a moderately inaccurate claim',
    icon: '🔎', level: 'INTERMEDIATE', type: 'ACCURACY',
  },
  fac_node_12: {
    title: 'Accuracy — Advanced',
    focus: 'Detect a subtly fabricated statistic',
    icon: '🔎', level: 'ADVANCED', type: 'ACCURACY',
  },
  // ── FACT SCANNER — PURPOSE ────────────────
  fac_node_13: {
    title: 'Purpose — Basics',
    focus: 'Spot overtly biased or insulting language',
    icon: '🔎', level: 'BASICS', type: 'PURPOSE',
  },
  fac_node_14: {
    title: 'Purpose — Intermediate',
    focus: 'Identify moderately biased framing',
    icon: '🔎', level: 'INTERMEDIATE', type: 'PURPOSE',
  },
  fac_node_15: {
    title: 'Purpose — Advanced',
    focus: 'Detect subtly manipulative academic language',
    icon: '🔎', level: 'ADVANCED', type: 'PURPOSE',
  },
}

// ── Tabs ─────────────────────────────────────────
// All tabs are always clickable.
// Node lock state is shown on the card,
// not on the tab itself.
const TABS = [
  {
    id:         'logic_thread',
    label:      '[1] TEXT STRUCTURE\nMASTERY',
    route_base: '/nodes/logic-thread',
    header:     'TEXT STRUCTURE MASTERY',
  },
  {
    id:         'snap_gap',
    label:      '[2] SNAP-IN-GAP',
    route_base: '/nodes/snap-gap',
    header:     'SNAP-IN-GAP',
  },
  {
    id:         'tap_clues',
    label:      '[3] TAP THE CLUES',
    route_base: '/nodes/tap-clues',
    header:     'TAP THE CLUES',
  },
  {
    id:         'fact_scanner',
    label:      '[4] FACT SCANNER',
    route_base: '/nodes/fact-scanner',
    header:     'FACT SCANNER',
  },
]

// ── Component ────────────────────────────────────
export default function StudentDashboard() {
  const router = useRouter()

  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null)
  const [activeTab, setActiveTab] =
    useState('logic_thread')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [scrollPos, setScrollPos] = useState(0)
  const [showMenu, setShowMenu]   = useState(false)

  // ── Fetch dashboard on mount ──────────────
  useEffect(() => {
    const load = async () => {
      try {
        const d = await apiFetch(
          '/progression/dashboard/')
        setDashboard(d)
      } catch (e: any) {
        const code =
          e?.code ?? e?.detail?.code ?? ''
        const detail =
          typeof e?.detail === 'string'
            ? e.detail
            : e?.detail?.detail ?? ''

        const isAuthError =
          e?.status === 401 ||
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
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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

  // ── Get nodes for active tab ──────────────
  const getActiveNodes = (): NodeStatus[] => {
    if (!dashboard) return []
    const mod = dashboard.module_status[
      activeTab as keyof
        typeof dashboard.module_status
    ]
    return mod?.nodes ?? []
  }

  const activeTabCfg =
    TABS.find(t => t.id === activeTab) ?? TABS[0]

  // ── Loading state ─────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#1e1e1e]
      flex items-center justify-center
      font-mono text-[#aaa] text-sm">
      Loading...
    </div>
  )

  // ── Error state ───────────────────────────
  if (error) return (
    <div className="min-h-screen bg-[#1e1e1e]
      flex items-center justify-center
      font-mono text-red-400 text-sm
      flex-col gap-4">
      <p>{error}</p>
      <button
        onClick={() => router.push('/auth')}
        className="border border-[#555] px-4 py-2
          text-xs text-[#aaa] hover:text-white
          hover:border-white transition-colors">
        Go to Login
      </button>
    </div>
  )

  const activeNodes = getActiveNodes()

  return (
    <div className="min-h-screen bg-[#1e1e1e]
      text-[#eee] font-serif">

      {/* ── TOPBAR ── */}
      <header className="h-[52px] bg-[#1e1e1e]
        flex items-center justify-end gap-9 px-9
        border-b border-[#333]">

        <div className="flex items-center gap-2
          font-mono text-xs text-[#ddd]">
          <span>🔥</span>
          <strong>Streak:</strong>
          &nbsp;{dashboard?.streak ?? 0} Days
        </div>

        <div className="flex items-center gap-2
          font-mono text-xs text-[#ddd]">
          <span>⭐</span>
          <strong>Nodes:</strong>
          &nbsp;{dashboard?.completed_count ?? 0}
          &nbsp;Completed
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2
              font-mono text-xs text-[#ddd]
              hover:text-white cursor-pointer
              transition-colors">
            <span>👤</span>
            {dashboard?.username ?? 'Student'}
          </button>
          {showMenu && (
            <div className="absolute top-full
              right-0 mt-2 bg-[#2b2b2b]
              border border-[#444] rounded-sm
              shadow-lg z-50 min-w-[150px]">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4
                  py-2 text-xs font-mono text-[#ddd]
                  hover:bg-[#3a3a3a]
                  hover:text-white transition-colors">
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── SPACER ── */}
      <div className="h-20 bg-[#2b2b2b]" />

      {/* ── BODY ── */}
      <div className="flex
        h-[calc(100vh-52px-80px)] bg-[#2b2b2b]">

        {/* ── LEFT COLUMN ── */}
        <div className="flex-1 flex flex-col
          min-w-0">

          {/* ── TABS ── */}
          {/* All tabs are always clickable.
              Students can browse any module.
              Individual node cards show
              lock state. */}
          <div className="flex items-end
            flex-shrink-0 bg-[#2b2b2b]">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() =>
                    setActiveTab(tab.id)}
                  className={`px-7 flex items-center
                    justify-center font-mono text-xs
                    font-bold uppercase tracking-wider
                    border-none outline-none
                    whitespace-pre-wrap text-center
                    transition-all cursor-pointer
                    ${isActive
                      ? 'bg-[#c8c4bc] text-[#111] h-[60px]'
                      : 'bg-[#444] text-[#aaa] hover:bg-[#505050] hover:text-[#ccc] h-[52px]'
                    }`}>
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* ── CONTENT PANEL ── */}
          <div className="flex-1 bg-[#c8c4bc]
            overflow-hidden flex">
            <div
              className="flex-1 overflow-y-auto
                px-9 pt-[30px] pb-[30px]"
              onScroll={e =>
                setScrollPos(
                  (e.currentTarget.scrollTop /
                    (e.currentTarget.scrollHeight
                     - e.currentTarget.clientHeight)
                  ) * 100
                )
              }>

              {/* Doc Header */}
              <div className="text-center mb-6">
                <div className="inline-block
                  border-[1.5px] border-[#777]
                  px-6 py-1 font-mono text-xs
                  tracking-widest text-[#333]
                  bg-white bg-opacity-20 mb-4">
                  OFFICIAL STUDENT DASHBOARD
                  DOCUMENT
                </div>
                <div className="flex items-center">
                  <div className="flex-1 h-px
                    bg-[#888]" />
                  <div className="border-2
                    border-[#555] px-4 py-[7px]
                    font-mono text-sm font-bold
                    uppercase tracking-wider
                    text-[#111] bg-[#ddd9d0]
                    whitespace-nowrap">
                    {activeTabCfg.header}
                  </div>
                  <div className="flex-1 h-px
                    bg-[#888]" />
                </div>
              </div>

              {/* Empty state */}
              {activeNodes.length === 0 && (
                <div className="font-mono text-xs
                  text-[#777] text-center py-10">
                  No nodes available for this module.
                </div>
              )}

              {/* First bullet */}
              {activeNodes.length > 0 && (
                <div className="flex flex-col
                  items-start gap-1.5 my-1.5">
                  <div className="w-3 h-3
                    rounded-full bg-[#888]
                    border-2 border-[#aaa]
                    flex-shrink-0" />
                </div>
              )}

              {/* ── NODE CARDS ── */}
              {activeNodes.map((node, idx) => {
                const meta = NODE_META[node.node_id]
                if (!meta) return null

                const isDone   =
                  node.status === 'completed'
                const isReady  =
                  node.status === 'unlocked'
                const isLocked =
                  node.status === 'locked'

                return (
                  <div key={node.node_id}>
                    <div className="flex items-start
                      gap-2.5 mb-1.5">
                      <div className="w-[14px]
                        h-[14px] rounded-full
                        bg-[#888] border-2
                        border-[#aaa] flex-shrink-0
                        mt-[14px]" />

                      {/* Card */}
                      <div className={`flex-1
                        border border-[#bbb]
                        rounded-sm p-4 text-[#111]
                        relative min-w-0
                        ${isDone
                          ? 'bg-[#e8f5e9]'
                          : isLocked
                          ? 'bg-[#e8e8e0] opacity-60'
                          : 'bg-[#f0ece4]'
                        }`}>

                        {/* Top row */}
                        <div className="flex
                          justify-between
                          items-center mb-2">
                          <div className="flex
                            items-center gap-2">
                            <div className="w-6 h-6
                              bg-[#111] rounded-sm
                              flex items-center
                              justify-center
                              text-white text-xs
                              flex-shrink-0">
                              {isLocked
                                ? '🔒'
                                : meta.icon}
                            </div>
                            <div className="font-mono
                              text-xs font-bold
                              uppercase tracking-wider">
                              {meta.title}
                            </div>
                          </div>

                          {/* Status badge */}
                          <div className={`font-mono
                            text-xs tracking-wider
                            px-[7px] py-[3px]
                            border uppercase
                            flex-shrink-0
                            ${isDone
                              ? 'text-[#4ddd94] border-[#4ddd94] bg-green-100 bg-opacity-10'
                              : isReady
                              ? 'text-[#55aaff] border-[#55aaff] bg-blue-100 bg-opacity-10'
                              : 'text-[#888] border-[#888]'
                            }`}>
                            {isDone
                              ? 'COMPLETED / DONE'
                              : isReady
                              ? 'UNLOCKED / ACTIVE'
                              : 'LOCKED'}
                          </div>
                        </div>

                        {/* Focus description */}
                        <p className="text-xs
                          leading-relaxed
                          text-[#555] mb-2.5">
                          {meta.focus}
                        </p>

                        {/* Inner bullet */}
                        <div className="flex
                          items-center gap-2 mb-1">
                          <div className="w-2.5
                            h-2.5 rounded-full
                            bg-[#aaa] border-[1.5px]
                            border-[#ccc]
                            flex-shrink-0" />
                        </div>

                        {/* Progress bar */}
                        <div className="h-[5px]
                          bg-[#bbb] rounded-sm
                          mb-3 overflow-hidden">
                          <div
                            className="h-full
                              bg-[#222] rounded-sm
                              transition-all"
                            style={{
                              width: isDone
                                ? '100%'
                                : '0%',
                            }} />
                        </div>

                        {/* Footer */}
                        <div className="flex
                          justify-between items-end">
                          <div className="font-mono
                            text-[10px] text-[#555]
                            leading-6">
                            PROGRESS —{' '}
                            {isDone ? '100' : '0'}%
                            <br />
                            {node.node_id
                              .toUpperCase()}
                          </div>

                          <button
                            disabled={isLocked}
                            onClick={() =>
                              handleStartNode(
                                activeTabCfg
                                  .route_base,
                                node.node_id,
                                node.status,
                              )
                            }
                            className={`font-mono
                              text-xs font-bold
                              uppercase tracking-wider
                              text-center px-4
                              py-[9px] border-[1.5px]
                              border-[#888] leading-snug
                              flex-shrink-0
                              whitespace-nowrap
                              transition-all
                              ${isLocked
                                ? 'bg-[#ccc] text-[#999] cursor-not-allowed'
                                : 'bg-[#d8d4cc] text-[#111] cursor-pointer hover:bg-[#111] hover:text-[#eee]'
                              }`}>
                            {isDone
                              ? 'REVIEW\nNODE'
                              : isLocked
                              ? 'LOCKED'
                              : 'PULL PAPER &\nSTART TRAINING'}
                          </button>
                        </div>

                        {/* Completed stamp */}
                        {isDone && (
                          <div className="absolute
                            top-1/2 left-[44%]
                            -translate-x-1/2
                            -translate-y-1/2
                            -rotate-12
                            pointer-events-none">
                            <div className="font-mono
                              text-4xl text-[#4ddd94]
                              border-4 border-[#4ddd94]
                              px-3 opacity-[0.72]
                              whitespace-nowrap
                              tracking-wider">
                              COMPLETED
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bullets between cards */}
                    {idx < activeNodes.length - 1 && (
                      <div className="flex flex-col
                        items-start gap-1.5 my-1.5">
                        <div className="w-3 h-3
                          rounded-full bg-[#888]
                          border-2 border-[#aaa]
                          flex-shrink-0" />
                        <div className="w-3 h-3
                          rounded-full bg-[#888]
                          border-2 border-[#aaa]
                          flex-shrink-0" />
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Trailing bullets */}
              {activeNodes.length > 0 && (
                <div className="flex flex-col
                  items-start gap-1.5 my-1.5">
                  <div className="w-3 h-3 rounded-full
                    bg-[#888] border-2 border-[#aaa]
                    flex-shrink-0" />
                  <div className="w-3 h-3 rounded-full
                    bg-[#888] border-2 border-[#aaa]
                    flex-shrink-0" />
                </div>
              )}
            </div>

            {/* Scroll dots */}
            <div className="w-8 flex flex-col
              items-center justify-between
              py-[30px] flex-shrink-0 pr-1">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="w-3.5 h-3.5 rounded-full
                    bg-[#999] border-2 border-[#bbb]
                    cursor-pointer hover:bg-[#777]
                    transition-all"
                  style={{
                    opacity:
                      Math.abs(
                        (i / 7) * 100 - scrollPos
                      ) < 20 ? 1 : 0.5,
                  }} />
              ))}
            </div>
          </div>
        </div>

        {/* ── SIDEBAR ── */}
        <aside className="w-[300px] flex-shrink-0
          bg-[#2b2b2b] border-l border-[#333]
          flex flex-col gap-3 p-3.5
          overflow-y-auto">
          {[
            {
              icon:    '📋',
              label:   'LEXICAL\nCLIPBOARD',
              onClick: () => router.push('/lexical'),
            },
            {
              icon:    '📄',
              label:   'QUICK\nREVIEW',
              onClick: () => {},
            },
            {
              icon:    '📈',
              label:   'METRIC\nLOG',
              onClick: () => {},
            },
          ].map((item, idx) => (
            <div
              key={idx}
              onClick={item.onClick}
              className="flex-1 bg-[#d0ccc4]
                rounded-sm flex flex-row
                items-start justify-center
                gap-3 px-5 py-4 cursor-pointer
                transition-all hover:bg-[#dedad2]
                min-h-[90px]">
              <div className="text-2xl text-[#222]
                flex-shrink-0 mt-0.5">
                {item.icon}
              </div>
              <div className="font-mono text-sm
                font-bold uppercase tracking-wider
                text-[#111] leading-relaxed
                text-left whitespace-pre-line">
                {item.label}
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  )
}