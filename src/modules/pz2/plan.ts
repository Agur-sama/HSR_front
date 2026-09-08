import { calculateResourceUsage, calculateSchedule, getProjectMetrics } from '../../domain/network/calculations';
import type { ProjectMetrics, ResourceUsagePoint, ScheduledWorkItem, WorkItem } from '../../domain/network/types';
import { getPz2StageWorks, getPz2WorkKind, parsePz2Number } from './model';
import { PZ2_SHIFT_HOURS, pz2ConditionNorms, pz2WorkNorms } from './workNorms';
import type { Pz2MachineNorm, Pz2MaterialNorm, Pz2SubWorkNorm } from './workNorms';
import type { Pz2Draft, Pz2WorkDraft } from './types';

/**
 * Ресурсный план ПЗ2: сколько людей, сколько времени и что расходуется.
 *
 * Считает не этот файл: расписание, загрузку и метрики даёт движок из
 * domain/network — тот же, на котором работает тренажёр КСГ. Здесь только
 * перевод работ студента в его входные данные и обратно.
 */

/** Сколько единиц в работе: километров у линейных, штук у штучных. */
export function getPz2WorkUnits(work: Pz2WorkDraft): number {
  const measure = getPz2WorkKind(work.kind).measure;
  const value = parsePz2Number(measure === 'count' ? work.count : work.lengthKm);

  return value !== null && value > 0 ? value : 0;
}

/** Подработы работы вместе с теми, что добавляют условия грунта. */
export function getPz2SubWorks(work: Pz2WorkDraft): Pz2SubWorkNorm[] {
  return [
    ...pz2WorkNorms[work.kind].subWorks,
    ...work.conditions.flatMap((condition) => pz2ConditionNorms[condition].subWorks),
  ];
}

/**
 * Трудоёмкость работы, человеко-часы.
 *
 * Считается как сумма подработ на единицу, умноженная на длину или количество:
 * отчёт и график берут её из одного места и разойтись не могут.
 */
export function getPz2WorkLaborHours(work: Pz2WorkDraft): number {
  const perUnit = getPz2SubWorks(work).reduce((sum, subWork) => sum + subWork.laborHours, 0);

  return perUnit * getPz2WorkUnits(work);
}

/**
 * Длительность работы в днях.
 *
 * Люди делят работу: вдвое больше людей — вдвое короче срок. Меньше дня работа
 * длиться не может, дробные дни округляются вверх — смену не делят.
 */
export function getPz2WorkDurationDays(work: Pz2WorkDraft, workers: number): number {
  if (workers <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(getPz2WorkLaborHours(work) / (workers * PZ2_SHIFT_HOURS)));
}

export interface Pz2StageAllocation {
  stageId: string;
  workers: number;
}

/**
 * Работы этапов в виде задач для движка расписания.
 *
 * Внутри этапа работы идут одна за другой — это участок трассы, две работы на
 * нём одновременно не ведут. Этапы независимы и стартуют вместе: в этом и смысл
 * разбиения, участки строят параллельно.
 */
export function buildPz2WorkItems(draft: Pz2Draft, allocations: Pz2StageAllocation[]): WorkItem[] {
  const workersByStage = new Map(allocations.map((allocation) => [allocation.stageId, allocation.workers]));

  return draft.stages.flatMap((stage, stageIndex) => {
    const workers = Math.max(0, workersByStage.get(stage.id) ?? 0);
    const works = getPz2StageWorks(draft, stage.id);
    let previousId: string | null = null;

    return works.flatMap((work, workIndex) => {
      const duration = getPz2WorkDurationDays(work, workers);

      if (duration === 0) {
        return [];
      }

      const item: WorkItem = {
        id: work.id,
        code: `${stageIndex + 1}.${workIndex + 1}`,
        title: getPz2WorkKind(work.kind).label,
        from: previousId ?? `stage-${stage.id}-start`,
        to: work.id,
        duration,
        labor: Math.round(getPz2WorkLaborHours(work)),
        workers,
        dependencies: previousId ? [previousId] : [],
      };

      previousId = work.id;

      return [item];
    });
  });
}

export interface Pz2Plan {
  items: ScheduledWorkItem[];
  usage: ResourceUsagePoint[];
  metrics: ProjectMetrics;
  /** Сколько людей распределено по этапам — сумма по всем этапам. */
  assignedWorkers: number;
  /** Этапы, которым не назначили ни одного человека. */
  stagesWithoutWorkers: string[];
}

/**
 * План по текущему распределению людей.
 *
 * Предел ресурса — общее число рабочих на проект: движок по нему и считает
 * перегрузку и простой. Этап без людей в график не попадает — работать некому,
 * и молча ставить ему срок нельзя.
 */
export function getPz2Plan(draft: Pz2Draft, allocations: Pz2StageAllocation[], totalWorkers: number): Pz2Plan {
  const items = buildPz2WorkItems(draft, allocations);
  const schedule = calculateSchedule(items);
  const assignedWorkers = allocations.reduce((sum, allocation) => sum + Math.max(0, allocation.workers), 0);

  return {
    items: schedule.items,
    usage: calculateResourceUsage(schedule.items, totalWorkers),
    metrics: getProjectMetrics(schedule.items, totalWorkers),
    assignedWorkers,
    stagesWithoutWorkers: draft.stages
      .filter((stage) => {
        const workers = allocations.find((allocation) => allocation.stageId === stage.id)?.workers ?? 0;

        return workers <= 0 && getPz2StageWorks(draft, stage.id).length > 0;
      })
      .map((stage) => stage.id),
  };
}

/** Столбцов в гистограмме загрузки: больше на экране не различить. */
export const PZ2_LOAD_COLUMNS = 90;

export interface Pz2LoadColumn {
  /** Первый и последний день, попавшие в столбец. */
  fromDay: number;
  toDay: number;
  /** Пиковая потребность в людях за эти дни. */
  workers: number;
  overloaded: boolean;
}

/**
 * Загрузка, сведённая к столбцам постоянной ширины.
 *
 * По дню на столбец не годится: на проекте в тысячу дней столбец тоньше
 * пикселя, и гистограмма просто исчезает. Внутри столбца берём пик, а не
 * среднее: нехватка людей на два дня из десяти — это нехватка, и усреднение
 * прятало бы её.
 */
export function getPz2LoadColumns(usage: ResourceUsagePoint[], columns = PZ2_LOAD_COLUMNS): Pz2LoadColumn[] {
  if (usage.length === 0) {
    return [];
  }

  const size = Math.ceil(usage.length / columns);

  return Array.from({ length: Math.ceil(usage.length / size) }, (_, index) => {
    const slice = usage.slice(index * size, index * size + size);
    const peak = slice.reduce(
      (best, point) => (point.workers > best.workers ? point : best),
      slice[0],
    );

    return {
      fromDay: slice[0].day,
      toDay: slice[slice.length - 1].day,
      workers: peak.workers,
      overloaded: slice.some((point) => point.overloaded),
    };
  });
}

export interface Pz2ReportRow {
  title: string;
  unit: string;
  amount: number;
}

export interface Pz2Report {
  laborHours: number;
  machineHours: number;
  materials: Pz2ReportRow[];
  machines: Pz2ReportRow[];
  subWorks: Pz2ReportRow[];
}

/**
 * Отчёт по проекту: материалы, человеко-часы и машино-часы (ТЗ ПЗ2 §9).
 *
 * Одинаковые позиции складываются: студент видит расход по проекту, а не по
 * каждой строке таблицы работ.
 */
export function getPz2Report(draft: Pz2Draft): Pz2Report {
  const materials = new Map<string, Pz2ReportRow>();
  const machines = new Map<string, Pz2ReportRow>();
  const subWorks = new Map<string, Pz2ReportRow>();
  let laborHours = 0;
  let machineHours = 0;

  for (const work of draft.works) {
    const units = getPz2WorkUnits(work);

    if (units === 0) {
      continue;
    }

    const norms = [pz2WorkNorms[work.kind], ...work.conditions.map((condition) => pz2ConditionNorms[condition])];

    for (const norm of norms) {
      norm.subWorks.forEach((subWork: Pz2SubWorkNorm) => {
        laborHours += subWork.laborHours * units;
        addRow(subWorks, subWork.title, 'чел.-ч', subWork.laborHours * units);
      });

      norm.materials.forEach((material: Pz2MaterialNorm) => {
        addRow(materials, material.title, material.unit, material.perUnit * units);
      });

      norm.machines.forEach((machine: Pz2MachineNorm) => {
        machineHours += machine.machineHours * units;
        addRow(machines, machine.title, 'маш.-ч', machine.machineHours * units);
      });
    }
  }

  return {
    laborHours,
    machineHours,
    materials: sortRows(materials),
    machines: sortRows(machines),
    subWorks: sortRows(subWorks),
  };
}

function addRow(rows: Map<string, Pz2ReportRow>, title: string, unit: string, amount: number) {
  const existing = rows.get(title);

  if (existing) {
    existing.amount += amount;
    return;
  }

  rows.set(title, { title, unit, amount });
}

/** По убыванию расхода: крупные позиции первыми — их и обсуждают. */
function sortRows(rows: Map<string, Pz2ReportRow>): Pz2ReportRow[] {
  return [...rows.values()].sort((left, right) => right.amount - left.amount);
}
