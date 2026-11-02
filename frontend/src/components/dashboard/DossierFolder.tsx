'use client'

// Manila dossier frame shared by the sidebar reference modals (Quick Review & Field Manual,
// Lexical Clipboard): file tabs above a textured Manila folder, a typewriter header with a
// red stamp and a paper CLOSE FILE button, and a single scrolling body. Geometry follows
// the Metric Log (size-locked shell, tab clip, side paperclip).

import type { CSSProperties, ReactNode } from 'react'
import { FolderOpen, Paperclip, X, type LucideIcon } from 'lucide-react'
import ml from './metric-log.module.css'

export interface DossierTab<T extends string> {
  id: T
  label: string
  icon: LucideIcon
}

interface DossierFolderProps<T extends string> {
  /** id of the <h2>, referenced by aria-labelledby. */
  titleId: string
  /** Small typewriter line above the title, e.g. "CASE FILE // TACTICAL FIELD MANUAL". */
  kicker: string
  title: string
  titleIcon: LucideIcon
  /** Rendered after the title (e.g. a live-sync badge). */
  titleExtra?: ReactNode
  /** Red stamp text without brackets, e.g. "Authorized Reference". */
  stamp: string
  /** Tailwind rotate class for the stamp, e.g. "rotate-[-2deg]". */
  stampRotate: string
  closeTitle: string
  onClose: () => void
  tabs: DossierTab<T>[]
  tabsLabel: string
  activeTab: T
  onSelectTab: (id: T) => void
  /** Floating extras positioned against the folder (e.g. a toast). */
  floating?: ReactNode
  children: ReactNode
}

// Manila paper: soft light across the sheet, aged corners and fibre speckle (as on the Metric Log folder)
const FOLDER_TEXTURE: CSSProperties = {
  backgroundImage: [
    'linear-gradient(160deg, rgba(255,252,240,0.4) 0%, transparent 35%, transparent 70%, rgba(120,90,50,0.08) 100%)',
    'radial-gradient(ellipse at 0 0, rgba(120,90,50,0.12), transparent 35%)',
    'radial-gradient(ellipse at 100% 100%, rgba(120,90,50,0.18), transparent 40%)',
    'radial-gradient(rgba(78,54,41,0.06) 1px, transparent 1.2px)',
    'radial-gradient(rgba(78,54,41,0.04) 1px, transparent 1.2px)',
  ].join(', '),
  backgroundSize: '100% 100%, 100% 100%, 100% 100%, 7px 7px, 11px 11px',
  backgroundPosition: '0 0, 0 0, 0 0, 0 0, 3px 5px',
}

const CLIP = 'absolute -top-3 text-[#8d8a84] drop-shadow-[0_2px_1px_rgba(0,0,0,0.35)] pointer-events-none z-[3]'

// Red pushpin head: glossy highlight top-left, shade bottom-right, cast shadow on the card
export const PIN = 'absolute -top-1.5 w-3 h-3 rounded-full bg-red-700 pointer-events-none ' +
  'shadow-[inset_1px_1px_1px_rgba(255,255,255,0.5),inset_-1px_-1px_2px_rgba(0,0,0,0.45),1px_3px_3px_rgba(0,0,0,0.4),0_0_0_1px_rgba(0,0,0,0.3)]'

/** Red pushpins on an index card's top corners. */
export function CardPins() {
  return (
    <>
      <span className={`${PIN} left-3`} aria-hidden />
      <span className={`${PIN} right-3`} aria-hidden />
    </>
  )
}

export default function DossierFolder<T extends string>({
  titleId, kicker, title, titleIcon: TitleIcon, titleExtra, stamp, stampRotate, closeTitle, onClose,
  tabs, tabsLabel, activeTab, onSelectTab, floating, children,
}: DossierFolderProps<T>) {
  return (
    <div className={ml.overlay} onClick={onClose}>
      <div
        className={ml.shell}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={e => e.stopPropagation()}>

        {/* ── Manila file tabs ── */}
        <div className="flex flex-shrink-0 items-end gap-1 pt-3.5 pl-2 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label={tabsLabel}>
          {tabs.map((t, i) => {
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectTab(t.id)}
                className={`relative flex flex-col items-start justify-center gap-0.5 px-2.5 py-1 font-mono text-left whitespace-nowrap
                  rounded-t-lg border border-b-0 cursor-pointer transition-[filter,min-height]
                  ${active
                    ? 'z-[2] min-h-[46px] -mb-px bg-[#FFFDF7] border-t-2 border-amber-600/70 text-[#1A1A1A] shadow-[0_-4px_12px_rgba(0,0,0,0.3)]'
                    : 'min-h-[40px] bg-[#2B231D] text-[#C2B59B] border-black/35 shadow-[inset_0_-8px_10px_-8px_rgba(0,0,0,0.55)] hover:bg-[#3D322A]'}`}>
                {active && <Paperclip size={18} strokeWidth={1.75} className={ml.tabClip} aria-hidden />}
                <span className={`text-[9px] font-bold tracking-[0.14em] ${active ? 'text-[#a83232]' : 'text-[#8f8170]'}`}>
                  [{i + 1}] SECTION {String(i + 1).padStart(2, '0')}:
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.05em] uppercase">
                  <t.icon size={13} aria-hidden /> {t.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Manila folder body ── */}
        <div className="relative z-[1] flex flex-1 min-h-0 flex-col bg-[#F3E8CB] p-6 rounded-b-lg rounded-tr-lg border border-[#D0C4A8] shadow-2xl" style={FOLDER_TEXTURE}>
          {/* Paperclips clamping the file: top-right corner (clear of the tab row) and right side */}
          <Paperclip size={30} strokeWidth={1.6} className={`${CLIP} right-1 rotate-[20deg]`} aria-hidden />
          <Paperclip size={26} strokeWidth={1.6} className={ml.folderClip} aria-hidden />
          {floating}

          {/* Dossier header */}
          <header className="flex flex-shrink-0 items-center justify-between gap-4 pb-3 border-b border-[rgba(139,115,85,0.35)]">
            <div className="flex flex-col gap-1 min-w-0">
              <span className={ml.kicker}>
                <FolderOpen size={14} aria-hidden /> {kicker}
              </span>
              <div className="flex items-center gap-3 min-w-0">
                <h2 id={titleId} className={ml.title}>
                  <TitleIcon size={15} className="inline -mt-0.5 mr-2" aria-hidden />{title}
                </h2>
                {titleExtra}
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-3 pr-8">
              <span className={`px-2 py-0.5 border-2 border-[#A83232] text-[#A83232] font-mono ${stampRotate} text-[11px] font-extrabold tracking-[0.14em] uppercase whitespace-nowrap rounded-sm mix-blend-multiply select-none`}>
                [ {stamp} ]
              </span>
              <button
                type="button"
                onClick={onClose}
                title={closeTitle}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10.5px] font-bold tracking-[0.08em] uppercase whitespace-nowrap
                  text-[#4e3629] bg-[#FFFDF7] border border-[#D0C4A8] rounded-sm shadow-[0_2px_0_rgba(0,0,0,0.15)]
                  hover:bg-[#4e3629] hover:text-[#f9f6ed] cursor-pointer transition-colors">
                <X size={13} aria-hidden /> Close File
              </button>
            </div>
          </header>

          {/* ── Content Body (the only scroll area) ── */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pt-5 -mr-3 pr-3 [scrollbar-width:thin]" role="tabpanel">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
