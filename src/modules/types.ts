import type { ComponentType } from 'react';

export type PzNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface ModuleDefinition {
  id: PzNumber;
  title: string;
  shortTitle: string;
  Component: ComponentType;
}
