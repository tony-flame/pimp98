import { TRAIT_LABELS, girlArchetype } from '../content/girls';
import { BONUS_LOYALTY_COST, TRAIN_COST } from '../game/balance';
import { fireGirl, giveBonus, hireGirl, sendToRest, talkToGirl, trainGirl, wageOf } from '../game/actions';
import { money } from '../game/format';
import { daysLeft } from '../game/state';
import { h } from '../ui/dom';
import { badge, button, divider, meter, statRow, tag } from '../ui/controls';
import type { GameState, GirlId } from '../game/types';

export interface DossierProps {
  girlId: string;
  state: GameState;
  portrait: string;
  onBack: () => void;
  act: (run: (state: GameState) => { ok: boolean; message: string; spent: boolean }) => void;
  toast: (text: string, kind?: 'info' | 'error' | 'money') => void;
}

const MOOD_LABEL: Record<string, string> = {
  ok: 'в порядке',
  inspired: 'в ударе',
  tense: 'на взводе',
  hurt: 'обижена',
  broken: 'сломана',
};

export function renderDossier(props: DossierProps): HTMLElement {
  const { girlId, state } = props;
  const arche = girlArchetype(girlId);
  const g = state.girls.find((item) => item.id === girlId);
  const root = h('div', { class: 'dossier' });

  root.append(h('div', { class: 'dossier-portrait', html: props.portrait }));

  const main = h('div', { class: 'dossier-main' });
  main.append(
    h(
      'div',
      { class: 'dossier-head' },
      h('h2', {}, arche.name),
      h('p', { class: 'dossier-tagline' }, `«${arche.tagline}»`),
      h(
        'div',
        { class: 'tag-row' },
        badge(g?.hired ? 'в команде' : 'не в команде', g?.hired ? 'good' : ''),
        ...arche.traits.map((trait) => tag(TRAIT_LABELS[trait] ?? trait)),
        tag(`${arche.age} лет`),
      ),
    ),
  );

  main.append(h('p', { class: 'prose' }, arche.backstory));
  main.append(h('p', { class: 'prose muted' }, `Слабость: ${arche.weakness}`));

  if (g && g.hired) {
    main.append(
      h(
        'div',
        {},
        meter({ label: 'Навык', value: g.skill, tone: 'skill' }),
        meter({ label: 'Стресс', value: g.stress, tone: 'stress' }),
        meter({ label: 'Верность', value: g.loyalty, tone: 'loyalty' }),
        meter({ label: 'Доверие', value: g.trust, tone: 'rep' }),
        statRow('Настроение', MOOD_LABEL[g.mood] ?? g.mood),
        statRow('Зарплата', `${money(wageOf(state, girlId as GirlId))} / ночь`),
        statRow('Ночных смен', String(g.daysWorked)),
        statRow('Простоев', String(g.daysIdle)),
        g.restUntilDay > state.day ? statRow('Статус', 'отдыхает до завтра', 'warn') : null,
      ),
    );

    main.append(divider());
    main.append(
      h(
        'div',
        { class: 'action-row' },
        button('Тренер', () => props.act((s) => trainGirl(s, g.id)), {
          small: true,
          disabled: state.cash < TRAIN_COST || state.slot === 3,
          title: `${money(TRAIN_COST)} и слот`,
        }),
        button('Поговорить', () => props.act((s) => talkToGirl(s, g.id)), { small: true, disabled: state.slot === 3 }),
        button('Премия', () => props.act((s) => giveBonus(s, g.id)), {
          small: true,
          disabled: state.cash < BONUS_LOYALTY_COST || state.slot === 3,
          title: money(BONUS_LOYALTY_COST),
        }),
        button('Отдых', () => props.act((s) => sendToRest(s, g.id)), {
          small: true,
          disabled: g.restUntilDay > state.day,
        }),
        button('Уволить', () => props.act((s) => fireGirl(s, g.id)), { small: true, title: 'Необратимо' }),
      ),
    );
  } else {
    main.append(
      h(
        'div',
        { class: 'action-row' },
        button('Нанять', () => props.act((s) => hireGirl(s, girlId as GirlId)), {
          default: true,
          disabled: state.cash < arche.hireCost || state.slot === 3,
        }),
        h('span', { class: 'small-text muted' }, `Подъёмные: ${money(arche.hireCost)}`),
      ),
    );
  }

  main.append(
    h(
      'div',
      { class: `secret-box${g?.secretKnown ? '' : ' locked'}` },
      h('strong', {}, g?.secretKnown ? 'Ты знаешь её секрет. ' : 'Секрет закрыт. '),
      g?.secretKnown ? arche.secret : `Чтобы узнать больше, нужно доверие. Доверие растёт от разговоров и честных решений. Осталось дней: ${daysLeft(state)}.`,
    ),
  );

  root.append(main);
  return root;
}
