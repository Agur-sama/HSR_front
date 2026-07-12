import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent, WheelEvent } from 'react';
import type { Pz1RoutePointDraft, Pz1StationDraft } from './types';

const TILE_SIZE = 256;
const DEFAULT_CENTER: LatLng = { lat: 58.1, lng: 34.8 };
const DEFAULT_ZOOM = 6;
const MIN_ZOOM = 4;
const MAX_ZOOM = 19;
const MAX_MERCATOR_LAT = 85.05112878;

interface LatLng {
  lat: number;
  lng: number;
}

interface Point {
  x: number;
  y: number;
}

interface MapSize {
  width: number;
  height: number;
}

interface TileDescriptor {
  key: string;
  url: string;
  left: number;
  top: number;
}

interface StationPoint {
  station: Pz1StationDraft;
  position: Point;
  latLng: LatLng;
}

interface RoutePoint {
  routePointDraft: Pz1RoutePointDraft;
  position: Point;
  latLng: LatLng;
}

type MapMode = 'station' | 'route';

type DragState =
  | {
      kind: 'pan';
      pointerId: number;
      startX: number;
      startY: number;
      centerWorld: Point;
    }
  | {
      kind: 'station';
      pointerId: number;
      label: Pz1StationDraft['label'];
    }
  | {
      kind: 'route';
      pointerId: number;
      id: string;
    };

interface OsmStationMapProps {
  activeStationLabel: Pz1StationDraft['label'];
  onActiveStationChange: (label: Pz1StationDraft['label']) => void;
  onRoutePointDraftsChange: (routePointDrafts: Pz1RoutePointDraft[]) => void;
  onStationChange: (label: Pz1StationDraft['label'], patch: Partial<Pz1StationDraft>) => void;
  routePointDrafts: Pz1RoutePointDraft[];
  stations: Pz1StationDraft[];
}

export function OsmStationMap({
  activeStationLabel,
  onActiveStationChange,
  onRoutePointDraftsChange,
  onStationChange,
  routePointDrafts,
  stations,
}: OsmStationMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const dragMovedRef = useRef(false);
  const [mode, setMode] = useState<MapMode>('station');
  const [size, setSize] = useState<MapSize>({ width: 640, height: 360 });
  const [center, setCenter] = useState<LatLng>(() => getInitialCenter(stations));
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const centerWorld = useMemo(() => latLngToWorld(center, zoom), [center, zoom]);
  const tiles = useMemo(() => getVisibleTiles(centerWorld, size, zoom), [centerWorld, size, zoom]);
  const stationPoints = useMemo(
    () => getStationPoints(stations, centerWorld, size, zoom),
    [centerWorld, size, stations, zoom],
  );
  const routePoints = useMemo(
    () => getRoutePoints(routePointDrafts, centerWorld, size, zoom),
    [centerWorld, routePointDrafts, size, zoom],
  );
  const routePolyline = routePoints
    .map(({ position }) => `${position.x},${position.y}`)
    .join(' ');
  const activeStation = stations.find((station) => station.label === activeStationLabel) ?? stations[0];

  useEffect(() => {
    const node = mapRef.current;

    if (!node) {
      return undefined;
    }

    function updateSize() {
      setSize({
        width: Math.max(node?.clientWidth ?? 0, 320),
        height: Math.max(node?.clientHeight ?? 0, 260),
      });
    }

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  function placeActiveStation(latLng: LatLng) {
    onStationChange(activeStationLabel, {
      enabled: true,
      lat: latLng.lat.toFixed(5),
      lng: normalizeLng(latLng.lng).toFixed(5),
    });
  }

  function addRoutePoint(latLng: LatLng) {
    onRoutePointDraftsChange([
      ...routePointDrafts,
      {
        id: `route-point-${Date.now()}-${routePointDrafts.length}`,
        lat: latLng.lat.toFixed(5),
        lng: normalizeLng(latLng.lng).toFixed(5),
      },
    ]);
  }

  function updateRoutePoint(id: string, latLng: LatLng) {
    onRoutePointDraftsChange(
      routePointDrafts.map((routePointDraft) =>
        routePointDraft.id === id
          ? {
              ...routePointDraft,
              lat: latLng.lat.toFixed(5),
              lng: normalizeLng(latLng.lng).toFixed(5),
            }
          : routePointDraft,
      ),
    );
  }

  function removeRoutePoint(id: string) {
    onRoutePointDraftsChange(routePointDrafts.filter((routePointDraft) => routePointDraft.id !== id));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    dragMovedRef.current = false;
    dragStateRef.current = {
      kind: 'pan',
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      centerWorld,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (dragState.kind === 'station') {
      dragMovedRef.current = true;
      placeStationByPointer(dragState.label, event);
      return;
    }

    if (dragState.kind === 'route') {
      dragMovedRef.current = true;
      updateRoutePoint(dragState.id, getLatLngByPointer(event));
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      dragMovedRef.current = true;
    }

    setCenter(
      worldToLatLng(
        {
          x: dragState.centerWorld.x - deltaX,
          y: dragState.centerWorld.y - deltaY,
        },
        zoom,
      ),
    );
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleMapClick(event: MouseEvent<HTMLDivElement>) {
    if (dragMovedRef.current) {
      dragMovedRef.current = false;
      return;
    }

    const latLng = getLatLngByPointer(event);
    if (mode === 'station') {
      placeActiveStation(latLng);
      return;
    }

    addRoutePoint(latLng);
  }

  function startStationDrag(label: Pz1StationDraft['label'], event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragMovedRef.current = false;
    dragStateRef.current = { kind: 'station', pointerId: event.pointerId, label };
    mapRef.current?.setPointerCapture(event.pointerId);
    onActiveStationChange(label);
  }

  function startRouteDrag(id: string, event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragMovedRef.current = false;
    dragStateRef.current = { kind: 'route', pointerId: event.pointerId, id };
    mapRef.current?.setPointerCapture(event.pointerId);
  }

  function zoomAtPoint(nextZoom: number, anchorPoint: Point) {
    const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);

    if (clampedZoom === zoom) {
      return;
    }

    const anchorWorld = {
      x: centerWorld.x + anchorPoint.x - size.width / 2,
      y: centerWorld.y + anchorPoint.y - size.height / 2,
    };
    const anchorLatLng = worldToLatLng(anchorWorld, zoom);
    const anchorWorldAtNextZoom = latLngToWorld(anchorLatLng, clampedZoom);
    const nextCenterWorld = {
      x: anchorWorldAtNextZoom.x - anchorPoint.x + size.width / 2,
      y: anchorWorldAtNextZoom.y - anchorPoint.y + size.height / 2,
    };

    setCenter(worldToLatLng(nextCenterWorld, clampedZoom));
    setZoom(clampedZoom);
  }

  function changeZoom(nextZoom: number) {
    zoomAtPoint(nextZoom, {
      x: size.width / 2,
      y: size.height / 2,
    });
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    const direction = event.deltaY < 0 ? 1 : -1;
    zoomAtPoint(zoom + direction, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }

  function focusStations() {
    const placedStations = stations
      .map((station) => parseStationLatLng(station))
      .filter((latLng): latLng is LatLng => latLng !== null);

    if (placedStations.length === 0) {
      setCenter(DEFAULT_CENTER);
      setZoom(DEFAULT_ZOOM);
      return;
    }

    setCenter(getAverageCenter(placedStations));
  }

  function getLatLngByPointer(event: MouseEvent<HTMLDivElement> | PointerEvent<HTMLDivElement>) {
    const node = mapRef.current;
    const rect = node?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
    const point = {
      x: centerWorld.x + event.clientX - rect.left - size.width / 2,
      y: centerWorld.y + event.clientY - rect.top - size.height / 2,
    };

    return worldToLatLng(point, zoom);
  }

  function placeStationByPointer(label: Pz1StationDraft['label'], event: PointerEvent<HTMLDivElement>) {
    const latLng = getLatLngByPointer(event);
    onStationChange(label, {
      enabled: true,
      lat: latLng.lat.toFixed(5),
      lng: normalizeLng(latLng.lng).toFixed(5),
    });
  }

  return (
    <section className="osm-map-card" aria-label="Карта OpenStreetMap для выбора станций">
      <div className="osm-map-card__head">
        <div>
          <p className="eyebrow">OpenStreetMap</p>
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
          <button className="button button--ghost" onClick={focusStations} type="button">
            Центр
          </button>
          <button className="button button--ghost" disabled={zoom <= MIN_ZOOM} onClick={() => changeZoom(zoom - 1)} type="button">
            −
          </button>
          <span>{zoom}</span>
          <button className="button button--ghost" disabled={zoom >= MAX_ZOOM} onClick={() => changeZoom(zoom + 1)} type="button">
            +
          </button>
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

      <div
        className="osm-map-stage"
        onClick={handleMapClick}
        onPointerCancel={handlePointerUp}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        ref={mapRef}
        role="application"
        tabIndex={0}
      >
        <div
          className="osm-map-zoom"
          aria-label="Масштаб карты"
          onClick={(event) => event.stopPropagation()}
          onPointerCancel={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerMove={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onWheel={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <button
            aria-label="Приблизить карту"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => changeZoom(zoom + 1)}
            type="button"
          >
            +
          </button>
          <button
            aria-label="Отдалить карту"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => changeZoom(zoom - 1)}
            type="button"
          >
            −
          </button>
        </div>
        <div className="osm-map-tiles" aria-hidden="true">
          {tiles.map((tile) => (
            <img
              alt=""
              draggable={false}
              key={tile.key}
              src={tile.url}
              style={{ left: tile.left, top: tile.top }}
            />
          ))}
        </div>
        <svg className="osm-map-route" viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true">
          {routePolyline ? <polyline points={routePolyline} /> : null}
        </svg>
        {mode === 'station' && stationPoints.length === 0 ? (
          <div className="osm-map-empty">
            <strong>Станции пока не назначены</strong>
            <span>Кликните по карте, чтобы поставить первую станцию (А)</span>
          </div>
        ) : null}
        {mode === 'route' && routePoints.length === 0 ? (
          <div className="osm-map-empty">
            <strong>Линия не проложена</strong>
            <span>Добавьте точки, чтобы проложить трассу между станциями</span>
          </div>
        ) : null}
        {stationPoints.map(({ position, station }) => (
          <button
            className={`osm-map-marker ${station.label === activeStationLabel ? 'is-active' : ''}`}
            key={station.label}
            onClick={(event) => {
              event.stopPropagation();
              onActiveStationChange(station.label);
            }}
            onPointerDown={(event) => startStationDrag(station.label, event)}
            style={{ left: position.x, top: position.y }}
            title={`Станция ${station.label}: ${station.name || 'без названия'}`}
            type="button"
          >
            {station.label}
          </button>
        ))}
        {routePoints.map(({ position, routePointDraft }, index) => (
          <button
            className="osm-map-route-point"
            key={routePointDraft.id}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => {
              event.stopPropagation();
              removeRoutePoint(routePointDraft.id);
            }}
            onPointerDown={(event) => startRouteDrag(routePointDraft.id, event)}
            style={{ left: position.x, top: position.y }}
            title={`Точка линии ${index + 1}. Двойной клик удаляет точку.`}
            type="button"
          >
            {index + 1}
          </button>
        ))}
        <div className="osm-map-attribution">© OpenStreetMap contributors</div>
      </div>

      <p className="osm-map-hint">
        {mode === 'station'
          ? `Кликните по карте, чтобы поставить станцию. Перетащите поставленную, чтобы подвинуть. Активна станция ${activeStation?.label}.`
          : 'Кликните, чтобы добавить точку линии. Ведите линию в обход водоёмов и возвышенностей.'}{' '}
        Используйте +/− или колесо мыши для масштаба.
      </p>
    </section>
  );
}

function getInitialCenter(stations: Pz1StationDraft[]) {
  const placedStations = stations
    .map((station) => parseStationLatLng(station))
    .filter((latLng): latLng is LatLng => latLng !== null);

  return placedStations.length > 0 ? getAverageCenter(placedStations) : DEFAULT_CENTER;
}

function getAverageCenter(points: LatLng[]) {
  const sum = points.reduce(
    (accumulator, point) => ({
      lat: accumulator.lat + point.lat,
      lng: accumulator.lng + point.lng,
    }),
    { lat: 0, lng: 0 },
  );

  return {
    lat: sum.lat / points.length,
    lng: sum.lng / points.length,
  };
}

function getVisibleTiles(centerWorld: Point, size: MapSize, zoom: number): TileDescriptor[] {
  const tileCount = 2 ** zoom;
  const minTileX = Math.floor((centerWorld.x - size.width / 2) / TILE_SIZE);
  const maxTileX = Math.floor((centerWorld.x + size.width / 2) / TILE_SIZE);
  const minTileY = Math.floor((centerWorld.y - size.height / 2) / TILE_SIZE);
  const maxTileY = Math.floor((centerWorld.y + size.height / 2) / TILE_SIZE);
  const tiles: TileDescriptor[] = [];

  for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
    if (tileY < 0 || tileY >= tileCount) {
      continue;
    }

    for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
      const wrappedTileX = wrapTileX(tileX, tileCount);
      tiles.push({
        key: `${tileX}:${tileY}`,
        url: `https://tile.openstreetmap.org/${zoom}/${wrappedTileX}/${tileY}.png`,
        left: tileX * TILE_SIZE - centerWorld.x + size.width / 2,
        top: tileY * TILE_SIZE - centerWorld.y + size.height / 2,
      });
    }
  }

  return tiles;
}

function getStationPoints(stations: Pz1StationDraft[], centerWorld: Point, size: MapSize, zoom: number): StationPoint[] {
  return stations.flatMap((station) => {
    if (!station.enabled) {
      return [];
    }

    const latLng = parseStationLatLng(station);

    if (!latLng) {
      return [];
    }

    const world = latLngToWorld(latLng, zoom);
    const position = {
      x: world.x - centerWorld.x + size.width / 2,
      y: world.y - centerWorld.y + size.height / 2,
    };

    return [{ station, position, latLng }];
  });
}

function getRoutePoints(
  routePointDrafts: Pz1RoutePointDraft[],
  centerWorld: Point,
  size: MapSize,
  zoom: number,
): RoutePoint[] {
  return routePointDrafts.flatMap((routePointDraft) => {
    const latLng = parseRoutePointLatLng(routePointDraft);

    if (!latLng) {
      return [];
    }

    const world = latLngToWorld(latLng, zoom);
    const position = {
      x: world.x - centerWorld.x + size.width / 2,
      y: world.y - centerWorld.y + size.height / 2,
    };

    return [{ routePointDraft, position, latLng }];
  });
}

function parseStationLatLng(station: Pz1StationDraft): LatLng | null {
  const lat = parseCoordinate(station.lat);
  const lng = parseCoordinate(station.lng);

  if (lat === null || lng === null) {
    return null;
  }

  return {
    lat,
    lng,
  };
}

function parseRoutePointLatLng(routePointDraft: Pz1RoutePointDraft): LatLng | null {
  const lat = parseCoordinate(routePointDraft.lat);
  const lng = parseCoordinate(routePointDraft.lng);

  if (lat === null || lng === null) {
    return null;
  }

  return {
    lat,
    lng,
  };
}

function parseCoordinate(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function latLngToWorld(latLng: LatLng, zoom: number): Point {
  const scale = TILE_SIZE * 2 ** zoom;
  const lat = clamp(latLng.lat, -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT);
  const sinLat = Math.sin((lat * Math.PI) / 180);

  return {
    x: ((normalizeLng(latLng.lng) + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

function worldToLatLng(point: Point, zoom: number): LatLng {
  const scale = TILE_SIZE * 2 ** zoom;
  const lng = (point.x / scale) * 360 - 180;
  const mercatorY = Math.PI * (1 - (2 * point.y) / scale);
  const lat = (Math.atan(Math.sinh(mercatorY)) * 180) / Math.PI;

  return {
    lat: clamp(lat, -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT),
    lng: normalizeLng(lng),
  };
}

function wrapTileX(tileX: number, tileCount: number) {
  return ((tileX % tileCount) + tileCount) % tileCount;
}

function normalizeLng(lng: number) {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
