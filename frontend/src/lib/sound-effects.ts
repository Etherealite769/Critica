// Sound effect utility for Critica bureau dashboard interactions

let clickAudioPool: HTMLAudioElement[] = [];
const POOL_SIZE = 4;
let poolIndex = 0;

function getAudioElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;

  if (clickAudioPool.length === 0) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const audio = new Audio('/theme_music/Clicking%20the%20select%20box.mp3');
      audio.preload = 'auto';
      clickAudioPool.push(audio);
    }
  }

  const audio = clickAudioPool[poolIndex];
  poolIndex = (poolIndex + 1) % POOL_SIZE;
  return audio;
}

/**
 * Checks whether sound effects are currently muted.
 */
export function isSfxMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('critica_sfx_muted') === 'true';
}

/**
 * Updates SFX mute state and dispatches sync event.
 */
export function setSfxMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('critica_sfx_muted', String(muted));
    window.dispatchEvent(new CustomEvent('critica_sfx_mute_changed', { detail: { muted } }));
  } catch {}
}

/**
 * Toggles SFX mute state and returns the new muted state.
 */
export function toggleSfxMute(): boolean {
  const next = !isSfxMuted();
  setSfxMuted(next);
  return next;
}

/**
 * Plays the "Clicking the select box" sound effect.
 * Respects the user's SFX mute setting and volume preference.
 */
export function playClickSound(forcePlay: boolean = false) {
  if (typeof window === 'undefined') return;

  try {
    if (!forcePlay && isSfxMuted()) return;

    const storedSfxVol = localStorage.getItem('critica_sfx_volume');
    const storedThemeVol = localStorage.getItem('critica_theme_volume');
    const volStr = storedSfxVol !== null ? storedSfxVol : storedThemeVol;
    const volume = volStr !== null ? parseFloat(volStr) : 0.6;
    if (volume <= 0) return;

    const audio = getAudioElement();
    if (audio) {
      audio.volume = Math.min(1, Math.max(0.05, volume));
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Fallback with direct encoded path if needed
        const fallback = new Audio('/theme_music/Clicking%20the%20select%20box.mp3');
        fallback.volume = Math.min(1, Math.max(0.05, volume));
        fallback.play().catch(() => {});
      });
    }
  } catch {
    // Ignore audio playback exceptions silently
  }
}
