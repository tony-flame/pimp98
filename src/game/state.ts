import {
  DAYS,
  START_CASH,
  START_HEAT,
  START_REPUTATION,
  START_RESPECT,
  clamp,
} from './balance';
import { GIRLS, girlArchetype } from '../content/girls';
import { LOCATIONS } from '../content/locations';
import type { GameState, GirlState, LocationId, LogKind } from './types';

export const SAVE_VERSION = 1;

function initialGirlState(id: string): GirlState {
  const arche = girlArchetype(id);
  return {
    id: arche.id,
    name: arche.name,
    hired: arche.startHired,
    skill: arche.baseSkill,
    loyalty: arche.baseLoyalty,
    stress: arche.baseStress,
    endurance: arche.baseEndurance,
    trust: 0,
    mood: 'ok',
    daysWorked: 0,
    daysIdle: 0,
    restUntilDay: 0,
    secretKnown: false,
    note: '',
  };
}

export function createNewGame(seed: string): GameState {
  const unlocked: Record<LocationId, boolean> = {
    station: true,
    center: false,
    docks: false,
  };
  for (const loc of LOCATIONS) {
    if (loc.unlockRep === 0 && loc.unlockRespect === 0) unlocked[loc.id] = true;
  }
  const state: GameState = {
    version: SAVE_VERSION,
    seed,
    tick: 0,
    phase: 'desktop',
    day: 1,
    slot: 0,
    slotSpent: false,
    cash: START_CASH,
    reputation: START_REPUTATION,
    heat: START_HEAT,
    respect: START_RESPECT,
    girls: GIRLS.map((g) => initialGirlState(g.id)),
    location: 'station',
    unlocked,
    offers: [],
    assignments: {},
    nightReport: null,
    pendingEvent: null,
    seenEvents: [],
    log: [],
    logSeq: 1,
    flags: {},
    ending: null,
    stats: { nights: 0, totalGross: 0, girlsLost: 0, incidents: 0 },
  };
  pushLog(state, 'story', '«Бархат» открывается. Аренда плачена на неделю вперёд. Дальше — как пойдёт.');
  return state;
}

export function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

export function pushLog(state: GameState, kind: LogKind, text: string): void {
  state.log.push({
    id: state.logSeq,
    day: state.day,
    slot: state.slot,
    kind,
    text,
  });
  state.logSeq += 1;
  if (state.log.length > 220) state.log.splice(0, state.log.length - 220);
}

export function girl(state: GameState, id: string): GirlState | undefined {
  return state.girls.find((g) => g.id === id);
}

export function hiredGirls(state: GameState): GirlState[] {
  return state.girls.filter((g) => g.hired);
}

export function isHired(state: GameState, id: string): boolean {
  return girl(state, id)?.hired === true;
}

export function availableGirls(state: GameState): GirlState[] {
  return hiredGirls(state).filter((g) => g.restUntilDay <= state.day);
}

export function adjustGirl(
  state: GameState,
  id: string,
  field: 'loyalty' | 'stress' | 'skill' | 'trust' | 'endurance',
  delta: number,
): void {
  const target = girl(state, id);
  if (!target) return;
  target[field] = clamp(target[field] + delta);
  target.mood = moodFor(target);
}

export function moodFor(g: GirlState): GirlState['mood'] {
  if (g.stress >= 90 || g.loyalty <= 8) return 'broken';
  if (g.loyalty >= 78 && g.stress < 45) return 'inspired';
  if (g.loyalty <= 28) return 'hurt';
  if (g.stress >= 68) return 'tense';
  return 'ok';
}

export function heatStage(heat: number): 'calm' | 'warn' | 'danger' | 'critical' {
  if (heat >= 85) return 'critical';
  if (heat >= 70) return 'danger';
  if (heat >= 45) return 'warn';
  return 'calm';
}

export function daysLeft(state: GameState): number {
  return Math.max(0, DAYS - state.day + 1);
}

export function teamIntegrity(state: GameState): number {
  const hired = hiredGirls(state);
  if (hired.length === 0) return 0;
  const sum = hired.reduce((acc, g) => acc + g.loyalty - g.stress * 0.5, 0);
  return clamp(Math.round(sum / hired.length + 25));
}

export function collectSecrets(state: GameState): string[] {
  return state.girls.filter((g) => g.secretKnown).map((g) => g.id);
}
