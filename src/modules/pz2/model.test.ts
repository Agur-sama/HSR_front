import { describe, expect, it } from 'vitest';
import type { BridgeSchema } from '../../bridge/schema';
import {
  PZ2_LENGTH_TOLERANCE_KM,
  createInitialPz2Draft,
  changePz2WorkObjectKind,
  createPz2Ruler,
  createPz2WorkObject,
  getPz2LengthCheck,
  getPz2RouteSource,
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
