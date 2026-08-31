import { describe, expect, it } from 'vitest';
import { calculateCarTravelCost } from './carTravelCost';

describe('стоимость поездки на личном автомобиле', () => {
  it('считает по значениям по умолчанию из методички', () => {
    // Расход 11 л/100 км, АИ-92 55 руб./л, ОСАГО и ТО 1,75 руб./км, 500 км.
    // Топливо: 11 × 55 × 5 = 3025. Обслуживание: 1,75 × 500 = 875. Итого 3900.
    expect(
      calculateCarTravelCost({
        fuelConsumptionPer100Km: 11,
        fuelPricePerLitre: 55,
        maintenanceCostPerKm: 1.75,
        distanceKm: 500,
      }),
    ).toBeCloseTo(3900, 6);
  });

  it('линейна по расстоянию', () => {
    const base = {
      fuelConsumptionPer100Km: 11,
      fuelPricePerLitre: 55,
      maintenanceCostPerKm: 1.75,
    };

    const short = calculateCarTravelCost({ ...base, distanceKm: 100 });
    const long = calculateCarTravelCost({ ...base, distanceKm: 300 });

    expect(long).toBeCloseTo((short ?? 0) * 3, 6);
  });

  it('нулевое расстояние даёт нулевую стоимость', () => {
    expect(
      calculateCarTravelCost({
        fuelConsumptionPer100Km: 11,
        fuelPricePerLitre: 55,
        maintenanceCostPerKm: 1.75,
        distanceKm: 0,
      }),
    ).toBe(0);
  });

  it('не делит на наполняемость и не прибавляет 200 — в подтверждённой редакции их нет', () => {
    const result = calculateCarTravelCost({
      fuelConsumptionPer100Km: 11,
      fuelPricePerLitre: 55,
      maintenanceCostPerKm: 1.75,
      distanceKm: 500,
    });

    expect(result).not.toBeCloseTo(3900 / 1.3, 6);
    expect(result).not.toBeCloseTo(3900 / 1.3 + 200, 6);
    expect(result).not.toBeCloseTo(4100, 6);
  });

  it('на мусорных входах возвращает null, а не NaN', () => {
    const base = {
      fuelConsumptionPer100Km: 11,
      fuelPricePerLitre: 55,
      maintenanceCostPerKm: 1.75,
      distanceKm: 500,
    };

    expect(calculateCarTravelCost({ ...base, distanceKm: Number.NaN })).toBeNull();
    expect(calculateCarTravelCost({ ...base, fuelPricePerLitre: -1 })).toBeNull();
  });
});
