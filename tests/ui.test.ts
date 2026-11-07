import { describe, expect, it } from 'vitest';
import { createNewGame } from '../src/game/state';
import { renderPortrait } from '../src/art/portrait';
import { GIRLS } from '../src/content/girls';
import { renderOffice } from '../src/scenes/office';
import { renderRoster } from '../src/scenes/roster';
import { renderClients } from '../src/scenes/clients';
import { renderMap } from '../src/scenes/map';
import { renderLedger } from '../src/scenes/ledger';
import { renderPolice } from '../src/scenes/police';
import { renderJournal } from '../src/scenes/journal';
import { renderSettings } from '../src/scenes/settings';
import { renderTitle } from '../src/scenes/title';
import { renderEnding } from '../src/scenes/ending';
import { ENDINGS } from '../src/game/endings';
import type { SceneContext } from '../src/scenes/context';
import type { GameState, Settings } from '../src/game/types';

const settings: Settings = { crt: true, scanlines: true, sound: false, fastBoot: true };

function makeContext(state: GameState): SceneContext {
  return {
    state,
    settings,
    screen: 'office',
    act: () => {},
    render: () => {},
    open: () => {},
    openDossier: () => {},
    toast: () => {},
    assign: () => {},
    startNight: () => {},
    nextDay: () => {},
    save: () => {},
    finish: () => {},
    setSetting: () => {},
    portrait: (id) => renderPortrait(GIRLS.find((g) => g.id === id)?.portrait ?? GIRLS[0]!.portrait),
  };
}

describe('portraits', () => {
  it('renders every archetype without throwing', () => {
    for (const arche of GIRLS) {
      const svg = renderPortrait(arche.portrait);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).toContain('</svg>');
      expect(svg.length).toBeGreaterThan(800);
    }
  });

  it('is deterministic by seed', () => {
    const a = renderPortrait(GIRLS[0]!.portrait);
    const b = renderPortrait(GIRLS[0]!.portrait);
    expect(a).toBe(b);
  });

  it('changes with a different seed', () => {
    const a = renderPortrait({ ...GIRLS[0]!.portrait, seed: 1 });
    const b = renderPortrait({ ...GIRLS[0]!.portrait, seed: 2 });
    expect(a).not.toBe(b);
  });

  it('handles all expressions and styles', () => {
    for (const expression of ['neutral', 'smile', 'smirk', 'sad', 'angry', 'tired'] as const) {
      for (const hairStyle of ['bob', 'long', 'ponytail', 'afro', 'short', 'bun', 'wavy', 'pixie'] as const) {
        const svg = renderPortrait({ ...GIRLS[0]!.portrait, expression, hairStyle });
        expect(svg).toContain('<svg');
      }
    }
  });
});

describe('screens', () => {
  const check = (name: string, build: (state: GameState) => HTMLElement) => {
    it(`${name} renders real content`, () => {
      const state = createNewGame('screen-seed');
      const node = build(state);
      expect(node).toBeInstanceOf(HTMLElement);
      const text = node.textContent ?? '';
      expect(text.length).toBeGreaterThan(20);
    });
  };

  check('office', (s) => renderOffice(makeContext(s)));
  check('roster', (s) => renderRoster(makeContext(s)));
  check('clients', (s) => renderClients(makeContext(s)));
  check('map', (s) => renderMap(makeContext(s)));
  check('ledger', (s) => renderLedger(makeContext(s)));
  check('police', (s) => renderPolice(makeContext(s)));
  check('journal', (s) => renderJournal(makeContext(s)));
  check('settings', (s) => renderSettings(makeContext(s)));

  it('title renders four menu entries', () => {
    const node = renderTitle({
      onNew: () => {},
      onLoad: () => {},
      hasLoad: false,
      onAbout: () => {},
      onSettings: () => {},
      settings,
      onToggleCrt: () => {},
    });
    expect(node.querySelectorAll('.title-opt').length).toBeGreaterThanOrEqual(4);
    expect(node.textContent).toContain('PIMP');
  });

  it('ending renders stats for every ending', () => {
    for (const id of Object.keys(ENDINGS) as (keyof typeof ENDINGS)[]) {
      const node = renderEnding({
        ending: ENDINGS[id],
        state: createNewGame('ending-seed'),
        onRestart: () => {},
        onExport: () => {},
      });
      expect(node.querySelectorAll('.ending-stat').length).toBeGreaterThanOrEqual(6);
    }
  });

  it('clients show offers at night', () => {
    const state = createNewGame('night-seed');
    state.slot = 3;
    state.offers = [
      {
        id: 'x1',
        clientName: 'Тестовый клиент',
        kind: 'worker',
        budget: 1200,
        demand: 'Просто поговорить',
        risk: 'none',
        riskChance: 0.1,
        minSkill: 20,
        location: 'station',
        day: 1,
      },
    ];
    const node = renderClients(makeContext(state));
    expect(node.textContent).toContain('Тестовый клиент');
    expect(node.querySelectorAll('select').length).toBe(1);
  });
});
