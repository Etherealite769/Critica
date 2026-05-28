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
const NODE_META: Record<string,{
  title: string; focus: string; icon: string
}> = {
  log_node_01: {
    title: 'Narration Patterns',
    focus: 'Mapping the narration pattern of '
           + 'text development',
    icon:  '⊕',
  },
  log_node_02: {
    title: 'Definition Patterns',
    focus: 'Mapping the definition pattern of '
           + 'text development',
    icon:  '⊕',
  },
  log_node_03: {
    title: 'Comparison & Contrast Patterns',
    focus: 'Mapping both comparison and contrast '
           + 'patterns of text development',
    icon:  '⊕',
  },
  log_node_04: {
    title: 'Cause and Effect Patterns',
    focus: 'Mapping the cause-effect pattern of '
           + 'text development',
    icon:  '⊕',
  },
  snp_node_01: {
    title: 'Addition & Sequence Transitions',
    focus: 'Transitions like furthermore, next',
    icon:  '⊞',
  },
  snp_node_02: {
    title: 'Contrast & Opposition Transitions',
    focus: 'Transitions like however, '
           + 'on the other hand',
    icon:  '⊞',
  },
  snp_node_03: {
    title: 'Cause & Effect Transitions',
    focus: 'Transitions like therefore, '
           + 'consequently',
    icon:  '⊞',
  },
  snp_node_04: {
    title: 'Conclusion Signal Transitions',
    focus: 'Transitions like ultimately, '
           + 'in conclusion',
    icon:  '⊞',
  },
  tap_node_01: {
    title: 'Synonym Clues',
    focus: 'Finding words nearby with similar '
           + 'meanings',
    icon:  '🔍',
  },
  tap_node_02: {
    title: 'Definition Clues',
    focus: 'Spotting exact definitions embedded '
           + 'in the text',
    icon:  '🔍',
  },
  tap_node_03: {
    title: 'Antonym & Contrast Clues',
    focus: 'Identifying opposite words that hint '
           + 'at meaning',
    icon:  '🔍',
  },
  tap_node_04: {
    title: 'Example & Inference Clues',
    focus: 'Deducing meaning from scenarios '
           + 'described nearby',
    icon:  '🔍',
  },
  fac_node_01: {
    title: 'Currency',
    focus: 'Identifying outdated information',
    icon:  '🔎',
  },
  fac_node_02: {
    title: 'Relevance',
    focus: 'Spotting off-topic or mismatched '
           + 'information',
    icon:  '🔎',
  },
  fac_node_03: {
    title: 'Authority',
    focus: 'Highlighting unsupported claims '
           + 'or missing credentials',
    icon:  '🔎',
  },
  fac_node_04: {
    title: 'Accuracy',
    focus: 'Identifying factual errors or '
           + 'unverified data',
    icon:  '🔎',
  },
  fac_node_05: {
    title: 'Purpose',
    focus: 'Quarantining extreme bias '
           + 'or hidden agendas',
    icon:  '🔎',
  },
}

// ── Tabs ────────────────────────────────────────
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

// ── Component ───────────────────────────────────
export default function StudentDashboard() {
  const router = useRouter()

  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null)
  const [activeTab, setActiveTab] =
    useState('logic_thread')
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [scrollPos, setScrollPos] = useState(0)
  const [showMenu, setShowMenu] = useState(false)

  // Load dashboard
    useEffect(() => {
    const load = async () => {
      try {
        const d = await apiFetch('/progression/dashboard/')
        setDashboard(d)
      } catch (e: any) {
        const code = e?.code ?? e?.detail?.code ?? ''
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

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    router.push('/auth')
  }

  const handleStartNode = (
    route_base: string,
    node_id: string,
    nodeStatus: string,
  ) => {
    if (nodeStatus === 'locked') return
    router.push(`${route_base}/${node_id}`)
  }

  const getActiveNodes = (): NodeStatus[] => {
    if (!dashboard) return []
    const mod = dashboard.module_status[
      activeTab as keyof typeof
        dashboard.module_status
    ]
    return mod?.nodes ?? []
  }

  const isTabUnlocked = (tab_id: string) => {
    if (!dashboard) return false
    return dashboard.module_status[
      tab_id as keyof typeof
        dashboard.module_status
    ]?.module_unlocked ?? false
  }

  const activeTabCfg = TABS.find(
    t => t.id === activeTab) ?? TABS[0]

  if (loading) return (
    <div className="min-h-screen bg-[#1e1e1e]
      flex items-center justify-center
      font-mono text-[#aaa] text-sm">
      Loading...
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-[#1e1e1e]
      flex items-center justify-center
      font-mono text-red-400 text-sm gap-4
      flex-col">
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

      {/* TOPBAR */}
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

      {/* SPACER */}
      <div className="h-20 bg-[#2b2b2b]" />

      {/* BODY */}
      <div className="flex
        h-[calc(100vh-52px-80px)] bg-[#2b2b2b]">

        {/* LEFT */}
        <div className="flex-1 flex flex-col
          min-w-0">

          {/* TABS */}
          <div className="flex items-end
            flex-shrink-0 bg-[#2b2b2b]">
            {TABS.map(tab => {
              const unlocked = isTabUnlocked(tab.id)
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  disabled={!unlocked}
                  onClick={() => {
                    if (unlocked)
                      setActiveTab(tab.id)
                  }}
                  className={`px-7 flex items-center
                    justify-center font-mono text-xs
                    font-bold uppercase tracking-wider
                    border-none outline-none
                    whitespace-pre-wrap text-center
                    transition-all
                    ${isActive
                      ? 'bg-[#c8c4bc] text-[#111] h-[60px]'
                      : unlocked
                      ? 'bg-[#444] text-[#aaa] hover:bg-[#505050] hover:text-[#ccc] h-[52px]'
                      : 'bg-[#333] text-[#555] cursor-not-allowed h-[52px]'
                    }`}>
                  {!unlocked && (
                    <span className="mr-1 text-[10px]">
                      🔒
                    </span>
                  )}
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* CONTENT */}
          <div className="flex-1 bg-[#c8c4bc]
            overflow-hidden flex">
            <div
              className="flex-1 overflow-y-auto
                px-9 pt-[30px] pb-[30px]"
              onScroll={e =>
                setScrollPos(
                  (e.currentTarget.scrollTop /
                    (e.currentTarget.scrollHeight
                     - e.currentTarget.clientHeight))
                  * 100
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
                  <div className="w-3 h-3 rounded-full
                    bg-[#888] border-2 border-[#aaa]
                    flex-shrink-0" />
                </div>
              )}

              {/* NODE CARDS */}
              {activeNodes.map((node, idx) => {
                const meta = NODE_META[node.node_id]
                if (!meta) return null
                const isDone  =
                  node.status === 'completed'
                const isReady =
                  node.status === 'unlocked'
                const isLocked=
                  node.status === 'locked'

                return (
                  <div key={node.node_id}>
                    <div className="flex items-start
                      gap-2.5 mb-1.5">
                      <div className="w-[14px]
                        h-[14px] rounded-full
                        bg-[#888] border-2
                        border-[#aaa]
                        flex-shrink-0 mt-[14px]"/>

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
                              uppercase
                              tracking-wider">
                              {meta.title}
                            </div>
                          </div>
                          <div className={`font-mono
                            text-xs tracking-wider
                            px-[7px] py-[3px]
                            border uppercase
                            flex-shrink-0
                            ${isDone
                              ? 'text-[#4ddd94] border-[#4ddd94]'
                              : isReady
                              ? 'text-[#55aaff] border-[#55aaff]'
                              : 'text-[#888] border-[#888]'
                            }`}>
                            {isDone
                              ? 'COMPLETED / DONE'
                              : isReady
                              ? 'UNLOCKED / ACTIVE'
                              : 'LOCKED'}
                          </div>
                        </div>

                        {/* Focus */}
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

                        {/* Progress */}
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
                            }}/>
                        </div>

                        {/* Footer */}
                        <div className="flex
                          justify-between
                          items-end">
                          <div className="font-mono
                            text-[10px] text-[#555]
                            leading-6">
                            PROGRESS —{' '}
                            {isDone ? '100' : '0'}%
                            <br />
                            {node.node_id.toUpperCase()}
                          </div>
                          <button
                            disabled={isLocked}
                            onClick={() =>
                              handleStartNode(
                                activeTabCfg.route_base,
                                node.node_id,
                                node.status,
                              )
                            }
                            className={`font-mono
                              text-xs font-bold
                              uppercase tracking-wider
                              px-4 py-[9px]
                              border-[1.5px]
                              border-[#888]
                              leading-snug
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

                    {/* Bullets between */}
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
                  }}/>
              ))}
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
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