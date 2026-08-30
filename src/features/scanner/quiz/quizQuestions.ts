import type { QuizQuestionConfig } from "./quizTypes";

/**
 * Nya's real 9-question diagnostic quiz, ported from nya-quiz-reference.jsx
 * (repo root). Content, order, phases, answer values, and copy are kept
 * verbatim — this is the source of truth Prompt 2's scoring engine already
 * expects (see src/lib/products/scoring.ts's GOAL_VALUES/FRUSTRATION_VALUES/
 * SENSITIVITY_VALUES, which match these option values exactly). Do not
 * rename or normalize any `value` here — see CLAUDE.md.
 *
 * Visual layout is expressed via `layout`/`selectionMode`/`columns` instead
 * of Nya's five separate components (icon_grid/curl_grid/visual_single/
 * chip_multi/rank_cards) — QuestionRenderer.tsx is the one renderer that
 * reads this config. See DECISIONS.md for why.
 */
export const QUIZ_QUESTIONS: QuizQuestionConfig[] = [
  {
    id: "journey",
    phase: "First, let's place you",
    question: "Where are you in your natural hair journey?",
    subtitle: "Nari wants to meet you exactly where you are.",
    selectionMode: "single",
    layout: "grid",
    columns: 2,
    options: [
      { value: "transitioning_early", emoji: "🌱", label: "Just started transitioning", sub: "0–12 months" },
      { value: "transitioning_late", emoji: "🌿", label: "Still transitioning, almost there", sub: "1–2 years" },
      { value: "big_chop_recent", emoji: "✂️", label: "Just did the big chop", sub: "Fresh start" },
      { value: "natural_established", emoji: "🌳", label: "Been natural for a while", sub: "3+ years" },
      { value: "always_natural", emoji: "👑", label: "Always been natural", sub: "Born this way" },
    ],
    nariNote:
      "Whether you're two weeks post-relaxer or ten years natural, your hair has completely different needs. This changes how Nari talks to you — not just what she recommends.",
  },
  {
    id: "curl_type",
    phase: "First, let's place you",
    question: "Which looks most like your curl pattern?",
    subtitle: "Pick your dominant pattern. Mixed types are the norm.",
    selectionMode: "single",
    layout: "grid",
    columns: 3,
    options: [
      { value: "2a2b", label: "2A / 2B", desc: "Loose, beachy waves", curl: "wave" },
      { value: "2c3a", label: "2C / 3A", desc: "Defined S-waves", curl: "s_wave" },
      { value: "3b3c", label: "3B / 3C", desc: "Bouncy corkscrews", curl: "corkscrew" },
      { value: "4a", label: "4A", desc: "Tight coils, visible S", curl: "coil" },
      { value: "4b", label: "4B", desc: "Dense Z-pattern", curl: "z_coil" },
      { value: "4c", label: "4C", desc: "Tight zig-zag, major volume", curl: "tight_coil" },
    ],
  },
  {
    id: "porosity",
    phase: "First, let's place you",
    question: "How does your hair behave with water?",
    subtitle: "The single most important thing to know about your hair.",
    selectionMode: "single",
    layout: "list",
    options: [
      { value: "low", emoji: "💧", label: "Water beads up and sits on top", tag: "Low porosity" },
      { value: "normal", emoji: "🌊", label: "Water absorbs at a normal pace", tag: "Normal porosity" },
      { value: "high", emoji: "🧽", label: "Soaks up instantly but dries out fast", tag: "High porosity" },
      { value: "unsure", emoji: "🤔", label: "Honestly not sure yet", tag: "We'll figure it out" },
    ],
    nariNote:
      "High porosity hair needs heavier creams and oils to seal moisture in. Low porosity hair repels products — it loves light, water-based formulas and a little heat to open the cuticle. This single answer changes your entire product list.",
  },
  {
    id: "density",
    phase: "First, let's place you",
    question: "How would you describe your strands?",
    subtitle: "Think about both the thickness of each strand and how much hair you have.",
    selectionMode: "single",
    layout: "grid",
    columns: 2,
    options: [
      { value: "fine_low", emoji: "🪶", label: "Fine strands", sub: "Low density" },
      { value: "fine_high", emoji: "🌫️", label: "Fine strands", sub: "High density" },
      { value: "medium", emoji: "✨", label: "Medium strands", sub: "Medium density" },
      { value: "thick_low", emoji: "🌿", label: "Thick strands", sub: "Low density" },
      { value: "thick_high", emoji: "🌳", label: "Thick strands", sub: "High density" },
    ],
  },
  {
    id: "goals",
    phase: "What are we building toward?",
    question: "What do you most want for your hair right now?",
    subtitle: "Pick up to 3.",
    selectionMode: "multi",
    layout: "chips",
    max: 3,
    options: [
      { value: "moisture", emoji: "💧", label: "Deep moisture" },
      { value: "growth", emoji: "📏", label: "Length & growth" },
      { value: "definition", emoji: "🌀", label: "Curl definition" },
      { value: "frizz", emoji: "🌬️", label: "Frizz control" },
      { value: "scalp", emoji: "🌱", label: "Healthy scalp" },
      { value: "damage", emoji: "🛡️", label: "Repair & strengthen" },
      { value: "volume", emoji: "💨", label: "Volume & fullness" },
      { value: "simplify", emoji: "⚡", label: "Simpler routine" },
      { value: "affordable", emoji: "💸", label: "Affordable products" },
      { value: "technique", emoji: "🤲", label: "Better technique" },
    ],
  },
  {
    id: "frustrations",
    phase: "What are we building toward?",
    question: "What are your top 3 hair frustrations?",
    subtitle: "Tap them in order — your #1 is Nari's #1 priority.",
    selectionMode: "ranked",
    layout: "grid",
    columns: 2,
    max: 3,
    exclusiveValue: "nothing",
    options: [
      { value: "breakage", emoji: "💔", label: "Breakage & shedding" },
      { value: "dryness", emoji: "🏜️", label: "Constant dryness" },
      { value: "frizz", emoji: "⚡", label: "Uncontrollable frizz" },
      { value: "products", emoji: "❓", label: "Products don't work" },
      { value: "time", emoji: "⏰", label: "Routine takes too long" },
      { value: "detangling", emoji: "😤", label: "Detangling is a nightmare" },
      { value: "cost", emoji: "💸", label: "Good products cost too much" },
      { value: "technique", emoji: "📚", label: "Don't know how to apply" },
      { value: "nothing", emoji: "🌟", label: "Honestly doing okay!" },
    ],
    nariNote:
      "Your #1 frustration shapes everything. If detangling tops your list, Nari leads with slip-focused products and technique tips before anything else.",
  },
  {
    id: "sensitivities",
    phase: "Last few things",
    question: "Does your hair react badly to anything?",
    subtitle: "Hard filters — Nari will never recommend products with these.",
    selectionMode: "multi",
    layout: "chips",
    max: 99,
    exclusiveValue: "none",
    options: [
      { value: "protein", emoji: "🥚", label: "Protein" },
      { value: "sulfates", emoji: "🫧", label: "Sulfates" },
      { value: "silicones", emoji: "💊", label: "Silicones" },
      { value: "fragrance", emoji: "🌸", label: "Fragrance" },
      { value: "mineral_oil", emoji: "🛢️", label: "Mineral oil" },
      { value: "none", emoji: "✅", label: "Nothing yet" },
    ],
    nariNote:
      "Even if a product has thousands of glowing reviews — if it contains something on your list, Nari won't recommend it. Full stop.",
  },
  {
    id: "budget",
    phase: "Last few things",
    question: "What's your budget per product?",
    subtitle: "Nari will always lead with options in your range.",
    selectionMode: "single",
    layout: "grid",
    columns: 2,
    options: [
      { value: "budget", emoji: "🛒", label: "Under $10", sub: "Drugstore wins" },
      { value: "mid", emoji: "💛", label: "$10 – $25", sub: "Sweet spot" },
      { value: "premium", emoji: "💎", label: "$25 – $50", sub: "Worth the investment" },
      { value: "any", emoji: "👑", label: "Price isn't a factor", sub: "Show me the best" },
    ],
  },
  {
    id: "black_owned_pref",
    phase: "Last few things",
    question: "Want us to prioritize Black-owned brands?",
    subtitle: "We track this and love putting them front and center.",
    selectionMode: "single",
    layout: "grid",
    columns: 3,
    options: [
      { value: "yes", emoji: "✊🏾", label: "Yes always" },
      { value: "mixed", emoji: "🤝", label: "Show a mix" },
      { value: "no_pref", emoji: "🌐", label: "No preference" },
    ],
  },
];

/** Nya's three phase names, in order — feed the shared ScanProgress bar's section labels. */
export const QUIZ_PHASES = [...new Set(QUIZ_QUESTIONS.map((q) => q.phase))];

export const QUIZ_QUESTION_COUNT = QUIZ_QUESTIONS.length;
