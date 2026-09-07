import type { BridgeSchema } from '../../bridge/schema';
import { buildDisplayRoutePoints } from '../../shared/lib/routeGeometry';
import { createRouteRuler, projectOntoRoute } from '../../shared/lib/routeRuler';
import type { RouteRuler } from '../../shared/lib/routeRuler';
import type {
  Pz2Draft,
  Pz2RouteSpan,
  Pz2StationMark,
  Pz2GroundCondition,
  Pz2RouteSource,
  Pz2WorkObjectDraft,
  Pz2WorkObjectKind,
  Pz2WorkObjectMeasure,
} from './types';

interface Pz2WorkObjectKindInfo {
  id: Pz2WorkObjectKind;
  label: string;
  measure: Pz2WorkObjectMeasure;
  /** Короткое пояснение со слов заказчика — студенту, чтобы не гадать по названию. */
  hint: string;
}

/**
 * Справочник объектов трассы (встреча 02.09).
 *
 * Мост и тоннель заказчик намеренно отделил от остальных «длинных» объектов:
 * «они потом будут чуть иначе считаться». Пока разницы в расчёте нет, но
 * порядок в списке сохраняем — по нему потом будет проще расходиться.
 */
export const pz2WorkObjectKinds: Pz2WorkObjectKindInfo[] = [
  {
    id: 'existingLineRepair',
    label: 'Ремонт существующей линии',
    measure: 'length',
    hint: 'Первые километры ВСМ идут по существующим путям: их ремонтируют, меняют подстанции.',
  },
  {
    id: 'earthworks',
    label: 'Линия на земляном полотне',
    measure: 'length',
    hint: 'Высокая насыпь под пути: держит профиль ровным и повышает устойчивость.',
  },
  {
    id: 'ballastTrack',
    label: 'Балластный путь',
    measure: 'length',
    hint: 'Щебень под шпальной решёткой. Укладывается быстро, но требует постоянного обслуживания.',
  },
  {
    id: 'overpass',
    label: 'Эстакада',
    measure: 'length',
    hint: 'Путь на опорах — там, где насыпь невозможна или невыгодна.',
  },
  { id: 'bridge', label: 'Мост', measure: 'length', hint: 'Переход через водную преграду.' },
  { id: 'tunnel', label: 'Тоннель', measure: 'length', hint: 'Переход сквозь возвышенность.' },
  {
    id: 'switch',
    label: 'Стрелочный перевод 1/25',
    measure: 'count',
    hint: 'Путевое развитие на подходе к станции. Марка 1/25 — очень пологая, восемь приводов, считается отдельно.',
  },
];

export const pz2GroundConditions: { id: Pz2GroundCondition; label: string }[] = [
  { id: 'none', label: 'Обычные условия' },
  { id: 'weakSoil', label: 'Слабые грунты' },
  { id: 'rockyBase', label: 'Скальные основания' },
];

/** Допуск проверки длины: линейкой точнее не намеряешь. */
export const PZ2_LENGTH_TOLERANCE_KM = 0.5;
/** Насколько участки могут перекрыться, чтобы это ещё считалось стыком, а не наложением. */
export const PZ2_SPAN_TOUCH_TOLERANCE_KM = 0.05;

export function getPz2WorkObjectKind(kind: Pz2WorkObjectKind) {
  return pz2WorkObjectKinds.find((item) => item.id === kind) ?? pz2WorkObjectKinds[0];
}

export function createInitialPz2Draft(): Pz2Draft {
  return { workObjects: [], rulerMarksKm: [] };
}

export function createPz2WorkObject(
  kind: Pz2WorkObjectKind = 'existingLineRepair',
  lengthKm = '',
  span?: Pz2RouteSpan,
): Pz2WorkObjectDraft {
  return {
    id: `work-object-${Math.random().toString(36).slice(2, 10)}`,
    kind,
    lengthKm,
    count: getPz2WorkObjectKind(kind).measure === 'count' ? '1' : '',
    condition: 'none',
    span,
  };
}

/**
 * Строки, участки которых налезают друг на друга.
 *
 * Сумма длин может сойтись с маршрутом и при этом быть набрана дважды по одному
 * куску трассы: тогда часть линии осталась без работ, а проверка длины об этом
 * молчит. Считаем только намеренные линейкой участки — у ручных строк места на
 * трассе нет, и сказать о них нечего.
 */
export function findPz2OverlappingObjects(draft: Pz2Draft): string[] {
  const measured = draft.workObjects
    .filter((object) => object.span && getPz2WorkObjectKind(object.kind).measure === 'length')
    .map((object) => ({
      id: object.id,
      fromKm: Math.min(object.span!.fromKm, object.span!.toKm),
      toKm: Math.max(object.span!.fromKm, object.span!.toKm),
    }))
    .sort((left, right) => left.fromKm - right.fromKm);

  const overlapping = new Set<string>();

  for (let index = 1; index < measured.length; index += 1) {
    const previous = measured[index - 1];
    const current = measured[index];

    // Стык встык — не наложение: конец одного участка совпадает с началом другого.
    if (current.fromKm < previous.toKm - PZ2_SPAN_TOUCH_TOLERANCE_KM) {
      overlapping.add(previous.id);
      overlapping.add(current.id);
    }
  }

  return [...overlapping];
}

/**
 * Смена типа объекта.
 *
 * У штучных объектов количество по умолчанию — одна штука: строка, только что
 * переключённая на стрелочный перевод, иначе оставалась бы с пустым полем и
 * ошибкой «укажите количество», хотя студент ничего не стирал. Намеренную
 * длину при этом не трогаем: вернёт тип обратно — вернётся и длина.
 */
export function changePz2WorkObjectKind(object: Pz2WorkObjectDraft, kind: Pz2WorkObjectKind): Pz2WorkObjectDraft {
  const needsCount = getPz2WorkObjectKind(kind).measure === 'count';

  return { ...object, kind, count: needsCount && !object.count.trim() ? '1' : object.count };
}

/**
 * Трасса из ПЗ1. Без загруженного файла ПЗ2 мерить нечего — это не ошибка,
 * а нормальное состояние до того, как студент принесёт свой JSON-мост.
 */
export function getPz2RouteSource(bridge: BridgeSchema | null | undefined): Pz2RouteSource {
  const pz1 = bridge?.completed?.pz1;

  return {
    routeLine: pz1?.routeLine ?? null,
    stations: (pz1?.stations ?? []).filter((station) => Number.isFinite(station.lat) && Number.isFinite(station.lng)),
    totalLengthKm: pz1?.totalLengthKm ?? 0,
    variantTitle: pz1?.variantId ? `Вариант ${pz1.variantId}` : '',
  };
}

/**
 * Станции ПЗ1 с километражом от начала трассы.
 *
 * Студент меряет участки между станциями, поэтому одной точки на карте мало:
 * нужно видеть, на каком километре стоит станция. Километраж считается той же
 * линейкой, что и участки, — иначе цифры на карте и в таблице разошлись бы.
 * Порядок — по трассе, а не по алфавиту меток.
 */
export function getPz2StationMarks(source: Pz2RouteSource, ruler: RouteRuler): Pz2StationMark[] {
  return source.stations
    .flatMap((station) => {
      const position = projectOntoRoute(ruler, { lat: station.lat, lon: station.lng });

      if (!position) {
        return [];
      }

      return [
        {
          label: station.label,
          name: station.name,
          lat: station.lat,
          lon: station.lng,
          distanceKm: position.distanceKm,
        },
      ];
    })
    .sort((left, right) => left.distanceKm - right.distanceKm);
}

export function createPz2Ruler(source: Pz2RouteSource): RouteRuler {
  return createRouteRuler(source.routeLine ? buildDisplayRoutePoints(source.routeLine) : []);
}

export interface Pz2LengthCheck {
  measuredKm: number;
  routeKm: number;
  differenceKm: number;
  status: 'empty' | 'short' | 'match' | 'over';
}

/**
 * Сверка намеренного с длиной маршрута.
 *
 * Заказчик: студент прикладывает линейку, неточности неизбежны, «чтобы потом он
 * ручками просто добил, чтобы длина была одинаковой». Поэтому проверка мягкая:
 * показывает расхождение и его знак, а не блокирует переход.
 *
 * Считаются только объекты с длиной: стрелки меряются штуками и в длину трассы
 * не укладываются.
 */
export function getPz2LengthCheck(draft: Pz2Draft, routeKm: number): Pz2LengthCheck {
  const measuredKm = draft.workObjects.reduce((sum, object) => {
    if (getPz2WorkObjectKind(object.kind).measure !== 'length') {
      return sum;
    }

    return sum + (parsePz2Number(object.lengthKm) ?? 0);
  }, 0);

  const differenceKm = measuredKm - routeKm;

  if (draft.workObjects.length === 0) {
    return { measuredKm, routeKm, differenceKm, status: 'empty' };
  }

  if (Math.abs(differenceKm) <= PZ2_LENGTH_TOLERANCE_KM) {
    return { measuredKm, routeKm, differenceKm, status: 'match' };
  }

  return { measuredKm, routeKm, differenceKm, status: differenceKm < 0 ? 'short' : 'over' };
}

export function validatePz2WorkObject(object: Pz2WorkObjectDraft): string | null {
  const measure = getPz2WorkObjectKind(object.kind).measure;

  if (measure === 'count') {
    const count = parsePz2Number(object.count);

    if (count === null) {
      return 'Укажите количество';
    }

    return count > 0 && Number.isInteger(count) ? null : 'Количество — целое число больше нуля';
  }

  const lengthKm = parsePz2Number(object.lengthKm);

  if (lengthKm === null) {
    return 'Укажите длину';
  }

  return lengthKm > 0 ? null : 'Длина должна быть больше нуля';
}

export function isPz2WorkObjectsComplete(draft: Pz2Draft) {
  return draft.workObjects.length > 0 && draft.workObjects.every((object) => validatePz2WorkObject(object) === null);
}

/** Числовой ввод в стиле проекта: запятая как разделитель, пробелы разрядов игнорируются. */
export function parsePz2Number(value: string): number | null {
  const normalized = value.replace(/[\s ]/g, '').replace(',', '.');

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Километры с двумя знаками — всегда, даже когда второй знак нулевой.
 * Иначе в одной панели рядом стоят «1 022,53» и «711,5», и числа выглядят
 * посчитанными с разной точностью, хотя точность одна.
 */
export function formatPz2Km(value: number) {
  const format = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return `${format.format(value)} км`;
}
