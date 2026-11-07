import type { ClientKind, LocationId } from '../game/types';

export const CLIENT_NAMES: Record<ClientKind, string[]> = {
  worker: ['Коля-сварщик', 'Петрович', 'Толик с завода', 'Михалыч', 'Слава-водила'],
  businessman: ['Сергей Аркадьевич', 'Господин Ким', 'Артур Львович', 'Владик из фирмы', 'Инвестор без имени'],
  cop: ['Капитан Гринько', 'Сержант Пахомов', 'Майор Кулак', 'Лейтенант Сычёв', 'Старший Хворост'],
  gangster: ['Губа', 'Туман', 'Штырь', 'Бригадир по кличке Слон', 'Человек с причала'],
  journalist: ['Оля-корреспондентка', 'Марк из «Вечёрки»', 'Паша с диктофоном', 'Аня, независимая пресса'],
  romantic: ['Романтик с розами', 'Тимофей из библиотеки', 'Молодой поэт', 'Гриша-музыкант'],
};

export const CLIENT_DEMANDS: Record<ClientKind, string[]> = {
  worker: [
    'Просто выпить и поговорить по-человечески',
    'Пять минут — и по домам',
    'Хочет, чтобы его слушали',
    'Принёс колбасу и словарь комплиментов',
  ],
  businessman: [
    'Требует пунктуальности и никаких вопросов',
    'Оплатит сверху за молчание',
    'Деловой ужин на две персоны',
    'Приедет на чёрной машине и уедет быстро',
  ],
  cop: [
    'Представился «по работе»',
    'Проверяет документы у всех подряд',
    'Задаёт слишком много вопросов',
    'Обещает «прикрыть», если договоритесь',
  ],
  gangster: [
    'Крышует причал и напоминает, кто главный',
    'Хочет «свою» девушку',
    'Оплатит, если не дёргаться',
    'Требует, чтобы всё было по-ихним понятиям',
  ],
  journalist: [
    'Задаёт вопросы о заведении',
    'Пишет статью о ночной жизни района',
    'Просит интервью на десять минут',
    'Слишком часто переводит разговор на тебя',
  ],
  romantic: [
    'Принёс цветы и стихи',
    'Хочет «по-настоящему»',
    'Говорит о будущем лете и совместном отпуске',
    'Верит, что здесь можно встретить судьбу',
  ],
};

export const KIND_WEIGHT_BY_LOCATION: Record<LocationId, Record<ClientKind, number>> = {
  station: { worker: 34, businessman: 8, cop: 10, gangster: 14, journalist: 4, romantic: 26 },
  center: { worker: 14, businessman: 32, cop: 10, gangster: 8, journalist: 14, romantic: 18 },
  docks: { worker: 14, businessman: 14, cop: 16, gangster: 32, journalist: 10, romantic: 12 },
};

export const KIND_BUDGET_MUL: Record<ClientKind, number> = {
  worker: 0.9,
  businessman: 1.5,
  cop: 1.15,
  gangster: 1.35,
  journalist: 1,
  romantic: 1.05,
};

export const KIND_SKILL_OFFSET: Record<ClientKind, number> = {
  worker: -8,
  businessman: 10,
  cop: 4,
  gangster: 6,
  journalist: 2,
  romantic: -4,
};
