import type { TransportModeId } from '../../bridge/schema';
import { passengerFlowModeWeights } from './passengerFlowWeights';

const EPSILON = 1e-9;

export interface TotalDemandForecastInput {
  existingAnnualFlow: number;
  grpCurrentRegionA: number;
  grpCurrentRegionB: number;
  grpGrowthPctRegionA: number;
  grpGrowthPctRegionB: number;
  populationCurrentRegionA: number;
  populationCurrentRegionB: number;
  populationGrowthPctRegionA: number;
  populationGrowthPctRegionB: number;
  gdpPassengerFlowCoefficientRegionA: number;
  gdpPassengerFlowCoefficientRegionB: number;
  inducedDemandPct: number;
}

export interface TotalDemandForecast {
  grpFutureRegionA: number;
  grpFutureRegionB: number;
  populationFutureRegionA: number;
  populationFutureRegionB: number;
  grpDelta: number;
  populationDelta: number;
  weightedGdpPassengerFlowCoefficient: number;
  baseForecast: number;
  inducedDemand: number;
  totalForecast: number;
}

export interface PassengerFlowModeInput {
  modeId: TransportModeId;
  existingAnnualFlow: number;
  travelTimeHours: number;
  waitingTimeHours: number;
  totalTransportCost: number;
  existingTravelTimeHours: number;
}

export interface PassengerFlowDistributionInput {
  existingAnnualFlow: number;
  baseForecast: number;
  inducedDemand: number;
  hsrTravelTimeHours?: number;
  modes: PassengerFlowModeInput[];
}

export interface PassengerFlowModeForecast {
  modeId: TransportModeId;
  existingAnnualFlow: number;
  existingShare: number;
  penalty: number;
  directCapture: number;
  impedance: number;
  gravityWeight: number;
  gravityCapture: number;
  timeSavingHours: number;
  inducedWeight: number;
  inducedCapture: number;
  forecastAnnualFlow: number;
  forecastShare: number;
}

export interface PassengerFlowDistribution {
  baseForecast: number;
  inducedDemand: number;
  totalForecast: number;
  directTotal: number;
  remainder: number;
  gravityTotal: number;
  inducedTotal: number;
  forecastTotal: number;
  modes: PassengerFlowModeForecast[];
}

export function forecastTotalDemand(input: TotalDemandForecastInput): TotalDemandForecast {
  assertNonNegative(input.existingAnnualFlow, 'existingAnnualFlow');
  assertNonNegative(input.inducedDemandPct, 'inducedDemandPct');

  const grpFutureRegionA = input.grpCurrentRegionA * (1 + input.grpGrowthPctRegionA);
  const grpFutureRegionB = input.grpCurrentRegionB * (1 + input.grpGrowthPctRegionB);
  const populationFutureRegionA = input.populationCurrentRegionA * (1 + input.populationGrowthPctRegionA);
  const populationFutureRegionB = input.populationCurrentRegionB * (1 + input.populationGrowthPctRegionB);

  const grpCurrentTotal = input.grpCurrentRegionA + input.grpCurrentRegionB;
  const populationCurrentTotal = input.populationCurrentRegionA + input.populationCurrentRegionB;

  assertPositive(grpCurrentTotal, 'current GRP total');
  assertPositive(populationCurrentTotal, 'current population total');

  const grpDelta = (grpFutureRegionA + grpFutureRegionB) / grpCurrentTotal;
  const populationDelta = (populationFutureRegionA + populationFutureRegionB) / populationCurrentTotal;
  const weightedGdpPassengerFlowCoefficient =
    (input.populationCurrentRegionA * input.gdpPassengerFlowCoefficientRegionA +
      input.populationCurrentRegionB * input.gdpPassengerFlowCoefficientRegionB) /
    populationCurrentTotal;
  const baseForecast =
    input.existingAnnualFlow * grpDelta * weightedGdpPassengerFlowCoefficient * populationDelta;
  const inducedDemand = baseForecast * input.inducedDemandPct;
  const totalForecast = baseForecast + inducedDemand;

  return {
    grpFutureRegionA,
    grpFutureRegionB,
    populationFutureRegionA,
    populationFutureRegionB,
    grpDelta,
    populationDelta,
    weightedGdpPassengerFlowCoefficient,
    baseForecast,
    inducedDemand,
    totalForecast,
  };
}

export function distributePassengerFlowByMode(
  input: PassengerFlowDistributionInput,
): PassengerFlowDistribution {
  assertNonNegative(input.existingAnnualFlow, 'existingAnnualFlow');
  assertNonNegative(input.baseForecast, 'baseForecast');
  assertNonNegative(input.inducedDemand, 'inducedDemand');

  const hsrTravelTimeHours =
    input.hsrTravelTimeHours ?? input.modes.find((mode) => mode.modeId === 'hSR')?.travelTimeHours;

  if (hsrTravelTimeHours === undefined) {
    throw new Error('hsrTravelTimeHours is required when the HSR mode is absent from modes');
  }

  const directRows = input.modes.map((mode) => {
    assertKnownMode(mode.modeId);
    assertNonNegative(mode.existingAnnualFlow, `${mode.modeId}.existingAnnualFlow`);
    assertNonNegative(mode.travelTimeHours, `${mode.modeId}.travelTimeHours`);
    assertNonNegative(mode.waitingTimeHours, `${mode.modeId}.waitingTimeHours`);
    assertPositive(mode.totalTransportCost, `${mode.modeId}.totalTransportCost`);
    assertNonNegative(mode.existingTravelTimeHours, `${mode.modeId}.existingTravelTimeHours`);

    const weights = passengerFlowModeWeights[mode.modeId];
    const penalty = Math.max(weights.time, weights.price, weights.comfort);
    const existingShare =
      input.existingAnnualFlow > EPSILON ? mode.existingAnnualFlow / input.existingAnnualFlow : 0;
    const directCapture = input.baseForecast * existingShare * (1 - penalty);
    const impedance = calculateImpedance(mode);
    const timeSavingHours = Math.max(0, mode.existingTravelTimeHours - hsrTravelTimeHours);

    return {
      mode,
      existingShare,
      penalty,
      directCapture,
      impedance,
      timeSavingHours,
    };
  });

  const directTotal = directRows.reduce((sum, row) => sum + row.directCapture, 0);
  const remainder = Math.max(0, input.baseForecast - directTotal);
  const gravityWeights = normalizeInverseValues(directRows.map((row) => row.impedance));
  const inducedWeights =
    input.inducedDemand > EPSILON
      ? normalizePositiveValues(directRows.map((row) => row.timeSavingHours), 'time savings')
      : directRows.map(() => 0);

  const modes = directRows.map((row, index): PassengerFlowModeForecast => {
    const gravityWeight = gravityWeights[index];
    const gravityCapture = remainder * gravityWeight;
    const inducedWeight = inducedWeights[index];
    const inducedCapture = input.inducedDemand * inducedWeight;
    const forecastAnnualFlow = row.directCapture + gravityCapture + inducedCapture;
    const totalForecast = input.baseForecast + input.inducedDemand;

    return {
      modeId: row.mode.modeId,
      existingAnnualFlow: row.mode.existingAnnualFlow,
      existingShare: row.existingShare,
      penalty: row.penalty,
      directCapture: row.directCapture,
      impedance: row.impedance,
      gravityWeight,
      gravityCapture,
      timeSavingHours: row.timeSavingHours,
      inducedWeight,
      inducedCapture,
      forecastAnnualFlow,
      forecastShare: totalForecast > EPSILON ? forecastAnnualFlow / totalForecast : 0,
    };
  });

  const gravityTotal = modes.reduce((sum, mode) => sum + mode.gravityCapture, 0);
  const inducedTotal = modes.reduce((sum, mode) => sum + mode.inducedCapture, 0);
  const forecastTotal = modes.reduce((sum, mode) => sum + mode.forecastAnnualFlow, 0);
  const totalForecast = input.baseForecast + input.inducedDemand;

  return {
    baseForecast: input.baseForecast,
    inducedDemand: input.inducedDemand,
    totalForecast,
    directTotal,
    remainder,
    gravityTotal,
    inducedTotal,
    forecastTotal,
    modes,
  };
}

function calculateImpedance(mode: PassengerFlowModeInput) {
  const travelAndWaitTime = mode.travelTimeHours + mode.waitingTimeHours;
  assertPositive(travelAndWaitTime, `${mode.modeId}.travelAndWaitTime`);

  return Math.pow(travelAndWaitTime * 24 * mode.totalTransportCost, 3);
}

function normalizeInverseValues(values: number[]) {
  const inverseValues = values.map((value) => {
    assertPositive(value, 'impedance');
    return 1 / value;
  });

  return normalizeBySum(inverseValues, 'inverse impedance');
}

function normalizePositiveValues(values: number[], label: string) {
  for (const value of values) {
    assertNonNegative(value, label);
  }

  return normalizeBySum(values, label);
}

function normalizeBySum(values: number[], label: string) {
  const sum = values.reduce((total, value) => total + value, 0);
  assertPositive(sum, label);

  return values.map((value) => value / sum);
}

function assertKnownMode(modeId: TransportModeId) {
  if (!passengerFlowModeWeights[modeId]) {
    throw new Error(`Unknown transport mode: ${modeId}`);
  }
}

function assertPositive(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive number`);
  }
}

function assertNonNegative(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative number`);
  }
}
