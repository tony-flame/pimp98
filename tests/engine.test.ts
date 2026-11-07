import { describe, expect, it } from 'vitest';
import { Rng, hashString } from '../src/game/rng';
import { createNewGame, hiredGirls, girl, teamIntegrity } from '../src/game/state';
import { generateOffers, runNight } from '../src/game/economy';
import { buyableGirls } from './helpers';
import { EVENTS, eventById } from '../src/content/events';
import { ENDINGS, evaluateEnding } from '../src/game/endings';
import { trainGirl, talkToGirl, hireGirl, advertise, layLow, bribePolice } from '../src/game/actions';
import { startNextDay, setLocation } from '../src/game/time';
import { applyEffects } from '../src/game/effects';

describe('rng', () => {
  it('is deterministic for the same seed', () => {
    const a = new Rng(1234);
    const b = new Rng(1234);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different streams for different seeds', () => {
    const a = new Rng(1);
    const b = new Rng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('keeps weighted picks inside the input', () => {
    const rng = new Rng(99);
    for (let i = 0; i < 200; i++) {
      const value = rng.weighted([
        { item: 'a', w: 1 },
        { item: 'b', w: 3 },
      ]);
      expect(['a', 'b']).toContain(value);
    }
  });

  it('hashes strings stably', () => {
    expect(hashString('pimp')).toBe(hashString('pimp'));
    expect(hashString('pimp')).not.toBe(hashString('PIMP'));
  });
});

describe('new game', () => {
  it('starts with one hired girl and a sane economy', () => {
    const state = createNewGame('seed-1');
    const hired = hiredGirls(state);
    expect(hired.length).toBe(1);
    expect(hired[0]?.id).toBe('vika');
    expect(state.cash).toBeGreaterThan(0);
    expect(state.day).toBe(1);
    expect(state.phase).toBe('desktop');
  });

  it('only unlocks the station at the start', () => {
    const state = createNewGame('seed-2');
    expect(state.unlocked.station).toBe(true);
    expect(state.unlocked.center).toBe(false);
    expect(state.unlocked.docks).toBe(false);
  });
});

describe('offers', () => {
  it('is deterministic per seed, day and location', () => {
    const state = createNewGame('seed-3');
    const first = generateOffers(state, new Rng(42));
    const second = generateOffers(state, new Rng(42));
    expect(first.map((o) => o.id)).toEqual(second.map((o) => o.id));
    expect(first.map((o) => o.budget)).toEqual(second.map((o) => o.budget));
  });

  it('never asks for more girls than exist', () => {
    const state = createNewGame('seed-4');
    const offers = generateOffers(state, new Rng(7));
    expect(offers.length).toBeGreaterThanOrEqual(2);
    expect(offers.length).toBeLessThanOrEqual(5);
    for (const offer of offers) {
      expect(offer.budget).toBeGreaterThan(0);
      expect(offer.riskChance).toBeGreaterThan(0);
      expect(offer.riskChance).toBeLessThan(1);
    }
  });
});

describe('night', () => {
  it('pays wages and rent and returns a report', () => {
    const state = createNewGame('seed-5');
    state.slot = 3;
    state.offers = generateOffers(state, new Rng(11));
    const first = state.offers[0] as (typeof state.offers)[number];
    state.assignments[first.id] = 'vika';
    const cashBefore = state.cash;
    const report = runNight(state, new Rng(11), 700);
    expect(report.gross).toBeGreaterThanOrEqual(0);
    expect(report.wages).toBeGreaterThan(0);
    expect(report.rent).toBe(700);
    expect(state.stats.nights).toBe(1);
    expect(state.cash).toBe(cashBefore + report.gross - report.wages - 700);
  });

  it('is reproducible for a fixed rng', () => {
    const build = () => {
      const state = createNewGame('seed-6');
      state.slot = 3;
      state.offers = generateOffers(state, new Rng(3));
      const first = state.offers[0] as (typeof state.offers)[number];
      state.assignments[first.id] = 'vika';
      const report = runNight(state, new Rng(123456), 700);
      return { gross: report.gross, text: report.lines[0]?.text ?? '' };
    };
    expect(build()).toEqual(build());
  });

  it('handles an empty night without throwing', () => {
    const state = createNewGame('seed-7');
    state.slot = 3;
    const report = runNight(state, new Rng(1), 700);
    expect(report.lines.length).toBe(0);
    expect(report.net).toBe(-700 - report.wages);
  });
});

describe('actions', () => {
  it('training costs cash and a slot', () => {
    const state = createNewGame('seed-8');
    const cash = state.cash;
    const result = trainGirl(state, 'vika');
    expect(result.ok).toBe(true);
    expect(result.spent).toBe(true);
    expect(state.cash).toBe(cash - 400);
    expect(state.slot).toBe(1);
  });

  it('refuses to spend past the night', () => {
    const state = createNewGame('seed-9');
    state.slot = 3;
    const result = trainGirl(state, 'vika');
    expect(result.ok).toBe(false);
  });

  it('talking raises loyalty and lowers stress', () => {
    const state = createNewGame('seed-10');
    const g = girl(state, 'vika');
    if (!g) throw new Error('missing girl');
    const loyalty = g.loyalty;
    const stress = g.stress;
    talkToGirl(state, 'vika');
    expect(g.loyalty).toBeGreaterThan(loyalty);
    expect(g.stress).toBeLessThan(stress);
  });

  it('hiring requires cash', () => {
    const state = createNewGame('seed-11');
    state.cash = 0;
    const result = hireGirl(state, 'lena');
    expect(result.ok).toBe(false);
    expect(girl(state, 'lena')?.hired).toBe(false);
  });

  it('hiring works when affordable', () => {
    const state = createNewGame('seed-12');
    state.cash = 5000;
    const result = hireGirl(state, 'lena');
    expect(result.ok).toBe(true);
    expect(girl(state, 'lena')?.hired).toBe(true);
  });

  it('advertising lifts reputation', () => {
    const state = createNewGame('seed-13');
    const rep = state.reputation;
    advertise(state);
    expect(state.reputation).toBeGreaterThan(rep);
  });

  it('laying low reduces heat', () => {
    const state = createNewGame('seed-14');
    state.heat = 80;
    layLow(state);
    expect(state.heat).toBeLessThan(80);
  });

  it('bribing below the threshold is rejected', () => {
    const state = createNewGame('seed-15');
    state.heat = 10;
    const result = bribePolice(state);
    expect(result.ok).toBe(false);
  });
});

describe('time', () => {
  it('advancing a day resets slots and moves the calendar', () => {
    const state = createNewGame('seed-16');
    state.slot = 3;
    startNextDay(state);
    expect(state.day).toBe(2);
    expect(state.slot).toBe(0);
    expect(state.nightReport).toBeNull();
  });

  it('switching location is blocked while locked', () => {
    const state = createNewGame('seed-17');
    setLocation(state, 'center');
    expect(state.location).toBe('station');
  });
});

describe('events', () => {
  it('every event has at least two choices and a result', () => {
    for (const event of EVENTS) {
      expect(event.choices.length).toBeGreaterThanOrEqual(2);
      for (const choice of event.choices) {
        expect(choice.label.length).toBeGreaterThan(3);
        expect(choice.result.length).toBeGreaterThan(10);
      }
    }
  });

  it('has unique ids', () => {
    const ids = EVENTS.map((event) => event.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('forced events point at real days', () => {
    for (const event of EVENTS.filter((item) => item.forced)) {
      const day = event.forced?.day ?? 0;
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(7);
    }
  });

  it('every girl has at least one event', () => {
    for (const id of ['vika', 'lena', 'alisa', 'rita']) {
      const found = EVENTS.filter((event) => event.girl === id);
      expect(found.length).toBeGreaterThan(0);
    }
  });

  it('looks up by id', () => {
    expect(eventById('intro')?.title).toBe('Открытие');
    expect(eventById('nope')).toBeUndefined();
  });
});

describe('effects', () => {
  it('applies and clamps', () => {
    const state = createNewGame('seed-18');
    applyEffects(state, [
      { t: 'rep', v: 1000 },
      { t: 'heat', v: -1000 },
      { t: 'cash', v: -999999 },
    ]);
    expect(state.reputation).toBe(100);
    expect(state.heat).toBe(0);
    expect(state.cash).toBeLessThan(0);
  });

  it('firing removes a girl from the team', () => {
    const state = createNewGame('seed-19');
    applyEffects(state, [{ t: 'fire', id: 'vika' }]);
    expect(girl(state, 'vika')?.hired).toBe(false);
    expect(state.stats.girlsLost).toBe(1);
  });

  it('secrets get recorded', () => {
    const state = createNewGame('seed-20');
    applyEffects(state, [{ t: 'secret', id: 'vika' }]);
    expect(girl(state, 'vika')?.secretKnown).toBe(true);
  });
});

describe('endings', () => {
  it('arrest wins over everything when heat is maxed', () => {
    const state = createNewGame('seed-21');
    state.heat = 100;
    state.cash = 999999;
    expect(evaluateEnding(state)).toBe('arrest');
  });

  it('an empty team ends the run', () => {
    const state = createNewGame('seed-22');
    applyEffects(state, [{ t: 'fire', id: 'vika' }]);
    expect(evaluateEnding(state)).toBe('empty');
  });

  it('cash beyond the target with a healthy team is an empire', () => {
    const state = createNewGame('seed-23');
    state.cash = 50000;
    state.heat = 20;
    for (const id of ['lena', 'alisa', 'rita'] as const) {
      applyEffects(state, [{ t: 'hire', id }]);
    }
    for (const g of hiredGirls(state)) {
      g.loyalty = 95;
      g.stress = 5;
    }
    expect(evaluateEnding(state)).toBe('empire');
  });

  it('has a definition for every ending id', () => {
    for (const id of ['empire', 'velvet', 'quiet', 'broke', 'arrest', 'empty'] as const) {
      expect(ENDINGS[id].title.length).toBeGreaterThan(0);
      expect(ENDINGS[id].text.length).toBeGreaterThan(50);
    }
  });
});

describe('team', () => {
  it('integrity is bounded', () => {
    const state = createNewGame('seed-24');
    const value = teamIntegrity(state);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
  });

  it('helper finds affordable girls', () => {
    const state = createNewGame('seed-25');
    state.cash = 99999;
    const available = buyableGirls(state);
    expect(available.length).toBe(3);
  });
});
