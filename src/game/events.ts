import { DAYS, SLOTS_PER_DAY } from './balance';
import { EVENTS, eventById } from '../content/events';
import { applyEffects } from './effects';
import { Rng } from './rng';
import { pushLog } from './state';
import type { GameState, StoryEventDef } from './types';

export function eligibleEvents(state: GameState): StoryEventDef[] {
  return EVENTS.filter((event) => {
    if (event.weight <= 0) return false;
    if (event.once && state.seenEvents.includes(event.id)) return false;
    if (event.minDay !== undefined && state.day < event.minDay) return false;
    if (event.maxDay !== undefined && state.day > event.maxDay) return false;
    if (event.requires && !event.requires(state)) return false;
    if (state.pendingEvent) return false;
    return true;
  });
}

/** Forced beats beat random ones. Then a weighted roll gates everything else. */
export function maybeQueueEvent(state: GameState, rng: Rng): boolean {
  if (state.pendingEvent) return false;

  const forced = EVENTS.find(
    (event) =>
      event.forced &&
      event.forced.day === state.day &&
      (event.forced.slot === undefined || event.forced.slot === state.slot) &&
      !state.seenEvents.includes(event.id),
  );
  if (forced) {
    state.pendingEvent = { eventId: forced.id, day: state.day, slot: state.slot, chosen: null };
    return true;
  }

  if (!rng.chance(0.62)) return false;
  const pool = eligibleEvents(state);
  if (pool.length === 0) return false;
  const picked = rng.weighted(pool.map((event) => ({ item: event, w: event.weight })));
  state.pendingEvent = { eventId: picked.id, day: state.day, slot: state.slot, chosen: null };
  return true;
}

/** Queues the beat that must happen exactly now, ignoring the random roll. */
export function queueForcedEvent(state: GameState): boolean {
  if (state.pendingEvent) return false;
  const forced = EVENTS.find(
    (event) =>
      event.forced &&
      event.forced.day === state.day &&
      (event.forced.slot === undefined || event.forced.slot === state.slot) &&
      !state.seenEvents.includes(event.id),
  );
  if (!forced) return false;
  state.pendingEvent = { eventId: forced.id, day: state.day, slot: state.slot, chosen: null };
  return true;
}

export function currentEvent(state: GameState): StoryEventDef | null {
  if (!state.pendingEvent) return null;
  return eventById(state.pendingEvent.eventId) ?? null;
}

export function chooseEventOption(state: GameState, index: number): string {
  const event = currentEvent(state);
  if (!event || !state.pendingEvent) return '';
  const choice = event.choices[index];
  if (!choice) return '';
  state.pendingEvent.chosen = index;
  applyEffects(state, choice.effects);
  if (!state.seenEvents.includes(event.id)) state.seenEvents.push(event.id);
  pushLog(state, 'story', `«${event.title}»: ${choice.label}`);
  return choice.result;
}

export function closeEvent(state: GameState): void {
  state.pendingEvent = null;
}

export function isLastSlot(state: GameState): boolean {
  return state.day >= DAYS && state.slot >= SLOTS_PER_DAY - 1;
}
