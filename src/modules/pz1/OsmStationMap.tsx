import { useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { buildDisplayRoutePoints } from '../../shared/lib/routeGeometry';
import type { RouteLineMetrics } from '../../shared/lib/routeGeometry';
import { createRouteLine } from './model';
import type { Pz1RoutePointDraft, Pz1StationDraft } from './types';

const DEFAULT_CENTER: [number, number] = [34.8, 58.1];
const DEFAULT_ZOOM = 6;
const MIN_ZOOM = 4;
const MAX_ZOOM = 19;
const ROUTE_SOURCE_ID = 'vsm-route-source';
const ROUTE_LAYER_ID = 'vsm-route-layer';
const STATION_SOURCE_ID = 'vsm-station-source';
const STATION_LAYER_ID = 'vsm-station-layer';
const ROUTE_POINT_SOURCE_ID = 'vsm-route-point-source';
const ROUTE_POINT_LAYER_ID = 'vsm-route-point-layer';

type MapMode = 'station' | 'route';

interface OsmStationMapProps {
  activeStationLabel: Pz1StationDraft['label'];
  onActiveStationChange: (label: Pz1StationDraft['label']) => void;
  onPreviewImageChange: (previewImage: string) => void;
  onRoutePointDraftsChange: (routePointDrafts: Pz1RoutePointDraft[]) => void;
  onStationChange: (label: Pz1StationDraft['label'], patch: Partial<Pz1StationDraft>) => void;
  routeMetrics: RouteLineMetrics;
  routePointDrafts: Pz1RoutePointDraft[];
  stations: Pz1StationDraft[];
}

export function OsmStationMap({
  activeStationLabel,
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
  const onPreviewImageChangeRef = useRef(onPreviewImageChange);
  const onRoutePointDraftsChangeRef = useRef(onRoutePointDraftsChange);
  const onStationChangeRef = useRef(onStationChange);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mode, setMode] = useState<MapMode>('station');
  const [selectedSegmentId, setSelectedSegmentId] = useState('');
  const routeLine = useMemo(() => createRouteLine(routePointDrafts), [routePointDrafts]);
  const routeCoordinates = useMemo(
    () => buildDisplayRoutePoints(routeLine).map((point) => [point.lon, point.lat]),
    [routeLine],
  );
  const stationCoordinates = useMemo(
    () => stations.filter((station) => station.enabled).map(parseLngLat).filter((point): point is [number, number] => point !== null),
    [stations],
  );
  const routePointCoordinates = useMemo(
    () => routePointDrafts.map(parseLngLat).filter((point): point is [number, number] => point !== null),
    [routePointDrafts],
  );
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
      center: DEFAULT_CENTER,
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
      zoom: DEFAULT_ZOOM,
    });

    mapRef.current = map;
    map.scrollZoom.enable();
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
    map.on('load', () => {
      ensureMapLayers(map);
      setIsMapReady(true);
    });
    map.on('click', (event: MapMouseEvent) => {
      if (modeRef.current === 'station') {
        onStationChangeRef.current(activeStationLabelRef.current, {
          enabled: true,
          lat: event.lngLat.lat.toFixed(5),
          lng: event.lngLat.lng.toFixed(5),
        });
        return;
      }

      onRoutePointDraftsChangeRef.current([
        ...routePointDraftsRef.current,
        {
          id: `route-point-${Date.now()}-${routePointDraftsRef.current.length}`,
          lat: event.lngLat.lat.toFixed(5),
          lng: event.lngLat.lng.toFixed(5),
          sagittaToNextKm: '0',
        },
      ]);
    });

    return () => {
      if (previewTimerRef.current !== null) {
        window.clearTimeout(previewTimerRef.current);
      }
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) {
      return;
    }

    updateGeoJsonSource(map, ROUTE_SOURCE_ID, createRouteGeoJson(routeCoordinates));
    updateGeoJsonSource(map, STATION_SOURCE_ID, createPointGeoJson(stationCoordinates));
    updateGeoJsonSource(map, ROUTE_POINT_SOURCE_ID, createPointGeoJson(routePointCoordinates));
    schedulePreviewCapture(map, onPreviewImageChangeRef, previewTimerRef);
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
  }, [activeStationLabel, isMapReady, onActiveStationChange, onRoutePointDraftsChange, onStationChange, routePointDrafts, stations]);

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

    const marker = new maplibregl.Marker({ element, draggable: true })
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
      onRoutePointDraftsChange(routePointDrafts.filter((point) => point.id !== routePointDraft.id));
    });

    const marker = new maplibregl.Marker({ element, draggable: true })
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

  function updateSegmentSagitta(pointIndex: number, value: string) {
    onRoutePointDraftsChange(
      routePointDrafts.map((point, index) => (index === pointIndex ? { ...point, sagittaToNextKm: value } : point)),
    );
  }

  function focusRoute() {
    const coordinates = [
      ...stations.filter((station) => station.enabled).map(parseLngLat).filter((point): point is [number, number] => point !== null),
      ...routePointDrafts.map(parseLngLat).filter((point): point is [number, number] => point !== null),
    ];

    const map = mapRef.current;
    if (!map || coordinates.length === 0) {
      map?.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
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
          <p className="eyebrow">MapLibre · OpenStreetMap</p>
          <h3>Трасса и станции</h3>
        </div>
        <div className="osm-map-actions">
          <div className="segmented-control" aria-label="Режим редактирования карты">
            <button className={mode === 'station' ? 'is-active' : ''} onClick={() => setMode('station')} type="button">
              Станция
            </button>
            <button className={mode === 'route' ? 'is-active' : ''} onClick={() => setMode('route')} type="button">
              Линия трассы
            </button>
          </div>
          <button className="button button--ghost" onClick={focusRoute} type="button">
            Центр
          </button>
        </div>
      </div>

      <div className="maplibre-stage">
        <div className="maplibre-container" ref={containerRef} />
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
            <button
              className={`route-segment-row ${selectedSegmentId === segment.id ? 'is-active' : ''}`}
              key={segment.id}
              onClick={() => setSelectedSegmentId(segment.id)}
              type="button"
            >
              <span>Сегмент {index + 1}</span>
              <label onClick={(event) => event.stopPropagation()}>
                Стрела прогиба, км
                <input
                  inputMode="decimal"
                  onChange={(event) => updateSegmentSagitta(index, event.target.value)}
                  value={routePointDrafts[index]?.sagittaToNextKm ?? '0'}
                />
              </label>
              <small>Радиус: {metrics?.radiusKm ? formatKm(metrics.radiusKm) : 'прямая'}</small>
              <small>Длина: {metrics ? formatKm(metrics.arcLengthKm) : 'не рассчитано'}</small>
            </button>
          );
        })}
      </div>

      <p className="osm-map-hint">
        {mode === 'station'
          ? `Кликните по карте, чтобы поставить станцию. Перетащите поставленную, чтобы подвинуть. Активна станция ${activeStation?.label}.`
          : 'Кликните, чтобы добавить точку линии. Ведите линию в обход водоёмов и возвышенностей.'}
      </p>
    </section>
  );
}

function ensureMapLayers(map: MapLibreMap) {
  ensureRouteLayer(map);
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

function schedulePreviewCapture(
  map: MapLibreMap,
  onPreviewImageChangeRef: MutableRefObject<(previewImage: string) => void>,
  previewTimerRef: MutableRefObject<number | null>,
) {
  if (previewTimerRef.current !== null) {
    window.clearTimeout(previewTimerRef.current);
  }

  previewTimerRef.current = window.setTimeout(() => {
    try {
      onPreviewImageChangeRef.current(map.getCanvas().toDataURL('image/png'));
    } catch {
      // If a tile provider taints the canvas, keep the previous preview image.
    }
  }, 300);
}

function createRouteGeoJson(coordinates: number[][]): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  return {
    type: 'FeatureCollection',
    features:
      coordinates.length >= 2
        ? [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates,
              },
            },
          ]
        : [],
  };
}

function createPointGeoJson(coordinates: number[][]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: coordinates.map((coordinate) => ({
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

  return lat === null || lng === null ? null : [lng, lat];
}

function parseCoordinate(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatKm(value: number) {
  if (value <= 0) {
    return 'не рассчитано';
  }

  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)} км`;
}
