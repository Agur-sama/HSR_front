import { Pz1Module } from './pz1';
import { Pz2Module } from './pz2';
import type { ModuleDefinition, PzNumber } from './types';

export const moduleRegistry: Partial<Record<PzNumber, ModuleDefinition>> = {
  1: {
    id: 1,
    title: 'ПЗ1. Технико-экономическое обоснование',
    shortTitle: 'ПЗ1',
    Component: Pz1Module,
  },
  2: {
    id: 2,
    title: 'ПЗ2. Календарно-сетевой график',
    shortTitle: 'ПЗ2',
    Component: Pz2Module,
  },
};
