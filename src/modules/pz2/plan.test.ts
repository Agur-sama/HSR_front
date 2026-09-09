import { describe, expect, it } from 'vitest';
import {
  assignPz2WorkToStage,
  createInitialPz2Draft,
  createPz2Bridge,
  createPz2Stage,
  createPz2Work,
  pz2StepIds,
  readPz2Position,
  removePz2Stage,
} from './model';
import {
  buildPz2WorkItems,
  getPz2LoadColumns,
  getPz2Plan,
  getPz2Report,
  getPz2SubWorks,
  getPz2WorkDurationDays,
  getPz2WorkLaborHours,
  getPz2WorkUnits,
} from './plan';
import { PZ2_SHIFT_HOURS, pz2ConditionNorms, pz2WorkNorms } from './workNorms';
import type { Pz2Draft } from './types';

const laborPerKm = (kind: keyof typeof pz2WorkNorms) =>
  pz2WorkNorms[kind].subWorks.reduce((sum, subWork) => sum + subWork.laborHours, 0);

/** Два этапа по одной работе — минимальный проект, на котором видно параллельность. */
function twoStageDraft(): { draft: Pz2Draft; stageIds: string[] } {
  const first = createPz2Stage('Первый', 0);
  const second = createPz2Stage('Второй', 1);
  const earth = createPz2Work('earthworks', '10');
  const ballast = createPz2Work('ballastTrack', '10');
  const base: Pz2Draft = { ...createInitialPz2Draft(), stages: [first, second], works: [earth, ballast] };
  const withFirst = assignPz2WorkToStage(base, earth.id, first.id);

  return { draft: assignPz2WorkToStage(withFirst, ballast.id, second.id), stageIds: [first.id, second.id] };
}

describe('единицы и трудоёмкость', () => {
  it('линейная работа меряется километрами, штучная — штуками', () => {
    expect(getPz2WorkUnits(createPz2Work('earthworks', '12,5'))).toBeCloseTo(12.5, 6);
    expect(getPz2WorkUnits({ ...createPz2Work('turnout'), count: '4' })).toBe(4);
  });

  it('пустая и отрицательная величина дают ноль, а не мусор в расчёте', () => {
    expect(getPz2WorkUnits(createPz2Work('earthworks', ''))).toBe(0);
    expect(getPz2WorkUnits(createPz2Work('earthworks', '-5'))).toBe(0);
    expect(getPz2WorkLaborHours(createPz2Work('earthworks', ''))).toBe(0);
  });

  it('трудоёмкость — сумма подработ на единицу, умноженная на длину', () => {
    expect(getPz2WorkLaborHours(createPz2Work('earthworks', '10'))).toBeCloseTo(laborPerKm('earthworks') * 10, 6);
  });

  it('условия грунта добавляют подработы, а не множитель', () => {
    const plain = createPz2Work('earthworks', '10');
    const weak = { ...plain, conditions: ['weakSoil' as const] };
    const added = pz2ConditionNorms.weakSoil.subWorks.reduce((sum, subWork) => sum + subWork.laborHours, 0);

    expect(getPz2SubWorks(weak)).toHaveLength(getPz2SubWorks(plain).length + 2);
    expect(getPz2WorkLaborHours(weak)).toBeCloseTo(getPz2WorkLaborHours(plain) + added * 10, 6);
  });

  it('два условия складываются, а не заменяют друг друга', () => {
    const both = { ...createPz2Work('earthworks', '10'), conditions: ['weakSoil' as const, 'rocky' as const] };

    expect(getPz2WorkLaborHours(both)).toBeGreaterThan(
      getPz2WorkLaborHours({ ...createPz2Work('earthworks', '10'), conditions: ['weakSoil'] }),
    );
  });
});

describe('длительность работы', () => {
  it('вдвое больше людей — вдвое короче срок', () => {
    const work = createPz2Work('earthworks', '10');

    expect(getPz2WorkDurationDays(work, 20)).toBe(Math.ceil(getPz2WorkLaborHours(work) / (20 * PZ2_SHIFT_HOURS)));
    expect(getPz2WorkDurationDays(work, 40) * 2).toBeGreaterThanOrEqual(getPz2WorkDurationDays(work, 20));
  });

  it('меньше дня работа не длится', () => {
    expect(getPz2WorkDurationDays(createPz2Work('turnout'), 1000)).toBe(1);
  });

  it('без людей срока нет — ноль, а не бесконечность', () => {
    expect(getPz2WorkDurationDays(createPz2Work('earthworks', '10'), 0)).toBe(0);
    expect(Number.isFinite(getPz2WorkDurationDays(createPz2Work('earthworks', '10'), 0))).toBe(true);
  });
});

describe('график по этапам', () => {
  it('работы этапа идут одна за другой, а этапы — параллельно', () => {
    const { draft, stageIds } = twoStageDraft();
    const extra = createPz2Work('bridge', '2');
    const withExtra = assignPz2WorkToStage(
      { ...draft, works: [...draft.works, extra] },
      extra.id,
      stageIds[0],
    );
    const plan = getPz2Plan(withExtra, stageIds.map((stageId) => ({ stageId, workers: 20 })), 40);
    const byId = new Map(plan.items.map((item) => [item.id, item]));
    const [firstWork, secondWork] = [draft.works[0].id, extra.id];

    // Внутри этапа: вторая работа начинается не раньше конца первой.
    expect(byId.get(secondWork)!.earlyStart).toBeGreaterThanOrEqual(byId.get(firstWork)!.earlyFinish);
    // Между этапами: обе первые работы стартуют в нулевой день.
    expect(byId.get(draft.works[1].id)!.earlyStart).toBe(0);
    expect(byId.get(firstWork)!.earlyStart).toBe(0);
  });

  it('этап без людей в график не попадает и о нём говорится отдельно', () => {
    const { draft, stageIds } = twoStageDraft();
    const plan = getPz2Plan(draft, [{ stageId: stageIds[0], workers: 20 }, { stageId: stageIds[1], workers: 0 }], 20);

    expect(plan.items).toHaveLength(1);
    expect(plan.stagesWithoutWorkers).toEqual([stageIds[1]]);
  });

  it('перегрузка считается по общему числу рабочих на проект', () => {
    const { draft, stageIds } = twoStageDraft();
    const allocations = stageIds.map((stageId) => ({ stageId, workers: 20 }));

    expect(getPz2Plan(draft, allocations, 40).metrics.overloadDays).toBe(0);
    expect(getPz2Plan(draft, allocations, 30).metrics.overloadDays).toBeGreaterThan(0);
  });

  it('распределённые люди считаются и сравниваются с общим числом', () => {
    const { draft, stageIds } = twoStageDraft();
    const plan = getPz2Plan(draft, [{ stageId: stageIds[0], workers: 12 }, { stageId: stageIds[1], workers: 8 }], 30);

    expect(plan.assignedWorkers).toBe(20);
  });

  it('без этапов и работ план пустой, а не сломанный', () => {
    const plan = getPz2Plan(createInitialPz2Draft(), [], 30);

    expect(plan.items).toEqual([]);
    expect(plan.usage).toEqual([]);
    expect(plan.metrics.projectDuration).toBe(0);
  });

  it('код работы показывает её место: номер этапа и номер внутри него', () => {
    const { draft, stageIds } = twoStageDraft();
    const items = buildPz2WorkItems(draft, stageIds.map((stageId) => ({ stageId, workers: 10 })));

    expect(items.map((item) => item.code)).toEqual(['1.1', '2.1']);
  });
});

describe('отчёт', () => {
  it('человеко-часы отчёта совпадают с суммой трудоёмкости работ', () => {
    const { draft } = twoStageDraft();
    const expected = draft.works.reduce((sum, work) => sum + getPz2WorkLaborHours(work), 0);

    expect(getPz2Report(draft).laborHours).toBeCloseTo(expected, 6);
  });

  it('одинаковые материалы складываются, а не идут двумя строками', () => {
    const draft = {
      ...createInitialPz2Draft(),
      works: [createPz2Work('ballastTrack', '10'), createPz2Work('ballastTrack', '5')],
    };
    const rails = getPz2Report(draft).materials.filter((row) => row.title === 'Рельсы Р65');

    expect(rails).toHaveLength(1);
    expect(rails[0].amount).toBeCloseTo(pz2WorkNorms.ballastTrack.materials[2].perUnit * 15, 6);
  });

  it('условия грунта попадают в отчёт своими материалами и машинами', () => {
    const draft = {
      ...createInitialPz2Draft(),
      works: [{ ...createPz2Work('earthworks', '10'), conditions: ['weakSoil' as const] }],
    };
    const report = getPz2Report(draft);

    expect(report.materials.some((row) => row.title === 'Сваи железобетонные')).toBe(true);
    expect(report.machines.some((row) => row.title === 'Сваебойная установка')).toBe(true);
  });

  it('работы без длины в отчёт не идут — считать по ним нечего', () => {
    const draft = { ...createInitialPz2Draft(), works: [createPz2Work('earthworks', '')] };
    const report = getPz2Report(draft);

    expect(report.laborHours).toBe(0);
    expect(report.materials).toEqual([]);
  });

  it('позиции идут по убыванию расхода — крупные первыми', () => {
    const { draft } = twoStageDraft();
    const amounts = getPz2Report(draft).materials.map((row) => row.amount);

    expect([...amounts].sort((left, right) => right - left)).toEqual(amounts);
  });
});

describe('удаление этапа и люди', () => {
  it('люди удалённого этапа освобождаются, а не остаются распределёнными в никуда', () => {
    const stage = createPz2Stage('Первый', 0);
    const draft: Pz2Draft = {
      ...createInitialPz2Draft(),
      stages: [stage],
      totalWorkers: '30',
      workersByStage: { [stage.id]: '18' },
    };

    expect(Object.keys(removePz2Stage(draft, stage.id).workersByStage)).toEqual([]);
  });
});

describe('гистограмма загрузки', () => {
  const usage = (workers: number[]) =>
    workers.map((count, index) => ({ day: index + 1, workers: count, overloaded: count > 100, idle: false }));

  it('длинный проект сводится к столбцам постоянной ширины', () => {
    const columns = getPz2LoadColumns(usage(Array.from({ length: 1200 }, () => 40)), 90);

    expect(columns.length).toBeLessThanOrEqual(90);
    expect(columns[0].fromDay).toBe(1);
    expect(columns.at(-1)!.toDay).toBe(1200);
  });

  it('внутри столбца берётся пик, а не среднее — нехватку нельзя усреднять', () => {
    const columns = getPz2LoadColumns(usage([10, 10, 200, 10]), 1);

    expect(columns).toHaveLength(1);
    expect(columns[0].workers).toBe(200);
    expect(columns[0].overloaded).toBe(true);
  });

  it('короткий проект остаётся по дню на столбец', () => {
    const columns = getPz2LoadColumns(usage([10, 20, 30]), 90);

    expect(columns.map((column) => column.workers)).toEqual([10, 20, 30]);
  });

  it('пустая загрузка даёт пустую гистограмму, а не деление на ноль', () => {
    expect(getPz2LoadColumns([], 90)).toEqual([]);
  });
});

describe('план и отчёт в мосте', () => {
  it('в мост уходят раскладка людей, срок и признак черновых нормативов', () => {
    const { draft, stageIds } = twoStageDraft();
    const withWorkers: Pz2Draft = {
      ...draft,
      totalWorkers: '40',
      workersByStage: { [stageIds[0]]: '20', [stageIds[1]]: '20' },
    };
    const result = createPz2Bridge(withWorkers, null).completed.pz2!;

    expect(result.plan.totalWorkers).toBe(40);
    expect(result.plan.workersByStage[stageIds[0]]).toBe(20);
    expect(result.plan.durationDays).toBeGreaterThan(0);
    expect(result.report.laborHours).toBeGreaterThan(0);
    expect(result.report.normsAreDraft).toBe(true);
  });

  it('без раскладки людей срок нулевой, но файл всё равно пишется', () => {
    const { draft } = twoStageDraft();
    const result = createPz2Bridge(draft, null).completed.pz2!;

    expect(result.plan.totalWorkers).toBe(0);
    expect(result.plan.durationDays).toBe(0);
    expect(result.report.laborHours).toBeGreaterThan(0);
  });
});

describe('восстановление из файла', () => {
  it('работы, этапы и раскладка людей возвращаются из сохранённого файла', () => {
    const { draft, stageIds } = twoStageDraft();
    const saved: Pz2Draft = {
      ...draft,
      totalWorkers: '40',
      workersByStage: { [stageIds[0]]: '25', [stageIds[1]]: '15' },
    };
    const bridge = createPz2Bridge(saved, null);

    const restored = createInitialPz2Draft(bridge);

    expect(restored.works).toHaveLength(saved.works.length);
    expect(restored.works[0].kind).toBe(saved.works[0].kind);
    expect(restored.works[0].stageId).toBe(stageIds[0]);
    expect(restored.stages.map((stage) => stage.title)).toEqual(saved.stages.map((stage) => stage.title));
    expect(restored.totalWorkers).toBe('40');
    expect(restored.workersByStage[stageIds[0]]).toBe('25');
  });

  it('длина возвращается в поле в том же виде, в каком её вводили', () => {
    const work = { ...createPz2Work('bridge', '12,5'), stageId: null };
    const bridge = createPz2Bridge({ ...createInitialPz2Draft(), works: [work] }, null);

    expect(createInitialPz2Draft(bridge).works[0].lengthKm).toBe('12,5');
  });

  it('у штучной работы возвращается количество, а не длина', () => {
    const work = { ...createPz2Work('turnout'), count: '4' };
    const bridge = createPz2Bridge({ ...createInitialPz2Draft(), works: [work] }, null);
    const restored = createInitialPz2Draft(bridge).works[0];

    expect(restored.count).toBe('4');
    expect(restored.lengthKm).toBe('');
  });

  it('участок работы на трассе переживает сохранение', () => {
    const work = createPz2Work('earthworks', '100', { fromKm: 10, toKm: 110 });
    const bridge = createPz2Bridge({ ...createInitialPz2Draft(), works: [work] }, null);

    expect(createInitialPz2Draft(bridge).works[0].span).toEqual({ fromKm: 10, toKm: 110 });
  });

  it('файл без секции ПЗ2 даёт пустой черновик, а не ошибку', () => {
    expect(createInitialPz2Draft(null).works).toEqual([]);
    expect(createInitialPz2Draft({ completed: {} } as never).stages).toEqual([]);
  });

  it('позиция и данные согласованы: шаг из файла существует', () => {
    const { draft } = twoStageDraft();
    const bridge = createPz2Bridge(draft, null, { phase: 'task', stepId: 'plan', theorySeen: true });

    expect(readPz2Position(bridge)?.stepIndex).toBe(pz2StepIds.indexOf('plan'));
  });
});
