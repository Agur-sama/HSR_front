import { InfoTooltip } from './InfoTooltip';

interface FieldWithHintProps {
  id: string;
  label: string;
  value: string;
  hint: string;
  unit?: string;
  readOnly?: boolean;
  error?: string | null;
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
  onChange: (value: string) => void;
}

export function FieldWithHint({
  id,
  label,
  value,
  hint,
  unit,
  readOnly = false,
  error = null,
  inputMode,
  onChange,
}: FieldWithHintProps) {
  return (
    <label className="field-with-hint" htmlFor={id}>
      <span className="field-with-hint__label">
        {label}
        <InfoTooltip label={hint} />
      </span>
      <input
        aria-invalid={error ? true : undefined}
        className={error ? 'is-invalid' : undefined}
        id={id}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        readOnly={readOnly}
        value={value}
      />
      {error ? <small className="field-error">{error}</small> : null}
      <small>
        {hint}
        {unit ? `, ${unit}` : ''}
      </small>
    </label>
  );
}
