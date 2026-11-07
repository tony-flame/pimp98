/** Core domain types for PIMP 98. Pure data, no DOM. */

export type LocationId = 'station' | 'center' | 'docks';

export type GirlId = 'vika' | 'lena' | 'alisa' | 'rita';

export type ClientKind =
  | 'worker'
  | 'businessman'
  | 'cop'
  | 'gangster'
  | 'journalist'
  | 'romantic';

export type RiskKind = 'none' | 'sting' | 'stiff' | 'raid' | 'scandal';

export type HairStyle = 'bob' | 'long' | 'ponytail' | 'afro' | 'short' | 'bun' | 'wavy' | 'pixie';

export type Outfit = 'blazer' | 'dress' | 'jacket' | 'turtleneck' | 'coat' | 'top';

export type EyeShape = 'round' | 'narrow' | 'wide' | 'tired';

export type Accessory = 'none' | 'earrings' | 'cigarette' | 'glasses' | 'scarf' | 'headphones';

export type Expression = 'neutral' | 'smile' | 'smirk' | 'sad' | 'angry' | 'tired';

export interface PortraitParams {
  seed: number;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  outfit: Outfit;
  outfitColor: string;
  eyes: EyeShape;
  accessory: Accessory;
  expression: Expression;
  bg: string;
}

export type TraitId =
  | 'ambitious'
  | 'gentle'
  | 'cynical'
  | 'fragile'
  | 'loyal'
  | 'greedy'
  | 'sharp'
  | 'scared';

export interface GirlArchetype {
  id: GirlId;
  name: string;
  alias: string;
  age: number;
  tagline: string;
  backstory: string;
  secret: string;
  weakness: string;
  portrait: PortraitParams;
  hireCost: number;
  baseSkill: number;
  baseLoyalty: number;
  baseStress: number;
  baseEndurance: number;
  traits: TraitId[];
  preferredLocation: LocationId;
  startHired: boolean;
  /** Daily wage demanded, paid at night. */
  wage: number;
}

export type Mood = 'ok' | 'inspired' | 'tense' | 'hurt' | 'broken';

export interface GirlState {
  id: GirlId;
  name: string;
  hired: boolean;
  skill: number;
  loyalty: number;
  stress: number;
  endurance: number;
  trust: number;
  mood: Mood;
  daysWorked: number;
  daysIdle: number;
  restUntilDay: number;
  secretKnown: boolean;
  note: string;
}

export interface LocationDef {
  id: LocationId;
  name: string;
  short: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  heatWeight: number;
  riskBias: RiskKind;
  unlockRep: number;
  unlockRespect: number;
  unlockCost: number;
  icon: string;
}

export interface ClientOffer {
  id: string;
  clientName: string;
  kind: ClientKind;
  budget: number;
  demand: string;
  risk: RiskKind;
  riskChance: number;
  minSkill: number;
  location: LocationId;
  day: number;
}

export interface NightLine {
  clientId: string;
  clientName: string;
  girlId: GirlId;
  girlName: string;
  gross: number;
  outcome: 'ok' | 'sting' | 'stiff' | 'raid' | 'scandal' | 'refused' | 'exhausted';
  text: string;
}

export interface NightReport {
  day: number;
  lines: NightLine[];
  gross: number;
  wages: number;
  rent: number;
  costs: number;
  heatDelta: number;
  repDelta: number;
  incidents: string[];
  net: number;
}

export type LogKind = 'info' | 'money' | 'risk' | 'girl' | 'story' | 'success' | 'fail';

export interface LogEntry {
  id: number;
  day: number;
  slot: number;
  kind: LogKind;
  text: string;
}

export type EndingId =
  | 'empire'
  | 'velvet'
  | 'quiet'
  | 'broke'
  | 'arrest'
  | 'empty';

export type Effect =
  | { t: 'cash'; v: number }
  | { t: 'rep'; v: number }
  | { t: 'heat'; v: number }
  | { t: 'respect'; v: number }
  | { t: 'girl'; id: GirlId; field: 'loyalty' | 'stress' | 'skill' | 'trust' | 'endurance'; v: number }
  | { t: 'hire'; id: GirlId }
  | { t: 'fire'; id: GirlId }
  | { t: 'rest'; id: GirlId; days: number }
  | { t: 'secret'; id: GirlId }
  | { t: 'flag'; key: string; v: number }
  | { t: 'log'; text: string };

export interface EventChoice {
  label: string;
  hint?: string;
  result: string;
  effects: Effect[];
}

export interface StoryEventDef {
  id: string;
  title: string;
  girl?: GirlId;
  once: boolean;
  minDay?: number;
  maxDay?: number;
  weight: number;
  /** Forced beats fire on their exact day/slot before random events. */
  forced?: { day: number; slot?: number };
  requires?: (s: GameState) => boolean;
  text: string;
  choices: EventChoice[];
}

export interface PendingEvent {
  eventId: string;
  day: number;
  slot: number;
  /** Chosen index pending the result screen, or null while the card is open. */
  chosen: number | null;
}

export type Phase = 'boot' | 'desktop' | 'ended';

export type SlotName = 'Утро' | 'День' | 'Вечер' | 'Ночь';

export interface GameState {
  version: number;
  seed: string;
  tick: number;
  phase: Phase;
  day: number;
  slot: number;
  slotSpent: boolean;
  cash: number;
  reputation: number;
  heat: number;
  respect: number;
  girls: GirlState[];
  location: LocationId;
  unlocked: Record<LocationId, boolean>;
  offers: ClientOffer[];
  assignments: Record<string, GirlId>;
  nightReport: NightReport | null;
  pendingEvent: PendingEvent | null;
  seenEvents: string[];
  log: LogEntry[];
  logSeq: number;
  flags: Record<string, number>;
  ending: EndingId | null;
  stats: {
    nights: number;
    totalGross: number;
    girlsLost: number;
    incidents: number;
  };
}

export interface Settings {
  crt: boolean;
  scanlines: boolean;
  sound: boolean;
  fastBoot: boolean;
}

export interface SaveEnvelope {
  kind: 'pimp98-save';
  version: number;
  savedAt: string;
  state: GameState;
}
