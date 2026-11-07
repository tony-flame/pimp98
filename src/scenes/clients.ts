import { CLIENT_KIND_LABELS } from '../content/girls';
import { locationDef } from '../content/locations';
import { RISK_LABEL } from '../game/balance';
import { money } from '../game/format';
import { girlWage } from '../game/economy';
import { hiredGirls } from '../game/state';
import { h } from '../ui/dom';
import { badge, button, emptyState } from '../ui/controls';
import type { SceneContext } from './context';

export function renderClients(ctx: SceneContext): HTMLElement {
  const s = ctx.state;
  const root = h('div', { class: 'clients-pane' });

  root.append(
    h(
      'div',
      { class: 'toolbar' },
      h('span', { class: 'small-text muted' }, locationDef(s.location).name),
      h('div', { class: 'toolbar-spacer' }),
      button('Районы', () => ctx.open('map'), { small: true }),
      button('Офис', () => ctx.open('office'), { small: true }),
    ),
  );

  const list = h('div', { class: 'client-list' });

  if (s.slot !== 3) {
    list.append(emptyState('Клиенты появляются к ночи. Пока можно заняться делами.'));
  } else if (s.offers.length === 0) {
    list.append(emptyState('Сегодня никто не пришёл. Бывает.'));
  } else {
    for (const offer of s.offers) {
      const row = h('div', { class: `client-row${offer.risk !== 'none' ? ' risky' : ''}${s.assignments[offer.id] ? ' assigned' : ''}` });
      const assignedId = s.assignments[offer.id] ?? '';
      const select = h(
        'select',
        { 'aria-label': `Девушка для ${offer.clientName}` },
        h('option', { value: '' }, '— никто —'),
        ...hiredGirls(s).map((g) =>
          h(
            'option',
            { value: g.id, ...(assignedId === g.id ? { selected: true } : {}) },
            `${g.name} · ${Math.round(g.skill)}${g.restUntilDay > s.day ? ' (отдых)' : ''}`,
          ),
        ),
      );
      select.addEventListener('change', () => {
        const value = select.value;
        ctx.assign(offer.id, value === '' ? null : value);
      });
      row.append(
        h(
          'div',
          { class: 'client-main' },
          h(
            'div',
            { class: 'client-top' },
            h('span', { class: 'client-name' }, offer.clientName),
            badge(CLIENT_KIND_LABELS[offer.kind]),
            badge(RISK_LABEL[offer.risk], offer.risk === 'none' ? '' : 'warn'),
          ),
          h('div', { class: 'client-demand' }, offer.demand),
          h('div', { class: 'small-text muted' }, `Нужен навык от ${offer.minSkill}`),
        ),
        h(
          'div',
          { class: 'client-side' },
          h('span', { class: 'client-budget' }, money(offer.budget)),
          select,
        ),
      );
      list.append(row);
    }
  }
  root.append(list);

  const footer = h('div', { class: 'clients-footer' });
  const assignedCount = Object.keys(s.assignments).length;
  const wages = hiredGirls(s).reduce((sum, g) => sum + girlWage(g), 0);
  footer.append(
    h('span', { class: 'small-text' }, `Назначено: ${assignedCount} · зарплаты: ${money(wages)}`),
    h('div', { class: 'toolbar-spacer' }),
    button('Начать ночь', () => ctx.startNight(), { default: true, disabled: s.slot !== 3 || assignedCount === 0 }),
  );
  root.append(footer);
  return root;
}
