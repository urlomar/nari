import type { QuestionStepConfig } from "../steps";
import s from "../scanner.module.css";

export interface QuestionStepProps {
  config: QuestionStepConfig;
  selected: string | null;
  onSelect: (value: string) => void;
  onBack: () => void;
}

export function QuestionStep({ config, selected, onSelect, onBack }: QuestionStepProps) {
  return (
    <div className={s.step}>
      <h2 className={s.heading}>{config.question}</h2>
      <div className={s.chipGrid}>
        {config.options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={s.chip}
            data-selected={selected === option.value || undefined}
            onClick={() => onSelect(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className={s.navRow}>
        <button type="button" className={s.textButton} onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
