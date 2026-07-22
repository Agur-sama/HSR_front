import { useId, useState } from 'react';

interface InfoTooltipProps {
  label: string;
}

export function InfoTooltip({ label }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className="info-tooltip">
      <button
        aria-describedby={tooltipId}
        aria-expanded={isOpen}
        aria-label="Пояснение к показателю"
        className="info-tooltip__trigger"
        onBlur={() => setIsOpen(false)}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        onFocus={() => setIsOpen(true)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        type="button"
      >
        i
      </button>
      <span className={`info-tooltip__bubble ${isOpen ? 'is-open' : ''}`} id={tooltipId} role="tooltip">
        {label}
      </span>
    </span>
  );
}
