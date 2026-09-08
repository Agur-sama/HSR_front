import type { Pz1Station, RouteLine } from '../../bridge/schema';

/** Что студент размещает на трассе. Список закрыт заказчиком на встрече 02.09. */
export type Pz2WorkKind =
  | 'existingLineRepair'
  | 'earthworks'
  | 'ballastTrack'
  | 'viaduct'
  | 'bridge'
  | 'tunnel'
  | 'turnout';

/** Как объект меряется: длиной вдоль трассы или штуками. */
export type Pz2WorkMeasure = 'length' | 'count';

/**
 * Дополнительное условие на участке. Меняет состав работ: слабые грунты
 * требуют забивки свай до твёрдого слоя с устройством ростверка (ТЗ ПЗ2 §4.1).
 * Насколько меняется трудоёмкость — вопрос к заказчику (в-6).
 *
 * Формулировка второго условия расходится в источниках: на доске «скальные
 * породы», в записи «скальные основания». Взято написание из ТЗ (в-2).
 */
export type Pz2SoilCondition = 'weakSoil' | 'rocky';

export interface Pz2WorkDraft {
  id: string;
  kind: Pz2WorkKind;
  /** Длина участка, км. Текстом — как и все числовые поля в проекте. */
  lengthKm: string;
  /** Количество штук для объектов без длины. */
  count: string;
  /** Пусто — обычные условия. Условия не исключают друг друга, поэтому список. */
  conditions: Pz2SoilCondition[];
  /** Этап, которому принадлежит работа. null — работа в общем пуле (ТЗ §4.1). */
  stageId: string | null;
  /** Участок трассы, которым строку намерили: км от начала. У ручных строк пусто. */
  span?: Pz2RouteSpan;
}

/** Отмеренный линейкой кусок трассы. */
export interface Pz2RouteSpan {
  fromKm: number;
  toKm: number;
}

/** Пространственный этап: участок трассы, который строится параллельно другим. */
export interface Pz2StageDraft {
  id: string;
  title: string;
  order: number;
}

export interface Pz2Draft {
  works: Pz2WorkDraft[];
  stages: Pz2StageDraft[];
  /** Отметки линейки на трассе, км от начала. Незавершённое измерение — одна отметка. */
  rulerMarksKm: number[];
}

/** Данные, которые ПЗ2 забирает из JSON-моста ПЗ1. */
export interface Pz2RouteSource {
  routeLine: RouteLine | null;
  stations: Pz1Station[];
  totalLengthKm: number;
  variantTitle: string;
}

/** Станция ПЗ1 на трассе ПЗ2: та же точка, но с километражом от начала. */
export interface Pz2StationMark {
  label: string;
  name: string;
  lat: number;
  lon: number;
  /** Расстояние от начала трассы, км. */
  distanceKm: number;
}
