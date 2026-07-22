import type {
  Pz1PassengerFlowModeInputs,
  Pz1PassengerFlowRegionalInputs,
  StationLabel,
  StationType,
  TransportModeId,
} from '../../bridge/schema';

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
  sagittaToNextKm: string;
}

export interface Pz1CorrespondenceTableDraft {
  pairKey: string;
  fromLabel: StationLabel;
  toLabel: StationLabel;
  activeModes: TransportModeId[];
  values: Record<string, Record<string, string>>;
}

export interface Pz1PassengerFlowForecastDraft {
  regional: Pz1PassengerFlowRegionalInputs;
  modes: Record<TransportModeId, Pz1PassengerFlowModeInputs>;
}

export interface Pz1Draft {
  passport: Pz1PassportDraft;
  selectedVariantId: string;
  stationDrafts: Pz1StationDraft[];
  routePointDrafts: Pz1RoutePointDraft[];
  previewImage: string;
  correspondenceTables: Record<string, Pz1CorrespondenceTableDraft>;
  passengerFlowForecast: Pz1PassengerFlowForecastDraft;
  finalIndicators: Record<string, string>;
  notes: string;
  importedFileName?: string;
}
