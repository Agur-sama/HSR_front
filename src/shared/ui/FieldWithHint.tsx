interface FieldWithHintProps {
  id: string;
  label: string;
  value: string;
  hint: string;
  unit?: string;
  onChange: (value: string) => void;
}

export function FieldWithHint({ id, label, value, hint, unit, onChange }: FieldWithHintProps) {
  return (
    <label className="field-with-hint" htmlFor={id}>
      <span>{label}</span>
      <input id={id} onChange={(event) => onChange(event.target.value)} value={value} />
      <small>
        {hint}
        {unit ? `, ${unit}` : ''}
      </small>
    </label>
  );
}
