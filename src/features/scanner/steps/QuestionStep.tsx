import type { QuestionStepConfig } from "../steps";
import { ChipOptions } from "../components/ChipOptions";
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
      <ChipOptions options={config.options} selected={selected} onSelect={onSelect} />
      <div className={s.navRow}>
        <button type="button" className={s.textButton} onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
