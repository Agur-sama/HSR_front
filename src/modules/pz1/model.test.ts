import { describe, expect, it } from 'vitest';
import {
  createInitialPz1Draft,
  createPz1Result,
  getComputedFinalIndicators,
  getSyncedCorrespondenceTables,
  updateCellValue,
  validateConsumerCell,
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

  it('validates consumer properties by metric rules', () => {
    expect(validateConsumerCell('discomfort', '1,2')).toBe('Коэффициент дискомфорта — это индекс от 0 до 1');
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
});
