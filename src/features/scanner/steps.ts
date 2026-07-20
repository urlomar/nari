import type { ScanAnswers, ScanPhotos } from "@/lib/schemas";

export type PhotoStepId = "photo-front" | "photo-back" | "photo-strand";
export type QuestionStepId = "question-naturalState" | "question-product" | "question-freshness";
export type StepId = "welcome" | PhotoStepId | QuestionStepId | "confirmation" | "analyzing";

export interface PhotoStepConfig {
  id: PhotoStepId;
  key: keyof ScanPhotos;
  title: string;
  instruction: string;
}

export interface QuestionOption {
  value: string;
  label: string;
}

export interface QuestionStepConfig {
  id: QuestionStepId;
  key: keyof ScanAnswers;
  question: string;
  options: QuestionOption[];
}

export const PHOTO_STEPS: PhotoStepConfig[] = [
  {
    id: "photo-front",
    key: "front",
    title: "Front-facing hair",
    instruction: "Face the camera and pull your hair back so we can see your hairline and overall shape.",
  },
  {
    id: "photo-back",
    key: "back",
    title: "Back of your head",
    instruction: "Have someone snap the back of your head, or use a mirror — we want to see the crown and nape.",
  },
  {
    id: "photo-strand",
    key: "strand",
    title: "Close-up of your strands",
    instruction: "Get in close on a few strands so we can read your curl pattern.",
  },
];

export const QUESTION_STEPS: QuestionStepConfig[] = [
  {
    id: "question-naturalState",
    key: "naturalState",
    question: "Is your hair in its natural state right now?",
    options: [
      { value: "natural", label: "Natural" },
      { value: "straightened", label: "Straightened or blow-dried" },
      { value: "protective", label: "Braided or protective style" },
      { value: "other", label: "Other" },
    ],
  },
  {
    id: "question-product",
    key: "product",
    question: "Any product in your hair right now?",
    options: [
      { value: "none", label: "No product" },
      { value: "light", label: "Light product (leave-in, oil)" },
      { value: "heavy", label: "Heavy product or styled" },
    ],
  },
  {
    id: "question-freshness",
    key: "freshness",
    question: "How would you describe your hair today?",
    options: [
      { value: "fresh", label: "Freshly washed" },
      { value: "few-days", label: "A few days in" },
      { value: "wash-day", label: "Wash day needed" },
    ],
  },
];

export const STEP_ORDER: StepId[] = [
  "welcome",
  ...PHOTO_STEPS.map((s) => s.id),
  ...QUESTION_STEPS.map((s) => s.id),
  "confirmation",
  "analyzing",
];
