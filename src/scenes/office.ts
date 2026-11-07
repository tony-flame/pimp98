import { DAYS, TARGET_CASH, TRAIN_COST, ADVERTISE_COST, BONUS_LOYALTY_COST } from '../game/balance';
import { advertise, giveBonus, layLow, talkToGirl, trainGirl } from '../game/actions';
import { heatMeter } from '../game/endings';
import { money, slotLabel } from '../game/format';
import { dayProgress, skipToNight } from '../game/time';
import { hiredGirls } from '../game/state';
import { girlArchetype } from '../content/girls';
import { renderPortrait } from '../art/portrait';
import { icon } from '../art/icons';
import { h } from '../ui/dom';
import { badge, button, divider, emptyState, meter, statRow } from '../ui/controls';
import type { SceneContext } from './context';

export function renderOffice(ctx: SceneContext): HTMLElement {
  const s = ctx.state;
  const hired = hiredGirls(s);
  const heat = heatMeter(s);
  const root = h('div', { class: 'dash' });

  root.append(
    h(
      'div',
      { class: 'dash-hero' },
      h(
        'div',
        {},
        h('div', { class: 'day' }, `День ${s.day} / ${DAYS}`),
        h('div', { class: 'slot' }, `${slotLabel(s.slot)} · до цели ${money(Math.max(0, TARGET_CASH - s.cash))}`),
      ),
      h(
        'div',
        { class: 'goal' },
        'В кассе',
        h('b', {}, money(s.cash)),
        h('div', {}, `${dayProgress(s) | 0}% недели`),
      ),
    ),
  );

  const left = h('div', { class: 'dash-col' });
  const right = h('div', { class: 'dash-col' });
  root.append(left, right);

  left.append(
    h(
      'div',
      { class: 'card' },
      h('h3', { class: 'card-title' }, 'Состояние дел'),
      meter({ label: 'Репутация', value: s.reputation, tone: 'rep' }),
      meter({ label: `Внимание ментов · ${heat.label}`, value: s.heat, tone: 'heat' }),
      meter({ label: 'Уважение улиц', value: s.respect, tone: 'respect' }),
      statRow('Девушек в деле', `${hired.length} / 4`),
      statRow('Ночных смен', String(s.stats.nights)),
      statRow('Выручка за неделю', money(s.stats.totalGross), 'money'),
    ),
  );

  const girlsCard = h('div', { class: 'card' }, h('h3', { class: 'card-title' }, 'Команда'));
  if (hired.length === 0) {
    girlsCard.append(emptyState('В команде никого. Найми кого-нибудь, пока зал не остыл.'));
  } else {
    for (const g of hired) {
      const arche = girlArchetype(g.id);
      const row = h(
        'div',
        { class: 'crew-row' },
        h('span', { class: 'crew-face', html: renderPortrait(arche.portrait, { width: 28, height: 34 }) }),
        h(
          'div',
          { class: 'crew-main' },
          h('div', { class: 'crew-name' }, arche.name, ' ', badge(moodLabel(g.mood), moodTone(g.mood))),
          h('div', { class: 'crew-meta' }, `Навык ${Math.round(g.skill)} · Стресс ${Math.round(g.stress)} · Верность ${Math.round(g.loyalty)}`),
        ),
        h(
          'div',
          { class: 'action-row' },
          button('Тренер', () => ctx.act((state) => trainGirl(state, g.id)), {
            small: true,
            disabled: s.cash < TRAIN_COST || s.slot === 3,
            title: `${TRAIN_COST} ₽ и слот`,
          }),
          button('Поговорить', () => ctx.act((state) => talkToGirl(state, g.id)), {
            small: true,
            disabled: s.slot === 3,
          }),
          button('Премия', () => ctx.act((state) => giveBonus(state, g.id)), {
            small: true,
            disabled: s.cash < BONUS_LOYALTY_COST || s.slot === 3,
            title: `${BONUS_LOYALTY_COST} ₽`,
          }),
        ),
      );
      girlsCard.append(row);
    }
    girlsCard.append(divider());
    girlsCard.append(button('Все девушки и досье', () => ctx.open('roster'), { small: true }));
  }
  left.append(girlsCard);

  const actions = h('div', { class: 'card' }, h('h3', { class: 'card-title' }, 'Действия'));
  const grid = h('div', { class: 'action-grid' });
  grid.append(
    actionButton('Реклама', `${ADVERTISE_COST} ₽ · слот`, 'star', () => ctx.act((state) => advertise(state)), s.cash < ADVERTISE_COST || s.slot === 3),
    actionButton('Затаиться', '−heat · слот', 'eye', () => ctx.act((state) => layLow(state)), s.slot === 3),
    actionButton('Районы', 'переехать', 'map', () => ctx.open('map'), false),
    actionButton('Участок', 'heat и взятки', 'police', () => ctx.open('police'), false),
    actionButton('Клиенты', 'распределить', 'clients', () => ctx.open('clients'), false),
    actionButton('Журнал', 'что было', 'journal', () => ctx.open('journal'), false),
  );
  actions.append(grid);
  right.append(actions);

  const nightCard = h('div', { class: 'card' }, h('h3', { class: 'card-title' }, 'Ночь'));
  if (s.slot === 3) {
    const assigned = Object.keys(s.assignments).length;
    const nobody = hired.length === 0;
    nightCard.append(
      h(
        'p',
        { class: 'prose' },
        nobody
          ? 'Работать некому. Ночь пройдёт впустую, аренда всё равно спишется.'
          : `Назначено: ${assigned}. Аренда ${money(700)} спишется автоматически.`,
      ),
      button(nobody ? 'Пропустить ночь' : 'Начать ночь', () => ctx.startNight(), { default: true, disabled: !nobody && assigned === 0 }),
    );
  } else {
    nightCard.append(
      h('p', { class: 'prose' }, `Клиенты подтянутся вечером. Сейчас ${slotLabel(s.slot).toLowerCase()}.`),
      button('Дождаться ночи', () => ctx.act((state) => { skipToNight(state); return { ok: true, message: 'Пора закрываться.', spent: true }; }), {
        small: true,
        title: 'Пропустить остаток дня',
      }),
    );
  }
  right.append(nightCard);

  const feed = h('div', { class: 'card' }, h('h3', { class: 'card-title' }, 'Последнее'));
  const entries = [...s.log].slice(-5).reverse();
  if (entries.length === 0) {
    feed.append(emptyState('Пока тихо.'));
  } else {
    for (const entry of entries) {
      feed.append(h('div', { class: `feed-row kind-${entry.kind}` }, h('span', { class: 'when' }, `Д${entry.day}`), entry.text));
    }
  }
  right.append(feed);

  return root;
}

export function actionButton(
  title: string,
  cost: string,
  iconName: Parameters<typeof icon>[0],
  onClick: () => void,
  disabled: boolean,
): HTMLButtonElement {
  return h(
    'button',
    { class: 'action-btn', type: 'button', disabled, onclick: onClick },
    h('span', { class: 'action-head' }, h('span', { html: icon(iconName, 18) }), h('span', { class: 'action-title' }, title)),
    h('span', { class: 'action-cost' }, cost),
  );
}

function moodLabel(mood: string): string {
  switch (mood) {
    case 'inspired': return 'в ударе';
    case 'tense': return 'на взводе';
    case 'hurt': return 'обижена';
    case 'broken': return 'сломана';
    default: return 'в порядке';
  }
}

function moodTone(mood: string): string {
  switch (mood) {
    case 'inspired': return 'good';
    case 'tense': return 'warn';
    case 'hurt': return 'danger';
    case 'broken': return 'danger';
    default: return '';
  }
}

export function crewSummary(ctx: SceneContext): HTMLElement {
  const hired = hiredGirls(ctx.state);
  return h('div', { class: 'card' }, h('h3', { class: 'card-title' }, 'Команда'), String(hired.length));
}
