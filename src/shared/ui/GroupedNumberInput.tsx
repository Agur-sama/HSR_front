import { useLayoutEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { formatGroupedNumber, stripGroupSeparators } from '../../shared/lib/numberFormat';

interface GroupedNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  error?: string | null;
  id?: string;
  onBlur?: () => void;
  readOnly?: boolean;
  style?: CSSProperties;
}

/**
 * Поле для крупных чисел: разряды разделяются прямо во время набора.
 *
 * Сначала разделители появлялись только после потери фокуса (ТЗ v3.5 §3 П-05),
 * а в фокусе показывалось сырое число. Заказчик 02.09 попросил обратное: на
 * примере «10 000» неудобно именно набирать, поэтому число форматируется на
 * каждый ввод.
 *
 * Каретка при этом остаётся там, где студент печатает: позиция считается не в
 * символах, а в цифрах до неё, — иначе вставленный пробел разряда каждый раз
 * отбрасывал бы курсор.
 *
 * Наружу всегда отдаётся значение БЕЗ разделителей, поэтому формат хранения
 * в черновике и JSON-мосте не меняется, и валидаторы продолжают получать то же,
 * что и раньше.
 */
export function GroupedNumberInput({
  value,
  onChange,
  ariaLabel,
  className,
  error = null,
  id,
  onBlur,
  readOnly = false,
  style,
}: GroupedNumberInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const caretDigitsRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const input = inputRef.current;
    const digitsBeforeCaret = caretDigitsRef.current;

    if (!input || digitsBeforeCaret === null) {
      return;
    }

    caretDigitsRef.current = null;
    const position = positionAfterDigits(input.value, digitsBeforeCaret);
    input.setSelectionRange(position, position);
  });

  return (
    <input
      aria-invalid={error ? true : undefined}
      aria-label={ariaLabel}
      className={[error ? 'is-invalid' : '', className ?? ''].filter(Boolean).join(' ') || undefined}
      id={id}
      inputMode="decimal"
      onBlur={onBlur}
      onChange={(event) => {
        const typed = event.target.value;
        const caret = event.target.selectionStart ?? typed.length;
        caretDigitsRef.current = countDigits(typed.slice(0, caret));
        onChange(stripGroupSeparators(typed));
      }}
      readOnly={readOnly}
      ref={inputRef}
      style={style}
      value={formatGroupedNumber(value)}
    />
  );
}

function countDigits(text: string) {
  return (text.match(/\d/g) ?? []).length;
}

/** Позиция сразу после n-й цифры строки — так каретка переживает вставку разрядов. */
function positionAfterDigits(text: string, digits: number) {
  if (digits <= 0) {
    return 0;
  }

  let seen = 0;

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] >= '0' && text[index] <= '9') {
      seen += 1;

      if (seen === digits) {
        return index + 1;
      }
    }
  }

  return text.length;
}
