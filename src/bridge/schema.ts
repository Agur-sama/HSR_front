export type StationLabel = 'А' | 'Б' | 'В' | 'Г';
export type StationType = 'terminal' | 'intermediate';

export interface Pz1Station {
  label: StationLabel;
  name: string;
  lat: number;
  lng: number;
  type: StationType;
}

export interface Pz1Result {
  stations: Pz1Station[];
  routeLine: Array<[number, number]>;
  variantId?: string;
  consumerProperties?: Record<string, Record<string, string>>;
  finalIndicators?: Record<string, string>;
  notes?: string;
}

// TODO: уточнить по методичке при разработке ПЗ2.
export type Pz2Result = unknown;
// TODO: уточнить по методичке при разработке ПЗ3.
export type Pz3Result = unknown;
// TODO: уточнить по методичке при разработке ПЗ4.
export type Pz4Result = unknown;
// TODO: уточнить по методичке при разработке ПЗ5.
export type Pz5Result = unknown;
// TODO: уточнить по методичке при разработке ПЗ6.
export type Pz6Result = unknown;
// TODO: уточнить по методичке при разработке ПЗ7.
export type Pz7Result = unknown;
// TODO: уточнить по методичке при разработке ПЗ8.
export type Pz8Result = unknown;

export interface Passport {
  team: string;
  lineTitle: string;
  defaultVariant?: number;
  createdAt: string;
}

export interface BridgeSchema {
  schemaVersion: '1.0';
  passport: Passport;
  completed: Partial<{
    pz1: Pz1Result;
    pz2: Pz2Result;
    pz3: Pz3Result;
    pz4: Pz4Result;
    pz5: Pz5Result;
    pz6: Pz6Result;
    pz7: Pz7Result;
    pz8: Pz8Result;
  }>;
}
