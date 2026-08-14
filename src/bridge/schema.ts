export type StationLabel = 'А' | 'Б' | 'В' | 'Г';
export type StationType = 'terminal' | 'intermediate';

export interface Pz1Station {
  label: StationLabel;
  name: string;
  lat: number;
  lng: number;
  type: StationType;
  region?: string;
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
export type BridgeSchemaVersion = '1.0' | '1.1';

export interface Pz1DiscomfortMatrix {
  values: Record<string, Record<TransportModeId, string>>;
}

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

export interface Pz1HsrTravelTimeSegment {
  fromLabel: StationLabel;
  toLabel: StationLabel;
  distanceKm: number;
  speedKmh: number;
  travelTimeMinutes: number;
}

export interface Pz1HsrTravelTimeResult {
  accelerationMinutes: number;
  brakingMinutes: number;
  totalMinutes: number;
  segments: Pz1HsrTravelTimeSegment[];
}

export interface Pz1RegionalCharacteristicInputs {
  regionA: string;
  regionB: string;
  grpExistingRegionA: string;
  grpExistingRegionB: string;
  grpForecastRegionA: string;
  grpForecastRegionB: string;
  populationExistingRegionA: string;
  populationExistingRegionB: string;
  populationForecastRegionA: string;
  populationForecastRegionB: string;
  averageSalaryRegionA: string;
  averageSalaryRegionB: string;
  kGdpFlowRegionA: string;
  kGdpFlowRegionB: string;
  inducedDemandPct: string;
}

export interface SplitTransportValue {
  existing: string;
  forecast: string;
}

export interface Pz1AnnualFlowModeInputs {
  capacity: string;
  occupancyExisting: string;
  occupancyForecast: string;
  existingAnnualFlow?: number;
  forecastAnnualFlow?: number;
}

export interface Pz1CorrespondenceScenario {
  pairKey: string;
  title: string;
  travelTime: Record<string, Record<TransportModeId, SplitTransportValue>>;
  discomfortExisting: Pz1DiscomfortMatrix;
  discomfortForecast: Pz1DiscomfortMatrix;
  discomfortAggregates: Record<TransportModeId, { existing: number | null; forecast: number | null }>;
  frequency: Record<TransportModeId, SplitTransportValue>;
  fare: Record<TransportModeId, SplitTransportValue>;
  otherParameters: Record<string, string>;
  annualFlows: Record<TransportModeId, Pz1AnnualFlowModeInputs>;
  passengerFlowForecast?: Pz1PassengerFlowResult;
}

export interface Pz1Result {
  stations: Pz1Station[];
  routeLine: RouteLine;
  totalLengthKm: number;
  previewImage?: string;
  variantId?: string;
  hsrTravelTime?: Pz1HsrTravelTimeResult;
  regionalCharacteristics?: Pz1RegionalCharacteristicInputs;
  correspondenceScenarios?: Record<string, Pz1CorrespondenceScenario>;
  consumerProperties?: Record<string, CorrespondenceTable>;
  discomfortMatrix?: Pz1DiscomfortMatrix;
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
  schemaVersion: BridgeSchemaVersion;
  passport: Passport;
  progress?: Partial<Record<'pz1' | 'pz2' | 'pz3' | 'pz4' | 'pz5' | 'pz6' | 'pz7' | 'pz8', Record<string, boolean>>>;
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
