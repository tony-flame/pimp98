import { GIRLS } from '../content/girls';
import { renderPortrait } from '../art/portrait';
import type { Settings } from '../game/types';
import { h } from '../ui/dom';

export interface TitleProps {
  onNew: () => void;
  onLoad: () => void;
  hasLoad: boolean;
  onAbout: () => void;
  onSettings: () => void;
  settings: Settings;
  onToggleCrt: () => void;
}

export function renderTitle(props: TitleProps): HTMLElement {
  const root = h('div', { class: 'title-screen' });

  const previews = h(
    'div',
    { class: 'title-portrait-row' },
    ...GIRLS.slice(0, 3).map((arche) => h('span', { html: renderPortrait(arche.portrait, { width: 56, height: 66 }) })),
  );

  const menu = h(
    'div',
    { class: 'title-menu' },
    opt('Новая неделя', 'enter', () => props.onNew(), false),
    opt('Продолжить', 'load', () => props.onLoad(), !props.hasLoad),
    opt('Настройки', 'setup', () => props.onSettings(), false),
    opt('О программе', 'info', () => props.onAbout(), false),
    opt(props.settings.crt ? 'CRT: вкл' : 'CRT: выкл', 'toggle', () => props.onToggleCrt(), false),
  );

  root.append(
    h(
      'div',
      { class: 'title-card' },
      previews,
      h('div', {}, h('div', { class: 'title-wordmark', html: 'PIMP<sup>98</sup>' }), h('div', { class: 'title-sub' }, 'агентство «бархат»')),
      h('div', { class: 'title-rule' }),
      h(
        'p',
        { class: 'title-foot' },
        'Одна неделя. Четыре девушки. Один город, который не прощает ошибок.\nТекстовая драма о деньгах, людях и цене обещаний.',
      ),
      menu,
      h('div', { class: 'title-rule' }),
      h(
        'div',
        { class: 'title-foot' },
        'Все персонажи вымышлены. Всё за кадром. 18+ по духу, не по содержанию.',
      ),
    ),
  );

  return root;
}

function opt(label: string, hint: string, action: () => void, disabled: boolean): HTMLButtonElement {
  const button = h(
    'button',
    { class: 'title-opt', type: 'button', disabled },
    h('span', {}, label),
    h('span', { class: 'hint' }, hint),
  );
  button.addEventListener('click', () => {
    if (!disabled) action();
  });
  return button;
}
