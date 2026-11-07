import type { ActionResult } from '../game/actions';
import type { GameState, Settings } from '../game/types';

export type SceneId =
  | 'office'
  | 'roster'
  | 'clients'
  | 'map'
  | 'ledger'
  | 'police'
  | 'journal'
  | 'settings';

export type ScreenId = SceneId;

export interface SceneContext {
  readonly state: GameState;
  readonly settings: Settings;
  screen: SceneId;
  /** Run an action, report it, burn a slot when the action says so, roll an event. */
  act(run: (state: GameState) => ActionResult): void;
  render(): void;
  open(id: SceneId): void;
  openDossier(girlId: string): void;
  toast(text: string, kind?: 'info' | 'error' | 'money'): void;
  assign(offerId: string, girlId: string | null): void;
  startNight(): void;
  nextDay(): void;
  save(): void;
  finish(): void;
  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void;
  portrait(girlId: string, mood?: 'plain' | 'dim' | 'warm'): string;
}
