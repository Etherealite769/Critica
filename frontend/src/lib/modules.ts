// Official detective discipline titles, keyed by backend module id.
// Single source for the dashboard tabs, Metric Log and any other module label.

export type ModuleKey = 'logic_thread' | 'snap_gap' | 'tap_clues' | 'fact_scanner';

export const MODULE_KEYS: ModuleKey[] = ['logic_thread', 'snap_gap', 'tap_clues', 'fact_scanner'];

export const MODULE_TITLES: Record<ModuleKey, string> = {
  logic_thread: 'Forensic Textual Analysis',
  snap_gap:     'Scene Reconstruction',
  tap_clues:    'Clue Extraction',
  fact_scanner: 'Witness Cross Examination',
};

/** Title for a module id, falling back to the raw id for unknown modules. */
export function moduleTitle(key: string): string {
  return MODULE_TITLES[key as ModuleKey] ?? key;
}
