import type { GeoPoint, RouteLine } from '../../bridge/schema';

const EARTH_RADIUS_KM = 6371.0088;
const EPS = 1e-9;
const DEFAULT_ARC_STEPS = 64;

export interface RouteSegmentMetrics {
  segmentId: string;
  chordKm: number;
  radiusKm: number | null;
  arcLengthKm: number;
}

export interface RouteLineMetrics {
  segments: RouteSegmentMetrics[];
  totalLengthKm: number;
}

interface LocalPoint {
  x: number;
  y: number;
}

export function haversineDistanceKm(from: GeoPoint, to: GeoPoint): number {
  if (!isValidGeoPoint(from) || !isValidGeoPoint(to)) {
    return 0;
  }

  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLon = toRadians(to.lon - from.lon);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLon / 2) ** 2;
  const centralAngle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * centralAngle;
}

export function computeArcMetrics(chordKm: number, sagittaKm: number): Omit<RouteSegmentMetrics, 'segmentId'> {
  if (!Number.isFinite(chordKm) || !Number.isFinite(sagittaKm)) {
    return { chordKm: 0, radiusKm: null, arcLengthKm: 0 };
  }

  const absSagittaKm = Math.abs(sagittaKm);

  if (chordKm <= EPS) {
    return { chordKm: 0, radiusKm: null, arcLengthKm: 0 };
  }

  if (absSagittaKm < EPS) {
    return { chordKm, radiusKm: null, arcLengthKm: chordKm };
  }

  const radiusKm = absSagittaKm / 2 + chordKm ** 2 / (8 * absSagittaKm);
  const centralAngle = 2 * Math.asin(clamp(chordKm / (2 * radiusKm), -1, 1));

  return {
    chordKm,
    radiusKm,
    arcLengthKm: radiusKm * centralAngle,
  };
}

export function computeSagittaFromRadius(chordKm: number, radiusKm: number): number {
  if (!Number.isFinite(chordKm) || !Number.isFinite(radiusKm) || chordKm <= EPS || radiusKm <= EPS) {
    return 0;
  }

  const halfChordKm = chordKm / 2;
  const effectiveRadiusKm = Math.max(radiusKm, halfChordKm);

  return effectiveRadiusKm - Math.sqrt(Math.max(0, effectiveRadiusKm ** 2 - halfChordKm ** 2));
}

export function computeRouteLineMetrics(routeLine: RouteLine): RouteLineMetrics {
  const vertexById = new Map(routeLine.vertices.map((vertex) => [vertex.id, vertex]));
  const segments = routeLine.segments.map((segment) => {
    const from = vertexById.get(segment.fromVertexId);
    const to = vertexById.get(segment.toVertexId);
    const chordKm = from && to ? haversineDistanceKm(from, to) : 0;
    const metrics = computeArcMetrics(chordKm, segment.sagittaKm);

    return {
      segmentId: segment.id,
      ...metrics,
    };
  });

  return {
    segments,
    totalLengthKm: segments.reduce((sum, segment) => sum + segment.arcLengthKm, 0),
  };
}

export function buildDisplayRoutePoints(routeLine: RouteLine, stepsPerArc = DEFAULT_ARC_STEPS): GeoPoint[] {
  const vertexById = new Map(routeLine.vertices.map((vertex) => [vertex.id, vertex]));
  const points: GeoPoint[] = [];

  for (const segment of routeLine.segments) {
    const from = vertexById.get(segment.fromVertexId);
    const to = vertexById.get(segment.toVertexId);

    if (!from || !to) {
      continue;
    }

    const segmentPoints = buildSegmentDisplayPoints(from, to, segment.sagittaKm, stepsPerArc);
    if (points.length > 0) {
      points.push(...segmentPoints.slice(1));
    } else {
      points.push(...segmentPoints);
    }
  }

  return points;
}

function buildSegmentDisplayPoints(from: GeoPoint, to: GeoPoint, sagittaKm: number, stepsPerArc: number): GeoPoint[] {
  if (!isValidGeoPoint(from) || !isValidGeoPoint(to) || !Number.isFinite(sagittaKm)) {
    return [];
  }

  if (Math.abs(sagittaKm) < EPS) {
    return [from, to];
  }

  const origin = {
    lon: (from.lon + to.lon) / 2,
    lat: (from.lat + to.lat) / 2,
  };
  const fromLocal = toLocalPoint(from, origin);
  const toLocal = toLocalPoint(to, origin);
  const chordVector = {
    x: toLocal.x - fromLocal.x,
    y: toLocal.y - fromLocal.y,
  };
  const chordLength = Math.hypot(chordVector.x, chordVector.y);

  if (chordLength < EPS) {
    return [from, to];
  }

  const direction = {
    x: chordVector.x / chordLength,
    y: chordVector.y / chordLength,
  };
  const normal = {
    x: -direction.y,
    y: direction.x,
  };
  const midpoint = {
    x: (fromLocal.x + toLocal.x) / 2,
    y: (fromLocal.y + toLocal.y) / 2,
  };
  const signedRadius = sagittaKm / 2 + chordLength ** 2 / (8 * sagittaKm);
  const center = {
    x: midpoint.x + normal.x * (sagittaKm - signedRadius),
    y: midpoint.y + normal.y * (sagittaKm - signedRadius),
  };
  const radius = Math.abs(signedRadius);
  const startAngle = Math.atan2(fromLocal.y - center.y, fromLocal.x - center.x);
  const endAngle = Math.atan2(toLocal.y - center.y, toLocal.x - center.x);
  const delta = chooseArcDelta(startAngle, endAngle, center, midpoint, normal, sagittaKm, radius);
  const stepCount = Math.max(2, stepsPerArc);
  const points: GeoPoint[] = [];

  for (let index = 0; index <= stepCount; index += 1) {
    const angle = startAngle + (delta * index) / stepCount;
    points.push(
      fromLocalPoint(
        {
          x: center.x + radius * Math.cos(angle),
          y: center.y + radius * Math.sin(angle),
        },
        origin,
      ),
    );
  }

  return points;
}

function chooseArcDelta(
  startAngle: number,
  endAngle: number,
  center: LocalPoint,
  midpoint: LocalPoint,
  normal: LocalPoint,
  sagittaKm: number,
  radius: number,
) {
  const directDelta = normalizeAngle(endAngle - startAngle);
  const alternateDelta = directDelta > 0 ? directDelta - Math.PI * 2 : directDelta + Math.PI * 2;

  return arcMidSagittaError(startAngle, directDelta, center, midpoint, normal, sagittaKm, radius) <=
    arcMidSagittaError(startAngle, alternateDelta, center, midpoint, normal, sagittaKm, radius)
    ? directDelta
    : alternateDelta;
}

function arcMidSagittaError(
  startAngle: number,
  delta: number,
  center: LocalPoint,
  midpoint: LocalPoint,
  normal: LocalPoint,
  sagittaKm: number,
  radius: number,
) {
  const midAngle = startAngle + delta / 2;
  const arcMid = {
    x: center.x + radius * Math.cos(midAngle),
    y: center.y + radius * Math.sin(midAngle),
  };
  const projectedSagitta = (arcMid.x - midpoint.x) * normal.x + (arcMid.y - midpoint.y) * normal.y;

  return Math.abs(projectedSagitta - sagittaKm);
}

function toLocalPoint(point: GeoPoint, origin: GeoPoint): LocalPoint {
  const latScale = Math.PI / 180;
  const lonScale = latScale * Math.cos(toRadians(origin.lat));

  return {
    x: Math.abs(lonScale) < EPS ? 0 : EARTH_RADIUS_KM * (point.lon - origin.lon) * lonScale,
    y: EARTH_RADIUS_KM * (point.lat - origin.lat) * latScale,
  };
}

function fromLocalPoint(point: LocalPoint, origin: GeoPoint): GeoPoint {
  const latScale = Math.PI / 180;
  const lonScale = latScale * Math.cos(toRadians(origin.lat));

  return {
    lon: Math.abs(lonScale) < EPS ? origin.lon : origin.lon + point.x / (EARTH_RADIUS_KM * lonScale),
    lat: origin.lat + point.y / (EARTH_RADIUS_KM * latScale),
  };
}

function normalizeAngle(angle: number) {
  let nextAngle = angle;
  while (nextAngle <= -Math.PI) {
    nextAngle += Math.PI * 2;
  }
  while (nextAngle > Math.PI) {
    nextAngle -= Math.PI * 2;
  }
  return nextAngle;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isValidGeoPoint(point: GeoPoint) {
  return (
    Number.isFinite(point.lon) &&
    Number.isFinite(point.lat) &&
    point.lon >= -180 &&
    point.lon <= 180 &&
    point.lat >= -90 &&
    point.lat <= 90
  );
}
