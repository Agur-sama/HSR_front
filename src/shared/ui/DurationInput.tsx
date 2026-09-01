import { maskDurationInput, normalizeDurationInput } from '../lib/durationInput';

interface DurationInputProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  invalid?: boolean;
  onBlur?: () => void;
  readOnly?: boolean;
}

/**
 * Поле длительности ЧЧ:ММ, в котором двоеточие ставится само.
 *
 * Во время набора применяется маска, при потере фокуса значение дополняется
 * нулями до ЧЧ:ММ. Если из набранного время собрать нельзя (минуты 60 и
 * больше), введённое остаётся на месте — студент увидит ошибку и поправит,
 * а не обнаружит, что поле само себя стёрло.
 */
export function DurationInput({
  value,
  onChange,
  ariaLabel,
  className,
  invalid = false,
  onBlur,
  readOnly = false,
}: DurationInputProps) {
  return (
    <input
      aria-invalid={invalid ? true : undefined}
      aria-label={ariaLabel}
      className={[invalid ? 'is-invalid' : '', className ?? ''].filter(Boolean).join(' ') || undefined}
      inputMode="numeric"
      onBlur={() => {
        if (!readOnly) {
          const normalized = normalizeDurationInput(value);

          if (normalized !== null && normalized !== value) {
            onChange(normalized);
          }
        }

        onBlur?.();
      }}
      onChange={(event) => onChange(maskDurationInput(event.target.value))}
      placeholder="ЧЧ:ММ"
      readOnly={readOnly}
      value={value}
    />
  );
}
