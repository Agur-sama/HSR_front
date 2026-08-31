/**
 * Стоимость поездки на личном автомобиле по корреспонденции.
 *
 * Формула подтверждена заказчиком 31.08.2026 в этой редакции:
 *
 *   Расход_на_100км × Цена_АИ92 × (Расстояние_корреспонденции / 100)
 *     + ОСАГО_и_ТО_за_км × Расстояние_корреспонденции
 *
 * Два уточнения, которые она закрывает:
 * - расстояние берётся ПО КОРРЕСПОНДЕНЦИИ (между её станциями), а не общая
 *   длина всей трассы ВСМ — буквальное прочтение слайда отменено;
 * - в этой редакции нет ни деления на наполняемость 1,3, ни надбавки +200,
 *   которые встречались в других формулировках заказчика. Здесь реализовано
 *   ровно то, что подтверждено, без домысливания хвоста.
 */
export interface CarTravelCostInput {
  /** Расход бензина, л на 100 км */
  fuelConsumptionPer100Km: number;
  /** Цена АИ-92, руб./л */
  fuelPricePerLitre: number;
  /** ОСАГО и ТО, руб./км */
  maintenanceCostPerKm: number;
  /** Расстояние корреспонденции, км */
  distanceKm: number;
}

export function calculateCarTravelCost(input: CarTravelCostInput): number | null {
  const { fuelConsumptionPer100Km, fuelPricePerLitre, maintenanceCostPerKm, distanceKm } = input;

  if (
    !Number.isFinite(fuelConsumptionPer100Km) ||
    !Number.isFinite(fuelPricePerLitre) ||
    !Number.isFinite(maintenanceCostPerKm) ||
    !Number.isFinite(distanceKm) ||
    fuelConsumptionPer100Km < 0 ||
    fuelPricePerLitre < 0 ||
    maintenanceCostPerKm < 0 ||
    distanceKm < 0
  ) {
    return null;
  }

  const fuelCost = fuelConsumptionPer100Km * fuelPricePerLitre * (distanceKm / 100);
  const maintenanceCost = maintenanceCostPerKm * distanceKm;

  return fuelCost + maintenanceCost;
}
