import { describe, expect, it } from 'vitest';
import { createInitialPz1Draft, createPz1Result, updateCellValue, validateConsumerCell } from './model';

describe('pz1 model', () => {
  it('keeps routeLine independent from enabled station drafts', () => {
    const draft = createInitialPz1Draft();
    draft.stationDrafts[0] = { ...draft.stationDrafts[0], name: 'Москва', lat: '55.7558', lng: '37.6173' };
    draft.stationDrafts[3] = { ...draft.stationDrafts[3], name: 'Санкт-Петербург', lat: '59.9343', lng: '30.3351' };
    draft.routePointDrafts = [
      { id: 'route-point-1', lat: '55.7558', lng: '37.6173' },
      { id: 'route-point-2', lat: '57.0000', lng: '34.0000' },
      { id: 'route-point-3', lat: '59.9343', lng: '30.3351' },
    ];

    const result = createPz1Result(draft);

    expect(result.stations).toHaveLength(2);
    expect(result.routeLine).toEqual([
      [37.6173, 55.7558],
      [34, 57],
      [30.3351, 59.9343],
    ]);
  });

  it('does not treat blank coordinates as zero coordinates', () => {
    const draft = createInitialPz1Draft();
    draft.stationDrafts[0] = { ...draft.stationDrafts[0], name: 'Москва', lat: '', lng: '' };

    const result = createPz1Result(draft);

    expect(result.stations).toHaveLength(0);
    expect(result.routeLine).toEqual([]);
  });

  it('updates nested table cells without mutating sibling rows', () => {
    const draft = createInitialPz1Draft();
    const updated = updateCellValue(draft.consumerProperties, 'fare', 'hSR', '1200');

    expect(updated.fare.hSR).toBe('1200');
    expect(updated.travelTime.hSR).toBe('');
  });

  it('validates consumer properties by metric rules', () => {
    expect(validateConsumerCell('discomfort', '1,2')).toBe('Коэффициент дискомфорта — это индекс от 0 до 1');
    expect(validateConsumerCell('dailyFrequency', '-1')).toBe('Значение не может быть отрицательным');
    expect(validateConsumerCell('fare', '1200')).toBeNull();
  });
});
