/** All tunable numbers live here. Balance by editing this file, not by hunting magic numbers. */

import type { ClientKind, LocationId, RiskKind } from './types';

export const DAYS = 7;
export const SLOTS_PER_DAY = 4;
export const SLOT_NAMES = ['Утро', 'День', 'Вечер', 'Ночь'] as const;

export const START_CASH = 5000;
export const START_REPUTATION = 25;
export const START_HEAT = 10;
export const START_RESPECT = 20;

export const TARGET_CASH = 13500;
export const EMPIRE_CASH = TARGET_CASH;
export const DAILY_RENT = 700;

export const GIRL_WAGE_BASE = 260;
export const BONUS_LOYALTY_COST = 600;

export const TRAIN_COST = 400;
export const TRAIN_GAIN = 6;
export const TRAIN_STRESS = 5;

export const ADVERTISE_COST = 1200;
export const ADVERTISE_REP = 8;

export const BRIBE_COST = 1500;
export const BRIBE_HEAT = 22;

export const LAWYER_COST = 2600;
export const LAWYER_HEAT = 12;

export const REST_STRESS = 38;
export const TALK_LOYALTY = 6;
export const TALK_TRUST = 7;
export const TALK_STRESS = 9;

export const HEAT_WARN = 45;
export const HEAT_DANGER = 70;
export const HEAT_ARREST = 100;

export const STRESS_BREAK = 82;

export const LOCATION_HEAT: Record<LocationId, number> = {
  station: 1.6,
  center: 2.4,
  docks: 3.2,
};

export const LOCATION_REP_GAIN: Record<LocationId, number> = {
  station: 0.8,
  center: 2.2,
  docks: 1.7,
};

/** Part of the heat the city forgets each night on its own. */
export const NIGHTLY_HEAT_DECAY = 0.12;

export const KIND_PROFILE: Record<
  ClientKind,
  { label: string; stress: number; risk: RiskKind; riskMul: number; patience: number }
> = {
  worker: { label: 'Работяга', stress: 7, risk: 'none', riskMul: 0.6, patience: 0.5 },
  businessman: { label: 'Бизнесмен', stress: 9, risk: 'stiff', riskMul: 0.4, patience: 0.8 },
  cop: { label: 'Мент', stress: 15, risk: 'sting', riskMul: 0.7, patience: 0.2 },
  gangster: { label: 'Бандит', stress: 14, risk: 'raid', riskMul: 0.8, patience: 0.3 },
  journalist: { label: 'Журналист', stress: 8, risk: 'scandal', riskMul: 0.55, patience: 1 },
  romantic: { label: 'Романтик', stress: 4, risk: 'none', riskMul: 0.15, patience: 1.2 },
};

export const RISK_LABEL: Record<RiskKind, string> = {
  none: 'Риск: низкий',
  sting: 'Риск: подстава',
  stiff: 'Риск: не заплатит',
  raid: 'Риск: облава',
  scandal: 'Риск: огласка',
};

export const KIND_WEIGHT_DAY: Record<ClientKind, number> = {
  worker: 30,
  businessman: 18,
  cop: 8,
  gangster: 14,
  journalist: 7,
  romantic: 16,
};

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}
