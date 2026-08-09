import { CurlIcon } from "./CurlIcon";
import type { QuizAnswerValue, QuizOption, QuizQuestionConfig } from "./quizTypes";
import s from "./QuestionRenderer.module.css";

export interface QuestionRendererProps {
  question: QuizQuestionConfig;
  value: QuizAnswerValue | undefined;
  onChange: (value: QuizAnswerValue) => void;
}

function asArray(value: QuizAnswerValue | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

/**
 * The one renderer standing in for Nya's five layout components
 * (icon_grid, curl_grid, visual_single, chip_multi, rank_cards) — see
 * DECISIONS.md for why a single config-driven component replaces them.
 * `layout` controls arrangement (grid/list/chips), `selectionMode`
 * controls interaction (single/multi/ranked); every option button shares
 * the same markup regardless of which combination is active, just with
 * different fields populated (icon, sub, desc, tag, rank badge).
 */
export function QuestionRenderer({ question, value, onChange }: QuestionRendererProps) {
  const { selectionMode, layout, columns, max, exclusiveValue, options } = question;
  const selectedArray = asArray(value);

  function isSelected(optionValue: string): boolean {
    return selectionMode === "single" ? value === optionValue : selectedArray.includes(optionValue);
  }

  function handleClick(optionValue: string) {
    if (selectionMode === "single") {
      onChange(optionValue);
      return;
    }

    // multi and ranked share identical toggle mechanics — ranked only
    // differs in how a selection is *displayed* (a numbered badge instead
    // of a plain highlight) and in showing the priority hint below.
    if (exclusiveValue && optionValue === exclusiveValue) {
      onChange([optionValue]);
      return;
    }

    const cleaned = exclusiveValue ? selectedArray.filter((v) => v !== exclusiveValue) : selectedArray;
    if (cleaned.includes(optionValue)) {
      onChange(cleaned.filter((v) => v !== optionValue));
    } else if (cleaned.length < (max ?? Infinity)) {
      onChange([...cleaned, optionValue]);
    }
  }

  const showRankHint =
    selectionMode === "ranked" && selectedArray.length > 0 && selectedArray[0] !== exclusiveValue;

  return (
    <div>
      <div className={s.options} data-layout={layout} data-columns={columns}>
        {options.map((option) => (
          <OptionButton
            key={option.value}
            option={option}
            layout={layout}
            selected={isSelected(option.value)}
            rank={selectionMode === "ranked" ? selectedArray.indexOf(option.value) : -1}
            onClick={() => handleClick(option.value)}
          />
        ))}
      </div>
      {showRankHint && max !== undefined && (
        <p className={s.hint}>
          {selectedArray.length < max
            ? `Tap ${max - selectedArray.length} more in order of priority`
            : "All ranked! Tap any to remove and re-order."}
        </p>
      )}
    </div>
  );
}

interface OptionButtonProps {
  option: QuizOption;
  layout: QuizQuestionConfig["layout"];
  selected: boolean;
  /** -1 when not ranked or not yet picked; otherwise its 0-indexed rank. */
  rank: number;
  onClick: () => void;
}

function OptionButton({ option, layout, selected, rank, onClick }: OptionButtonProps) {
  return (
    <button type="button" className={s.option} data-selected={selected || undefined} onClick={onClick}>
      {option.curl ? (
        <CurlIcon type={option.curl} size={layout === "chips" ? 22 : 40} />
      ) : option.emoji ? (
        <span className={s.icon} aria-hidden="true">
          {option.emoji}
        </span>
      ) : null}
      <span className={s.label}>{option.label}</span>
      {option.sub && <span className={s.sub}>{option.sub}</span>}
      {option.desc && <span className={s.desc}>{option.desc}</span>}
      {option.tag && <span className={s.tag}>{option.tag}</span>}
      {rank !== -1 && (
        <>
          <span className="sr-only">{`, ranked number ${rank + 1}`}</span>
          <span className={s.rankBadge} aria-hidden="true">
            {rank + 1}
          </span>
        </>
      )}
    </button>
  );
}
