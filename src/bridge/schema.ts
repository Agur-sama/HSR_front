export type StationLabel = 'А' | 'Б' | 'В' | 'Г';
export type StationType = 'terminal' | 'intermediate';

export interface Pz1Station {
  label: StationLabel;
  name: string;
  lat: number;
  lng: number;
  type: StationType;
}

export interface GeoPoint {
  lon: number;
  lat: number;
}

export interface RouteVertex extends GeoPoint {
  id: string;
}

export interface RouteSegment {
  id: string;
  fromVertexId: string;
  toVertexId: string;
  sagittaKm: number;
}

export interface RouteLine {
  vertices: RouteVertex[];
  segments: RouteSegment[];
}

export type TransportModeId = 'hSR' | 'airplane' | 'suburbanTrain' | 'longDistanceTrain' | 'bus' | 'car';

export interface CorrespondenceTable {
  pairKey: string;
  activeModes: TransportModeId[];
  values: Record<string, Record<string, string>>;
}

export interface Pz1PassengerFlowRegionalInputs {
  grpCurrentRegionA: string;
  grpCurrentRegionB: string;
  grpGrowthPctRegionA: string;
  grpGrowthPctRegionB: string;
  populationCurrentRegionA: string;
  populationCurrentRegionB: string;
  populationGrowthPctRegionA: string;
  populationGrowthPctRegionB: string;
  gdpPassengerFlowCoefficientRegionA: string;
  gdpPassengerFlowCoefficientRegionB: string;
  inducedDemandPct: string;
}

export interface Pz1PassengerFlowModeInputs {
  existingAnnualFlow: string;
  travelTimeHours: string;
  waitingTimeHours: string;
  totalTransportCost: string;
  existingTravelTimeHours: string;
}

export interface Pz1PassengerFlowInputs {
  regional: Pz1PassengerFlowRegionalInputs;
  modes: Record<TransportModeId, Pz1PassengerFlowModeInputs>;
}

export interface Pz1PassengerFlowTotalDemand {
  existingAnnualFlow: number;
  baseForecast: number;
  inducedDemand: number;
  totalForecast: number;
  grpDelta: number;
  populationDelta: number;
  weightedGdpPassengerFlowCoefficient: number;
}

export interface Pz1PassengerFlowModeResult {
  modeId: TransportModeId;
  existingAnnualFlow: number;
  forecastAnnualFlow: number;
  forecastShare: number;
  directCapture: number;
  gravityCapture: number;
  inducedCapture: number;
}

export interface Pz1PassengerFlowResult {
  inputs: Pz1PassengerFlowInputs;
  totalDemand: Pz1PassengerFlowTotalDemand;
  modes: Pz1PassengerFlowModeResult[];
}

export interface Pz1Result {
  stations: Pz1Station[];
  routeLine: RouteLine;
  totalLengthKm: number;
  previewImage?: string;
  variantId?: string;
  consumerProperties?: Record<string, CorrespondenceTable>;
  passengerFlowForecast?: Pz1PassengerFlowResult;
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
