import type { Pz1Variant } from './types';

// TODO: уточнить по методичке ПЗ1 точные шесть направлений.
export const pz1Variants: Pz1Variant[] = [
  { id: '1', title: 'Вариант 1', description: 'Направление требует уточнения по методичке ПЗ1.' },
  { id: '2', title: 'Вариант 2', description: 'Направление требует уточнения по методичке ПЗ1.' },
  { id: '3', title: 'Вариант 3', description: 'Направление требует уточнения по методичке ПЗ1.' },
  { id: '4', title: 'Вариант 4', description: 'Направление требует уточнения по методичке ПЗ1.' },
  { id: '5', title: 'Вариант 5', description: 'Направление требует уточнения по методичке ПЗ1.' },
  { id: '6', title: 'Вариант 6', description: 'Направление требует уточнения по методичке ПЗ1.' },
];

export function getPz1VariantTitle(variantId: string) {
  return pz1Variants.find((variant) => variant.id === variantId)?.title ?? 'Вариант не выбран';
}
