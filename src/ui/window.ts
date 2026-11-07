import { h } from './dom';

export interface MenuItem {
  label: string;
  action?: () => void;
  disabled?: boolean;
  separator?: boolean;
}

export interface WindowMenu {
  label: string;
  items: MenuItem[];
}

export interface WindowOptions {
  id: string;
  title: string;
  icon?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  resizable?: boolean;
  onClose?: () => void;
  onFocus?: () => void;
  status?: string;
  menu?: WindowMenu[];
}

export interface ManagedWindow {
  id: string;
  el: HTMLDivElement;
  body: HTMLDivElement;
  statusBar: HTMLDivElement;
  title: string;
  minimized: boolean;
  focused: boolean;
  setTitle(title: string): void;
  setStatus(text: string): void;
  setMenu(menu: WindowMenu[]): void;
  focus(): void;
  minimize(): void;
  toggleMinimize(): void;
  close(): void;
}

let zCounter = 10;

function renderMenuBar(bar: HTMLElement, menu: WindowMenu[]): void {
  bar.replaceChildren();
  for (const group of menu) {
    const trigger = h('button', { class: 'menubar-item', type: 'button' }, group.label);
    trigger.addEventListener('click', () => {
      document.querySelectorAll('.menubar-popup').forEach((node) => node.remove());
      const popup = h(
        'div',
        { class: 'menubar-popup window focused' },
        ...group.items.map((item) =>
          item.separator
            ? h('div', { class: 'menu-sep' })
            : h(
                'button',
                {
                  class: `menu-row${item.disabled ? ' disabled' : ''}`,
                  type: 'button',
                  disabled: item.disabled ? true : false,
                  onclick: () => {
                    popup.remove();
                    item.action?.();
                  },
                },
                item.label,
              ),
        ),
      );
      const rect = trigger.getBoundingClientRect();
      popup.style.left = `${Math.round(rect.left)}px`;
      popup.style.top = `${Math.round(rect.bottom)}px`;
      document.body.append(popup);
      const close = (event: PointerEvent) => {
        if (!popup.contains(event.target as Node) && event.target !== trigger) {
          popup.remove();
          document.removeEventListener('pointerdown', close, true);
        }
      };
      window.setTimeout(() => document.addEventListener('pointerdown', close, true), 0);
    });
    bar.append(trigger);
  }
}

interface Entry {
  win: ManagedWindow;
  button: HTMLButtonElement;
}

export class WindowManager {
  private container: HTMLElement;
  private entries = new Map<string, Entry>();
  private taskbarItems: HTMLElement;
  private onLayerChange: () => void;
  private z = ++zCounter;

  constructor(container: HTMLElement, taskbarItems: HTMLElement, onLayerChange: () => void = () => {}) {
    this.container = container;
    this.taskbarItems = taskbarItems;
    this.onLayerChange = onLayerChange;
  }

  get(id: string): ManagedWindow | undefined {
    return this.entries.get(id)?.win;
  }

  list(): ManagedWindow[] {
    return [...this.entries.values()].map((entry) => entry.win);
  }

  close(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.win.el.remove();
    entry.button.remove();
    this.entries.delete(id);
    this.onLayerChange();
  }

  closeAllExcept(keep: string[]): void {
    for (const id of [...this.entries.keys()]) {
      if (!keep.includes(id)) this.close(id);
    }
  }

  open(options: WindowOptions): ManagedWindow {
    const existing = this.entries.get(options.id)?.win;
    if (existing) {
      if (existing.minimized) existing.toggleMinimize();
      existing.focus();
      return existing;
    }

    const width = options.width ?? 420;
    const height = options.height ?? 320;
    const maxX = Math.max(0, this.container.clientWidth - width - 8);
    const maxY = Math.max(0, this.container.clientHeight - height - 48);
    const slot = this.findSlot(width, height);
    const posX = Math.min(maxX, Math.max(0, options.x ?? slot.x));
    const posY = Math.min(maxY, Math.max(0, options.y ?? slot.y));

    const titleText = h('span', { class: 'win-title-text' }, options.title);
    const closeBtn = h('button', { class: 'win-btn win-close', type: 'button', title: 'Закрыть', 'aria-label': 'Закрыть' }, '✕');
    const minBtn = h('button', { class: 'win-btn', type: 'button', title: 'Свернуть', 'aria-label': 'Свернуть' }, '_');
    const maxBtn = h('button', { class: 'win-btn', type: 'button', title: 'Развернуть', 'aria-label': 'Развернуть' }, '□');

    const titlebar = h(
      'div',
      { class: 'win-titlebar' },
      options.icon ? h('img', { class: 'win-icon', src: options.icon, alt: '', width: 16, height: 16 }) : null,
      titleText,
      h('div', { class: 'win-buttons' }, minBtn, maxBtn, closeBtn),
    );

    const body = h('div', { class: 'win-body' });
    const menuBar = h('div', { class: 'win-menubar' });
    const statusBar = h('div', { class: 'win-status' }, options.status ?? '');
    const el = h(
      'div',
      { class: `window${options.resizable ? ' resizable' : ''}`, 'data-window': options.id },
      titlebar,
      h('div', { class: 'win-frame' }, menuBar, body),
      statusBar,
    );

    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    el.style.left = `${posX}px`;
    el.style.top = `${posY}px`;

    if (options.resizable) {
      const grip = h('div', { class: 'win-resize', title: 'Изменить размер' });
      el.append(grip);
      this.attachResize(grip, el);
    }

    const button = h(
      'button',
      { class: 'task-item', type: 'button', 'data-task': options.id },
      options.icon ? h('img', { class: 'win-icon', src: options.icon, alt: '', width: 14, height: 14 }) : null,
      h('span', { class: 'task-label' }, options.title),
    );
    this.taskbarItems.append(button);

    let saved: { left: string; top: string; width: string; height: string } | null = null;
    const manager = this;

    const setFocused = (value: boolean) => {
      win.focused = value;
      win.el.classList.toggle('focused', value);
      button.classList.toggle('active', value);
    };

    const win: ManagedWindow = {
      id: options.id,
      el,
      body,
      statusBar,
      title: options.title,
      minimized: false,
      focused: false,
      setTitle(title: string) {
        win.title = title;
        titleText.textContent = title;
        const label = button.querySelector('.task-label');
        if (label) label.textContent = title;
      },
      setStatus(text: string) {
        statusBar.textContent = text;
        statusBar.classList.toggle('empty', text.length === 0);
      },
      setMenu(menu: WindowMenu[]) {
        renderMenuBar(menuBar, menu);
      },
      focus() {
        manager.focusEntry(entry);
        options.onFocus?.();
      },
      minimize() {
        win.el.classList.add('minimized');
        win.minimized = true;
        setFocused(false);
      },
      toggleMinimize() {
        if (win.minimized) {
          win.el.classList.remove('minimized');
          win.minimized = false;
          win.focus();
        } else {
          win.minimize();
        }
      },
      close() {
        options.onClose?.();
        manager.close(options.id);
      },
    };

    const entry: Entry = { win, button };
    this.entries.set(options.id, entry);

    button.addEventListener('click', () => {
      if (win.minimized) {
        win.el.classList.remove('minimized');
        win.minimized = false;
        win.focus();
      } else if (win.focused) {
        win.minimize();
      } else {
        win.focus();
      }
    });

    closeBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      win.close();
    });
    minBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      win.minimize();
    });
    maxBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      if (el.classList.contains('maximized')) {
        el.classList.remove('maximized');
        if (saved) {
          el.style.left = saved.left;
          el.style.top = saved.top;
          el.style.width = saved.width;
          el.style.height = saved.height;
        }
        saved = null;
      } else {
        saved = { left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height };
        el.classList.add('maximized');
        el.style.left = '0px';
        el.style.top = '0px';
        el.style.width = '100%';
        el.style.height = '100%';
      }
    });

    titlebar.addEventListener('dblclick', () => maxBtn.click());

    this.container.append(el);
    this.attachDrag(titlebar, el);
    el.addEventListener('pointerdown', () => this.focusEntry(entry), true);
    if (options.menu && options.menu.length > 0) {
      renderMenuBar(menuBar, options.menu);
    } else {
      menuBar.remove();
    }
    win.focus();
    this.onLayerChange();
    return win;
  }

  /** Picks an empty-ish spot so new windows do not land on top of each other. */
  private findSlot(width: number, height: number): { x: number; y: number } {
    const areaW = this.container.clientWidth;
    const areaH = this.container.clientHeight;
    const step = 26;
    const existing = [...this.entries.values()].map((entry) => ({
      left: entry.win.el.offsetLeft,
      top: entry.win.el.offsetTop,
      right: entry.win.el.offsetLeft + entry.win.el.offsetWidth,
      bottom: entry.win.el.offsetTop + entry.win.el.offsetHeight,
    }));

    for (let y = 12; y < Math.max(12, areaH - height - 8); y += step) {
      for (let x = 12; x < Math.max(12, areaW - width - 8); x += step) {
        const overlaps = existing.some(
          (rect) => x < rect.right - 60 && x + width > rect.left + 60 && y < rect.bottom - 40 && y + height > rect.top + 40,
        );
        if (!overlaps) return { x, y };
      }
    }
    const offset = this.entries.size * step;
    return { x: 16 + offset, y: 12 + offset };
  }

  private attachResize(grip: HTMLElement, el: HTMLElement): void {    grip.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startY = event.clientY;
      const startW = el.offsetWidth;
      const startH = el.offsetHeight;
      const move = (ev: PointerEvent) => {
        el.style.width = `${Math.max(260, startW + (ev.clientX - startX))}px`;
        el.style.height = `${Math.max(170, startH + (ev.clientY - startY))}px`;
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  }

  private attachDrag(handle: HTMLElement, el: HTMLElement): void {
    handle.addEventListener('pointerdown', (event) => {
      if ((event.target as HTMLElement).closest('.win-btn')) return;
      if (el.classList.contains('maximized')) return;
      event.preventDefault();
      const offsetX = event.clientX - el.offsetLeft;
      const offsetY = event.clientY - el.offsetTop;
      const move = (ev: PointerEvent) => {
        const maxX = Math.max(-el.offsetWidth + 80, this.container.clientWidth - 80);
        const maxY = Math.max(0, this.container.clientHeight - 40);
        const x = Math.min(maxX, Math.max(-el.offsetWidth + 80, ev.clientX - offsetX));
        const y = Math.min(maxY, Math.max(0, ev.clientY - offsetY));
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  }

  private focusEntry(entry: Entry): void {
    for (const other of this.entries.values()) {
      other.win.focused = false;
      other.win.el.classList.remove('focused');
      other.button.classList.remove('active');
    }
    entry.win.focused = true;
    entry.win.el.classList.add('focused');
    entry.win.el.classList.remove('minimized');
    entry.win.minimized = false;
    entry.button.classList.add('active');
    this.z += 1;
    entry.win.el.style.zIndex = String(this.z);
    this.onLayerChange();
  }
}
