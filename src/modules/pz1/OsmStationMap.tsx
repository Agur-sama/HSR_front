import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { buildDisplayRoutePoints } from '../../shared/lib/routeGeometry';
import type { RouteLineMetrics } from '../../shared/lib/routeGeometry';
import { createRouteLine } from './model';
import type { Pz1RoutePointDraft, Pz1StationDraft } from './types';

const MIN_ZOOM = 4;
const MAX_ZOOM = 19;
const ROUTE_SOURCE_ID = 'vsm-route-source';
const ROUTE_LAYER_ID = 'vsm-route-layer';
const DRAFT_ROUTE_SOURCE_ID = 'vsm-draft-route-source';
const DRAFT_ROUTE_LAYER_ID = 'vsm-draft-route-layer';
const STATION_SOURCE_ID = 'vsm-station-source';
const STATION_LAYER_ID = 'vsm-station-layer';
const ROUTE_POINT_SOURCE_ID = 'vsm-route-point-source';
const ROUTE_POINT_LAYER_ID = 'vsm-route-point-layer';

type MapMode = 'view' | 'station' | 'route';

interface OsmStationMapProps {
  activeStationLabel: Pz1StationDraft['label'];
  /** Вид карты варианта: считается из координат его городов в variants.ts. */
  mapCenter: [number, number];
  mapZoom: number;
  onActiveStationChange: (label: Pz1StationDraft['label']) => void;
  onPreviewImageChange: (previewImage: string) => void;
  onRoutePointDraftsChange: (routePointDrafts: Pz1RoutePointDraft[]) => void;
  onStationChange: (label: Pz1StationDraft['label'], patch: Partial<Pz1StationDraft>) => void;
  routeMetrics: RouteLineMetrics;
  routePointDrafts: Pz1RoutePointDraft[];
  stations: Pz1StationDraft[];
}

interface ScreenPoint {
  x: number;
  y: number;
}

export function OsmStationMap({
  activeStationLabel,
  mapCenter,
  mapZoom,
  onActiveStationChange,
  onPreviewImageChange,
  onRoutePointDraftsChange,
  onStationChange,
  routeMetrics,
  routePointDrafts,
  stations,
}: OsmStationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const previewTimerRef = useRef<number | null>(null);
  const modeRef = useRef<MapMode>('station');
  const activeStationLabelRef = useRef(activeStationLabel);
  const routePointDraftsRef = useRef(routePointDrafts);
  const routeCoordinatesRef = useRef<number[][]>([]);
  const onPreviewImageChangeRef = useRef(onPreviewImageChange);
  const onRoutePointDraftsChangeRef = useRef(onRoutePointDraftsChange);
  const onStationChangeRef = useRef(onStationChange);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mode, setMode] = useState<MapMode>('station');
  const [selectedSegmentId, setSelectedSegmentId] = useState('');
  const [draftOverlayPoints, setDraftOverlayPoints] = useState<ScreenPoint[]>([]);
  const [routeOverlayPoints, setRouteOverlayPoints] = useState<ScreenPoint[]>([]);
  const routeLine = useMemo(() => createRouteLine(routePointDrafts), [routePointDrafts]);
  const stationCoordinates = useMemo(
    () => stations.filter((station) => station.enabled).map(parseLngLat).filter((point): point is [number, number] => point !== null),
    [stations],
  );
  const routePointCoordinates = useMemo(
    () => routePointDrafts.map(parseLngLat).filter((point): point is [number, number] => point !== null),
    [routePointDrafts],
  );
  const routeCoordinates = useMemo(() => {
    const computedCoordinates = buildDisplayRoutePoints(routeLine).map((point) => [point.lon, point.lat]);

    return computedCoordinates.length >= 2 ? computedCoordinates : routePointCoordinates;
  }, [routeLine, routePointCoordinates]);
  const routeSegmentById = new Map(routeMetrics.segments.map((segment) => [segment.segmentId, segment]));
  const activeStation = stations.find((station) => station.label === activeStationLabel) ?? stations[0];

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    activeStationLabelRef.current = activeStationLabel;
  }, [activeStationLabel]);

  useEffect(() => {
    routePointDraftsRef.current = routePointDrafts;
  }, [routePointDrafts]);

  useEffect(() => {
    routeCoordinatesRef.current = routeCoordinates;
  }, [routeCoordinates]);

  useEffect(() => {
    if (mode === 'route') {
      return;
    }

    setDraftOverlayPoints([]);
    const map = mapRef.current;
    if (map && isMapReady) {
      clearDraftRoute(map);
    }
  }, [isMapReady, mode]);

  useEffect(() => {
    onPreviewImageChangeRef.current = onPreviewImageChange;
    onRoutePointDraftsChangeRef.current = onRoutePointDraftsChange;
    onStationChangeRef.current = onStationChange;
  }, [onPreviewImageChange, onRoutePointDraftsChange, onStationChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return undefined;
    }

    const map = new maplibregl.Map({
      attributionControl: false,
      center: mapCenter,
      container: containerRef.current,
      maxZoom: MAX_ZOOM,
      minZoom: MIN_ZOOM,
      canvasContextAttributes: {
        contextType: 'webgl2',
        preserveDrawingBuffer: true,
      },
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
      zoom: mapZoom,
    });

    mapRef.current = map;
    map.scrollZoom.enable();
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    const syncCurrentRouteOverlay = () => {
      syncRouteOverlay(map, routeCoordinatesRef.current, setRouteOverlayPoints);
    };
    const clearDraftRouteOverlay = () => {
      clearDraftRoute(map);
      setDraftOverlayPoints([]);
    };
    const handleMouseLeave = () => clearDraftRouteOverlay();

    map.on('load', () => {
      ensureMapLayers(map);
      setIsMapReady(true);
      syncCurrentRouteOverlay();
    });
    map.on('move', syncCurrentRouteOverlay);
    map.on('zoom', syncCurrentRouteOverlay);
    map.on('resize', syncCurrentRouteOverlay);
    map.on('click', (event: MapMouseEvent) => {
      if (modeRef.current === 'view') {
        return;
      }

      if (modeRef.current === 'station') {
        onStationChangeRef.current(activeStationLabelRef.current, {
          enabled: true,
          lat: event.lngLat.lat.toFixed(5),
          lng: event.lngLat.lng.toFixed(5),
        });
        return;
      }

      const nextRoutePointDrafts = [
        ...routePointDraftsRef.current,
        {
          id: `route-point-${Date.now()}-${routePointDraftsRef.current.length}`,
          lat: event.lngLat.lat.toFixed(5),
          lng: event.lngLat.lng.toFixed(5),
          sagittaToNextKm: '0',
          bendM: '0',
        },
      ];
      const nextCoordinates = getRoutePointCoordinates(nextRoutePointDrafts);

      onRoutePointDraftsChangeRef.current(nextRoutePointDrafts);
      routeCoordinatesRef.current = nextCoordinates;
      updateGeoJsonSource(map, ROUTE_SOURCE_ID, createRouteGeoJson(nextCoordinates));
      syncRouteOverlay(map, nextCoordinates, setRouteOverlayPoints);
      clearDraftRouteOverlay();
    });
    map.on('mousemove', (event: MapMouseEvent) => {
      if (modeRef.current !== 'route') {
        clearDraftRouteOverlay();
        return;
      }

      const coordinates = getRoutePointCoordinates(routePointDraftsRef.current);
      const lastCoordinate = coordinates[coordinates.length - 1];
      if (!lastCoordinate) {
        clearDraftRouteOverlay();
        return;
      }

      const draftCoordinates = [lastCoordinate, [event.lngLat.lng, event.lngLat.lat]];
      updateGeoJsonSource(map, DRAFT_ROUTE_SOURCE_ID, createRouteGeoJson(draftCoordinates));
      setDraftOverlayPoints(projectCoordinates(map, draftCoordinates));
    });
    map.getContainer().addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (previewTimerRef.current !== null) {
        window.clearTimeout(previewTimerRef.current);
      }
      map.off('move', syncCurrentRouteOverlay);
      map.off('zoom', syncCurrentRouteOverlay);
      map.off('resize', syncCurrentRouteOverlay);
      map.getContainer().removeEventListener('mouseleave', handleMouseLeave);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [mapCenter, mapZoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) {
      return;
    }

    map.flyTo({ center: mapCenter, zoom: mapZoom });
  }, [isMapReady, mapCenter, mapZoom]);

  useEffect(() => {
    // Esc → «Просмотр» (ТЗ v3.5 §3 П-04). Отменяет прежнее решение ТЗ v3.2 §A7,
    // где Esc возвращал режим «Станция»: заказчик развернул его 26.08.
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

    updateGeoJsonSource(map, ROUTE_SOURCE_ID, createRouteGeoJson(routeCoordinates));
    updateGeoJsonSource(map, STATION_SOURCE_ID, createPointGeoJson(stationCoordinates));
    updateGeoJsonSource(map, ROUTE_POINT_SOURCE_ID, createPointGeoJson(routePointCoordinates));
    routeCoordinatesRef.current = routeCoordinates;
    syncRouteOverlay(map, routeCoordinates, setRouteOverlayPoints);
    schedulePreviewCapture(map, onPreviewImageChangeRef, previewTimerRef, stations, routeCoordinates);
  }, [isMapReady, routeCoordinates, routePointCoordinates, stationCoordinates]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [
      ...stations.flatMap((station) => createStationMarker(map, station)),
      ...routePointDrafts.flatMap((routePointDraft, index) => createRoutePointMarker(map, routePointDraft, index)),
    ];
  }, [activeStationLabel, isMapReady, mode, onActiveStationChange, onRoutePointDraftsChange, onStationChange, routePointDrafts, stations]);

  function createStationMarker(map: MapLibreMap, station: Pz1StationDraft) {
    if (!station.enabled) {
      return [];
    }

    const coordinates = parseLngLat(station);
    if (!coordinates) {
      return [];
    }

    const element = document.createElement('button');
    element.className = `maplibre-marker maplibre-marker--station ${station.label === activeStationLabel ? 'is-active' : ''}`;
    element.textContent = station.label;
    element.type = 'button';
    element.title = `Станция ${station.label}: ${station.name || 'без названия'}`;
    element.addEventListener('click', (event) => {
      event.stopPropagation();
      onActiveStationChange(station.label);
    });

    const marker = new maplibregl.Marker({ element, draggable: mode !== 'view' })
      .setLngLat(coordinates)
      .addTo(map);

    marker.on('dragend', () => {
      const lngLat = marker.getLngLat();
      onStationChange(station.label, {
        enabled: true,
        lat: lngLat.lat.toFixed(5),
        lng: lngLat.lng.toFixed(5),
      });
    });

    return [marker];
  }

  function createRoutePointMarker(map: MapLibreMap, routePointDraft: Pz1RoutePointDraft, index: number) {
    const coordinates = parseLngLat(routePointDraft);
    if (!coordinates) {
      return [];
    }

    const element = document.createElement('button');
    element.className = 'maplibre-marker maplibre-marker--route';
    element.textContent = String(index + 1);
    element.type = 'button';
    element.title = `Точка линии ${index + 1}. Двойной клик удаляет точку.`;
    element.addEventListener('click', (event) => event.stopPropagation());
    element.addEventListener('dblclick', (event) => {
      event.stopPropagation();
      if (modeRef.current === 'view') {
        return;
      }
      onRoutePointDraftsChange(routePointDrafts.filter((point) => point.id !== routePointDraft.id));
    });

    const marker = new maplibregl.Marker({ element, draggable: mode !== 'view' })
      .setLngLat(coordinates)
      .addTo(map);

    marker.on('dragend', () => {
      const lngLat = marker.getLngLat();
      onRoutePointDraftsChange(
        routePointDrafts.map((point) =>
          point.id === routePointDraft.id
            ? { ...point, lat: lngLat.lat.toFixed(5), lng: lngLat.lng.toFixed(5) }
            : point,
        ),
      );
    });

    return [marker];
  }

  function updateSegmentBendMeters(pointIndex: number, value: string) {
    onRoutePointDraftsChange(
      routePointDrafts.map((point, index) => (index === pointIndex ? { ...point, bendM: value } : point)),
    );
  }

  function deleteRouteSegment(segmentIndex: number) {
    if (routePointDrafts.length <= 2) {
      onRoutePointDraftsChange([]);
      setSelectedSegmentId('');
      return;
    }

    const pointIndexToRemove = segmentIndex === 0 ? 0 : segmentIndex + 1;
    onRoutePointDraftsChange(routePointDrafts.filter((_, index) => index !== pointIndexToRemove));
    setSelectedSegmentId('');
  }

  function focusRoute() {
    const coordinates = [
      ...stations.filter((station) => station.enabled).map(parseLngLat).filter((point): point is [number, number] => point !== null),
      ...routePointDrafts.map(parseLngLat).filter((point): point is [number, number] => point !== null),
    ];

    const map = mapRef.current;
    if (!map || coordinates.length === 0) {
      // Возвращаемся к виду своего варианта, а не к общей для всех точке:
      // раньше здесь стояла константа под Великим Новгородом, и «Центр» на
      // пустой карте уводил студента за тысячи километров от его городов.
      map?.flyTo({ center: mapCenter, zoom: mapZoom });
      return;
    }

    const bounds = coordinates.reduce(
      (currentBounds, coordinate) => currentBounds.extend(coordinate),
      new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
    );

    map.fitBounds(bounds, { padding: 80, maxZoom: 11 });
  }

  return (
    <section className="osm-map-card" aria-label="Карта MapLibre для выбора станций">
      <div className="osm-map-card__head">
        <div>
          <p className="eyebrow">Карта трассы</p>
          <h3>Трасса и станции</h3>
        </div>
        <div className="osm-map-actions">
          <div className="segmented-control segmented-control--map-tools" aria-label="Режим редактирования карты">
            <button className={mode === 'view' ? 'is-active' : ''} onClick={() => setMode('view')} type="button">
              Просмотр
            </button>
            <button className={mode === 'station' ? 'is-active' : ''} onClick={() => setMode('station')} type="button">
              Станция
            </button>
            <button className={mode === 'route' ? 'is-active' : ''} onClick={() => setMode('route')} type="button">
              Линия трассы
            </button>
            <button onClick={focusRoute} type="button">
              Центр
            </button>
          </div>
        </div>
      </div>

      <div className="maplibre-stage">
        <div className="maplibre-container" ref={containerRef} />
        <svg className="route-svg-overlay" aria-hidden="true">
          {routeOverlayPoints.length >= 2 ? (
            <polyline className="route-svg-overlay__line" points={formatScreenPoints(routeOverlayPoints)} />
          ) : null}
          {draftOverlayPoints.length >= 2 ? (
            <polyline className="route-svg-overlay__draft" points={formatScreenPoints(draftOverlayPoints)} />
          ) : null}
        </svg>
        {!isMapReady ? <div className="osm-map-empty">Загружаем карту…</div> : null}
        <div className="maplibre-zoom-panel" aria-label="Масштаб карты">
          <button aria-label="Приблизить карту" onClick={() => mapRef.current?.zoomIn()} type="button">
            +
          </button>
          <button aria-label="Отдалить карту" onClick={() => mapRef.current?.zoomOut()} type="button">
            −
          </button>
        </div>
        <div className="route-length-panel">
          <span>Длина трассы</span>
          <strong>{formatKm(routeMetrics.totalLengthKm)}</strong>
        </div>
      </div>

      <div className="osm-map-stations" aria-label="Выбор активной станции">
        {stations.map((station) => (
          <button
            className={`osm-map-station ${station.label === activeStationLabel ? 'is-active' : ''} ${
              station.enabled ? '' : 'is-muted'
            }`}
            key={station.label}
            onClick={() => onActiveStationChange(station.label)}
            type="button"
          >
            <strong>{station.label}</strong>
            <span>{station.name || (station.enabled ? 'Название не задано' : 'Не включена')}</span>
          </button>
        ))}
      </div>

      <div className="route-segments-panel">
        <div>
          <p className="eyebrow">Сегменты трассы</p>
          <h4>Прямые вставки и кривые</h4>
        </div>
        {routeLine.segments.length === 0 ? (
          <p className="osm-map-hint">Добавьте минимум две точки линии, чтобы появились сегменты и длина трассы.</p>
        ) : null}
        {routeLine.segments.map((segment, index) => {
          const metrics = routeSegmentById.get(segment.id);

          return (
            <div
              className={`route-segment-row ${selectedSegmentId === segment.id ? 'is-active' : ''}`}
              key={segment.id}
              onClick={() => setSelectedSegmentId(segment.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedSegmentId(segment.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <span>Сегмент {index + 1}</span>
              <label onClick={(event) => event.stopPropagation()}>
                Радиус между точками, м
                <input
                  inputMode="numeric"
                  onChange={(event) => updateSegmentBendMeters(index, event.target.value)}
                  value={routePointDrafts[index]?.bendM ?? String(Number(routePointDrafts[index]?.sagittaToNextKm ?? 0) * 1000)}
                />
              </label>
              <small>Радиус: {metrics?.radiusKm ? formatKm(metrics.radiusKm) : 'прямая'}</small>
              <small>Длина: {metrics ? formatKm(metrics.arcLengthKm) : 'не рассчитано'}</small>
              <button
                aria-label={`Удалить сегмент ${index + 1}`}
                className="route-segment-row__delete"
                onClick={(event) => {
                  event.stopPropagation();
                  deleteRouteSegment(index);
                }}
                type="button"
              >
                Удалить
              </button>
            </div>
          );
        })}
      </div>

      <p className="osm-map-hint">
        {mode === 'view'
          ? 'Режим просмотра: можно двигать и масштабировать карту, объекты не создаются и не перетаскиваются.'
          : mode === 'station'
            ? `Кликните по карте, чтобы поставить станцию. Перетащите поставленную, чтобы подвинуть. Активна станция ${activeStation?.label}. Esc — вернуться в просмотр.`
            : 'Кликните, чтобы добавить точку линии. Ведите линию в обход водоёмов и возвышенностей. Esc — вернуться в просмотр.'}
      </p>
    </section>
  );
}

function ensureMapLayers(map: MapLibreMap) {
  ensureRouteLayer(map);
  ensureDraftRouteLayer(map);
  ensurePointLayer(map, STATION_SOURCE_ID, STATION_LAYER_ID, '#003D84', 9);
  ensurePointLayer(map, ROUTE_POINT_SOURCE_ID, ROUTE_POINT_LAYER_ID, '#E0182D', 5);
}

function ensureRouteLayer(map: MapLibreMap) {
  if (!map.getSource(ROUTE_SOURCE_ID)) {
    map.addSource(ROUTE_SOURCE_ID, {
      type: 'geojson',
      data: createRouteGeoJson([]),
    });
  }

  if (!map.getLayer(ROUTE_LAYER_ID)) {
    map.addLayer({
      id: ROUTE_LAYER_ID,
      type: 'line',
      source: ROUTE_SOURCE_ID,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#E0182D',
        'line-width': 5,
        'line-opacity': 0.95,
      },
    });
  }
}

function ensureDraftRouteLayer(map: MapLibreMap) {
  if (!map.getSource(DRAFT_ROUTE_SOURCE_ID)) {
    map.addSource(DRAFT_ROUTE_SOURCE_ID, {
      type: 'geojson',
      data: createRouteGeoJson([]),
    });
  }

  if (!map.getLayer(DRAFT_ROUTE_LAYER_ID)) {
    map.addLayer({
      id: DRAFT_ROUTE_LAYER_ID,
      type: 'line',
      source: DRAFT_ROUTE_SOURCE_ID,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#E0182D',
        'line-dasharray': [1.5, 1.5],
        'line-width': 4,
        'line-opacity': 0.7,
      },
    });
  }
}

function ensurePointLayer(map: MapLibreMap, sourceId: string, layerId: string, color: string, radius: number) {
  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: 'geojson',
      data: createPointGeoJson([]),
    });
  }

  if (!map.getLayer(layerId)) {
    map.addLayer({
      id: layerId,
      type: 'circle',
      source: sourceId,
      paint: {
        'circle-color': color,
        'circle-radius': radius,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      },
    });
  }
}

function updateGeoJsonSource(
  map: MapLibreMap,
  sourceId: string,
  data: GeoJSON.FeatureCollection<GeoJSON.Geometry>,
) {
  const source = map.getSource(sourceId);

  if (source) {
    (source as GeoJSONSource).setData(data);
  }
}

/** Максимальная ширина снимка карты для отчёта — чтобы PNG в JSON-мосте
 *  не разрастался на экранах с большим devicePixelRatio. */
const PREVIEW_MAX_WIDTH = 1200;
/* Пропорции снимка берутся от самой карты, но зажимаются в разумные рамки:
   в узком окне карта не должна уезжать в квадрат, в широком — в полоску.
   Внутри этого коридора кадр совпадает с экранным один в один, и обрезать
   нечего: станции стоят у самых краёв карты, и любой кроп срезает их первыми. */
const PREVIEW_MIN_ASPECT = 1.4;
const PREVIEW_MAX_ASPECT = 2;

/**
 * Снимок карты для PDF: подложка с тайлами, линия трассы и метки станций —
 * всё в одной картинке и в одной проекции.
 *
 * Раньше в отчёт уходил голый снимок GL-канвы, а станции и трассу PDF дорисовывал
 * поверх собственной линейной проекцией «долгота/широта → прямоугольник». С
 * веб-меркатором снимка она не совпадает, поэтому подпись «кривая карта» в
 * отчёте была честной. Теперь трасса и метки проецируются тем же map.project(),
 * что и сама карта, — совпадение по построению, дорисовывать поверх нечего.
 *
 * Трасса и станции рисуются вручную, а не берутся из GL-снимка: станции MapLibre
 * держит DOM-элементами поверх канвы, а линия трассы в сохранённый кадр буфера
 * попадает не всегда. Ручная отрисовка не зависит от того, какой кадр GL успел
 * оставить в буфере.
 */
function schedulePreviewCapture(
  map: MapLibreMap,
  onPreviewImageChangeRef: MutableRefObject<(previewImage: string) => void>,
  previewTimerRef: MutableRefObject<number | null>,
  stations: Pz1StationDraft[],
  routeCoordinates: number[][],
) {
  if (previewTimerRef.current !== null) {
    window.clearTimeout(previewTimerRef.current);
  }

  previewTimerRef.current = window.setTimeout(() => {
    try {
      const preview = composeMapPreview(map, stations, routeCoordinates);

      if (preview) {
        onPreviewImageChangeRef.current(preview);
      }
    } catch {
      // Канва испорчена сторонними тайлами без CORS — оставляем прошлый снимок.
    }
  }, 300);
}

function composeMapPreview(
  map: MapLibreMap,
  stations: Pz1StationDraft[],
  routeCoordinates: number[][],
): string | null {
  const source = map.getCanvas();

  if (source.width === 0 || source.height === 0) {
    return null;
  }

  const aspect = Math.min(Math.max(source.width / source.height, PREVIEW_MIN_ASPECT), PREVIEW_MAX_ASPECT);
  const targetWidth = Math.round(Math.min(source.width, PREVIEW_MAX_WIDTH));
  const targetHeight = Math.round(targetWidth / aspect);

  const target = document.createElement('canvas');
  target.width = targetWidth;
  target.height = targetHeight;

  const context = target.getContext('2d');
  if (!context) {
    return null;
  }

  // Вписываем снимок целиком: обрезка кадра съедала бы станции, которые почти
  // всегда стоят у самого края карты.
  const scale = Math.min(targetWidth / source.width, targetHeight / source.height);
  const drawWidth = source.width * scale;
  const drawHeight = source.height * scale;
  const offsetX = (targetWidth - drawWidth) / 2;
  const offsetY = (targetHeight - drawHeight) / 2;

  context.drawImage(source, offsetX, offsetY, drawWidth, drawHeight);
  fillPreviewMargins(context, target, { offsetX, offsetY, drawWidth, drawHeight });

  // map.project даёт CSS-пиксели, канва — пиксели устройства: переводим тем же
  // множителем, что и при отрисовке снимка.
  const pixelRatio = source.width / source.clientWidth || 1;
  const toPreviewPoint = (coordinates: [number, number]) => {
    const projected = map.project(coordinates);

    return {
      x: offsetX + projected.x * pixelRatio * scale,
      y: offsetY + projected.y * pixelRatio * scale,
    };
  };

  context.save();
  context.beginPath();
  context.rect(offsetX, offsetY, drawWidth, drawHeight);
  context.clip();

  drawPreviewRoute(context, routeCoordinates.filter(isValidLngLatPair).map(([lng, lat]) => toPreviewPoint([lng, lat])));

  for (const station of stations) {
    if (!station.enabled) {
      continue;
    }

    const point = parseLngLat(station);
    if (!point) {
      continue;
    }

    drawPreviewStation(context, toPreviewPoint(point), station.label);
  }

  context.restore();

  return target.toDataURL('image/png');
}

/**
 * Закрашивает поля, оставшиеся от вписывания снимка, цветом самой карты.
 * Поля появляются только на нетипично широком или узком окне; серые полосы
 * в отчёте выглядели бы браком вёрстки, подложка карты — нет.
 */
function fillPreviewMargins(
  context: CanvasRenderingContext2D,
  target: HTMLCanvasElement,
  frame: { offsetX: number; offsetY: number; drawWidth: number; drawHeight: number },
) {
  const { offsetX, offsetY, drawWidth, drawHeight } = frame;

  if (offsetX < 1 && offsetY < 1) {
    return;
  }

  const sample = context.getImageData(Math.round(offsetX) + 1, Math.round(offsetY) + 1, 1, 1).data;
  context.fillStyle = `rgb(${sample[0]}, ${sample[1]}, ${sample[2]})`;

  if (offsetY >= 1) {
    context.fillRect(0, 0, target.width, offsetY);
    context.fillRect(0, offsetY + drawHeight, target.width, target.height - offsetY - drawHeight);
  }

  if (offsetX >= 1) {
    context.fillRect(0, 0, offsetX, target.height);
    context.fillRect(offsetX + drawWidth, 0, target.width - offsetX - drawWidth, target.height);
  }
}

function drawPreviewRoute(context: CanvasRenderingContext2D, points: ScreenPoint[]) {
  if (points.length < 2) {
    return;
  }

  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
  context.lineCap = 'round';
  context.lineJoin = 'round';
  // Белая подложка под линией: на пёстрых тайлах красная трасса без неё
  // теряется среди дорог такого же цвета.
  context.strokeStyle = '#ffffff';
  context.lineWidth = 9;
  context.stroke();
  context.strokeStyle = '#E0182D';
  context.lineWidth = 5;
  context.stroke();
}

function drawPreviewStation(context: CanvasRenderingContext2D, point: ScreenPoint, label: string) {
  context.beginPath();
  context.arc(point.x, point.y, 12, 0, Math.PI * 2);
  context.fillStyle = '#003D84';
  context.fill();
  context.lineWidth = 3;
  context.strokeStyle = '#ffffff';
  context.stroke();

  context.fillStyle = '#ffffff';
  context.font = '800 14px Raleway, Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, point.x, point.y + 1);
}

function clearDraftRoute(map: MapLibreMap) {
  updateGeoJsonSource(map, DRAFT_ROUTE_SOURCE_ID, createRouteGeoJson([]));
}

function syncRouteOverlay(
  map: MapLibreMap,
  coordinates: number[][],
  setRouteOverlayPoints: Dispatch<SetStateAction<ScreenPoint[]>>,
) {
  setRouteOverlayPoints(projectCoordinates(map, coordinates));
}

function projectCoordinates(map: MapLibreMap, coordinates: number[][]): ScreenPoint[] {
  return coordinates
    .filter(isValidLngLatPair)
    .flatMap(([lng, lat]) => {
      try {
        const point = map.project([lng, lat]);
        return Number.isFinite(point.x) && Number.isFinite(point.y) ? [{ x: point.x, y: point.y }] : [];
      } catch {
        return [];
      }
    });
}

function formatScreenPoints(points: ScreenPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

function getRoutePointCoordinates(routePointDrafts: Pz1RoutePointDraft[]) {
  return routePointDrafts.map(parseLngLat).filter((point): point is [number, number] => point !== null);
}

function createRouteGeoJson(coordinates: number[][]): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  const validCoordinates = coordinates.filter(isValidLngLatPair);

  return {
    type: 'FeatureCollection',
    features:
      validCoordinates.length >= 2
        ? [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: validCoordinates,
              },
            },
          ]
        : [],
  };
}

function createPointGeoJson(coordinates: number[][]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: coordinates.filter(isValidLngLatPair).map((coordinate) => ({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: coordinate,
      },
    })),
  };
}

function parseLngLat(point: { lat: string; lng: string }): [number, number] | null {
  const lat = parseCoordinate(point.lat);
  const lng = parseCoordinate(point.lng);

  return lat === null || lng === null || !isValidLngLat(lng, lat) ? null : [lng, lat];
}

function parseCoordinate(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function isValidLngLatPair(coordinates: number[]): coordinates is [number, number] {
  const [lng, lat] = coordinates;
  return isValidLngLat(lng, lat);
}

function isValidLngLat(lng: number, lat: number) {
  return Number.isFinite(lng) && Number.isFinite(lat) && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
}

function formatKm(value: number) {
  if (value <= 0) {
    return 'не рассчитано';
  }

  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)} км`;
}
