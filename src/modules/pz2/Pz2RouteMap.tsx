import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../../shared/lib/maplibreWorker';
import { pointAtDistance, projectOntoRoute } from '../../shared/lib/routeRuler';
import type { RouteRuler } from '../../shared/lib/routeRuler';
import { formatPz2Km } from './model';

const ROUTE_SOURCE_ID = 'pz2-route';
const ROUTE_LAYER_ID = 'pz2-route-line';
const SPAN_SOURCE_ID = 'pz2-span';
const SPAN_LAYER_ID = 'pz2-span-line';
const MARK_SOURCE_ID = 'pz2-marks';
const MARK_LAYER_ID = 'pz2-marks-points';
/** Поля вокруг вписанной трассы, пикселей. */
const ROUTE_PADDING_PX = 36;
/** Допустимый промах мимо линии — доля длины трассы. */
const SNAP_LIMIT_SHARE = 0.05;
const SNAP_LIMIT_MIN_KM = 2;

interface Pz2RouteMapProps {
  ruler: RouteRuler;
  /** Отметки линейки, км от начала трассы. Одна отметка — измерение начато. */
  marksKm: number[];
  onMarksChange: (marksKm: number[]) => void;
  /** Участок измерен: две отметки поставлены. */
  onMeasured: (lengthKm: number) => void;
}

/**
 * Карта трассы из ПЗ1 с линейкой.
 *
 * Мерить нужно вдоль линии, а не по прямой между кликами, поэтому клик
 * притягивается к ближайшей точке трассы, а длина участка берётся как разность
 * расстояний от начала. Так сумма участков сходится с длиной маршрута — на этом
 * держится проверка длины на шаге.
 */
export function Pz2RouteMap({ ruler, marksKm, onMarksChange, onMeasured }: Pz2RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const rulerRef = useRef(ruler);
  const marksRef = useRef(marksKm);
  const onMarksChangeRef = useRef(onMarksChange);
  const onMeasuredRef = useRef(onMeasured);
  const [isMapReady, setIsMapReady] = useState(false);
  const [hoverKm, setHoverKm] = useState<number | null>(null);
  const [missedClick, setMissedClick] = useState(false);

  useEffect(() => {
    rulerRef.current = ruler;
    marksRef.current = marksKm;
    onMarksChangeRef.current = onMarksChange;
    onMeasuredRef.current = onMeasured;
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current || ruler.points.length === 0) {
      return undefined;
    }

    const map = new maplibregl.Map({
      attributionControl: false,
      // Вид считает сама MapLibre по реальному размеру контейнера: расчётный
      // зум по предполагаемым размерам карточки промахивался, и трасса
      // уезжала за верхний край карты.
      bounds: routeBounds(ruler),
      fitBoundsOptions: { padding: ROUTE_PADDING_PX, animate: false },
      container: containerRef.current,
      canvasContextAttributes: { contextType: 'webgl2', preserveDrawingBuffer: true },
      maxZoom: 19,
      minZoom: 3,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm' }],
      },
    });

    mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => {
      ensureLayers(map);
      setIsMapReady(true);
    });

    map.on('mousemove', (event: MapMouseEvent) => {
      const position = projectOntoRoute(rulerRef.current, { lat: event.lngLat.lat, lon: event.lngLat.lng });
      const onRoute = position !== null && position.offsetKm <= snapLimitKm(rulerRef.current);
      setHoverKm(onRoute ? position.distanceKm : null);
      map.getCanvas().style.cursor = onRoute ? 'crosshair' : '';
    });

    map.on('mouseout', () => setHoverKm(null));

    map.on('click', (event: MapMouseEvent) => {
      const position = projectOntoRoute(rulerRef.current, { lat: event.lngLat.lat, lon: event.lngLat.lng });

      // Клик далеко от линии — это промах, а не отметка: без порога любая точка
      // карты притягивалась к трассе и молча становилась границей участка.
      if (!position || position.offsetKm > snapLimitKm(rulerRef.current)) {
        setMissedClick(true);
        return;
      }

      setMissedClick(false);
      const current = marksRef.current;

      // Первый клик открывает измерение, второй — закрывает и отдаёт длину.
      if (current.length !== 1) {
        onMarksChangeRef.current([position.distanceKm]);
        return;
      }

      const lengthKm = Math.abs(position.distanceKm - current[0]);
      onMarksChangeRef.current([current[0], position.distanceKm]);
      onMeasuredRef.current(lengthKm);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, [ruler.points.length]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isMapReady) {
      return;
    }

    setGeoJson(map, ROUTE_SOURCE_ID, lineFeature(ruler.points.map((point) => [point.lon, point.lat])));

    const markPoints = marksKm
      .map((distanceKm) => pointAtDistance(ruler, distanceKm))
      .filter((point): point is NonNullable<typeof point> => point !== null);
    setGeoJson(map, MARK_SOURCE_ID, pointFeatures(markPoints.map((point) => [point.lon, point.lat])));

    const span = marksKm.length === 2 ? sliceRoute(ruler, marksKm[0], marksKm[1]) : [];
    setGeoJson(map, SPAN_SOURCE_ID, lineFeature(span.map((point) => [point.lon, point.lat])));
  }, [isMapReady, marksKm, ruler]);

  if (ruler.points.length === 0) {
    return (
      <section className="osm-map-card" aria-label="Карта трассы">
        <div className="osm-map-card__head">
          <div>
            <p className="eyebrow">Карта трассы</p>
            <h3>Трасса не загружена</h3>
          </div>
        </div>
        <div className="map-placeholder">
          <p>Загрузите на интро файл, сохранённый в ПЗ1, — карта и длина маршрута берутся из него.</p>
        </div>
      </section>
    );
  }

  const measuringKm = marksKm.length === 1 && hoverKm !== null ? Math.abs(hoverKm - marksKm[0]) : null;

  return (
    <section className="osm-map-card" aria-label="Карта трассы с линейкой">
      <div className="osm-map-card__head">
        <div>
          <p className="eyebrow">Линейка</p>
          <h3>Измерение участка</h3>
        </div>
        <button
          className="button button--outline"
          disabled={marksKm.length === 0}
          onClick={() => onMarksChange([])}
          type="button"
        >
          Сбросить отметки
        </button>
      </div>

      <div className="osm-map-stage">
        <div className="maplibre-container" ref={containerRef} />
        <div className="route-length-panel">
          <span>{marksKm.length === 1 ? 'Меряется' : 'Длина трассы'}</span>
          <strong>{formatPz2Km(measuringKm ?? ruler.totalKm)}</strong>
        </div>
      </div>

      <p className="osm-map-hint">
        {missedClick ? 'Мимо трассы. Кликните ближе к линии — отметка ставится только на ней. ' : null}
        {marksKm.length === 1
          ? 'Начало участка поставлено. Кликните второй раз — длина посчитается вдоль трассы и подставится в таблицу.'
          : 'Кликните на трассе, чтобы отметить начало участка, затем ещё раз — чтобы отметить конец.'}
      </p>
    </section>
  );
}

/**
 * Насколько далеко от линии клик ещё считается попаданием.
 *
 * Порог берём от длины трассы, а не в километрах наотмашь: на трассе в 500 км
 * промах в пару километров — это попадание, а на коротком участке — уже нет.
 */
function snapLimitKm(ruler: RouteRuler) {
  return Math.max(SNAP_LIMIT_MIN_KM, ruler.totalKm * SNAP_LIMIT_SHARE);
}

function routeBounds(ruler: RouteRuler): [number, number, number, number] {
  const lons = ruler.points.map((point) => point.lon);
  const lats = ruler.points.map((point) => point.lat);

  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
}

function ensureLayers(map: MapLibreMap) {
  map.addSource(ROUTE_SOURCE_ID, { type: 'geojson', data: lineFeature([]) });
  map.addLayer({
    id: ROUTE_LAYER_ID,
    type: 'line',
    source: ROUTE_SOURCE_ID,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#003D84', 'line-width': 5, 'line-opacity': 0.85 },
  });

  map.addSource(SPAN_SOURCE_ID, { type: 'geojson', data: lineFeature([]) });
  map.addLayer({
    id: SPAN_LAYER_ID,
    type: 'line',
    source: SPAN_SOURCE_ID,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#E0182D', 'line-width': 7 },
  });

  map.addSource(MARK_SOURCE_ID, { type: 'geojson', data: pointFeatures([]) });
  map.addLayer({
    id: MARK_LAYER_ID,
    type: 'circle',
    source: MARK_SOURCE_ID,
    paint: {
      'circle-radius': 7,
      'circle-color': '#E0182D',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
  });
}

function setGeoJson(map: MapLibreMap, sourceId: string, data: GeoJSON.FeatureCollection) {
  const source = map.getSource(sourceId);

  if (source) {
    (source as GeoJSONSource).setData(data);
  }
}

function lineFeature(coordinates: number[][]): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  return {
    type: 'FeatureCollection',
    features:
      coordinates.length >= 2
        ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }]
        : [],
  };
}

function pointFeatures(coordinates: number[][]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: coordinates.map((coordinate) => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: coordinate },
    })),
  };
}

/** Кусок трассы между двумя отметками — его подсвечиваем красным. */
function sliceRoute(ruler: RouteRuler, fromKm: number, toKm: number) {
  const start = Math.min(fromKm, toKm);
  const end = Math.max(fromKm, toKm);
  const startPoint = pointAtDistance(ruler, start);
  const endPoint = pointAtDistance(ruler, end);

  if (!startPoint || !endPoint) {
    return [];
  }

  const inner = ruler.points.filter((_, index) => ruler.cumulativeKm[index] > start && ruler.cumulativeKm[index] < end);

  return [startPoint, ...inner, endPoint];
}
