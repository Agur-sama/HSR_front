/**
 * Ввод длительности в формате ЧЧ:ММ без набора двоеточия.
 *
 * Студент печатает подряд цифры, двоеточие подставляется само: `130` → `1:30`,
 * `0130` → `01:30`. Цифры заполняются справа налево, как на часах и в
 * банковских формах — сначала минуты, потом часы. Уже набранное двоеточие
 * тоже принимается, поэтому старые сохранённые файлы и вставка из буфера
 * продолжают работать.
 */

const MAX_DIGITS = 4;

/** Оставляет только цифры и обрезает до четырёх — ЧЧММ. */
function extractDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, MAX_DIGITS);
}

/**
 * Маска на каждый ввод символа: показывает то, что уже набрано, и ставит
 * двоеточие, как только цифр становится больше двух.
 *
 * Промежуточные состояния намеренно не дополняются нулями — иначе курсор
 * прыгал бы, а «1» превращалась в «00:01» ещё до того, как студент дописал
 * остальные цифры.
 */
export function maskDurationInput(value: string): string {
  const digits = extractDigits(value);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, digits.length - 2)}:${digits.slice(digits.length - 2)}`;
}

/**
 * Приведение к ЧЧ:ММ при потере фокуса.
 *
 * Возвращает пустую строку для пустого ввода и `null`, если из набранного
 * нельзя собрать корректное время (минуты 60 и больше). `null` означает
 * «оставить как есть и показать ошибку», а не «стереть введённое».
 */
export function normalizeDurationInput(value: string): string | null {
  const digits = extractDigits(value);

  if (digits.length === 0) {
    return '';
  }

  const minutes = Number(digits.slice(-2).padStart(2, '0'));
  const hours = digits.length <= 2 ? 0 : Number(digits.slice(0, digits.length - 2));

  if (minutes > 59) {
    return null;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Минуты из строки ЧЧ:ММ. Единственное место, где разбирается этот формат. */
export function parseDurationToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());

  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** Значение введено, но собрать из него время нельзя. */
export function isDurationInvalid(value: string): boolean {
  return value.trim().length > 0 && parseDurationToMinutes(value) === null;
}
