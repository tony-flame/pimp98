import type { EndingDef } from '../game/endings';
import { endingSummary } from '../game/endings';
import type { GameState } from '../game/types';
import { h } from '../ui/dom';
import { button } from '../ui/controls';

export interface EndingProps {
  ending: EndingDef;
  state: GameState;
  onRestart: () => void;
  onExport: () => void;
}

export function renderEnding(props: EndingProps): HTMLElement {
  const stats = endingSummary(props.state);
  const root = h('div', { class: 'ending-screen' });

  const card = h(
    'div',
    { class: 'ending-card' },
    h('h1', {}, props.ending.title),
    h('div', { class: 'code' }, `${props.ending.code} · ${props.ending.tone.toUpperCase()}`),
    h('p', {}, props.ending.text),
    h('p', { class: 'hint' }, props.ending.hint),
    h(
      'div',
      { class: 'ending-stats' },
      ...stats.map((stat) =>
        h('div', { class: 'ending-stat' }, h('div', { class: 'k' }, stat.label), h('div', { class: 'v' }, stat.value)),
      ),
    ),
    h(
      'div',
      { class: 'ending-actions' },
      button('Новая неделя', () => props.onRestart(), { default: true }),
      button('Выгрузить сохранение', () => props.onExport()),
    ),
  );
  root.append(card);
  return root;
}
