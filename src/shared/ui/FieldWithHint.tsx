import { InfoTooltip } from './InfoTooltip';

interface FieldWithHintProps {
  id: string;
  label: string;
  value: string;
  hint: string;
  unit?: string;
  readOnly?: boolean;
  onChange: (value: string) => void;
}

export function FieldWithHint({ id, label, value, hint, unit, readOnly = false, onChange }: FieldWithHintProps) {
  return (
    <label className="field-with-hint" htmlFor={id}>
      <span className="field-with-hint__label">
        {label}
        <InfoTooltip label={hint} />
      </span>
      <input id={id} onChange={(event) => onChange(event.target.value)} readOnly={readOnly} value={value} />
      <small>
        {hint}
        {unit ? `, ${unit}` : ''}
      </small>
    </label>
  );
}
