// Audio state synchronizer for Critica bureau dashboard and profile settings

export const THEME_MUTED_KEY = 'critica_theme_muted';
export const THEME_VOLUME_KEY = 'critica_theme_volume';
export const SFX_MUTED_KEY = 'critica_sfx_muted';
export const SFX_VOLUME_KEY = 'critica_sfx_volume';

export const EVT_THEME_MUTE_CHANGED = 'critica_theme_mute_changed';
export const EVT_THEME_VOLUME_CHANGED = 'critica_theme_volume_changed';
export const EVT_SFX_MUTE_CHANGED = 'critica_sfx_mute_changed';
export const EVT_SFX_VOLUME_CHANGED = 'critica_sfx_volume_changed';

export function getThemeMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(THEME_MUTED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setThemeMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THEME_MUTED_KEY, String(muted));
    window.dispatchEvent(new CustomEvent(EVT_THEME_MUTE_CHANGED, { detail: { muted } }));
  } catch {}
}

export function getThemeVolume(): number {
  if (typeof window === 'undefined') return 0.35;
  try {
    const v = localStorage.getItem(THEME_VOLUME_KEY);
    if (v !== null) {
      const parsed = parseFloat(v);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) return parsed;
    }
  } catch {}
  return 0.35;
}

export function setThemeVolume(volume: number): void {
  if (typeof window === 'undefined') return;
  try {
    const clamped = Math.min(1, Math.max(0, volume));
    localStorage.setItem(THEME_VOLUME_KEY, String(clamped));
    window.dispatchEvent(new CustomEvent(EVT_THEME_VOLUME_CHANGED, { detail: { volume: clamped } }));
  } catch {}
}

export function getSfxMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(SFX_MUTED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSfxMutedState(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SFX_MUTED_KEY, String(muted));
    window.dispatchEvent(new CustomEvent(EVT_SFX_MUTE_CHANGED, { detail: { muted } }));
  } catch {}
}

export function getSfxVolume(): number {
  if (typeof window === 'undefined') return 0.6;
  try {
    const v = localStorage.getItem(SFX_VOLUME_KEY);
    if (v !== null) {
      const parsed = parseFloat(v);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) return parsed;
    }
  } catch {}
  return 0.6;
}

export function setSfxVolume(volume: number): void {
  if (typeof window === 'undefined') return;
  try {
    const clamped = Math.min(1, Math.max(0, volume));
    localStorage.setItem(SFX_VOLUME_KEY, String(clamped));
    window.dispatchEvent(new CustomEvent(EVT_SFX_VOLUME_CHANGED, { detail: { volume: clamped } }));
  } catch {}
}
