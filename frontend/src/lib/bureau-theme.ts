// Visual theme for the Bureau: the default Manila dossier, or Dark Noir.
// The choice lives in localStorage and on <html data-bureau-theme>, which the
// desk styles (components/dashboard/desk.module.css) key their noir palette off.

export type BureauTheme = 'manila' | 'noir';

export const BUREAU_THEME_KEY = 'critica_bureau_theme';
export const EVT_BUREAU_THEME_CHANGED = 'critica_bureau_theme_changed';

export function getBureauTheme(): BureauTheme {
  if (typeof window === 'undefined') return 'manila';
  try {
    return localStorage.getItem(BUREAU_THEME_KEY) === 'noir' ? 'noir' : 'manila';
  } catch {
    return 'manila';
  }
}

export function setBureauTheme(theme: BureauTheme): void {
  if (typeof window === 'undefined') return;
  document.documentElement.dataset.bureauTheme = theme;
  try {
    localStorage.setItem(BUREAU_THEME_KEY, theme);
  } catch {}
  window.dispatchEvent(new CustomEvent(EVT_BUREAU_THEME_CHANGED, { detail: { theme } }));
}

/** Runs in <head> before first paint so a noir page never flashes manila. */
export const BUREAU_THEME_INIT_SCRIPT =
  `try{if(localStorage.getItem('${BUREAU_THEME_KEY}')==='noir')document.documentElement.dataset.bureauTheme='noir'}catch(e){}`;
