import { Suspense, lazy } from 'react';
import { MapLoadingCard } from '../../shared/ui/MapLoadingCard';
import type { ComponentProps } from 'react';
import type { OsmStationMap as OsmStationMapComponent } from './OsmStationMap';

/**
 * Карта станций и трассы, подключаемая по требованию.
 *
 * MapLibre — самый тяжёлый кусок сборки, а карта живёт на одном шаге из
 * десяти. Интро, теория и остальные шаги открываются, не дожидаясь её.
 */
const StationMap = lazy(() => import('./OsmStationMap').then((module) => ({ default: module.OsmStationMap })));

export function OsmStationMap(props: ComponentProps<typeof OsmStationMapComponent>) {
  return (
    <Suspense fallback={<MapLoadingCard eyebrow="Карта трассы" title="Трасса и станции" />}>
      <StationMap {...props} />
    </Suspense>
  );
}
