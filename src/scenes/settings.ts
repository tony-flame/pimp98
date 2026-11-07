import type { Settings } from '../game/types';
import { DAILY_RENT, START_CASH, TARGET_CASH } from '../game/balance';
import { money } from '../game/format';
import { h } from '../ui/dom';
import { button } from '../ui/controls';
import type { SceneContext } from './context';

export function renderSettings(ctx: SceneContext): HTMLElement {
  const s = ctx.settings;
  const root = h('div', { class: 'settings-grid' });

  const toggles: { key: keyof Settings; label: string; note: string }[] = [
    { key: 'crt', label: 'CRT-эффект', note: 'Лёгкое дрожание экрана. Как в 1998-м.' },
    { key: 'scanlines', label: 'Сканлайны', note: 'Горизонтальные полосы поверх изображения.' },
    { key: 'sound', label: 'Звук', note: 'Пищалки, клики и звон кассы. Синтезируются на месте.' },
    { key: 'fastBoot', label: 'Быстрая загрузка', note: 'Пропускать BIOS при старте новой игры.' },
  ];

  for (const row of toggles) {
    const input = h('input', { type: 'checkbox', ...(s[row.key] ? { checked: true } : {}) });
    input.addEventListener('change', () => ctx.setSetting(row.key, input.checked));
    root.append(
      h(
        'div',
        {},
        h('label', { class: 'checkbox' }, input, h('strong', {}, row.label)),
        h('div', { class: 'settings-note' }, row.note),
      ),
    );
  }

  root.append(
    h(
      'div',
      { class: 'settings-note' },
      `Старт: ${money(START_CASH)} · аренда ${money(DAILY_RENT)}/ночь · цель ${money(TARGET_CASH)}.`,
    ),
  );

  root.append(button('Сохранить игру', () => ctx.save(), { default: true }));
  return root;
}
