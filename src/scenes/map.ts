import { LOCATIONS } from '../content/locations';
import { unlockLocation } from '../game/actions';
import { setLocation } from '../game/time';
import { money } from '../game/format';
import { icon } from '../art/icons';
import { h } from '../ui/dom';
import { badge, button, divider } from '../ui/controls';
import type { SceneContext } from './context';

export function renderMap(ctx: SceneContext): HTMLElement {
  const s = ctx.state;
  const root = h('div', { class: 'map-list' });

  for (const loc of LOCATIONS) {
    const unlocked = s.unlocked[loc.id] === true;
    const current = s.location === loc.id;
    const row = h('div', { class: `map-row${current ? ' current' : ''}${unlocked ? '' : ' locked'}` });
    row.append(
      h('div', { class: 'loc-icon', html: icon(loc.icon as Parameters<typeof icon>[0], 40) }),
      h(
        'div',
        {},
        h('div', { class: 'loc-name' }, loc.name, current ? ' ' : '', current ? badge('сейчас', 'good') : badge('')),
        h('div', { class: 'loc-desc' }, loc.description),
        h('div', { class: 'small-text muted' }, `Чек: ${money(loc.budgetMin)}–${money(loc.budgetMax)} · heat ${loc.heatWeight}`),
        unlocked ? null : h('div', { class: 'small-text' }, `Нужно: репутация ${loc.unlockRep}, уважение ${loc.unlockRespect}, ${money(loc.unlockCost)}`),
      ),
      h(
        'div',
        { class: 'map-side' },
        current
          ? h('span', { class: 'small-text muted' }, 'вы здесь')
          : unlocked
            ? button('Переехать', () => ctx.act((state) => { setLocation(state, loc.id); return { ok: true, message: `Переехали: ${loc.name}`, spent: false }; }), { small: true })
            : button('Открыть', () => ctx.act((state) => unlockLocation(state, loc.id)), {
                small: true,
                disabled: s.cash < loc.unlockCost || s.reputation < loc.unlockRep || s.respect < loc.unlockRespect,
              }),
      ),
    );
    root.append(row);
  }

  root.append(divider());
  root.append(
    h(
      'p',
      { class: 'small-text muted' },
      'Вокзал — дешёво и людно. Центр — дорого и требовательно. Причал — очень дорого и очень опасно. Heat на причале растёт быстрее всего.',
    ),
  );

  return root;
}
