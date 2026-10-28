'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Moon, Settings, SunMedium, Volume2, VolumeX, X } from 'lucide-react';
import { isSfxMuted, setSfxMuted, playClickSound } from '@/lib/sound-effects';
import { getThemeMuted, setThemeMuted } from '@/lib/audio-sync';
import { getBureauTheme, setBureauTheme, type BureauTheme } from '@/lib/bureau-theme';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LABEL = 'font-mono text-[10px] font-bold tracking-[0.16em] text-[#8c7a63]';

/** System Preferences: visual theme and sound, filed as a Manila dossier sheet. */
export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  // Mounted only while open, so every opening reads the current preferences
  if (!isOpen) return null;
  return createPortal(<Preferences onClose={onClose} />, document.body);
}

function Preferences({ onClose }: Omit<SettingsModalProps, 'isOpen'>) {
  const [theme, setTheme] = useState<BureauTheme>(getBureauTheme);
  // One switch for all audio: game sound effects and the ambient theme music
  const [muted, setMuted] = useState(() => isSfxMuted() && getThemeMuted());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const chooseTheme = (next: BureauTheme) => {
    playClickSound();
    setTheme(next);
    setBureauTheme(next);
  };

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setSfxMuted(next);
    setThemeMuted(next);
    if (!next) playClickSound(true);   // audible confirmation on unmute
  };

  const themeOption = (value: BureauTheme, title: string, note: string, Icon: typeof Moon) => {
    const active = theme === value;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => chooseTheme(value)}
        className={`flex-1 flex items-start gap-3 p-3 text-left rounded-sm border transition-colors cursor-pointer
          ${active
            ? 'border-[#4e3629] bg-[#4e3629] text-[#f9f6ed] shadow-[0_2px_0_rgba(0,0,0,0.3)]'
            : 'border-[#D0C4A8] bg-[#f6efdc] text-[#2b2016] hover:border-[#a8915f]'}`}>
        <Icon size={18} className={`mt-0.5 flex-shrink-0 ${active ? 'text-[#e0bb6b]' : 'text-[#8c7a63]'}`} aria-hidden />
        <span className="flex flex-col gap-1">
          <span className="font-mono text-[12px] font-bold tracking-[0.08em] uppercase">{title}</span>
          <span className={`text-[11.5px] leading-snug ${active ? 'text-[#e3d6bd]' : 'text-[#6b5a44]'}`}>{note}</span>
        </span>
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[rgba(10,8,6,0.62)]"
      onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[460px] bg-[#FDFBF7] border border-[#D0C4A8] rounded-sm
          shadow-[0_18px_44px_rgba(0,0,0,0.5)] text-[#2b2016]">

        {/* ── Header ── */}
        <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-dashed border-[#D0C4A8]">
          <div className="flex flex-col gap-2">
            <span className="self-start px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.14em] text-[#a83232]
              border-2 border-double border-[#a83232] rounded-sm">
              BUREAU PREFERENCES {'//'} SYSTEM CONFIG
            </span>
            <h2 id="settings-title" className="flex items-center gap-2 font-mono text-[16px] font-bold tracking-[0.1em] uppercase">
              <Settings size={16} className="text-[#4e3629]" aria-hidden /> Settings
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 text-[#8c7a63] hover:text-[#a83232] rounded-sm cursor-pointer transition-colors">
            <X size={16} />
          </button>
        </header>

        <div className="flex flex-col gap-5 px-6 py-5">
          {/* ── Theme ── */}
          <section className="flex flex-col gap-2">
            <span className={LABEL}>VISUAL THEME</span>
            <div role="radiogroup" aria-label="Visual theme" className="flex gap-3">
              {themeOption('manila', 'Manila Dossier', 'Warm desk lamp, aged paper. (Default)', SunMedium)}
              {themeOption('noir', 'Dark Noir', 'Lights down, dimmed files for late shifts.', Moon)}
            </div>
          </section>

          {/* ── Sound ── */}
          <section className="flex flex-col gap-2">
            <span className={LABEL}>SOUND</span>
            <div className="flex items-center justify-between gap-4 p-3 bg-[#f6efdc] border border-[#D0C4A8] rounded-sm">
              <span className="flex items-center gap-3">
                {muted
                  ? <VolumeX size={18} className="text-[#a83232]" aria-hidden />
                  : <Volume2 size={18} className="text-[#4e3629]" aria-hidden />}
                <span className="flex flex-col gap-0.5">
                  <span className="font-mono text-[12px] font-bold tracking-[0.08em] uppercase">Sound Effects &amp; Ambience</span>
                  <span className="text-[11.5px] text-[#6b5a44]">Game sound effects and the Bureau theme music.</span>
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={!muted}
                aria-label="Sound effects and ambient audio"
                onClick={toggleSound}
                className={`relative flex-shrink-0 w-12 h-6 rounded-full border transition-colors cursor-pointer
                  ${muted ? 'bg-[#d9ccad] border-[#bea791]' : 'bg-[#76b852] border-[#5e9a3e]'}`}>
                <span
                  className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-[#FDFBF7] shadow transition-[left]
                    ${muted ? 'left-0.5' : 'left-[26px]'}`}
                  aria-hidden
                />
              </button>
            </div>
          </section>
        </div>

        {/* ── Footer ── */}
        <footer className="flex items-center justify-end gap-3 px-6 py-4 border-t border-dashed border-[#D0C4A8]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 font-mono text-[12px] font-bold tracking-[0.12em] text-[#f9f6ed] bg-[#4e3629]
              border border-[#4e3629] rounded-sm shadow-[0_2px_0_rgba(0,0,0,0.35)] hover:bg-[#3c2d20] cursor-pointer transition-colors">
            DONE
          </button>
        </footer>
      </div>
    </div>
  );
}
