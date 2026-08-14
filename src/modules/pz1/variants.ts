import type { Pz1Variant } from './types';

export const pz1Variants: Pz1Variant[] = [
  {
    id: '1',
    title: 'Вариант 1 — Хабаровск, Владивосток',
    description: 'Хабаровск (Хабаровский край) — Владивосток (Приморский край).',
    fromCity: 'Хабаровск',
    toCity: 'Владивосток',
    fromRegion: 'Хабаровский край',
    toRegion: 'Приморский край',
    mapCenter: [133.48, 45.8],
    mapZoom: 5,
  },
  {
    id: '2',
    title: 'Вариант 2 — Екатеринбург, Челябинск',
    description: 'Екатеринбург (Свердловская область) — Челябинск (Челябинская область).',
    fromCity: 'Екатеринбург',
    toCity: 'Челябинск',
    fromRegion: 'Свердловская область',
    toRegion: 'Челябинская область',
    mapCenter: [61.0, 56.0],
    mapZoom: 7,
  },
  {
    id: '3',
    title: 'Вариант 3 — Омск, Новосибирск',
    description: 'Омск (Омская область) — Новосибирск (Новосибирская область).',
    fromCity: 'Омск',
    toCity: 'Новосибирск',
    fromRegion: 'Омская область',
    toRegion: 'Новосибирская область',
    mapCenter: [78.14, 55.0],
    mapZoom: 6,
  },
  {
    id: '4',
    title: 'Вариант 4 — Минеральные Воды, Махачкала',
    description: 'Минеральные Воды (Ставропольский край) — Махачкала (Республика Дагестан).',
    fromCity: 'Минеральные Воды',
    toCity: 'Махачкала',
    fromRegion: 'Ставропольский край',
    toRegion: 'Республика Дагестан',
    mapCenter: [45.32, 43.6],
    mapZoom: 6,
  },
  {
    id: '5',
    title: 'Вариант 5 — Казань, Уфа',
    description: 'Казань (Республика Татарстан) — Уфа (Республика Башкортостан).',
    fromCity: 'Казань',
    toCity: 'Уфа',
    fromRegion: 'Республика Татарстан',
    toRegion: 'Республика Башкортостан',
    mapCenter: [52.53, 55.27],
    mapZoom: 6,
  },
  {
    id: '6',
    title: 'Вариант 6 — Ярославль, Москва',
    description: 'Ярославль (Ярославская область) — Москва.',
    fromCity: 'Ярославль',
    toCity: 'Москва',
    fromRegion: 'Ярославская область',
    toRegion: 'Москва',
    mapCenter: [38.75, 56.69],
    mapZoom: 6,
  },
];

export function getPz1VariantTitle(variantId: string) {
  return pz1Variants.find((variant) => variant.id === variantId)?.title ?? 'Вариант не выбран';
}
