import { useState } from 'react';
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
 * Поле для крупных чисел: при фокусе показывает сырое значение (его удобно
 * править), после потери фокуса — с разделителями разрядов (ТЗ v3.5 §3 П-05).
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
  const [isFocused, setIsFocused] = useState(false);

  return (
    <input
      aria-invalid={error ? true : undefined}
      aria-label={ariaLabel}
      className={[error ? 'is-invalid' : '', className ?? ''].filter(Boolean).join(' ') || undefined}
      id={id}
      inputMode="decimal"
      onBlur={() => {
        setIsFocused(false);
        onBlur?.();
      }}
      onChange={(event) => onChange(stripGroupSeparators(event.target.value))}
      onFocus={() => setIsFocused(true)}
      readOnly={readOnly}
      style={style}
      value={isFocused ? value : formatGroupedNumber(value)}
    />
  );
}
