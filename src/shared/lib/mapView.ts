/**
 * Расчёт вида карты (центр и масштаб) по набору точек.
 *
 * Нужен, чтобы вид варианта задания не подбирался руками: центр и зум
 * выводятся из координат городов, и при правке координат разъехаться не могут.
 */

/** Точка в порядке [долгота, широта] — так их принимает MapLibre. */
export type LonLat = [number, number];

export interface MapView {
  center: LonLat;
  zoom: number;
}

export interface MapViewOptions {
  /** Ширина области карты в пикселях. */
  widthPx?: number;
  /** Высота области карты в пикселях. */
  heightPx?: number;
  /** Доля площади, оставляемая под поля, 0…0,9. */
  padding?: number;
  minZoom?: number;
  maxZoom?: number;
}

const TILE_SIZE = 256;
const DEFAULT_OPTIONS: Required<MapViewOptions> = {
  // Ориентир по фактическому размеру карточки карты в вёрстке ПЗ1.
  widthPx: 700,
  heightPx: 420,
  padding: 0.25,
  minZoom: 2,
  maxZoom: 12,
};

/** Широта в координату Меркатора 0…1 (0 — север, 1 — юг). */
function latitudeToMercatorY(latitude: number): number {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const radians = (clamped * Math.PI) / 180;

  return (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2;
}

/**
 * Центр — середина охватывающего прямоугольника, зум — максимальный, при
 * котором все точки помещаются в область с полями.
 *
 * Центр по широте считается в проекции Меркатора, а не как среднее
 * арифметическое: на широтах России разница между этими двумя способами
 * заметна, и середина по градусам смещала бы вид к югу.
 */
export function getMapViewForPoints(points: LonLat[], options: MapViewOptions = {}): MapView | null {
  const settings = { ...DEFAULT_OPTIONS, ...options };
  const valid = points.filter(
    ([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180,
  );

  if (valid.length === 0) {
    return null;
  }

  const longitudes = valid.map(([lon]) => lon);
  const latitudes = valid.map(([, lat]) => lat);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);

  const centerLon = (minLon + maxLon) / 2;
  const centerMercatorY = (latitudeToMercatorY(minLat) + latitudeToMercatorY(maxLat)) / 2;
  const centerLat = mercatorYToLatitude(centerMercatorY);

  if (valid.length === 1) {
    return { center: [centerLon, centerLat], zoom: settings.maxZoom };
  }

  const usableWidth = settings.widthPx * (1 - settings.padding);
  const usableHeight = settings.heightPx * (1 - settings.padding);
  const lonFraction = Math.max((maxLon - minLon) / 360, Number.EPSILON);
  const latFraction = Math.max(Math.abs(latitudeToMercatorY(minLat) - latitudeToMercatorY(maxLat)), Number.EPSILON);

  const zoomByLon = Math.log2(usableWidth / (TILE_SIZE * lonFraction));
  const zoomByLat = Math.log2(usableHeight / (TILE_SIZE * latFraction));
  const zoom = Math.min(settings.maxZoom, Math.max(settings.minZoom, Math.floor(Math.min(zoomByLon, zoomByLat))));

  return { center: [round(centerLon), round(centerLat)], zoom };
}

function mercatorYToLatitude(y: number): number {
  const n = Math.PI * (1 - 2 * y);

  return (180 / Math.PI) * Math.atan(Math.sinh(n));
}

function round(value: number): number {
  return Math.round(value * 1e5) / 1e5;
}
