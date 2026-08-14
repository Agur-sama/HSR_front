import { describe, expect, it } from 'vitest';
import { buildDisplayRoutePoints, computeArcMetrics, computeRouteLineMetrics, computeSagittaFromRadius, haversineDistanceKm } from './routeGeometry';
import type { RouteLine } from '../../bridge/schema';

describe('route geometry', () => {
  it('calculates a semicircle arc from chord and sagitta', () => {
    const metrics = computeArcMetrics(100, 50);

    expect(metrics.radiusKm).toBeCloseTo(50, 5);
    expect(metrics.arcLengthKm).toBeCloseTo(157.08, 2);
  });

  it('uses chord length for straight segments', () => {
    const metrics = computeArcMetrics(100, 0);

    expect(metrics.radiusKm).toBeNull();
    expect(metrics.arcLengthKm).toBe(100);
  });

  it('derives sagitta from segment radius in kilometers', () => {
    expect(computeSagittaFromRadius(100, 50)).toBeCloseTo(50, 5);
    expect(computeSagittaFromRadius(100, 100)).toBeCloseTo(13.397, 3);
    expect(computeSagittaFromRadius(100, 0)).toBe(0);
  });

  it('keeps invalid numeric input from leaking NaN into route metrics', () => {
    const arcMetrics = computeArcMetrics(Number.NaN, Number.POSITIVE_INFINITY);
    const routeMetrics = computeRouteLineMetrics({
      vertices: [
        { id: 'a', lon: 0, lat: 0 },
        { id: 'b', lon: 181, lat: 0 },
      ],
      segments: [{ id: 'a-b', fromVertexId: 'a', toVertexId: 'b', sagittaKm: Number.NaN }],
    });

    expect(arcMetrics.arcLengthKm).toBe(0);
    expect(routeMetrics.totalLengthKm).toBe(0);
  });

  it('keeps the longitude 111 control input as valid geography', () => {
    const distance = haversineDistanceKm({ lon: 111, lat: 55 }, { lon: 112, lat: 55 });

    expect(distance).toBeGreaterThan(60);
    expect(distance).toBeLessThan(65);
  });

  it('guards display route building near projection limits', () => {
    const displayPoints = buildDisplayRoutePoints({
      vertices: [
        { id: 'a', lon: 0, lat: 90 },
        { id: 'b', lon: 1, lat: 90 },
      ],
      segments: [{ id: 'a-b', fromVertexId: 'a', toVertexId: 'b', sagittaKm: 1 }],
    });

    expect(displayPoints.every((point) => Number.isFinite(point.lon) && Number.isFinite(point.lat))).toBe(true);
  });

  it('calculates geodesic distance without Web Mercator distortion', () => {
    const distance = haversineDistanceKm({ lon: 0, lat: 0 }, { lon: 1, lat: 0 });

    expect(distance).toBeCloseTo(111.2, 1);
  });

  it('sums route segments and builds display arc points', () => {
    const routeLine: RouteLine = {
      vertices: [
        { id: 'a', lon: 0, lat: 0 },
        { id: 'b', lon: 1, lat: 0 },
        { id: 'c', lon: 2, lat: 0 },
      ],
      segments: [
        { id: 'a-b', fromVertexId: 'a', toVertexId: 'b', sagittaKm: 0 },
        { id: 'b-c', fromVertexId: 'b', toVertexId: 'c', sagittaKm: 20 },
      ],
    };

    const metrics = computeRouteLineMetrics(routeLine);
    const displayPoints = buildDisplayRoutePoints(routeLine, 8);

    expect(metrics.segments).toHaveLength(2);
    expect(metrics.totalLengthKm).toBeGreaterThan(222);
    expect(displayPoints.length).toBeGreaterThan(routeLine.vertices.length);
  });
});
