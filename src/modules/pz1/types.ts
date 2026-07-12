import type { StationLabel, StationType } from '../../bridge/schema';

export interface Pz1Variant {
  id: string;
  title: string;
  description: string;
}

export interface Pz1PassportDraft {
  team: string;
  lineTitle: string;
  createdAt: string;
}

export interface Pz1StationDraft {
  label: StationLabel;
  enabled: boolean;
  name: string;
  lat: string;
  lng: string;
  type: StationType;
}

export interface Pz1RoutePointDraft {
  id: string;
  lat: string;
  lng: string;
}

export interface Pz1Draft {
  passport: Pz1PassportDraft;
  selectedVariantId: string;
  stationDrafts: Pz1StationDraft[];
  routePointDrafts: Pz1RoutePointDraft[];
  consumerProperties: Record<string, Record<string, string>>;
  finalIndicators: Record<string, string>;
  notes: string;
  importedFileName?: string;
}
