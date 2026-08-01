import type {
  BridgeSchema,
  CorrespondenceTable,
  Passport,
  Pz1DiscomfortMatrix,
  Pz1PassengerFlowInputs,
  Pz1PassengerFlowModeInputs,
  Pz1PassengerFlowRegionalInputs,
  Pz1PassengerFlowResult,
  Pz1Result,
  Pz1Station,
  RouteLine,
  StationLabel,
  StationType,
  TransportModeId,
} from '../../bridge/schema';
import { createBridge } from '../../bridge/io';
import { distributePassengerFlowByMode, forecastTotalDemand } from '../../shared/lib/passengerFlow';
import type { PassengerFlowModeInput, TotalDemandForecastInput } from '../../shared/lib/passengerFlow';
import { passengerFlowModeIds } from '../../shared/lib/passengerFlowWeights';
import { buildDisplayRoutePoints, computeRouteLineMetrics, haversineDistanceKm } from '../../shared/lib/routeGeometry';
import type { DataEntryColumn, DataEntryRow } from '../../shared/ui/DataEntryTable';
import type { Pz1CorrespondenceTableDraft, Pz1Draft, Pz1RoutePointDraft, Pz1StationDraft } from './types';

const STATION_LABELS: StationLabel[] = ['А', 'Б', 'В', 'Г'];
const TERMINAL_LABELS: StationLabel[] = ['А', 'Г'];
const HSR_MODE_ID: TransportModeId = 'hSR';
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
  { id: 'dailyFrequency', label: 'Частота сообщения за сутки', helper: 'рейсов' },
  { id: 'fare', label: 'Средняя стоимость проезда', helper: 'руб.' },
];

export const discomfortRows: DataEntryRow[] = [
  { id: 'passengerDensity', label: 'Индекс плотности пассажиров в салоне' },
  { id: 'noiseVibrationTransfers', label: 'Индекс уровня шума, вибрация, плавности хода, пересадки' },
  { id: 'climateControl', label: 'Индекс качества работы климат-контроля, наличие неприятных запахов и пр.' },
  { id: 'additionalServices', label: 'Индекс объёма и качества дополнительных услуг, оказываемых пассажиру' },
  {
    id: 'technicalSafety',
    label: 'Индекс технической безопасности транспортного средства (индекс аварийности), предсказуемость в пути',
  },
  { id: 'personalSafety', label: 'Индекс личной безопасности (охрана, безопасность, вероятность кражи)' },
  { id: 'seatAvailability', label: 'Наличие свободных мест' },
  { id: 'ticketPurchaseComplexity', label: 'Сложность приобретения билета' },
  { id: 'comfortElasticity', label: 'Коэффициент эластичности к уровню комфорта' },
];

export interface StationRouteDistance {
  fromLabel: StationLabel;
  toLabel: StationLabel;
  distanceKm: number;
}

export const finalIndicators = [
  { id: 'lineLength', label: 'Протяженность участка', hint: 'Справочный диапазон уточняется по методичке', unit: 'км' },
  { id: 'maxSpeed', label: 'Максимальная скорость', hint: 'Справочный диапазон уточняется по методичке', unit: 'км/ч' },
  { id: 'gauge', label: 'Ширина колеи', hint: 'Значение уточняется по методичке', unit: 'мм' },
  { id: 'stationCount', label: 'Количество станций', hint: 'Проверьте с трассировкой' },
  { id: 'travelTime', label: 'Время в пути ВСМ', hint: 'Справочный диапазон уточняется по методичке' },
  { id: 'annualFlow', label: 'Годовой пассажиропоток', hint: 'Рассчитывается автоматически на шаге прогноза пассажиропотока' },
  { id: 'dailyTrains', label: 'Размеры движения N_сут', hint: 'Формула уточняется по методичке' },
  { id: 'maxCapacity', label: 'A_max', hint: 'Формула уточняется по методичке' },
  { id: 'rollingStockNeed', label: 'Потребный парк', hint: 'I_ВСМ, T_об и M уточняются по методичке' },
  { id: 'constructionCost', label: 'Затраты на строительство', hint: 'Диапазон цен уточняется по методичке' },
  { id: 'rollingStockCost', label: 'Затраты на подвижной состав', hint: 'Диапазон цен уточняется по методичке' },
  { id: 'ticketRevenue', label: 'Билетная выручка', hint: '0, 5, 10, 15, 20 годы' },
  { id: 'riskNotes', label: 'Ограничения и допущения', hint: 'Запишите, какие данные требуют уточнения' },
] as const;

export const passengerFlowRegionalFields: Array<{
  id: keyof Pz1PassengerFlowRegionalInputs;
  label: string;
  hint: string;
}> = [
  { id: 'grpCurrentRegionA', label: 'ВРП региона A', hint: 'Текущее значение, Росстат' },
  { id: 'grpCurrentRegionB', label: 'ВРП региона B', hint: 'Текущее значение, Росстат' },
  { id: 'grpGrowthPctRegionA', label: 'Рост ВРП региона A', hint: 'Доля: 0,12 = 12%' },
  { id: 'grpGrowthPctRegionB', label: 'Рост ВРП региона B', hint: 'Доля: 0,12 = 12%' },
  { id: 'populationCurrentRegionA', label: 'Население региона A', hint: 'Текущее значение, человек' },
  { id: 'populationCurrentRegionB', label: 'Население региона B', hint: 'Текущее значение, человек' },
  { id: 'populationGrowthPctRegionA', label: 'Рост населения региона A', hint: 'Доля: 0,01 = 1%' },
  { id: 'populationGrowthPctRegionB', label: 'Рост населения региона B', hint: 'Доля: 0,01 = 1%' },
  { id: 'gdpPassengerFlowCoefficientRegionA', label: 'Коэф. ВРП-потока A', hint: 'Из варианта задания' },
  { id: 'gdpPassengerFlowCoefficientRegionB', label: 'Коэф. ВРП-потока B', hint: 'Из варианта задания' },
  { id: 'inducedDemandPct', label: 'Индуцированный спрос', hint: 'Доля: 0,35 = 35%' },
];

export const passengerFlowModeRows: Array<DataEntryRow & { id: keyof Pz1PassengerFlowModeInputs }> = [
  { id: 'existingAnnualFlow', label: 'Существующий поток', helper: 'пасс./год' },
  { id: 'travelTimeHours', label: 'Время в пути в модели', helper: 'ч' },
  { id: 'waitingTimeHours', label: 'Время ожидания', helper: 'ч' },
  { id: 'totalTransportCost', label: 'TTC', helper: 'руб.' },
  { id: 'existingTravelTimeHours', label: 'Существующее время в пути', helper: 'ч' },
];

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
    discomfortMatrix: mergeDiscomfortMatrix(importedPz1?.discomfortMatrix),
    passengerFlowForecast: mergePassengerFlowForecast(importedPz1?.passengerFlowForecast?.inputs),
    finalIndicators: mergeFinalIndicators(importedPz1?.finalIndicators),
    notes: importedPz1?.notes ?? '',
  };
}

export function createPz1Bridge(draft: Pz1Draft): BridgeSchema {
  return createBridge(
    createPassport(draft),
    {
      pz1: createPz1Result(draft),
    },
    {
      pz1: {
        stations: isStationsStepComplete(draft),
        consumerProperties: isConsumerPropertiesComplete(draft),
        passengerFlowForecast: isPassengerFlowForecastComplete(draft),
        finalIndicators: isFinalIndicatorsComplete(draft),
      },
    },
  );
}

export function createPz1Result(draft: Pz1Draft): Pz1Result {
  const stations = draft.stationDrafts
    .filter((stationDraft) => stationDraft.enabled)
    .map(toStation)
    .filter((station): station is Pz1Station => station !== null);
  const routeLine = createRouteLine(draft.routePointDrafts);
  const metrics = computeRouteLineMetrics(routeLine);
  const correspondenceTables = getSyncedCorrespondenceTables(draft);
  const passengerFlowForecast = getPz1PassengerFlowForecast(draft);

  return {
    stations,
    routeLine,
    totalLengthKm: metrics.totalLengthKm,
    previewImage: draft.previewImage || undefined,
    variantId: draft.selectedVariantId,
    consumerProperties: correspondenceTables.reduce<Record<string, CorrespondenceTable>>((tables, table) => {
      tables[table.pairKey] = {
        pairKey: table.pairKey,
        activeModes: normalizeActiveTransportModes(table.activeModes),
        values: table.values,
      };
      return tables;
    }, {}),
    discomfortMatrix: cloneDiscomfortMatrix(draft.discomfortMatrix),
    passengerFlowForecast: passengerFlowForecast ?? undefined,
    finalIndicators: getComputedFinalIndicators(draft),
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
  const validRoutePoints = routePointDrafts
    .map((draft) => ({ draft, vertex: toRouteVertex(draft) }))
    .filter((point): point is { draft: Pz1RoutePointDraft; vertex: RouteLine['vertices'][number] } => point.vertex !== null);
  const vertices = validRoutePoints.map((point) => point.vertex);

  return {
    vertices,
    segments: validRoutePoints.slice(0, -1).map(({ draft, vertex }, index) => ({
      id: `${vertex.id}-${vertices[index + 1].id}`,
      fromVertexId: vertex.id,
      toVertexId: vertices[index + 1].id,
      sagittaKm: parseCoordinate(draft.sagittaToNextKm) ?? 0,
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
        activeModes: normalizeActiveTransportModes(existingTable?.activeModes ?? [...ALL_TRANSPORT_MODE_IDS]),
        values: mergeConsumerValues(existingTable?.values),
      };
    }
  }

  return tables;
}

export function countFilledConsumerCells(draft: Pz1Draft) {
  const correspondenceCellCount = getSyncedCorrespondenceTables(draft)
    .flatMap((table) => consumerRows.flatMap((row) => table.activeModes.map((modeId) => table.values[row.id]?.[modeId] ?? '')))
    .filter((value) => value.trim().length > 0).length;

  return correspondenceCellCount + countFilledDiscomfortCells(draft.discomfortMatrix);
}

export function getPz1PassengerFlowForecast(draft: Pz1Draft): Pz1PassengerFlowResult | null {
  const regionalInput = parseRegionalPassengerFlowInput(draft.passengerFlowForecast.regional);
  const modeInputs = passengerFlowModeIds.reduce<PassengerFlowModeInput[] | null>((modes, modeId) => {
    if (modes === null) {
      return null;
    }

    const mode = draft.passengerFlowForecast.modes[modeId];
    const existingAnnualFlow = parseNumericInput(mode.existingAnnualFlow);
    const travelTimeHours = parseNumericInput(mode.travelTimeHours);
    const waitingTimeHours = parseNumericInput(mode.waitingTimeHours);
    const totalTransportCost = parseNumericInput(mode.totalTransportCost);
    const existingTravelTimeHours = parseNumericInput(mode.existingTravelTimeHours);

    if (
      existingAnnualFlow === null ||
      travelTimeHours === null ||
      waitingTimeHours === null ||
      totalTransportCost === null ||
      existingTravelTimeHours === null
    ) {
      return null;
    }

    modes.push({
      modeId,
      existingAnnualFlow,
      travelTimeHours,
      waitingTimeHours,
      totalTransportCost,
      existingTravelTimeHours,
    });

    return modes;
  }, []);

  if (!regionalInput || !modeInputs) {
    return null;
  }

  const existingAnnualFlow = modeInputs.reduce((sum, mode) => sum + mode.existingAnnualFlow, 0);

  if (existingAnnualFlow <= 0) {
    return null;
  }

  try {
    const totalDemand = forecastTotalDemand({
      existingAnnualFlow,
      ...regionalInput,
    });
    const distribution = distributePassengerFlowByMode({
      existingAnnualFlow,
      baseForecast: totalDemand.baseForecast,
      inducedDemand: totalDemand.inducedDemand,
      modes: modeInputs,
    });

    return {
      inputs: clonePassengerFlowInputs(draft.passengerFlowForecast),
      totalDemand: {
        existingAnnualFlow,
        baseForecast: totalDemand.baseForecast,
        inducedDemand: totalDemand.inducedDemand,
        totalForecast: totalDemand.totalForecast,
        grpDelta: totalDemand.grpDelta,
        populationDelta: totalDemand.populationDelta,
        weightedGdpPassengerFlowCoefficient: totalDemand.weightedGdpPassengerFlowCoefficient,
      },
      modes: distribution.modes.map((mode) => ({
        modeId: mode.modeId,
        existingAnnualFlow: mode.existingAnnualFlow,
        forecastAnnualFlow: mode.forecastAnnualFlow,
        forecastShare: mode.forecastShare,
        directCapture: mode.directCapture,
        gravityCapture: mode.gravityCapture,
        inducedCapture: mode.inducedCapture,
      })),
    };
  } catch {
    return null;
  }
}

export function getComputedFinalIndicators(draft: Pz1Draft): Record<string, string> {
  const passengerFlowForecast = getPz1PassengerFlowForecast(draft);

  return {
    ...draft.finalIndicators,
    annualFlow: passengerFlowForecast ? formatInteger(passengerFlowForecast.totalDemand.totalForecast) : '',
  };
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

export function validateDiscomfortCell(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Заполните это поле, чтобы продолжить';
  }

  const parsed = parseCoordinate(trimmed);
  if (parsed === null) {
    return 'Значение должно быть числом';
  }

  if (parsed < 0 || parsed > 1) {
    return 'Значение должно быть в диапазоне от 0 до 1';
  }

  return null;
}

export function isConsumerPropertiesComplete(draft: Pz1Draft) {
  const correspondenceTablesComplete = getSyncedCorrespondenceTables(draft).every((table) =>
    consumerRows.every((row) =>
      table.activeModes.every((modeId) => validateConsumerCell(row.id, table.values[row.id]?.[modeId] ?? '') === null),
    ),
  );

  return correspondenceTablesComplete && isDiscomfortMatrixComplete(draft.discomfortMatrix);
}

export function isFinalIndicatorsComplete(draft: Pz1Draft) {
  return finalIndicators.every((indicator) => {
    if (indicator.id === 'lineLength') {
      return getRouteMetrics(draft).totalLengthKm > 0;
    }

    if (indicator.id === 'annualFlow') {
      return getPz1PassengerFlowForecast(draft) !== null;
    }

    const value = draft.finalIndicators[indicator.id] ?? '';
    if (indicator.id === 'riskNotes') {
      return value.trim().length > 0;
    }

    const parsed = parseCoordinate(value);
    return value.trim().length > 0 && parsed !== null && parsed > 0;
  });
}

export function isPassengerFlowForecastComplete(draft: Pz1Draft) {
  return getPz1PassengerFlowForecast(draft) !== null;
}

export function isStationsStepComplete(draft: Pz1Draft) {
  const enabledStations = draft.stationDrafts.filter((stationDraft) => stationDraft.enabled);
  const routeLine = createRouteLine(draft.routePointDrafts);
  const duplicateStationNames = getDuplicateStationNames(draft);

  return (
    TERMINAL_LABELS.every((label) => enabledStations.some((stationDraft) => stationDraft.label === label)) &&
    enabledStations.every((stationDraft) => isStationDraftComplete(stationDraft, duplicateStationNames)) &&
    routeLine.vertices.length >= 2
  );
}

export function isTransportModeRemovable(modeId: TransportModeId) {
  return modeId !== HSR_MODE_ID;
}

export function getDuplicateStationNames(draft: Pick<Pz1Draft, 'stationDrafts'>) {
  const counts = new Map<string, number>();

  for (const station of draft.stationDrafts) {
    if (!station.enabled) {
      continue;
    }

    const nameKey = normalizeStationName(station.name);
    if (!nameKey) {
      continue;
    }

    counts.set(nameKey, (counts.get(nameKey) ?? 0) + 1);
  }

  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name));
}

export function validateStationField(
  stationDraft: Pz1StationDraft,
  field: 'name' | 'lat' | 'lng',
  duplicateStationNames = new Set<string>(),
) {
  if (!stationDraft.enabled) {
    return null;
  }

  if (field === 'name') {
    if (!stationDraft.name.trim()) {
      return 'Укажите название станции';
    }

    if (duplicateStationNames.has(normalizeStationName(stationDraft.name))) {
      return 'Название станции должно быть уникальным';
    }

    return null;
  }

  if (field === 'lat') {
    return validateCoordinateField(stationDraft.lat, -90, 90, 'Широта');
  }

  return validateCoordinateField(stationDraft.lng, -180, 180, 'Долгота');
}

export function getStationRouteDistances(draft: Pz1Draft): StationRouteDistance[] {
  const routeLine = createRouteLine(draft.routePointDrafts);
  const routePoints = buildDisplayRoutePoints(routeLine, 48);
  if (routePoints.length < 2) {
    return [];
  }

  const cumulativeDistances = routePoints.reduce<number[]>((distances, point, index) => {
    if (index === 0) {
      distances.push(0);
      return distances;
    }

    distances.push(distances[index - 1] + haversineDistanceKm(routePoints[index - 1], point));
    return distances;
  }, []);
  const stationsOnRoute = draft.stationDrafts
    .filter((stationDraft) => stationDraft.enabled)
    .map(toStation)
    .filter((station): station is Pz1Station => station !== null)
    .map((station) => ({
      label: station.label,
      distanceFromStartKm: cumulativeDistances[getNearestRoutePointIndex({ lon: station.lng, lat: station.lat }, routePoints)],
    }))
    .sort((left, right) => left.distanceFromStartKm - right.distanceFromStartKm);

  return stationsOnRoute.slice(0, -1).map((station, index) => ({
    fromLabel: station.label,
    toLabel: stationsOnRoute[index + 1].label,
    distanceKm: Math.max(0, stationsOnRoute[index + 1].distanceFromStartKm - station.distanceFromStartKm),
  }));
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
      activeModes: normalizeActiveTransportModes(table.activeModes.length > 0 ? table.activeModes : [...ALL_TRANSPORT_MODE_IDS]),
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

function mergePassengerFlowForecast(importedValues?: Pz1PassengerFlowInputs) {
  const regional = passengerFlowRegionalFields.reduce<Pz1PassengerFlowRegionalInputs>((values, field) => {
    values[field.id] = importedValues?.regional?.[field.id] ?? '';
    return values;
  }, createEmptyRegionalPassengerFlowInputs());

  const modes = passengerFlowModeIds.reduce<Record<TransportModeId, Pz1PassengerFlowModeInputs>>((modeMap, modeId) => {
    const importedMode = importedValues?.modes?.[modeId];
    modeMap[modeId] = passengerFlowModeRows.reduce<Pz1PassengerFlowModeInputs>((values, row) => {
      values[row.id] = importedMode?.[row.id] ?? '';
      return values;
    }, createEmptyModePassengerFlowInputs());
    return modeMap;
  }, {} as Record<TransportModeId, Pz1PassengerFlowModeInputs>);

  return {
    regional,
    modes,
  };
}

function createEmptyRegionalPassengerFlowInputs(): Pz1PassengerFlowRegionalInputs {
  return {
    grpCurrentRegionA: '',
    grpCurrentRegionB: '',
    grpGrowthPctRegionA: '',
    grpGrowthPctRegionB: '',
    populationCurrentRegionA: '',
    populationCurrentRegionB: '',
    populationGrowthPctRegionA: '',
    populationGrowthPctRegionB: '',
    gdpPassengerFlowCoefficientRegionA: '',
    gdpPassengerFlowCoefficientRegionB: '',
    inducedDemandPct: '',
  };
}

function createEmptyModePassengerFlowInputs(): Pz1PassengerFlowModeInputs {
  return {
    existingAnnualFlow: '',
    travelTimeHours: '',
    waitingTimeHours: '',
    totalTransportCost: '',
    existingTravelTimeHours: '',
  };
}

function clonePassengerFlowInputs(input: Pz1Draft['passengerFlowForecast']): Pz1PassengerFlowInputs {
  return {
    regional: { ...input.regional },
    modes: passengerFlowModeIds.reduce<Record<TransportModeId, Pz1PassengerFlowModeInputs>>((modeMap, modeId) => {
      modeMap[modeId] = { ...input.modes[modeId] };
      return modeMap;
    }, {} as Record<TransportModeId, Pz1PassengerFlowModeInputs>),
  };
}

function cloneDiscomfortMatrix(matrix: Pz1DiscomfortMatrix): Pz1DiscomfortMatrix {
  return {
    values: discomfortRows.reduce<Record<string, Record<TransportModeId, string>>>((rowMap, row) => {
      rowMap[row.id] = transportColumns.reduce<Record<TransportModeId, string>>(
        (columnMap, column) => {
          columnMap[column.id] = matrix.values[row.id]?.[column.id] ?? '';
          return columnMap;
        },
        {} as Record<TransportModeId, string>,
      );
      return rowMap;
    }, {}),
  };
}

function mergeDiscomfortMatrix(importedMatrix?: Pz1Result['discomfortMatrix']): Pz1DiscomfortMatrix {
  return {
    values: discomfortRows.reduce<Record<string, Record<TransportModeId, string>>>((rowMap, row) => {
      rowMap[row.id] = transportColumns.reduce<Record<TransportModeId, string>>(
        (columnMap, column) => {
          columnMap[column.id] = importedMatrix?.values?.[row.id]?.[column.id] ?? '';
          return columnMap;
        },
        {} as Record<TransportModeId, string>,
      );
      return rowMap;
    }, {}),
  };
}

function countFilledDiscomfortCells(matrix: Pz1DiscomfortMatrix) {
  return discomfortRows
    .flatMap((row) => transportColumns.map((column) => matrix.values[row.id]?.[column.id] ?? ''))
    .filter((value) => value.trim().length > 0).length;
}

function isDiscomfortMatrixComplete(matrix: Pz1DiscomfortMatrix) {
  return discomfortRows.every((row) =>
    transportColumns.every((column) => validateDiscomfortCell(matrix.values[row.id]?.[column.id] ?? '') === null),
  );
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
    values[indicator.id] = indicator.id === 'annualFlow' ? '' : importedValues?.[indicator.id] ?? '';
    return values;
  }, {});
}

function parseRegionalPassengerFlowInput(
  input: Pz1PassengerFlowRegionalInputs,
): Omit<TotalDemandForecastInput, 'existingAnnualFlow'> | null {
  const grpCurrentRegionA = parseNumericInput(input.grpCurrentRegionA);
  const grpCurrentRegionB = parseNumericInput(input.grpCurrentRegionB);
  const grpGrowthPctRegionA = parseNumericInput(input.grpGrowthPctRegionA);
  const grpGrowthPctRegionB = parseNumericInput(input.grpGrowthPctRegionB);
  const populationCurrentRegionA = parseNumericInput(input.populationCurrentRegionA);
  const populationCurrentRegionB = parseNumericInput(input.populationCurrentRegionB);
  const populationGrowthPctRegionA = parseNumericInput(input.populationGrowthPctRegionA);
  const populationGrowthPctRegionB = parseNumericInput(input.populationGrowthPctRegionB);
  const gdpPassengerFlowCoefficientRegionA = parseNumericInput(input.gdpPassengerFlowCoefficientRegionA);
  const gdpPassengerFlowCoefficientRegionB = parseNumericInput(input.gdpPassengerFlowCoefficientRegionB);
  const inducedDemandPct = parseNumericInput(input.inducedDemandPct);

  if (
    grpCurrentRegionA === null ||
    grpCurrentRegionB === null ||
    grpGrowthPctRegionA === null ||
    grpGrowthPctRegionB === null ||
    populationCurrentRegionA === null ||
    populationCurrentRegionB === null ||
    populationGrowthPctRegionA === null ||
    populationGrowthPctRegionB === null ||
    gdpPassengerFlowCoefficientRegionA === null ||
    gdpPassengerFlowCoefficientRegionB === null ||
    inducedDemandPct === null
  ) {
    return null;
  }

  return {
    grpCurrentRegionA,
    grpCurrentRegionB,
    grpGrowthPctRegionA,
    grpGrowthPctRegionB,
    populationCurrentRegionA,
    populationCurrentRegionB,
    populationGrowthPctRegionA,
    populationGrowthPctRegionB,
    gdpPassengerFlowCoefficientRegionA,
    gdpPassengerFlowCoefficientRegionB,
    inducedDemandPct,
  };
}

function toStation(stationDraft: Pz1StationDraft): Pz1Station | null {
  const lat = parseLatitude(stationDraft.lat);
  const lng = parseLongitude(stationDraft.lng);
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
  const lat = parseLatitude(routePointDraft.lat);
  const lng = parseLongitude(routePointDraft.lng);

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

function parseLatitude(value: string) {
  const parsed = parseCoordinate(value);
  return parsed !== null && parsed >= -90 && parsed <= 90 ? parsed : null;
}

function parseLongitude(value: string) {
  const parsed = parseCoordinate(value);
  return parsed !== null && parsed >= -180 && parsed <= 180 ? parsed : null;
}

function parseNumericInput(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatInteger(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
}

function getStationType(label: StationLabel): StationType {
  return TERMINAL_LABELS.includes(label) ? 'terminal' : 'intermediate';
}

function isStationDraftComplete(stationDraft: Pz1StationDraft, duplicateStationNames = new Set<string>()) {
  return (
    validateStationField(stationDraft, 'name', duplicateStationNames) === null &&
    validateStationField(stationDraft, 'lat') === null &&
    validateStationField(stationDraft, 'lng') === null
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

function normalizeActiveTransportModes(modeIds: TransportModeId[]) {
  const requestedModes = new Set(modeIds.filter((modeId) => ALL_TRANSPORT_MODE_IDS.includes(modeId)));
  requestedModes.add(HSR_MODE_ID);

  return transportColumns.filter((column) => requestedModes.has(column.id)).map((column) => column.id);
}

function validateCoordinateField(value: string, min: number, max: number, label: string) {
  if (!value.trim()) {
    return `${label}: заполните координату`;
  }

  const parsed = parseCoordinate(value);
  if (parsed === null) {
    return `${label}: значение должно быть числом`;
  }

  if (parsed < min || parsed > max) {
    return `${label}: допустимый диапазон ${min}…${max}`;
  }

  return null;
}

function normalizeStationName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru-RU');
}

function getNearestRoutePointIndex(point: { lon: number; lat: number }, routePoints: Array<{ lon: number; lat: number }>) {
  return routePoints.reduce(
    (nearest, routePoint, index) => {
      const distanceKm = haversineDistanceKm(point, routePoint);
      return distanceKm < nearest.distanceKm ? { index, distanceKm } : nearest;
    },
    { index: 0, distanceKm: Number.POSITIVE_INFINITY },
  ).index;
}
