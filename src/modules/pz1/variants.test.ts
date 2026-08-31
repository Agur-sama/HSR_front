import { describe, expect, it } from 'vitest';
import { pz1Variants } from './variants';

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

  it('зум подобран под размах пары: дальние города — мельче', () => {
    const spanDegrees = (variant: (typeof pz1Variants)[number]) =>
      Math.abs(variant.fromCoords[0] - variant.toCoords[0]);
    const widest = [...pz1Variants].sort((a, b) => spanDegrees(b) - spanDegrees(a))[0];
    const narrowest = [...pz1Variants].sort((a, b) => spanDegrees(a) - spanDegrees(b))[0];

    expect(widest.mapZoom).toBeLessThan(narrowest.mapZoom);
  });

  it('регионы городов взяты из справочника субъектов', async () => {
    const { russianRegions } = await import('./model');

    for (const variant of pz1Variants) {
      expect(russianRegions).toContain(variant.fromRegion);
      expect(russianRegions).toContain(variant.toRegion);
    }
  });
});
