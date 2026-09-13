import { Suspense, lazy } from 'react';
import { MapLoadingCard } from '../../shared/ui/MapLoadingCard';
import type { ComponentProps } from 'react';
import type { Pz2RouteMap as Pz2RouteMapComponent } from './Pz2RouteMap';

/**
 * Карта трассы, подключаемая по требованию.
 *
 * MapLibre весит больше всего остального модуля вместе взятого, а нужна она
 * только на двух шагах из четырёх. Интро, теория и упражнения открываются, не
 * дожидаясь её.
 */
const RouteMap = lazy(() => import('./Pz2RouteMap').then((module) => ({ default: module.Pz2RouteMap })));

export function Pz2RouteMap(props: ComponentProps<typeof Pz2RouteMapComponent>) {
  return (
    <Suspense
      fallback={
        <MapLoadingCard
          eyebrow={props.withRuler === false ? 'Трасса' : 'Линейка'}
          title={props.withRuler === false ? 'Этапы на трассе' : 'Измерение участка'}
        />
      }
    >
      <RouteMap {...props} />
    </Suspense>
  );
}
