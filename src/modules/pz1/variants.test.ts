import { describe, expect, it } from 'vitest';
import { pz1Variants } from './variants';

/** Карточка карты в вёрстке — те же размеры, из которых считается зум. */
const MAP_CARD = { widthPx: 678 * 0.75, heightPx: 358 * 0.75 };

/** Широта в меркаторскую координату 0…1. */
function mercatorY(latitude: number) {
  const radians = (latitude * Math.PI) / 180;

  return (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2;
}

/** Сколько пикселей займёт пара городов на карте MapLibre при данном зуме. */
function spanPx(zoom: number, from: readonly [number, number], to: readonly [number, number]) {
  const worldPx = 512 * 2 ** zoom;

  return {
    widthPx: worldPx * (Math.abs(from[0] - to[0]) / 360),
    heightPx: worldPx * Math.abs(mercatorY(from[1]) - mercatorY(to[1])),
  };
}

describe('варианты ПЗ1', () => {
  it('у каждого варианта свой центр карты', () => {
    const centers = pz1Variants.map((variant) => variant.mapCenter.join(','));

    expect(pz1Variants).toHaveLength(6);
    expect(new Set(centers).size).toBe(pz1Variants.length);
  });

  it('центр лежит между городами варианта, а не вбит произвольно', () => {
    for (const variant of pz1Variants) {
      const [fromLon, fromLat] = variant.fromCoords;
      const [toLon, toLat] = variant.toCoords;
      const [centerLon, centerLat] = variant.mapCenter;

      expect(centerLon).toBeGreaterThanOrEqual(Math.min(fromLon, toLon));
      expect(centerLon).toBeLessThanOrEqual(Math.max(fromLon, toLon));
      expect(centerLat).toBeGreaterThanOrEqual(Math.min(fromLat, toLat));
      expect(centerLat).toBeLessThanOrEqual(Math.max(fromLat, toLat));
    }
  });

  it('координаты городов правдоподобны для России', () => {
    for (const variant of pz1Variants) {
      for (const [lon, lat] of [variant.fromCoords, variant.toCoords]) {
        expect(lon).toBeGreaterThan(19);
        expect(lon).toBeLessThan(190);
        expect(lat).toBeGreaterThan(41);
        expect(lat).toBeLessThan(82);
      }
    }
  });

  /**
   * Прежняя проверка сравнивала зум двух вариантов по размаху долгот, хотя зум
   * задаёт та сторона, которая упирается первой: у пары Екатеринбург —
   * Челябинск это широта. Сравнение было ни о чём, поэтому здесь проверяется
   * то, ради чего зум и считается: оба города видны на карте сразу.
   */
  it('на своём зуме оба города помещаются в карточку карты', () => {
    for (const variant of pz1Variants) {
      const span = spanPx(variant.mapZoom, variant.fromCoords, variant.toCoords);

      expect(span.widthPx).toBeLessThanOrEqual(MAP_CARD.widthPx);
      expect(span.heightPx).toBeLessThanOrEqual(MAP_CARD.heightPx);
    }
  });

  it('зум взят самый крупный из подходящих — карта не отъезжает лишнего', () => {
    for (const variant of pz1Variants) {
      const closer = spanPx(variant.mapZoom + 1, variant.fromCoords, variant.toCoords);

      expect(closer.widthPx > MAP_CARD.widthPx || closer.heightPx > MAP_CARD.heightPx).toBe(true);
    }
  });

  it('регионы городов взяты из справочника субъектов', async () => {
    const { russianRegions } = await import('./model');

    for (const variant of pz1Variants) {
      expect(russianRegions).toContain(variant.fromRegion);
      expect(russianRegions).toContain(variant.toRegion);
    }
  });
});
