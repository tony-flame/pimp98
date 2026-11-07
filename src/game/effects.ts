import { clamp } from './balance';
import { girl, pushLog } from './state';
import type { Effect, GameState } from './types';
import { girlArchetype } from '../content/girls';

export function applyEffect(state: GameState, effect: Effect): void {
  switch (effect.t) {
    case 'cash':
      state.cash += effect.v;
      break;
    case 'rep':
      state.reputation = clamp(state.reputation + effect.v);
      break;
    case 'heat':
      state.heat = clamp(state.heat + effect.v);
      break;
    case 'respect':
      state.respect = clamp(state.respect + effect.v);
      break;
    case 'girl': {
      const target = girl(state, effect.id);
      if (!target || !target.hired) break;
      target[effect.field] = clamp(target[effect.field] + effect.v);
      break;
    }
    case 'hire': {
      const target = girl(state, effect.id);
      if (!target) break;
      target.hired = true;
      const arche = girlArchetype(effect.id);
      target.skill = arche.baseSkill;
      target.loyalty = arche.baseLoyalty;
      target.stress = arche.baseStress;
      target.endurance = arche.baseEndurance;
      break;
    }
    case 'fire': {
      const target = girl(state, effect.id);
      if (!target || !target.hired) break;
      target.hired = false;
      state.stats.girlsLost += 1;
      for (const [offerId, girlId] of Object.entries(state.assignments)) {
        if (girlId === effect.id) delete state.assignments[offerId];
      }
      break;
    }
    case 'rest': {
      const target = girl(state, effect.id);
      if (!target) break;
      target.restUntilDay = Math.max(target.restUntilDay, state.day + effect.days);
      break;
    }
    case 'secret': {
      const target = girl(state, effect.id);
      if (!target) break;
      target.secretKnown = true;
      break;
    }
    case 'flag':
      state.flags[effect.key] = (state.flags[effect.key] ?? 0) + effect.v;
      break;
    case 'log':
      pushLog(state, 'story', effect.text);
      break;
    default:
      break;
  }
}

export function applyEffects(state: GameState, effects: readonly Effect[]): void {
  for (const effect of effects) applyEffect(state, effect);
}
