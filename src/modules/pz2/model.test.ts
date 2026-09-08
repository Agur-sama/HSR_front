import { describe, expect, it } from 'vitest';
import type { BridgeSchema } from '../../bridge/schema';
import {
  PZ2_LENGTH_TOLERANCE_KM,
  createInitialPz2Draft,
  changePz2WorkKind,
  assignPz2WorkToStage,
  checkPz2CriticalPath,
  createPz2Bridge,
  createPz2Ruler,
  createPz2Stage,
  findPz2OverlappingWorks,
  getPz2StageWorks,
  isPz2StagesComplete,
  readPz2Position,
  removePz2Stage,
  createPz2Work,
  getPz2LengthCheck,
  getPz2RouteSource,
  getPz2StationMarks,
  isPz2WorksComplete,
  parsePz2Number,
  pz2WorkKinds,
  validatePz2Work,
} from './model';

function draftWith(objects: Parameters<typeof getPz2LengthCheck>[0]['works']) {
  return { ...createInitialPz2Draft(), works: objects };
}

function lengthObject(kind: Parameters<typeof createPz2Work>[0], lengthKm: string) {
  return { ...createPz2Work(kind), lengthKm };
}

describe('справочник работ', () => {
  it('содержит согласованный со встречи 02.09 состав', () => {
    expect(pz2WorkKinds.map((kind) => kind.id)).toEqual([
      'existingLineRepair',
      'earthworks',
      'ballastTrack',
      'viaduct',
      'bridge',
      'tunnel',
      'turnout',
    ]);
  });

  it('стрелка меряется штуками, остальные — длиной', () => {
    const byMeasure = Object.fromEntries(pz2WorkKinds.map((kind) => [kind.id, kind.measure]));

    expect(byMeasure.turnout).toBe('count');
    expect(byMeasure.bridge).toBe('length');
    expect(byMeasure.existingLineRepair).toBe('length');
  });
});

describe('getPz2RouteSource', () => {
  it('забирает трассу и длину маршрута из моста ПЗ1', () => {
    const bridge = {
      schemaVersion: '1.1',
      passport: { team: 'Юнит-3', lineTitle: '', createdAt: '2026-09-03T00:00:00.000Z' },
      completed: {
        pz1: {
          totalLengthKm: 512.85,
          variantId: '1',
          routeLine: {
            vertices: [
              { id: 'v1', lat: 0, lon: 0 },
              { id: 'v2', lat: 0, lon: 1 },
            ],
            segments: [{ id: 's1', fromVertexId: 'v1', toVertexId: 'v2', sagittaKm: 0 }],
          },
        },
      },
    } as unknown as BridgeSchema;

    const source = getPz2RouteSource(bridge);

    expect(source.totalLengthKm).toBe(512.85);
    expect(source.routeLine?.vertices).toHaveLength(2);
    expect(createPz2Ruler(source).totalKm).toBeGreaterThan(0);
  });

  it('без загруженного файла трасса пустая, а не сломанная', () => {
    const source = getPz2RouteSource(null);

    expect(source.routeLine).toBeNull();
    expect(source.totalLengthKm).toBe(0);
    expect(createPz2Ruler(source).totalKm).toBe(0);
  });
});

describe('станции на трассе', () => {
  const bridge = {
    completed: {
      pz1: {
        totalLengthKm: 222.39,
        stations: [
          { label: 'Г', name: 'Конечная', lat: 0, lng: 2, type: 'terminal' },
          { label: 'А', name: 'Начальная', lat: 0, lng: 0, type: 'terminal' },
          { label: 'Б', name: 'Промежуточная', lat: 0.2, lng: 1, type: 'intermediate' },
        ],
        routeLine: {
          vertices: [
            { id: 'v1', lat: 0, lon: 0 },
            { id: 'v2', lat: 0, lon: 2 },
          ],
          segments: [{ id: 's1', fromVertexId: 'v1', toVertexId: 'v2', sagittaKm: 0 }],
        },
      },
    },
  } as unknown as BridgeSchema;

  it('километраж считается вдоль трассы, порядок — по трассе, а не по алфавиту', () => {
    const source = getPz2RouteSource(bridge);
    const marks = getPz2StationMarks(source, createPz2Ruler(source));

    expect(marks.map((mark) => mark.label)).toEqual(['А', 'Б', 'Г']);
    expect(marks[0].distanceKm).toBeCloseTo(0, 6);
    // Градус долготы на экваторе — примерно 111,19 км.
    expect(marks[1].distanceKm).toBeCloseTo(111.19, 1);
    expect(marks[2].distanceKm).toBeCloseTo(222.39, 1);
  });

  it('станция в стороне от линии всё равно получает километраж ближайшей точки', () => {
    const source = getPz2RouteSource(bridge);
    const marks = getPz2StationMarks(source, createPz2Ruler(source));

    // Промежуточная стоит в 0,2° севернее линии, но её километраж — по трассе.
    expect(marks[1].lat).toBeCloseTo(0.2, 6);
    expect(marks[1].distanceKm).toBeCloseTo(111.19, 1);
  });

  it('без станций в файле список пустой, а не сломанный', () => {
    const source = getPz2RouteSource(null);

    expect(getPz2StationMarks(source, createPz2Ruler(source))).toEqual([]);
  });
});

describe('проверка длины', () => {
  it('пустая таблица — отдельное состояние, а не расхождение', () => {
    expect(getPz2LengthCheck(createInitialPz2Draft(), 100).status).toBe('empty');
  });

  it('сумма сошлась с длиной маршрута в пределах допуска', () => {
    const check = getPz2LengthCheck(draftWith([lengthObject('earthworks', '60'), lengthObject('bridge', '40,2')]), 100);

    expect(check.measuredKm).toBeCloseTo(100.2, 6);
    expect(check.status).toBe('match');
  });

  it('недомерил и перемерил различаются знаком, а не только текстом', () => {
    expect(getPz2LengthCheck(draftWith([lengthObject('earthworks', '80')]), 100).status).toBe('short');
    expect(getPz2LengthCheck(draftWith([lengthObject('earthworks', '120')]), 100).status).toBe('over');
    expect(getPz2LengthCheck(draftWith([lengthObject('earthworks', '80')]), 100).differenceKm).toBeCloseTo(-20, 6);
  });

  it('на границе допуска ещё считается сошедшимся', () => {
    const check = getPz2LengthCheck(draftWith([lengthObject('earthworks', String(100 + PZ2_LENGTH_TOLERANCE_KM))]), 100);

    expect(check.status).toBe('match');
  });

  it('стрелки в длину трассы не идут — они меряются штуками', () => {
    const objects = [lengthObject('earthworks', '100'), { ...createPz2Work('turnout'), count: '4' }];

    expect(getPz2LengthCheck(draftWith(objects), 100).measuredKm).toBeCloseTo(100, 6);
  });
});

describe('наложение участков', () => {
  const span = (kind: Parameters<typeof createPz2Work>[0], fromKm: number, toKm: number) =>
    createPz2Work(kind, String(Math.abs(toKm - fromKm)), { fromKm, toKm });

  it('участки встык наложением не считаются', () => {
    const draft = draftWith([span('earthworks', 0, 50), span('bridge', 50, 80)]);

    expect(findPz2OverlappingWorks(draft)).toEqual([]);
  });

  it('перекрытие находится с обеих сторон, независимо от порядка строк', () => {
    const first = span('earthworks', 40, 90);
    const second = span('bridge', 0, 50);
    const overlapping = findPz2OverlappingWorks(draftWith([first, second]));

    expect(overlapping).toHaveLength(2);
    expect(overlapping).toContain(first.id);
    expect(overlapping).toContain(second.id);
  });

  it('участок, намеренный в обратную сторону, тоже сравнивается верно', () => {
    const draft = draftWith([span('earthworks', 90, 40), span('bridge', 0, 50)]);

    expect(findPz2OverlappingWorks(draft)).toHaveLength(2);
  });

  it('строки без участка молчат — у ручного ввода места на трассе нет', () => {
    const draft = draftWith([lengthObject('earthworks', '50'), lengthObject('bridge', '50')]);

    expect(findPz2OverlappingWorks(draft)).toEqual([]);
  });
});

describe('валидация работы', () => {
  it('длина обязательна и должна быть положительной', () => {
    expect(validatePz2Work(lengthObject('bridge', ''))).toBe('Укажите длину');
    expect(validatePz2Work(lengthObject('bridge', '0'))).toBe('Длина должна быть больше нуля');
    expect(validatePz2Work(lengthObject('bridge', '1,5'))).toBeNull();
  });

  it('у стрелки проверяется целое количество, а не длина', () => {
    const base = createPz2Work('turnout');

    expect(validatePz2Work({ ...base, count: '' })).toBe('Укажите количество');
    expect(validatePz2Work({ ...base, count: '1,5' })).toBe('Количество — целое число больше нуля');
    expect(validatePz2Work({ ...base, count: '2' })).toBeNull();
  });

  it('шаг завершён, когда есть работы и все они корректны', () => {
    expect(isPz2WorksComplete(createInitialPz2Draft())).toBe(false);
    expect(isPz2WorksComplete(draftWith([lengthObject('bridge', '2')]))).toBe(true);
    expect(isPz2WorksComplete(draftWith([lengthObject('bridge', '')]))).toBe(false);
  });
});

describe('смена типа работы', () => {
  it('переключение на штучный тип подставляет одну штуку, а не пустое поле', () => {
    const changed = changePz2WorkKind(lengthObject('bridge', '12,5'), 'turnout');

    expect(changed.count).toBe('1');
    expect(validatePz2Work(changed)).toBeNull();
  });

  it('намеренная длина переживает переключение туда и обратно', () => {
    const measured = lengthObject('bridge', '12,5');
    const back = changePz2WorkKind(changePz2WorkKind(measured, 'turnout'), 'tunnel');

    expect(back.lengthKm).toBe('12,5');
  });

  it('уже заполненное количество не перетирается', () => {
    const counted = { ...createPz2Work('turnout'), count: '7' };

    expect(changePz2WorkKind(counted, 'turnout').count).toBe('7');
  });
});

describe('parsePz2Number', () => {
  it('принимает запятую и разделители разрядов', () => {
    expect(parsePz2Number('1 234,5')).toBeCloseTo(1234.5, 6);
    expect(parsePz2Number('12,25')).toBeCloseTo(12.25, 6);
  });

  it('пустое и мусорное дают null, а не ноль', () => {
    expect(parsePz2Number('')).toBeNull();
    expect(parsePz2Number('   ')).toBeNull();
    expect(parsePz2Number('абв')).toBeNull();
  });
});

describe('этапы', () => {
  const draftWithStages = () => {
    const stage = createPz2Stage('Первый участок', 0);
    const work = createPz2Work('bridge', '12');

    return { ...createInitialPz2Draft(), stages: [stage], works: [work] };
  };

  it('работа по умолчанию лежит в пуле, а не в этапе', () => {
    expect(createPz2Work('bridge', '12').stageId).toBeNull();
    expect(getPz2StageWorks(draftWithStages(), null)).toHaveLength(1);
  });

  it('перенос в этап заменяет принадлежность, а не добавляет вторую', () => {
    const draft = draftWithStages();
    const second = createPz2Stage('Второй участок', 1);
    const withStages = { ...draft, stages: [...draft.stages, second] };

    const assigned = assignPz2WorkToStage(withStages, draft.works[0].id, draft.stages[0].id);
    const moved = assignPz2WorkToStage(assigned, draft.works[0].id, second.id);

    expect(getPz2StageWorks(moved, draft.stages[0].id)).toHaveLength(0);
    expect(getPz2StageWorks(moved, second.id)).toHaveLength(1);
  });

  it('работу можно вернуть обратно в пул', () => {
    const draft = draftWithStages();
    const assigned = assignPz2WorkToStage(draft, draft.works[0].id, draft.stages[0].id);

    expect(getPz2StageWorks(assignPz2WorkToStage(assigned, draft.works[0].id, null), null)).toHaveLength(1);
  });

  it('удаление этапа возвращает его работы в пул, а не стирает их', () => {
    const draft = draftWithStages();
    const assigned = assignPz2WorkToStage(draft, draft.works[0].id, draft.stages[0].id);
    const removed = removePz2Stage(assigned, draft.stages[0].id);

    expect(removed.stages).toHaveLength(0);
    expect(removed.works).toHaveLength(1);
    expect(removed.works[0].stageId).toBeNull();
  });

  it('после удаления порядок этапов идёт без дыр', () => {
    const draft = {
      ...createInitialPz2Draft(),
      stages: [createPz2Stage('А', 0), createPz2Stage('Б', 1), createPz2Stage('В', 2)],
    };

    const removed = removePz2Stage(draft, draft.stages[1].id);

    expect(removed.stages.map((stage) => stage.order)).toEqual([0, 1]);
  });

  it('шаг завершён, когда этапы есть и ни одна работа не осталась в пуле', () => {
    const draft = draftWithStages();

    expect(isPz2StagesComplete(draft)).toBe(false);
    expect(isPz2StagesComplete(assignPz2WorkToStage(draft, draft.works[0].id, draft.stages[0].id))).toBe(true);
  });
});

describe('мост ПЗ2', () => {
  it('сохранение не теряет данные ПЗ1 и поднимает версию схемы', () => {
    const imported = {
      schemaVersion: '1.1',
      passport: { team: 'Юнит-3', lineTitle: '', createdAt: '2026-09-03T00:00:00.000Z' },
      completed: { pz1: { totalLengthKm: 100, routeLine: null } },
    } as unknown as BridgeSchema;
    const draft = { ...createInitialPz2Draft(), works: [createPz2Work('bridge', '40')] };

    const bridge = createPz2Bridge(draft, imported, { phase: 'task', stepId: 'works', theorySeen: true });

    expect(bridge.schemaVersion).toBe('1.2');
    expect(bridge.passport.team).toBe('Юнит-3');
    expect(bridge.completed.pz1).toEqual(imported.completed.pz1);
    expect(bridge.completed.pz2?.works[0].lengthKm).toBe(40);
    expect(bridge.completed.pz2?.works[0].count).toBeNull();
    expect(bridge.completed.pz2?.routeLengthKm).toBe(100);
  });

  it('у штучной работы в мост уходит количество, а не длина', () => {
    const draft = { ...createInitialPz2Draft(), works: [{ ...createPz2Work('turnout'), count: '4' }] };
    const result = createPz2Bridge(draft, null).completed.pz2;

    expect(result?.works[0].count).toBe(4);
    expect(result?.works[0].lengthKm).toBeNull();
  });

  it('позиция читается по стабильному id, незнакомый шаг даёт интро', () => {
    const position = (stepId: string) =>
      readPz2Position({ position: { pz2: { phase: 'task', stepId, theorySeen: true } } } as unknown as BridgeSchema);

    expect(position('stages')?.stepIndex).toBe(1);
    expect(position('exercises')?.stepIndex).toBe(2);
    expect(position('чего-то-нет')).toBeNull();
    expect(readPz2Position(null)).toBeNull();
  });
});

describe('критический путь', () => {
  it('разделители не важны — важны номера и их порядок', () => {
    expect(checkPz2CriticalPath('1-3-5-7', ['1', '3', '5', '7'])).toBe(true);
    expect(checkPz2CriticalPath('1, 3, 5, 7', ['1', '3', '5', '7'])).toBe(true);
    expect(checkPz2CriticalPath(' 1 3 5 7 ', ['1', '3', '5', '7'])).toBe(true);
  });

  it('порядок значим: путь идёт от начала к концу', () => {
    expect(checkPz2CriticalPath('7-5-3-1', ['1', '3', '5', '7'])).toBe(false);
  });

  it('лишнее или недостающее событие делает ответ неверным', () => {
    expect(checkPz2CriticalPath('1-3-5', ['1', '3', '5', '7'])).toBe(false);
    expect(checkPz2CriticalPath('1-3-4-5-7', ['1', '3', '5', '7'])).toBe(false);
  });

  it('пустой ответ не считается верным даже при пустом эталоне', () => {
    expect(checkPz2CriticalPath('', [])).toBe(false);
    expect(checkPz2CriticalPath('   ', ['1'])).toBe(false);
  });
});
