import { GIRLS, TRAIT_LABELS } from '../content/girls';
import { hireGirl, wageOf } from '../game/actions';
import { money } from '../game/format';
import { girl } from '../game/state';
import { renderPortrait } from '../art/portrait';
import { h } from '../ui/dom';
import { badge, button, meter } from '../ui/controls';
import type { SceneContext } from './context';

export function renderRoster(ctx: SceneContext): HTMLElement {
  const s = ctx.state;
  const root = h('div', { class: 'roster' });

  root.append(
    h(
      'div',
      { class: 'toolbar' },
      h('span', { class: 'small-text muted' }, `В команде: ${s.girls.filter((g) => g.hired).length} из 4`),
      h('div', { class: 'toolbar-spacer' }),
      button('Досье', () => ctx.open('roster'), { small: true }),
    ),
  );

  const grid = h('div', { class: 'girl-grid' });
  for (const arche of GIRLS) {
    const g = girl(s, arche.id);
    if (!g) continue;
    const card = h(
      'button',
      {
        class: [
          'girl-card',
          g.hired ? '' : 'inactive',
          g.restUntilDay > s.day ? 'resting' : '',
          g.stress >= 70 ? 'hurt' : '',
        ]
          .filter(Boolean)
          .join(' '),
        type: 'button',
        onclick: () => ctx.openDossier(arche.id),
      },
      h('div', { class: 'portrait-wrap', html: renderPortrait(arche.portrait, { width: 112, height: 130, mood: g.hired ? 'plain' : 'dim' }) }),
      h(
        'div',
        { class: 'girl-name-row' },
        h('span', { class: 'girl-name' }, arche.name),
        badge(g.hired ? (g.restUntilDay > s.day ? 'отдых' : 'в деле') : 'свободна', g.hired ? 'good' : ''),
      ),
      h('div', { class: 'girl-sub' }, `${arche.age} · ${arche.tagline}`),
    );
    if (g.hired) {
      card.append(
        h(
          'div',
          { class: 'girl-meters' },
          meter({ label: 'Навык', value: g.skill, tone: 'skill' }),
          meter({ label: 'Стресс', value: g.stress, tone: 'stress' }),
          meter({ label: 'Верность', value: g.loyalty, tone: 'loyalty' }),
        ),
        h('div', { class: 'small-text muted' }, `Зарплата ${money(wageOf(s, arche.id))}/ночь · ${TRAIT_LABELS[arche.traits[0] ?? ''] ?? ''}`),
      );
    } else {
      card.append(
        h('div', { class: 'girl-sub' }, `Подъёмные: ${money(arche.hireCost)}`),
        h(
          'div',
          { class: 'action-row' },
          button(
            'Нанять',
            () => ctx.act((state) => hireGirl(state, arche.id)),
            { small: true, disabled: s.cash < arche.hireCost || s.slot === 3, title: 'Требует слот' },
          ),
        ),
      );
    }
    grid.append(card);
  }

  root.append(grid);
  return root;
}
