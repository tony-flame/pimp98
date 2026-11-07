import { SAVE_VERSION } from './state';
import { girlArchetype } from '../content/girls';
import type { GameState, SaveEnvelope, Settings } from './types';

const SAVE_KEY = 'pimp98.save.v1';
const SETTINGS_KEY = 'pimp98.settings.v1';

export const DEFAULT_SETTINGS: Settings = {
  crt: true,
  scanlines: true,
  sound: true,
  fastBoot: false,
};

function storage(): Storage | null {
  try {
    const probe = '__pimp98_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState): boolean {
  const store = storage();
  if (!store) return false;
  const envelope: SaveEnvelope = {
    kind: 'pimp98-save',
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    state,
  };
  try {
    store.setItem(SAVE_KEY, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

export function hasSave(): boolean {
  const store = storage();
  return !!store?.getItem(SAVE_KEY);
}

export function loadGame(): GameState | null {
  const store = storage();
  if (!store) return null;
  const raw = store.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SaveEnvelope;
    return migrate(parsed);
  } catch {
    return null;
  }
}

export function deleteSave(): void {
  storage()?.removeItem(SAVE_KEY);
}

export function exportSave(state: GameState): string {
  const envelope: SaveEnvelope = {
    kind: 'pimp98-save',
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    state,
  };
  return JSON.stringify(envelope, null, 2);
}

export function importSave(text: string): GameState | null {
  try {
    const parsed = JSON.parse(text) as SaveEnvelope;
    if (parsed?.kind !== 'pimp98-save') return null;
    return migrate(parsed);
  } catch {
    return null;
  }
}

function migrate(envelope: SaveEnvelope): GameState | null {
  if (!envelope?.state || typeof envelope.state.day !== 'number') return null;
  const state = envelope.state;
  // Forward-compatible defaults for older snapshots.
  state.version = SAVE_VERSION;
  for (const g of state.girls ?? []) {
    if (!g.name) g.name = girlArchetype(g.id).name;
  }
  state.flags ??= {};
  state.seenEvents ??= [];
  state.log ??= [];
  state.logSeq ??= state.log.length + 1;
  state.assignments ??= {};
  state.offers ??= [];
  state.ending ??= null;
  state.pendingEvent ??= null;
  state.nightReport ??= null;
  state.stats ??= { nights: 0, totalGross: 0, girlsLost: 0, incidents: 0 };
  if (!state.unlocked) {
    state.unlocked = { station: true, center: false, docks: false };
  }
  return state;
}

export function loadSettings(): Settings {
  const store = storage();
  if (!store) return { ...DEFAULT_SETTINGS };
  const raw = store.getItem(SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  storage()?.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function downloadSave(state: GameState, filename = 'pimp98-save.json'): void {
  const blob = new Blob([exportSave(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
