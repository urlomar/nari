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
Priority order (highest to lowest): porosity → goals → ranked
frustrations → density → budget → black-owned preference → curl type →
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
- **Reordered (Final Spike, Part A / P1 of 4).** Curl type dropped from
  #2 (originally right below porosity) to #7 (last real dimension, above
  only the tiebreakers) — see "Curl type demoted to a pure weight" below
  for the full reasoning and the eligibility-side consequence. Goals,
  frustrations, density, budget, and black-owned all moved up one slot
  as a result; their relative order to each other is unchanged. This came
  directly from the CEO, who is the hair expert on the team — porosity's
  #1 spot was never in question, only curl type's position.

**Porosity and density are BOTH weighted AND initially required, with
progressive relaxation. Curl type is not — see below.**
These two aren't purely soft weights the way goals/budget/black-owned
are — a product must overlap on both to be eligible for a category's
picks in the first place. If that leaves a category with fewer than 2
eligible products, the weakest requirement is dropped first — density,
then porosity — and the result is labeled `relaxed: true` with exactly
which constraint(s) were dropped. (Curl type used to be a third required
dimension, dropped first in relaxation order, ahead of porosity — see
below for why that changed.)
- **Why:** the alternative (pure weighting, no requirement) would mean a
  product with zero porosity/density overlap could still appear in
  results as long as its goals/budget/black-owned scoring was high
  enough — which contradicts porosity being described as determining
  "whether a product physically works." Requiring overlap, with honest
  relaxation as an escape hatch for a thin catalog, keeps the "why we
  picked this" story truthful instead of quietly serving a compatibility
  mismatch. Density stays required for the same physical-fit reason,
  just at lower priority than porosity.
- **What would change it:** if the catalog grows enough that relaxation
  becomes rare rather than routine, it might be worth tightening this
  further (e.g. requiring both dimensions to overlap, not just
  "not-yet-relaxed" ones). Not needed today.

**Curl type demoted to a pure weight — no longer a hard eligibility
requirement (Final Spike, Part A / P1 of 4).**
Previously curl type was both weighted #2 *and* required (like porosity
and density): a product with zero overlap on the user's expanded curl-type
tags was ineligible for a category's picks entirely, and if that thinned a
category below 2 eligible products, curl type was the first requirement
dropped. Now it's purely additive — `computeScoreBreakdown` still scores
any overlap (worth 6 points, see `SCORING_WEIGHTS.curlType`), but
`requiredDimensionsFor`/`meetsRequiredDimensions` never gate on it, and
`RELAXATION_ORDER` no longer lists it (there's nothing left to relax).
- **Why:** per the CEO's own reasoning, products are tagged across
  curl-type *ranges* in Nya's catalog — a product tagged for 4C usually
  also carries 4A and 4B — so curl type rarely discriminates between two
  candidate products the way porosity or a declared goal does. A
  dimension that seldom differentiates shouldn't carry heavy weight or
  gatekeep eligibility; it should nudge the ranking and nothing more.
- **Real consequence already visible in the tests:** before this change,
  every 2A/2B or 2C/3A user hit curl-type relaxation on essentially every
  category, because the catalog has zero products tagged those curl
  types (see "No 2A/2B/2C products exist yet" below, unchanged as a
  catalog gap). That relaxation is now gone — those users simply score 0
  on the curl-type dimension instead of losing eligibility, which is a
  materially better experience for exactly the users who were most
  affected by the catalog gap.
- **Deliberately NOT touched: the exported type shapes.**
  `CategoryRecommendation["relaxedConstraints"]` and
  `DebugCategoryDetail["relaxedConstraints"]` still type as
  `Array<"density" | "curlType" | "porosity">` even though `"curlType"`
  can now never actually appear in one — narrowing the type would have
  forced edits to `ScanResults.tsx`, `useSendResults.ts`,
  `api/_lib/resultsSchema.ts`, and `api/send-results.ts` (all of which
  hand-declare the same three-value union independently), which this
  prompt was explicitly scoped to not touch ("scoring logic only, no UI
  changes — P2/P3 handle the flow and results page"). Scoring's own test
  suite asserts the real runtime guarantee (curl type never appears)
  directly rather than relying on the type to enforce it.
- **Known stale side effect, not fixed here:** `/debug/scoring`'s
  built-in `"relaxation"` profile (`ScoringDebug.tsx`) is labeled "2C/3A —
  triggers curl-type relaxation" and its inline comment claims this was
  verified against the fixture. That claim is no longer true — curl type
  can't trigger relaxation anymore, so that profile likely now shows
  `relaxed: false` everywhere. Left as-is since `ScoringDebug.tsx` is a UI
  file outside this prompt's scope; flagged in "Open questions" below for
  P2/P3 (or a quick standalone fix) to correct the label/profile.
- **What would change it back:** if Nya's tagging practice changes (e.g.
  she starts tagging products for a single specific curl type rather than
  a range), curl type would start actually discriminating between
  products again, and it might be worth promoting it back into the
  weighted/required tier. Until then, this is the intended, expert-directed
  state, not a bug.

**No "clean formulation" bonus for sulfate-free/protein-free/etc. beyond
what a user actually declared as a sensitivity — considered and rejected
(Final Spike, Part A / P1 of 4).**
The idea: award a small positive score bump to sulfate-free, protein-free,
silicone-free, etc. products even for users who never flagged that
sensitivity, on the theory that "clean" formulations are broadly
preferable. Considered and explicitly rejected.
- **Why:** some users genuinely benefit from protein, silicones, sulfates,
  etc. in their formulas — "free-from" is not universally better, it's
  situational. A user who didn't declare a sensitivity gets zero bonus or
  penalty on that dimension anywhere in the pipeline: no Stage 1 filter
  (already true before this pass) and no Stage 2 points either (confirmed
  — there was never such a bonus in the code to begin with; this entry
  documents that it was deliberately kept that way, not silently absent).
- **What would change it:** real evidence that Nari's specific users skew
  strongly toward wanting "clean" formulations even without declaring a
  specific sensitivity — that would be a product/positioning decision for
  Nya, not something to infer from the data pipeline alone.

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

## Spike A — End-to-end results (quiz → profile → photo → real results)

**Prefetch the catalog at quiz start; don't precompute scoring.**
`dataSource.ts`'s `getProducts()` caches its own in-flight/resolved
promise at module scope; `prefetchProducts()` (called from
`ScannerRoute.tsx` the moment `step === "quiz"`) just kicks that promise
off without awaiting it.
- **Why:** `scoreProducts()` is a pure, millisecond-cheap function — the
  network fetch is the slow, cacheable part, especially against a cold
  server-side cache (`api/products.ts`'s own ~10min in-memory cache).
  The user spends real time (minutes) answering 9 questions, so starting
  the fetch at quiz start means it's almost always warm by the time
  `getRecommendations()` needs it at the analyzing step, with no
  user-visible loading state added anywhere. Deliberately did **not**
  also precompute the score itself: the user can go Back and change any
  answer all the way through the profile step, and invalidating a cached
  score on every answer edit isn't worth the complexity when scoring
  itself is too cheap to matter.
- **What would change it:** if the catalog fetch itself becomes slow
  enough that even a quiz-start prefetch doesn't finish in time (e.g. a
  catalog 100x this size with a cold cache) — at that point a visible
  loading state on the analyzing step, not a different prefetch timing,
  is probably the right fix.

**Results render before email capture is even offered — never gated.**
`ScanResults.tsx` shows every category's picks unconditionally; the
`EmailCapture` form is just another section afterward, not a modal or a
blur-until-submit overlay.
- **Why:** the brief is explicit here, and it matches the product's own
  value proposition — Nari's pitch is "we give you real answers," and
  gating the answers behind an email address would undercut that on the
  single screen meant to prove it. It also avoids a common dark pattern
  (implying results require signup when they don't).
- **What would change it:** a deliberate future growth experiment could
  A/B a gate, but that's a product decision for Nya, not a default this
  spike should ship with.

**The five locked edge cases** (see CLAUDE.md's "Scanner Flow" section
for the implementation) — reasoning behind each:
1. **Empty category stays visible with a "0" badge**, rather than being
   hidden. Hiding it would silently misrepresent the routine as having
   fewer steps than it does (e.g. a protein-sensitive user would see a
   5-step routine with no explanation of where Mousse went) — worse than
   an honest "we're adding products" placeholder.
2. **The relaxed-match banner only renders when the category also has
   ≥1 pick.** Found during verification, not anticipated up front: a
   category that's both relaxed *and* empty (all three constraints
   dropped, still nothing eligible after sensitivity filtering — e.g.
   Mousse for a protein-sensitive user) rendered a "closest match"
   banner directly above "no matches in this category," which reads as
   self-contradictory. The fix is a one-line `&& active.picks.length >
   0` guard, not a scoring.ts change — `relaxedConstraints` is still
   correct data (relaxation genuinely was attempted), it just isn't
   useful copy to surface when nothing survived it either way.
3. **Null price omits the line entirely**, never a placeholder like
   "price unavailable" — the brief called for omission specifically, and
   it reads cleaner on a card than a line dedicated to saying "we don't
   know." `formatPrice()` is only ever called after a `product.price !==
   null` check, so this can't regress silently.
4. **The unenforced-sensitivities banner is built from
   `unenforcedSensitivities` at render time**, not hardcoded to mention
   mineral oil specifically — `getOptionLabel("sensitivities", ...)`
   looks up whatever's actually in the array. This is what makes it
   self-resolving: the day a `Mineral Oil Free` column exists and is
   mapped in `FIELD_MAP`, `scoring.ts`'s existing `getMineralOilFree()`
   check starts returning real booleans instead of `undefined`, the
   sensitivity moves from `unenforcedSensitivities` to being genuinely
   filtered, and this banner stops mentioning it — with no code change
   here.
5. **Email capture after results** — see above.

**Photo step honesty fix — why each specific line changed.**
See CLAUDE.md's "Photo step honesty fix" for the full list of files
touched. The underlying principle: don't describe capability that isn't
wired up. `api/analyze.ts` exists and is deployed, but nothing in the
scanner flow calls it — that's been true since Prompt 3 reordered the
flow (see "Dropped the 2 hair-context questions" above) and remains true
after this spike; wiring it is explicitly out of scope. Two copy bugs
were fixed together because they're the same class of problem (claiming
something about the photo that isn't true), even though only one
("analyzed and immediately deleted") was the specifically-named
launch-blocker: Features.tsx's "Snap three quick photos" was already
stale on its own (the flow has taken one optional photo since before
this spike) and sits two lines from the claim that was in scope, so
fixing both in the same pass was cheaper and more honest than fixing one
and leaving the other.

**Verification used live Airtable data pulled via the Airtable MCP
connector, not the checked-in fixture, and not a hand-written mock.**
This sandbox has no `.env.local` (no `AIRTABLE_TOKEN`/base/table vars),
so `api/products.ts` can't literally run end-to-end here the way it
would on Vercel. Rather than screenshot the app against invented data,
the live catalog (51 records, same base as production —
`appt4p8UBTxso3Q6w`) was pulled via the Airtable MCP connector, converted
from its field-ID-keyed shape back into the real Airtable REST API's
field-name-keyed shape, and run through the **actual**
`normalizeProduct`/`buildNormalizationReport` code in `api/_lib/schema.ts`
(via a temporary, unshipped Vitest file, deleted after use) — so the
data feeding the screenshots went through the identical normalization
logic production uses, not a re-implementation of it. A temporary Vite
dev-server middleware (added to `vite.config.ts`, gated behind a
`VERIFY_LIVE_DATA` env var, reverted via `git checkout` immediately
after) served this real output at `/api/products` so the actual running
app — not a mock — could be driven end to end with a temporary local
Playwright install (same "not a project dependency" approach as prior
passes) across light/dark and desktop/390px.
- **What this caught**: the live catalog has drifted from Prompt 2's
  checked-in test fixture (`src/lib/products/__fixtures__/catalog.json`,
  captured 2026-08-07) — 18 of 50 products now differ, mostly Nya
  actively re-verifying and *broadening* porosity tags (several
  `notes` fields literally say "CORRECTED: added High" etc.), plus a few
  price/buyLink/ounces corrections and one product renamed. This is
  healthy catalog maintenance, not a bug — but it means the checked-in
  fixture is now a stale snapshot, not current truth. **Deliberately
  left the fixture unchanged** — updating it is Prompt 2/scoring-test
  territory, not this spike's mandate, and the existing 14 scoring tests
  still pass against it unmodified. Flagged here so whoever next touches
  `scoring.test.ts` knows the fixture is ~2 weeks stale as of this
  writing, not that it was missed.
- **What's still not verified**: the actual Vercel Lambda invocation of
  `api/products.ts` itself (auth to Airtable, the ~10min in-memory
  cache, the stale-cache-on-failure fallback) — same category of gap
  Milestone 6 already noted for `api/analyze.ts`. The normalization
  *logic* is proven against live data (above); the serverless
  *transport* around it is not re-proven here.

## Spike B — Hardening, tests, and scoring transparency (Day 2 of 2)

Spike A shipped the flow end to end but "handled crudely" a few things
(see PLAN.md's Spike A entry) and left error handling, automated tests, and
scoring transparency for this pass. Per the brief, this section takes
priority over anything below it that conflicts.

### Error handling

**Every failure in the analyzing step funnels through one message, and
that's fine — the pipeline genuinely only has one I/O call.**
`scoreProducts()` is pure/synchronous; the only network operation between
"quiz done" and "results shown" is the catalog fetch (`getProducts()`). So
rather than build a taxonomy of error types, the analyzing step's catch
block just names that reality directly: *"We couldn't load the product
database — check your connection and try again."* Retry (`RETRY_ANALYSIS`)
re-invokes the same effect without touching `quizAnswers`/`photo`, so it's
a real retry, not a flow restart — and `dataSource.ts`'s `getProducts()`
already clears its cached promise on failure (`productsPromise = null` in
the `.catch`), so retry genuinely re-fetches rather than replaying the same
rejection. Verified directly in `dataSource.test.ts` by mocking `fetch` to
fail once then succeed and asserting the second call actually hits the
network again — this is also what proves a **cold-cache** failure (no
stale cache for `api/products.ts` to fall back on) is recoverable, not just
a warm-cache one.
- **What would change it:** if a second, genuinely distinct I/O path gets
  added to this step (e.g. photo analysis actually gets wired in per
  DECISIONS.md's existing open note on `api/analyze.ts`), the error
  messages would need to differentiate again.

**sessionStorage quiz-resume was verified, not assumed.**
The brief specifically asked to walk this failure path rather than trust
the existing comments. `scannerReducer.test.ts` (new) exercises
`createInitialScannerState()` against a real write-then-restore, a
corrupted-JSON blob (`"{not valid json"` — confirms the existing try/catch
in `readPersistedQuizProgress` actually degrades to a fresh state rather
than throwing), and an explicit `clearPersistedQuizProgress()` call. All
pass against the existing implementation — this was already correct, the
gap was purely in verification, not the code.

**"Scoring returns empty everywhere" gets a distinct, page-level banner —
not six copies of the same per-category message.**
`ScanResults.tsx` now checks `categories.every(c => c.picks.length === 0)`
before rendering the per-category tabs and shows: *"Your filters are very
specific, so we don't have a match yet in any category. Try loosening your
sensitivities or budget — or scan again with different answers."* plus a
Scan-again button. Deliberately does **not** attempt to jump the user back
into the quiz with their answers pre-filled — sessionStorage is
intentionally cleared the moment `getRecommendations()` succeeds (and
never populated for a failed one, since the user never left the analyzing
step), so there's no persisted state to resume into by the time results
render. Re-scanning from scratch is a real cost but an honest one, not a
half-built resume feature.
- **What would change it:** if this turns out to be a common outcome in
  practice (not just an edge case), a "go back and adjust just your
  sensitivities/budget" shortcut would be worth the extra plumbing to keep
  the rest of the quiz answers alive across the trip back to results.

**Fixed a real "Something went wrong" violation.**
`useSubscribe.ts`'s non-JSON-error fallback literally read `"Something
went wrong. Please try again."` — banned copy per this spike's own
principle, found while auditing every error string in the flow, not
anticipated up front. Changed to *"We couldn't add you to the waitlist —
please try again in a moment."* The network-failure branch right below it
already had actionable copy ("Network error. Please check your connection
and try again.") and was left as-is.

**Oversized/invalid photo uploads were already mostly handled — the real
gap was an uncaught rejection, not missing validation.**
`PhotoCapture.tsx` already rejected non-image types and files over 10MB
with a friendly message before this spike. What wasn't handled: a file
that passes that check (a valid `image/*` MIME type, under 10MB — e.g.
HEIC on a non-Safari browser, which many browsers report as `image/heic`
but can't actually decode via `<img>`) and then fails inside
`compressImage()`'s `loadImage()`, whose promise rejects on `img.onerror`.
`ScannerRoute.tsx`'s `handleCapture` had no `catch` around the `await
compressImage(file)` call at all — the rejection would silently
unhandled-promise-reject, `dispatch` never fired, and the user was left
looking at a spinner that vanished with no photo and no explanation.
Fixed: `handleCapture` now catches and sets a friendly message ("We
couldn't process that photo. Try a JPG or PNG, or skip this step for
now…"); the error is lifted from `PhotoStep`'s old local `useState` up to
`ScannerRoute` (`photoError`) so both PhotoCapture's immediate validation
and this async compression failure surface through the same UI, and
`PhotoStep` is now a fully controlled component for its error state.

**Deep-link to `/scan/results` with no state was already handled** — Spike
A's `ScanResults()` already checked for a missing `recommendations` and
showed a graceful "Start a scan" card. No change needed; confirmed via a
new render test rather than re-trusting the existing comment.

**A second real, live-verified honesty bug, outside this spike's original
scope but the same class of problem Spike A's "photo step honesty fix"
was for.** Driving the actual running app surfaced that `Hero.tsx`'s
subline — the single most prominent line of copy on the entire site,
above the fold on `/` — still read *"Three photos, a diagnostic, and
custom recommendations built for your strands."* The flow has taken
exactly one *optional* photo since before Spike A (see "Photo step
honesty fix" above); Spike A's copy audit fixed the same claim in
`Features.tsx` and `PhotoStep.tsx`/`CTA.tsx` but never checked `Hero.tsx`
for it. Fixed to *"A quick diagnostic and custom recommendations built for
your strands."* Found only because this spike's verification pass
actually rendered the real hero and read it, not because it was in scope
of the brief's checklist — a reminder that "walk the failure path, don't
assume" applies to copy audits too, not just error handling.

### Why the results page never shows a numeric score (Part C)

`buildMatchChecklist()` (new, `scoring.ts`) returns per-dimension
✓/✗ booleans, never the underlying point value. **Deliberate, per the
brief:** a number like "82.5" implies a precision the scoring model
doesn't actually have — the weights are a hair-science judgment call (see
"Scoring weights" above), not a calibrated measurement, and exposing them
invites exactly the wrong question from a user ("why 82.5 and not 85?")
instead of the right one ("does this actually fit what I told you?"). A
checkmark answers the right question directly. The five dimensions shown
(porosity, curl type, sensitivities, budget, black-owned) are the ones a
user can independently verify against what they typed into the quiz — the
weighted tiebreakers (EWG score, community sentiment) and rank-weighted
goals/frustrations aren't included in the checklist for the same reason a
score isn't: they're real inputs to *ranking*, not binary yes/no facts a
user can sanity-check, and including them would either need to be
misleadingly binary or would reintroduce the "why does this count more
than that" question the checklist is designed to avoid. They're still
available via the existing "why we picked this" expandable, in prose form.

**A dimension is omitted entirely, not shown as a false ✓, when the user
never expressed a preference on it** (porosity "unsure", empty curl type,
sensitivities "none", no budget cap, black-owned "no preference"). An
omitted row reads as "not applicable"; a fabricated checkmark for
something nobody asked about would be a lie by a different route than a
fake number. **Sensitivities are always ✓ when shown** — every displayed
product already survived Stage 1's hard filter, so by construction it
can't violate anything it was actually checked against; anything in
`unenforcedSensitivities` (mineral oil today) is deliberately excluded
from the checklist row too, so this can never claim a filter ran that
didn't (that's what the existing page-level unenforced-sensitivities
banner is for).

**`answers` now rides along in `/scan/results`'s router state**
(`ScannerRoute.tsx`'s `navigate()` call), not just `recommendations` —
`matchReasons` alone only records what a product *did* match, never what
it *didn't*, so there was no way to render an honest ✗ without the
original answers to compare against. Typed as optional on
`ScanResultsLocationState` and the checklist silently doesn't render if
missing, rather than crashing — covers a stale cached history entry from
before this field existed.

### Scoring debug view (Part D)

**Gated server-side (`api/debug-scoring.ts`), not by a client-bundled
secret.** `/debug/scoring` is a normal client-rendered React route — it
has to be, since the whole app is a Vite SPA with no server-side page
rendering — so the actual gating comparison can't happen in the bundle
(CLAUDE.md: secrets never ship as `VITE_`-prefixed values, and *any*
client-side comparison is extractable from the shipped JS regardless of
variable naming). Instead, the page calls a tiny serverless function with
the `?key=` query param; the function compares it to
`process.env.ONYAPROJECTX` server-side and returns 404 on any mismatch
(including a missing/empty key or unset env var). The React page renders
the literal `<NotFound />` component on that 404 — not a bespoke "access
denied" page, which would itself leak that the route exists and is
gated. On success it renders nothing special either — just the real tool.
- **The catalog data itself isn't secret** — it's already public,
  unauthenticated, at `/api/products`. This endpoint gates access to the
  debug *instrument*, not to any data that isn't already exposed elsewhere.
- **What would change it:** if Nya needs to share this with someone else
  (a contractor, a hair-science advisor), the key can just be given to
  them directly — no per-user accounts exist or are planned for this.

**The comparison tables reuse the real pipeline's internal functions
rather than re-implementing scoring for display.** `scoring.ts` gained
three new exports for this — `scoreProductBreakdown` (per-dimension point
split, built by refactoring the old monolithic `scoreProduct` into a
shared `computeScoreBreakdown` both now call), `debugHardFilterExclusions`
(reuses the same `failingSensitivities` helper `applyHardFilters` calls),
and `debugScoreCategory` (walks the identical hard-filter → relaxation →
`selectForCategory` steps `buildCategoryRecommendation` does, just also
keeping the intermediate ranked pool instead of discarding it down to the
top 3). All three were verified not to change `scoreProducts()`'s actual
output — the full existing 14-test suite passed unmodified immediately
after the refactor, before any new tests were added.
- **Why this matters:** a debug view built by re-deriving scores with
  separate, similar-but-not-identical logic is worse than no debug view —
  it can show a ranking the real app would never actually produce, and
  nobody would know to distrust it. Sharing the exact internal functions
  makes that class of bug structurally impossible.

**A real gate bug found and fixed during live verification, not
anticipated up front.** The first implementation checked only
`res.ok` on the `/api/debug-scoring` response to decide authorization.
Driving the actual running app (temporary local Playwright, same
not-a-project-dependency approach as prior spikes) against a plain `vite
dev` server — which doesn't execute `api/*.ts` serverless functions at
all, and falls back to serving `index.html` with a `200` for *any*
unmatched path, including `/api/debug-scoring` — exposed that `res.ok`
alone would treat that fallback `200` as authorized, rendering the real
debug tool with **no key at all**. This specific failure mode can't occur
on a real Vercel deploy (`/api/*` is routed to the actual function, never
the SPA fallback, even if misconfigured) — but the fix is a strictly
better, defense-in-depth check regardless: the client now parses the JSON
body and requires `data.ok === true` explicitly, so any unexpected `200`
with the wrong shape fails closed rather than open. Re-verified after the
fix: `/debug/scoring` with no key now renders byte-identical `innerText`
to a genuinely nonexistent route.

**Built-in example profiles were checked against the real (if slightly
stale) catalog fixture before being written, not assumed from the docs.**
A temporary probe test (deleted after use, same pattern as Spike A's
verification approach) confirmed `curlType: "2c3a"` genuinely triggers
curl-type+density relaxation on every one of the 6 categories against the
checked-in fixture, and that `curlType: "4a"` genuinely triggers none —
these became the "relaxation" and "easy" built-in profiles specifically
*because* they were confirmed to demonstrate what their names claim,
rather than picked from the DECISIONS.md prose and hoped to still hold.

**Query-param overrides replace the profile list entirely rather than
appending to it.** `?profile=demanding&budgetMax=5` (or any bare field
override with no `profile` at all) shows exactly one profile — the
override target, clearly labeled — instead of a 5th row bolted onto the 4
built-ins. Ad hoc checking is the point of the override feature; mixing it
with the standing 4-profile overview would make neither view clean.

### Two small fixes (Part E)

**Dark mode is now the default for a first-time visitor.** Inverted from
the previous "light unless localStorage says dark" to "dark unless
localStorage says light" — both the blocking inline script in `index.html`
and the comments in `useTheme.tsx` were updated together so they can't
drift apart on what the default actually is. Still deliberately ignores
OS `prefers-color-scheme` in both directions — this is a product decision
(Nya wants dark-first), not a system-preference passthrough, consistent
with the original light-first decision also having been a deliberate
override of the OS signal rather than a default inherited from it.
- **What would change it:** if Nya later wants the OS preference honored
  for users who've never explicitly toggled, that's a one-line change to
  the same inline script (check `matchMedia('(prefers-color-scheme:
  light)')` as a second fallback after the explicit-choice check) — not
  implemented here since it wasn't asked for.

**Results-page email copy now matches what actually happens.** "Get your
full routine" / "Send it to me" / "we'll email your full routine" all
promised a personalized routine email that was never built — the endpoint
behind the button (`/api/subscribe`) only adds the user to the waitlist
and sends the same generic confirmation `CTA.tsx`'s landing-page form
sends. Changed to "Join the waitlist for launch updates" / "Join waitlist"
/ "we'll email you launch updates" — matching `CTA.tsx`'s existing,
already-honest copy for the same underlying action. **Emailing an actual
personalized routine is a real, reasonable post-launch feature** (the
scored recommendations already exist server-side by the time this form
renders — this would mean extending `api/subscribe.ts` to accept and
either email or store the `ScoredRecommendationSet`, plus building the
email template) — logged here rather than built now, since building it
was explicitly out of scope for this fix.

### Post-launch refactor candidates (Part F)

Identified only — nothing below was changed beyond what's already
described above. Rationale for not touching any of this now: two of three
production incidents so far came from moving/restructuring files (see the
"Server code boundary" section above), and a structural refactor days
before launch, in a codebase that didn't have this spike's tests until
today, is not a good trade. Revisit once this spike's test suite has had
time to prove itself as a safety net.

1. **`ScanResults.tsx`'s `humanizeMatchReason` regex-parses strings that
   `scoring.ts` builds by hand** (`reason.match(/^porosity: (.+)$/)`,
   `reason.startsWith("within budget")`, etc.) to turn `matchReasons` back
   into English. This is a stringly-typed contract between two files with
   no compiler safety net — a wording change in `scoring.ts` (e.g.
   `"porosity: high"` → `"porosity match: high"`) would silently stop
   matching every regex here instead of failing a type check.
   **Where:** `src/pages/ScanResults.tsx`'s `humanizeMatchReason`,
   matched against `matchReasons` strings built throughout
   `scoreProduct`/`computeScoreBreakdown` in `scoring.ts`.
   **Fix:** replace `matchReasons: string[]` with a typed discriminated
   union (`{ kind: "porosity"; value: PorosityAnswer } | { kind: "goal";
   value: GoalAnswer } | ...`) that the UI switches on instead of
   regex-parsing.
   **Risk of changing:** moderate — `matchReasons` is read by
   `scoring.test.ts`'s `printResult` debug logging and is part of the
   public `RecommendedProduct` type other code could come to depend on;
   changing its shape is a breaking change to that type, not a
   same-file cleanup.

2. **`ScannerRoute.tsx` has grown into the app's one God component.** It
   now owns: reducer wiring, the beforeunload/navigation blocker, two
   separate sessionStorage effects (write-while-on-quiz,
   clear-on-reaching-profile), the catalog prefetch effect, the
   analyzing/`getRecommendations()` effect (with its own retry counter),
   photo compression *and* its error handling (added this spike), and a
   five-branch step-to-component dispatch chain — all in one ~230-line
   file with no unit tests of its own (the reducer it wraps is now
   tested; the effects and dispatch logic aren't).
   **Where:** `src/features/scanner/ScannerRoute.tsx`.
   **Fix:** extract the sessionStorage effects and the analyzing-step
   fetch-and-navigate logic into dedicated hooks
   (`useQuizPersistence(...)`, `useRecommendationFetch(...)`), leaving
   `ScannerRoute` as pure step-dispatch wiring.
   **Risk of changing:** high — this file has already produced two real,
   independently-discovered bugs across Spikes A and 3 (the photo-step
   sessionStorage staleness bug, and this spike's uncaught
   `compressImage` rejection). It's clearly the most bug-prone file in
   the codebase, which argues both for extracting it (smaller units are
   easier to reason about) and against doing so blind, right before
   launch, without effect-level tests written first.

3. **This spike itself added a second, parallel "translate scoring into
   English" system in the same file**, alongside the one in finding #1.
   `buildMatchChecklist`/`formatChecklistLabel` (structured, typed) now
   sits next to `humanizeMatchReason`/`buildWhyText` (string-parsed) in
   `ScanResults.tsx` — the checklist covers the 5 dimensions the brief
   named as "matter most," and the older expandable still covers
   goals/frustrations detail the checklist deliberately excludes (see
   "Why the results page never shows a numeric score" above for why they
   weren't merged into one). Not a mistake, but worth being honest that
   there are now two humanization code paths in one file rather than one.
   **Where:** `src/pages/ScanResults.tsx`.
   **Fix:** once finding #1's typed-reasons refactor lands, both could
   likely read from the same typed source instead of one reading a typed
   checklist and the other regex-parsing strings.
   **Risk of changing:** low on its own, but blocked on finding #1 first
   — doing it before that would mean building a second typed system
   instead of consolidating onto one.

4. **`api/_lib/schemas.ts` is a hand-maintained duplicate of a subset of
   `src/lib/schemas.ts`**, kept in sync manually (see CLAUDE.md's "Server
   code boundary" section, which documents this as deliberate). Real, but
   already-accepted-tradeoff drift risk: if `HairAnalysisSchema` changes
   in the client copy and someone forgets the server copy, `api/analyze.ts`
   would validate Claude's response against a stale schema with no
   automated check catching the gap.
   **Where:** `api/_lib/schemas.ts` vs. `src/lib/schemas.ts`.
   **Fix:** a small build-time or test-time check that fails if the two
   diverge (e.g. a test importing both and comparing their Zod shapes),
   short of the cross-directory-import fix that caused the original
   production incident this duplication exists to avoid.
   **Risk of changing:** medium — touches `api/analyze.ts`, which per
   Milestone 6/PLAN.md has still never been confirmed working end-to-end
   against a real Vercel deploy. Not a good file to experiment on blind.

5. **Duplicated synthetic-product test factories within
   `scoring.test.ts`.** Two near-identical `makeProduct()` helper
   functions exist in separate `describe` blocks (brand diversity, budget)
   — this spike's new guarantee tests reused the pattern rather than
   adding a third copy, but didn't consolidate the existing two.
   **Where:** `src/lib/products/scoring.test.ts`.
   **Fix:** hoist one shared `makeProduct()` factory to the top of the
   file.
   **Risk of changing:** low — test-only code, no production behavior at
   stake. Left alone purely because "change nothing beyond trivially safe
   fixes" was the instruction for this pass, and a multi-site find/replace
   in a test file, however safe, is a step beyond that line.

## Open questions / risks to raise with Nya

- **Mineral-oil sensitivity is currently unenforced.** No Airtable column
  exists for it yet. The filter is written to activate automatically the
  moment a column is added and mapped in `FIELD_MAP` — no `scoring.ts`
  change needed — but until then, a user who reports this sensitivity
  gets `unenforcedSensitivities: ["mineral_oil"]` and no actual
  filtering, and the results page now says so explicitly (Spike A, Part
  D, edge case #4).
- **No products are tagged 2A, 2B, or 2C anywhere in the catalog**
  (re-verified live 2026-08-18 — still true against 50 current records),
  while the quiz offers those curl-type answers. Any 2A/2B or 2C/3A user
  hits relaxation immediately, on day one. Verified directly in
  `scoring.test.ts` and again live via Spike A's verification pass.
- **Mousse and Oil/Sealant still have zero protein-free products**
  (0 of 6, and 0 of 4 — re-verified live 2026-08-18, unchanged from
  Prompt 2). Relaxation can't fix this — it never touches sensitivity
  exclusions by design — so a protein-sensitive user correctly gets an
  empty result for those two categories today (screenshotted directly
  during Spike A verification). Worth flagging to Nya as a catalog gap
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
- **Products with `price: null`** (9 of 50 as of 2026-08-18, down from
  10 on 2026-08-07 — Nya added a price to one row since) are never
  excluded, but always rank slightly below an otherwise-identical
  in-budget product. The results page omits the price line entirely for
  these rather than showing "$0"/"null" (Spike A, Part D, edge case #3).
- **New (Spike A): the checked-in scoring test fixture is stale.**
  `src/lib/products/__fixtures__/catalog.json` was captured 2026-08-07;
  live verification on 2026-08-18 found 18 of 50 products have since
  changed (mostly Nya widening porosity tags after re-reviewing
  ingredients — see the verification write-up above). The existing
  scoring tests still pass against the old fixture, so nothing is
  broken, but anyone re-tuning `SCORING_WEIGHTS` or adding scoring test
  cases should pull a fresh fixture first rather than assume the
  checked-in one still reflects Nya's current data.
- **New (Spike A): no image URL column exists yet**, so
  `ScanResults.tsx`'s per-card image logic is written but has never
  rendered a real image — worth a specific check once Nya adds one,
  since it's only been exercised via the `product.imageUrl` absence
  path.
- **New (Spike B): `ONYAPROJECTX` must be set in Vercel's production env
  vars before `/debug/scoring` can be used post-deploy** — it isn't in
  `.env.local` in this sandbox (no `.env.local` exists here at all — see
  Spike A's verification note), so `api/debug-scoring.ts`'s gate has only
  been exercised via its unit-testable logic, not a real deployed request.
  Pick a long random string when setting it; see CLAUDE.md for how to use
  the resulting URL.
- **New (Spike B): emailing an actual personalized routine is a real,
  reasonable post-launch feature, not built here.** The results-page email
  capture now honestly promises only "launch updates" (see "Two small
  fixes" above) — but the scored recommendations already exist
  server-side at the moment that form renders, so wiring `api/subscribe.ts`
  to actually email the routine is a scoped, buildable follow-up whenever
  Nya wants it, not a research problem.
- **Resolved (Final Spike): the personalized-routine email above is now
  built** — see "Final Spike" below.

## Final Spike — Results Email, Cube Photos, About Page

### Results email (Part A)

**The wire payload is a display-shaped projection, not the literal
`ScoredRecommendationSet`, and the match line is a precomputed string, not
structured data the server re-derives.**
`api/send-results.ts` accepts `{ email, curlType, porosity, recommendations
}` where `recommendations.categories[].picks[]` is just `{ name, brand,
price, buyLink, matchLine }` — not the full `Product`/`RecommendedProduct`
shape, and `matchLine` is already the finished string (`"✓ your porosity ·
✗ not Black-owned"`), built client-side in `ScanResults.tsx` via the exact
same `buildMatchChecklist()` + `formatChecklistLabel()` the on-screen
checklist already uses (new `buildMatchLine()`/`buildSendResultsPayload()`
helpers there).
- **Why:** the email only ever displays 4 product fields plus a match
  verdict — sending the full catalog record (hairTypes, porosity, density,
  every free-from flag) would be dead weight, and worse, would tempt the
  endpoint into recomputing the checklist itself. DECISIONS.md/PLAN.md
  already flag this codebase's real risk of accumulating parallel
  "translate scoring into English" implementations (Spike B's Part F,
  finding #3: `humanizeMatchReason` vs. `buildMatchChecklist`, both in
  `ScanResults.tsx`). Building a *third* one server-side — even a small,
  duplicated one — would be the same mistake again, and would open a real
  gap where the email could show a different verdict than the screen did
  (e.g. if the two implementations' rounding/edge-case handling drifted).
  Sending the finished string instead makes that structurally impossible:
  the email can only ever say what the screen already said, because it's
  the same computed value, not a re-derivation.
- **What would change it:** if the email needs a match dimension the
  on-screen checklist doesn't show, that's a `ScanResults.tsx` change
  first (extend what the client computes), not a reason to add scoring
  logic to `api/`.

**Email-first, sheets-after — and a Sheets failure never flips a
successful response into a failure.**
Ordering matches the brief exactly: Resend is called first; the two
`sheets.spreadsheets.values.append()` calls only happen after a confirmed
send. Less obvious: if the *email* succeeds but a subsequent Sheets write
throws (bad creds, API outage), the endpoint still returns `200 { ok: true
}` — the Sheets failure is logged (`console.error`) and swallowed, not
surfaced to the user.
- **Why:** the user's deliverable is the email, which they already have by
  that point. Sheets logging is our own internal usage-counting, not
  something the user is waiting on or would understand a failure message
  about ("we sent your results but our spreadsheet broke" is not a useful
  thing to tell them). This is a deliberate mirror of `subscribe.ts`'s own
  asymmetric tolerance — there, Sheets is the required action and the
  confirmation email is best-effort/logged-only; here the roles are
  reversed (email required, Sheets best-effort/logged-only), same
  principle both times: the response reflects whether the user's actual
  ask was fulfilled, not whether every side effect fired.
- **What would change it:** if Sheets logging becomes load-bearing for
  something user-facing (e.g. a "you've already gotten your results"
  dedupe check that reads the sheet), it would need to move from
  best-effort into the critical path.

**Rate limit is optimistic-set-then-clear-on-failure, not
set-only-on-success.**
`recentRequests.set(email, Date.now())` happens *before* calling Resend,
immediately after the request passes validation — so two rapid submits for
the same email get the second one rejected with a 429 before it can hit
Resend at all (the actual point: protecting the Resend account from a
retry loop). If the send then fails, the entry is deleted before returning
the error, so the user's next click — a legitimate retry — isn't blocked
by the rate limiter guarding against a request that never actually
delivered anything.
- **Why:** the guard exists to stop *repeated successful-or-in-flight*
  requests from piling up, not to punish a failed attempt. Blocking a
  retry after a real failure would contradict "Failure must be specific
  and retryable" from the brief.
- **What would change it:** if abuse in practice turns out to be
  failed-request spam rather than successful-request spam, the guard would
  need to key on attempt count instead of last-timestamp.

**One-directional waitlist relationship, and no separate shared helper
file for the Google Sheets auth boilerplate.**
Results recipients are added to the same waitlist tab `subscribe.ts`
writes to (First/Last blank — no name is collected on this form; Hair Type
gets the real `curlType` from the diagnostic, not "N/A," since we actually
have it). Waitlist signups never receive results — there's no path from
`subscribe.ts` back into `send-results.ts`. The ~15 lines of Google auth
setup in `send-results.ts` are a deliberate copy of `subscribe.ts`'s, not
a shared `api/_lib/googleSheets.ts` helper.
- **Why:** the brief says "reuse `subscribe.ts`'s proven patterns... follow
  its conventions exactly" — copy the pattern, don't refactor the file
  it's copied from. `subscribe.ts` is explicitly called out in CLAUDE.md as
  "deployed and working, do not move," and this is the last spike before
  launch. Duplication-over-shared-abstraction is already this codebase's
  established choice under exactly these conditions (see "Server code
  boundary" in CLAUDE.md: `api/_lib/schemas.ts` hand-duplicates a subset of
  `src/lib/schemas.ts` for the identical reason). Extracting a shared
  helper would touch a file with zero reason to change, days before
  launch, for a ~15-line savings.
- **What would change it:** post-launch, once there's a safety net of
  real production runs behind both endpoints, consolidating the auth
  boilerplate into `api/_lib/googleSheets.ts` would be a reasonable, low-risk
  cleanup — just not now.

**Verified with the same esbuild-transform + Node-ESM-resolver harness
CLAUDE.md documents for the original production incidents**, not just
`tsc -b`. `api/send-results.ts`'s only relative import
(`./_lib/resultsSchema.js`) was transpiled individually (no bundling) into
a `"type":"module"` scratch directory and loaded via Node's real resolver
— confirmed it resolves cleanly, the same check that would have caught
both prior `FUNCTION_INVOCATION_FAILED`/`ERR_MODULE_NOT_FOUND` incidents
before they shipped.
- **What's still not verified**: an actual Vercel Lambda invocation with
  real Resend/Google credentials — this sandbox has no working
  `.env.local` (the `env.local`/`env.example` files present here are
  missing their leading dot, so neither Vite nor a local `vercel dev`
  would load them as-is; see "Open questions" below), so a real send and a
  real deliberate-failure test are the user's to run post-deploy, per the
  brief's own verification checklist.

### Cube photo refresh (Part B)

**All 12 new images turned out to be clean stock photography — the first
photo drop in this project's history that needed zero exclusions.**
Every image was visually inspected before use (plain studio/seamless
backdrops, no visible event signage, no red-carpet framing, no
identifiable public figure recognized) — unlike the two prior drops
(`afro-pic-4`, and the 6-image `afro-pic-7`–`12` batch), nothing here
needed to be flagged for licensing risk. `image1` was kept out of the cube
selection and used for the About page instead, per the brief. The other 5
cube faces (front/left/top/right/back) were picked from `image2`–`image12`
for skin-tone and styling spread: `image3` (front), `image2` (left),
`image9` (top), `image6` (right), `image11` (back) — `image4/5/7/8/10/12`
are unused/available, same "available but not used" status this project
already gives `afro-pic-3`.
- **Real gap found, not resolved here: none of the 12 images include a
  man.** Nya's direction asked for a mix "including at least one man" —
  this batch is all women. Flagged rather than silently shipping a
  same-gender refresh; see "Open questions" below.
- **What would change it:** a future photo drop that includes at least one
  man would let the cube's 5-face selection be redone to satisfy the
  original brief fully; not blocking on it now since the rest of the
  refresh (rights clearance, skin-tone spread) is a real improvement on
  its own.

### Cube curl mark (Part B)

**The "too close to the stem" complaint was a measurable bug, not just a
matter of taste — the old formula could position the curl's own bottom
edge *below* the stem's top edge.**
`makeLogoFaceTexture`'s old positioning offset the curl's *center* by a
fixed `stemY - fontSize * 0.16`, without accounting for the specific
curl shape's own vertical extent. Worked out numerically for the shipped
spiral: the curl's bottom-most sampled point lands at `stemY + fontSize *
0.054` — i.e., about 12px *past* the stem's top edge at the cube's actual
`fontSize=220`, a real overlap, not merely tight spacing.
- **Fix (applies to every candidate variant, independent of which shape
  ships):** position by the shape's own bottom edge, not a blind center
  offset — `curlCy = stemY - clearanceGap - bottomLocal * curlScale`,
  where `bottomLocal` is that specific path's own max local-Y and
  `clearanceGap = fontSize * 0.09` is the real, proportional (not
  fixed-pixel) gap the brief asked for. This guarantees no overlap
  regardless of a shape's specific bounding box, so it doesn't need
  re-tuning if the curl geometry changes later.
- **Why 4 generated variants, not one attempt:** the target ("closer to a
  flipped ➰") is a subjective visual call, and the brief explicitly asked
  for a pick, not a unilateral change — same checkpoint discipline as Part
  F's cube go/no-go. Generated parametrically (Archimedean spirals for
  open-loop variants, a limaçon curve — `r = b + a·cos θ` with `a > b`,
  which self-intersects into a real loop-within-a-loop — for the
  double-loop variant), matching the original curl's own stated rigor
  ("a sampled logarithmic spiral, not hand-drawn bezier guesses") rather
  than eyeballed points.
  - **A** — open loop, clockwise, with a short trailing tail.
  - **B** — the literal horizontal mirror of A (tests loop-direction/
    handedness preference directly, since "flipped" most naturally reads
    as a mirror image).
  - **C** — a limaçon double-loop, the closest literal match to ➰'s actual
    crossing-loop shape.
  - **D** — a looser single loop with a longer trailing tail.
  All 4 were rendered through the *exact* draw code `makeLogoFaceTexture`
  uses (text + stem + curl, same constants) — not a rough approximation —
  at both the full 768px texture resolution and a ~170px tile matching the
  cube's actual max on-screen face size (`Cube.module.css`'s
  `max-width:420px` on the whole cube, one face at an angle reads smaller
  still), specifically because a mark that reads fine at preview size can
  blur together at the size it actually ships at. Screenshotted via a
  temporary local Playwright install against a cached Chromium binary
  already present from a prior spike (same "not a project dependency"
  approach as every previous visual-verification pass in this project).
- **Resolved: variant C (double loop) was picked and applied.**
  `CURL_PATH_2D` in `Cube.tsx` now holds the limaçon's 61 sampled points
  (same generation formula as the artifact, computed once and hardcoded as
  a literal array, matching the original curl's own convention — not
  computed at runtime in the component); `makeLogoFaceTexture`'s
  positioning now uses the bottom-edge-based `clearanceGap` formula
  unconditionally (it was already written to work for any shape). Verified
  post-change: `tsc -b` clean, zero console/runtime errors driving the real
  landing page and dragging the cube to bring the Logo face into view (the
  "Nar" text and stem render correctly on the correct face — the curl
  shape itself was already pixel-verified via the artifact's identical
  draw code, so this confirmed integration, not re-litigated the shape).
  `Logo.tsx`/the navbar-footer wordmark were never touched at any point —
  this was always scoped to the cube's Logo face only.

### About page (Part C)

**Heading interpretation: the H1 drops "About" (now just "Nari"); the
small eyebrow label keeps saying "About," with more room below it.**
The brief flagged this as ambiguous and asked for a reported
interpretation rather than a blind guess. Two readings were weighed:
(1) remove the eyebrow entirely and turn the H1 into a two-line "About" /
"Nari" stack, or (2) trim the H1 from "About Nari" down to "Nari" (it was
redundant — the eyebrow already says "About," and the page is reachable
only at `/about`) and add space between the *existing* eyebrow and H1.
Went with (2): it's the reading where "remove the About heading" and "add
vertical space between About and Nari" describe two different, consistent
edits to two elements that already exist by those exact names in the DOM
(the eyebrow literally renders "About," the trimmed H1 literally renders
"Nari") — no need to delete a label and then recreate a version of it
inside the H1, which reading (1) would require. `.eyebrow`'s bottom margin
went from `--space-sm` (12px, cramped once the H1 stopped repeating
"About") to `--space-lg` (24px).
- **What would change it:** if this reading is wrong, it's a small,
  contained fix — swap back to "About Nari" in the H1 and adjust spacing
  in the eyebrow/H1 pair, or implement reading (1)'s two-line stack
  instead. Flagged for confirmation rather than shipped silently either
  way.

**About photo replaced with `image1`** (reserved from the cube selection
per the brief) — same rights check applied and cleared (see "Cube photo
refresh" above; `image1` was the very first image reviewed).

**Nav "Get updates" link — verified already correct, not a live bug.**
Grepped every occurrence of "Get updates" and every remaining `"/contact"`
reference in `src/`: both the desktop (`RootLayout.tsx`'s `.navLinks`) and
mobile-sheet (`.mobileLinks`) links already point to `/#mailing`, matching
the `id="mailing"` anchor in `CTA.tsx`. This was fixed in an earlier pass
(Spike 2, Part C — see PLAN.md) and never regressed; nothing to change
here, just confirmed.

## Open questions / risks to raise with Nya (continued)

- **New (Final Spike): no man in the current cube photo pool.** All 12
  newly-reviewed images are women; Nya's direction asked for a mix
  including at least one man. Not fixed here — flagged for a future photo
  drop rather than delaying the rest of this spike's (real, positive)
  diversity/rights improvement on what's available today.
- **New (Final Spike): this sandbox's env files are missing their leading
  dot.** `env.example`/`env.local` exist at the repo root instead of
  `.env.example`/`.env.local` — neither Vite nor a local `vercel dev` load
  a dotless `env.local` automatically, so (consistent with every prior
  spike's note on this) `api/send-results.ts` was verified via typecheck,
  the full test suite, and the esbuild/Node-ESM import-resolution harness,
  but never actually invoked against live Resend/Google credentials in
  this sandbox. The brief's "send a real email, trigger a real failure"
  verification steps are the user's to run, after confirming
  `GOOGLE_RESULTS_RANGE` is set in both the real local env and Vercel
  (defaults to `Results!A:E` if unset, same fallback pattern as
  `GOOGLE_SHEET_RANGE`).
- **Resolved (Final Spike): the cube's curl mark is shipped.** Variant C
  (double loop) picked from the 4 generated options and applied to
  `Cube.tsx` — see "Cube curl mark" above.

## Data pipeline fixes pass (2026-08-29)

Three live `/api/products` data-loss/scoring bugs, found and fixed — see
CLAUDE.md's "Data pipeline fixes pass (2026-08-29)" for the reference
version; this is the reasoning behind the choices made.

**Brand made optional rather than special-casing Style rows.** The 5
brand-less rows could have been handled by special-casing category
`"Style"` inside `normalizeProduct` (e.g. skip the brand requirement only
for that one category value). Rejected: that would hardcode one of Nya's
category values into validation logic, which is exactly the coupling
`FIELD_MAP`/`ProductSchema` exist to avoid (see CLAUDE.md's "Updating
FIELD_MAP" section — Airtable's human-editable values shouldn't leak into
validation). Making `brand` unconditionally optional is simpler, is
already how every other legitimately-sometimes-absent field is handled
(`buyLink`, `communitySentiment`, `notes`), and costs nothing — nothing
downstream assumed `brand` was always present in a way that would silently
break (the two call sites that do read it, `scoring.ts`'s brand-dedup and
`ScanResults.tsx`'s send-results payload, both needed a one-line
`?? ""` fallback once the type changed, verified via `tsc -b` catching
both).

**Frustration aliasing as a new `FieldKind`, not a special case inside the
existing `stringArrayLower` coercion.** Could have kept `frustrations` on
`"stringArrayLower"` and applied `FRUSTRATION_ALIASES` as a second, later
pass in `normalizeProduct` itself. Went with a dedicated
`"frustrationsArray"` kind instead, mirroring `"goalsArray"` exactly — one
`FieldKind` per field with an alias table keeps `coerce()` a single
lookup-and-dispatch, and any future field needing its own alias table
(there will likely be one, given two of four multi-select fields already
need it) has an established, copy-pasteable pattern rather than a growing
pile of special cases in one branch.

**Value-drift audit computed post-normalization, not on raw Airtable
values.** Raw-value auditing would flag things the pipeline already
handles correctly (casing differences, values an alias table already
resolves) as false positives, burying the real signal. Computing drift
from the already-normalized `Product[]` means anything the report flags is
a genuine, currently-unresolved mismatch — this is what let the audit
correctly report exactly one residual item (goals' `"length retention"`)
instead of also re-flagging `"scalp health"`/`"heat or color
damage"`/`"breakage/length retention"`, all of which the alias tables
already fix.

**Chose not to auto-fix `"length retention"` (goals) or wire up the
newly-discovered `Category: "Gel"` products.** Both were found during this
pass's audit but are outside its three named bugs. `"length retention"`
only appears on a Style-category row, which — per the brand fix above — is
already excluded from scoring by category (`CATEGORIES` doesn't include
`"Style"`), so aliasing it would currently be inert; flagged in the
normalization report and in CLAUDE.md rather than guessed at. The 8 real
`Gel` products are a materially bigger finding — a whole category
invisible on the results page today — but wiring it in is a product
decision (does a "Gel" tab fit Nari's UX, does `CATEGORIES`'s order need
Nya's input) not a data-pipeline bug fix, so it's surfaced as an open
question rather than silently expanding this pass's scope.

**Fixture regenerated from a fresh live pull**, same convention as every
prior spike (`__fixtures__/catalog.json` copied verbatim from
`/api/products`, now via the fixed pipeline) — 62 products, up from 50.
The two "Demanding"/"Easy" test profiles' printed picks changed slightly
(different specific products in Leave-in/Cream for both profiles) simply
because the catalog itself grew by 12 real rows; no assertion in
`scoring.test.ts` depended on the exact product names, only on the
guarantees (sensitivity honesty, relaxation order, no fabrication, etc.),
so nothing needed loosening.

## Open questions / risks to raise with Nya (continued)

- **New (data pipeline fixes pass): `Category: "Gel"` has 8 real products
  invisible on the results page.** Not in `scoring.ts`'s `CATEGORIES`
  const — never scored, never shown, in any tab. Needs a decision (add a
  Gel tab? fold Gel into an existing category?) before it's wired in — see
  CLAUDE.md.
- **Resolved (Final Spike, Part D / P1 of 4): goals value `"length
  retention"` now aliases to `"growth"`.** Added to `GOAL_ALIASES` in
  `api/_lib/schema.ts`, same table/pattern as `"scalp health"` →
  `"scalp"` and `"heat or color damage"` → `"damage"`. No longer inert —
  styles are now scored (see below), and this row's goal now
  participates in that scoring. `valueDrift.goals` confirmed clean
  afterward (see the new schema.test.ts case). See "Styles scoring"
  below for why this stopped being purely inert the moment styles
  started being scored.

## Final Spike — Scoring Engine Update (P1 of 4)

Four prompts split the Final Spike's remaining work; this one is scoring
logic only — no UI changes (P2 handles the flow, P3 the results page, P4
content edits). See CLAUDE.md's "Product Scoring" section for the
reference-doc version of what changed; this is the reasoning behind each
call. The weight-reorder and curl-type-demotion decisions are recorded
above, under "Scoring weights" — this section covers the rest: mineral
oil, styles, and the goals alias.

### Mineral oil filter — already live, not new to this pass

The brief asked to "wire mineral oil into the existing (currently inert)
hard filter." Checking the actual code: it already was wired, as of the
2026-08-29 "data pipeline fixes pass" (see that section above and
CLAUDE.md) — `getMineralOilFree` reads the real `mineralOilFree` field,
`applyHardFilters` enforces it whenever any product in the catalog
carries the field, and `unenforcedSensitivities` only lists
`mineral_oil` when none do. `scoring.test.ts` already had passing tests
for exactly this (`mineral_oil sensitivity (Mineral Oil Free column
added 2026-08-29)`). No code change was needed for Part B — verified by
running that existing test block, not assumed. Documented here so this
prompt's own completion report doesn't imply Part B required new work
when it didn't.

### Styles scoring (Part C)

**Styles (catalog rows with `category: "Style"` — 5 in the live catalog:
Braids, Blow Out, Twist/Braid Out & Rod Set, Twist/Natural Cornrow &
Protective, Wash and Go) are scored in a completely separate code path
(`scoreStyle`/`buildStyleRecommendations`) from the 6 real product
categories, not folded into `buildCategoryRecommendation`.**
- **Why a separate path, not a 7th `CATEGORIES` entry:** styles have no
  brand/price/buyLink/ingredient flags, so none of Stage 1's hard
  filters or most of Stage 2's weights (porosity, density, curl type,
  budget, black-owned) apply to them at all — forcing them through the
  same pipeline as real products would mean either fabricating those
  fields or littering `buildCategoryRecommendation` with
  `category === "Style"` special cases. A dedicated function with its
  own two-dimension scoring (goals, frustrations) is simpler and keeps
  `CATEGORIES`'s existing 6-category loop untouched.
- **Styles score from the full catalog, not the sensitivity-survivor
  set.** `scoreProducts()` calls `applyHardFilters` for the product
  categories, then separately calls `buildStyleRecommendations(catalog,
  answers)` against the *original*, unfiltered `catalog` argument — a
  style was never a candidate for exclusion in the first place (it has
  no ingredient data), so running it through a filter built for
  ingredient data would be meaningless, not just redundant.

### Styles frustration scoring correction (P1 follow-up)

**Reverted: frustrations on styles are POSITIVE, same direction and
weight as products — not inverted.** The original P1 pass inverted
frustration scoring for styles on the assumption that a style's
`frustrations` tag listed problems it *causes* rather than problems it
*solves*. That assumption was wrong, per direct correction from the
CEO (domain expert): **she tags a style with the frustrations it
HELPS ADDRESS, and *omits* a tag where the style risks CAUSING that
problem instead** — e.g. "Wash and Go" carries no `"breakage"` tag
specifically because it can cause breakage; the *absence* of a tag
encodes the caution, not the presence of one. Scoring a tagged
frustration negatively was therefore recommending against exactly the
styles that actually help, and doing nothing to steer users away from
the styles that don't carry a tag for a real risk.
- **Fix:** `scoreStyle` and `computeScoreBreakdown` (products) now both
  call two small shared functions, `scoreGoalOverlap` and
  `scoreFrustrationOverlap`, extracted specifically by this correction.
  Previously the two had separate, independently-written frustration
  logic (one positive, one negative) that had already drifted apart once
  — sharing the implementation makes that impossible to repeat: a future
  edit to frustration scoring now has to touch one function, used by
  both callers, rather than two that can silently diverge again. This is
  a direct, structural response to a real bug (a materially wrong scoring
  direction, shipped and reasoned-through in the previous pass), not
  just a revert.
- **Why the original assumption was wrong, in hindsight:** it was a
  plausible-sounding inference (styles obviously carry style-specific
  risks; "Wash and Go" tends to increase frizz in general hair-care
  knowledge) that was never actually confirmed with the person who
  enters the data. The catalog itself didn't disambiguate the two
  readings — a `frustrations: ["dryness", "frizz"]` tag is consistent
  with either "causes this" or "helps with this" from the data alone.
  That ambiguity is exactly why this needed a domain-expert confirmation
  rather than a second inference; noted here so the same mistake isn't
  repeated for a different field on a future assumption.
- **The "single most confusable logic" code comment describing the
  inversion has been deleted, not just corrected** — see
  `scoreFrustrationOverlap`'s new comment in `scoring.ts` for the
  replacement, which explains the (now-correct, product-matching)
  positive direction and briefly records that an inverted version
  existed and was reverted, without walking through the wrong reasoning
  in detail (no reason to preserve a wrong mental model in the code
  comment a future reader learns from first).
- **Verified by test, not just by inspection:** `scoring.test.ts`'s
  styles describe block now asserts "Wash and Go" (tagged dryness +
  frizz) ranks *above* "Blow Out" (tagged neither) for a user whose top
  two frustrations are dryness and frizz — see the "Report" section
  below for the actual numbers this produces on the (freshly re-pulled,
  see below) real catalog.

**Neutral baseline for goal-less styles — removed, with numbers.**
The neutral baseline (`STYLE_NEUTRAL_GOAL_BASELINE`, one `goalMatch`
unit) existed for exactly one reason: under inverted frustration
scoring, a style with zero declared goals could only ever be penalized,
never rewarded, guaranteeing it last place regardless of actual fit.
That justification is gone now that frustrations score positively too —
a goal-less style can still earn real points from frustration overlap,
the same way a product with no goal match can still score well on other
dimensions. Recommendation: **remove it**, which is what shipped.
- **The numbers:** re-pulling the live catalog for this correction (see
  below) turned out to make this doubly moot — the CEO has since added
  goals to every style row, including "Braids/Protective Style with
  Added Hair" (previously `goals: []`, now `goals: ["damage",
  "tehnique"]` — see the "tehnique" typo note below). **Zero styles in
  the live catalog currently have an empty `goals` array**, so the
  baseline contributes exactly 0 extra points across the entire real
  catalog today, for any answer combination — it was already fully inert
  before being removed.
- **Why remove rather than just leave the unused code path in place:**
  keeping a baseline that never fires in current data is not free —
  it's a piece of special-case reasoning a future reader has to
  understand and re-verify is still inert every time the catalog
  changes, for a scenario (goal-less style, non-inverted frustrations)
  that no longer has the structural justification it was built for. If
  a future style genuinely ships with `goals: []`, it will now simply
  score on frustrations alone (0 goal contribution, same as a product
  with no goal match) — an honest, unsurprising result, not a broken
  one. Re-added `scoring.test.ts` coverage for exactly that case, using
  a synthetic style (no live example exists to test against anymore).

**Notes (the free-text field, e.g. "Would not recommend for those with
severe dry scalp or breakage") are never read by scoring — display-only,
per the brief. Unaffected by this correction.**
- **Why:** the brief was explicit that keyword-matching prose is fragile
  and risks surfacing wrong guidance on a product/style whose credibility
  rests on expertise — a substring match on "breakage" in a note could
  misfire in either direction (false positive on offhand mentions, false
  negative on paraphrased warnings). Structured tags (`goals`,
  `frustrations`) drive ranking; `notes` is P3's "Keep in mind" display
  line and nothing else in this pass. The "Caution for" multi-select
  idea previously floated here (see the old Open Questions entry) was
  premised on frustrations needing reinterpretation to express risk —
  now that presence/absence of the existing `frustrations` tag already
  encodes that correctly (per the CEO's actual data-entry convention),
  that suggestion is withdrawn, not just deferred.

**`length retention` → `growth` alias — confirmed still correct against
the freshly re-pulled catalog.** Unrelated to this correction pass, but
worth noting: the alias (added in `api/_lib/schema.ts`'s `GOAL_ALIASES`)
was verified again by re-normalizing a genuine live pull rather than
relying on the hand-edited fixture value from the original P1 pass — the
"Twist/Natural Cornrow & Protective" row's raw Airtable value is still
`"length retention"`, and it still resolves to `"growth"` cleanly.
`valueDrift.goals` on the fresh pull reports exactly one item —
`"tehnique"` — see below, not `"length retention"`.

**Catalog re-pulled live, for real this time.** The original P1 pass
believed live Airtable access wasn't possible in this sandbox (per
CLAUDE.md's note about dotless `env.local`/`env.example` files not being
auto-loaded by Vite/`vercel dev`) and hand-edited the fixture instead.
That belief was about *automatic* loading, not about whether the
credentials work at all — `env.local`'s `AIRTABLE_TOKEN`/`AIRTABLE_BASE_ID`/
`AIRTABLE_TABLE_NAME` are real and functional; manually sourcing the file
and calling the Airtable REST API directly (the same pagination logic
`api/products.ts` uses, run standalone) works fine. This pass did a
genuine live pull: 62 records (same count as before — no rows added or
removed), all 62 valid (0 skipped), 0 unmapped/missing fields.
- **One new value-drift finding, not previously present: goals value
  `"tehnique"`.** The CEO's new style tags include a goal literally
  spelled `"tehnique"` (missing the "c") on all 5 style rows. This is
  almost certainly a typo for `"technique"` — which is already a real
  quiz goal value (`GOAL_VALUES` includes it) that, per CLAUDE.md, has
  never had a catalog equivalent until now. **Deliberately not aliased
  here**: `GOAL_ALIASES` is meant for legitimate wording differences
  Nya/the CEO chose deliberately (`"scalp health"` → `"scalp"`, etc.),
  not for silently correcting what looks like a misspelling — aliasing a
  typo as if it were intentional wording risks masking the actual data
  entry error rather than getting it fixed at the source. Flagged in
  "Open questions" below instead; if confirmed as a typo, the fix belongs
  in Airtable, not in another alias-table entry.
- **Other, unrelated changes observed in the fresh pull, for
  transparency:** a few non-style products' `hairTypes` narrowed (lost
  `3b`/`3c`, kept `4a`/`4b`/`4c`) — ordinary catalog maintenance, outside
  this correction's scope, not investigated further. The two style rows
  previously missing `notes` ("Twist/Braid Out & Rod Set" and "Twist/
  Natural Cornrow & Protective") still have none — that Open Questions
  item is unresolved, unchanged from before.

### Report: top-2 styles for a user with frustrations [dryness, frizz] and goals [moisture, definition]

Per this correction's request — full ranking via `debugScoreStyles`,
against the freshly re-pulled real catalog fixture:

| Score | Style | Match reasons |
|---|---|---|
| 102.0 | Wash and Go | goal: moisture; goal: definition; frustration #1: dryness; frustration #2: frizz |
| 56.0 | Twist/Braid Out & Rod Set | goal: moisture; frustration #1: dryness |
| 56.0 | Twist/Natural Cornrow & Protective | goal: moisture; frustration #1: dryness |
| 0.0 | Braids/Protective Style with Added Hair | (no goal or frustration overlap for this user) |
| 0.0 | Blow Out (& Afro) | (no goal or frustration overlap for this user) |

**Top 2 returned by `scoreProducts()`: "Wash and Go" (102.0) and "Twist/
Braid Out & Rod Set" (56.0)** — the tie between the two Twist styles
(both 56.0) breaks in the catalog's own stable order, not randomly.
Wash and Go — tagged for exactly this user's two declared goals and both
declared frustrations — now correctly wins outright, the direct opposite
of the previous (wrong) inversion's result for a similar scenario. This
is the expected, corrected behavior: a style the CEO tagged as helping
with dryness and frizz should rank highest for a user whose top
frustrations are dryness and frizz, not lowest.

## Open questions / risks to raise with Nya (continued)

- **Resolved (P1 follow-up): "Braids/Protective Style with Added Hair"
  now has real goals in Airtable** (`["damage", "tehnique"]`, found on
  live re-pull) — the CEO addressed this since the original P1 pass.
  Crossed off; see "tehnique" below for the one new item this surfaced.
- **New (P1 follow-up): goals value `"tehnique"` looks like a typo for
  `"technique"`.** All 5 style rows carry this exact spelling. Worth a
  quick confirmation with the CEO — if it's a typo, fixing it directly
  in Airtable (rather than adding an alias-table entry for it) is the
  right call, since `GOAL_ALIASES` is reserved for deliberate wording
  differences, not misspellings. Currently inert either way — no quiz
  answer produces `"tehnique"`, so it never matches, but the CEO likely
  intended the already-real `"technique"` quiz value to start
  contributing to style scoring.
- **New (Final Spike, Part C / P1 of 4): two style rows have no `notes`**
  ("Twist/Braid Out & Rod Set" and "Twist/Natural Cornrow &
  Protective") — every other style/product row does. Notes are
  display-only (P3's "Keep in mind" line), so this doesn't affect
  scoring, but it means P3 will have nothing to show for those two rows
  where every other row has real guidance text. Still unresolved on the
  fresh re-pull.
- **Withdrawn (P1 follow-up): the "structured 'Caution for' multi-select"
  suggestion.** Previously proposed on the (wrong) premise that
  `frustrations` needed reinterpreting to express risk. Per the CEO's
  actual convention — presence means "helps with," absence means "risks
  causing" — the existing `frustrations` field already expresses caution
  correctly by omission; no new column is needed for this purpose.
- **New (Final Spike, Part A / P1 of 4): `/debug/scoring`'s built-in
  `"relaxation"` profile label is now stale.** `ScoringDebug.tsx` labels
  it "2C/3A — triggers curl-type relaxation" and its comment claims this
  was verified against the fixture — true when written, no longer true
  now that curl type can't trigger relaxation at all (see "Curl type
  demoted to a pure weight" above). Left unfixed here since
  `ScoringDebug.tsx` is a UI file outside this prompt's scope; a quick
  fix for P2/P3 (or a standalone pass) would be relabeling it or
  replacing it with a scenario that actually demonstrates density/
  porosity relaxation instead.

## Final Spike — Flow Reorder & Review Screen (P2 of 4)

Scan flow only — no results-page changes (P3), no content/copy edits
outside the photo step and the new review screen (P4 handles the rest).
See CLAUDE.md's "Scanner Flow: Photo, Quiz, Review, Results" section for
the file-by-file breakdown; this is the reasoning.

**Flow reorder: photo moved from after the quiz to right after the
intro, per the CEO's direction.**
Previous order (Spike A): intro → quiz (9 questions) → profile summary →
photo → analyzing/results. New order: intro → photo → quiz (9 questions)
→ review → analyzing/results.
- **Why:** direct CEO instruction — she wants the photo to read as a
  real, first-class part of the experience ("upload your hair, then
  we'll ask about it") rather than a bolted-on afterthought that shows
  up only after the user has already answered 9 questions and seen a
  summary. Putting it first also means the summary/review screen (which
  didn't exist as a *review* concept in Spike A — see below) can sit
  right before results, where a confirmation beat actually belongs,
  instead of splitting the "done" moment in the middle of the flow.
- **What this did NOT change:** the photo still feeds nothing —
  `api/analyze.ts` remains unwired into this flow (see CLAUDE.md's
  "Photo step honesty fix"). Moving it earlier doesn't change what it
  does; only when the user is asked for it.
- **Renamed "profile" → "review" throughout** (`StepId`, the reducer's
  step-name special-casing, the step component file
  `ProfileStep.tsx` → `ReviewStep.tsx`, `ScanProgress`'s section label).
  Not just a rename in isolation — the step's *purpose* changed too (see
  below), so keeping the old "profile" name once the screen stopped
  being a Nari-profile summary and became a pre-results confirmation
  step would have been actively misleading to a future reader.
- **What would change it:** if the CEO's direction on ordering changes
  again, `steps.ts`'s new "How to add or reorder a scanner step" note
  (CLAUDE.md) documents exactly which files a reorder touches — this was
  written specifically because this prompt's own brief called flow
  reordering "the riskiest prompt in the spike," and the risk is real:
  the reducer's `ADVANCE_QUIZ`/`BACK` cases special-case the quiz↔review
  boundary by name, so a step rename without updating those two spots
  would silently break Back navigation out of review, not fail loudly.
- **Interstitial position unaffected, confirmed rather than assumed.**
  `INTERSTITIAL_AFTER_INDEX` (still `6`) is about position *within* the
  9-question quiz sequence (after `frustrations`, before
  `sensitivities` — the boundary between Nya's "What are we building
  toward?" and "Last few things" phases), which didn't change when the
  photo moved. Verified directly via the live-flow screenshots below
  (progress bar shows "8 / 10, Last few things" at the interstitial,
  matching the pre-existing, unchanged design) rather than assumed safe
  because the surrounding prose says so.
- **Progress bar unit math**: `TOTAL_PROGRESS_UNITS` stays
  `QUIZ_QUESTION_COUNT + 1` (10) — only the *order* of units changed, not
  the count. Photo is now unit 1 (was previously folded in after the
  quiz's 9); each quiz question's unit is offset by 1 to account for the
  photo already being "done." Review and analyzing both show the full
  bar (10/10) with a new "Review your answers" label, replacing the old
  "Your profile"/"Your photo" labels those steps used to show at that
  position.

**Review screen: read-only, inline editing considered and explicitly
deferred.**
The brief asked for a confirmation screen where the user sees their
answers reflected back before recommendations are generated — but
whether to let them *edit* an answer directly on that screen (tap a past
answer, change it, without navigating back through the quiz) was left
as this prompt's call to make.
- **Decision: read-only.** If something's wrong, the user hits Back,
  which was already fully wired to preserve every prior answer across
  the whole quiz (Prompt 3's `scannerReducer.ts` `BACK` case) — so the
  capability to *reach* a wrong answer and fix it already exists, just
  not from the review screen directly.
- **Why deferred, not just "not asked for":** inline editing across all
  9 question types is genuinely the single largest item in this
  prompt's scope, and it isn't a uniform feature — `single`-select
  editing is simple (change the value, done), but `multi`/`ranked`
  editing on the review screen would mean either re-rendering the full
  `QuestionRenderer` inline (a meaningfully different, more complex
  layout than the current static summary row) or building a second,
  parallel editing UI just for this screen. Against that cost, the
  benefit is real but narrow: it saves at most a handful of taps (Back,
  fix, forward through however many questions separate the mistake from
  the end) for users who both (a) notice a mistake on the review screen
  and (b) made it more than one question back. Most of the value of
  "let the user fix a wrong answer" is already captured by Back working
  correctly — inline editing is a polish layer on top of a
  fully-functional escape hatch, not the thing that makes fixing a
  mistake possible at all.
- **What would change it:** real usage data showing users abandon or
  get frustrated at the review screen specifically because Back-and-
  forward is too many taps — that would justify building inline editing
  for at least the `single`-select questions (the cheap 6 of 9) as a
  first pass, leaving `multi`/`ranked` (goals, frustrations,
  sensitivities) for a later pass if still warranted.

**Photo step copy: "optional" removed from the heading, but "Skip for
now" stays — a framing change, not a capability change.**
The CEO wants the photo to not read as skippable-by-default messaging
right in the heading, while the actual behavior (you can still skip it)
is unchanged.
- **Why the distinction matters:** "optional" in the heading primes the
  user to skip before they've even read what the step is for; removing
  it while keeping a clearly-labeled "Skip for now" action still gives
  the user full control, it just doesn't lead with the exit. This is a
  framing/psychology change, not a functional one — verified nothing
  downstream (the reducer's `SKIP_PHOTO` action, `scoring.ts`, results
  rendering) treats a skipped photo any differently than before; the
  photo was already fully optional in every functional sense.
- **Copy given verbatim, honesty constraint carried forward.** The new
  body copy ("Full photo analysis is coming soon and will help Nari
  tailor style recommendations. For now, your recommendations primarily
  come from your quiz answers.") was specified directly in the brief and
  used essentially as given — the only real judgment call was *not*
  independently re-adding Spike A's old "Your photo isn't stored or
  shared" sentence, since the brief's copy doesn't include it and the
  instruction was to use the given copy "adjusted only for voice
  consistency," not to layer additional claims back in. The underlying
  constraint from Spike A still holds and was rechecked here: don't
  claim the photo is analyzed, stored, or used for recommendations, since
  it's read by nothing today (`api/analyze.ts` still isn't wired into
  this flow — see CLAUDE.md).

**Verification.** `npm run typecheck` clean; all 109 pre-existing tests
pass unmodified except the 3 in `scannerReducer.test.ts` that reference
the renamed "review" step id (updated to match, same assertions).
`formatAnswerDisplay`'s new ranked-numbering path is exercised
indirectly by the full-flow screenshots below (no new unit test added
specifically for it, since `quizLabels.ts` has no existing test file of
its own to extend — flagged as a small gap, not a blocker, since the
existing `toDiagnosticAnswers.test.ts` "contract" tests already cover
every real quiz answer value flowing correctly into scoring, which is
the higher-stakes path). Full flow driven end to end via a temporary
local Playwright install (same not-a-project-dependency pattern as every
prior spike) against a temporary, gated Vite dev-middleware serving the
checked-in catalog fixture at `/api/products` (this sandbox has no
`.env.local` — same workaround as Spikes A/B and the Final Spike,
reverted immediately after screenshots were taken) — twice (once taking
a real photo via the "Choose a photo" file picker, once skipping) across
light-desktop (1280×900) and dark-mobile (390×844), zero console errors
in any run. Specifically confirmed via screenshots and scripted
assertions, not just visual inspection:
- The photo step's heading contains no "optional" text anywhere on the
  page at that step.
- The progress bar reads "1 / 10, Your photo" on the photo step, "4 / 10,
  First, let's place you" at quiz question 3, "8 / 10, Last few things"
  at the interstitial, and "10 / 10, Review your answers" on the review
  screen — confirming the unit math and phase-label sequencing described
  above actually renders as designed, in both themes.
- The review screen's ranked frustrations row renders as "1. Breakage &
  shedding   2. Constant dryness   3. Uncontrollable frizz" — order
  preserved and numbered, not just alphabetically or insertion-order
  joined.
- Back from the review screen returns to quiz question 9/9 with its
  answer still selected (`data-selected` present on the correct option),
  confirmed by reading the DOM directly, not just visually.
- Refreshing mid-quiz (after answering 2 of 9 questions) restores the
  in-progress quiz at the correct question. Refreshing on the photo step
  after capturing a photo does **not** restore that photo — the flow
  resets to the intro, since nothing had been written to sessionStorage
  yet at that point in the new order (the quiz, the only thing that
  writes to it, hadn't started). This is a simpler, more direct
  guarantee than Spike A's equivalent fix needed: in the old order,
  photo came *after* the quiz, so a dedicated "clear the stale blob on
  reaching photo" effect was needed to prevent a stale bounce-back; in
  the new order, photo comes *before* the quiz, so there is no stale
  quiz blob yet to bounce back from in the first place. The
  clear-on-reaching-review effect (needed for the same reason Spike A's
  clear-on-reaching-profile effect was) is the one persistence special
  case that survived the reorder, just retargeted at the new step name.
- Full quiz → review → results run confirmed rendering real scored
  recommendations (checklist, buy links, category tabs) in both themes
  and both viewports — the flow-level changes in this prompt don't touch
  scoring or the results page, and this confirms they didn't
  inadvertently break the handoff into either.
