import { h, clear } from './dom';
import { WindowManager } from './window';
import { icon } from '../art/icons';
import { sfx } from '../audio/sfx';

export interface Shell {
  stage: HTMLElement;
  desktop: HTMLElement;
  windowsLayer: HTMLElement;
  taskItems: HTMLElement;
  manager: WindowManager;
  setClock(text: string): void;
  setTrayHint(text: string): void;
  setIconsVisible(visible: boolean): void;
  setStartItems(items: StartItem[]): void;
  showBoot(lines: string[], onDone: () => void): void;
  hideBoot(): void;
  showBsod(code: string, onSkip: () => void): void;
  hideBsod(): void;
  refreshTaskbar(): void;
  dispose(): void;
}

export interface StartItem {
  label: string;
  icon?: Parameters<typeof icon>[0];
  action: () => void;
  disabled?: boolean;
  separator?: boolean;
}

interface ShellOptions {
  onDesktopIcon?: (id: string) => void;
  desktopIcons?: { id: string; label: string; icon: Parameters<typeof icon>[0] }[];
}

const WORDMARK = 'PIMP 98';

export function createShell(stage: HTMLElement, options: ShellOptions = {}): Shell {
  clear(stage);

  const desktop = h('div', { class: 'desktop' });
  const windowsLayer = h('div', { class: 'windows' });
  const desktopIcons = h('div', { class: 'desktop-icons' });
  const taskItems = h('div', { class: 'task-items' });
  const clock = h('span', { class: 'clock' }, '12:00');
  const trayHint = h('span', { class: 'tray-hint' });
  const startMenu = h('div', { class: 'start-menu', hidden: true });
  const flag = h(
    'span',
    { class: 'flag', 'aria-hidden': 'true' },
    h('span'),
    h('span'),
    h('span'),
    h('span'),
  );
  const startBtn = h('button', { class: 'start-btn', type: 'button' }, flag, 'Пуск');

  const tray = h(
    'div',
    { class: 'tray' },
    h('span', { class: 'tray-icons', html: `${icon('speaker', 16)}${icon('police', 16)}${icon('floppy', 16)}` }),
    trayHint,
    clock,
  );

  const startRail = h('div', { class: 'start-rail' }, WORDMARK);
  const startList = h('div', { class: 'start-list' });
  startMenu.append(startRail, startList);

  const taskbar = h(
    'div',
    { class: 'taskbar', role: 'toolbar', 'aria-label': 'Панель задач' },
    startBtn,
    h('div', { class: 'taskbar-sep' }),
    taskItems,
    tray,
  );

  desktop.append(desktopIcons, windowsLayer);
  stage.append(desktop, taskbar, startMenu);

  const clockTimer = window.setInterval(() => {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }, 5000);
  clock.textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const closeStart = () => {
    startMenu.hidden = true;
    startBtn.classList.remove('open');
    document.removeEventListener('pointerdown', onOutside, true);
  };
  const onOutside = (event: PointerEvent) => {
    const target = event.target as Node;
    if (!startMenu.contains(target) && !startBtn.contains(target)) closeStart();
  };
  const openStart = () => {
    startMenu.hidden = false;
    startBtn.classList.add('open');
    sfx.open();
    window.setTimeout(() => document.addEventListener('pointerdown', onOutside, true), 0);
  };
  startBtn.addEventListener('click', () => {
    if (startMenu.hidden) openStart();
    else closeStart();
  });
  startBtn.addEventListener('pointerdown', (event) => event.stopPropagation());
  startMenu.addEventListener('pointerdown', (event) => event.stopPropagation());

  const renderIcons = (icons: NonNullable<ShellOptions['desktopIcons']>) => {
    clear(desktopIcons);
    for (const entry of icons) {
      const button = h(
        'button',
        { class: 'desk-icon', type: 'button', 'data-icon': entry.id },
        h('span', { html: icon(entry.icon, 34) }),
        h('span', { class: 'label' }, entry.label),
      );
      button.addEventListener('click', () => {
        document.querySelectorAll('.desk-icon').forEach((node) => node.classList.remove('selected'));
        button.classList.add('selected');
        sfx.click();
        options.onDesktopIcon?.(entry.id);
      });
      button.addEventListener('dblclick', () => options.onDesktopIcon?.(entry.id));
      desktopIcons.append(button);
    }
  };
  if (options.desktopIcons) renderIcons(options.desktopIcons);

  const manager = new WindowManager(windowsLayer, taskItems, () => {
    // nothing yet; hook kept for future layer-aware effects
  });

  let bootEl: HTMLElement | null = null;
  let bsodEl: HTMLElement | null = null;

  const shell: Shell = {
    stage,
    desktop,
    windowsLayer,
    taskItems,
    manager,
    setClock(text: string) {
      clock.textContent = text;
    },
    setTrayHint(text: string) {
      trayHint.textContent = text;
    },
    setIconsVisible(visible: boolean) {
      desktopIcons.style.display = visible ? '' : 'none';
    },
    setStartItems(items: StartItem[]) {
      clear(startList);
      for (const item of items) {
        if (item.separator) {
          startList.append(h('div', { class: 'divider' }));
          continue;
        }
        const button = h(
          'button',
          { class: `start-item${item.disabled ? ' disabled' : ''}`, type: 'button', disabled: item.disabled ? true : false },
          item.icon ? h('span', { html: icon(item.icon, 20) }) : null,
          item.label,
        );
        button.addEventListener('click', () => {
          if (item.disabled) return;
          closeStart();
          sfx.click();
          item.action();
        });
        startList.append(button);
      }
    },
    showBoot(lines: string[], onDone: () => void) {
      const body = h('div', { class: 'boot' });
      lines.forEach((line, index) => {
        const el = h('div', { class: `boot-line${index === lines.length - 1 ? ' hi' : ''}`, style: `animation-delay:${index * 90}ms` }, line);
        body.append(el);
      });
      const bar = h('div', { class: 'boot-bar' }, ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => h('span', { style: `animation-delay:${i * 90}ms` })));
      const logo = h(
        'div',
        { class: 'boot-logo' },
        h('div', {}, h('div', { class: 'wordmark' }, WORDMARK), h('div', { class: 'sub' }, 'бархат · агентство')),
      );
      body.append(logo, bar, h('div', { class: 'boot-skip' }, 'Нажмите любую клавишу...'));
      stage.append(body);
      bootEl = body;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        document.removeEventListener('keydown', finish);
        body.removeEventListener('click', finish);
        shell.hideBoot();
        onDone();
      };
      document.addEventListener('keydown', finish);
      body.addEventListener('click', finish);
      window.setTimeout(finish, lines.length * 90 + 1500);
    },
    hideBoot() {
      bootEl?.remove();
      bootEl = null;
    },
    showBsod(code: string, onSkip: () => void) {
      const body = h(
        'div',
        { class: 'bsod', role: 'alert' },
        h('div', { class: 'head' }, h('span', {}, ' PIMP 98 ')),
        `В системе обнаружена неустранимая ошибка.\n\nКод: ${code}\n\n* Нажмите любую клавишу, чтобы вернуться к разбитым мечтам.\n* Нажмите CTRL+ALT+DEL, чтобы сделать вид, что ничего не произошло.`,
        h('div', { class: 'hint' }, 'Нажмите любую клавишу, чтобы продолжить _'),
      );
      stage.append(body);
      bsodEl = body;
      const finish = () => {
        document.removeEventListener('keydown', finish);
        body.removeEventListener('click', finish);
        shell.hideBsod();
        onSkip();
      };
      document.addEventListener('keydown', finish);
      body.addEventListener('click', finish);
    },
    hideBsod() {
      bsodEl?.remove();
      bsodEl = null;
    },
    refreshTaskbar() {
      // reserved
    },
    dispose() {
      window.clearInterval(clockTimer);
      closeStart();
    },
  };

  shell.setTrayHint('');

  return shell;
}

export function bootLines(): string[] {
  return [
    'PIMP 98 BIOS v1.98 — Award Modular BIOS',
    'Copyright (C) 1984-98, Бархат Systems Inc.',
    '',
    'Pentium MMX 233 MHz ................ OK',
    'Memory Test: 65536K ............... OK',
    'Detecting IDE drives ............ [OK]',
    '  Primary Master  : BARKHAT-HDD 2.1GB',
    '  Primary Slave   : None',
    '  Secondary Master: ATAPI CD-ROM 24x',
    '',
    'Starting PIMP 98...',
  ];
}
