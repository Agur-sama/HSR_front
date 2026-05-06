import { describe, expect, it } from 'vitest';
import { initialScenario } from './mockData';
import {
  buildWorkItemsFromDefinitions,
  calculateResourceUsage,
  calculateResourceUsageWithFloat,
  calculateSchedule,
  getCriticalPath,
  getProjectMetrics,
  recalculateDefinition,
  updateWorkWorkers,
} from './calculations';
import { defaultWorkDefinitions } from './mockData';

describe('network calculations', () => {
  it('calculates early and late dates with critical works', () => {
    const result = calculateSchedule(initialScenario.works);

    expect(result.errors).toHaveLength(0);
    expect(result.projectDuration).toBe(18);
    expect(getCriticalPath(result.items).map((item) => item.code)).toEqual(['1-2', '2-4', '4-5', '5-7', '6-7']);
  });

  it('recalculates duration when workers change', () => {
    const updated = updateWorkWorkers(initialScenario.works, 'w5', 6);
    const work = updated.find((item) => item.id === 'w5');

    expect(work?.duration).toBe(4);
  });

  it('keeps labor editable in manual duration mode', () => {
    const definition = recalculateDefinition({
      id: 'manual',
      code: '1-2',
      from: '1',
      to: '2',
      title: 'Manual',
      labor: 15,
      workers: 3,
      duration: 8,
      calculationMode: 'manual-duration',
    });

    expect(definition.labor).toBe(15);
    expect(definition.duration).toBe(8);
  });

  it('rejects invalid workers', () => {
    expect(() => updateWorkWorkers(initialScenario.works, 'w1', 0)).toThrow('Количество сотрудников');
  });

  it('detects overload in resource usage and metrics', () => {
    const schedule = calculateSchedule([
      {
        id: 'a',
        code: '1-2',
        title: 'Параллельная критическая работа 1',
        from: '1',
        to: '2',
        labor: 20,
        workers: 4,
        duration: 5,
        dependencies: [],
      },
      {
        id: 'b',
        code: '1-3',
        title: 'Параллельная критическая работа 2',
        from: '1',
        to: '3',
        labor: 20,
        workers: 4,
        duration: 5,
        dependencies: [],
      },
    ]);
    const usage = calculateResourceUsage(schedule.items, 5);
    const metrics = getProjectMetrics(schedule.items, 5);

    expect(usage.some((point) => point.overloaded)).toBe(true);
    expect(metrics.maxWorkers).toBeGreaterThan(5);
  });

  it('keeps original resource usage without spreading float', () => {
    const schedule = calculateSchedule([
      {
        id: 'critical',
        code: '1-2',
        title: 'Критическая работа',
        from: '1',
        to: '2',
        labor: 10,
        workers: 1,
        duration: 10,
        dependencies: [],
      },
      {
        id: 'reserve',
        code: '1-3',
        title: 'Работа с резервом',
        from: '1',
        to: '3',
        labor: 10,
        workers: 10,
        duration: 1,
        dependencies: [],
      },
    ]);
    const usage = calculateResourceUsage(schedule.items, 5);

    expect(schedule.items.find((item) => item.id === 'reserve')?.totalFloat).toBe(9);
    expect(usage[0].workers).toBe(11);
    expect(Math.max(...usage.map((point) => point.workers))).toBe(11);
  });

  it('spreads non-critical work across float in optimized resource usage', () => {
    const schedule = calculateSchedule([
      {
        id: 'critical',
        code: '1-2',
        title: 'Критическая работа',
        from: '1',
        to: '2',
        labor: 10,
        workers: 1,
        duration: 10,
        dependencies: [],
      },
      {
        id: 'reserve',
        code: '1-3',
        title: 'Работа с резервом',
        from: '1',
        to: '3',
        labor: 10,
        workers: 10,
        duration: 1,
        dependencies: [],
      },
    ]);
    const usage = calculateResourceUsageWithFloat(schedule.items, 5);

    expect(schedule.items.find((item) => item.id === 'reserve')?.totalFloat).toBe(9);
    expect(usage[0].workers).toBe(2);
    expect(Math.max(...usage.map((point) => point.workers))).toBe(2);
  });

  it('returns validation error for cycles', () => {
    const result = calculateSchedule([
      { ...initialScenario.works[0], dependencies: ['w2'] },
      { ...initialScenario.works[1], dependencies: ['w1'] },
    ]);

    expect(result.errors[0].type).toBe('cycle');
  });

  it('builds dependencies from start and finish events', () => {
    const built = buildWorkItemsFromDefinitions(defaultWorkDefinitions);
    const mainWork = built.items.find((item) => item.id === 'w5');

    expect(built.errors).toHaveLength(0);
    expect(mainWork?.dependencies.sort()).toEqual(['w3', 'w4']);
  });

  it('keeps demolition after preparation by event dependencies', () => {
    const built = buildWorkItemsFromDefinitions(defaultWorkDefinitions);
    const schedule = calculateSchedule(built.items);
    const preparation = schedule.items.find((item) => item.code === '1-2');
    const demolition = schedule.items.find((item) => item.code === '2-4');

    expect(built.errors).toHaveLength(0);
    expect(schedule.errors).toHaveLength(0);
    expect(demolition?.dependencies).toContain(preparation?.id);
    expect(demolition?.earlyStart).toBeGreaterThanOrEqual(preparation?.earlyFinish ?? 0);
  });

  it('rebuilds the chain when a new work is inserted between events', () => {
    const built = buildWorkItemsFromDefinitions([
      { id: 'a', code: '1-2', from: '1', to: '2', title: 'A', labor: 6, workers: 2, duration: 3, calculationMode: 'fixed-labor' },
      { id: 'inserted', code: '2-2.1', from: '2', to: '2.1', title: 'Inserted', labor: 4, workers: 2, duration: 2, calculationMode: 'fixed-labor' },
      { id: 'b', code: '2.1-3', from: '2.1', to: '3', title: 'B', labor: 6, workers: 2, duration: 3, calculationMode: 'fixed-labor' },
    ]);
    const schedule = calculateSchedule(built.items);
    const first = schedule.items.find((item) => item.id === 'a');
    const inserted = schedule.items.find((item) => item.id === 'inserted');
    const next = schedule.items.find((item) => item.id === 'b');

    expect(built.errors).toHaveLength(0);
    expect(inserted?.dependencies).toEqual(['a']);
    expect(next?.dependencies).toEqual(['inserted']);
    expect(inserted?.earlyStart).toBe(first?.earlyFinish);
    expect(next?.earlyStart).toBe(inserted?.earlyFinish);
  });

  it('moves dependent works when a predecessor is shifted inside its float', () => {
    const shifted = calculateSchedule([
      {
        id: 'critical',
        code: '1-5',
        title: 'Critical',
        from: '1',
        to: '5',
        labor: 10,
        workers: 1,
        duration: 10,
        dependencies: [],
      },
      {
        id: 'a',
        code: '1-2',
        title: 'A',
        from: '1',
        to: '2',
        labor: 2,
        workers: 1,
        duration: 2,
        dependencies: [],
        plannedShift: 3,
      },
      {
        id: 'b',
        code: '2-3',
        title: 'B',
        from: '2',
        to: '3',
        labor: 2,
        workers: 1,
        duration: 2,
        dependencies: ['a'],
      },
    ]);
    const first = shifted.items.find((item) => item.id === 'a');
    const dependent = shifted.items.find((item) => item.id === 'b');

    expect(shifted.projectDuration).toBe(10);
    expect(first?.earlyStart).toBe(3);
    expect(dependent?.earlyStart).toBe(first?.earlyFinish);
  });

  it('clamps shift so reserve movement does not extend the project', () => {
    const shifted = calculateSchedule([
      {
        id: 'critical',
        code: '1-5',
        title: 'Critical',
        from: '1',
        to: '5',
        labor: 10,
        workers: 1,
        duration: 10,
        dependencies: [],
      },
      {
        id: 'a',
        code: '1-2',
        title: 'A',
        from: '1',
        to: '2',
        labor: 2,
        workers: 1,
        duration: 2,
        dependencies: [],
        plannedShift: 99,
      },
      {
        id: 'b',
        code: '2-3',
        title: 'B',
        from: '2',
        to: '3',
        labor: 2,
        workers: 1,
        duration: 2,
        dependencies: ['a'],
      },
    ]);
    const first = shifted.items.find((item) => item.id === 'a');
    const dependent = shifted.items.find((item) => item.id === 'b');

    expect(shifted.projectDuration).toBe(10);
    expect(first?.plannedShift).toBe(6);
    expect(dependent?.earlyFinish).toBe(10);
  });

  it('validates work definition fields in Russian-friendly errors', () => {
    const built = buildWorkItemsFromDefinitions([{ ...defaultWorkDefinitions[0], from: '1', to: '1', labor: 0 }]);

    expect(built.errors.map((error) => error.type)).toContain('same-event');
    expect(built.errors.map((error) => error.type)).toContain('invalid-labor');
  });
});
