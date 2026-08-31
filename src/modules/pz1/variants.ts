import { getMapViewForPoints } from '../../shared/lib/mapView';
import type { LonLat } from '../../shared/lib/mapView';
import type { Pz1Variant } from './types';

/**
 * Исходные данные варианта: города, их регионы и координаты [долгота, широта].
 *
 * Вид карты (центр и зум) здесь НЕ задаётся — он считается из координат
 * городов функцией getMapViewForPoints. Раньше центр был вписан руками рядом
 * с городами, и проверить его было нечем: числа и координаты жили порознь.
 */
interface Pz1VariantSource {
  id: string;
  fromCity: string;
  toCity: string;
  fromRegion: string;
  toRegion: string;
  fromCoords: LonLat;
  toCoords: LonLat;
  /** Уточнение к описанию, если название региона не совпадает с городом. */
  description?: string;
}

const pz1VariantSources: Pz1VariantSource[] = [
  {
    id: '1',
    fromCity: 'Хабаровск',
    toCity: 'Владивосток',
    fromRegion: 'Хабаровский край',
    toRegion: 'Приморский край',
    fromCoords: [135.0838, 48.4827],
    toCoords: [131.8855, 43.1155],
  },
  {
    id: '2',
    fromCity: 'Екатеринбург',
    toCity: 'Челябинск',
    fromRegion: 'Свердловская область',
    toRegion: 'Челябинская область',
    fromCoords: [60.6057, 56.8389],
    toCoords: [61.4368, 55.1644],
  },
  {
    id: '3',
    fromCity: 'Омск',
    toCity: 'Новосибирск',
    fromRegion: 'Омская область',
    toRegion: 'Новосибирская область',
    fromCoords: [73.3242, 54.9885],
    toCoords: [82.9357, 55.0084],
  },
  {
    id: '4',
    fromCity: 'Минеральные Воды',
    toCity: 'Махачкала',
    fromRegion: 'Ставропольский край',
    toRegion: 'Республика Дагестан',
    fromCoords: [43.1353, 44.21],
    toCoords: [47.5047, 42.9849],
  },
  {
    id: '5',
    fromCity: 'Казань',
    toCity: 'Уфа',
    fromRegion: 'Республика Татарстан',
    toRegion: 'Республика Башкортостан',
    fromCoords: [49.1088, 55.7963],
    toCoords: [55.9721, 54.7388],
  },
  {
    id: '6',
    fromCity: 'Ярославль',
    toCity: 'Москва',
    fromRegion: 'Ярославская область',
    toRegion: 'Москва',
    fromCoords: [39.8845, 57.6261],
    toCoords: [37.6173, 55.7558],
    description: 'Ярославль (Ярославская область) — Москва.',
  },
];

export const pz1Variants: Pz1Variant[] = pz1VariantSources.map((source) => {
  const view = getMapViewForPoints([source.fromCoords, source.toCoords]);

  return {
    id: source.id,
    title: `Вариант ${source.id} — ${source.fromCity}, ${source.toCity}`,
    description: source.description ?? `${source.fromCity} (${source.fromRegion}) — ${source.toCity} (${source.toRegion}).`,
    fromCity: source.fromCity,
    toCity: source.toCity,
    fromRegion: source.fromRegion,
    toRegion: source.toRegion,
    fromCoords: source.fromCoords,
    toCoords: source.toCoords,
    // Пара городов всегда даёт вид, но на случай правки данных оставляем
    // безопасный запасной вариант вместо падения на undefined.
    mapCenter: view?.center ?? source.fromCoords,
    mapZoom: view?.zoom ?? 6,
  };
});

export function getPz1VariantTitle(variantId: string) {
  return pz1Variants.find((variant) => variant.id === variantId)?.title ?? 'Вариант не выбран';
}
