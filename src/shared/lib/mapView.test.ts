import { describe, expect, it } from 'vitest';
import { getMapViewForPoints } from './mapView';
import type { LonLat } from './mapView';

const MOSCOW: LonLat = [37.6173, 55.7558];
const YAROSLAVL: LonLat = [39.8845, 57.6261];
const VLADIVOSTOK: LonLat = [131.8855, 43.1155];
const KHABAROVSK: LonLat = [135.0838, 48.4827];

describe('getMapViewForPoints', () => {
  it('центрирует по середине пары городов', () => {
    const view = getMapViewForPoints([MOSCOW, YAROSLAVL]);

    expect(view).not.toBeNull();
    expect(view?.center[0]).toBeCloseTo(38.751, 2);
    // Середина по Меркатору — севернее среднего арифметического (56.691),
    // потому что проекция растягивает север.
    expect(view?.center[1]).toBeCloseTo(56.703, 2);
    expect(view!.center[1]).toBeGreaterThan((55.7558 + 57.6261) / 2);
  });

  it('дальней паре городов даёт меньший зум, чем ближней', () => {
    const near = getMapViewForPoints([MOSCOW, YAROSLAVL]);
    const far = getMapViewForPoints([KHABAROVSK, VLADIVOSTOK]);

    expect(near).not.toBeNull();
    expect(far).not.toBeNull();
    // Хабаровск — Владивосток разнесены сильнее, чем Москва — Ярославль.
    expect(far!.zoom).toBeLessThan(near!.zoom);
  });

  it('обе точки помещаются в область при выбранном зуме', () => {
    const view = getMapViewForPoints([KHABAROVSK, VLADIVOSTOK], { widthPx: 700, heightPx: 420, padding: 0.25 });
    const spanLonDegrees = Math.abs(KHABAROVSK[0] - VLADIVOSTOK[0]);
    const widthPx = 256 * 2 ** view!.zoom * (spanLonDegrees / 360);

    expect(widthPx).toBeLessThanOrEqual(700 * 0.75);
  });

  it('одна точка — максимальный зум, центр в ней самой', () => {
    const view = getMapViewForPoints([MOSCOW], { maxZoom: 11 });

    expect(view?.zoom).toBe(11);
    expect(view?.center[0]).toBeCloseTo(MOSCOW[0], 4);
    expect(view?.center[1]).toBeCloseTo(MOSCOW[1], 4);
  });

  it('без точек возвращает null, мусор отбрасывает', () => {
    expect(getMapViewForPoints([])).toBeNull();
    expect(getMapViewForPoints([[Number.NaN, 55], [200, 400]])).toBeNull();
  });

  it('держит зум в заданных границах', () => {
    const worldWide = getMapViewForPoints([[-179, -85], [179, 85]], { minZoom: 3, maxZoom: 12 });

    expect(worldWide!.zoom).toBe(3);
  });
});
