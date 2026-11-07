import { h, clear } from './dom';

export interface DialogButton {
  label: string;
  primary?: boolean;
  value: string;
}

export interface DialogOptions {
  title: string;
  icon?: string;
  message: string;
  detail?: string;
  buttons?: DialogButton[];
}

export function showDialog(options: DialogOptions): Promise<string> {
  return new Promise((resolve) => {
    const buttons = options.buttons ?? [{ label: 'OK', primary: true, value: 'ok' }];
    const overlay = h('div', { class: 'dialog-overlay', role: 'dialog', 'aria-modal': 'true' });
    const settle = (value: string) => {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      resolve(value);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') settle(buttons[0]?.value ?? 'ok');
      if (event.key === 'Enter') settle(buttons.find((b) => b.primary)?.value ?? buttons[0]?.value ?? 'ok');
    };
    const buttonRow = h(
      'div',
      { class: 'dialog-buttons' },
      ...buttons.map((button) =>
        h('button', { class: `btn${button.primary ? ' default' : ''}`, type: 'button', onclick: () => settle(button.value) }, button.label),
      ),
    );
    const body = h(
      'div',
      { class: 'dialog-body' },
      options.icon ? h('img', { class: 'dialog-icon', src: options.icon, alt: '', width: 32, height: 32 }) : null,
      h('div', { class: 'dialog-text' }, h('p', {}, options.message), options.detail ? h('p', { class: 'muted' }, options.detail) : null),
    );
    const box = h(
      'div',
      { class: 'dialog window focused' },
      h('div', { class: 'win-titlebar' }, h('span', { class: 'win-title-text' }, options.title)),
      h('div', { class: 'win-frame' }, body, buttonRow),
    );
    overlay.append(box);
    document.body.append(overlay);
    document.addEventListener('keydown', onKey);
    const first = box.querySelector<HTMLButtonElement>('.btn.default') ?? box.querySelector<HTMLButtonElement>('.btn');
    first?.focus();
  });
}

export async function confirmDialog(title: string, message: string, okLabel = 'Да', cancelLabel = 'Отмена'): Promise<boolean> {
  const result = await showDialog({
    title,
    message,
    buttons: [
      { label: okLabel, value: 'ok', primary: true },
      { label: cancelLabel, value: 'cancel' },
    ],
  });
  return result === 'ok';
}

export function toast(message: string, kind: 'info' | 'error' | 'money' = 'info', timeout = 2600): void {
  const el = h('div', { class: `toast toast-${kind}`, role: 'status' }, message);
  document.body.append(el);
  window.setTimeout(() => el.classList.add('leaving'), timeout - 260);
  window.setTimeout(() => el.remove(), timeout);
}

export function openMenu(anchor: HTMLElement, items: { label: string; action?: () => void; disabled?: boolean; separator?: boolean }[]): void {
  document.querySelectorAll('.popup-menu').forEach((node) => node.remove());
  const menu = h(
    'div',
    { class: 'popup-menu window focused' },
    ...items.map((item) =>
      item.separator
        ? h('div', { class: 'menu-sep' })
        : h(
            'button',
            {
              class: `menu-row${item.disabled ? ' disabled' : ''}`,
              type: 'button',
              disabled: item.disabled ? true : false,
              onclick: () => {
                menu.remove();
                item.action?.();
              },
            },
            item.label,
          ),
    ),
  );
  const rect = anchor.getBoundingClientRect();
  menu.style.left = `${Math.min(window.innerWidth - 220, rect.left)}px`;
  menu.style.top = `${rect.bottom + 2}px`;
  document.body.append(menu);
  const close = (event: PointerEvent) => {
    if (!menu.contains(event.target as Node)) {
      menu.remove();
      document.removeEventListener('pointerdown', close, true);
    }
  };
  window.setTimeout(() => document.addEventListener('pointerdown', close, true), 0);
}

export function clearNode(el: Element): void {
  clear(el);
}
