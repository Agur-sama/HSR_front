import { createBridge } from '../../bridge/io';
import type { BridgeSchema, ModulePosition, Pz2Result, Pz2Stage, Pz2Work } from '../../bridge/schema';
import { buildDisplayRoutePoints } from '../../shared/lib/routeGeometry';
import { createRouteRuler, projectOntoRoute } from '../../shared/lib/routeRuler';
import type { RouteRuler } from '../../shared/lib/routeRuler';
import type {
  Pz2Draft,
  Pz2RouteSpan,
  Pz2StationMark,
  Pz2SoilCondition,
  Pz2RouteSource,
  Pz2StageDraft,
  Pz2WorkDraft,
  Pz2WorkKind,
  Pz2WorkMeasure,
} from './types';

interface Pz2WorkKindInfo {
  id: Pz2WorkKind;
  label: string;
  measure: Pz2WorkMeasure;
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
export const pz2WorkKinds: Pz2WorkKindInfo[] = [
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
    id: 'viaduct',
    label: 'Эстакада',
    measure: 'length',
    hint: 'Путь на опорах — там, где насыпь невозможна или невыгодна.',
  },
  { id: 'bridge', label: 'Мост', measure: 'length', hint: 'Переход через водную преграду.' },
  { id: 'tunnel', label: 'Тоннель', measure: 'length', hint: 'Переход сквозь возвышенность.' },
  {
    id: 'turnout',
    label: 'Стрелочный перевод 1/25',
    measure: 'count',
    hint: 'Путевое развитие на подходе к станции. Марка 1/25 — очень пологая, восемь приводов, считается отдельно.',
  },
];

export const pz2SoilConditions: { id: Pz2SoilCondition; label: string; hint: string }[] = [
  {
    id: 'weakSoil',
    label: 'Слабые грунты',
    hint: 'Нужны сваи до твёрдого слоя и ростверк — работ становится больше.',
  },
  { id: 'rocky', label: 'Скальные породы', hint: 'Разработка скального грунта: буровзрывные работы.' },
];

/** Допуск проверки длины: линейкой точнее не намеряешь. */
export const PZ2_LENGTH_TOLERANCE_KM = 0.5;
/** Насколько участки могут перекрыться, чтобы это ещё считалось стыком, а не наложением. */
export const PZ2_SPAN_TOUCH_TOLERANCE_KM = 0.05;

export function getPz2WorkKind(kind: Pz2WorkKind) {
  return pz2WorkKinds.find((item) => item.id === kind) ?? pz2WorkKinds[0];
}

export function createInitialPz2Draft(): Pz2Draft {
  return { works: [], stages: [], rulerMarksKm: [] };
}

export function createPz2Work(
  kind: Pz2WorkKind = 'existingLineRepair',
  lengthKm = '',
  span?: Pz2RouteSpan,
): Pz2WorkDraft {
  return {
    id: `work-${Math.random().toString(36).slice(2, 10)}`,
    kind,
    lengthKm,
    count: getPz2WorkKind(kind).measure === 'count' ? '1' : '',
    conditions: [],
    stageId: null,
    span,
  };
}

/** Условие включают и выключают галочкой, поэтому переключатель, а не замена. */
export function togglePz2SoilCondition(work: Pz2WorkDraft, condition: Pz2SoilCondition): Pz2WorkDraft {
  const conditions = work.conditions.includes(condition)
    ? work.conditions.filter((item) => item !== condition)
    : [...work.conditions, condition];

  return { ...work, conditions };
}

export function createPz2Stage(title: string, order: number): Pz2StageDraft {
  return { id: `stage-${Math.random().toString(36).slice(2, 10)}`, title: title.trim(), order };
}

/**
 * Строки, участки которых налезают друг на друга.
 *
 * Сумма длин может сойтись с маршрутом и при этом быть набрана дважды по одному
 * куску трассы: тогда часть линии осталась без работ, а проверка длины об этом
 * молчит. Считаем только намеренные линейкой участки — у ручных строк места на
 * трассе нет, и сказать о них нечего.
 */
export function findPz2OverlappingWorks(draft: Pz2Draft): string[] {
  const measured = draft.works
    .filter((object) => object.span && getPz2WorkKind(object.kind).measure === 'length')
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
export function changePz2WorkKind(object: Pz2WorkDraft, kind: Pz2WorkKind): Pz2WorkDraft {
  const needsCount = getPz2WorkKind(kind).measure === 'count';

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
  const measuredKm = draft.works.reduce((sum, object) => {
    if (getPz2WorkKind(object.kind).measure !== 'length') {
      return sum;
    }

    return sum + (parsePz2Number(object.lengthKm) ?? 0);
  }, 0);

  const differenceKm = measuredKm - routeKm;

  if (draft.works.length === 0) {
    return { measuredKm, routeKm, differenceKm, status: 'empty' };
  }

  if (Math.abs(differenceKm) <= PZ2_LENGTH_TOLERANCE_KM) {
    return { measuredKm, routeKm, differenceKm, status: 'match' };
  }

  return { measuredKm, routeKm, differenceKm, status: differenceKm < 0 ? 'short' : 'over' };
}

export function validatePz2Work(object: Pz2WorkDraft): string | null {
  const measure = getPz2WorkKind(object.kind).measure;

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

export function isPz2WorksComplete(draft: Pz2Draft) {
  return draft.works.length > 0 && draft.works.every((object) => validatePz2Work(object) === null);
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

/**
 * Шаг «Этапы» пройден, когда этапы созданы и каждая работа куда-то отнесена.
 *
 * Пустой пул — и есть смысл разбиения: трасса делится на участки целиком, а не
 * частично. Заказчик числа этапов не ограничивал (в-9), поэтому проверяется
 * только то, что они есть и что работы разложены.
 */
export function isPz2StagesComplete(draft: Pz2Draft) {
  return draft.stages.length > 0 && draft.works.length > 0 && draft.works.every((work) => work.stageId !== null);
}

/** Работы этапа в порядке их появления. Пул — этап с id null. */
export function getPz2StageWorks(draft: Pz2Draft, stageId: string | null) {
  return draft.works.filter((work) => work.stageId === stageId);
}

/**
 * Перенос работы в этап. Работа принадлежит ровно одному этапу, поэтому это
 * замена принадлежности, а не добавление в список — двух этапов у неё быть не
 * может (DoD экрана 2).
 */
export function assignPz2WorkToStage(draft: Pz2Draft, workId: string, stageId: string | null): Pz2Draft {
  return {
    ...draft,
    works: draft.works.map((work) => (work.id === workId ? { ...work, stageId } : work)),
  };
}

/**
 * Удаление этапа: его работы возвращаются в пул, а не исчезают вместе с ним.
 * Порядок оставшихся этапов пересчитывается, чтобы не осталось дыр.
 */
export function removePz2Stage(draft: Pz2Draft, stageId: string): Pz2Draft {
  return {
    ...draft,
    stages: draft.stages
      .filter((stage) => stage.id !== stageId)
      .map((stage, index) => ({ ...stage, order: index })),
    works: draft.works.map((work) => (work.stageId === stageId ? { ...work, stageId: null } : work)),
  };
}

/** Шаги задания стабильными идентификаторами: позиция в файле не зависит от порядка. */
export const pz2StepIds = ['works', 'stages', 'exercises'] as const;

export type Pz2StepId = (typeof pz2StepIds)[number];

/**
 * Итог ПЗ2 для моста.
 *
 * Строки ввода превращаются в числа здесь и только здесь: дальше по цепочке
 * заданий пойдут посчитанные величины, а не то, что студент набрал в поле.
 */
export function createPz2Result(draft: Pz2Draft, routeLengthKm: number): Pz2Result {
  return {
    works: draft.works.map((work): Pz2Work => {
      const measure = getPz2WorkKind(work.kind).measure;

      return {
        id: work.id,
        kind: work.kind,
        lengthKm: measure === 'length' ? parsePz2Number(work.lengthKm) : null,
        count: measure === 'count' ? parsePz2Number(work.count) : null,
        stageId: work.stageId,
        conditions: work.conditions,
        ...(work.span ? { span: work.span } : {}),
      };
    }),
    stages: draft.stages.map((stage): Pz2Stage => ({ id: stage.id, title: stage.title, order: stage.order })),
    routeLengthKm,
    measuredLengthKm: getPz2LengthCheck(draft, routeLengthKm).measuredKm,
  };
}

/**
 * Файл ПЗ2. Данные ПЗ1 переносятся из загруженного моста как есть: второе
 * задание продолжает первое, и сохранение ПЗ2 не должно обнулять то, с чем
 * студент пришёл.
 */
export function createPz2Bridge(
  draft: Pz2Draft,
  importedBridge: BridgeSchema | null,
  position?: ModulePosition,
): BridgeSchema {
  const source = getPz2RouteSource(importedBridge);
  const passport = importedBridge?.passport ?? {
    team: '',
    lineTitle: '',
    createdAt: new Date().toISOString(),
  };

  return createBridge(
    passport,
    { ...importedBridge?.completed, pz2: createPz2Result(draft, source.totalLengthKm) },
    {
      ...importedBridge?.progress,
      pz2: {
        works: isPz2WorksComplete(draft),
        stages: isPz2StagesComplete(draft),
      },
    },
    { ...importedBridge?.position, ...(position ? { pz2: position } : {}) },
  );
}

/**
 * Куда открывать задание после загрузки файла — тем же способом, что в ПЗ1:
 * шаг ищется по стабильному id, незнакомый id и файлы без позиции дают интро.
 */
export function readPz2Position(bridge: BridgeSchema | null | undefined) {
  const position = bridge?.position?.pz2;

  if (!position || !position.phase || position.phase === 'intro') {
    return null;
  }

  if (position.phase === 'result') {
    return { phase: 'result' as const, stepIndex: pz2StepIds.length - 1, theorySeen: true };
  }

  const stepIndex = position.stepId ? pz2StepIds.indexOf(position.stepId as Pz2StepId) : -1;

  if (stepIndex < 0) {
    return null;
  }

  return { phase: 'task' as const, stepIndex, theorySeen: position.theorySeen ?? true };
}
