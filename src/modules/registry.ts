import { Pz1Module } from './pz1';
import type { ModuleDefinition, PzNumber } from './types';

export const moduleRegistry: Partial<Record<PzNumber, ModuleDefinition>> = {
  1: {
    id: 1,
    title: 'ПЗ1. Технико-экономическое обоснование',
    shortTitle: 'ПЗ1',
    Component: Pz1Module,
  },
};
