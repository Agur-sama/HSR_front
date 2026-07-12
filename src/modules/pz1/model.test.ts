import { describe, expect, it } from 'vitest';
import { createInitialPz1Draft, createPz1Result, updateCellValue } from './model';

describe('pz1 model', () => {
  it('builds routeLine from enabled station drafts', () => {
    const draft = createInitialPz1Draft();
    draft.stationDrafts[0] = { ...draft.stationDrafts[0], name: 'Москва', lat: '55.7558', lng: '37.6173' };
    draft.stationDrafts[3] = { ...draft.stationDrafts[3], name: 'Санкт-Петербург', lat: '59.9343', lng: '30.3351' };

    const result = createPz1Result(draft);

    expect(result.stations).toHaveLength(2);
    expect(result.routeLine).toEqual([
      [55.7558, 37.6173],
      [59.9343, 30.3351],
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
    const updated = updateCellValue(draft.consumerProperties, 'fare', 'transport1', '1200');

    expect(updated.fare.transport1).toBe('1200');
    expect(updated.travelTime.transport1).toBe('');
  });
});
