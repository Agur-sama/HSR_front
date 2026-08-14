import { describe, expect, it } from 'vitest';
import {
  createInitialPz1Draft,
  createPz1Result,
  getComputedFinalIndicators,
  getHsrTravelTimeResult,
  getPz1PassengerFlowForecast,
  getStationRouteDistances,
  getSyncedCorrespondenceTables,
  isStationsStepComplete,
  updateCellValue,
  validateConsumerCell,
  validateDiscomfortCell,
} from './model';

describe('pz1 model', () => {
  it('keeps routeLine independent from enabled station drafts', () => {
    const draft = createInitialPz1Draft();
    draft.stationDrafts[0] = { ...draft.stationDrafts[0], name: 'Москва', lat: '55.7558', lng: '37.6173' };
    draft.stationDrafts[3] = { ...draft.stationDrafts[3], name: 'Санкт-Петербург', lat: '59.9343', lng: '30.3351' };
    draft.routePointDrafts = [
      { id: 'route-point-1', lat: '55.7558', lng: '37.6173', sagittaToNextKm: '0' },
      { id: 'route-point-2', lat: '57.0000', lng: '34.0000', sagittaToNextKm: '20' },
      { id: 'route-point-3', lat: '59.9343', lng: '30.3351', sagittaToNextKm: '0' },
    ];

    const result = createPz1Result(draft);

    expect(result.stations).toHaveLength(2);
    expect(result.routeLine.vertices.map((vertex) => [vertex.lon, vertex.lat])).toEqual([
      [37.6173, 55.7558],
      [34, 57],
      [30.3351, 59.9343],
    ]);
    expect(result.routeLine.segments).toHaveLength(2);
    expect(result.routeLine.segments[1].sagittaKm).toBe(20);
    expect(result.totalLengthKm).toBeGreaterThan(0);
  });

  it('does not treat blank coordinates as zero coordinates', () => {
    const draft = createInitialPz1Draft();
    draft.stationDrafts[0] = { ...draft.stationDrafts[0], name: 'Москва', lat: '', lng: '' };

    const result = createPz1Result(draft);

    expect(result.stations).toHaveLength(0);
    expect(result.routeLine.vertices).toEqual([]);
  });

  it('accepts valid manual longitude values and rejects invalid coordinate ranges without crashing', () => {
    const draft = createInitialPz1Draft();
    draft.stationDrafts[0] = { ...draft.stationDrafts[0], name: 'Точка 111', lat: '55.7558', lng: '111' };
    draft.stationDrafts[3] = { ...draft.stationDrafts[3], name: 'Финиш', lat: '59.9343', lng: '30.3351' };
    draft.routePointDrafts = [
      { id: 'route-point-1', lat: '55.7558', lng: '111', sagittaToNextKm: '0' },
      { id: 'route-point-2', lat: '59.9343', lng: '30.3351', sagittaToNextKm: '0' },
      { id: 'route-point-invalid', lat: '91', lng: 'text', sagittaToNextKm: '20' },
    ];

    const result = createPz1Result(draft);

    expect(result.stations).toHaveLength(2);
    expect(result.routeLine.vertices).toHaveLength(2);
    expect(result.routeLine.vertices[0].lon).toBe(111);
    expect(Number.isFinite(result.totalLengthKm)).toBe(true);
  });

  it('blocks station step when enabled station names are duplicated', () => {
    const draft = createInitialPz1Draft();
    draft.stationDrafts[0] = { ...draft.stationDrafts[0], name: 'Москва', lat: '55.7558', lng: '37.6173' };
    draft.stationDrafts[3] = { ...draft.stationDrafts[3], name: ' москва ', lat: '59.9343', lng: '30.3351' };
    draft.routePointDrafts = [
      { id: 'route-point-1', lat: '55.7558', lng: '37.6173', sagittaToNextKm: '0' },
      { id: 'route-point-2', lat: '59.9343', lng: '30.3351', sagittaToNextKm: '0' },
    ];

    expect(isStationsStepComplete(draft)).toBe(false);
  });

  it('calculates distances between neighboring stations along the route line', () => {
    const draft = createInitialPz1Draft();
    draft.stationDrafts[0] = { ...draft.stationDrafts[0], name: 'A', lat: '0', lng: '0' };
    draft.stationDrafts[3] = { ...draft.stationDrafts[3], name: 'B', lat: '0', lng: '2' };
    draft.routePointDrafts = [
      { id: 'route-point-1', lat: '0', lng: '0', sagittaToNextKm: '0' },
      { id: 'route-point-2', lat: '0', lng: '1', sagittaToNextKm: '20' },
      { id: 'route-point-3', lat: '0', lng: '2', sagittaToNextKm: '0' },
    ];

    const [distance] = getStationRouteDistances(draft);

    expect(distance.fromLabel).toBe('А');
    expect(distance.toLabel).toBe('Г');
    expect(distance.distanceKm).toBeGreaterThan(222);
  });

  it('calculates HSR travel time from route segments and speed inputs', () => {
    const draft = createInitialPz1Draft();
    draft.stationDrafts[0] = { ...draft.stationDrafts[0], name: 'A', lat: '0', lng: '0' };
    draft.stationDrafts[3] = { ...draft.stationDrafts[3], name: 'B', lat: '0', lng: '1' };
    draft.routePointDrafts = [
      { id: 'route-point-1', lat: '0', lng: '0', sagittaToNextKm: '0' },
      { id: 'route-point-2', lat: '0', lng: '1', sagittaToNextKm: '0' },
    ];
    draft.hsrTravelTimes = {
      'А-Г': { speedKmh: '120' },
    };

    const hsrTravelTime = getHsrTravelTimeResult(draft);

    expect(hsrTravelTime).not.toBeNull();
    expect(hsrTravelTime?.segments).toHaveLength(1);
    expect(hsrTravelTime?.totalMinutes).toBeGreaterThan(58);
  });

  it('updates nested table cells without mutating sibling rows', () => {
    const draft = createInitialPz1Draft();
    const [table] = getSyncedCorrespondenceTables(draft);
    const updated = updateCellValue(table.values, 'fare', 'hSR', '1200');

    expect(updated.fare.hSR).toBe('1200');
    expect(updated.travelTime.hSR).toBe('');
  });

  it('builds correspondence tables from enabled stations without losing existing pairs', () => {
    const draft = createInitialPz1Draft();
    draft.stationDrafts[1] = { ...draft.stationDrafts[1], enabled: true };

    const tables = getSyncedCorrespondenceTables(draft);

    expect(tables.map((table) => table.pairKey)).toEqual(['А-Б', 'А-Г', 'Б-Г']);
    expect(tables[0].activeModes).toContain('hSR');
  });

  it('keeps HSR in correspondence tables even if imported active modes exclude it', () => {
    const draft = createInitialPz1Draft();
    draft.correspondenceTables['А-Г'].activeModes = ['airplane'];

    const [table] = getSyncedCorrespondenceTables(draft);

    expect(table.activeModes).toEqual(['hSR', 'airplane']);
  });

  it('validates consumer properties by metric rules', () => {
    expect(validateDiscomfortCell('1,2')).toBe('Значение должно быть в диапазоне от 0 до 1');
    expect(validateConsumerCell('dailyFrequency', '-1')).toBe('Значение не может быть отрицательным');
    expect(validateConsumerCell('fare', '1200')).toBeNull();
  });

  it('fills annual flow from the passenger flow forecast', () => {
    const draft = createInitialPz1Draft();
    const existingAnnualFlow = 2_325_272.4;
    const expectedBaseForecast = 2_208_992.6;
    draft.passengerFlowForecast.regional = {
      grpCurrentRegionA: '1',
      grpCurrentRegionB: '0',
      grpGrowthPctRegionA: '0',
      grpGrowthPctRegionB: '0',
      populationCurrentRegionA: '1',
      populationCurrentRegionB: '0',
      populationGrowthPctRegionA: '0',
      populationGrowthPctRegionB: '0',
      gdpPassengerFlowCoefficientRegionA: String(expectedBaseForecast / existingAnnualFlow),
      gdpPassengerFlowCoefficientRegionB: '0',
      inducedDemandPct: '0.35',
    };
    draft.passengerFlowForecast.modes = {
      hSR: {
        existingAnnualFlow: '0',
        travelTimeHours: '2',
        waitingTimeHours: '0',
        totalTransportCost: '1000',
        existingTravelTimeHours: '3',
      },
      airplane: {
        existingAnnualFlow: '475856.4',
        travelTimeHours: '4',
        waitingTimeHours: '0.5',
        totalTransportCost: '1200',
        existingTravelTimeHours: '4',
      },
      bus: {
        existingAnnualFlow: '277052.3',
        travelTimeHours: '6',
        waitingTimeHours: '0.2',
        totalTransportCost: '800',
        existingTravelTimeHours: '6',
      },
      suburbanTrain: {
        existingAnnualFlow: '157820',
        travelTimeHours: '5',
        waitingTimeHours: '0.2',
        totalTransportCost: '700',
        existingTravelTimeHours: '5',
      },
      longDistanceTrain: {
        existingAnnualFlow: '165367',
        travelTimeHours: '5',
        waitingTimeHours: '0.3',
        totalTransportCost: '900',
        existingTravelTimeHours: '5',
      },
      car: {
        existingAnnualFlow: '1249176.7',
        travelTimeHours: '5',
        waitingTimeHours: '0',
        totalTransportCost: '1100',
        existingTravelTimeHours: '5',
      },
    };

    const expectedAnnualFlow = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(2_982_140);

    expect(getComputedFinalIndicators(draft).annualFlow).toBe(expectedAnnualFlow);
    expect(createPz1Result(draft).finalIndicators?.annualFlow).toBe(expectedAnnualFlow);
  });

  it('derives total demand growth inputs from the regional characteristics screen', () => {
    const draft = createInitialPz1Draft();
    draft.regionalCharacteristics = {
      ...draft.regionalCharacteristics,
      grpExistingRegionA: '100',
      grpExistingRegionB: '100',
      grpForecastRegionA: '110',
      grpForecastRegionB: '110',
      populationExistingRegionA: '50',
      populationExistingRegionB: '50',
      populationForecastRegionA: '55',
      populationForecastRegionB: '55',
      averageSalaryRegionA: '60000',
      averageSalaryRegionB: '65000',
      kGdpFlowRegionA: '1',
      kGdpFlowRegionB: '1',
      inducedDemandPct: '35',
    };
    draft.passengerFlowForecast.modes = {
      hSR: {
        existingAnnualFlow: '0',
        travelTimeHours: '2',
        waitingTimeHours: '0',
        totalTransportCost: '1000',
        existingTravelTimeHours: '0',
      },
      airplane: {
        existingAnnualFlow: '100',
        travelTimeHours: '3',
        waitingTimeHours: '1',
        totalTransportCost: '2000',
        existingTravelTimeHours: '3',
      },
      bus: {
        existingAnnualFlow: '100',
        travelTimeHours: '5',
        waitingTimeHours: '0.5',
        totalTransportCost: '800',
        existingTravelTimeHours: '5',
      },
      suburbanTrain: {
        existingAnnualFlow: '100',
        travelTimeHours: '4',
        waitingTimeHours: '0.5',
        totalTransportCost: '700',
        existingTravelTimeHours: '4',
      },
      longDistanceTrain: {
        existingAnnualFlow: '100',
        travelTimeHours: '4',
        waitingTimeHours: '0.5',
        totalTransportCost: '900',
        existingTravelTimeHours: '4',
      },
      car: {
        existingAnnualFlow: '100',
        travelTimeHours: '5',
        waitingTimeHours: '0',
        totalTransportCost: '1100',
        existingTravelTimeHours: '5',
      },
    };

    const forecast = getPz1PassengerFlowForecast(draft);

    expect(forecast?.totalDemand.baseForecast).toBeCloseTo(605, 1);
    expect(forecast?.totalDemand.inducedDemand).toBeCloseTo(211.75, 2);
  });
});
