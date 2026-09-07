import { describe, expect, it } from 'vitest';
import type { BridgeSchema } from '../../bridge/schema';
import {
  PZ2_LENGTH_TOLERANCE_KM,
  createInitialPz2Draft,
  changePz2WorkObjectKind,
  createPz2Ruler,
  findPz2OverlappingObjects,
  createPz2WorkObject,
  getPz2LengthCheck,
  getPz2RouteSource,
  getPz2StationMarks,
  isPz2WorkObjectsComplete,
  parsePz2Number,
  pz2WorkObjectKinds,
  validatePz2WorkObject,
} from './model';

function draftWith(objects: Parameters<typeof getPz2LengthCheck>[0]['workObjects']) {
  return { ...createInitialPz2Draft(), workObjects: objects };
}

function lengthObject(kind: Parameters<typeof createPz2WorkObject>[0], lengthKm: string) {
  return { ...createPz2WorkObject(kind), lengthKm };
}

describe('справочник объектов трассы', () => {
  it('содержит согласованный со встречи 02.09 состав', () => {
    expect(pz2WorkObjectKinds.map((kind) => kind.id)).toEqual([
      'existingLineRepair',
      'earthworks',
      'ballastTrack',
      'overpass',
      'bridge',
      'tunnel',
      'switch',
    ]);
  });

  it('стрелка меряется штуками, остальные — длиной', () => {
    const byMeasure = Object.fromEntries(pz2WorkObjectKinds.map((kind) => [kind.id, kind.measure]));

    expect(byMeasure.switch).toBe('count');
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
    const objects = [lengthObject('earthworks', '100'), { ...createPz2WorkObject('switch'), count: '4' }];

    expect(getPz2LengthCheck(draftWith(objects), 100).measuredKm).toBeCloseTo(100, 6);
  });
});

describe('наложение участков', () => {
  const span = (kind: Parameters<typeof createPz2WorkObject>[0], fromKm: number, toKm: number) =>
    createPz2WorkObject(kind, String(Math.abs(toKm - fromKm)), { fromKm, toKm });

  it('участки встык наложением не считаются', () => {
    const draft = draftWith([span('earthworks', 0, 50), span('bridge', 50, 80)]);

    expect(findPz2OverlappingObjects(draft)).toEqual([]);
  });

  it('перекрытие находится с обеих сторон, независимо от порядка строк', () => {
    const first = span('earthworks', 40, 90);
    const second = span('bridge', 0, 50);
    const overlapping = findPz2OverlappingObjects(draftWith([first, second]));

    expect(overlapping).toHaveLength(2);
    expect(overlapping).toContain(first.id);
    expect(overlapping).toContain(second.id);
  });

  it('участок, намеренный в обратную сторону, тоже сравнивается верно', () => {
    const draft = draftWith([span('earthworks', 90, 40), span('bridge', 0, 50)]);

    expect(findPz2OverlappingObjects(draft)).toHaveLength(2);
  });

  it('строки без участка молчат — у ручного ввода места на трассе нет', () => {
    const draft = draftWith([lengthObject('earthworks', '50'), lengthObject('bridge', '50')]);

    expect(findPz2OverlappingObjects(draft)).toEqual([]);
  });
});

describe('валидация объекта', () => {
  it('длина обязательна и должна быть положительной', () => {
    expect(validatePz2WorkObject(lengthObject('bridge', ''))).toBe('Укажите длину');
    expect(validatePz2WorkObject(lengthObject('bridge', '0'))).toBe('Длина должна быть больше нуля');
    expect(validatePz2WorkObject(lengthObject('bridge', '1,5'))).toBeNull();
  });

  it('у стрелки проверяется целое количество, а не длина', () => {
    const base = createPz2WorkObject('switch');

    expect(validatePz2WorkObject({ ...base, count: '' })).toBe('Укажите количество');
    expect(validatePz2WorkObject({ ...base, count: '1,5' })).toBe('Количество — целое число больше нуля');
    expect(validatePz2WorkObject({ ...base, count: '2' })).toBeNull();
  });

  it('шаг завершён, когда есть объекты и все они корректны', () => {
    expect(isPz2WorkObjectsComplete(createInitialPz2Draft())).toBe(false);
    expect(isPz2WorkObjectsComplete(draftWith([lengthObject('bridge', '2')]))).toBe(true);
    expect(isPz2WorkObjectsComplete(draftWith([lengthObject('bridge', '')]))).toBe(false);
  });
});

describe('смена типа объекта', () => {
  it('переключение на штучный тип подставляет одну штуку, а не пустое поле', () => {
    const changed = changePz2WorkObjectKind(lengthObject('bridge', '12,5'), 'switch');

    expect(changed.count).toBe('1');
    expect(validatePz2WorkObject(changed)).toBeNull();
  });

  it('намеренная длина переживает переключение туда и обратно', () => {
    const measured = lengthObject('bridge', '12,5');
    const back = changePz2WorkObjectKind(changePz2WorkObjectKind(measured, 'switch'), 'tunnel');

    expect(back.lengthKm).toBe('12,5');
  });

  it('уже заполненное количество не перетирается', () => {
    const counted = { ...createPz2WorkObject('switch'), count: '7' };

    expect(changePz2WorkObjectKind(counted, 'switch').count).toBe('7');
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
