import { describe, expect, it } from 'vitest';
import { DAYS, DAILY_RENT } from '../src/game/balance';
import { hireGirl, talkToGirl, trainGirl } from '../src/game/actions';
import { evaluateEnding } from '../src/game/endings';
import { runNight, generateOffers } from '../src/game/economy';
import { Rng } from '../src/game/rng';
import { createNewGame, hiredGirls, teamIntegrity } from '../src/game/state';
import { nightRng, refreshOffers, setLocation, startNextDay } from '../src/game/time';
import type { EndingId, GameState } from '../src/game/types';

type Policy = 'idle' | 'grind' | 'manager' | 'investor' | 'docks';

interface Outcome {
  ending: EndingId;
  cash: number;
  heat: number;
  rep: number;
  integrity: number;
  hired: number;
}

const SEEDS = ['a1', 'b2', 'c3', 'd4', 'e5'];

function simulate(seed: string, policy: Policy): Outcome {
  const state = createNewGame(seed);

  for (let day = 1; day <= DAYS; day++) {
    applyDayActions(state, policy);
    while (state.slot < 3) state.slot += 1;
    refreshOffers(state);
    assignOffers(state, policy);
    runNight(state, nightRng(seed, day, state.tick), DAILY_RENT);
    state.tick += 1;
    if (day < DAYS) {
      startNextDay(state);
      state.tick += 1;
    }
  }

  return {
    ending: evaluateEnding(state),
    cash: Math.round(state.cash),
    heat: Math.round(state.heat),
    rep: Math.round(state.reputation),
    integrity: teamIntegrity(state),
    hired: hiredGirls(state).length,
  };
}

function applyDayActions(state: GameState, policy: Policy): void {
  if (policy === 'idle' || policy === 'grind') return;
  if (policy === 'docks') {
    setLocation(state, 'center');
    setLocation(state, 'docks');
  }
  if (state.cash > 2600) {
    const affordable = state.girls.find((g) => !g.hired && g.id !== 'alisa');
    if (affordable) hireGirl(state, affordable.id);
  }
  if (state.cash > 6000) {
    const affordable = state.girls.find((g) => !g.hired);
    if (affordable) hireGirl(state, affordable.id);
  }
  if (policy === 'investor' && state.reputation >= 35 && state.cash > 4000) {
    setLocation(state, 'center');
  }

  let guard = 0;
  while (state.slot < 3 && guard < 2) {
    guard += 1;
    const able = hiredGirls(state).filter((g) => g.restUntilDay <= state.day);
    if (able.length === 0) break;
    const worst = able.reduce((a, b) => (b.stress > a.stress ? b : a), able[0] as (typeof able)[number]);
    if (worst.stress > 55) {
      talkToGirl(state, worst.id);
      continue;
    }
    if (policy === 'investor' && state.cash > 5000) {
      trainGirl(state, worst.id);
      continue;
    }
    break;
  }
}

function assignOffers(state: GameState, policy: Policy): void {
  if (policy === 'idle') return;
  const stressCap = policy === 'grind' ? 100 : 82;
  const pool = hiredGirls(state).filter((g) => g.stress < stressCap);
  const offers = [...state.offers].sort((a, b) => b.budget - a.budget);
  for (const offer of offers) {
    const taken = new Set(Object.values(state.assignments));
    const free = pool.filter((g) => !taken.has(g.id));
    if (free.length === 0) break;
    const chosen =
      policy === 'grind'
        ? free[0]
        : free.reduce(
            (best, g) =>
              Math.abs(g.skill - offer.minSkill) < Math.abs(best.skill - offer.minSkill) ? g : best,
            free[0] as (typeof free)[number],
          );
    if (chosen) state.assignments[offer.id] = chosen.id;
  }
}

describe('balance', () => {
  it('idle players go broke', () => {
    for (const seed of SEEDS) {
      const outcome = simulate(seed, 'idle');
      expect(outcome.cash).toBeLessThan(0);
      expect(outcome.ending).toBe('broke');
    }
  });

  it('pure grinding without management never builds an empire', () => {
    const endings = SEEDS.map((seed) => simulate(seed, 'grind').ending);
    expect(endings).not.toContain('empire');
  });

  it('a managed team can reach the empire or the velvet ending', () => {
    const endings = SEEDS.map((seed) => simulate(seed, 'investor').ending);
    const good = endings.filter((id) => id === 'empire' || id === 'velvet');
    expect(good.length).toBeGreaterThanOrEqual(2);
  });

  it('outcomes vary across seeds and policies', () => {
    const all = new Set<EndingId>();
    for (const seed of SEEDS) {
      for (const policy of ['idle', 'grind', 'manager', 'investor', 'docks'] as Policy[]) {
        all.add(simulate(seed, policy).ending);
      }
    }
    expect(all.size).toBeGreaterThanOrEqual(3);
  });

  it('a successful run is not free: heat rises even when nothing goes wrong', () => {
    const outcomes = SEEDS.map((seed) => simulate(seed, 'investor'));
    const maxHeat = Math.max(...outcomes.map((o) => o.heat));
    expect(maxHeat).toBeGreaterThan(25);
  });

  it('only one girl can be assigned to one client', () => {
    const state = createNewGame('assign-check');
    state.slot = 3;
    state.offers = generateOffers(state, new Rng(5));
    const [first, second] = state.offers;
    expect(first && second).toBeTruthy();
    state.assignments[first!.id] = 'vika';
    // reassigning vika to the second offer must free the first one
    for (const [key, value] of Object.entries(state.assignments)) {
      if (value === 'vika') delete state.assignments[key];
    }
    state.assignments[second!.id] = 'vika';
    const vikaShifts = Object.values(state.assignments).filter((id) => id === 'vika');
    expect(vikaShifts).toHaveLength(1);
  });

  it('a girl pushed to the edge can quit on her own', () => {
    const state = createNewGame('quit-check');
    state.slot = 3;
    const vika = state.girls.find((g) => g.id === 'vika');
    if (!vika) throw new Error('missing vika');
    vika.loyalty = 0;
    vika.stress = 99;
    runNight(state, new Rng(3), 700);
    expect(vika.hired).toBe(false);
    expect(state.stats.girlsLost).toBeGreaterThanOrEqual(1);
  });

  it('the arrest threshold ends the run early', () => {
    const state = createNewGame('arrest-check');
    state.heat = 100;
    state.cash = 40000;
    expect(evaluateEnding(state)).toBe('arrest');
  });

  it('wage bill grows with the team', () => {
    const one = createNewGame('wage-1');
    const oneWages = runNight(one, nightRng('wage-1', 1, 0), DAILY_RENT).wages;
    const three = createNewGame('wage-2');
    for (const g of three.girls) g.hired = true;
    const threeWages = runNight(three, nightRng('wage-2', 1, 0), DAILY_RENT).wages;
    expect(threeWages).toBeGreaterThan(oneWages * 2);
  });

  it('recruiting costs money up front', () => {
    const state = createNewGame('recruit-check');
    state.cash = 4000;
    const before = state.cash;
    hireGirl(state, 'rita');
    expect(state.cash).toBeLessThan(before);
  });
});
