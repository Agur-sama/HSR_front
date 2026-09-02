import type {
  Pz1PassengerFlowModeInputs,
  Pz1PassengerFlowRegionalInputs,
  Pz1DiscomfortMatrix,
  Pz1RegionalCharacteristicInputs,
  SplitTransportValue,
  StationLabel,
  StationType,
  TransportModeId,
} from '../../bridge/schema';

export interface Pz1Variant {
  id: string;
  title: string;
  description: string;
  fromCity: string;
  toCity: string;
  fromRegion: string;
  toRegion: string;
  /** Координаты городов [долгота, широта] — единственный источник вида карты. */
  fromCoords: [number, number];
  toCoords: [number, number];
  /** Вычисляется из fromCoords/toCoords, руками не задаётся. */
  mapCenter: [number, number];
  mapZoom: number;
}

export interface Pz1PassportDraft {
  team: string;
  lineTitle: string;
  createdAt: string;
  runId: string;
}

export interface Pz1StationDraft {
  label: StationLabel;
  enabled: boolean;
  name: string;
  lat: string;
  lng: string;
  type: StationType;
  region: string;
}

export interface Pz1RoutePointDraft {
  id: string;
  lat: string;
  lng: string;
  sagittaToNextKm: string;
  bendM?: string;
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

export interface Pz1HsrSpeedDraft {
  speedKmh: string;
}

export interface Pz1CorrespondenceAnnualFlowDraft {
  capacity: string;
  capacityExisting?: string;
  capacityForecast?: string;
  occupancyExisting: string;
  occupancyForecast: string;
}

export type Pz1StationOtherParametersDraft = Record<string, string>;

export interface Pz1CorrespondenceDetailDraft {
  pairKey: string;
  fromLabel: StationLabel;
  toLabel: StationLabel;
  travelTime: Record<string, Record<TransportModeId, SplitTransportValue>>;
  discomfortExisting: Pz1DiscomfortMatrix;
  discomfortForecast: Pz1DiscomfortMatrix;
  frequency: Record<TransportModeId, SplitTransportValue>;
  fare: Record<TransportModeId, SplitTransportValue>;
  otherParameters: Record<string, string>;
  annualFlows: Record<TransportModeId, Pz1CorrespondenceAnnualFlowDraft>;
}

export interface Pz1Draft {
  passport: Pz1PassportDraft;
  selectedVariantId: string;
  stationDrafts: Pz1StationDraft[];
  routePointDrafts: Pz1RoutePointDraft[];
  previewImage: string;
  correspondenceTables: Record<string, Pz1CorrespondenceTableDraft>;
  discomfortMatrix: Pz1DiscomfortMatrix;
  hsrTravelTimes: Record<string, Pz1HsrSpeedDraft>;
  regionalCharacteristics: Pz1RegionalCharacteristicInputs;
  stationOtherParameters: Record<StationLabel, Pz1StationOtherParametersDraft>;
  correspondenceDetails: Record<string, Pz1CorrespondenceDetailDraft>;
  passengerFlowForecast: Pz1PassengerFlowForecastDraft;
  finalIndicators: Record<string, string>;
  notes: string;
  importedFileName?: string;
}
