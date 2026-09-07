import { describe, expect, it } from 'vitest';
import { getMapViewForPoints } from './mapView';
import type { LonLat } from './mapView';

const MOSCOW: LonLat = [37.6173, 55.7558];
const YAROSLAVL: LonLat = [39.8845, 57.6261];
const VLADIVOSTOK: LonLat = [131.8855, 43.1155];
const KHABAROVSK: LonLat = [135.0838, 48.4827];

/** Широта в меркаторскую координату 0…1 — тем же способом, что и в карте. */
function mercatorY(latitude: number) {
  const radians = (latitude * Math.PI) / 180;

  return (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2;
}

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

  // Проверка идёт по шкале MapLibre (512 пикселей на тайл), а не по размеру
  // растрового тайла OSM: раньше здесь стояло 256, и тест подтверждал расчёт
  // сам себе — зум был на уровень крупнее, а города уезжали за край карты.
  const spanPx = (view: { zoom: number }, from: LonLat, to: LonLat) => ({
    widthPx: 512 * 2 ** view.zoom * (Math.abs(from[0] - to[0]) / 360),
    heightPx: 512 * 2 ** view.zoom * Math.abs(mercatorY(from[1]) - mercatorY(to[1])),
  });

  it('обе точки помещаются в область при выбранном зуме', () => {
    const size = { widthPx: 700, heightPx: 420, padding: 0.25 };
    const view = getMapViewForPoints([KHABAROVSK, VLADIVOSTOK], size);
    const span = spanPx(view!, KHABAROVSK, VLADIVOSTOK);

    expect(span.widthPx).toBeLessThanOrEqual(size.widthPx * (1 - size.padding));
    expect(span.heightPx).toBeLessThanOrEqual(size.heightPx * (1 - size.padding));
  });

  it('ближняя пара городов помещается по высоте — на ней и ловился лишний зум', () => {
    const size = { widthPx: 678, heightPx: 358, padding: 0.25 };
    const view = getMapViewForPoints([MOSCOW, YAROSLAVL], size);
    const span = spanPx(view!, MOSCOW, YAROSLAVL);

    expect(span.heightPx).toBeLessThanOrEqual(size.heightPx * (1 - size.padding));
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
