const moneyFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

export function money(value: number): string {
  return `${moneyFormatter.format(Math.round(value))} ₽`;
}

export function signedMoney(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${moneyFormatter.format(Math.abs(Math.round(value)))} ₽`;
}

export function signed(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(Math.round(value))}`;
}

export function plural(count: number, one: string, few: string, many: string): string {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
}

export function slotLabel(slot: number): string {
  return ['Утро', 'День', 'Вечер', 'Ночь'][slot] ?? 'Ночь';
}

export function dayLabel(day: number): string {
  return `День ${day}`;
}

export function stamp(day: number, slot: number): string {
  return `${dayLabel(day)} · ${slotLabel(slot)}`;
}
