/**
 * Определение субъекта РФ по координатам через Nominatim (OSM).
 *
 * Почему сеть, а не таблица офлайн: границ субъектов в проекте нет, а
 * составлять их «по памяти» нельзя — правило проекта прямо запрещает
 * подставлять правдоподобные числа. Карта и так требует интернета для тайлов
 * OSM, так что новой категории зависимости это не добавляет.
 *
 * Ограничения, о которых нужно помнить:
 * - Nominatim просит не чаще одного запроса в секунду — очередь ниже это
 *   выдерживает, а повторы гасятся кэшем;
 * - результат носит подсказочный характер: поле региона остаётся
 *   редактируемым, у границ субъектов ответ может быть неточным;
 * - при любой ошибке сети функция возвращает null и ничего не меняет.
 */

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';
const MIN_REQUEST_INTERVAL_MS = 1100;
const REQUEST_TIMEOUT_MS = 8000;
/** 4 знака — примерно 11 м, точнее для определения субъекта не нужно. */
const CACHE_PRECISION = 4;

export interface NominatimAddress {
  state?: string;
  region?: string;
  county?: string;
  [key: string]: unknown;
}

export interface ReverseGeocodeOptions {
  knownRegions: readonly string[];
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

/**
 * Выбирает субъект из ответа Nominatim и приводит его к названию из
 * справочника проекта.
 *
 * Чистая функция — на ней и держится тест, сетевую часть тестировать нечем.
 */
export function pickRegionFromAddress(
  address: NominatimAddress | undefined,
  knownRegions: readonly string[],
): string | null {
  if (!address) {
    return null;
  }

  const candidates = [address.state, address.region, address.county].filter(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  );

  for (const candidate of candidates) {
    const exact = knownRegions.find((region) => region === candidate.trim());
    if (exact) {
      return exact;
    }

    const normalizedCandidate = normalizeRegionName(candidate);
    const loose = knownRegions.find((region) => normalizeRegionName(region) === normalizedCandidate);
    if (loose) {
      return loose;
    }
  }

  // Ничего не совпало со справочником — отдаём то, что вернул сервис.
  // Студент увидит название и при необходимости поправит вручную.
  return candidates[0]?.trim() ?? null;
}

/**
 * Приводит название субъекта к сравнимому виду: регистр, «ё», разные тире,
 * лишние пробелы и слово «республика», которое Nominatim то ставит, то нет
 * («Татарстан» против «Республика Татарстан»).
 */
export function normalizeRegionName(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[—–‑-]/g, '-')
      .replace(/\s*-\s*/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      // Слово «республика» стоит то спереди («Республика Татарстан»), то сзади
      // («Чувашская Республика»), а Nominatim его нередко опускает.
      // Границы слова \b здесь бесполезны: в JS они определены по ASCII и с
      // кириллицей не срабатывают, поэтому вырезаем по краям строки явно.
      .replace(/^республика\s+/, '')
      .replace(/\s+республика$/, '')
      .trim()
  );
}

const regionCache = new Map<string, string | null>();
let requestChain: Promise<unknown> = Promise.resolve();

function cacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(CACHE_PRECISION)},${longitude.toFixed(CACHE_PRECISION)}`;
}

/** Ставит запрос в очередь, чтобы не превышать лимит Nominatim. */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = requestChain.then(task, task);
  requestChain = result.then(
    () => delay(MIN_REQUEST_INTERVAL_MS),
    () => delay(MIN_REQUEST_INTERVAL_MS),
  );

  return result;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function reverseGeocodeRegion(
  latitude: number,
  longitude: number,
  { knownRegions, fetchImpl = fetch, signal }: ReverseGeocodeOptions,
): Promise<string | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const key = cacheKey(latitude, longitude);
  const cached = regionCache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  // zoom=5 — уровень субъекта: не тянем лишние подробности вроде улиц.
  url.searchParams.set('zoom', '5');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('accept-language', 'ru');

  try {
    const region = await enqueue(async () => {
      const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
      const response = await fetchImpl(url.toString(), {
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        return null;
      }

      const payload: { address?: NominatimAddress } = await response.json();

      return pickRegionFromAddress(payload.address, knownRegions);
    });

    regionCache.set(key, region);

    return region;
  } catch {
    // Сеть недоступна, таймаут или запрос отменён — поле не трогаем.
    return null;
  }
}

/** Для тестов: сбрасывает кэш между сценариями. */
export function clearRegionCache(): void {
  regionCache.clear();
}
