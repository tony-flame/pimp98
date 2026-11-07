import {
  CLIENT_DEMANDS,
  CLIENT_NAMES,
  KIND_BUDGET_MUL,
  KIND_SKILL_OFFSET,
  KIND_WEIGHT_BY_LOCATION,
} from '../content/clients';
import { girlArchetype } from '../content/girls';
import { locationDef } from '../content/locations';
import {
  KIND_PROFILE,
  LOCATION_HEAT,
  LOCATION_REP_GAIN,
  NIGHTLY_HEAT_DECAY,
  REST_STRESS,
  STRESS_BREAK,
  clamp,
} from './balance';
import { Rng } from './rng';
import { adjustGirl, availableGirls, girl, hiredGirls, pushLog } from './state';
import type {
  ClientKind,
  ClientOffer,
  GameState,
  GirlState,
  NightLine,
  NightReport,
  RiskKind,
} from './types';

const RISK_TEXT: Record<RiskKind, string> = {
  none: '',
  sting: 'это была подстава',
  stiff: 'клиент исчез, не заплатив',
  raid: 'нагрянули с проверкой',
  scandal: 'кто-то слишком много снимал',
};

export function girlWage(g: GirlState): number {
  return girlArchetype(g.id).wage;
}

export function generateOffers(state: GameState, rng: Rng): ClientOffer[] {
  const loc = locationDef(state.location);
  const repBonus = Math.floor(state.reputation / 18);
  const count = clamp(2 + repBonus + rng.int(0, 1), 2, 5);
  const weights = KIND_WEIGHT_BY_LOCATION[state.location];
  const offers: ClientOffer[] = [];

  for (let i = 0; i < count; i++) {
    const kind = rng.weighted(
      (Object.keys(weights) as ClientKind[]).map((k) => ({ item: k, w: weights[k] })),
    );
    const profile = KIND_PROFILE[kind];
    const budgetBase = rng.int(loc.budgetMin, loc.budgetMax);
    const budget = Math.round((budgetBase * KIND_BUDGET_MUL[kind]) / 50) * 50;
    const riskChance = clamp(profile.riskMul * (0.35 + state.heat / 260), 0.02, 0.72);
    offers.push({
      id: `d${state.day}-${i}-${rng.int(1000, 9999)}`,
      clientName: rng.pick(CLIENT_NAMES[kind]),
      kind,
      budget,
      demand: rng.pick(CLIENT_DEMANDS[kind]),
      risk: profile.risk,
      riskChance,
      minSkill: clamp(28 + KIND_SKILL_OFFSET[kind] + rng.int(-6, 12) + Math.floor(state.reputation / 10)),
      location: state.location,
      day: state.day,
    });
  }

  return offers.sort((a, b) => b.budget - a.budget);
}

interface WorkResult {
  line: NightLine;
  heat: number;
  rep: number;
  success: boolean;
}

function lineOf(offer: ClientOffer, g: GirlState, gross: number, outcome: NightLine['outcome'], text: string): NightLine {
  return {
    clientId: offer.id,
    clientName: offer.clientName,
    girlId: g.id,
    girlName: g.name,
    gross,
    outcome,
    text,
  };
}

function roundTo10(value: number): number {
  return Math.round(value / 10) * 10;
}

function resolveOne(offer: ClientOffer, g: GirlState, rng: Rng): WorkResult {
  const profile = KIND_PROFILE[offer.kind];
  const gap = g.skill - offer.minSkill;
  const loyaltyFactor = (g.loyalty - 50) / 200;
  const stressFactor = g.stress > 65 ? -0.18 : 0;
  const chanceOk = clamp(0.55 + gap * 0.018 + loyaltyFactor + stressFactor, 0.08, 0.96);

  if (!rng.chance(chanceOk)) {
    return {
      line: lineOf(
        offer,
        g,
        roundTo10(offer.budget * rng.float(0.15, 0.35)),
        'refused',
        `${offer.clientName} остался недоволен. ${g.name} получила половину, остальное ушло на извинения.`,
      ),
      heat: LOCATION_HEAT[offer.location] * 0.6,
      rep: -1.4,
      success: false,
    };
  }

  const tipQuality = clamp(1 + (gap * 0.006 + loyaltyFactor * 0.5), 0.95, 1.28);
  const gross = roundTo10(offer.budget * tipQuality);
  const riskRoll = offer.riskChance * (1 - g.skill / 260);

  if (offer.risk !== 'none' && rng.chance(riskRoll)) {
    switch (offer.risk) {
      case 'stiff':
        return {
          line: lineOf(
            offer,
            g,
            roundTo10(gross * 0.1),
            'stiff',
            `${offer.clientName} оставил на столе мелочь и вышел покурить. Больше его не видели.`,
          ),
          heat: 1,
          rep: -0.8,
          success: false,
        };
      case 'sting':
        return {
          line: lineOf(
            offer,
            g,
            0,
            'sting',
            `${g.name} вернулась бледнее мела. ${offer.clientName} был не клиентом. ${RISK_TEXT.sting}.`,
          ),
          heat: 16,
          rep: -2.5,
          success: false,
        };
      case 'raid':
        return {
          line: lineOf(
            offer,
            g,
            roundTo10(gross * 0.4),
            'raid',
            `У входа засветились фары. ${g.name} успела уйти через кухню. Деньги остались на столе.`,
          ),
          heat: 12,
          rep: 1.2,
          success: false,
        };
      case 'scandal':
        return {
          line: lineOf(
            offer,
            g,
            gross,
            'scandal',
            `${offer.clientName} оказался с диктофоном. Завтра об этом будут шептаться в трёх районах.`,
          ),
          heat: 8,
          rep: -4,
          success: false,
        };
      default:
        break;
    }
  }

  return {
    line: lineOf(
      offer,
      g,
      gross,
      'ok',
      `${offer.clientName} ушёл довольным. ${g.name} отработала чисто, без сюрпризов.`,
    ),
    heat: LOCATION_HEAT[offer.location] * (0.8 + profile.stress / 40),
    rep: LOCATION_REP_GAIN[offer.location] * (1 + gap / 60),
    success: true,
  };
}

export function runNight(state: GameState, rng: Rng, rent: number): NightReport {
  const lines: NightLine[] = [];
  const incidents: string[] = [];
  let gross = 0;
  let heatDelta = 0;
  let repDelta = 0;

  const loc = locationDef(state.location);

  for (const offer of state.offers) {
    const girlId = state.assignments[offer.id];
    if (!girlId) continue;
    const g = girl(state, girlId);
    if (!g || !g.hired) continue;

    if (g.stress >= STRESS_BREAK) {
      lines.push({
        clientId: offer.id,
        clientName: offer.clientName,
        girlId: g.id,
        girlName: g.name,
        gross: 0,
        outcome: 'exhausted',
        text: `${g.name} не вышла. Сказала, что больше не может. Ты не стал спорить.`,
      });
      adjustGirl(state, g.id, 'loyalty', -6);
      incidents.push(`${g.name} отказалась работать`);
      continue;
    }


    const result = resolveOne(offer, g, rng);
    lines.push(result.line);
    gross += result.line.gross;
    heatDelta += result.heat;
    repDelta += result.rep;

    g.daysWorked += 1;
    g.daysIdle = 0;
    const stressGain =
      KIND_PROFILE[offer.kind].stress * (1 - g.endurance / 260) * (g.loyalty > 70 ? 0.85 : 1);
    adjustGirl(state, g.id, 'stress', Math.round(stressGain));
    if (result.success) {
      adjustGirl(state, g.id, 'skill', 0.8);
      adjustGirl(state, g.id, 'loyalty', offer.kind === 'cop' ? -2 : 1);
    } else {
      adjustGirl(state, g.id, 'loyalty', -3);
      adjustGirl(state, g.id, 'stress', 4);
      incidents.push(result.line.text);
    }
  }

  const worked = new Set(Object.values(state.assignments));
  for (const g of hiredGirls(state)) {
    if (!worked.has(g.id)) {
      g.daysIdle += 1;
      adjustGirl(state, g.id, 'stress', -REST_STRESS * 0.35);
      if (g.daysIdle > 1) adjustGirl(state, g.id, 'loyalty', -2);
    }
    if (g.restUntilDay > state.day) {
      adjustGirl(state, g.id, 'stress', -REST_STRESS * 0.5);
    }
  }

  const wages = hiredGirls(state).reduce((sum, g) => {
    const condition = 1 + (g.loyalty - 50) / 400;
    return sum + Math.round(girlWage(g) * condition);
  }, 0);

  /* People quit. Stress and neglect have teeth. */
  for (const g of hiredGirls(state)) {
    const leaves = g.loyalty <= 3 || g.stress >= 96;
    if (!leaves) continue;
    g.hired = false;
    state.stats.girlsLost += 1;
    incidents.push(`${g.name} ушла из «Бархата»`);
    pushLog(
      state,
      'fail',
      g.stress >= 96
        ? `${g.name} не выдержала и ушла. Собрала вещи и не попрощалась.`
        : `${g.name} ушла. Сказала, что больше не верит ни одному твоему слову.`,
    );
  }

  heatDelta += LOCATION_HEAT[state.location] * 0.35;
  repDelta += LOCATION_REP_GAIN[state.location] * 0.3;

  const decayed = state.heat * (1 - NIGHTLY_HEAT_DECAY);
  state.cash += gross - wages - rent;
  state.heat = clamp(decayed + heatDelta);
  state.reputation = clamp(state.reputation + repDelta);
  state.stats.nights += 1;
  state.stats.totalGross += gross;
  state.stats.incidents += incidents.length;

  if (lines.length === 0) {
    pushLog(state, 'info', 'Ночь прошла пусто. Девушки не работали, аренда всё равно капнула.');
  } else {
    pushLog(
      state,
      gross > 0 ? 'money' : 'fail',
      `Ночь: выручка ${gross} ₽, зарплаты ${wages} ₽, аренда ${rent} ₽.`,
    );
  }

  if (heatDelta >= 10) {
    pushLog(state, 'risk', `${loc.name}: слишком много внимания. Менты начали спрашивать.`);
  }

  return {
    day: state.day,
    lines,
    gross,
    wages,
    rent,
    costs: 0,
    heatDelta: Math.round(heatDelta),
    repDelta: Math.round(repDelta * 10) / 10,
    incidents,
    net: gross - wages - rent,
  };
}

export function assignedGirl(state: GameState, offerId: string): GirlState | undefined {
  const id = state.assignments[offerId];
  return id ? girl(state, id) : undefined;
}

export function canAssign(state: GameState, girlId: string): string | null {
  const g = girl(state, girlId);
  if (!g || !g.hired) return 'Не в команде';
  if (g.restUntilDay > state.day) return 'Отдыхает';
  if (g.stress >= STRESS_BREAK) return 'На грани';
  return null;
}

export function unassignedGirls(state: GameState): GirlState[] {
  const taken = new Set(Object.values(state.assignments));
  return availableGirls(state).filter((g) => !taken.has(g.id));
}
