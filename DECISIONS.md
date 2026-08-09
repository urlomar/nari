# Decisions

A running record of the non-obvious technical calls behind Nari's product
recommendation feature — written for a reader who wasn't in the room for
any of it (the CTO reviewing this, briefing a co-founder). Each entry:
**what was decided → why → what would change it.** Newest additions go at
the bottom of each section; open questions are a live list — cross
items off (with a note on how they were resolved) rather than deleting
them, so the history stays visible.

## Recommendation approach

**Deterministic tag-matching scoring, not an LLM call.**
An earlier plan described generating recommendations via an LLM. That's
cancelled. Nya's Airtable catalog is cleanly tagged (hair type, porosity,
density, goals, sensitivities, etc.), so matching a quiz answer to a
product is a comparison problem, not a generation problem.
- **Why:** speed (no per-request model latency), cost (zero per-request
  AI spend on this path — `api/analyze.ts`'s vision analysis is a
  separate feature and isn't touched by this), and determinism (the same
  quiz answers always produce the same recommendations, which also makes
  the whole thing unit-testable — an LLM call can't be asserted against
  in a test the way a pure function can). It also structurally rules out
  the single scariest failure mode of an LLM-based recommender:
  hallucinating a product that isn't actually in the catalog, or isn't
  actually sulfate-free when the user asked for that.
- **What would change it:** if the catalog grows large and varied enough
  that simple tag overlap stops being a good enough proxy for "this
  actually works for this person" — e.g. if Nya starts wanting
  free-text-ingredient-level reasoning that tags can't capture. Even
  then, the sensitivity hard-filters (below) should probably stay
  deterministic regardless of what handles the rest, since a reaction is
  the one failure mode worth zero tolerance for.

## Scoring weights

**Weight ordering, and porosity weighted heaviest.**
Priority order (highest to lowest): porosity → curl type → goals →
ranked frustrations → density → budget → black-owned preference →
EWG/community-sentiment tiebreakers. All of it lives in one exported
`SCORING_WEIGHTS` object in `src/lib/products/scoring.ts`.
- **Why:** porosity is weighted heaviest because it's closest to a
  *physical compatibility* signal — how a product performs on hair with
  a given porosity is closer to "does this work at all" than "is this
  the best fit." This is a hair-science judgment made for this pass, not
  a data-driven conclusion — **it's explicitly open to Nya's revision.**
- **What would change it:** Nya (or a future hair-science advisor)
  saying porosity isn't actually the most important compatibility
  signal, or that some other dimension should outrank it. Changing it is
  a one-file, one-minute edit — change the number in `SCORING_WEIGHTS`,
  rerun `npm test`, eyeball the two profiles' printed output (the test
  file logs full picks-per-category for exactly this purpose).

**Porosity, curl type, and density are BOTH weighted AND initially
required, with progressive relaxation.**
These three aren't purely soft weights the way goals/budget/black-owned
are — a product must overlap on all three to be eligible for a category's
picks in the first place. If that leaves a category with fewer than 2
eligible products, the weakest requirement is dropped first — density,
then curl type, then porosity — and the result is labeled `relaxed: true`
with exactly which constraint(s) were dropped.
- **Why:** the alternative (pure weighting, no requirement) would mean a
  product with zero porosity/curl-type/density overlap could still appear
  in results as long as its goals/budget/black-owned scoring was high
  enough — which contradicts porosity being described as determining
  "whether a product physically works." Requiring overlap, with honest
  relaxation as an escape hatch for a thin catalog, keeps the "why we
  picked this" story truthful instead of quietly serving a compatibility
  mismatch.
- **What would change it:** if the catalog grows enough that relaxation
  becomes rare rather than routine (see "no 2A/2B/2C products" below),
  it might be worth tightening this further (e.g. requiring 2+ dimensions
  to overlap, not just "not-yet-relaxed" ones). Not needed today.

**Frustrations are rank-weighted (~3x / ~2x / ~1x by rank), not flat.**
- **Why:** the quiz's own copy tells users "your #1 is Nari's #1
  priority." Flat per-item weighting (matching #1 and #3 equally) would
  make that promise untrue. The multiplier lives in
  `SCORING_WEIGHTS.frustrationUnit`, applied as `(3 - rank) * unit`.
- **What would change it:** if user testing shows people don't actually
  perceive their ranking as being honored (e.g. the weighting gap is too
  subtle to notice in practice) — that's a copy-vs-behavior alignment
  question, not a technical one, and would mean either weighting the
  ranks further apart or softening the copy's promise.

**Sensitivities are hard filters, not weighted points — and an unchecked
free-from box is treated as unsafe, not as "doesn't contain it."**
- **Why:** the quiz promises this explicitly — "Nari will never
  recommend products with these. Full stop." A weighted point deduction
  can still be outscored by a strong match elsewhere; a hard filter
  can't. The conservative unchecked-box rule exists because Airtable
  checkboxes don't distinguish "verified doesn't contain X" from
  "nobody's checked" — see the **Supercurl Miracle Moisture Crème**
  product in the live catalog, whose notes explicitly say its
  sulfate/silicone/protein-free status is "inferred from marketing...
  but NOT independently verified," and whose checkboxes are correctly
  left unchecked as a result. Treating unchecked as unsafe means that
  product is excluded from a protein-sensitive user's results, which is
  the right call: omitting a product is a smaller harm than causing a
  reaction.
- **What would change it:** if Nya's data entry process starts reliably
  distinguishing "confirmed doesn't contain X" from "unverified" — see
  the three-state-field open question below. Until then, this rule
  should not be loosened.

## What's collected but not scored

**`journey` is collected but deliberately unused in scoring.**
- **Why:** no product attribute corresponds to "where someone is in their
  hair journey" — and per Nya's own note, it changes how Nari *talks* to
  a user (tone, framing), not what she recommends. It's passed through
  on `ScoredRecommendationSet.journey` untouched, for Prompt 4's copy.
- **What would change it:** if a future catalog column captures something
  journey-correlated (e.g. "beginner-friendly" tagging), that would be a
  new, separate scored dimension — `journey` itself would likely stay
  out of `SCORING_WEIGHTS` even then, since it's fundamentally a tone
  signal, not a compatibility signal.

**Density's four quiz answers collapse to the catalog's three values.**
Quiz answers `fine_low`/`fine_high` both collapse to the catalog's
`fine`; `thick_low`/`thick_high` both collapse to `thick`; `medium` maps
directly.
- **Why:** the catalog doesn't model the low/high half at all (that's
  *amount* of hair, not density category), so there's nothing to match
  it against.
- **What's lost:** the low/high distinction is dropped for matching
  purposes, but preserved in the raw quiz answers, so Prompt 4 can still
  use it for copy ("since you have thick, high-density hair...") even
  though it doesn't affect which products get picked.
- **What would change it:** if Nya starts tagging products by hair
  *amount* in addition to density category, this collapse could be
  undone and amount could become its own scored dimension.

## Type design

**`scoring.ts` defines its own `DiagnosticAnswers`/`ScoredRecommendationSet`
types rather than extending the existing `QuizAnswers`/`RecommendationSet`
in `src/lib/schemas.ts`.**
- **Why:** those existing types belong to the current placeholder
  quiz/mock flow (`QuizAnswers` is a flat `Record<string,string>`;
  `RecommendationSet` has no room for ranked frustrations, per-product
  match reasons, relaxation flags, or the unenforced-sensitivity flag)
  and `getRecommendations()` — which still reads them — was explicitly
  out of scope to touch this prompt. Extending them in place risked
  either breaking that function or silently misrepresenting the old
  quiz's shape.
- **What would change it:** Prompt 4, when it retires the mock
  `getRecommendations()` path entirely in favor of `scoreProducts()` —
  at that point the old types can likely be deleted rather than kept
  alongside the new ones.

**`budgetMax` is a plain numeric dollar ceiling (`number | null`), not a
bucketed string enum.**
- **Why:** this prompt's brief didn't give exact bucket literals — "under
  $10" appears only in test-profile prose, never as a code value — and a
  number needs no translation table on either side of the quiz-UI
  boundary. `null` means "no budget preference," matching how the Easy
  test profile's "price no factor" was expressed.
- **What would change it:** if Prompt 3's real quiz UI turns out to
  collect budget as a bucketed choice (e.g. a segmented control with
  labeled ranges) rather than a slider/number input, Prompt 3 just needs
  to map its bucket to a representative number (e.g. the bucket's
  midpoint or ceiling) when calling `scoreProducts()` — `scoring.ts`
  itself wouldn't need to change.

## Diagnostic quiz UI (Prompt 3)

### One config-driven question renderer, not five components — a teaching note

If you're new to this codebase: Nya's original quiz file
(`nya-quiz-reference.jsx`, repo root — kept around as the source-of-truth
reference, not imported by the app) had five separate React components,
one per question "type": `IconGrid`, `CurlGrid`, `VisualSingle`,
`ChipMulti`, `RankCards`. Each one rendered a list of buttons and handled
clicks on them. The port (`src/features/scanner/quiz/QuestionRenderer.tsx`)
replaces all five with **one** component, driven by a config object
(`QuizQuestionConfig` in `quizTypes.ts`) that each question in
`quizQuestions.ts` supplies.

**Why one component can replace five:** look past the visual differences
(a 2-column grid of big cards vs. a horizontal list vs. small wrapping
pills) and every one of Nya's five components was doing the same three
things: render a list of option buttons, mark the selected one(s), and
call a callback when a button is tapped. The actual *variation* between
them was small and enumerable:
- **How the buttons are arranged** — grid columns, a vertical list, or
  wrapping pills. This is `layout` in the config.
- **How many can be selected, and whether order matters** — exactly one
  (auto-advances), several unordered (goals, sensitivities), or several
  *ordered* (frustrations — tapping in order matters). This is
  `selectionMode`.
- **What extra text/icon each option carries** — an emoji, an illustrated
  `CurlIcon`, a `sub` line, a `desc` line, a trailing `tag` pill. These
  are just optional fields on `QuizOption` — a given question only
  populates the ones its layout actually uses.

Once you separate "how it's arranged" (`layout`) from "how selection
behaves" (`selectionMode`) from "what content each option carries"
(fields on `QuizOption`), Nya's five components turn out to be five
*specific combinations* of the same three axes, not five fundamentally
different pieces of UI. `IconGrid` is `layout: "grid"` +
`selectionMode: "single"`. `ChipMulti` is `layout: "chips"` +
`selectionMode: "multi"`. `RankCards` is `layout: "grid"` +
`selectionMode: "ranked"`. And so on.

**The honest tradeoff:** a config-driven component is genuinely harder to
read at a glance than five small, concrete ones. When you open
`IconGrid.jsx` in the original file, you can see exactly what it renders
in about 20 lines with no indirection. `QuestionRenderer.tsx` is more
abstract — you have to hold the config schema in your head, and "what
does the `frustrations` question actually look like" requires mentally
combining its config object with the renderer's logic, rather than
reading one self-contained function. That's a real cost, and it's why
this tradeoff is worth stating plainly rather than presenting the
config-driven version as an unambiguous improvement.

**Why it's worth it here specifically:** the five original components
shared roughly 80% of their code — the button markup, the selected-state
styling, the click handling — and differed only in the small, enumerable
ways described above. Under the five-component version, adding a 10th
question with even a slightly different visual treatment (say, a single
row of large square cards) would mean writing a *sixth* nearly-identical
component. Under the config-driven version, it very likely means adding
one more `layout` value (or reusing an existing one) and writing the new
question as data in `quizQuestions.ts` — no new component, and the
selection mechanics (single-select auto-advance, multi/ranked toggling,
the exclusive-value handling for "none"/"nothing") stay centralized in
one place instead of needing to be re-implemented, and kept in sync,
across five files. Given this quiz is expected to keep evolving as Nya
iterates on question content, paying the one-time abstraction cost now
was judged worth it. If a future question genuinely doesn't fit any
combination of `layout`/`selectionMode` — a fundamentally different
interaction, not just a different visual skin — that's the signal to
reach for a dedicated component again rather than stretching the config
schema to fit it.

**Ranked selection**, the one interaction Nya's original code didn't
share across components (`RankCards` had its own tap-to-add/tap-to-remove/
renumber logic, with `ChipMulti` handling unordered multi-select
separately), turned out to need almost no separate code once written this
way: ranked and multi share the exact same toggle function in
`QuestionRenderer.tsx` (add on tap, remove-and-let-the-rest-shift on a
second tap, an `exclusiveValue` clears everything else) — ranked mode
only differs in what it *renders* (a numbered badge instead of a plain
highlight) and in showing the "tap N more in order of priority" hint.

### Dropped the 2 hair-context questions

The old flow's 2 pre-photo questions ("Is your hair in its natural state
right now?" / "Any product in your hair right now?") are gone. They
existed only to disambiguate `api/analyze.ts`'s photo vision analysis
(e.g. so a straightened-hair photo isn't misread as the user's natural
curl pattern), and that pipeline was never wired into the scanner flow to
begin with — `ScannerRoute` has never called `analyzeHair`/`api/analyze`;
the "analyzing" step has only ever called the mock `getRecommendations()`.
Nya's real 9 questions don't include them, and the flow is already 9
quiz questions + 1 photo without adding two more.
- **What would change it:** if photo analysis gets reconnected for real
  condition assessment (scalp health, product buildup, etc. — anything a
  photo alone can't tell you without knowing the hair's current state),
  these 2 questions (or something like them) would need to come back,
  most likely as their own pre-photo mini-step rather than folded into
  the 9-question diagnostic, since they answer a different question
  ("what am I looking at in this photo") than Nya's 9 do ("what does this
  person's hair need"). `NaturalStateAnswerSchema`/`ProductAnswerSchema`
  in `src/lib/schemas.ts` were deliberately left in place (unlike the
  quiz-specific `HairContextSchema`, which was deleted) — they're still
  used by `ScanDataSchema`/`AnalyzeRequestSchema` for that separate,
  currently-dormant pipeline.

### Confirmed literals Prompt 2 flagged as inferred

- **`budgetMax`**: Nya's 4 budget buckets map to `budget → 10`,
  `mid → 25`, `premium → 50`, `any → null` (no ceiling) — implemented in
  `src/features/scanner/toDiagnosticAnswers.ts`. Prompt 2's guess of using
  a plain number (rather than a bucketed string) was correct in shape;
  this just confirms the specific dollar values per bucket.
- **`blackOwnedPref`**: Prompt 2 guessed `"yes_always" | "mixed" |
  "no_preference"`. The real quiz's values are `"yes"` / `"mixed"` /
  `"no_pref"` (see `nya-quiz-reference.jsx`'s `black_owned_pref`
  options) — **`scoring.ts`'s `BlackOwnedPref` type was corrected to match**
  rather than adding a translation layer in `toDiagnosticAnswers.ts`, so
  this field passes through unchanged like curl type, density, goals,
  frustrations, and sensitivities already did. `scoring.test.ts`'s
  `"no_preference"` literal was updated to `"no_pref"` to match.

### PhaseBar not ported

Confirmed per the brief: Nya's `PhaseBar` component (the 3-segment bar
above each question showing all phase names at once) was not ported. Its
job is fully absorbed by the existing `ScanProgress` bar, which now shows
the *current* phase name (one of Nya's three, or "Your photo") next to a
`unit / total` counter rather than all four section labels side by side —
`ScanProgress`'s own comment explains why: the four labels are full
sentences ("What are we building toward?"), and the bar lives in a
480px-max-width column, so cramming all of them in at once the way the
old 3-short-word version (`About you` / `Your photo` / `Diagnostic`) did
isn't viable. This is still "one continuous progress bar, no per-section
resets" — just showing one label at a time instead of four.

### Nya's "done" screen — not ported, proposal for where its copy goes

Nya's reference file ends the quiz on its own dark summary screen ("Nari's
got you, sis. 🌿" + a recap of every answer + "Upload my hair photo →").
Per the brief, the flow instead continues straight into the existing
`PhotoStep` rather than inserting a new interstitial screen between quiz
and photo. The recap-of-answers idea doesn't have an obvious home in the
current flow (nothing today shows the user their quiz answers back), but
**"Nari's got you"** as a line is worth keeping somewhere — the most
natural fit is as a one-line greeting at the top of `PhotoStep` itself
(e.g. above "A photo of your hair"), rather than a separate screen, so
the transition from quiz to photo still feels like Nari acknowledging
what she just learned about you rather than a bare context switch. Left
as a proposal, not implemented — Prompt 4 (or a copy-only follow-up) can
pick it up since it doesn't touch scoring, layout, or the answer shape.

### Real bug found while verifying: photo-step refresh bounced users back into the quiz

Reordering the flow to quiz-then-photo (previously photo-then-quiz)
surfaced a real, 100%-reproducible bug during verification, not a
hypothetical: the sessionStorage write effect only fires while
`step === "quiz"`, so once the user answers the 9th question and moves to
"photo", the persisted blob is frozen at its last quiz-step snapshot
(`quizIndex: 8`, all 9 answers already filled in). `createInitialScannerState()`
unconditionally restores to the "quiz" step whenever it finds a non-empty
persisted `quizAnswers`, with no way to tell "the user is still answering"
apart from "the user finished and moved on." Refreshing on the photo step
therefore silently discarded the fact the user had finished the quiz and
re-showed them its last question instead of the photo step. In the *old*
step order (photo before quiz) this same latent gap existed too, but was
unreachable in practice — sessionStorage would always be empty by the
time the user reached the photo step, since the quiz (the only thing that
writes to it) hadn't started yet.

Fixed with a second effect in `ScannerRoute.tsx` that clears the persisted
blob the moment the user enters "photo" — sessionStorage is only ever
*read* at mount, so clearing it there doesn't affect normal in-app Back
navigation (which uses the reducer's in-memory `quizAnswers`/`quizIndex`,
not sessionStorage) and self-heals if the user backs into the quiz again
(the write effect just fires again). Verified directly: a scripted
mid-quiz refresh restores the in-progress answers and question position;
a scripted refresh on the photo step now resets cleanly to the intro,
matching "the photo never persists" as originally intended.

## Open questions / risks to raise with Nya

- **Mineral-oil sensitivity is currently unenforced.** No Airtable column
  exists for it yet. The filter is written to activate automatically the
  moment a column is added and mapped in `FIELD_MAP` — no `scoring.ts`
  change needed — but until then, a user who reports this sensitivity
  gets `unenforcedSensitivities: ["mineral_oil"]` and no actual
  filtering. Prompt 4 must surface this honestly, not silently.
- **No products are tagged 2A, 2B, or 2C anywhere in the catalog** (as of
  2026-08-07 — 51 records), while the quiz offers those curl-type
  answers. Any 2A/2B or 2C/3A user hits relaxation immediately, on day
  one. Verified directly in `scoring.test.ts`.
- **Newly found while testing this prompt: Mousse and Oil/Sealant have
  zero protein-free products** (0 of 6, and 0 of 4, respectively).
  Relaxation can't fix this — it never touches sensitivity exclusions by
  design — so a protein-sensitive user correctly gets an empty result
  for those two categories today. Worth flagging to Nya as a catalog gap
  alongside the curl-type one above.
- **Unchecked free-from checkboxes conflate "contains it" with
  "unverified."** Handled conservatively today (both treated as unsafe —
  see "Sensitivities" above), but as the catalog approaches ~1,000
  products this gets riskier in the other direction: products that
  genuinely don't contain an ingredient, but haven't been checked in
  Airtable, will be systematically excluded from results they should
  qualify for. May be worth Nya's data-entry process moving to a
  three-state field (Yes / No / Unverified) rather than a plain
  checkbox, once volume makes manual verification of every row
  impractical.
- **Products with `price: null`** (10 of 50 currently) are never
  excluded, but always rank slightly below an otherwise-identical
  in-budget product. Prompt 4 needs to render "price unavailable" (or
  similar) rather than "$0" or "null" for these.
