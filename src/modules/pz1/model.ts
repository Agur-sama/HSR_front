import type {
  BridgeSchema,
  CorrespondenceTable,
  Passport,
  Pz1Result,
  Pz1Station,
  RouteLine,
  StationLabel,
  StationType,
  TransportModeId,
} from '../../bridge/schema';
import { createBridge } from '../../bridge/io';
import { computeRouteLineMetrics } from '../../shared/lib/routeGeometry';
import type { DataEntryColumn, DataEntryRow } from '../../shared/ui/DataEntryTable';
import type { Pz1CorrespondenceTableDraft, Pz1Draft, Pz1RoutePointDraft, Pz1StationDraft } from './types';

const STATION_LABELS: StationLabel[] = ['А', 'Б', 'В', 'Г'];
const TERMINAL_LABELS: StationLabel[] = ['А', 'Г'];
const PASSPORT_LIMITS = {
  team: { min: 2, max: 40 },
  lineTitle: { min: 3, max: 80 },
};

export const transportColumns: Array<DataEntryColumn & { id: TransportModeId }> = [
  { id: 'hSR', label: 'ВСМ' },
  { id: 'airplane', label: 'Самолёт' },
  { id: 'suburbanTrain', label: 'Пригородный поезд' },
  { id: 'longDistanceTrain', label: 'Поезд дальнего следования' },
  { id: 'bus', label: 'Автобус' },
  { id: 'car', label: 'Личный автомобиль' },
];
const ALL_TRANSPORT_MODE_IDS = transportColumns.map((column) => column.id);

export const consumerRows: DataEntryRow[] = [
  { id: 'travelTime', label: 'Время в пути', helper: 'ч' },
  { id: 'discomfort', label: 'Коэффициент дискомфорта', helper: 'индекс' },
  { id: 'dailyFrequency', label: 'Частота сообщения за сутки', helper: 'рейсов' },
  { id: 'fare', label: 'Средняя стоимость проезда', helper: 'руб.' },
];

export const finalIndicators = [
  { id: 'lineLength', label: 'Протяженность участка', hint: 'Справочный диапазон уточняется по методичке', unit: 'км' },
  { id: 'maxSpeed', label: 'Максимальная скорость', hint: 'Справочный диапазон уточняется по методичке', unit: 'км/ч' },
  { id: 'gauge', label: 'Ширина колеи', hint: 'Значение уточняется по методичке', unit: 'мм' },
  { id: 'stationCount', label: 'Количество станций', hint: 'Проверьте с трассировкой' },
  { id: 'travelTime', label: 'Время в пути ВСМ', hint: 'Справочный диапазон уточняется по методичке' },
  { id: 'annualFlow', label: 'Годовой пассажиропоток', hint: 'Формула уточняется по методичке' },
  { id: 'dailyTrains', label: 'Размеры движения N_сут', hint: 'Формула уточняется по методичке' },
  { id: 'maxCapacity', label: 'A_max', hint: 'Формула уточняется по методичке' },
  { id: 'rollingStockNeed', label: 'Потребный парк', hint: 'I_ВСМ, T_об и M уточняются по методичке' },
  { id: 'constructionCost', label: 'Затраты на строительство', hint: 'Диапазон цен уточняется по методичке' },
  { id: 'rollingStockCost', label: 'Затраты на подвижной состав', hint: 'Диапазон цен уточняется по методичке' },
  { id: 'ticketRevenue', label: 'Билетная выручка', hint: '0, 5, 10, 15, 20 годы' },
  { id: 'riskNotes', label: 'Ограничения и допущения', hint: 'Запишите, какие данные требуют уточнения' },
] as const;

export function createInitialPz1Draft(importedBridge?: BridgeSchema | null): Pz1Draft {
  const importedPz1 = importedBridge?.completed.pz1;
  const selectedVariantId = String(importedBridge?.passport.defaultVariant ?? importedPz1?.variantId ?? '1');
  const stationDrafts = createStationDrafts(importedPz1?.stations ?? []);

  return {
    passport: {
      team: importedBridge?.passport.team ?? '',
      lineTitle: importedBridge?.passport.lineTitle ?? '',
      createdAt: importedBridge?.passport.createdAt ?? new Date().toISOString(),
    },
    selectedVariantId,
    stationDrafts,
    routePointDrafts: createRoutePointDrafts(importedPz1?.routeLine),
    previewImage: importedPz1?.previewImage ?? '',
    correspondenceTables: syncCorrespondenceTables(
      {
        stationDrafts,
        correspondenceTables: mergeCorrespondenceTables(importedPz1?.consumerProperties),
      },
      stationDrafts,
    ),
    finalIndicators: mergeFinalIndicators(importedPz1?.finalIndicators),
    notes: importedPz1?.notes ?? '',
  };
}

export function createPz1Bridge(draft: Pz1Draft): BridgeSchema {
  return createBridge(createPassport(draft), {
    pz1: createPz1Result(draft),
  });
}

export function createPz1Result(draft: Pz1Draft): Pz1Result {
  const stations = draft.stationDrafts
    .filter((stationDraft) => stationDraft.enabled)
    .map(toStation)
    .filter((station): station is Pz1Station => station !== null);
  const routeLine = createRouteLine(draft.routePointDrafts);
  const metrics = computeRouteLineMetrics(routeLine);
  const correspondenceTables = getSyncedCorrespondenceTables(draft);

  return {
    stations,
    routeLine,
    totalLengthKm: metrics.totalLengthKm,
    previewImage: draft.previewImage || undefined,
    variantId: draft.selectedVariantId,
    consumerProperties: correspondenceTables.reduce<Record<string, CorrespondenceTable>>((tables, table) => {
      tables[table.pairKey] = {
        pairKey: table.pairKey,
        activeModes: table.activeModes,
        values: table.values,
      };
      return tables;
    }, {}),
    finalIndicators: draft.finalIndicators,
    notes: draft.notes,
  };
}

export function updateCellValue(
  values: Record<string, Record<string, string>>,
  rowId: string,
  columnId: string,
  value: string,
) {
  return {
    ...values,
    [rowId]: {
      ...(values[rowId] ?? {}),
      [columnId]: value,
    },
  };
}

export function sanitizeFileName(value: string, fallback: string) {
  const cleaned = value.trim().replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '');
  return cleaned || fallback;
}

export function createRouteLine(routePointDrafts: Pz1RoutePointDraft[]): RouteLine {
  const vertices = routePointDrafts
    .map(toRouteVertex)
    .filter((vertex): vertex is RouteLine['vertices'][number] => vertex !== null);

  return {
    vertices,
    segments: vertices.slice(0, -1).map((vertex, index) => ({
      id: `${vertex.id}-${vertices[index + 1].id}`,
      fromVertexId: vertex.id,
      toVertexId: vertices[index + 1].id,
      sagittaKm: parseCoordinate(routePointDrafts[index]?.sagittaToNextKm ?? '') ?? 0,
    })),
  };
}

export function getRouteMetrics(draft: Pz1Draft) {
  return computeRouteLineMetrics(createRouteLine(draft.routePointDrafts));
}

export function getSyncedCorrespondenceTables(draft: Pick<Pz1Draft, 'stationDrafts' | 'correspondenceTables'>) {
  return Object.values(syncCorrespondenceTables(draft, draft.stationDrafts));
}

export function syncCorrespondenceTables(
  draft: Pick<Pz1Draft, 'stationDrafts' | 'correspondenceTables'>,
  stationDrafts = draft.stationDrafts,
) {
  const enabledLabels = stationDrafts.filter((stationDraft) => stationDraft.enabled).map((stationDraft) => stationDraft.label);
  const tables: Record<string, Pz1CorrespondenceTableDraft> = {};

  for (let fromIndex = 0; fromIndex < enabledLabels.length; fromIndex += 1) {
    for (let toIndex = fromIndex + 1; toIndex < enabledLabels.length; toIndex += 1) {
      const fromLabel = enabledLabels[fromIndex];
      const toLabel = enabledLabels[toIndex];
      const pairKey = `${fromLabel}-${toLabel}`;
      const existingTable = draft.correspondenceTables[pairKey];
      tables[pairKey] = {
        pairKey,
        fromLabel,
        toLabel,
        activeModes: existingTable?.activeModes ?? [...ALL_TRANSPORT_MODE_IDS],
        values: mergeConsumerValues(existingTable?.values),
      };
    }
  }

  return tables;
}

export function countFilledConsumerCells(draft: Pz1Draft) {
  return getSyncedCorrespondenceTables(draft)
    .flatMap((table) => consumerRows.flatMap((row) => table.activeModes.map((modeId) => table.values[row.id]?.[modeId] ?? '')))
    .filter((value) => value.trim().length > 0).length;
}

export function getPz1TaskStepCount(draft: Pz1Draft) {
  const correspondenceCount = getSyncedCorrespondenceTables(draft).length;
  return 3 + 2 * correspondenceCount;
}

export function isPassportComplete(draft: Pz1Draft) {
  return (
    isLengthInRange(draft.passport.team, PASSPORT_LIMITS.team.min, PASSPORT_LIMITS.team.max) &&
    isLengthInRange(draft.passport.lineTitle, PASSPORT_LIMITS.lineTitle.min, PASSPORT_LIMITS.lineTitle.max) &&
    isVariantInRange(draft.selectedVariantId)
  );
}

export function validateConsumerCell(rowId: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Заполните это поле, чтобы продолжить';
  }

  const parsed = parseCoordinate(trimmed);
  if (parsed === null) {
    return 'Значение должно быть числом';
  }

  if (parsed < 0) {
    return 'Значение не может быть отрицательным';
  }

  if (rowId === 'discomfort' && parsed > 1) {
    return 'Коэффициент дискомфорта — это индекс от 0 до 1';
  }

  if ((rowId === 'travelTime' || rowId === 'fare') && parsed <= 0) {
    return 'Значение должно быть больше 0';
  }

  if (rowId === 'travelTime' && parsed > 48) {
    return 'Время в пути должно быть не больше 48 ч';
  }

  if (rowId === 'dailyFrequency' && !Number.isInteger(parsed)) {
    return 'Частота сообщения за сутки должна быть целым числом';
  }

  return null;
}

export function isConsumerPropertiesComplete(draft: Pz1Draft) {
  return getSyncedCorrespondenceTables(draft).every((table) =>
    consumerRows.every((row) =>
      table.activeModes.every((modeId) => validateConsumerCell(row.id, table.values[row.id]?.[modeId] ?? '') === null),
    ),
  );
}

export function isFinalIndicatorsComplete(draft: Pz1Draft) {
  return finalIndicators.every((indicator) => {
    if (indicator.id === 'lineLength') {
      return getRouteMetrics(draft).totalLengthKm > 0;
    }

    const value = draft.finalIndicators[indicator.id] ?? '';
    if (indicator.id === 'riskNotes') {
      return value.trim().length > 0;
    }

    const parsed = parseCoordinate(value);
    return value.trim().length > 0 && parsed !== null && parsed > 0;
  });
}

export function isStationsStepComplete(draft: Pz1Draft) {
  const enabledStations = draft.stationDrafts.filter((stationDraft) => stationDraft.enabled);
  const routeLine = createRouteLine(draft.routePointDrafts);

  return (
    TERMINAL_LABELS.every((label) => enabledStations.some((stationDraft) => stationDraft.label === label)) &&
    enabledStations.every(isStationDraftComplete) &&
    routeLine.vertices.length >= 2
  );
}

function createPassport(draft: Pz1Draft): Passport {
  const parsedVariant = Number(draft.selectedVariantId);

  return {
    team: draft.passport.team,
    lineTitle: draft.passport.lineTitle,
    defaultVariant: Number.isInteger(parsedVariant) ? parsedVariant : undefined,
    createdAt: draft.passport.createdAt,
  };
}

function createStationDrafts(stations: Pz1Station[]): Pz1StationDraft[] {
  return STATION_LABELS.map((label) => {
    const importedStation = stations.find((station) => station.label === label);
    const type = getStationType(label);

    return {
      label,
      enabled: TERMINAL_LABELS.includes(label) || importedStation !== undefined,
      name: importedStation?.name ?? '',
      lat: importedStation ? String(importedStation.lat) : '',
      lng: importedStation ? String(importedStation.lng) : '',
      type,
    };
  });
}

function createRoutePointDrafts(routeLine: Pz1Result['routeLine'] | Array<[number, number]> | undefined): Pz1RoutePointDraft[] {
  if (!routeLine) {
    return [];
  }

  if (Array.isArray(routeLine)) {
    return routeLine.map(([lng, lat], index) => ({
      id: `route-point-${index}`,
      lat: String(lat),
      lng: String(lng),
      sagittaToNextKm: '0',
    }));
  }

  const segmentByVertexId = new Map(routeLine.segments.map((segment) => [segment.fromVertexId, segment]));

  return routeLine.vertices.map((vertex) => ({
    id: vertex.id,
    lat: String(vertex.lat),
    lng: String(vertex.lon),
    sagittaToNextKm: String(segmentByVertexId.get(vertex.id)?.sagittaKm ?? 0),
  }));
}

function mergeCorrespondenceTables(importedValues: Pz1Result['consumerProperties']) {
  if (!importedValues) {
    return {};
  }

  return Object.entries(importedValues).reduce<Record<string, Pz1CorrespondenceTableDraft>>((tables, [pairKey, table]) => {
    const [fromLabel = 'А', toLabel = 'Г'] = pairKey.split('-') as StationLabel[];
    tables[pairKey] = {
      pairKey,
      fromLabel,
      toLabel,
      activeModes: table.activeModes.length > 0 ? table.activeModes : [...ALL_TRANSPORT_MODE_IDS],
      values: mergeConsumerValues(table.values),
    };
    return tables;
  }, {});
}

function mergeConsumerValues(importedValues?: Record<string, Record<string, string>>) {
  const values = createEmptyConsumerValues();

  for (const row of consumerRows) {
    for (const column of transportColumns) {
      values[row.id][column.id] = importedValues?.[row.id]?.[column.id] ?? '';
    }
  }

  return values;
}

function createEmptyConsumerValues() {
  return consumerRows.reduce<Record<string, Record<string, string>>>((rowMap, row) => {
    rowMap[row.id] = transportColumns.reduce<Record<string, string>>((columnMap, column) => {
      columnMap[column.id] = '';
      return columnMap;
    }, {});
    return rowMap;
  }, {});
}

function mergeFinalIndicators(importedValues: Pz1Result['finalIndicators']) {
  return finalIndicators.reduce<Record<string, string>>((values, indicator) => {
    values[indicator.id] = importedValues?.[indicator.id] ?? '';
    return values;
  }, {});
}

function toStation(stationDraft: Pz1StationDraft): Pz1Station | null {
  const lat = parseCoordinate(stationDraft.lat);
  const lng = parseCoordinate(stationDraft.lng);
  const name = stationDraft.name.trim();

  if (!name || lat === null || lng === null) {
    return null;
  }

  return {
    label: stationDraft.label,
    name,
    lat,
    lng,
    type: stationDraft.type,
  };
}

function toRouteVertex(routePointDraft: Pz1RoutePointDraft): RouteLine['vertices'][number] | null {
  const lat = parseCoordinate(routePointDraft.lat);
  const lng = parseCoordinate(routePointDraft.lng);

  if (lat === null || lng === null) {
    return null;
  }

  return {
    id: routePointDraft.id,
    lat,
    lon: lng,
  };
}

function parseCoordinate(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function getStationType(label: StationLabel): StationType {
  return TERMINAL_LABELS.includes(label) ? 'terminal' : 'intermediate';
}

function isStationDraftComplete(stationDraft: Pz1StationDraft) {
  return (
    stationDraft.name.trim().length > 0 &&
    parseCoordinate(stationDraft.lat) !== null &&
    parseCoordinate(stationDraft.lng) !== null
  );
}

function isLengthInRange(value: string, min: number, max: number) {
  const length = value.trim().length;
  return length >= min && length <= max;
}

function isVariantInRange(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 6;
}
