import { h } from './dom';

export interface MeterOptions {
  label: string;
  value: number;
  max?: number;
  tone?: 'rep' | 'heat' | 'respect' | 'cash' | 'skill' | 'stress' | 'loyalty';
  display?: string;
}

export function meter(options: MeterOptions): HTMLElement {
  const max = options.max ?? 100;
  const pct = Math.max(0, Math.min(100, (options.value / max) * 100));
  return h(
    'div',
    { class: `meter meter-${options.tone ?? 'rep'}` },
    h(
      'div',
      { class: 'meter-head' },
      h('span', { class: 'meter-label' }, options.label),
      h('span', { class: 'meter-value' }, options.display ?? String(Math.round(options.value))),
    ),
    h('div', { class: 'meter-track' }, h('div', { class: 'meter-fill', style: `width:${pct}%` })),
  );
}

export function statRow(label: string, value: string, tone = ''): HTMLElement {
  return h('div', { class: `stat-row ${tone}` }, h('span', { class: 'stat-label' }, label), h('span', { class: 'stat-value' }, value));
}

export function badge(text: string, tone = ''): HTMLElement {
  return h('span', { class: `badge ${tone}`.trim() }, text);
}

export function tag(text: string, tone = ''): HTMLElement {
  return h('span', { class: `tag ${tone}`.trim() }, text);
}

export function button(
  label: string,
  onClick: () => void,
  options: { disabled?: boolean; default?: boolean; small?: boolean; title?: string } = {},
): HTMLButtonElement {
  return h(
    'button',
    {
      class: `btn${options.default ? ' default' : ''}${options.small ? ' small' : ''}`,
      type: 'button',
      disabled: options.disabled ? true : false,
      title: options.title ?? '',
      onclick: onClick,
    },
    label,
  );
}

export function panel(title: string, ...children: (Node | string | null)[]): HTMLElement {
  return h('section', { class: 'panel' }, h('h3', { class: 'panel-title' }, title), ...children);
}

export function divider(): HTMLElement {
  return h('div', { class: 'divider' });
}

export function emptyState(text: string): HTMLElement {
  return h('div', { class: 'empty-state' }, text);
}
