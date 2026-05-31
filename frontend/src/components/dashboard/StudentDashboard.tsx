'use client'

import { useState, useEffect, useCallback } from 'react'
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
  first_name:      string
  last_name:       string
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

  // ── Fetch dashboard ───────────────────────
  const fetchDashboard = useCallback(async () => {
    try {
      const d = await apiFetch('/progression/dashboard/')
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
    }
  }, [router])

  useEffect(() => {
    setLoading(true)
    fetchDashboard().finally(() => setLoading(false))
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
    let module = ''
    if (nodeId.startsWith('log_')) module = 'logic_thread'
    else if (nodeId.startsWith('snp_')) module = 'snap_gap'
    else if (nodeId.startsWith('tap_')) module = 'tap_clues'
    else if (nodeId.startsWith('fac_')) module = 'fact_scanner'

    if (!module) return

    localStorage.removeItem(`critica_session__${module}__${nodeId}`)

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

    let module = ''
    if (nodeId.startsWith('log_')) module = 'logic_thread'
    else if (nodeId.startsWith('snp_')) module = 'snap_gap'
    else if (nodeId.startsWith('tap_')) module = 'tap_clues'
    else if (nodeId.startsWith('fac_')) module = 'fact_scanner'

    if (!module) return 0

    try {
      const raw = localStorage.getItem(`critica_session__${module}__${nodeId}`)
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

  const activeTabCfg =
    TABS.find(t => t.id === activeTab) ?? TABS[0]

  // ── Loading state ─────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#1a0000]
      flex items-center justify-center
      font-mono text-[#C4A882] text-sm">
      Loading...
    </div>
  )

  // ── Error state ───────────────────────────
  if (error) return (
    <div className="min-h-screen bg-[#1a0000]
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
    <div
      className="min-h-screen text-[#F4E6CC] font-serif"
      style={{ background: `
        radial-gradient(ellipse 35% 80% at 0% 70%, #6a1010 0%, transparent 100%),
        radial-gradient(ellipse 35% 80% at 100% 70%, #6a1010 0%, transparent 100%),
        radial-gradient(ellipse 100% 35% at 50% 100%, #6a1010 0%, transparent 100%),
        radial-gradient(ellipse 60% 60% at 50% 50%, #5a1010 0%, transparent 70%),
        #1a0000
      `.replace(/\s+/g, ' ') }}>

      {/* ── TOPBAR ── */}
      <header className="h-[52px] bg-transparent
        flex items-center justify-end gap-9 px-9">

        <div className="flex items-center gap-2
          font-mono text-xs text-[#D4B896]">
          <span>🔥</span>
          <strong>Streak:</strong>
          &nbsp;{dashboard?.streak ?? 0} Days
        </div>

        <div className="flex items-center gap-2
          font-mono text-xs text-[#D4B896]">
          <span>⭐</span>
          <strong>Nodes:</strong>
          &nbsp;{dashboard?.completed_count ?? 0}
          &nbsp;Completed
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2
              font-mono text-xs text-[#D4B896]
              hover:text-[#F4E6CC] cursor-pointer
              transition-colors">
            <span>👤</span>
            {dashboard?.first_name && dashboard?.last_name
              ? `${dashboard.first_name} ${dashboard.last_name}`
              : (dashboard?.username ?? 'Student')}
          </button>
          {showMenu && (
            <div className="absolute top-full
              right-0 mt-2 bg-[#2a0a00]
              border border-[#5a2010] rounded-sm
              shadow-lg z-50 min-w-[150px]">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4
                  py-2 text-xs font-mono text-[#D4B896]
                  hover:bg-[#3a1010]
                  hover:text-[#F4E6CC] transition-colors">
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── SPACER ── */}
      <div className="h-8 bg-transparent" />

      {/* ── BODY ── */}
      <div className="flex justify-center px-6
        h-[calc(100vh-52px-32px)] bg-transparent">

        {/* ── CENTER CONTAINER ── */}
        <div className="w-full max-w-7xl flex
          items-start gap-3">

          {/* ── LEFT COLUMN (tabs + folder) ── */}
          <div className="flex-1 flex flex-col
            min-w-0 h-full">

          {/* ── TABS ── */}
          <div className="flex items-end
            flex-shrink-0 bg-transparent">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() =>
                    setActiveTab(tab.id)}
                  className={`flex items-center
                    justify-center font-mono text-xs
                    font-bold uppercase tracking-wider
                    border-none outline-none px-6
                    whitespace-pre-wrap text-center
                    transition-all cursor-pointer
                    ${isActive
                      ? 'bg-[#F2DEC1] text-[#432818] h-[64px] rounded-t-lg'
                      : 'bg-[#C49A5A] text-[#432818] hover:bg-[#B8905A] hover:text-[#1a0000] h-[52px] rounded-t-lg'
                    }`}>
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* ── CONTENT PANEL ── */}
          <div className="flex-1 bg-[#F2DEC1]
            rounded-tr-xl
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
              <div className="mb-6">
                {/* Outlined header box — centered */}
                <div className="flex justify-center mb-3">
                  <div className="border-[1.5px] border-[#6A381F]
                    px-8 py-[5px] font-mono text-[10px]
                    tracking-widest text-[#432818]
                    bg-transparent whitespace-nowrap">
                    OFFICIAL STUDENT DASHBOARD DOCUMENT
                  </div>
                </div>
                {/* Stamp row: line / stamp / line */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-[1.5px] bg-[#C49A5A] opacity-80" />
                  <div
                    className="border-[2.5px] border-[#6A381F]
                      px-4 py-[5px] font-mono text-xs font-bold
                      uppercase tracking-widest text-[#432818]
                      bg-transparent whitespace-nowrap"
                    style={{ transform: 'rotate(-1.5deg)' }}>
                    {activeTabCfg.header}
                  </div>
                  <div className="flex-1 h-[1.5px] bg-[#C49A5A] opacity-80" />
                </div>
              </div>

              {/* Empty state */}
              {activeNodes.length === 0 && (
                <div className="font-mono text-xs
                  text-[#8C6A4A] text-center py-10">
                  No nodes available for this module.
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

                      {/* Card */}
                      <div className={`flex-1
                        border border-[#C4A882]/50
                        rounded-lg pl-10 pr-4 py-4
                        text-[#432818]
                        relative min-w-0
                        ${isDone
                          ? 'bg-[#EDE0C4]'
                          : isLocked
                          ? 'bg-[#EDE0C4] opacity-60'
                          : 'bg-[#FFF8ED]'
                        }`}>

                        {/* Binder punch holes — inside left edge */}
                        <div className="absolute left-3 top-0 h-full flex flex-col justify-evenly items-center pointer-events-none z-10">
                          <div className="w-[12px] h-[12px] rounded-full border-2 border-[#C4A882]/60" style={{background:'rgba(196,168,130,0.15)'}} />
                          <div className="w-[12px] h-[12px] rounded-full border-2 border-[#C4A882]/60" style={{background:'rgba(196,168,130,0.15)'}} />
                          <div className="w-[12px] h-[12px] rounded-full border-2 border-[#C4A882]/60" style={{background:'rgba(196,168,130,0.15)'}} />
                        </div>


                        {/* Top row */}
                        <div className="flex
                          justify-between
                          items-center mb-2">
                          <div className="flex
                            items-center gap-2">
                            <div className="w-6 h-6
                              bg-[#432818] rounded-sm
                              flex items-center
                              justify-center
                              text-[#F4E6CC] text-xs
                              flex-shrink-0">
                              {isLocked
                                ? '🔒'
                                : meta.icon}
                            </div>
                            <div className="font-mono
                              text-xs font-bold
                              uppercase tracking-wider
                              text-[#432818]">
                              {meta.title}
                            </div>
                          </div>

                          {/* Status badge */}
                          <div className={`font-mono
                            text-[10px] tracking-wider
                            px-[6px] py-[2px]
                            border uppercase
                            flex-shrink-0
                            ${isDone
                              ? 'text-[#16a34a] border-[#16a34a]'
                              : isReady
                              ? 'text-[#0891b2] border-[#0891b2]'
                              : 'text-[#A08868] border-[#A08868]'
                            }`}>
                            {isDone
                              ? 'COMPLETED / DONE'
                              : isReady
                              ? 'UNLOCKED / ACTIVE'
                              : 'LOCKED'}
                          </div>
                        </div>

                        {/* Divider under title row */}
                        <div className="h-px bg-[#C4A882] mb-3 opacity-60" />

                        {/* Focus description */}
                        <p className="text-xs
                          leading-relaxed
                          text-[#6A381F] mb-4">
                          {meta.focus}
                        </p>

                        {/* Progress bar — full width, no bullet */}
                        <div
                          className="h-[8px] rounded-none mb-3 overflow-hidden"
                          style={{ background: isDone ? 'rgba(0,0,0,0.25)' : 'black' }}>
                          <div
                            className="h-full rounded-none transition-all"
                            style={{
                              width: `${100 - getNodeProgress(node.node_id)}%`,
                              marginLeft: 'auto',
                              background: isDone ? 'rgba(212,196,160,0.45)' : '#D4C4A0',
                            }} />
                        </div>

                        {/* Footer */}
                        <div className="flex
                          justify-between items-end">
                          <div className="font-mono
                            text-[10px] text-[#6A381F]
                            leading-5">
                            PROGRESS —{' '}
                            {getNodeProgress(node.node_id)}%
                            <br />
                            {Math.round(getNodeProgress(node.node_id) / 100 * 5)}/5 EXERCISES
                          </div>

                          <div className="flex gap-3 items-end">
                            {!isDone && getNodeProgress(node.node_id) > 0 && (
                              <button
                                onClick={() => handleResetNode(node.node_id)}
                                className="font-mono text-[10px] font-bold uppercase tracking-wider text-red-800 hover:text-red-900 transition-all cursor-pointer bg-transparent border-none outline-none p-0"
                              >
                                RESET
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
                              className={`font-mono
                                text-[13px] font-bold
                                uppercase tracking-wide
                                text-center leading-snug
                                flex-shrink-0
                                whitespace-pre-wrap
                                px-4 py-3
                                rounded-xl
                                border border-[#D4C0A0]/40
                                transition-all
                                ${isLocked
                                  ? 'bg-[#EDE5D5] text-[#A08868] cursor-not-allowed'
                                  : isDone
                                  ? 'bg-[#FFF8EC] text-[#432818] cursor-pointer hover:bg-[#DDD0B8]'
                                  : 'bg-[#FFF8EC] text-[#432818] cursor-pointer hover:bg-[#EDE0C4]'
                                }`}
                            >
                               {isDone
                                 ? 'RESET\nNODE'
                                 : isLocked
                                 ? 'LOCKED'
                                 : getNodeProgress(node.node_id) > 0
                                 ? 'CONTINUE\nTRAINING'
                                 : 'PULL PAPER &\nSTART TRAINING'}
                            </button>
                          </div>
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
                              text-4xl text-[#4a7a2e]
                              border-4 border-[#4a7a2e]
                              px-3 opacity-[0.72]
                              whitespace-nowrap
                              tracking-wider">
                              COMPLETED
                            </div>
                          </div>
                        )}
                      </div>
                    </div>


                  </div>
                )
              })}


            </div>

            {/* Scroll dots */}
            <div className="w-8 flex flex-col
              items-center justify-between
              py-[30px] flex-shrink-0 pr-1">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full
                    bg-[#9E8E7A]
                    cursor-pointer
                    transition-all hover:bg-[#7A6A5A]"
                  style={{
                    opacity:
                      Math.abs(
                        (i / 7) * 100 - scrollPos
                      ) < 20 ? 1 : 0.65,
                  }} />
              ))}
            </div>
          </div>
        </div>

        {/* ── SIDEBAR ── */}
        <aside className="w-[240px] flex-shrink-0
          bg-transparent
          flex flex-col gap-3 pt-[64px]
          overflow-y-auto h-full">
          {[
            {
              icon:    '📋',
              label:   'LEXICAL\nCLIPBOAD',
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
              className="flex-1 bg-[#E8D8B8]
                rounded flex flex-row
                items-start gap-3 px-4 py-4
                cursor-pointer min-h-[110px]
                transition-all hover:bg-[#F0E4C4]
                border border-[#C49A5A]">
              <div className="text-xl text-[#432818]
                flex-shrink-0 mt-0.5">
                {item.icon}
              </div>
              <div className="font-mono text-xs
                font-bold uppercase tracking-wider
                text-[#432818] leading-relaxed
                text-left whitespace-pre-line">
                {item.label}
              </div>
            </div>
          ))}
        </aside>
        </div>{/* end center container */}
      </div>{/* end body */}
    </div>
  )
}