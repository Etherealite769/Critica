'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Volume1, Disc, MousePointerClick } from 'lucide-react';
import {
  isSfxMuted as checkSfxMuted,
  setSfxMuted,
  playClickSound,
  playRightAnswerSound,
  playWrongSound,
  playVictorySound,
} from '@/lib/sound-effects';
import styles from './theme-audio.module.css';

interface ThemeMusicPlayerProps {
  className?: string;
}

export default function ThemeMusicPlayer({ className = '' }: ThemeMusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Theme Music (BGM) State
  const [isThemeMuted, setIsThemeMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [themeVolume, setThemeVolume] = useState(0.35);

  // SFX State
  const [isSfxMuted, setIsSfxMutedState] = useState(false);
  const [sfxVolume, setSfxVolume] = useState(0.6);

  // Flyout State
  const [showSlider, setShowSlider] = useState(false);

  // Initialize state from localStorage
  useEffect(() => {
    try {
      const storedThemeMuted = localStorage.getItem('critica_theme_muted');
      if (storedThemeMuted !== null) {
        setIsThemeMuted(storedThemeMuted === 'true');
      }

      const storedThemeVol = localStorage.getItem('critica_theme_volume');
      if (storedThemeVol !== null) {
        const parsed = parseFloat(storedThemeVol);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          setThemeVolume(parsed);
        }
      }

      setIsSfxMutedState(checkSfxMuted());

      const storedSfxVol = localStorage.getItem('critica_sfx_volume');
      if (storedSfxVol !== null) {
        const parsedSfx = parseFloat(storedSfxVol);
        if (!isNaN(parsedSfx) && parsedSfx >= 0 && parsedSfx <= 1) {
          setSfxVolume(parsedSfx);
        }
      }
    } catch {}

    const handleSfxMuteChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ muted: boolean }>;
      if (customEvent.detail) {
        setIsSfxMutedState(customEvent.detail.muted);
      }
    };

    window.addEventListener('critica_sfx_mute_changed', handleSfxMuteChange);
    return () => window.removeEventListener('critica_sfx_mute_changed', handleSfxMuteChange);
  }, []);

  // Update audio element properties when volume or mute changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = isThemeMuted ? 0 : themeVolume;
    audio.muted = isThemeMuted;
    audio.loop = true;
  }, [isThemeMuted, themeVolume]);

  // Autoplay handler with browser policy resilience
  const attemptPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.loop = true;
    audio.volume = isThemeMuted ? 0 : themeVolume;
    audio.muted = isThemeMuted;

    audio
      .play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch(() => {
        setIsPlaying(false);

        const handleUserGesture = () => {
          if (audioRef.current) {
            audioRef.current.loop = true;
            audioRef.current
              .play()
              .then(() => setIsPlaying(true))
              .catch(() => {});
          }
          window.removeEventListener('pointerdown', handleUserGesture);
          window.removeEventListener('keydown', handleUserGesture);
        };

        window.addEventListener('pointerdown', handleUserGesture, { once: true });
        window.addEventListener('keydown', handleUserGesture, { once: true });
      });
  }, [isThemeMuted, themeVolume]);

  useEffect(() => {
    attemptPlay();
  }, [attemptPlay]);

  // Close flyout when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSlider(false);
      }
    };

    if (showSlider) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSlider]);

  // Toggle Theme Song Mute
  const toggleThemeMute = () => {
    const nextMuted = !isThemeMuted;
    setIsThemeMuted(nextMuted);

    try {
      localStorage.setItem('critica_theme_muted', String(nextMuted));
    } catch {}

    const audio = audioRef.current;
    if (audio) {
      audio.muted = nextMuted;
      audio.volume = nextMuted ? 0 : themeVolume;
      if (!nextMuted) {
        audio.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  // Toggle SFX Mute
  const toggleSfxMute = () => {
    const nextMuted = !isSfxMuted;
    setIsSfxMutedState(nextMuted);
    setSfxMuted(nextMuted);

    if (!nextMuted) {
      // Audio confirmation when unmuting SFX
      playClickSound(true);
    }
  };

  // Change Theme volume
  const handleThemeVolumeChange = (newVol: number) => {
    setThemeVolume(newVol);
    try {
      localStorage.setItem('critica_theme_volume', String(newVol));
    } catch {}

    if (newVol > 0 && isThemeMuted) {
      setIsThemeMuted(false);
      try {
        localStorage.setItem('critica_theme_muted', 'false');
      } catch {}
    }

    const audio = audioRef.current;
    if (audio) {
      audio.volume = newVol;
      audio.muted = false;
      if (audio.paused) {
        audio.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  // Change SFX volume
  const handleSfxVolumeChange = (newVol: number) => {
    setSfxVolume(newVol);
    try {
      localStorage.setItem('critica_sfx_volume', String(newVol));
    } catch {}

    if (newVol > 0 && isSfxMuted) {
      setIsSfxMutedState(false);
      setSfxMuted(false);
    }
  };

  const ThemeVolumeIcon = isThemeMuted || themeVolume === 0 ? VolumeX : themeVolume < 0.4 ? Volume1 : Volume2;
  const SfxVolumeIcon = isSfxMuted ? VolumeX : MousePointerClick;

  return (
    <div ref={containerRef} className={`${styles.audioWidget} ${className}`}>
      {/* Hidden audio element with multiple source fallbacks */}
      <audio
        ref={audioRef}
        loop
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }
        }}>
        <source src="/theme_music/Critica%20Theme%20Song.mp3" type="audio/mpeg" />
        <source src="/theme_music/critica-theme.mp3" type="audio/mpeg" />
        <source src="/api/theme-music" type="audio/mpeg" />
      </audio>

      {/* ── Theme Music Mute/Toggle Button ── */}
      <button
        type="button"
        onClick={toggleThemeMute}
        className={`${styles.playerBtn} ${
          isThemeMuted ? styles.playerBtnMuted : isPlaying ? styles.playerBtnActive : ''
        }`}
        title={
          isThemeMuted
            ? 'Bureau Theme: Muted (Click to Unmute)'
            : 'Bureau Theme: Playing Looped (Click to Mute)'
        }
        aria-label={isThemeMuted ? 'Unmute theme song' : 'Mute theme song'}>
        <ThemeVolumeIcon
          size={13}
          className={
            isThemeMuted
              ? 'text-[var(--crimson)]'
              : isPlaying
              ? 'text-[var(--amber)] animate-pulse'
              : 'text-[var(--parchment)]'
          }
          aria-hidden
        />

        {/* Animated equalizer bars */}
        <span
          className={`${styles.equalizer} ${isThemeMuted ? styles.equalizerMuted : ''}`}
          aria-hidden>
          <span className={styles.eqBar} />
          <span className={styles.eqBar} />
          <span className={styles.eqBar} />
        </span>

        <span className="hidden xl:inline font-mono tracking-wider text-[10px]">
          THEME
        </span>

        <span
          className={`text-[9px] px-1 py-0.2 rounded font-mono ${
            isThemeMuted
              ? 'bg-[var(--crimson)]/20 text-[#e06c75] border border-[var(--crimson)]/40'
              : 'bg-[var(--lime)]/15 text-[var(--lime-bright)] border border-[var(--lime)]/30'
          }`}>
          {isThemeMuted ? 'MUTED' : 'LOOP'}
        </span>
      </button>

      {/* ── SFX Mute/Toggle Button ── */}
      <button
        type="button"
        onClick={toggleSfxMute}
        className={`${styles.playerBtn} ${
          isSfxMuted ? styles.playerBtnMuted : styles.playerBtnActive
        }`}
        title={
          isSfxMuted
            ? 'Sound Effects (SFX): Muted (Click to Unmute)'
            : 'Sound Effects (SFX): Active (Click to Mute)'
        }
        aria-label={isSfxMuted ? 'Unmute sound effects' : 'Mute sound effects'}>
        <SfxVolumeIcon
          size={13}
          className={isSfxMuted ? 'text-[var(--crimson)]' : 'text-[var(--amber)]'}
          aria-hidden
        />

        <span className="hidden xl:inline font-mono tracking-wider text-[10px]">
          SFX
        </span>

        <span
          className={`text-[9px] px-1 py-0.2 rounded font-mono ${
            isSfxMuted
              ? 'bg-[var(--crimson)]/20 text-[#e06c75] border border-[var(--crimson)]/40'
              : 'bg-[var(--lime)]/15 text-[var(--lime-bright)] border border-[var(--lime)]/30'
          }`}>
          {isSfxMuted ? 'MUTED' : 'ON'}
        </span>
      </button>

      {/* ── Audio Settings Flyout Button ── */}
      <button
        type="button"
        onClick={() => setShowSlider((prev) => !prev)}
        className="p-1 text-[var(--manila)]/60 hover:text-[var(--parchment)] transition-colors rounded cursor-pointer"
        title="Adjust Audio Levels & SFX"
        aria-label="Audio settings">
        <Disc size={13} className={isPlaying && !isThemeMuted ? 'animate-spin' : ''} style={{ animationDuration: '4s' }} />
      </button>

      {/* ── Comprehensive Audio Flyout ── */}
      {showSlider && (
        <div className={styles.volumeFlyout} role="dialog" aria-label="Audio Controls">
          {/* THEME MUSIC SECTION */}
          <div className={styles.flyoutHeader}>
            <span>BUREAU THEME OST</span>
            <span className={styles.loopBadge}>{isThemeMuted ? 'MUTED' : 'LOOPED'}</span>
          </div>

          <div className={styles.sliderRow}>
            <button
              type="button"
              onClick={toggleThemeMute}
              className="text-xs text-[var(--parchment)] hover:text-white cursor-pointer"
              title={isThemeMuted ? 'Unmute Theme' : 'Mute Theme'}>
              <ThemeVolumeIcon size={13} className={isThemeMuted ? 'text-[var(--crimson)]' : 'text-[var(--amber)]'} />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isThemeMuted ? 0 : themeVolume}
              onChange={(e) => handleThemeVolumeChange(parseFloat(e.target.value))}
              className={styles.volumeSlider}
              aria-label="Theme Volume slider"
            />
            <span className={styles.volumePct}>
              {isThemeMuted ? '0%' : `${Math.round(themeVolume * 100)}%`}
            </span>
          </div>

          <div className={styles.divider} />

          {/* SFX SECTION */}
          <div className={styles.flyoutHeader}>
            <span>CLICK SOUND EFFECTS</span>
            <span className={styles.sfxBadge}>{isSfxMuted ? 'MUTED' : 'ACTIVE'}</span>
          </div>

          <div className={styles.sliderRow}>
            <button
              type="button"
              onClick={toggleSfxMute}
              className="text-xs text-[var(--parchment)] hover:text-white cursor-pointer"
              title={isSfxMuted ? 'Unmute SFX' : 'Mute SFX'}>
              {isSfxMuted ? (
                <VolumeX size={13} className="text-[var(--crimson)]" />
              ) : (
                <MousePointerClick size={13} className="text-[var(--amber)]" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isSfxMuted ? 0 : sfxVolume}
              onChange={(e) => handleSfxVolumeChange(parseFloat(e.target.value))}
              className={styles.volumeSlider}
              aria-label="SFX Volume slider"
            />
            <span className={styles.volumePct}>
              {isSfxMuted ? '0%' : `${Math.round(sfxVolume * 100)}%`}
            </span>
          </div>

          <div className={styles.testRow} style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', opacity: 0.65, marginRight: 'auto', fontFamily: 'monospace' }}>Test SFX:</span>
            <button
              type="button"
              onClick={() => playClickSound(true)}
              className={styles.testBtn}
              title="Test the click sound effect">
              Click
            </button>
            <button
              type="button"
              onClick={() => playRightAnswerSound(true)}
              className={styles.testBtn}
              title="Test right answer sound effect">
              ✓ Right
            </button>
            <button
              type="button"
              onClick={() => playWrongSound(true)}
              className={styles.testBtn}
              title="Test wrong answer sound effect">
              ✗ Wrong
            </button>
            <button
              type="button"
              onClick={() => playVictorySound(true)}
              className={styles.testBtn}
              title="Test victory sound effect">
              ★ Victory
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
