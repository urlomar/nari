import s from "../scanner.module.css";

export interface ChipOption {
  value: string;
  label: string;
}

export interface ChipOptionsProps {
  options: ChipOption[];
  selected: string | null;
  onSelect: (value: string) => void;
}

/**
 * The single-select "context-chip" pattern, extracted so the pre-photo
 * hair-context questions and the 10-question diagnostic quiz render options
 * identically instead of duplicating the markup.
 */
export function ChipOptions({ options, selected, onSelect }: ChipOptionsProps) {
  return (
    <div className={s.chipGrid}>
      {options.map((option) => (
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
  );
}
