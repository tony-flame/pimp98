import type { LocationDef } from '../game/types';

export const LOCATIONS: LocationDef[] = [
  {
    id: 'station',
    name: 'Вокзал',
    short: 'Вокзал',
    description:
      'Дешёвые клиенты, дешёвые скандалы. Менты ходят парами и делают вид, что не узнают.',
    budgetMin: 900,
    budgetMax: 1600,
    heatWeight: 3,
    riskBias: 'sting',
    unlockRep: 0,
    unlockRespect: 0,
    unlockCost: 0,
    icon: 'station',
  },
  {
    id: 'center',
    name: 'Центр',
    short: 'Центр',
    description:
      'Костюмы, кожаные портфели и клиенты, которые платят вовремя. Обычно. Репутация решает всё.',
    budgetMin: 2200,
    budgetMax: 3800,
    heatWeight: 5,
    riskBias: 'stiff',
    unlockRep: 35,
    unlockRespect: 0,
    unlockCost: 2000,
    icon: 'center',
  },
  {
    id: 'docks',
    name: 'Причал',
    short: 'Причал',
    description:
      'Большие деньги и люди, которые не задают вопросов. Здесь крышуют всё, включая тебя.',
    budgetMin: 1800,
    budgetMax: 3200,
    heatWeight: 7,
    riskBias: 'raid',
    unlockRep: 45,
    unlockRespect: 35,
    unlockCost: 3000,
    icon: 'docks',
  },
];

export function locationDef(id: string): LocationDef {
  return LOCATIONS.find((l) => l.id === id) ?? (LOCATIONS[0] as LocationDef);
}
