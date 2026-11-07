import { DAYS, EMPIRE_CASH, HEAT_ARREST, TARGET_CASH, clamp } from './balance';
import { hiredGirls, teamIntegrity } from './state';
import type { EndingId, GameState } from './types';

export interface EndingDef {
  id: EndingId;
  title: string;
  code: string;
  tone: 'good' | 'ok' | 'bad' | 'worst';
  text: string;
  hint: string;
}

export const ENDINGS: Record<EndingId, EndingDef> = {
  empire: {
    id: 'empire',
    title: 'Империя «Бархат»',
    code: 'PIMP_98_OK',
    tone: 'good',
    text:
      'К концу недели «Бархат» перестаёт быть комнатой с вывеской. В кассе — больше, чем ты обещал себе в начале. Арендодатель снимает шляпу, конкуренты здороваются первыми.\n\nВика получает свою долю. Не всю, но достаточно, чтобы перестать щуриться. Остальные остаются — не из страха, а потому что им больше некуда идти. И это, наверное, тоже любовь.',
    hint: 'Ты построил не просто бизнес. Ты построил место, куда возвращаются.',
  },
  velvet: {
    id: 'velvet',
    title: 'Бархатный сезон',
    code: 'PIMP_98_SOFT',
    tone: 'ok',
    text:
      'Денег хватило. Не на империю, но на следующую неделю — точно. «Бархат» живёт, команда цела, никто не сидит.\n\nТы стоишь у окна с чашкой чая и понимаешь, что это, возможно, максимум, который можно получить честно. Или почти честно. Вика говорит: «Неплохо». От неё это — как орден.',
    hint: 'Ты выжил. В этом городе это уже достижение.',
  },
  quiet: {
    id: 'quiet',
    title: 'Тихо закрылись',
    code: 'PIMP_98_QUIET',
    tone: 'bad',
    text:
      'Неделя закончилась. Ты дотянул, не сел и даже что-то заработал — но этого не хватило. Арендодатель вежливо намекает, что в следующем месяце будет дороже, а телефон молчит уже второй день.\n\nТы выключаешь свет в зале и понимаешь: «Бархат» не закрылся. Он просто перестал быть чем-то большим, чем комната с вывеской. Через месяц здесь будет лавка. Через год никто не вспомнит, что тут было. Кроме тебя.',
    hint: 'Ты выжил. Но выжить — не то же самое, что победить.',
  },
  broke: {
    id: 'broke',
    title: 'Минус на минус',
    code: 'PIMP_98_BROKE',
    tone: 'bad',
    text:
      'Ты продержался до конца недели, но касса пуста, а долги — нет. Арендодатель вежливо просит ключи, и ты отдаёшь их без спора: спорить уже нечем.\n\nДевушки уходят по одной, не прощаясь. Последней уходит Вика. Она ничего не говорит. Это хуже любых слов.',
    hint: 'Ты дошёл до финала. Финал тебя не дождался.',
  },
  arrest: {
    id: 'arrest',
    title: 'Дело № 1998',
    code: 'PIMP_98_FATAL',
    tone: 'worst',
    text:
      'Капитан Гринько приходит в семь утра, с ордером и с лицом человека, который ждал этого долго. В коридоре — двое в форме и один с папкой.\n\nВ папке — всё: даты, суммы, имена. Ты смотришь на неё и понимаешь, что половину писал не он. Кто-то был очень аккуратен.',
    hint: 'Слишком высокий heat. Кто-то всё записал.',
  },
  empty: {
    id: 'empty',
    title: 'Пустой зал',
    code: 'PIMP_98_EMPTY',
    tone: 'bad',
    text:
      'Уходят все. Сначала одна, потом вторая, потом сразу трое за вечер. Ты остаёшься в зале один, среди пустых стульев и чужих духов.\n\nВика уходит последней. В дверях она оборачивается и говорит: «Ты был неплохим человеком. Просто плохим хозяином». Дверь закрывается. Свет мигает. Больше никто не приходит.',
    hint: 'Команда не выдержала. Люди — не активы.',
  },
};

export function evaluateEnding(state: GameState): EndingId {
  const hired = hiredGirls(state);
  const integrity = teamIntegrity(state);

  if (state.heat >= HEAT_ARREST) return 'arrest';
  if (hired.length === 0) return 'empty';
  if (state.cash < 0) return 'broke';
  if (state.cash >= EMPIRE_CASH && integrity >= 50 && state.heat < 62) return 'empire';
  if (state.cash >= TARGET_CASH * 0.8 && hired.length >= 2 && integrity >= 30) return 'velvet';
  if (state.cash >= TARGET_CASH * 0.4) return 'quiet';
  return 'broke';
}

export function endingSummary(state: GameState): { label: string; value: string }[] {
  const hired = hiredGirls(state);
  return [
    { label: 'Дней в игре', value: `${Math.min(state.day, DAYS)}` },
    { label: 'Выручка за неделю', value: `${Math.round(state.stats.totalGross)} ₽` },
    { label: 'В кассе', value: `${Math.round(state.cash)} ₽` },
    { label: 'Репутация', value: `${Math.round(state.reputation)}` },
    { label: 'Heat', value: `${Math.round(state.heat)}` },
    { label: 'Команда', value: `${hired.length} из 4` },
    { label: 'Целостность', value: `${teamIntegrity(state)}` },
    { label: 'Инцидентов', value: `${state.stats.incidents}` },
  ];
}

export function isWinning(id: EndingId): boolean {
  return id === 'empire' || id === 'velvet';
}

export function heatMeter(state: GameState): { value: number; label: string; tone: string } {
  const value = clamp(Math.round(state.heat));
  if (value >= 85) return { value, label: 'Критично', tone: 'crit' };
  if (value >= 70) return { value, label: 'Опасно', tone: 'danger' };
  if (value >= 45) return { value, label: 'Внимание', tone: 'warn' };
  return { value, label: 'Спокойно', tone: 'calm' };
}
