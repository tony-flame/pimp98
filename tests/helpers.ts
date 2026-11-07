import { girlArchetype } from '../src/content/girls';
import type { GameState } from '../src/game/types';

export function buyableGirls(state: GameState): string[] {
  return state.girls
    .filter((g) => !g.hired && state.cash >= girlArchetype(g.id).hireCost)
    .map((g) => g.id);
}
