import { DAYS, SLOTS_PER_DAY, clamp } from './balance';
import { Rng, hashString } from './rng';
import { generateOffers } from './economy';
import { pushLog } from './state';
import type { GameState, LocationId } from './types';
import { locationDef } from '../content/locations';

export function offersRng(seed: string, day: number, location: LocationId): Rng {
  return new Rng(hashString(`offers:${seed}:${day}:${location}`));
}

export function nightRng(seed: string, day: number, tick: number): Rng {
  return new Rng(hashString(`night:${seed}:${day}:${tick}`));
}

export function eventRng(seed: string, day: number, slot: number, tick: number): Rng {
  return new Rng(hashString(`event:${seed}:${day}:${slot}:${tick}`));
}

export function refreshOffers(state: GameState): void {
  state.offers = generateOffers(state, offersRng(state.seed, state.day, state.location));
  state.assignments = {};
}

export function setLocation(state: GameState, location: LocationId): void {
  if (!state.unlocked[location]) return;
  if (state.location === location) return;
  state.location = location;
  refreshOffers(state);
  pushLog(state, 'info', `Переехали: ${locationDef(location).name}.`);
}

/** Moves to the next slot. When the last daytime slot is used up, the clock hits night. */
export function consumeSlot(state: GameState): void {
  state.slotSpent = true;
  if (state.slot < SLOTS_PER_DAY - 1) {
    state.slot += 1;
    state.slotSpent = false;
  }
}

export function isNight(state: GameState): boolean {
  return state.slot >= SLOTS_PER_DAY - 1;
}

export function slotsLeft(state: GameState): number {
  return Math.max(0, SLOTS_PER_DAY - 1 - state.slot);
}

/** Burns every remaining daytime slot at once. Free, but the day is gone. */
export function skipToNight(state: GameState): void {
  state.slot = SLOTS_PER_DAY - 1;
  state.slotSpent = false;
  refreshOffers(state);
  pushLog(state, 'info', 'День закончился. Город выключает свет.');
}

export function startNextDay(state: GameState): void {
  state.day += 1;
  state.slot = 0;
  state.slotSpent = false;
  state.nightReport = null;
  state.assignments = {};
  if (state.day > DAYS) {
    state.day = DAYS;
    return;
  }
  refreshOffers(state);
  const loc = locationDef(state.location);
  pushLog(state, 'info', `День ${state.day}. ${loc.name}.`);
}

export function heatBand(heat: number): 'calm' | 'warn' | 'danger' | 'critical' {
  if (heat >= 85) return 'critical';
  if (heat >= 70) return 'danger';
  if (heat >= 45) return 'warn';
  return 'calm';
}

export function dayProgress(state: GameState): number {
  return clamp(((state.day - 1) + state.slot / SLOTS_PER_DAY) / DAYS) * 100;
}
