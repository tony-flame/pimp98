import { h } from '../ui/dom';
import { button, emptyState } from '../ui/controls';
import type { SceneContext } from './context';

export function renderJournal(ctx: SceneContext): HTMLElement {
  const s = ctx.state;
  const root = h('div', { class: 'journal-pane' });

  root.append(
    h(
      'div',
      { class: 'toolbar' },
      h('span', { class: 'small-text muted' }, `Записей: ${s.log.length}`),
      h('div', { class: 'toolbar-spacer' }),
      button('Офис', () => ctx.open('office'), { small: true }),
    ),
  );

  const list = h('div', { class: 'journal' });
  if (s.log.length === 0) {
    list.append(emptyState('Журнал пуст. Тишина бывает только в начале.'));
  } else {
    for (const entry of [...s.log].slice(-120).reverse()) {
      list.append(
        h(
          'div',
          { class: `journal-entry kind-${entry.kind}` },
          h('span', { class: 'when' }, `Д${entry.day} · ${entry.slot}`),
          h('span', { class: 'text' }, entry.text),
        ),
      );
    }
  }
  root.append(list);
  return root;
}
