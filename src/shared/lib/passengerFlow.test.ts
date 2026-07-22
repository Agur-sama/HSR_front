import { describe, expect, it } from 'vitest';
import type { TransportModeId } from '../../bridge/schema';
import { distributePassengerFlowByMode, forecastTotalDemand } from './passengerFlow';
import { passengerFlowModeIds, passengerFlowModeWeights } from './passengerFlowWeights';

const expectedForecastByMode: Record<TransportModeId, number> = {
  hSR: 1_588_309,
  airplane: 132_479,
  bus: 291_857,
  suburbanTrain: 85_470,
  longDistanceTrain: 219_183,
  car: 664_842,
};

describe('passenger flow forecast', () => {
  it('keeps the 18 modal split constants in one place', () => {
    expect(passengerFlowModeIds).toHaveLength(6);

    for (const modeId of passengerFlowModeIds) {
      const weights = passengerFlowModeWeights[modeId];

      expect(weights.time + weights.price + weights.comfort).toBeCloseTo(1, 8);
    }
  });

  it('calculates total demand growth from the Excel check values', () => {
    const existingAnnualFlow = 2_325_272.4;
    const expectedBaseForecast = 2_208_992.6;
    const forecast = forecastTotalDemand({
      existingAnnualFlow,
      grpCurrentRegionA: 1,
      grpCurrentRegionB: 0,
      grpGrowthPctRegionA: 0,
      grpGrowthPctRegionB: 0,
      populationCurrentRegionA: 1,
      populationCurrentRegionB: 0,
      populationGrowthPctRegionA: 0,
      populationGrowthPctRegionB: 0,
      gdpPassengerFlowCoefficientRegionA: expectedBaseForecast / existingAnnualFlow,
      gdpPassengerFlowCoefficientRegionB: 0,
      inducedDemandPct: 0.35,
    });

    expect(forecast.baseForecast).toBeCloseTo(2_208_992.6, 1);
    expect(forecast.inducedDemand).toBeCloseTo(773_147.4, 0);
    expect(forecast.totalForecast).toBeCloseTo(2_982_140, 0);
  });

  it('distributes forecast by 6 transport modes using the Excel check values', () => {
    const totalForecast = 2_982_140;
    const result = distributePassengerFlowByMode({
      existingAnnualFlow: 0,
      baseForecast: totalForecast,
      inducedDemand: 0,
      hsrTravelTimeHours: 1,
      modes: passengerFlowModeIds.map((modeId) => {
        const expectedShare = expectedForecastByMode[modeId] / totalForecast;
        const targetImpedance = 1 / expectedShare;

        return {
          modeId,
          existingAnnualFlow: 0,
          travelTimeHours: 1,
          waitingTimeHours: 0,
          totalTransportCost: Math.cbrt(targetImpedance) / 24,
          existingTravelTimeHours: 1,
        };
      }),
    });

    expect(Math.round(result.forecastTotal)).toBe(totalForecast);

    for (const mode of result.modes) {
      expect(Math.round(mode.forecastAnnualFlow)).toBe(expectedForecastByMode[mode.modeId]);
    }
  });
});
