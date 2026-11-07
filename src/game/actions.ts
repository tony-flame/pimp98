import {
  ADVERTISE_COST,
  ADVERTISE_REP,
  BONUS_LOYALTY_COST,
  BRIBE_COST,
  BRIBE_HEAT,
  LAWYER_COST,
  LAWYER_HEAT,
  REST_STRESS,
  TALK_LOYALTY,
  TALK_STRESS,
  TALK_TRUST,
  TRAIN_COST,
  TRAIN_GAIN,
  TRAIN_STRESS,
  clamp,
} from './balance';
import { girlArchetype } from '../content/girls';
import { LOCATIONS, locationDef } from '../content/locations';
import { girlWage } from './economy';
import { adjustGirl, girl, hiredGirls, isHired, pushLog } from './state';
import { consumeSlot, isNight, refreshOffers } from './time';import type { GameState, GirlId, LocationId } from './types';

export interface ActionResult {
  ok: boolean;
  message: string;
  /** Whether a daytime slot was burned. */
  spent: boolean;
}

function fail(message: string): ActionResult {
  return { ok: false, message, spent: false };
}

function guard(state: GameState): string | null {
  if (state.phase === 'ended') return 'Игра закончена.';
  if (isNight(state)) return 'Уже ночь. Девушки ждут распределения.';
  if (state.pendingEvent) return 'Сначала разберись с тем, что происходит.';
  return null;
}

function ok(state: GameState, message: string): ActionResult {
  consumeSlot(state);
  if (isNight(state)) refreshOffers(state);
  return { ok: true, message, spent: true };
}

export function trainGirl(state: GameState, id: GirlId): ActionResult {
  const blocked = guard(state);
  if (blocked) return fail(blocked);
  const g = girl(state, id);
  if (!g || !g.hired) return fail('Она не в команде.');
  if (g.restUntilDay > state.day) return fail('Она отдыхает.');
  if (state.cash < TRAIN_COST) return fail('Нет денег на тренера.');
  state.cash -= TRAIN_COST;
  adjustGirl(state, id, 'skill', TRAIN_GAIN);
  adjustGirl(state, id, 'stress', TRAIN_STRESS);
  adjustGirl(state, id, 'trust', 3);
  const msg = `Тренер отработал с ${g.name}. Мастерство выросло, настроение — не очень.`;
  pushLog(state, 'girl', msg);
  return ok(state, msg);
}

export function talkToGirl(state: GameState, id: GirlId): ActionResult {
  const blocked = guard(state);
  if (blocked) return fail(blocked);
  const g = girl(state, id);
  if (!g || !g.hired) return fail('Она не в команде.');
  adjustGirl(state, id, 'loyalty', TALK_LOYALTY);
  adjustGirl(state, id, 'trust', TALK_TRUST);
  adjustGirl(state, id, 'stress', -TALK_STRESS);
  const msg = `Разговор с ${g.name}. Ты выслушал. Она это запомнила.`;
  pushLog(state, 'girl', msg);
  return ok(state, msg);
}

export function giveBonus(state: GameState, id: GirlId): ActionResult {
  const blocked = guard(state);
  if (blocked) return fail(blocked);
  const g = girl(state, id);
  if (!g || !g.hired) return fail('Она не в команде.');
  if (state.cash < BONUS_LOYALTY_COST) return fail('Премия из воздуха? Не в этом году.');
  state.cash -= BONUS_LOYALTY_COST;
  adjustGirl(state, id, 'loyalty', 12);
  adjustGirl(state, id, 'stress', -6);
  adjustGirl(state, id, 'trust', 4);
  const msg = `Ты выдал ${g.name} премию. Она пересчитала дважды и улыбнулась.`;
  pushLog(state, 'money', msg);
  return ok(state, msg);
}

export function sendToRest(state: GameState, id: GirlId): ActionResult {
  const g = girl(state, id);
  if (!g || !g.hired) return fail('Она не в команде.');
  if (g.restUntilDay > state.day) return fail('Она уже отдыхает.');
  g.restUntilDay = state.day + 1;
  adjustGirl(state, id, 'stress', -REST_STRESS);
  adjustGirl(state, id, 'loyalty', 3);
  const msg = `${g.name} отправлена отдыхать на день.`;
  pushLog(state, 'girl', msg);
  return { ok: true, message: msg, spent: false };
}

export function hireGirl(state: GameState, id: GirlId): ActionResult {
  const blocked = guard(state);
  if (blocked) return fail(blocked);
  const g = girl(state, id);
  if (!g) return fail('Такой нет.');
  if (g.hired) return fail('Уже работает.');
  const arche = girlArchetype(id);
  if (state.cash < arche.hireCost) return fail(`Нужно ${arche.hireCost} ₽ на подъёмные.`);
  state.cash -= arche.hireCost;
  g.hired = true;
  g.skill = arche.baseSkill;
  g.loyalty = arche.baseLoyalty;
  g.stress = arche.baseStress;
  g.endurance = arche.baseEndurance;
  adjustGirl(state, id, 'trust', 5);
  const msg = `${arche.name} принята в «Бархат». Подъёмные: ${arche.hireCost} ₽.`;
  pushLog(state, 'success', msg);
  return ok(state, msg);
}

export function fireGirl(state: GameState, id: GirlId): ActionResult {
  const blocked = guard(state);
  if (blocked) return fail(blocked);
  const g = girl(state, id);
  if (!g || !g.hired) return fail('Она не в команде.');
  const name = g.name;
  g.hired = false;
  g.stress = 20;
  g.loyalty = Math.max(10, g.loyalty - 25);
  state.stats.girlsLost += 1;
  state.respect = clamp(state.respect - 4);
  for (const other of hiredGirls(state)) {
    adjustGirl(state, other.id, 'loyalty', -3);
    adjustGirl(state, other.id, 'stress', 4);
  }
  state.assignments = {};
  const msg = `${name} уволена. Остальные делают вид, что ничего не заметили.`;
  pushLog(state, 'fail', msg);
  return ok(state, msg);
}

export function advertise(state: GameState): ActionResult {
  const blocked = guard(state);
  if (blocked) return fail(blocked);
  if (state.cash < ADVERTISE_COST) return fail('Реклама тоже стоит денег.');
  state.cash -= ADVERTISE_COST;
  state.reputation = clamp(state.reputation + ADVERTISE_REP);
  state.heat = clamp(state.heat + 3);
  refreshOffers(state);
  const msg = 'Объявление в газете. Телефон раскалился, менты — тоже.';
  pushLog(state, 'money', msg);
  return ok(state, msg);
}

export function layLow(state: GameState): ActionResult {
  const blocked = guard(state);
  if (blocked) return fail(blocked);
  state.heat = clamp(state.heat - 14);
  state.reputation = clamp(state.reputation - 2);
  const msg = 'День тишины. Занавески задёрнуты, телефон отключён.';
  pushLog(state, 'info', msg);
  return ok(state, msg);
}

export function bribePolice(state: GameState): ActionResult {
  const blocked = guard(state);
  if (blocked) return fail(blocked);
  if (state.cash < BRIBE_COST) return fail('Столько у тебя нет. Даже для них.');
  if (state.heat < 30) return fail('Они пока не настолько интересуются тобой.');
  state.cash -= BRIBE_COST;
  state.heat = clamp(state.heat - BRIBE_HEAT);
  state.reputation = clamp(state.reputation + 2);
  const msg = 'Конверт перешёл из рук в руки. Вопрос закрыт. До следующего раза.';
  pushLog(state, 'risk', msg);
  return ok(state, msg);
}

export function hireLawyer(state: GameState): ActionResult {
  const blocked = guard(state);
  if (blocked) return fail(blocked);
  if (state.cash < LAWYER_COST) return fail('Адвокат за такие деньги не разговаривает.');
  state.cash -= LAWYER_COST;
  state.heat = clamp(state.heat - LAWYER_HEAT);
  state.flags.lawyer = (state.flags.lawyer ?? 0) + 1;
  const msg = 'Адвокат объяснил всем, что вы ничего не нарушали. Убедительно.';
  pushLog(state, 'risk', msg);
  return ok(state, msg);
}

export function unlockLocation(state: GameState, id: LocationId): ActionResult {
  const loc = locationDef(id);
  if (state.unlocked[id]) return fail('Уже открыто.');
  if (state.cash < loc.unlockCost) return fail(`Нужно ${loc.unlockCost} ₽.`);
  if (state.reputation < loc.unlockRep) return fail(`Мало репутации (нужно ${loc.unlockRep}).`);
  if (state.respect < loc.unlockRespect) return fail(`Мало уважения (нужно ${loc.unlockRespect}).`);
  state.cash -= loc.unlockCost;
  state.unlocked[id] = true;
  pushLog(state, 'success', `${loc.name} теперь твой. Почти.`);
  return { ok: true, message: `${loc.name} открыт.`, spent: false };
}

export function wageOf(state: GameState, id: GirlId): number {
  const g = girl(state, id);
  if (!g) return 0;
  return Math.round(girlWage(g) * (1 + (g.loyalty - 50) / 400));
}

export function assignGirl(state: GameState, offerId: string, girlId: GirlId | null): void {
  if (girlId === null) {
    delete state.assignments[offerId];
    return;
  }
  for (const [key, value] of Object.entries(state.assignments)) {
    if (value === girlId) delete state.assignments[key];
  }
  state.assignments[offerId] = girlId;
}

export function unassigned(state: GameState): GirlId[] {
  const taken = new Set(Object.values(state.assignments));
  return state.girls
    .filter((g) => g.hired && !taken.has(g.id) && g.restUntilDay <= state.day)
    .map((g) => g.id);
}

export function availableLocations(state: GameState) {
  return LOCATIONS.map((loc) => ({ loc, unlocked: state.unlocked[loc.id] === true }));
}

export function girlCanWork(state: GameState, id: GirlId): boolean {
  const g = girl(state, id);
  return !!g && g.hired && g.restUntilDay <= state.day && g.stress < 82;
}

export function ensureHired(state: GameState, id: GirlId): boolean {
  return isHired(state, id);
}
