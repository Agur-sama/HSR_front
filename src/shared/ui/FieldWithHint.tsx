import { InfoTooltip } from './InfoTooltip';

interface FieldWithHintProps {
  id: string;
  label: string;
  value: string;
  hint: string;
  /** Текст всплывающей подсказки «i». По умолчанию — тот же `hint`. */
  tooltip?: string;
  unit?: string;
  readOnly?: boolean;
  error?: string | null;
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
  onBlur?: () => void;
  onChange: (value: string) => void;
}

export function FieldWithHint({
  id,
  label,
  value,
  hint,
  tooltip,
  unit,
  readOnly = false,
  error = null,
  inputMode,
  onBlur,
  onChange,
}: FieldWithHintProps) {
  return (
    <label className="field-with-hint" htmlFor={id}>
      <span className="field-with-hint__label">
        {label}
        <InfoTooltip label={tooltip ?? hint} />
      </span>
      {/* Единица стоит вплотную к полю, а не отдельной колонкой у дальнего края:
          там она читалась как случайный символ посреди строки. Заодно ошибка
          больше не выталкивает её на следующую строку сетки. */}
      <span className="field-with-hint__control">
        <input
          aria-invalid={error ? true : undefined}
          className={error ? 'is-invalid' : undefined}
          id={id}
          inputMode={inputMode}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          readOnly={readOnly}
          value={value}
        />
        <small>
          {hint}
          {unit ? `, ${unit}` : ''}
        </small>
      </span>
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}
