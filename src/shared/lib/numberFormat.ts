/**
 * Разделение разрядов для крупных чисел в полях ввода (ТЗ v3.5 §3 П-05).
 *
 * Формат ХРАНЕНИЯ не меняется: в черновике и в JSON-мосте лежит та же строка,
 * которую ввёл студент. Группировка — исключительно отображение при потере
 * фокуса, поэтому функции ниже симметричны и не должны терять данные:
 * `stripGroupSeparators(formatGroupedNumber(x)) === x` для любого числового x.
 */

/** Неразрывный пробел — тот же разделитель, что даёт Intl.NumberFormat('ru-RU'). */
const GROUP_SEPARATOR = '\u00A0';

/**
 * Всё, что может прийти как разделитель разрядов: обычный пробел, неразрывный,
 * узкий неразрывный, тонкий. Записаны escape-последовательностями намеренно —
 * литеральные символы неотличимы глазом и теряются при копировании файла.
 */
const GROUP_SEPARATOR_PATTERN = /[\s\u00A0\u202F\u2009]/g;

const NUMERIC_PATTERN = /^(-?)(\d+)([.,]\d*)?$/;

/**
 * Добавляет разделители разрядов в целую часть.
 *
 * Нечисловое значение возвращается как есть — при вводе с клавиатуры в поле
 * регулярно оказывается незаконченная строка («12,», «-»), и портить её
 * форматированием нельзя.
 */
export function formatGroupedNumber(rawValue: string): string {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    return '';
  }

  const match = NUMERIC_PATTERN.exec(stripGroupSeparators(trimmed));

  if (!match) {
    return rawValue;
  }

  const [, sign, integerPart, fractionPart = ''] = match;

  return `${sign}${groupDigits(integerPart)}${fractionPart}`;
}

/** Убирает разделители разрядов — применяется к вводу до записи в черновик. */
export function stripGroupSeparators(value: string): string {
  return value.replace(GROUP_SEPARATOR_PATTERN, '');
}

function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);
}
