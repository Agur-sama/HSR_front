import type { Pz2SoilCondition, Pz2WorkKind } from './types';

/**
 * ВРЕМЕННЫЕ НОРМАТИВЫ. Подлежат замене после проверки экспертом.
 *
 * Заказчик разрешил их сгенерировать, чтобы не задерживать разработку (ТЗ ПЗ2
 * §9): на каждый тип работы три-четыре подработы, два-три материала, одна-две
 * машины и человеко-часы — всё в расчёте на единицу (километр у линейных работ,
 * штука у штучных). Значения заведомо черновые: их выверяет привлечённый
 * заказчиком эксперт, и точность на этом этапе не наша зона ответственности.
 *
 * ФАЙЛ СПЕЦИАЛЬНО ОТДЕЛЬНЫЙ: заменить нормативы должно быть можно, не трогая
 * ни расчёт, ни экраны. Ни одно число из этого файла не продублировано в коде.
 *
 * Трудоёмкость работы = сумма человеко-часов её подработ × длина (или
 * количество). Так отчёт по материалам и график строятся из одних и тех же
 * чисел и разойтись не могут.
 *
 * Дополнительные условия грунта добавляют подработы, а не множитель: заказчик
 * говорил, что слабые грунты требуют забивки свай с устройством ростверка, то
 * есть меняют состав работ. Коэффициентов он не называл (вопрос в-6), а
 * придумывать множитель — значит выдать догадку за норматив.
 */
export interface Pz2SubWorkNorm {
  title: string;
  /** Человеко-часы на единицу работы. */
  laborHours: number;
}

export interface Pz2MaterialNorm {
  title: string;
  unit: string;
  /** Расход на единицу работы. */
  perUnit: number;
}

export interface Pz2MachineNorm {
  title: string;
  /** Машино-часы на единицу работы. */
  machineHours: number;
}

export interface Pz2WorkNorm {
  /** Единица нормирования — та же, которой работа меряется на экране 01. */
  unit: 'км' | 'шт.';
  subWorks: Pz2SubWorkNorm[];
  materials: Pz2MaterialNorm[];
  machines: Pz2MachineNorm[];
}

export const pz2WorkNorms: Record<Pz2WorkKind, Pz2WorkNorm> = {
  existingLineRepair: {
    unit: 'км',
    subWorks: [
      { title: 'Демонтаж верхнего строения пути', laborHours: 260 },
      { title: 'Замена рельсошпальной решётки', laborHours: 420 },
      { title: 'Переустройство тяговых подстанций', laborHours: 310 },
      { title: 'Выправка и рихтовка пути', laborHours: 180 },
    ],
    materials: [
      { title: 'Рельсы Р65', unit: 'т', perUnit: 130 },
      { title: 'Шпалы железобетонные', unit: 'шт.', perUnit: 1840 },
      { title: 'Скрепления', unit: 'компл.', perUnit: 3680 },
    ],
    machines: [
      { title: 'Путеукладочный кран', machineHours: 96 },
      { title: 'Выправочно-подбивочная машина', machineHours: 64 },
    ],
  },
  ballastTrack: {
    unit: 'км',
    subWorks: [
      { title: 'Отсыпка и профилирование щебня', laborHours: 340 },
      { title: 'Укладка рельсошпальной решётки', laborHours: 520 },
      { title: 'Подбивка и стабилизация пути', laborHours: 300 },
    ],
    materials: [
      { title: 'Щебень фракции 25–60', unit: 'м³', perUnit: 2600 },
      { title: 'Шпалы железобетонные', unit: 'шт.', perUnit: 1840 },
      { title: 'Рельсы Р65', unit: 'т', perUnit: 130 },
    ],
    machines: [
      { title: 'Хоппер-дозатор', machineHours: 72 },
      { title: 'Динамический стабилизатор пути', machineHours: 48 },
    ],
  },
  earthworks: {
    unit: 'км',
    subWorks: [
      { title: 'Снятие растительного слоя', laborHours: 180 },
      { title: 'Возведение насыпи с послойным уплотнением', laborHours: 760 },
      { title: 'Устройство водоотвода', laborHours: 240 },
      { title: 'Планировка откосов и укрепление', laborHours: 220 },
    ],
    materials: [
      { title: 'Грунт карьерный', unit: 'м³', perUnit: 42000 },
      { title: 'Геотекстиль', unit: 'м²', perUnit: 12000 },
    ],
    machines: [
      { title: 'Экскаватор', machineHours: 210 },
      { title: 'Каток грунтовый', machineHours: 180 },
    ],
  },
  viaduct: {
    unit: 'км',
    subWorks: [
      { title: 'Буровые работы под опоры', laborHours: 1400 },
      { title: 'Бетонирование опор и ригелей', laborHours: 2100 },
      { title: 'Монтаж пролётных строений', laborHours: 2600 },
      { title: 'Устройство пути на плите', laborHours: 900 },
    ],
    materials: [
      { title: 'Бетон B40', unit: 'м³', perUnit: 3400 },
      { title: 'Арматура', unit: 'т', perUnit: 420 },
      { title: 'Опорные части', unit: 'компл.', perUnit: 24 },
    ],
    machines: [
      { title: 'Кран гусеничный 250 т', machineHours: 520 },
      { title: 'Буровая установка', machineHours: 340 },
    ],
  },
  bridge: {
    unit: 'км',
    subWorks: [
      { title: 'Устройство временных перемычек и водоотлив', laborHours: 1600 },
      { title: 'Сооружение опор в русле', laborHours: 3200 },
      { title: 'Монтаж и надвижка пролётных строений', laborHours: 3800 },
      { title: 'Устройство мостового полотна', laborHours: 1200 },
    ],
    materials: [
      { title: 'Бетон B45 гидротехнический', unit: 'м³', perUnit: 5200 },
      { title: 'Металлоконструкции пролётов', unit: 'т', perUnit: 980 },
      { title: 'Арматура', unit: 'т', perUnit: 610 },
    ],
    machines: [
      { title: 'Плавучий кран', machineHours: 460 },
      { title: 'Кран гусеничный 250 т', machineHours: 640 },
    ],
  },
  tunnel: {
    unit: 'км',
    subWorks: [
      { title: 'Проходка выработки', laborHours: 5200 },
      { title: 'Крепление и первичная обделка', laborHours: 3400 },
      { title: 'Гидроизоляция и постоянная обделка', laborHours: 2800 },
      { title: 'Устройство пути и вентиляции', laborHours: 1500 },
    ],
    materials: [
      { title: 'Бетон обделки', unit: 'м³', perUnit: 6800 },
      { title: 'Анкерная крепь', unit: 'шт.', perUnit: 2400 },
      { title: 'Гидроизоляционная мембрана', unit: 'м²', perUnit: 9000 },
    ],
    machines: [
      { title: 'Проходческий комплекс', machineHours: 1400 },
      { title: 'Погрузочно-доставочная машина', machineHours: 900 },
    ],
  },
  turnout: {
    unit: 'шт.',
    subWorks: [
      { title: 'Подготовка основания под перевод', laborHours: 120 },
      { title: 'Сборка и укладка перевода марки 1/25', laborHours: 260 },
      { title: 'Монтаж восьми электроприводов', laborHours: 190 },
      { title: 'Регулировка и обкатка', laborHours: 90 },
    ],
    materials: [
      { title: 'Комплект стрелочного перевода 1/25', unit: 'компл.', perUnit: 1 },
      { title: 'Брусья переводные', unit: 'шт.', perUnit: 74 },
    ],
    machines: [{ title: 'Кран на железнодорожном ходу', machineHours: 40 }],
  },
};

/**
 * Что добавляют дополнительные условия. Это подработы, а не коэффициенты:
 * состав работ меняется, и в отчёте это видно строкой, а не поправкой в числе.
 */
export const pz2ConditionNorms: Record<Pz2SoilCondition, Pz2WorkNorm> = {
  weakSoil: {
    unit: 'км',
    subWorks: [
      { title: 'Забивка свай до твёрдого слоя', laborHours: 980 },
      { title: 'Устройство ростверка', laborHours: 620 },
    ],
    materials: [
      { title: 'Сваи железобетонные', unit: 'шт.', perUnit: 320 },
      { title: 'Бетон ростверка B30', unit: 'м³', perUnit: 740 },
    ],
    machines: [{ title: 'Сваебойная установка', machineHours: 260 }],
  },
  rocky: {
    unit: 'км',
    subWorks: [
      { title: 'Буровзрывные работы', laborHours: 1100 },
      { title: 'Уборка и вывоз скального грунта', laborHours: 540 },
    ],
    materials: [{ title: 'Взрывчатые материалы', unit: 'кг', perUnit: 1800 }],
    machines: [{ title: 'Буровой станок', machineHours: 300 }],
  },
};

/** Смена — восемь часов: из неё считается длительность работы в днях. */
export const PZ2_SHIFT_HOURS = 8;
