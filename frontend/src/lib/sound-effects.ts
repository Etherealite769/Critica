// Sound effect utility for Critica bureau dashboard and investigation nodes

const POOL_SIZE = 4;

let clickAudioPool: HTMLAudioElement[] = [];
let rightAudioPool: HTMLAudioElement[] = [];
let wrongAudioPool: HTMLAudioElement[] = [];
let victoryAudioPool: HTMLAudioElement[] = [];

const CLICK_SOURCES = [
  '/theme_music/Clicking%20the%20select%20box.mp3',
  '/theme_music/clicking-select-box.mp3',
  '/api/theme-music?sound=click',
];

const RIGHT_ANSWER_SOURCES = [
  '/theme_music/right%20answer.mp3',
  '/theme_music/right-answer.mp3',
  '/api/theme-music?sound=right',
];

const WRONG_SOURCES = [
  '/theme_music/wrong.mp3',
  '/api/theme-music?sound=wrong',
];

const VICTORY_SOURCES = [
  '/theme_music/Victory%20sound.mp3',
  '/theme_music/victory-sound.mp3',
  '/api/theme-music?sound=victory',
];

function initPool(pool: HTMLAudioElement[], sources: string[], size: number = POOL_SIZE) {
  if (typeof window === 'undefined') return;
  if (pool.length === 0) {
    for (let i = 0; i < size; i++) {
      const audio = new Audio(sources[0]);
      audio.preload = 'auto';
      pool.push(audio);
    }
  }
}

function getSfxVolume(): number {
  if (typeof window === 'undefined') return 0.6;
  try {
    const storedSfxVol = localStorage.getItem('critica_sfx_volume');
    const storedThemeVol = localStorage.getItem('critica_theme_volume');
    const volStr = storedSfxVol !== null ? storedSfxVol : storedThemeVol;
    const volume = volStr !== null ? parseFloat(volStr) : 0.6;
    return isNaN(volume) ? 0.6 : Math.min(1, Math.max(0, volume));
  } catch {
    return 0.6;
  }
}

/**
 * Checks whether sound effects are currently muted.
 */
export function isSfxMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('critica_sfx_muted') === 'true';
  } catch {
    return false;
  }
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

function playFromPool(pool: HTMLAudioElement[], sources: string[], forcePlay: boolean = false) {
  if (typeof window === 'undefined') return;

  try {
    if (!forcePlay && isSfxMuted()) return;

    const volume = getSfxVolume();
    if (volume <= 0) return;

    initPool(pool, sources);

    // Pick an available audio element or the oldest one
    let audio = pool.find((a) => a.paused || a.ended) || pool[0];

    if (!audio) {
      audio = new Audio(sources[0]);
      audio.preload = 'auto';
      pool.push(audio);
    }

    audio.volume = volume;
    audio.currentTime = 0;
    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback to secondary source if primary fails
        if (sources.length > 1) {
          const fallback = new Audio(sources[1]);
          fallback.volume = volume;
          fallback.play().catch(() => {
            if (sources.length > 2) {
              const fallback2 = new Audio(sources[2]);
              fallback2.volume = volume;
              fallback2.play().catch(() => {});
            }
          });
        }
      });
    }
  } catch {
    // Ignore audio playback exceptions silently
  }
}

/**
 * Plays the "Clicking the select box" sound effect.
 */
export function playClickSound(forcePlay: boolean = false) {
  playFromPool(clickAudioPool, CLICK_SOURCES, forcePlay);
}

/**
 * Plays the "right answer" sound effect for correct investigation answers.
 */
export function playRightAnswerSound(forcePlay: boolean = false) {
  playFromPool(rightAudioPool, RIGHT_ANSWER_SOURCES, forcePlay);
}

/**
 * Plays the "wrong" sound effect for incorrect investigation answers.
 */
export function playWrongSound(forcePlay: boolean = false) {
  playFromPool(wrongAudioPool, WRONG_SOURCES, forcePlay);
}

/**
 * Plays the "victory sound" effect when a case session reaches the end or is completed.
 */
export function playVictorySound(forcePlay: boolean = false) {
  playFromPool(victoryAudioPool, VICTORY_SOURCES, forcePlay);
}
