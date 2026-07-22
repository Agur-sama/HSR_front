import { describe, expect, it } from 'vitest';
import { buildDisplayRoutePoints, computeArcMetrics, computeRouteLineMetrics, haversineDistanceKm } from './routeGeometry';
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
