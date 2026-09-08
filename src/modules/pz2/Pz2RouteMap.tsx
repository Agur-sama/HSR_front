import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../../shared/lib/maplibreWorker';
import { pointAtDistance, projectOntoRoute } from '../../shared/lib/routeRuler';
import type { RouteRuler } from '../../shared/lib/routeRuler';
import { formatPz2Km } from './model';
import type { Pz2RouteSpan, Pz2StationMark } from './types';

/**
 * Цвета те же, что в ПЗ1: трасса ВСМ красная (--color-route-hsr), а бирюзовый
 * (--teal) в макете означает «выбранное сейчас» — им и показываем отмеренный
 * участок. Раньше трасса здесь была синей, и одна и та же линия выглядела в
 * двух заданиях по-разному.
 */
const ROUTE_COLOR = '#e0182d';
const SPAN_COLOR = '#08a696';

const ROUTE_SOURCE_ID = 'pz2-route';
const ROUTE_LAYER_ID = 'pz2-route-line';
const SPAN_SOURCE_ID = 'pz2-span';
const SPAN_LAYER_ID = 'pz2-span-line';
const MARK_SOURCE_ID = 'pz2-marks';
const MARK_LAYER_ID = 'pz2-marks-points';
/** Поля вокруг вписанной трассы, пикселей. */
const ROUTE_PADDING_PX = 36;
/** Сколько тайлов должно не загрузиться, прежде чем говорить о проблеме. */
const TILE_ERRORS_BEFORE_NOTICE = 3;
/** Допустимый промах мимо линии — доля длины трассы. */
const SNAP_LIMIT_SHARE = 0.05;
const SNAP_LIMIT_MIN_KM = 2;

interface Pz2RouteMapProps {
  ruler: RouteRuler;
  /** Станции из ПЗ1 с километражом — ориентиры, между которыми меряют участки. */
  stations: Pz2StationMark[];
  /** Отметки линейки, км от начала трассы. Одна отметка — измерение начато. */
  marksKm: number[];
  onMarksChange: (marksKm: number[]) => void;
  /** Участок измерен: две отметки поставлены. */
  onMeasured: (lengthKm: number, span: Pz2RouteSpan) => void;
  /** Участок строки, на которую навели в таблице: показываем вместо текущих отметок. */
  highlightedSpan?: Pz2RouteSpan | null;
}

/**
 * Карта трассы из ПЗ1 с линейкой.
 *
 * Мерить нужно вдоль линии, а не по прямой между кликами, поэтому клик
 * притягивается к ближайшей точке трассы, а длина участка берётся как разность
 * расстояний от начала. Так сумма участков сходится с длиной маршрута — на этом
 * держится проверка длины на шаге.
 */
export function Pz2RouteMap({
  ruler,
  stations,
  marksKm,
  highlightedSpan = null,
  onMarksChange,
  onMeasured,
}: Pz2RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const rulerRef = useRef(ruler);
  const marksRef = useRef(marksKm);
  const onMarksChangeRef = useRef(onMarksChange);
  const onMeasuredRef = useRef(onMeasured);
  const [isMapReady, setIsMapReady] = useState(false);
  const [hoverKm, setHoverKm] = useState<number | null>(null);
  const [missedClick, setMissedClick] = useState(false);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [mode, setMode] = useState<'view' | 'ruler'>('ruler');
  const modeRef = useRef(mode);
  const tileErrorsRef = useRef(0);

  useEffect(() => {
    modeRef.current = mode;
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
      bounds: routeBounds(ruler, stations),
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

    // Подложка приходит с tile.openstreetmap.org, и в закрытой сети её может
    // не быть. Молча показывать пустое поле нельзя: студент решит, что сломано
    // всё задание, хотя трасса и линейка считаются на своих данных.
    map.on('error', (event) => {
      if (!isTileError(event.error)) {
        return;
      }

      tileErrorsRef.current += 1;

      if (tileErrorsRef.current >= TILE_ERRORS_BEFORE_NOTICE) {
        setTilesFailed(true);
      }
    });

    map.on('mousemove', (event: MapMouseEvent) => {
      const position = projectOntoRoute(rulerRef.current, { lat: event.lngLat.lat, lon: event.lngLat.lng });
      const onRoute =
        modeRef.current === 'ruler' && position !== null && position.offsetKm <= snapLimitKm(rulerRef.current);
      setHoverKm(onRoute ? position.distanceKm : null);
      map.getCanvas().style.cursor = onRoute ? 'crosshair' : '';
    });

    map.on('mouseout', () => setHoverKm(null));

    map.on('click', (event: MapMouseEvent) => {
      if (modeRef.current !== 'ruler') {
        return;
      }

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
      onMeasuredRef.current(lengthKm, { fromKm: current[0], toKm: position.distanceKm });
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

    const shownMarks = highlightedSpan ? [highlightedSpan.fromKm, highlightedSpan.toKm] : marksKm;
    const markPoints = shownMarks
      .map((distanceKm) => pointAtDistance(ruler, distanceKm))
      .filter((point): point is NonNullable<typeof point> => point !== null);
    setGeoJson(map, MARK_SOURCE_ID, pointFeatures(markPoints.map((point) => [point.lon, point.lat])));

    const span = shownMarks.length === 2 ? sliceRoute(ruler, shownMarks[0], shownMarks[1]) : [];
    setGeoJson(map, SPAN_SOURCE_ID, lineFeature(span.map((point) => [point.lon, point.lat])));
  }, [highlightedSpan, isMapReady, marksKm, ruler]);

  useEffect(() => {
    // Esc → «Просмотр»: та же механика, что в ПЗ1 (ТЗ v3.5 §3 П-04), ТЗ ПЗ2 §5.1
    // требует её здесь же, поэтому поведение повторяется дословно.
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMode('view');
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isMapReady) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = stations.map((station) => {
      const element = document.createElement('span');
      element.className = 'maplibre-marker maplibre-marker--station';
      element.textContent = station.label;
      element.title = `Станция ${station.label}${station.name ? `: ${station.name}` : ''} — ${formatPz2Km(station.distanceKm)} от начала трассы`;

      return new maplibregl.Marker({ element }).setLngLat([station.lon, station.lat]).addTo(map);
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [isMapReady, stations]);

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
  const highlightedKm = highlightedSpan ? Math.abs(highlightedSpan.toKm - highlightedSpan.fromKm) : null;

  return (
    <section className="osm-map-card" aria-label="Карта трассы с линейкой">
      <div className="osm-map-card__head">
        <div>
          <p className="eyebrow">Линейка</p>
          <h3>Измерение участка</h3>
        </div>
        <div className="osm-map-actions">
          <div className="segmented-control segmented-control--map-tools" aria-label="Режим карты">
            <button className={mode === 'view' ? 'is-active' : ''} onClick={() => setMode('view')} type="button">
              Просмотр
            </button>
            <button className={mode === 'ruler' ? 'is-active' : ''} onClick={() => setMode('ruler')} type="button">
              Линейка
            </button>
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
      </div>

      {tilesFailed ? (
        <p className="field-warning">
          Подложка карты не загрузилась: нет доступа к tile.openstreetmap.org. Трасса, станции и линейка работают —
          они считаются по файлу ПЗ1, — но фон карты будет пустым.
        </p>
      ) : null}

      <div className="osm-map-stage">
        <div className="maplibre-container" ref={containerRef} />
        <div className="route-length-panel">
          <span>{panelLabel(highlightedKm, marksKm.length)}</span>
          <strong>{formatPz2Km(highlightedKm ?? measuringKm ?? ruler.totalKm)}</strong>
        </div>
      </div>

      {stations.length > 0 ? (
        <ul className="route-stations-legend">
          {stations.map((station) => (
            <li key={station.label}>
              <span className="route-stations-legend__label">{station.label}</span>
              <span>{station.name || 'без названия'}</span>
              <strong>{formatPz2Km(station.distanceKm)}</strong>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="osm-map-hint">
        {mode === 'view' ? 'Режим просмотра: карту можно двигать и приближать. Включите «Линейку», чтобы мерить. ' : null}
        {mode === 'ruler' && missedClick ? 'Мимо трассы. Кликните ближе к линии — отметка ставится только на ней. ' : null}
        {mode === 'view' ? null : marksKm.length === 1
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
/** Ошибка загрузки тайла подложки — в отличие от ошибок стиля или слоёв. */
function isTileError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');

  return message.includes('tile.openstreetmap.org') || message.toLowerCase().includes('tile');
}

function snapLimitKm(ruler: RouteRuler) {
  return Math.max(SNAP_LIMIT_MIN_KM, ruler.totalKm * SNAP_LIMIT_SHARE);
}

/** Вписываем трассу вместе со станциями: станция может стоять чуть в стороне. */
function routeBounds(ruler: RouteRuler, stations: Pz2StationMark[]): [number, number, number, number] {
  const points = [...ruler.points, ...stations];
  const lons = points.map((point) => point.lon);
  const lats = points.map((point) => point.lat);

  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
}

function panelLabel(highlightedKm: number | null, markCount: number) {
  if (highlightedKm !== null) {
    return 'Участок строки';
  }

  return markCount === 1 ? 'Меряется' : 'Длина трассы';
}

function ensureLayers(map: MapLibreMap) {
  map.addSource(ROUTE_SOURCE_ID, { type: 'geojson', data: lineFeature([]) });
  map.addLayer({
    id: ROUTE_LAYER_ID,
    type: 'line',
    source: ROUTE_SOURCE_ID,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ROUTE_COLOR, 'line-width': 5, 'line-opacity': 0.9 },
  });

  map.addSource(SPAN_SOURCE_ID, { type: 'geojson', data: lineFeature([]) });
  map.addLayer({
    id: SPAN_LAYER_ID,
    type: 'line',
    source: SPAN_SOURCE_ID,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': SPAN_COLOR, 'line-width': 8 },
  });

  map.addSource(MARK_SOURCE_ID, { type: 'geojson', data: pointFeatures([]) });
  map.addLayer({
    id: MARK_LAYER_ID,
    type: 'circle',
    source: MARK_SOURCE_ID,
    paint: {
      'circle-radius': 7,
      'circle-color': SPAN_COLOR,
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
