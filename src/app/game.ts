import { DAYS, DAILY_RENT, HEAT_ARREST } from '../game/balance';
import { SAVE_VERSION, createNewGame, hiredGirls } from '../game/state';
import type { ActionResult } from '../game/actions';
import { runNight } from '../game/economy';
import { evaluateEnding, ENDINGS } from '../game/endings';
import { chooseEventOption, closeEvent, currentEvent, maybeQueueEvent, queueForcedEvent } from '../game/events';
import { dayLabel, money, slotLabel } from '../game/format';
import { hasSave, loadGame, loadSettings, saveGame, saveSettings, downloadSave } from '../game/save';
import { nightRng, eventRng, startNextDay, refreshOffers } from '../game/time';
import type { EndingId, GameState, GirlId, Settings, StoryEventDef } from '../game/types';
import { GIRLS, girlArchetype } from '../content/girls';
import { icon } from '../art/icons';
import { renderPortrait } from '../art/portrait';
import { sfx, setSoundEnabled } from '../audio/sfx';
import { h, clear } from '../ui/dom';
import { showDialog, toast } from '../ui/dialog';
import { createShell, bootLines, type Shell } from '../ui/shell';
import type { WindowMenu } from '../ui/window';
import type { SceneId } from '../scenes/context';

/** Shared menu shown in every game window. */
function appMenu(app: GameApp): WindowMenu[] {
  return [
    {
      label: 'Файл',
      items: [
        { label: 'Сохранить', action: () => app.saveNow() },
        { label: 'Выгрузить сохранение', action: () => app.exportSave() },
        { separator: true, label: '' },
        { label: 'Выход в меню', action: () => void app.confirmQuit() },
      ],
    },
    {
      label: 'Игра',
      items: [
        { label: 'Офис', action: () => app.openScreen('office') },
        { label: 'Девушки', action: () => app.openScreen('roster') },
        { label: 'Клиенты', action: () => app.openScreen('clients') },
        { label: 'Районы', action: () => app.openScreen('map') },
        { separator: true, label: '' },
        { label: 'Завершить неделю', action: () => app.forceEnd() },
      ],
    },
    {
      label: 'Справка',
      items: [
        { label: 'Как играть', action: () => app.showHelp() },
        { label: 'О программе', action: () => app.showAbout() },
      ],
    },
  ];
}

const SCREENS: Record<SceneId, { title: string; width: number; height: number; x?: number; y?: number; icon: Parameters<typeof icon>[0] }> = {
  office: { title: 'Офис', width: 500, height: 620, x: 10, y: 10, icon: 'office' },
  roster: { title: 'Девушки', width: 496, height: 620, x: 518, y: 10, icon: 'girls' },
  clients: { title: 'Клиенты на ночь', width: 496, height: 620, x: 518, y: 10, icon: 'clients' },
  map: { title: 'Районы', width: 496, height: 620, x: 518, y: 10, icon: 'map' },
  ledger: { title: 'Бухгалтерия', width: 496, height: 620, x: 518, y: 10, icon: 'ledger' },
  police: { title: 'Участок', width: 496, height: 620, x: 518, y: 10, icon: 'police' },
  journal: { title: 'Журнал', width: 496, height: 620, x: 518, y: 10, icon: 'journal' },
  settings: { title: 'Настройки', width: 420, height: 440, x: 560, y: 80, icon: 'computer' },
};

/** Screens that share the right-hand column: one at a time. */
const RIGHT_SLOT: SceneId[] = ['roster', 'clients', 'map', 'ledger', 'police', 'journal', 'settings'];

const DESKTOP_ICONS = [
  { id: 'office', label: 'Офис', icon: 'office' },
  { id: 'roster', label: 'Девушки', icon: 'girls' },
  { id: 'clients', label: 'Клиенты', icon: 'clients' },
  { id: 'map', label: 'Районы', icon: 'map' },
  { id: 'ledger', label: 'Бухгалтерия', icon: 'ledger' },
  { id: 'police', label: 'Участок', icon: 'police' },
  { id: 'journal', label: 'Журнал', icon: 'journal' },
  { id: 'settings', label: 'Настройки', icon: 'computer' },
] as const;

export class GameApp {
  private stage: HTMLElement;
  private shell: Shell;
  private state: GameState;
  private settings: Settings;
  private booted = false;
  private endingShown = false;

  constructor(stage: HTMLElement) {
    this.stage = stage;
    this.settings = loadSettings();
    setSoundEnabled(this.settings.sound);
    this.state = createNewGame(String(Date.now()));
    this.shell = createShell(stage, {
      desktopIcons: DESKTOP_ICONS.map((entry) => ({ ...entry })),
      onDesktopIcon: (id) => this.openScreen(id as SceneId),
    });
    this.applySettings();
    this.fitStage();
    window.addEventListener('resize', () => this.fitStage());
    window.addEventListener('keydown', (event) => this.onKey(event));
    this.showTitle();
  }

  private fitStage(): void {
    const scale = Math.min(window.innerWidth / 1024, window.innerHeight / 768);
    this.stage.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(4)})`;
  }

  /** Keyboard shortcuts. Nothing that fires while the player is typing. */
  private onKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    if (this.stage.querySelector('.event-overlay')) return;
    if (event.key === 'F5') {
      event.preventDefault();
      if (this.state.phase === 'desktop') this.saveNow();
      return;
    }
    if (event.key === 'F1') {
      event.preventDefault();
      this.showHelp();
      return;
    }
    if (event.key === 'Escape') {
      const focused = this.shell.manager.list().find((win) => win.focused);
      if (focused) {
        focused.close();
        event.preventDefault();
      }
    }
  }

  private applySettings(): void {
    document.body.classList.toggle('crt-on', this.settings.crt);
    document.body.classList.toggle('no-scanlines', !this.settings.scanlines);
    setSoundEnabled(this.settings.sound);
  }

  // ---------------------------------------------------------------- title

  private showTitle(): void {
    this.shell.manager.closeAllExcept([]);
    clear(this.shell.windowsLayer);
    this.stage.querySelectorAll('.title-screen, .ending-screen, .event-overlay').forEach((node) => node.remove());
    this.shell.setIconsVisible(false);
    this.shell.setTrayHint('PIMP 98 · агентство «Бархат»');

    import('../scenes/title').then(({ renderTitle }) => {
      const hasSaveAvailable = hasSave();
      const title = renderTitle({
        onNew: () => this.startNew(),
        onLoad: () => this.loadExisting(),
        hasLoad: hasSaveAvailable,
        onAbout: () => this.showAbout(),
        onSettings: () => this.openScreen('settings'),
        settings: this.settings,
        onToggleCrt: () => this.setSetting('crt', !this.settings.crt),
      });
      this.stage.append(title);
      this.shell.setStartItems(this.titleStartItems());
    });
  }

  private titleStartItems() {
    return [
      { label: 'Новая неделя', icon: 'office' as const, action: () => this.startNew() },
      { label: 'Продолжить', icon: 'floppy' as const, action: () => this.loadExisting(), disabled: !hasSave() },
      { label: 'Настройки', icon: 'computer' as const, action: () => this.openScreen('settings') },
      { separator: true, label: '', action: () => {} },
      { label: 'О программе', icon: 'journal' as const, action: () => this.showAbout() },
    ];
  }

  // ---------------------------------------------------------------- boot flow

  private startNew(): void {
    this.stage.querySelectorAll('.title-screen, .ending-screen').forEach((node) => node.remove());
    this.state = createNewGame(String(Date.now()));
    this.endingShown = false;
    if (this.settings.fastBoot && this.booted) {
      this.enterDesktop();
      return;
    }
    this.shell.showBoot(bootLines(), () => this.enterDesktop());
  }

  private loadExisting(): void {
    const loaded = loadGame();
    if (!loaded) {
      void showDialog({ title: 'PIMP 98', message: 'Сохранение не найдено или повреждено.' });
      return;
    }
    this.stage.querySelectorAll('.title-screen, .ending-screen').forEach((node) => node.remove());
    this.state = loaded;
    this.endingShown = false;
    if (loaded.ending) {
      this.showEnding(loaded.ending);
      return;
    }
    if (!this.booted) {
      this.shell.showBoot(bootLines(), () => this.enterDesktop());
    } else {
      this.enterDesktop();
    }
  }

  private enterDesktop(): void {
    this.booted = true;
    this.stage.querySelectorAll('.title-screen').forEach((node) => node.remove());
    this.shell.setIconsVisible(true);
    this.shell.setStartItems(this.desktopStartItems());
    if (this.state.phase !== 'desktop') this.state.phase = 'desktop';
    this.openScreen('office');
    this.refreshChrome();
    queueForcedEvent(this.state);
    if (!this.state.pendingEvent) {
      const rng = eventRng(this.state.seed, this.state.day, this.state.slot, this.state.tick);
      maybeQueueEvent(this.state, rng);
    }
    this.syncEvent();
    this.autosave();
  }

  private desktopStartItems() {
    return [
      { label: 'Офис', icon: 'office' as const, action: () => this.openScreen('office') },
      { label: 'Девушки', icon: 'girls' as const, action: () => this.openScreen('roster') },
      { label: 'Клиенты', icon: 'clients' as const, action: () => this.openScreen('clients') },
      { label: 'Районы', icon: 'map' as const, action: () => this.openScreen('map') },
      { label: 'Бухгалтерия', icon: 'ledger' as const, action: () => this.openScreen('ledger') },
      { label: 'Участок', icon: 'police' as const, action: () => this.openScreen('police') },
      { label: 'Журнал', icon: 'journal' as const, action: () => this.openScreen('journal') },
      { separator: true, label: '', action: () => {} },
      { label: 'Сохранить', icon: 'floppy' as const, action: () => this.saveNow() },
      { label: 'Настройки', icon: 'computer' as const, action: () => this.openScreen('settings') },
      { separator: true, label: '', action: () => {} },
      { label: 'Завершить неделю', icon: 'door' as const, action: () => this.forceEnd() },
    ];
  }

  // ---------------------------------------------------------------- screens

  openScreen(id: SceneId): void {
    if (this.state.phase === 'boot') return;
    if (this.state.phase === 'ended' && id !== 'settings') return;
    if (id === 'clients') this.ensureNightOffers();

    // The right-hand slot holds one window at a time; the office stays put on the left.
    if (RIGHT_SLOT.includes(id)) {
      for (const win of this.shell.manager.list()) {
        if (win.id !== id && (RIGHT_SLOT.includes(win.id as SceneId) || win.id.startsWith('dossier-'))) {
          this.shell.manager.close(win.id);
        }
      }
    }

    const meta = SCREENS[id];
    const win = this.shell.manager.open({
      id,
      title: meta.title,
      width: meta.width,
      height: meta.height,
      ...(meta.x !== undefined ? { x: meta.x } : {}),
      ...(meta.y !== undefined ? { y: meta.y } : {}),
      resizable: true,
      onFocus: () => this.renderScreen(id),
      status: '',
      menu: appMenu(this),
    });
    win.el.classList.add('app-window');
    this.renderScreen(id);
  }

  private renderScreen(id: SceneId): void {
    const win = this.shell.manager.get(id);
    if (!win) return;
    clear(win.body);
    const ctx = this.makeContext(id);
    switch (id) {
      case 'office':
        import('../scenes/office').then(({ renderOffice }) => this.mount(win.body, win, renderOffice(ctx), id));
        break;
      case 'roster':
        import('../scenes/roster').then(({ renderRoster }) => this.mount(win.body, win, renderRoster(ctx), id));
        break;
      case 'clients':
        import('../scenes/clients').then(({ renderClients }) => this.mount(win.body, win, renderClients(ctx), id));
        break;
      case 'map':
        import('../scenes/map').then(({ renderMap }) => this.mount(win.body, win, renderMap(ctx), id));
        break;
      case 'ledger':
        import('../scenes/ledger').then(({ renderLedger }) => this.mount(win.body, win, renderLedger(ctx), id));
        break;
      case 'police':
        import('../scenes/police').then(({ renderPolice }) => this.mount(win.body, win, renderPolice(ctx), id));
        break;
      case 'journal':
        import('../scenes/journal').then(({ renderJournal }) => this.mount(win.body, win, renderJournal(ctx), id));
        break;
      case 'settings':
        import('../scenes/settings').then(({ renderSettings }) => this.mount(win.body, win, renderSettings(ctx), id));
        break;
      default:
        break;
    }
  }

  private mount(target: HTMLElement, win: NonNullable<ReturnType<Shell['manager']['get']>>, node: HTMLElement, id: SceneId): void {
    if (!win.el.isConnected) return;
    clear(target);
    target.append(node);
    win.setStatus(this.statusFor(id));
  }

  private statusFor(id: SceneId): string {
    const s = this.state;
    switch (id) {
      case 'office':
        return `${dayLabel(s.day)} из ${DAYS} · ${slotLabel(s.slot)} · ${money(s.cash)}`;
      case 'clients':
        return s.slot === 3 ? 'Ночь: назначь девушек и жми «Начать ночь»' : 'Клиенты придут к ночи';
      case 'map':
        return `Сейчас: ${s.location}`;
      case 'ledger':
        return `Аренда ${money(DAILY_RENT)} · зарплаты по итогам ночи`;
      case 'police':
        return `Heat: ${Math.round(s.heat)} / 100`;
      case 'journal':
        return `Записей: ${s.log.length}`;
      default:
        return '';
    }
  }

  private makeContext(screen: SceneId) {
    const app = this;
    return {
      get state() {
        return app.state;
      },
      get settings() {
        return app.settings;
      },
      screen,
      act(run: (state: GameState) => ActionResult) {
        const result = run(app.state);
        if (!result.ok) {
          toast(result.message, 'error');
          sfx.error();
          return;
        }
        app.afterAction(result);
      },
      render() {
        app.renderAll();
      },
      open(id: SceneId) {
        app.openScreen(id);
      },
      openDossier(girlId: string) {
        app.openDossier(girlId as GirlId);
      },
      toast(text: string, kind: 'info' | 'error' | 'money' = 'info') {
        toast(text, kind);
      },
      assign(offerId: string, girlId: string | null) {
        app.assign(offerId, girlId);
      },
      startNight() {
        app.startNight();
      },
      nextDay() {
        app.nextDay();
      },
      save() {
        app.saveNow();
      },
      finish() {
        app.finish();
      },
      setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
        app.setSetting(key, value);
      },
      portrait(girlId: string, mood: 'plain' | 'dim' | 'warm' = 'plain') {
        return renderPortrait(girlArchetype(girlId).portrait, { mood });
      },
    };
  }

  private afterAction(result: ActionResult): void {
    if (result.spent) {
      this.state.tick += 1;
      this.refreshChrome();
    }
    this.renderAll();
    if (result.spent && !this.state.pendingEvent) {
      queueForcedEvent(this.state);
      const rng = eventRng(this.state.seed, this.state.day, this.state.slot, this.state.tick);
      maybeQueueEvent(this.state, rng);
      this.syncEvent();
    }
    this.autosave();
  }

  private renderAll(): void {
    const known: SceneId[] = ['office', 'roster', 'clients', 'map', 'ledger', 'police', 'journal', 'settings'];
    this.ensureNightOffers();
    for (const win of this.shell.manager.list()) {
      if (!known.includes(win.id as SceneId)) continue;
      this.renderScreen(win.id as SceneId);
    }
    this.drainEventModal();
    this.refreshChrome();
  }

  private refreshChrome(): void {
    const s = this.state;
    const hired = hiredGirls(s).length;
    const heatMark = s.heat >= 70 ? '!' : s.heat >= 45 ? '·' : '';
    this.shell.setTrayHint(`${s.day}/${DAYS} · ${hired} дев. · ${money(s.cash)} ${heatMark}`.trim());
  }

  // ---------------------------------------------------------------- girl dossier

  private openDossier(girlId: string): void {
    const arche = girlArchetype(girlId);
    const win = this.shell.manager.open({
      id: `dossier-${girlId}`,
      title: `Досье · ${arche.name}`,
      width: 470,
      height: 500,
      resizable: true,
      status: '',
    });
    win.el.classList.add('app-window');
    clear(win.body);
    import('../scenes/dossier').then(({ renderDossier }) => {      if (!win.el.isConnected) return;
      win.body.append(
        renderDossier({
          girlId,
          state: this.state,
          portrait: renderPortrait(arche.portrait, { mood: 'warm' }),
          onBack: () => win.close(),
          act: (run) => {
            const result = run(this.state);
            if (!result.ok) {
              toast(result.message, 'error');
              sfx.error();
              return;
            }
            win.close();
            this.afterAction(result);
          },
          toast: (text, kind) => toast(text, kind ?? 'info'),
        }),
      );
      win.setStatus(arche.tagline);
    });
  }

  // ---------------------------------------------------------------- actions

  private assign(offerId: string, girlId: string | null): void {
    if (girlId === null) {
      delete this.state.assignments[offerId];
    } else {
      // One girl, one client. Unassign her from any other offer first.
      for (const [key, value] of Object.entries(this.state.assignments)) {
        if (value === girlId && key !== offerId) delete this.state.assignments[key];
      }
      this.state.assignments[offerId] = girlId as GirlId;
    }
    this.renderScreen('clients');
    this.renderScreen('office');
  }

  /** The night still needs clients if the player reached it without spending the last slot on an action. */
  private ensureNightOffers(): void {    if (this.state.slot !== 3) return;
    if (this.state.offers.length > 0) return;
    refreshOffers(this.state);
  }

  private startNight(): void {
    if (this.state.slot !== 3) {
      toast('Ночь ещё не наступила.', 'error');
      sfx.error();
      return;
    }
    if (this.state.heat >= HEAT_ARREST) {
      this.finish();
      return;
    }
    this.ensureNightOffers();
    const report = runNight(this.state, nightRng(this.state.seed, this.state.day, this.state.tick), DAILY_RENT);
    this.state.nightReport = report;
    this.state.assignments = {};
    this.state.tick += 1;
    if (report.gross > 0) sfx.money();
    else sfx.alarm();

    queueForcedEvent(this.state);

    const win = this.shell.manager.open({
      id: 'night',
      title: 'Итоги ночи',
      width: 520,
      height: 460,
      resizable: true,
      x: 120,
      y: 50,
    });
    win.el.classList.add('app-window');
    clear(win.body);
    import('../scenes/night').then(({ renderNightReport }) => {
      if (!win.el.isConnected) return;
      win.body.append(
        renderNightReport({
          report,
          isFinal: this.state.day >= DAYS,
          onNext: () => {
            win.close();
            this.nextDay();
          },
        }),
      );
      win.setStatus(`${dayLabel(this.state.day)} · итоги`);
    });
    this.afterNight();
  }

  private afterNight(): void {
    this.renderAll();
    this.syncEvent();
    this.autosave();
  }

  private nextDay(): void {
    if (this.state.day >= DAYS) {
      this.finish();
      return;
    }
    if (this.state.heat >= HEAT_ARREST) {
      this.finish();
      return;
    }
    startNextDay(this.state);
    this.state.tick += 1;
    this.refreshChrome();
    this.renderAll();
    if (!this.state.pendingEvent) {
      queueForcedEvent(this.state);
      const rng = eventRng(this.state.seed, this.state.day, this.state.slot, this.state.tick);
      maybeQueueEvent(this.state, rng);
      this.syncEvent();
    }
    this.autosave();
    sfx.chime();
  }

  private finish(): void {
    this.state.ending = evaluateEnding(this.state);
    this.state.phase = 'ended';
    this.autosave();
    this.showEnding(this.state.ending);
  }

  private showEnding(id: EndingId): void {
    if (this.endingShown) return;
    this.endingShown = true;
    const ending = ENDINGS[id];
    this.shell.manager.closeAllExcept([]);
    clear(this.shell.windowsLayer);
    this.stage.querySelectorAll('.title-screen, .event-overlay').forEach((node) => node.remove());
    this.shell.setIconsVisible(false);

    if (ending.tone === 'worst') {
      this.shell.showBsod(ending.code, () => this.mountEnding(id));
    } else {
      this.mountEnding(id);
    }
    sfx.alarm();
  }

  private mountEnding(id: EndingId): void {
    import('../scenes/ending').then(({ renderEnding }) => {
      const screen = renderEnding({
        ending: ENDINGS[id],
        state: this.state,
        onRestart: () => this.showTitle(),
        onExport: () => {
          downloadSave(this.state);
          toast('Сохранение выгружено.', 'info');
        },
      });
      this.stage.append(screen);
    });
  }

  forceEnd(): void {
    void showDialog({
      title: 'Завершить неделю',
      message: 'Закончить неделю сейчас и узнать итог?',
      buttons: [
        { label: 'Закончить', value: 'ok', primary: true },
        { label: 'Ещё поработаю', value: 'cancel' },
      ],
    }).then((value) => {
      if (value === 'ok') this.finish();
    });
  }

  // ---------------------------------------------------------------- events

  syncEvent(): void {
    this.drainEventModal();
    const event = currentEvent(this.state);
    if (!event) return;
    this.paintEvent(event);
  }

  private drainEventModal(): void {
    this.stage.querySelectorAll('.event-overlay').forEach((node) => node.remove());
  }
  private paintEvent(event: StoryEventDef): void {
    const girlId = event.girl;
    const arche = girlId ? girlArchetype(girlId) : null;
    const overlay = h('div', { class: 'event-overlay', role: 'dialog', 'aria-modal': 'true' });

    const portrait = arche
      ? renderPortrait(arche.portrait, { mood: 'dim' })
      : `<div class="event-doc">
           <div class="event-doc-head">ДЕЛО</div>
           <div class="event-doc-lines"></div>
           <div class="event-doc-stamp">БАРХАТ</div>
         </div>`;

    const choiceWrap = h('div', { class: 'event-choices' });
    const result = h('div', { class: 'event-result', hidden: true });
    const footer = h('div', { class: 'event-footer', hidden: true });
    let resolved = false;

    for (const [index, choice] of event.choices.entries()) {
      const button = h(
        'button',
        { class: 'event-choice', type: 'button' },
        h('span', { class: 'label' }, choice.label),
        choice.hint ? h('span', { class: 'hint' }, choice.hint) : undefined,
      );
      button.addEventListener('click', () => {
        if (resolved) return;
        resolved = true;
        const text = chooseEventOption(this.state, index);
        result.textContent = text;
        result.hidden = false;
        choiceWrap.querySelectorAll('button').forEach((node) => {
          (node as HTMLButtonElement).disabled = true;
        });
        button.classList.add('chosen');
        footer.hidden = false;
        sfx.chime();
      });
      choiceWrap.append(button);
    }

    footer.append(
      h(
        'button',
        {
          class: 'btn default',
          type: 'button',
          onclick: () => {
            closeEvent(this.state);
            overlay.remove();
            this.autosave();
            this.renderAll();
          },
        },
        'Продолжить',
      ),
    );

    overlay.append(
      h(
        'div',
        { class: 'event-window' },
        h('div', { class: 'win-titlebar' }, h('span', { class: 'win-title-text' }, `Событие · ${dayLabel(this.state.day)}`)),
        h(
          'div',
          { class: 'win-frame' },
          h(
            'div',
            { class: 'event-body' },
            h('div', { class: 'event-portrait', html: portrait }),
            h('div', { class: 'event-copy' }, h('h2', {}, event.title), h('p', { class: 'event-text' }, event.text)),
          ),
        ),
        choiceWrap,
        result,
        footer,
      ),
    );
    this.stage.append(overlay);
    sfx.open();
  }

  // ---------------------------------------------------------------- misc

  saveNow(): void {
    if (this.state.phase !== 'desktop') {
      toast('Сейчас сохраняться некуда.', 'error');
      return;
    }
    const success = saveGame(this.state);
    toast(success ? 'Игра сохранена.' : 'Сохранить не удалось.', success ? 'info' : 'error');
    if (success) sfx.chime();
  }

  exportSave(): void {
    downloadSave(this.state);
    toast('Файл сохранения выгружен.', 'info');
  }

  async confirmQuit(): Promise<void> {
    const value = await showDialog({
      title: 'Выход в меню',
      message: 'Вернуться в главное меню? Несохранённый прогресс потеряется.',
      buttons: [
        { label: 'В меню', value: 'ok', primary: true },
        { label: 'Остаться', value: 'cancel' },
      ],
    });
    if (value === 'ok') this.showTitle();
  }

  showHelp(): void {
    void showDialog({
      title: 'Как играть',
      message: 'День делится на четыре части: утро, день, вечер и ночь.',
      detail:
        'Днём вы тратите время на дела: тренируете девушек, говорите с ними, платите премии, договариваетесь с ментами.\n\nНочью распределяете девушек по клиентам. Чем выше навык и ниже стресс — тем больше шансов на хороший вечер.\n\nЦель: за 7 дней собрать деньги, не посадить команду и не сесть самому. Heat выше 100 — приговор.',
    });
  }

  private autosave(): void {
    if (this.state.phase === 'desktop') saveGame(this.state);
  }

  private setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.settings = { ...this.settings, [key]: value };
    saveSettings(this.settings);
    this.applySettings();
    this.renderScreen('settings');
    this.stage.querySelectorAll('.title-screen').forEach((node) => node.remove());
    if (this.state.phase !== 'desktop') this.showTitle();
  }

  showAbout(): void {
    void showDialog({
      title: 'О программе',
      message: 'PIMP 98 · агентство «Бархат»',
      detail: `Неделя из жизни маленького агентства. 1998-й, провинциальный город, четыре девушки, один шкаф с деньгами.\n\nВерсия 0.1 · сохранение ${SAVE_VERSION} · без единого внешнего ассета.`,
    });
  }

  /** Helpful for the console and for tests that want to poke the state. */
  get currentState(): GameState {
    return this.state;
  }

  get allGirls() {
    return GIRLS;
  }
}
