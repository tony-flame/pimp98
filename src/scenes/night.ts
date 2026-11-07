import { DAYS } from '../game/balance';
import { money, signed } from '../game/format';
import type { NightReport } from '../game/types';
import { h } from '../ui/dom';
import { button } from '../ui/controls';

export interface NightReportProps {
  report: NightReport;
  onNext: () => void;
  isFinal: boolean;
}

export function renderNightReport(props: NightReportProps): HTMLElement {
  const { report } = props;
  const root = h('div', { class: 'report' });

  root.append(
    h(
      'div',
      { class: 'report-total' },
      cell('Выручка', money(report.gross), report.gross > 0 ? 'good' : ''),
      cell('Зарплаты', money(-report.wages), 'bad'),
      cell('Аренда', money(-report.rent), 'bad'),
      cell('Итого', signed(report.net), report.net >= 0 ? 'good' : 'bad'),
      cell('Репутация', signed(report.repDelta), report.repDelta >= 0 ? 'good' : 'bad'),
      cell('Heat', signed(report.heatDelta), report.heatDelta > 6 ? 'bad' : ''),
    ),
  );

  if (report.lines.length === 0) {
    root.append(h('div', { class: 'report-line' }, 'Ночь прошла без клиентов. Зато все выспались.'));
  }

  for (const line of report.lines) {
    const good = line.outcome === 'ok';
    root.append(
      h(
        'div',
        { class: 'report-line' },
        h('span', { class: `outcome ${good ? 'good' : 'bad'}` }, good ? money(line.gross) : line.gross > 0 ? money(line.gross) : '0 ₽'),
        h('span', { class: 'who' }, `${line.girlName} → ${line.clientName}. `),
        line.text,
      ),
    );
  }

  if (report.incidents.length > 0) {
    root.append(
      h(
        'div',
        { class: 'report-line' },
        h('strong', {}, 'Инциденты: '),
        `${report.incidents.length}. `,
        report.incidents.slice(0, 3).join(' '),
      ),
    );
  }

  const footer = h(
    'div',
    { class: 'event-footer' },
    h('span', { class: 'small-text muted' }, props.isFinal ? `День ${props.report.day} из ${DAYS}. Дальше — итоги.` : `День ${props.report.day + 1} ждёт.`),
    h('div', { class: 'toolbar-spacer' }),
    button(props.isFinal ? 'К итогам недели' : 'Следующий день', () => props.onNext(), { default: true }),
  );
  root.append(footer);
  return root;
}

function cell(key: string, value: string, tone: string): HTMLElement {
  return h('div', { class: `report-cell ${tone}`.trim() }, h('div', { class: 'k' }, key), h('div', { class: 'v' }, value));
}
