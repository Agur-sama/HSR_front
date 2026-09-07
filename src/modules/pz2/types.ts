import type { RouteLine } from '../../bridge/schema';

/** Что студент размещает на трассе. Список закрыт заказчиком на встрече 02.09. */
export type Pz2WorkObjectKind =
  | 'existingLineRepair'
  | 'earthworks'
  | 'ballastTrack'
  | 'overpass'
  | 'bridge'
  | 'tunnel'
  | 'switch';

/** Как объект меряется: длиной вдоль трассы или штуками. */
export type Pz2WorkObjectMeasure = 'length' | 'count';

/**
 * Дополнительный фактор грунта. Меняет трудоёмкость работ по объекту.
 * Как именно меняет — вопрос к заказчику, см. docs/open-questions.md.
 */
export type Pz2GroundCondition = 'none' | 'weakSoil' | 'rockyBase';

export interface Pz2WorkObjectDraft {
  id: string;
  kind: Pz2WorkObjectKind;
  /** Длина участка, км. Текстом — как и все числовые поля в проекте. */
  lengthKm: string;
  /** Количество штук для объектов без длины. */
  count: string;
  condition: Pz2GroundCondition;
}

export interface Pz2Draft {
  workObjects: Pz2WorkObjectDraft[];
  /** Отметки линейки на трассе, км от начала. Незавершённое измерение — одна отметка. */
  rulerMarksKm: number[];
}

/** Данные, которые ПЗ2 забирает из JSON-моста ПЗ1. */
export interface Pz2RouteSource {
  routeLine: RouteLine | null;
  totalLengthKm: number;
  variantTitle: string;
}
