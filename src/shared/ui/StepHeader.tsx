interface StepHeaderProps {
  stepNumber: number;
  totalSteps: number;
  title: string;
  goal: string;
}

export function StepHeader({ stepNumber, totalSteps, title, goal }: StepHeaderProps) {
  return (
    <header className="step-header">
      <div className="step-header__number">
        {String(stepNumber).padStart(2, '0')} из {String(totalSteps).padStart(2, '0')}
      </div>
      <div className="step-header__text">
        <h2>{title}</h2>
        <div className="goal-callout">
          <span>{stepNumber}</span>
          <p>{goal}</p>
        </div>
      </div>
    </header>
  );
}
