import { DAILY_RENT, TARGET_CASH } from '../game/balance';
import { girlWage } from '../game/economy';
import { money, signed } from '../game/format';
import { hiredGirls, teamIntegrity } from '../game/state';
import { h } from '../ui/dom';
import { meter, statRow } from '../ui/controls';
import type { SceneContext } from './context';

export function renderLedger(ctx: SceneContext): HTMLElement {
  const s = ctx.state;
  const hired = hiredGirls(s);
  const wagesNight = hired.reduce((sum, g) => sum + girlWage(g), 0);
  const root = h('div', { class: 'ledger-grid' });

  const cashCard = h(
    'div',
    { class: 'card' },
    h('h3', { class: 'card-title' }, 'Касса'),
    h('div', { class: 'big-number' }, money(s.cash)),
    statRow('Цель недели', money(TARGET_CASH)),
    statRow('Осталось собрать', money(Math.max(0, TARGET_CASH - s.cash)), TARGET_CASH - s.cash <= 0 ? 'money' : 'warn'),
    statRow('Выручка за неделю', money(s.stats.totalGross), 'money'),
  );
  root.append(cashCard);

  const costsCard = h('div', { class: 'card' }, h('h3', { class: 'card-title' }, 'Расходы за ночь'));
  const table = h(
    'table',
    { class: 'ledger-table' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Статья'), h('th', { class: 'num' }, 'Сумма'))),
    h(
      'tbody',
      {},
      ...hired.map((g) =>
        h('tr', {}, h('td', {}, `Зарплата · ${g.name}`), h('td', { class: 'num' }, money(girlWage(g)))),
      ),
      h('tr', {}, h('td', {}, 'Аренда'), h('td', { class: 'num' }, money(DAILY_RENT))),
      h('tr', { class: 'total' }, h('td', {}, 'Итого'), h('td', { class: 'num' }, money(wagesNight + DAILY_RENT))),
    ),
  );
  costsCard.append(table);
  if (hired.length === 0) costsCard.append(h('p', { class: 'small-text muted' }, 'Девушек нет — платить некому. Пока.'));
  root.append(costsCard);

  const healthCard = h(
    'div',
    { class: 'card' },
    h('h3', { class: 'card-title' }, 'Показатели'),
    meter({ label: 'Репутация', value: s.reputation, tone: 'rep' }),
    meter({ label: 'Heat', value: s.heat, tone: 'heat' }),
    meter({ label: 'Уважение', value: s.respect, tone: 'respect' }),
    meter({ label: 'Целостность команды', value: teamIntegrity(s), tone: 'loyalty' }),
    statRow('Инцидентов', String(s.stats.incidents)),
    statRow('Потеряно девушек', String(s.stats.girlsLost)),
  );
  root.append(healthCard);

  const lastNight = s.nightReport;
  const lastCard = h('div', { class: 'card' }, h('h3', { class: 'card-title' }, 'Последняя ночь'));
  if (!lastNight) {
    lastCard.append(h('p', { class: 'small-text muted' }, 'Ещё не было.'));
  } else {
    lastCard.append(
      statRow('Выручка', money(lastNight.gross), 'money'),
      statRow('Зарплаты', money(-lastNight.wages), 'danger'),
      statRow('Аренда', money(-lastNight.rent), 'danger'),
      statRow('Итого', signed(lastNight.net), lastNight.net >= 0 ? 'money' : 'danger'),
      statRow('Δ репутации', signed(lastNight.repDelta)),
      statRow('Δ heat', signed(lastNight.heatDelta), 'warn'),
    );
  }
  root.append(lastCard);

  return root;
}
