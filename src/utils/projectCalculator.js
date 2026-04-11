const TERRAIN_COEFFICIENTS = {
  'Равнина': 1,
  'Холмистая местность': 1.15,
  'Лесная зона': 1.1,
  'Горы': 1.35,
  'Смешанная': 1.2
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function calculateProjectProfile(data = {}) {
  const durationMonths = toNumber(data.durationMonths, 36);
  const distanceKm = toNumber(data.distanceKm, 600);
  const workers = toNumber(data.workers, 100);
  const bridges = toNumber(data.bridges, 5);
  const budget = toNumber(data.budget, 1000);
  const workerSalary = toNumber(data.workerSalary, 150);
  const terrain = data.terrain || 'Равнина';

  const terrainK = TERRAIN_COEFFICIENTS[terrain] || 1;

  const resources = {
    money: Math.round(budget * 6 * terrainK),
    labor: Math.round(workers * 12 * terrainK),
    materials: Math.round(distanceKm * 8 * terrainK + bridges * 40),
    electricity: Math.round(distanceKm + workers * 4 * terrainK)
  };

  return {
    routeType: data.routeType || 'ВСМ-1: Москва – Санкт-Петербург',
    customer: data.customer || 'ПИШ (работа на паре)',
    durationMonths,
    distanceKm,
    workers,
    bridges,
    terrain,
    budget,
    workerSalary,
    resources
  };
}