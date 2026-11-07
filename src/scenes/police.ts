import { BRIBE_COST, BRIBE_HEAT, HEAT_ARREST, HEAT_DANGER, HEAT_WARN, LAWYER_COST, LAWYER_HEAT } from '../game/balance';
import { bribePolice, hireLawyer, layLow } from '../game/actions';
import { heatMeter } from '../game/endings';
import { money } from '../game/format';
import { h } from '../ui/dom';
import { badge, button, divider, meter, statRow } from '../ui/controls';
import type { SceneContext } from './context';

export function renderPolice(ctx: SceneContext): HTMLElement {
  const s = ctx.state;
  const heat = heatMeter(s);
  const root = h('div', { class: 'police-pane' });

  root.append(
    h(
      'div',
      { class: 'card' },
      h('h3', { class: 'card-title' }, 'Внимание ментов', badge(heat.label, heat.tone === 'calm' ? 'good' : heat.tone === 'warn' ? 'warn' : 'danger')),
      meter({ label: 'Heat', value: s.heat, tone: 'heat' }),
      statRow('Порог проверки', `${HEAT_WARN}`),
      statRow('Порог облавы', `${HEAT_DANGER}`),
      statRow('Арест', `${HEAT_ARREST}`, 'danger'),
      h('p', { class: 'small-text muted' }, 'Heat растёт от ночей, скандалов и жёстких решений. Взятка снимает часть, но оставляет след.'),
    ),
  );

  root.append(divider());

  root.append(
    h(
      'div',
      { class: 'card' },
      h('h3', { class: 'card-title' }, 'Действия'),
      h(
        'div',
        { class: 'action-row' },
        button(`Взятка · ${money(BRIBE_COST)}`, () => ctx.act((state) => bribePolice(state)), {
          disabled: s.cash < BRIBE_COST || s.heat < 30 || s.slot === 3,
          title: `Снимает ${BRIBE_HEAT} heat`,
        }),
        button(`Адвокат · ${money(LAWYER_COST)}`, () => ctx.act((state) => hireLawyer(state)), {
          disabled: s.cash < LAWYER_COST || s.slot === 3,
          title: `Снимает ${LAWYER_HEAT} heat`,
        }),
        button('Затаиться', () => ctx.act((state) => layLow(state)), {
          disabled: s.slot === 3,
          title: '−14 heat, но −2 репутации',
        }),
      ),
    ),
  );

  const flags = s.flags;
  const deals: string[] = [];
  if (flags.cop_paid) deals.push('Гринько получил конверт. Один раз.');
  if (flags.cop_refused) deals.push('Ты отказал Гринько. Он это запомнил.');
  if (flags.lawyer) deals.push(`Адвокат работал ${flags.lawyer} раз(а).`);
  if (flags.press_paid) deals.push('Пресса оплачена. Пока молчит.');
  if (flags.press_deal) deals.push('С журналистом есть сделка.');
  if (flags.tribute_paid) deals.push('Дань на причале платится.');
  if (flags.tribute_refused) deals.push('От дани отказался. Это заметили.');
  if (flags.raid_survived) deals.push('Облава пережита.');
  if (flags.faceless_client) deals.push('Клиент без лица существует.');

  root.append(
    h(
      'div',
      { class: 'card' },
      h('h3', { class: 'card-title' }, 'Дела и договорённости'),
      deals.length === 0
        ? h('p', { class: 'small-text muted' }, 'Пока никого не пришлось покупать. Это ненадолго.')
        : h('ul', { class: 'small-text' }, ...deals.map((deal) => h('li', {}, deal))),
    ),
  );

  return root;
}
