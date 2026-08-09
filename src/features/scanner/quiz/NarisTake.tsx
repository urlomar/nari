import { useState } from "react";
import s from "./NarisTake.module.css";

export interface NarisTakeProps {
  note: string;
}

/**
 * Ported from nya-quiz-reference.jsx's inline showNote toggle — a quiet
 * text-button that expands a bordered note block. Only journey, porosity,
 * and frustrations carry a nariNote (see quizQuestions.ts); QuestionRenderer
 * renders this once per question when one is present, and it resets to
 * closed on every question change since it's remounted with the rest of
 * the question body (fresh useState per mount).
 */
export function NarisTake({ note }: NarisTakeProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={s.wrap}>
      <button type="button" className={s.trigger} onClick={() => setOpen((prev) => !prev)} aria-expanded={open}>
        <span aria-hidden="true">💬</span>
        {open ? "Got it, close" : "Nari's take on this"}
      </button>
      <div className={`${s.note} ${open ? s.noteOpen : ""}`}>
        <div className={s.noteInner}>{note}</div>
      </div>
    </div>
  );
}
