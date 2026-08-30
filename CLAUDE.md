# CLAUDE.md

- Real app lives at the repo root (`src/`, `api/`, `index.html`) — `nari/nari/`
  is stray leftover cruft (empty except a `node_modules`), not the app; don't
  edit or delete it without checking first
- Vite 5 + React 18 + TS, react-router-dom v6, CSS Modules only (NO Tailwind)
- Design tokens: `src/styles/variables.css` — single source of truth
- Visual direction: light & ethereal (white canvas, luminous purple/pink/orange
  gradient accents, dark refined text) — see "Design System Notes" below.
  This replaced an earlier dark-purple theme; if you see dark hardcoded hex
  values in a component, that's a bug — move the value into tokens
- Serverless: api/ folder, Vercel conventions (see api/subscribe.ts) — deployed and working, do not move. Verified live end-to-end during the design sprint (real Sheets row + real confirmation email). Note: `GOOGLE_SHEET_RANGE` in `.env.local` is currently `Sheet1!A:D` (4 cols) but the code writes 5 — harmless (Sheets auto-expands) but should be updated to `Sheet1!A:E` to stop drifting
- `api/send-results.ts` (Final Spike) emails a user their scan results and logs to a separate `Results` sheet tab — see "Results Email" below. Needs `GOOGLE_RESULTS_RANGE` (defaults to `Results!A:E` if unset, same fallback pattern as `GOOGLE_SHEET_RANGE`) in addition to the existing Google/Resend vars
- Secrets via process.env, never VITE\_-prefixed
- **This sandbox's local env files are missing their leading dot** (`env.local`/`env.example` at the repo root, not `.env.local`/`.env.example` — a real, separately-tracked `.env.example` also exists and is the one Vite/Vercel actually look for). Neither Vite nor `vercel dev` load a dotless `env.local` automatically, so a normal `npm run dev`/`vercel dev` session still won't see these secrets — treat any "verified against real credentials" claim from *that* path with caution. **This does NOT mean the credentials themselves are unusable, though** — `env.local`'s `AIRTABLE_TOKEN`/`AIRTABLE_BASE_ID`/`AIRTABLE_TABLE_NAME` are real and live; manually sourcing the file (`set -a; source env.local; set +a`) and calling the Airtable REST API directly (mirroring `api/products.ts`'s own fetch/pagination logic, run standalone via `vite-node` rather than through the actual Vercel handler) works and was used to do a genuine live catalog re-pull during the Final Spike P1 follow-up (styles frustration correction) — see DECISIONS.md. What's still *not* verified is an actual Vercel Lambda invocation of `api/products.ts`/`api/analyze.ts`/etc. themselves (no local deploy target in this sandbox) — every serverless-function check for the handler code itself has relied on typecheck + a per-file transpile/Node-ESM-resolution harness (see "Server code boundary" below), not a real Lambda invocation. Google/Resend credentials in `env.local` have not been similarly manually verified — only Airtable has been, for this one task.
- Commands: npm run dev / npm run typecheck / npm test — typecheck must stay green
- Build plan: read PLAN.md, execute milestone by milestone
- 3D deps (Spike 2, Part F): `three` + `@react-three/fiber@^8` +
  `@react-three/drei@^9` — pinned to the v8/v9 lines deliberately.
  `@react-three/fiber@9` (latest) requires React 19; this app is on React
  18, so installing latest would either fail (`ERESOLVE`) or silently run
  a React-19-targeted major on React 18 with `--force`. Don't bump these
  past the v8/v9 lines without also bumping React first. The cube these
  power (`src/components/Cube.tsx`) was a checkpoint build — see PLAN.md
  "Spike 2 / Part F" for its current go/no-go status before assuming it's
  final.

## Product Data Pipeline

Product recommendations are matched via a **deterministic scoring
function**, not an LLM call. An earlier plan described generating
recommendations via an LLM; that approach is cancelled — Nya's Airtable
catalog is cleanly tagged (hair type/porosity/density/etc.), so matching
quiz answers to products doesn't need generation, just comparison. There
is no per-request AI cost in this path and `api/analyze.ts` (the vision
pipeline used for the scan's hair analysis) is not involved in product
matching at all — those are two separate features that happen to share a
scan flow. The scoring function itself (`scoring.ts`, `(quizAnswers,
catalog) => RecommendationSet`) is Prompt 2's deliverable, not this one.

### How it works end to end
1. **`api/products.ts`** (Vercel serverless function) authenticates to the
   Airtable REST API and fetches Nya's product catalog, paginating past
   Airtable's 100-record-per-page cap until exhausted.
2. Raw records are normalized through **`api/_lib/fieldMap.ts`**
   (Airtable column name → internal property name) and validated by the
   Zod schema in **`api/_lib/schema.ts`**, which also coerces types
   (checkboxes → booleans, numbers, lowercased/trimmed tag arrays) and
   produces a **normalization report** (counts, skipped rows + reasons,
   fields present in the response but unmapped, mapped fields missing
   from the response). See "Server code boundary" below for why this
   lives under `api/_lib/` and not `src/lib/`.
3. Results are cached in-memory for ~10 minutes so Nya's catalog edits go
   live without a redeploy, without hitting Airtable on every request. If
   a refetch fails and a cache exists, the stale cache is served (flagged
   via `meta.stale`) rather than erroring — Airtable being briefly
   unavailable must not break the results page.
4. **`src/lib/dataSource.ts`**'s `getProducts()` is the only sanctioned
   way for the client to reach this data — no component should call
   `/api/products` directly. `getProducts()` caches its own in-flight/
   resolved promise at module scope, so repeat callers (the quiz's
   prefetch, the analyzing step, `/debug/products`) share one request
   instead of re-fetching. **`getRecommendations(answers)`** (Spike A)
   fetches the catalog via `getProducts()` and runs the real
   `scoreProducts()` (`src/lib/products/scoring.ts`) against it — no
   mock data left in this path. See "Product Scoring" below and
   DECISIONS.md for the prefetch-at-quiz-start timing.
5. **`/debug/products`** (dev-only, gated by `import.meta.env.DEV` the
   same way `/dev/swatches` is) renders the parsed catalog + normalization
   report as JSON — the verification surface for this pipeline. Kept
   deliberately even now that the real results page is live (Spike A) —
   still the fastest way to inspect a raw normalization report when
   chasing a catalog data issue; excluded from production builds either
   way via the `import.meta.env.DEV` guard, so keeping it costs nothing.

### Server code boundary — why normalization lives under `api/_lib/`, not `src/lib/`
`api/products.ts` originally imported its normalization code from
`src/lib/products/`, the same way `api/analyze.ts` imports
`src/lib/schemas` from outside `api/`. That shipped a working local dev
experience but **crashed in Vercel production** with
`FUNCTION_INVOCATION_FAILED`: the compiled Lambda's import resolved to an
absolute path (`/src/lib/products/schema.ts`, `.ts` extension, doesn't
exist in the Lambda runtime) — Vercel's Node function builder doesn't
reliably trace/bundle imports that reach outside the `api/` directory the
way a general-purpose bundler (esbuild in "bundle" mode, which is what
locally proved the module resolution itself was fine) would. `api/
subscribe.ts`, the one endpoint confirmed working in production, has
**zero local imports** — only npm packages — which is the actual reason
it never hit this.

Fix, part 1: all server-side normalization code (`normalizeProduct`,
`buildNormalizationReport`, `FIELD_MAP`, the Zod `ProductSchema`) now
lives under **`api/_lib/`** (underscore prefix = internal helper, not a
routable endpoint) so `api/products.ts` stays self-contained within
`api/`, matching `subscribe.ts`'s working pattern. The client still needs
the `Product` TypeScript type (for `dataSource.ts` / `ProductsDebug.tsx`)
— `src/lib/products/schema.ts` gets it via `import type { Product } from
"../../../api/_lib/schema"`, which is erased entirely at compile time, so
no runtime dependency crosses the boundary in either direction. The
client keeps its own small, independent Zod schema for validating the
`/api/products` response envelope (shape-level only — the server already
did the deep per-field validation, so this doesn't need to duplicate
`ProductSchema`).

**Fix, part 2 — a second, distinct failure after part 1.** Moving the
code into `api/_lib/` fixed the tracing problem but produced a *new*,
more specific crash: `ERR_MODULE_NOT_FOUND: Cannot find module
'/var/task/api/_lib/schema'` (no `.ts`/`.js` extension in the error this
time). Root cause: the project's `package.json` has `"type": "module"`,
and **Node's own ESM loader requires explicit file extensions on
relative imports** — `import ... from "./_lib/schema"` is only valid
under a bundler (which resolves it for you); plain Node needs
`"./_lib/schema.js"`. Vercel's Node function builder transpiles each
`api/*.ts` file **individually** (not into one bundled file) and leaves
import specifiers exactly as written in the source — it doesn't rewrite
or add extensions. `tsc` doesn't catch this because `tsconfig.json` uses
`"moduleResolution": "bundler"`, which deliberately tolerates
extensionless relative imports on the assumption a bundler is doing the
resolving — true for Vite locally, false for how Vercel packages each
function. **This is why typechecking green was not sufficient
verification** — confirmed by building a harness that transpiles each
`api/*.ts` file individually (via esbuild's transform-only mode, which —
unlike bundle mode — does not resolve or rewrite import specifiers,
faithfully reproducing what Vercel's builder does) into a mirrored
directory tree with its own `"type": "module"` package.json, then lets
Node's real ESM resolver load it. That harness reproduces the exact
`ERR_MODULE_NOT_FOUND` shape against the old extensionless imports (verified
as a negative control) and resolves cleanly against the current code.

Fix: every relative import inside `api/` now carries an explicit `.js`
extension pointing at the file's *compiled* name (`"./_lib/schema.js"`,
`"./fieldMap.js"`, `"./_lib/schemas.js"`) even though the source files are
`.ts` — this is intentional and correct under `moduleResolution:
"bundler"`, which resolves a `.js`-suffixed relative specifier against
the sibling `.ts` file. If you add a new relative import anywhere under
`api/`, it needs the same explicit `.js` suffix, or it will typecheck
fine locally and still crash in production.

**`api/analyze.ts` had the identical at-risk pattern** (`import {
AnalyzeRequestSchema, HairAnalysisSchema } from "../src/lib/schemas"`,
crossing outside `api/` with no extension) and was never confirmed
working against a real Vercel deploy (see Milestone 6 in PLAN.md) — a
live risk, not just a theoretical one, since `analyzeHair.ts` silently
falls back to rules-based results on *any* `/api/analyze` failure, so a
broken production endpoint could have gone unnoticed indefinitely. Fixed
alongside the products pipeline fix: **`api/_lib/schemas.ts`** now holds
a server-only subset of `src/lib/schemas.ts` (just the pieces
`analyze.ts` needs — `AnalyzeRequestSchema`, `HairAnalysisSchema`, and
their transitive dependencies), and `analyze.ts` imports from
`"./_lib/schemas.js"`. `src/lib/schemas.ts` remains the single source of
truth for client code (used far more broadly there — quiz answers, scan
state, etc.) and is intentionally *not* moved; the `api/_lib` copy is a
deliberate, documented duplication, kept in sync by hand if either
schema changes.

### Updating `FIELD_MAP` when Nya renames or adds a column
`FIELD_MAP` in `api/_lib/fieldMap.ts` is the single place Airtable's
human-editable column names are allowed to appear — never in scoring
logic, components, or tests. If Nya renames a column, update its key in
`FIELD_MAP`; if she adds a column that should flow through, add a new
entry (and a matching field on `ProductSchema` + an entry in
`api/_lib/schema.ts`'s `FIELD_KINDS` map for its coercion type). You
don't have to react immediately, though — an unmapped column doesn't
break anything; it just shows up in the normalization report's
`unmappedFields` list so it's visible rather than silently dropped.

### Validation / skip policy
Every row is parsed independently; invalid rows (missing a required field
— name, brand, or category) are logged and skipped, never allowed to
crash the endpoint or silently produce a wrong match. As the catalog
grows, bad data entry is the primary expected failure mode — this
boundary is what catches it. Checkbox fields absent from a record are
Airtable's own representation of "unchecked" (Airtable omits `false`
checkboxes from its API response rather than sending `false`) and are
normalized to `false`, not treated as missing/invalid data.

### Live schema notes (verified 2026-08-05, may drift as Nya edits the base)
The originally-described schema didn't quite match the live base — several
field names differ (`"Product name"` not `"Product Name"`; `"Sulfate
free"` / `"Silicone free"` / `"Protein free"` with no hyphen; `"Blk
owned"` not `"Black-owned"`), the live `Category` values were originally
Shampoo, Conditioner, Leave-in, Cream, Mousse, Oil/Sealant (no "Gel" yet —
Gel was in the original description but had not yet appeared in real data,
and Oil/Sealant's only current row is one of the two invalid ones below;
**"Gel" has since appeared live — see "Data pipeline fixes pass
(2026-08-29)" below, a real gap, not yet wired into `scoring.ts`'s
`CATEGORIES`**), and there is **no image URL column yet** (optional in
`ProductSchema` so its
absence doesn't break anything — Prompt 4 handles a missing image
gracefully). Two extra columns exist in the live base that aren't wired
into `FIELD_MAP` yet: `"Key ingredients"` and `"Who it works for"` (both
free text) — they show up in the normalization report's `unmappedFields`
rather than being silently dropped.

*(Updated 2026-08-07, Prompt 2): `"Key ingredients"` is now mapped
(display-only, no scoring role) and `"Who it works for"` no longer
appears in the live base at all — see "Product Scoring" below for the
four columns Prompt 2 added: `"Best For Goals"`, `"Frustrations"`,
`"Fragrance Free"`, `"Key ingredients"`.)*

Also found and fixed: `.env.local`'s `AIRTABLE_BASE_ID` held a full
Airtable URL path (`app.../tbl.../viw...` concatenated with `/`) instead
of just the base ID, and `AIRTABLE_TABLE_NAME` ("Nari Product
Recommendations") didn't resolve against the live API — the token can
authenticate against the base by table ID but lacks the schema/meta scope
needed to look up the correct display name. Both env vars now hold the
verified-working values (base ID only; table ID instead of display name —
also more robust, since it survives Nya renaming the table). If Vercel's
env vars mirror the old `.env.local` values, they need the same fix.

**Distinct post-normalization values actually present**, for Prompt 2 to
build the quiz↔catalog matching against real data rather than assumption
(updated 2026-08-29 — see the fixes-pass note below for `Gel`/`Style`,
both new since this list was first written):
- `category`: `Conditioner`, `Cream`, `Gel`, `Leave-in`, `Mousse`,
  `Oil/Sealant`, `Shampoo`, `Style` (as of Final Spike P3, all 7 non-Style
  categories render as tabs via `scoring.ts`'s `deriveCategories` — see
  "Product Scoring"'s "Category order" section below; `Style` renders
  separately, never as a tab)
- `hairTypes`: `3a`, `3b`, `3c`, `4a`, `4b`, `4c` (no 1A-2C rows exist yet;
  the schema doesn't restrict to only these, so new rows in other types
  will flow through fine)
- `porosity`: `high`, `low`, `normal`
- `density`: `fine`, `medium`, `thick`

Known quiz↔catalog mismatches (documented for Prompt 2, not solved here):
quiz curl-type answers include compound values (`"2a2b"`, `"2c3a"`,
`"3b3c"`) that will need to expand to multiple catalog tags; quiz density
answers (`"fine_low"`, `"fine_high"`, `"thick_low"`, `"thick_high"`) are
more granular than the catalog's three values above; quiz porosity
includes `"unsure"`, which has no catalog equivalent and needs a defined
fallback.

### Data pipeline fixes pass (2026-08-29)
Three real data-loss/scoring bugs found live in `/api/products`, all fixed:

1. **5 Style rows were being skipped** (`brand: Required`) — verified live:
   all 5 are category `"Style"` (Braids, Blow Out, Twist/Braid Out, Twist/
   Natural Cornrow, Wash and Go), which legitimately have no brand — a
   style is a technique, not a purchased product. `brand` is now optional
   on `ProductSchema` (`FIELD_KINDS.brand` changed from `"string"` to
   `"optionalString"`). At the time of this pass these rows never got
   recommended anywhere — `scoring.ts`'s `CATEGORIES` const only iterates
   the 6 real product categories, "Style" isn't one of them — but they
   showed up in the catalog/report instead of being silently dropped.
   **As of Final Spike Part C, Style rows ARE scored** — see "Product
   Scoring"'s "Styles" section below; they're just scored through a
   separate path, not added to `CATEGORIES`. Code that reads
   `product.brand` now has to handle `undefined` (`scoring.ts`'s
   `selectForCategory` brand-dedup, `ScanResults.tsx`'s send-results
   payload) — both fall back to `""`, which is inert since no scored
   product actually lacks a brand.
2. **"Mineral Oil Free" was unmapped** — Nya added the column; it's now in
   `FIELD_MAP` → `mineralOilFree` (a checkbox, same absent-means-false
   pattern as the other free-from fields). `scoring.ts`'s mineral-oil
   filter needed **zero changes** — it was deliberately written to
   activate automatically the moment this column exists and is mapped
   (see `getMineralOilFree`'s comment) — closing the last previously
   inert/unenforced sensitivity.
3. **Frustration value drift**: the catalog's `"Breakage/length retention"`
   no longer matched the quiz's `"breakage"` — silently true for all 10
   products tagged that way, on a dimension weighted 3x for a user's #1
   frustration. Fixed with a new `FRUSTRATION_ALIASES` table in
   `api/_lib/schema.ts` (same pattern as the existing `GOAL_ALIASES`),
   applied via a new `"frustrationsArray"` `FieldKind`.

**Full goal/frustration audit against live data** (post-normalization, alias
tables already applied): the only other mismatch found is a goals value,
`"length retention"` (1 row — the "Twist/Natural Cornrow & Protective"
Style entry, which — per point 1 above — is already excluded from scoring
by category, so this is currently inert, not aliased). No other goal or
frustration value drift exists.

**New: value-drift auditing**, so the next one of these doesn't go
unnoticed silently for weeks. `buildNormalizationReport` now includes a
`valueDrift` field — per-dimension (goals/frustrations/porosity/density/
hairTypes) lists of post-normalization catalog values that don't match
`scoring.ts`'s expected vocabulary. The expected-vocabulary lists are
duplicated in `api/_lib/schema.ts` (can't import `scoring.ts` from
`src/lib` — see "Server code boundary" above) — keep them in sync by hand
if `scoring.ts`'s `GOAL_VALUES`/`FRUSTRATION_VALUES`/`DENSITY_COLLAPSE` or
the porosity/hairType vocab ever change. Column-*name* drift
(`unmappedFields`/`missingMappedFields`) was already reported; this closes
the gap for column-*value* drift, which is exactly how bug 3 went
unnoticed. `src/lib/products/schema.ts`'s `ProductsMetaSchema` (the
client-side shape check) was updated to match, so `/debug/products` shows
the new field too.

**Found but NOT fixed at the time, flagged for a follow-up decision**: the
live catalog now has a `Category: "Gel"` — 8 real products — that
CLAUDE.md previously documented as never having appeared in real data.
`scoring.ts`'s `CATEGORIES` const doesn't include `"Gel"`, so **these 8
products are fully invisible on the results page today** (never scored,
never shown, in any tab) — normalization now includes them in the catalog
fine, but the per-category recommendation loop simply never looks at that
category. Outside this pass's explicit scope (three named bugs); needs a
product decision (does Nari have a "Gel" recommendation tab? does the
UI/copy need anything for it?) before wiring it in, so it's surfaced here
rather than silently added.

**Fixed (Final Spike, P3 of 4)**: `CATEGORIES` no longer exists as a
hardcoded const — see "Product Scoring"'s "Category order" section below
for the derived-list replacement that closed this gap for Gel and any
future category the same way.

The catalog fixture (`src/lib/products/__fixtures__/catalog.json`) was
regenerated from a fresh live pull after these fixes — 62 products now
(up from 50), including the 5 Style rows and real `mineralOilFree` data.

## Product Scoring

`src/lib/products/scoring.ts` turns a completed quiz answer set
(`DiagnosticAnswers`) plus the normalized catalog (`Product[]` from
`api/_lib/schema.ts`) into ranked, categorized picks (`scoreProducts()`).
It's a **pure function** — no network, no React, no side effects — on
purpose: same inputs always produce the same output, which is what makes
it fast to unit test and fast to tune. Matching is deterministic tag
comparison, not an LLM call — see DECISIONS.md for why.

**On the types**: the brief described the signature using the existing
`QuizAnswers`/`RecommendationSet` types from `src/lib/schemas.ts`, but
those belong to the old placeholder quiz/mock flow and can't hold what
this needs (ranked frustrations, match reasons, relaxation flags, the
unenforced-sensitivity flag) — and Prompt 3 hasn't ported the real
9-question quiz yet, so there's no confirmed source of truth for exact
answer strings beyond what Prompt 2's brief specified directly.
`scoring.ts` defines its own `DiagnosticAnswers` (input) and
`ScoredRecommendationSet` (output) types instead. Prompt 3 needs to
produce a `DiagnosticAnswers` from the real quiz UI; Prompt 4 consumes
`ScoredRecommendationSet` in place of the old mock `RecommendationSet`.
Two fields' exact value format were inferred rather than given verbatim —
`budgetMax` (a plain numeric dollar ceiling, not a bucketed string enum)
and `blackOwnedPref`'s literal casing (`"yes_always"` / `"mixed"` /
`"no_preference"`) — flagged in DECISIONS.md for Prompt 3 to confirm.

### The four stages
1. **Hard filters** (`applyHardFilters`) — sensitivities *exclude*
   products entirely, never just lower their score. Conservative rule:
   only a positively-checked free-from field counts as safe; an
   unchecked box (whether it means "contains it" or "unverified" — see
   the Supercurl product's notes in the live catalog for a real example
   of the latter) is excluded either way, for free, via `ProductSchema`'s
   existing false-when-absent default. `mineral_oil` is enforced the same
   way as of 2026-08-29 (`Mineral Oil Free` is mapped and populated) — the
   filter checks the actual product data at runtime (`getMineralOilFree`)
   rather than assuming `false`, and was written to activate automatically
   the moment the column existed, so no `scoring.ts` change was needed
   when it did. `unenforcedSensitivities` still exists as a mechanism
   (falls back to it if a future catalog snapshot somehow has zero
   products carrying the field), but in practice it's empty today for
   `mineral_oil`.
2. **Weighted scoring** (`scoreProduct`) — every surviving product gets a
   score built from `SCORING_WEIGHTS`. See "Changing the weights" below.
3. **Select and diversify** (`selectForCategory`) — top 3 per category,
   sorted by score, with a one-product-per-brand cap that only relaxes
   (allows a repeat brand) if there's no other-brand alternative to fill
   the slot.
4. **Relaxation** (`buildCategoryRecommendation`) — density and porosity
   aren't just weighted, they're also treated as *required* overlaps for
   a product to be eligible in the first place (this is why the brief's
   Stage 4 talks about "relaxing" them even though Stage 2 frames them as
   weights, not filters — both are true: they're weighted AND initially
   required). If a category has fewer than 2 eligible products, the
   weakest requirement drops first — density, then porosity, **never
   sensitivities** — and the category's `relaxed`/`relaxedConstraints`
   fields record exactly what was dropped, so the UI can label it
   honestly rather than silently backfilling. **Curl type is no longer in
   this list** (Final Spike, Part A — see below and DECISIONS.md's
   "Scoring weights"): it used to be a third required/relaxable
   dimension, dropped first, ahead of density; now it's a pure weight
   with no eligibility role at all, so the catalog's real gap (no
   products tagged 2a/2b/2c) no longer triggers relaxation for 2A/2B or
   2C/3A users — they just score 0 on curl type instead of losing
   eligibility. A separate, still-open gap: **Mousse and Oil/Sealant
   currently have zero protein-free products** (0/6 and 0/4) — since
   relaxation never touches sensitivities, a protein-sensitive user's
   Demanding-profile test correctly returns those two categories empty.
   See DECISIONS.md's "Open questions" for both.

### Changing the weights
Everything lives in the single exported `SCORING_WEIGHTS` object near the
top of `scoring.ts`, ordered highest-priority to lowest with each tier's
maximum attainable contribution commented inline (e.g. goals' max is
`3 * goalMatch`) — the values are deliberately set so a lower-priority
tier's ceiling stays below the tier above it, so retuning is usually just
changing one number and confirming the two test profiles' printed output
still looks right. **Priority order (Final Spike, Part A / P1 of 4,
directed by the CEO/hair expert): porosity → goals → frustrations →
density → budget → black-owned → curl type → tiebreakers.** Porosity is
weighted heaviest because it determines whether a product physically
*works* on someone's hair — a hair-science judgment made for this pass,
open to Nya's revision, and a one-file, one-minute edit to change (see
DECISIONS.md). Curl type dropped from #2 to #7 (and from a hard
requirement to a pure weight — see the stages above) because products in
Nya's catalog are tagged across curl-type *ranges* (a 4C product usually
also carries 4A/4B), so curl type rarely discriminates between two
candidate products the way porosity or a declared goal does — see
DECISIONS.md's "Curl type demoted to a pure weight" for the full
reasoning. There is deliberately **no "clean formulation" bonus**
(sulfate-free/protein-free/etc. scored positively for users who never
declared that sensitivity) — considered and rejected, since some users
genuinely benefit from those ingredients; see DECISIONS.md. `journey` is
deliberately **not** in `SCORING_WEIGHTS` at all — no product attribute
corresponds to it; per Nya's own note it changes how Nari *talks* to the
user, not what she recommends, so it's collected and passed through on
`ScoredRecommendationSet` for Prompt 4's copy and nowhere else.

### Category order (Final Spike, P3 of 4)
`scoring.ts`'s `deriveCategories(catalog)` — not a hardcoded list —
decides which product-category tabs render and in what order. It takes
whatever categories are actually present in the catalog (excluding
`"Style"`, which never renders as a tab — see "Styles" below), orders the
ones it recognizes per an internal `KNOWN_CATEGORY_ORDER` array
(currently Shampoo → Conditioner → Leave-in → Cream → Mousse →
Oil/Sealant → Gel), and appends anything it doesn't recognize
alphabetically after that. **A category Nya adds in Airtable — the way
"Gel" briefly was (see the "Data pipeline fixes pass" section above) —
appears automatically the next time the catalog is fetched, with no code
change required.** It only needs a code change (adding it to
`KNOWN_CATEGORY_ORDER`) if it should render in a specific position rather
than falling to the alphabetical tail. Derived from the full, unfiltered
catalog (not Stage 1's hard-filter survivors), so a category isn't hidden
just because every one of its products got excluded by a user's
sensitivities — it still shows up with an honest "0" badge. Both
`scoreProducts()` and `/debug/scoring`'s `ScoringDebug.tsx` call this same
function, so the two can never disagree on which categories exist.

### Styles (Final Spike, Part C / P1 of 4)
Catalog rows with `category: "Style"` (Braids, Blow Out, Twist/Braid Out
& Rod Set, Twist/Natural Cornrow & Protective, Wash and Go — 5 in the
live catalog) have no brand/price/buyLink/ingredient data, so they're
scored in a separate path (`scoreStyle`/`buildStyleRecommendations`, both
in `scoring.ts`) rather than through `deriveCategories`' product-category
loop (see "Category order" below — `deriveCategories` explicitly excludes
`"Style"`), and never touch Stage 1's hard filters (no ingredient data to
filter on). `scoreProducts()` returns the top 2 on a new `styles` field
on `ScoredRecommendationSet` (currently typed optional, for backward
compatibility with any pre-existing literal construction of that type —
see the field's own comment in `scoring.ts`). As of Final Spike P3, the
results page renders these as a card-row strip below the product tabs —
see "Results page"'s "Styles strip" section below.

- **Goals and frustrations BOTH score positively, same direction and same
  weights as products** — `scoreStyle` and `computeScoreBreakdown`
  (products) share two extracted functions, `scoreGoalOverlap` and
  `scoreFrustrationOverlap`, so the two can't drift apart again. A
  style's `goals` tag means what it helps the user achieve; its
  `frustrations` tag means what it helps the user address — same meaning
  as on a product in both cases.
  - **Correction (P1 follow-up):** an earlier version of this file
    inverted frustration scoring for styles, on the assumption that a
    style's `frustrations` tag meant a risk it caused. That was wrong —
    per the CEO (domain expert), she tags a style with the frustrations
    it SOLVES and *omits* a tag where the style risks causing that
    problem instead (e.g. "Wash and Go" carries no `"breakage"` tag
    specifically because it can cause breakage) — absence encodes the
    caution, not presence. See DECISIONS.md's "Styles frustration
    scoring correction" for the full story. Do not reintroduce a sign
    flip here without confirming with her first.
- **No neutral baseline for goal-less styles.** One existed briefly
  (`STYLE_NEUTRAL_GOAL_BASELINE`) to stop a goal-less style from being
  structurally guaranteed last place under the (since-reverted) inverted
  frustration scoring; removed once that justification no longer applied
  (see DECISIONS.md for the numbers — every style in the live catalog
  currently has at least one goal, so it was already fully inert before
  removal). A goal-less style today just scores on frustrations alone,
  same as a product with no goal match.
- **`notes` (the free-text field) is never read for scoring** — P3
  displays it as a "Keep in mind" line; scoring only ever reads structured
  tags (`goals`, `frustrations`). See DECISIONS.md for why keyword-
  matching prose was rejected.
- **Debug export**: `debugScoreStyles(catalog, answers)` returns every
  style's score (not just the top 2), reusing the exact same `scoreStyle`
  the real pipeline calls — used by `scoring.test.ts` to assert ranking
  order directly, same pattern as `debugHardFilterExclusions`/
  `debugScoreCategory`.

### Running the tests
`npm test` (Vitest). `scoring.test.ts` runs the two required profiles
(Demanding: 4C/high-porosity/protein-sensitive/under-$10/thick/#1-
frustration-breakage; Easy: 2C-3A/normal-porosity/no-sensitivities/no-
budget/medium) against a **real catalog fixture**
(`src/lib/products/__fixtures__/catalog.json`, copied verbatim from a
live `/api/products` fetch, not invented data) and prints each profile's
full picks-per-category output via `console.log` so the weights can be
eyeballed while tuning — run with `npx vitest run
src/lib/products/scoring.test.ts` to see it directly. A few guarantees
(budget ordering, the brand-diversity cap, the "no alternative" case)
are instead tested against small synthetic product sets, because real
data can't reliably offer a clean, single-variable-controlled example —
see the test file's header comment.

### Extending the field map for this prompt
Four columns were added to `FIELD_MAP`/`ProductSchema` this pass: `"Best
For Goals"` → `goals`, `"Frustrations"` → `frustrations`, `"Fragrance
Free"` → `fragranceFree` (a checkbox, same pattern as the other free-from
fields), and `"Key ingredients"` → `keyIngredients` (free text,
display-only, no scoring role). `goals` gets one extra normalization step
beyond the usual lowercase/trim: a small `GOAL_ALIASES` table in
`api/_lib/schema.ts` rewrites Airtable values that don't match the quiz's
vocabulary exactly (`"scalp health"` → `"scalp"`, `"heat or color
damage"` → `"damage"`, and, added Final Spike Part D, `"length
retention"` → `"growth"` — the latter now load-bearing since styles are
scored, see "Styles" above) — done at the data-normalization boundary,
per this prompt's own instruction, so `scoring.ts` never has to know
Airtable's original wording. Three quiz goal values (`"volume"`,
`"simplify"`, `"technique"`) have no catalog equivalent at all — not an
error, they simply never contribute a match. `frustrations` has its own
alias table (`FRUSTRATION_ALIASES`, added 2026-08-29) for
`"breakage/length retention"` → `"breakage"`; no other frustration values
need aliasing — they matched the quiz vocabulary exactly once
lowercased.

## Diagnostic Quiz UI

The real 9-question quiz (`src/features/scanner/quiz/`) ported from Nya's
reference file (`nya-quiz-reference.jsx`, repo root — kept as the
source-of-truth reference for content, not imported by the app). Replaces
the old placeholder flow (2 hair-context questions + a 10-question mock
quiz) entirely — see DECISIONS.md for why the 2 hair-context questions
were dropped and why `PhaseBar` wasn't ported.

- **`quiz/quizTypes.ts`** — the config schema (`QuizQuestionConfig`,
  `QuizOption`, `SelectionMode`, `QuestionLayout`) and the answer shape
  held in scanner state (`QuizAnswers = Record<string, string | string[]>`
  — a plain string for single-select questions, a string array for
  multi/ranked ones, order significant for ranked).
- **`quiz/quizQuestions.ts`** — the 9 questions as data, in Nya's exact
  order/phases/values/copy. `QUIZ_PHASES` (derived from the questions'
  `phase` fields) feeds `ScanProgress`'s section label.
- **`quiz/QuestionRenderer.tsx`** — the single component that renders
  every question, driven entirely by its config. Replaces Nya's five
  separate layout components (`IconGrid`/`CurlGrid`/`VisualSingle`/
  `ChipMulti`/`RankCards`) — see DECISIONS.md's "Diagnostic quiz UI" for
  the full why-one-component-not-five writeup, including the honest
  tradeoff (more abstract, less immediately readable than five small
  components) and why it was still worth it here.
- **`quiz/CurlIcon.tsx`** — the curl-pattern SVG illustrations, ported
  as-is (path data unchanged), recolored to `currentColor` so it inherits
  the option button's text color in both themes with no theme-aware logic
  of its own.
- **`quiz/NarisTake.tsx`** — the collapsible "Nari's take on this" note,
  used by the 3 questions that have one (`journey`, `porosity`,
  `frustrations`).
- **`toDiagnosticAnswers.ts`** (one level up, not under `quiz/`) — pure
  function, `QuizAnswers → DiagnosticAnswers` (the type
  `src/lib/products/scoring.ts`'s `scoreProducts()` expects). Confirms the
  two literals Prompt 2 flagged as inferred (`budgetMax`'s bucket
  mapping, `blackOwnedPref`'s casing) — see DECISIONS.md. Still doesn't
  call `scoreProducts()` itself — `ScannerRoute.tsx` calls it, then passes
  the result to `getRecommendations()` (see "Product Data Pipeline" above).
- **`quiz/quizLabels.ts`** (Spike A; extended P2 of 4, P6) —
  `getOptionLabel`/`getOptionDisplay`/`formatAnswerDisplay`/`getOptionTag`,
  the shared value→label lookup against `QUIZ_QUESTIONS`. Used by both the
  review step (below) and `ScanResults.tsx`'s "why we picked this"
  humanizer and profile-summary headline, so neither has to re-derive the
  mapping from a raw answer value back to Nya's option copy.
  `formatAnswerDisplay` numbers a `ranked`-mode question's array
  (`"1. Breakage & shedding   2. Constant dryness   3. ..."`) instead of
  just joining it — added for the review screen, since a ranked answer's
  order is meaningful and a plain `·`-joined list would lose it (the only
  question this currently applies to is `frustrations`, but the check is
  generic to any future `ranked` question). `getOptionTag` (P6) returns an
  option's short `tag` (porosity's "High porosity") instead of its full
  conversational `label` ("Soaks up instantly but dries out fast"),
  falling back to `label` when a question's options have no `tag` — for
  contexts needing a compact noun phrase, like the results page's profile
  summary headline.

### How to add or edit a quiz question
1. Edit (or add an entry to) the `QUIZ_QUESTIONS` array in
   `quiz/quizQuestions.ts`. Pick a `selectionMode` (`single` auto-advances
   on tap; `multi`/`ranked` need the user to tap a Continue button) and a
   `layout` (`grid` needs `columns`; `chips` wraps; `list` is a vertical
   stack). Set `max` for multi/ranked, and `exclusiveValue` if one option
   should clear all others when tapped (e.g. sensitivities' `"none"`,
   frustrations' `"nothing"`).
2. **Don't invent new answer `value` strings** if the question maps to an
   existing scoring dimension (curl type, porosity, density, goals,
   frustrations, sensitivities, budget, black-owned preference) — those
   values flow straight into `toDiagnosticAnswers.ts` and from there into
   `scoreProducts()`'s catalog-tag comparisons with no translation layer.
   If you do need a new value, add it to the corresponding union type in
   `src/lib/products/scoring.ts` and confirm the catalog actually uses
   that tag (see "Product Scoring" above).
3. If the question needs a visual treatment `QuestionRenderer.tsx` doesn't
   already support (not just a new combination of existing
   `layout`/`selectionMode`/option fields, but a genuinely different
   interaction), extend the renderer/config schema rather than writing a
   new one-off component — that's the whole point of the config-driven
   design (see DECISIONS.md).
4. A question only needs a `nariNote` field if it should show the
   collapsible "Nari's take" note.
5. `QUIZ_QUESTION_COUNT`, the progress bar's total units, and the
   interstitial's position (`steps.ts`'s `INTERSTITIAL_AFTER_INDEX`) all
   derive from or reference `QUIZ_QUESTIONS.length` — adding/removing a
   question updates the progress bar automatically; only revisit
   `INTERSTITIAL_AFTER_INDEX` if the new question count changes where the
   "almost there" beat should land.
6. **Display label vs. answer value are independent** — a question's
   option `label`/`sub`/`emoji` can be reworded freely (see the density
   question's P4-of-4 copy pass below) without touching scoring, as long
   as `value` stays the same. Only bump 2 above (union types +
   `scoreProducts()`) if the actual `value` changes.

**Density wording (Final Spike, P4 of 4, Part A)**: the `density`
question's five `sub` labels were rewritten from casual phrasing ("Not a
lot of them", "Tons of it") to a consistent "[strand thickness] /
[density level]" pattern (Fine/Low, Fine/High, Medium/Medium, Thick/Low,
Thick/High) per the CEO's request for more professional copy — display
text only, `value`s (`fine_low`/`fine_high`/`medium`/`thick_low`/
`thick_high`) unchanged, confirmed by the full test suite (including
`toDiagnosticAnswers.test.ts`'s contract section, which runs the real
`scoreProducts()` against every quiz option value) passing unmodified.

## Scanner Flow: Photo, Quiz, Review, Results

**Current order (Final Spike, P2 of 4 — supersedes Spike A's ordering
below): `STEP_ORDER` in `steps.ts` is `["intro", "photo", "quiz",
"review", "analyzing"]`.** The photo now comes right after the intro,
before the quiz — moved per the CEO's direction so it reads as a real
part of the experience rather than an afterthought squeezed in at the
end (it was previously quiz → profile → photo). The old "profile"
step/file was renamed **"review"** (`src/features/scanner/steps/
ReviewStep.tsx`, was `ProfileStep.tsx`) and its copy rewritten — see the
"Review step" section below, which replaces the "Profile step" section
that used to be here. See DECISIONS.md's "Flow reorder" (P2 of 4)
section for the full reasoning; DECISIONS.md's Spike A section (below,
still accurate for everything **except** step order/naming) covers the
five locked results-page edge cases, the prefetch timing, and the photo
honesty-fix rationale that P2 didn't change.

### How to add or reorder a scanner step
1. Add/move the step's id in `steps.ts`'s `StepId` union and
   `STEP_ORDER` array.
2. Add a case for it to `ScannerRoute.tsx`'s step-dispatch `if`/`else if`
   chain (renders the step's component and wires its callbacks to
   `dispatch`).
3. Check `scannerReducer.ts`'s `ADVANCE_QUIZ`/`BACK` cases for any
   step-name-specific special casing — currently just the boundary
   between "quiz" (its last question) and "review" (`ADVANCE_QUIZ` past
   question 9 jumps to "review"; `BACK` out of "review" jumps back to
   the quiz's last question, not `stepIndex - 1` blindly, since
   `quizIndex` is out of range by that point). A step inserted anywhere
   else needs no special case — the default `stepIndex ± 1` already
   handles it.
4. Add a matching `activeSection()`/`currentUnit()` entry in
   `ScanProgress.tsx` for the new step's progress-bar label/unit.
   `TOTAL_PROGRESS_UNITS` (`steps.ts`) is `QUIZ_QUESTION_COUNT + 1` — the
   `+1` is the photo's one unit; a new non-quiz step that should count
   toward the bar needs its own slot budgeted into that total, not just
   a label.
5. If the step reads or writes sessionStorage-persisted quiz state,
   check whether it needs its own "clear the stale blob" effect in
   `ScannerRoute.tsx`, the way "review" does today (see below) — this is
   only needed for a step positioned right after "quiz".

### Review step (`src/features/scanner/steps/ReviewStep.tsx`, was `ProfileStep.tsx`)
Read-only confirmation screen between the last quiz question and results
— the user sees every answer reflected back before recommendations are
generated. Takes visual inspiration from Nya's "done" screen in
`nya-quiz-reference.jsx` ("Your Nari profile / Nari's got you, sis. 🌿")
but the copy was rewritten for P2 of 4: heading **"Here's what you told
Nari"**, subtext **"Take a look and fix anything that looks incorrect
before we build your recommendations."** Renders every answered question
with its human label via `quiz/quizLabels.ts` (never a raw value like
`"fine_low"`); a `ranked` question's array (frustrations) is numbered by
priority order, not just joined — see `quizLabels.ts`'s
`formatAnswerDisplay` above. **Deliberately no photo shown** — the photo
currently feeds nothing (see below), so surfacing it here would imply it
does. **Deliberately no inline editing or step-jumping** — clicking a
past answer doesn't do anything; if something's wrong, the user hits
Back, which already preserves every answer all the way through the quiz.
Inline editing across all 9 question types was considered and
explicitly deferred (it's the single largest item in this spike's scope
for the smallest payoff) — see DECISIONS.md.

Two actions per Nya's original design (plus a standard Back, for
consistency with every other step): primary **"Build my
recommendations"** → analyzing/results, and **Start over**, which
confirms via `window.confirm` before clearing all scanner state (`RESET`
action) and the persisted quiz sessionStorage blob — handled in
`ScannerRoute.tsx`'s `handleStartOver`, not inside the reducer, since
sessionStorage is a side effect the reducer itself shouldn't own (same
convention as the existing quiz→review clear effect below).
`scannerReducer.ts`'s `BACK` case special-cases leaving "review"
(returns to the quiz's last question) rather than leaving "quiz" itself
— a consequence of review sitting right after the quiz, not a new
pattern. `ScannerRoute.tsx`'s sessionStorage-clear effect (fires once
the user reaches "review", so a refresh there doesn't read the quiz's
stale last-question snapshot and bounce the user backward) moved with
the rename — same mechanism as Spike A's original "clear on reaching
profile" fix, just retargeted at the new step name.

### Photo step (`src/features/scanner/steps/PhotoStep.tsx`) — now first, and no longer called "optional" (P2 of 4)
The photo step moved to right after the intro (was after the quiz, then
after the quiz+profile in Spike A — see the flow-reorder note above) and
its copy dropped the word "optional" from the heading/label per the
CEO's direction: she wants it to read as a real part of the experience,
not an afterthought. **It's still skippable** — "Skip for now" stays,
the concept didn't change, just the framing. Current heading: **"A photo
of your hair"**. Body copy: *"Full photo analysis is coming soon and
will help Nari tailor style recommendations. For now, your
recommendations primarily come from your quiz answers."* This still
holds the line from Spike A's honesty fix below — no claim that the
photo is analyzed, stored, or used for recommendations; it's currently
read by nothing.

### Photo step honesty fix (launch-blocking, per the Spike A brief)
The old copy claimed photos were "analyzed and immediately deleted" —
untrue today, since `api/analyze.ts` is deployed but never called from
this flow (still true after P2 of 4; wiring it is explicitly out of
scope). Fixed everywhere the claim appeared (the specific `PhotoStep.tsx`
copy quoted below was superseded again by P2 of 4's rewrite — see
directly above for the current wording; the reasoning here, and the
other files' fixes, still stand):
- `PhotoStep.tsx` (superseded, see above): heading used to read
  "(optional)"; body copy used to be *"Photo analysis is coming soon —
  add a photo to try the flow, or skip straight to your results. Your
  photo isn't stored or shared."*
- `CTA.tsx`'s landing trust line: dropped to "Your photos are never
  stored or shared." (still true, no longer promising analysis).
- `Features.tsx`'s "Scan"/"Analyze" step copy: also corrected a second,
  separate stale claim found in the same pass — "Snap three quick
  photos" (the flow has taken exactly one *optional* photo since before
  Spike A; nothing about this specific number was ever updated when the
  flow changed) and "We analyze your hair texture..." (implies photo
  vision analysis that isn't wired). Now: "Answer a few quick questions
  about your hair, then add a photo if you'd like" / "We match your
  answers... to real products. No guesswork." **(Superseded again, P4 of
  4, Part D)**: the Analyze line's em dashes ("— porosity, curl type,
  goals, and more —") were replaced with a colon + comma construction per
  the CEO's request, scoped to this one sentence only — current text:
  "We match your answers: porosity, curl type, goals, and more, to real
  products. No guesswork!" No other em dash in the codebase was touched,
  and Airtable-sourced text (product/style `notes`) is explicitly out of
  scope for any future em-dash sweep — it's regenerated on every catalog
  fetch, so a manual edit there would just be silently overwritten.
- **Two distinct capture options, not one input with `capture` set**:
  `PhotoCapture.tsx`'s `capture` prop is now optional
  (`"environment" | "user" | undefined`) instead of hardcoded to
  `"environment"`. `PhotoStep.tsx` renders it twice — "Take a photo"
  (`capture="environment"`, jumps to the camera on mobile) and "Choose a
  photo" (no `capture` attr, opens the OS file/photo picker) — a single
  input with `capture` set gives no way to pick an existing shot.
- **"Skip for now"** is a new `SKIP_PHOTO` reducer action (clears any
  photo AND advances in one dispatch, rather than two separate
  dispatches) — always available regardless of whether a photo was
  already captured. The photo is optional end to end: `state.photo`
  being `null` was already handled everywhere downstream (scoring never
  touches the photo — see "Product Scoring" above), so this needed no
  changes past the step itself.

### Results page (`src/pages/ScanResults.tsx` + `.module.css`)
Fully rebuilt to render a real `ScoredRecommendationSet` (from
`src/lib/products/scoring.ts`) instead of the retired mock
`RecommendationSet`. **Routine-ordered tabs**, not an arbitrary list —
`scoring.ts`'s `deriveCategories()` derives the category list from the
catalog itself (currently Shampoo→Conditioner→Leave-in→Cream→Mousse→
Oil/Sealant→Gel — see "Product Scoring"'s "Category order" section for
how a category Nya adds gets picked up automatically), so the results
page just renders `categories` in the order `scoreProducts()` returns it
with no re-sorting. Each tab shows a count badge (`category.picks.length`,
shown even when 0); the first category is open by default.

- **Product cards**: name, brand, category badge, price (formatted via a
  local `formatPrice` — no forced `.00` on whole-dollar prices), buy
  link (`target="_blank" rel="noopener noreferrer"`, omitted entirely if
  the product has none — 13 of 50 currently don't), and an image only if
  `product.imageUrl` exists (no product does yet — see "Product Data
  Pipeline" — so this path is written but unexercised against real data
  today; no reserved space when absent).
- **"Why we picked this"**: a per-card expandable button/panel
  (collapsed by default) that humanizes `scoring.ts`'s raw
  `matchReasons` strings (e.g. `"goal: frizz"`) into plain language via
  a small parser (`humanizeMatchReason` in `ScanResults.tsx`), reusing
  `quiz/quizLabels.ts`'s `getOptionLabel` so a goal/frustration reads as
  Nya's own option copy ("your frizz control goal") rather than the raw
  catalog tag. Deliberately does **not** invent a sensitivity-driven
  callout (e.g. "protein-free") since `scoring.ts`'s hard filters don't
  produce a matchReason for what they excluded — noted as a Spike B
  deepening opportunity, not implemented here, to keep this the "cheap
  version" the brief asked for.
- **The five locked edge cases**, all verified with real screenshots
  against live Airtable data (see DECISIONS.md for the reasoning behind
  each):
  1. Empty category → tab stays visible with a "0" badge; panel shows
     "No matches in this category yet — we're adding products."
  2. Relaxed matches → a banner names exactly what was dropped ("Closest
     match — no products tagged for your curl type yet"), built from
     `category.relaxedConstraints`. **Only rendered when the category
     also has ≥1 pick** — a relaxed-but-still-empty category (e.g.
     Mousse for a protein-sensitive user) would otherwise show a
     self-contradictory "closest match" banner next to "no matches."
  3. `price === null` → the price line is omitted entirely, never
     `"$0"`/`"null"`.
  4. `unenforcedSensitivities` non-empty → a page-level banner names
     what wasn't checked ("we can't verify mineral oil..."), built
     dynamically from `getOptionLabel("sensitivities", ...)` — auto-
     resolves the moment a real column exists, no hardcoding.
  5. Email capture (`EmailCapture`, reusing the existing `useSubscribe`
     hook) renders unconditionally after the tabs/products — no modal,
     no blur-until-email gate.
- **Tabs are plain buttons**, not a full WAI-ARIA roving-tabindex
  tablist (`role="tab"`/`"tabpanel"`/`aria-selected` are set, but arrow-
  key navigation between tabs isn't implemented) — keyboard-reachable
  via Tab/Enter like any button, just not the full authoring-practices
  pattern. Flagged for Spike B, not done here.
- **Styles strip (Final Spike, P3 of 4)**: the top 2 `styles` picks (see
  "Product Scoring"'s "Styles" section) render as a card row
  (`StylesStrip` in `ScanResults.tsx`) below the full product-tabs block
  — never another tab, never above the products. Layout was picked by
  the CEO from 3 generated options (card row / tinted panel / compact
  list rows), screenshotted at desktop/mobile × light/dark; the chosen
  card row reuses `ProductCard`'s exact hairline-border +
  `--shadow-elevation-1` + hover-lift convention (a small "STYLE" badge
  stands in for a category badge; no brand/price/buy-link, since a style
  is a technique, not a purchased product). Renders nothing at all — not
  an empty-state message — when there are 0 styles. Each card's match
  line (`buildStyleMatchLine` in `ScanResults.tsx`) humanizes
  `scoreStyle`'s existing `matchReasons` the same way `humanizeMatchReason`
  does for products, reusing `quiz/quizLabels.ts`'s `getOptionLabel`. The
  style's `notes` field ("Keep in mind") is shown directly under the
  match line only when present — 2 of the 5 live styles have none, and
  the heading is omitted entirely for those rather than left hanging
  empty. See DECISIONS.md's "Final Spike — Results Page Styles &
  Categories (P3 of 4)" for the full reasoning and the other 2 layout
  options that weren't chosen.
- **Profile summary opener (P6)**: a gradient-tinted card between the
  "Built for your hair" heading and the category tabs — "Your 4A, high
  porosity routine," a one-line summary of the user's goals and #1
  frustration, a chip row (goals + density), and a stat line ("12
  products matched across 5 categories · 2 styles for you"). Reflects the
  user's own profile back before the recommendations begin, so the page
  reads as personal rather than a filtered list. Picked by the CEO from 3
  generated variants, each taking a genuine position on a different
  design question (a summary moment / products-styles hierarchy /
  shareability as a standalone artifact) rather than three restyles of
  the same idea — see DECISIONS.md's "P6" section for the other two and
  the full reasoning. Built from `getProfileFacts(answers)` in
  `ScanResults.tsx`, which reads `getOptionTag` (new in `quizLabels.ts`,
  P6) for porosity/density — the short noun-phrase `tag` ("High
  porosity"), not the full conversational `label` ("Soaks up instantly
  but dries out fast") the quiz itself uses, which would be far too long
  for a headline. No new data source — same `DiagnosticAnswers`/
  `ScoredRecommendationSet` every other part of the page already has.
  Degrades to the pre-P6 generic subtext ("Based on your diagnostic...")
  when `answers` is absent (an older cached history entry — see
  `ScanResultsLocationState`), same backward-compat pattern as
  `SendResultsCapture` and the match checklist.

## Spike B — Hardening, Tests & Scoring Transparency (Day 2 of 2)

Error handling across the whole flow, an automated test suite (none
existed before this pass), a per-product match checklist on the results
page, a production-accessible debug view for tuning `SCORING_WEIGHTS`, and
two small fixes (dark-mode default, results-page email copy). See
DECISIONS.md's "Spike B" section for the full reasoning behind each piece
below, including the review pass's refactor candidates.

### Running the tests
`npm test` runs the full Vitest suite (`vite.config.ts` now carries a
`test` block — `environment: "jsdom"`, `globals: true`, a setup file that
registers `@testing-library/jest-dom`'s matchers — so `npm test` alone is
enough; no CLI flags needed anymore). Test files, by area:
- `src/lib/products/scoring.test.ts` — the scoring engine, including the
  Spike B guarantee tests (porosity/sensitivity honesty, no fabricated
  products, relaxation order, determinism) and coverage for the three new
  debug-only exports.
- `api/_lib/schema.test.ts` (new) — Airtable normalization: malformed rows
  skip instead of crashing, case normalization, missing-price-becomes-null,
  unmapped/missing-field reporting.
- `src/features/scanner/toDiagnosticAnswers.test.ts` — including a new
  "contract" section that actually calls `scoreProducts()` with the
  converted answers against the real catalog fixture (not just a type
  check) for every real quiz option value across the 5 scored dimensions.
- `src/features/scanner/scannerReducer.test.ts` (new) — sessionStorage
  quiz-resume, including a corrupted-blob case.
- `src/lib/dataSource.test.ts` (new) — catalog-fetch failure/retry/dedupe,
  with `fetch` mocked (each test does a fresh `vi.resetModules()` +
  dynamic import, since `getProducts()`'s cache is module-level state).
- `src/pages/ScanResults.test.tsx` (new) — render tests for the empty-
  category, relaxed-match, null-price, all-categories-empty, and
  no-router-state edge cases, via React Testing Library + `MemoryRouter`.

### Scoring transparency checklist (Part C)
Each product card on the results page now shows a compact, always-visible
✓/✗ row for up to 5 dimensions — porosity, curl type, sensitivities,
budget, and black-owned (only when the user actually expressed a
preference on that dimension; an inapplicable one is omitted, never faked).
Matches render first so a couple of honest ✗'s don't make a good pick read
as bad. Built from `scoring.ts`'s new `buildMatchChecklist(product,
answers, unenforcedSensitivities)` export — pure, typed, no numeric score
anywhere (see DECISIONS.md for why). Rendering lives in `ScanResults.tsx`'s
`ProductCard`/`formatChecklistLabel`; needs `answers`
(`DiagnosticAnswers`), which `ScannerRoute.tsx` now passes through
`navigate()`'s router state alongside `recommendations`.

### Scoring debug view (Part D)
**`/debug/scoring`** — works in production, key-gated, not linked anywhere
in the UI.
- **To use it**: visit `/debug/scoring?key=<value of the ONYAPROJECTX env
  var>`. Wrong or missing key renders the literal same `<NotFound />`
  component the wildcard route does (see router.tsx — the route lives
  inside `RootLayout`'s children, next to `"*"`, specifically so this is
  pixel-identical, not a distinguishable "access denied" page).
  `api/debug-scoring.ts` does the actual server-side comparison against
  `process.env.ONYAPROJECTX` — set that env var in Vercel (a long random
  string) for the gate to open in production; it isn't set anywhere in
  this sandbox's env, so the endpoint 404s everything until it is.
- **What it shows**: the current `SCORING_WEIGHTS` object; per profile,
  every product excluded by hard filters and why; per category, a full
  ranked comparison table (one row per eligible product, one column per
  scoring dimension, a highlighted "biggest gap vs next" line between
  consecutive ranks) with the actual top-3 picks marked; and, when
  relaxation fired, exactly which constraint(s) were dropped.
- **Ships 4 built-in profiles** (Demanding/protein-sensitive,
  2C/3A-triggers-relaxation, Easy/no-relaxation, Black-owned-preference) —
  each verified against the real catalog fixture to actually demonstrate
  what its name claims (see DECISIONS.md) before being hardcoded.
  `?profile=<name>` narrows to just one; any individual field override
  (`?curlType=4c&budgetMax=10&sensitivities=protein,sulfates`, etc.), with
  or without `profile`, narrows to a single ad hoc custom profile instead
  of showing all 4 — see `ScoringDebug.tsx`'s `OVERRIDE_KEYS` for every
  overridable field.
- **How it stays in sync with the real pipeline, always**: the comparison
  tables don't re-implement scoring — `scoreProductBreakdown`,
  `debugHardFilterExclusions`, and `debugScoreCategory` (all new exports
  in `scoring.ts`) call the exact same internal functions
  (`computeScoreBreakdown`, `failingSensitivities`,
  `requiredDimensionsFor`/`meetsRequiredDimensions`/`selectForCategory`)
  the real `scoreProducts()` pipeline does. There is no second
  implementation to drift out of sync.

### Changing the weights (unchanged process, now with a better instrument)
Still just edit `SCORING_WEIGHTS` in `scoring.ts` and run `npm test` to
eyeball `scoring.test.ts`'s printed picks-per-category output (see
"Product Scoring" above) — `/debug/scoring` is the complementary
non-engineer-facing view of the same change: tune the number, redeploy,
screenshot the debug view for Nya instead of (or alongside) reading test
output.

## Results Email (Final Spike)

The results page's "Join the waitlist" form was replaced with an option to
**email the user their actual recommendations** — `api/send-results.ts`,
following `api/subscribe.ts`'s conventions exactly (handler signature, env
var access, `.js`-suffixed relative imports, self-contained within `api/`).
See DECISIONS.md's "Final Spike" section for the full reasoning; this is
the quick-reference version.

- **Request shape is a display projection, not the full
  `ScoredRecommendationSet`.** `{ email, curlType, porosity, recommendations
  }`, where each pick is just `{ name, brand, price, buyLink, matchLine }`
  — `matchLine` (e.g. `"✓ your porosity · ✗ not Black-owned"`) is a
  finished string built **client-side**, in `ScanResults.tsx`'s
  `buildMatchLine()`/`buildSendResultsPayload()`, reusing the exact same
  `buildMatchChecklist()` the on-screen checklist already calls. The
  endpoint never recomputes a match verdict — it only ever renders what
  it's given. Validated by `api/_lib/resultsSchema.ts`'s
  `SendResultsRequestSchema` (Zod), which deliberately does **not** reuse
  `api/_lib/schema.ts`'s full `ProductSchema` — the email doesn't need
  `hairTypes`/`porosity`/etc., just the 4 display fields.
- **Email is required; sheet logging is best-effort, attempted only after
  a confirmed send.** Mirrors `subscribe.ts`'s own asymmetric tolerance
  with the roles reversed — there, Sheets is required and email is
  best-effort/logged-only; here, email is required (a Resend failure
  returns a real error, e.g. 502, and the UI must show it — never a false
  success) and both Sheets appends (Results tab + waitlist tab) are
  logged-but-non-fatal if they fail, since the user already has their
  email by that point.
- **Two sheet writes, one spreadsheet, two tabs.** `GOOGLE_SHEET_ID` +
  `GOOGLE_RESULTS_RANGE` (default `Results!A:E`) for a new row —
  **Email | Curl Type | Porosity | Products Sent | Timestamp** (`Products
  Sent` is the total pick count across all categories, not a product
  list). `GOOGLE_SHEET_ID` + `GOOGLE_SHEET_RANGE` (same var/default
  `subscribe.ts` uses) for a waitlist row — **one-directional**: results
  recipients get added to the waitlist too (First/Last blank, no name
  collected on this form; Hair Type gets the real `curlType`), but
  waitlist signups from `subscribe.ts` never receive results.
- **Abuse guard**: an in-memory `Map` rejects a repeat request for the
  same email within 60 seconds (429) — set optimistically before calling
  Resend (so a duplicate submit can't even reach it), cleared again if the
  send fails (so a real retry is never blocked by the guard).
- **No shared helper file with `subscribe.ts`.** The ~15 lines of Google
  auth setup are duplicated, not extracted — `subscribe.ts` is explicitly
  "deployed and working, do not move" and this is the last spike before
  launch; see DECISIONS.md for the full tradeoff (same reasoning as
  `api/_lib/schemas.ts`'s existing hand-duplication of a subset of
  `src/lib/schemas.ts`).
- **Client side**: `src/lib/useSendResults.ts` (mirrors `useSubscribe.ts`'s
  loading/error/success shape) + `src/pages/ScanResults.tsx`'s
  `SendResultsCapture` component (replaces the old `EmailCapture`). Email
  field only, no name. Fires a `results_emailed` analytics event on
  success; `scan_completed` already fires from `ScannerRoute.tsx` the
  moment `getRecommendations()` resolves (predates this spike — confirmed
  still correct, not duplicated).
- **Verified via the same esbuild-transform + Node-ESM-resolver harness**
  used to catch the original two production import bugs (see "Server code
  boundary" above) — confirms `./_lib/resultsSchema.js` resolves the way
  Vercel's per-file transpilation would produce it. **Not verified**:
  an actual invocation with live Resend/Google credentials (this
  sandbox's env files are dotless — see the top of this file); that's the
  user's to run post-deploy per PLAN.md's verification checklist.

## Design System Notes

### Token file
`src/styles/variables.css` is the single source of truth — every color,
shadow, spacing, radius, and motion value components use should be a `var(--...)`
read from this file, never a hardcoded hex/px. If a flip of this file doesn't
visually flip a component, that component has a bug (a hardcoded value) —
fix it there, don't work around it. This isn't hypothetical: the dark-mode
pass below found real instances (see "Dark mode" section) purely by taking
actual dark-mode screenshots and comparing, not by reading the CSS — a
`var(--color-white)` used as a *background* looks identical to a correct
token in a code review and only shows up wrong in a live render.

### Dark mode (`src/styles/useTheme.tsx`)
Real, working toggle — not a stretch item. `ThemeProvider` (wraps the app in
`main.tsx`) + `useTheme()` hook toggle a `data-theme="dark"` attribute on
`<html>`; `variables.css` has a single `:root[data-theme="dark"]` block
overriding the base neutral/accent/shadow tokens (lighter/neon accent stops,
near-black bg, bloom-style glow shadows) — every component still only reads
the semantic aliases (`--color-bg`, `--color-text`, etc.), so nothing needed
a parallel dark stylesheet.
- **`--gradient-accent` / `--gradient-ribbon` / `--gradient-accent-solid` are
  NOT redefined in the dark block.** They're declared once at `:root` as
  literal strings containing `var(--color-accent-start)` etc.; a custom
  property's value resolves at point-of-use against whatever's cascaded at
  that element, so overriding just the accent tokens is enough to repaint
  every gradient built from them. Redefining the gradients too would just
  be the same computed value with two places to drift apart — confirmed
  this actually works via screenshots, not assumed.
- **Toggle UI**: `ThemeToggle.tsx`, a sun/moon icon button, lives in
  `RootLayout.tsx`'s `.navTrailing` wrapper — deliberately *outside*
  `.navLinks` (which is `display:none` below 900px) so the toggle stays
  visible on mobile, next to the hamburger; also duplicated in the mobile
  sheet's top bar next to the close button.
- **Transition**: toggle wraps its state update in
  `document.startViewTransition` when available (a smooth crossfade,
  tuned via `::view-transition-old/new(root)` in `global.css`); browsers
  without support just swap the attribute instantly — the toggle itself
  never blocks on a feature check.
- **No-flash on load**: a blocking inline `<script>` at the very top of
  `index.html`'s `<head>` (before any CSS/font links) sets
  `data-theme="dark"` on `<html>` immediately unless
  `localStorage.getItem('nari-theme')` is explicitly `'light'` — this runs
  before React or even the stylesheet finishes loading, so there's never a
  flash of the wrong theme either direction. **Dark is the default for
  every new visitor (Spike B, per Nya) regardless of OS
  `prefers-color-scheme`** — inverted from this project's original
  light-first default; the script only checks for an *explicit* prior
  "light" toggle in localStorage, never `matchMedia('(prefers-color-scheme:
  light)')`. `ThemeProvider`'s initial React state is read from the DOM
  attribute the script already set, not defaulted to a fixed value, so the
  two never disagree. See DECISIONS.md's Spike B section for why this
  flipped and what would change it again.
- **If you add a new component**: just use the semantic token aliases as
  normal. The only time you need to think about dark mode explicitly is
  when something needs *real* pixel data per theme (a canvas/WebGL texture,
  like the Cube's Logo face and rim glow — see below) — CSS can't do that
  automatically, so those read `useTheme()` and regenerate.

Token groups:
- **Neutral ramp** (`--color-neutral-50` → `-950`) — 50 is near-white
  (warm-tinted, not gray), 950 is near-black text. `--color-bg` /
  `--color-text` / `--color-text-muted` / `--color-border` are the semantic
  aliases components should actually reference.
- **Accent** — `--color-accent-start` (purple) / `--color-accent-end` (pink) /
  `--color-accent-warm` (orange) / `--color-accent-blue` are the bright,
  saturated stops for large decorative surfaces: the ribbon and
  gradient-clipped headline text at large sizes. `--color-accent-tint-1`
  (aka `--color-accent-text`) is a deepened purple for small text, icons,
  borders, and focus rings on white. `--gradient-accent` (bright) is for
  large gradient-clip text and the ribbon; `--gradient-accent-solid` (deeper
  stops) is for button fills with white text — **use `-solid` for any button
  or small (<24px) gradient-clipped text; the bright gradient fails AA
  contrast for white text/small text on white backgrounds.** This split
  exists because of a real contrast bug caught during the light-theme flip:
  white text on the bright purple→pink gradient measures ~3.5–4:1 (fails the
  4.5:1 AA requirement below large-text sizes).
- **Shadows** — `--shadow-glow` (soft colored ambient shadow, use behind
  gradient elements) and `--shadow-elevation-1` (neutral card lift). Both are
  tuned as soft/diffuse on white, not the neon bloom they were on the old
  dark theme.
- **Spacing / radius / typography / motion timings** — unchanged in the
  light-theme flip; see the file directly, values are self-descriptive.

### Ship-checklist gotchas (found while chasing Lighthouse ≥ 90)
- **A stronger color-mix tint can *reduce* contrast, not increase it, if
  the same color is both the text color and the tint source.** The
  footer's `.iconLinkedIn`/`.iconEmail` circles use
  `color: var(--color-accent-tint-1)` for the text AND
  `background: color-mix(in srgb, var(--color-accent-tint-1) X%, transparent)`
  for the background. Turning X *up* pulls the background's luminance
  toward the text's own (dark) luminance — shrinking contrast, not
  growing it. If a color-contrast audit flags one of these icon circles
  again, the fix is a *lower* mix percentage (currently 8%), not higher.
- **Fonts**: the Google Fonts / Fontshare `<link rel="stylesheet">` tags
  in `index.html` use `media="print" onload="this.media='all'"` (+ a
  `<noscript>` fallback) specifically so they don't block first paint —
  don't "simplify" this back to a plain `<link rel="stylesheet">`, that's
  what was costing ~1.4s of Lighthouse Performance score before Pass 6.
- **`role="text"`** on the Hero eyebrow (`Hero.tsx`) is required — an
  `aria-label` on a bare `<p>` with no role is invalid ARIA. Any other
  split-into-spans-for-animation text needs the same treatment.

### Contrast fixes made during the theme flip (for reference)
Several hexes changed from their dark-theme values because they no longer
cleared WCAG AA once the background flipped to white:
- `--color-accent-tint-1`: `#C084FC` → `#9333EA` (was ~2.7:1 on white, now ~5.4:1)
- `--color-success`: `#33D19F` → `#15803D` (~3.3:1 → ~5.0:1)
- `--color-error`: `#FF6B6B` → `#DC2626` (~2.8:1 → ~4.8:1)
- Added `--gradient-accent-solid` (see above) rather than changing
  `--gradient-accent` itself, since the bright stops are still correct for
  large surfaces (the ribbon, big gradient-clip headline words).

### Card / shadow conventions
Cards are white (or the warm-tint `--color-bg-elevated`) with a hairline
border (`--color-border`, ~8–10% black) and `--shadow-elevation-1`, never a
flat gray fill. Hover = lift (translateY) + deepen the shadow, ~150ms.

### How to add a new section that matches the existing feel
1. Wrap content in the shared max-width container (`var(--w)`, ~1120px) with
   section padding from the spacing scale (`--space-4xl` top/bottom is the
   norm between major sections) — no ad-hoc margins.
2. Alternate section background between `--color-bg` and `--color-bg-elevated`
   for the next section down, never introduce a plain gray slab.
3. Reveal with `useScrollReveal` (`src/styles/useScrollReveal.ts`) for any
   section that lives on a long-scroll page (Landing's sections, About) —
   see "Scroll-linked animation" below. Reserve the older
   `fadeUp`/`staggerChildren` variants from `src/styles/motionVariants.ts`
   for one-time *mount* reveals that aren't tied to scroll position at all
   (Hero's intro, ScanResults' post-scan reveal) — don't reach for
   `whileInView` + these variants for a new scroll-triggered section, see
   why below.
4. Any card: hairline border + `--shadow-elevation-1`, hover lift.
5. Any button/CTA: `--gradient-accent-solid` fill + white text, or an
   outlined pill using `--color-accent-tint-1`. Never the bright
   `--gradient-accent` behind white text.

### Gradient ribbon (`src/components/GradientRibbon.tsx`)
The hero's Stripe-style diagonal color band. Two things about the
implementation aren't obvious from reading either file alone:

- **Pivot at the top-right corner, not the center.** Each layer is a tall,
  narrow div (`transform-origin: 100% 0%`) rotated -18° to -27°. Anchoring
  rotation at the top-right corner makes the band fan down-left from that
  point, matching the reference; center-anchored rotation on a box this
  tall just produces a big diagonal slab that eats the whole viewport.
- **`z-index: -1`, not `0`.** The wrap is `position: fixed` so it stays
  pinned behind the (Pass-3) transparent-over-hero navbar. A fixed element
  at `z-index: 0`/`auto` still paints *above* ordinary static in-flow
  content elsewhere in the document — per the CSS stacking spec,
  `z-index:auto` positioned descendants paint above static ones regardless
  of DOM order — so at `z-index: 0` the ribbon bled through every opaque
  section below the hero (Features, ResultsPreview, FAQ all showed the
  gradient through their "solid" white backgrounds). `-1` puts it in the
  negative-z-index paint step, below plain static content, so those
  sections properly occlude it once scrolled past. If you add a new
  section between Hero and the next one and it's positioned (`relative`/
  `absolute`/`fixed` with no z-index tweak), double check it still isn't
  transparent to the ribbon.
- **3 layers for the hero variant** (outer: 90px blur, widest, faintest;
  mid; core: 22px blur, narrowest, most saturated — the visible "spine"),
  **2 for `variant="accent"`** (used once, near the final CTA, at roughly
  half the opacity, percentage-sized so it scales with its own section
  instead of the viewport).
- Each layer's `@keyframes` animates `transform` only (translate/scale on
  top of the base `rotate()`) on its own 8-13s loop with a negative
  `animation-delay` offset so the three layers are already out of phase on
  first paint — this is what makes it read as drifting light rather than a
  synchronized loop. Blur is static (never animated) so the browser can
  composite the transform on the GPU without re-rasterizing the blur every
  frame.

### Navbar (`src/layouts/RootLayout.tsx` + `RootLayout.module.css`)
- **Transparent → frosted is a class toggle, not a component swap.** A
  `scroll` listener sets `scrolled` state once `window.scrollY` passes 64px;
  `.header` is transparent with a transparent border by default, and
  `.headerScrolled` adds the semi-opaque white background, `backdrop-filter:
  blur(12px)`, and the visible hairline border. Only
  background-color/border-color/backdrop-filter transition (250ms) — the
  border property itself is present in both states (just transparent vs.
  `--color-border`) so it can transition instead of popping in.
- **`#root { min-height: 100% }`, not `height: 100%`.** The header is
  `position: sticky` and its literal DOM parent is `#root`. A sticky
  element's containing block for stickiness purposes is its own parent's
  box — if that parent is capped to exactly one viewport tall (`height:
  100%`) while real content is taller, the header stops sticking and
  scrolls away entirely once the page has scrolled past one viewport. This
  was a real, pre-existing bug (predates the design sprint) that Pass 3
  caught because it's the first time the header's persistence across a
  scroll actually mattered visually. If you ever re-add a fixed `height`
  anywhere between `<html>` and `<header>`, this will break again silently
  — verify with `getBoundingClientRect()` after scrolling past 100vh, not
  just a visual glance at the top of the page.
- **Mobile sheet** is a conditionally-rendered full-screen overlay
  (`position: fixed; inset: 0; z-index: 30`, above the header's 20), not a
  CSS-only slide-in — body scroll is locked via a `useEffect` while it's
  open, and it closes on route change (`useLocation` effect) and Escape.

### Hero orchestration (`src/components/Hero.tsx`)
- **Framer Motion gotcha: a `transition` prop does not reliably override a
  variant's own baked-in `staggerChildren`/`delayChildren` for child
  orchestration.** The first attempt at sequencing "Nari" types on → then
  headline/subline/CTA passed `variants={staggerChildren}` (the shared
  export, baked with `delayChildren: 0.1`) plus a sibling `transition={{
  delayChildren: 0.5, ... }}` prop intending to override it for this one
  usage. Computed-opacity sampling at controlled intervals (not a visual
  glance — the effect is subtle enough to eyeball wrong) showed the
  headline actually starting ~100-250ms in, i.e., the prop was ignored and
  the original variant's timing won. The fix was a dedicated local variant
  (`heroGroupStagger`) with the delay/stagger baked directly into its own
  `visible.transition` — that's the pattern to copy for any other
  per-usage stagger override, not a `transition` prop alongside a shared
  `variants` object.
- **The "Nari" eyebrow is a separate, independent animation, not part of
  the outer stagger.** It has its own explicit `initial`/`animate` (which
  is what lets a nested motion component opt out of an ancestor's
  orchestration in Framer Motion and run on its own clock from t=0), while
  everything else (`title`, `subtitle`, `.ctas`, `.art`) only sets
  `variants` and so inherits from the outer `motion.div`'s
  `heroGroupStagger` context — this works across the `.copy` wrapper `div`
  (a plain, non-motion element) because Framer Motion's variant
  inheritance propagates via React context regardless of how many
  non-motion elements sit between an animating ancestor and its motion
  descendants.
- Screen readers get "Nari" once via `aria-label` on the wrapping
  `motion.p`; the individual letter `motion.span`s are `aria-hidden`.

### Global polish conventions (Pass 5)
- **Every section's padding is a token expression, not a literal.** Where a
  design needed a value not directly in the scale (e.g. Hero's top padding
  needs room for the fixed navbar over it), it's a `calc()` of two tokens
  (`calc(var(--space-4xl) + var(--space-lg))`) rather than a bare px value
  — so it still moves if the scale changes.
  `--duration-fast`/`--duration-base` similarly replaced several
  hand-picked transition durations (130ms, 180ms, 230ms) that had drifted
  off the token values.
- **Scroll fade-ups are 250ms, matching `--duration-base`.** `fadeUp` in
  `motionVariants.ts` had drifted to `duration: 0.4` (400ms) at some point;
  corrected to `0.25`. This is the shared whileInView reveal (Features,
  ResultsPreview, CTA) — not the Hero's one-time mount intro, which has its
  own explicitly-spec'd timing (see the Hero orchestration notes above).
- **Card pattern**: hairline border + `--shadow-elevation-1` at rest,
  `translateY(-2px to -4px)` + `--shadow-glow` on hover, both transitioning
  over `--duration-fast`. Applied to Features' step cards, ResultsPreview's
  sample card, and ScanResults' recommendation cards. Form containers (CTA's
  `.box`, ScanResults' `.captureBox`) intentionally do NOT get this
  hover treatment — they're not a discrete thing you hover as a unit.
- **Scanner analyzing screen** (`AnalyzingStep.tsx` /
  `scanner.module.css` `.shimmer`): the old spinner (rotating ring) was
  replaced with a pill-shaped bar whose background sweeps through the
  brand gradient (`background-position` animation on an oversized gradient,
  transform/opacity-equivalent — cheap to composite). If you need a loading
  indicator elsewhere, reuse `.shimmer`'s pattern rather than reaching for
  a spinner.
- **Favicon**: `public/favicon.svg`, referenced from `index.html` as
  `type="image/svg+xml"`. There was no `public/` directory and no favicon
  at all before Pass 5 (`favicon.ico` 404'd) — if you need additional
  static assets, that's where they go; Vite serves `public/*` at the site
  root.

### Two-layer shadow system (Pass 6)
`--shadow-elevation-1` (rest) and `--shadow-glow` (hover/emphasis) in
`variables.css` are each a **tight, low-opacity dark shadow** (contact,
close, e.g. `0 1px 2px rgba(26,21,35,0.06)`) **plus a larger, softer,
brand-tinted ambient shadow** further out (e.g.
`0 12px 32px rgba(168,85,247,0.10)`). This is deliberately a shared token
pair, not a per-component mixin — every card/button in the app references
one of these two tokens for its shadow; never write a one-off
`box-shadow` value in a component file. If a component needs a shadow and
neither token fits, that's a sign to reconsider the token, not to add a
local value.

### Grain overlay (`src/components/GrainOverlay.tsx`)
Mounted once in `main.tsx`, as a sibling of `<RouterProvider>`, not inside
`RootLayout`. That placement matters: the scanner routes (`/scan`,
`/scan/results`) render outside `RootLayout` (see the comment in
`router.tsx`), so anything meant to apply site-wide has to live at the true
app root or it silently misses those routes. `public/noise.svg` (an SVG
`feTurbulence` filter) is tiled via CSS `background-image`, not inlined as
a data URI — simpler to read/edit than an encoded string, same effect.

### Mouse-reactive hero glow (`GradientRibbon.tsx`)
The `.mouseGlow` layer's visibility is gated by a CSS
`@media (hover: hover) and (pointer: fine)` query — that's the real gate.
The JS `mousemove` listener also checks `matchMedia` before attaching, but
only to avoid pointless work on touch devices; correctness doesn't depend
on it, since the CSS hides the element regardless. Position is passed via
`--mx`/`--my` custom properties set directly with
`style.setProperty()` in the mousemove handler — deliberately not through
React state, so moving the mouse doesn't trigger a re-render.

### Button press/hover feedback (Pass 6)
Every primary gradient button (Hero, CTA, nav, ScanResults, scanner,
Contact) follows the same two rules now: `:active` scales to `0.97` over
80ms (faster than the 150ms hover transition — deliberately snappier, it's
a press, not a reveal), and `:hover` swaps to
`--gradient-accent-solid-hover` (same stops, shifted angle) instead of a
flat color change. Gradients don't smoothly cross-fade via CSS
transitions across browsers, so this snaps — the transform/shadow
transitions around it are what carry the perceived smoothness.

### Logo / wordmark (`src/components/Logo.tsx`, Spike 2 Part A)
`<Logo />` is the single source of the "Nari" brand mark — nav, footer,
and the mobile sheet all render the same component rather than each
having their own text/CSS treatment (the footer used to have a bespoke
uppercase + letter-spacing treatment; that's gone now, the mark looks
identical everywhere it appears).
- **Font is Figtree, not Clash Display.** New `--font-wordmark` token,
  scoped to this component only — section headings still use
  `--font-display` (Clash Display). Loaded from the same Google Fonts
  `<link>` as Inter in `index.html` (one extra `family=` param, not a
  third font origin).
- **The "i" is "Nar" as real text + a hand-built stem (plain div) + an SVG
  curl**, not a masked font dot. A borrowed glyph (e.g. dotless "ı") was
  considered for the stem and rejected — it would inherit whatever the
  fallback/rendering engine does with an obscure Unicode point, where a
  plain div's width/height/radius are fully controllable and guaranteed
  consistent. The curl itself is a sampled logarithmic spiral (computed
  point-by-point, not hand-drawn bezier guesses — see the git history of
  `Logo.tsx` if you need to regenerate it at different proportions), tuned
  against real headless-Chromium screenshots at all three of its actual
  render sizes, not eyeballed at one size and assumed to scale.
- **Sizing/color are inherited, not props.** Nothing in `Logo.module.css`
  sets `font-size` or `color` — both are left to cascade from whatever
  wraps the component (nav's `.logo`, footer's `.footerLogo`, etc. only
  set those two properties). Passing a `className` or the `color` prop
  layers *on top of* that inheritance rather than fighting it — don't add
  a `font-family`/`font-weight` override at a call site, that belongs to
  the component, not the wrapper.

### Scroll-linked animation (`src/styles/useScrollReveal.ts`, Spike 2 Part D)
Replaces `whileInView` + `motionVariants.ts`'s `fadeUp`/`staggerChildren`
for any section on a long-scroll page (Features, ResultsPreview, CTA,
FAQ, About). Three hooks, all built on Motion's `useScroll`/`useTransform`
against a ref on the element itself:
- `useScrollReveal()` — opacity/y continuously derived from the target's
  own scroll position. Spread the returned `style` onto a `motion.*`
  element's `style` prop and its `ref` onto the same element.
- `useScrollParallax(strength)` — a slower/opposite-direction `y` drift
  for section imagery (Hero's cube wrapper, About's photo).
- `useScrollProgress()` — the raw 0-1 `MotionValue`, for driving something
  other than CSS (the Part F cube's rotation, read via `.get()` inside a
  `useFrame` loop).
- **Why not `whileInView`:** it's IntersectionObserver-triggered, which
  only fires an enter transition when the target crosses into view from
  outside. Content already inside the viewport at mount (a short page
  like About, or any section high enough to be pre-rendered in view on a
  tall monitor) never gets that transition and stays stuck at its
  `hidden` state — this was a real, shipped bug (About's whole page body
  invisible) before the Part D rebuild, not a hypothetical. `useScroll` +
  `useTransform` instead computes a value continuously from current
  scroll position — correct at any mount timing, and scrolling back up
  automatically reverses the reveal instead of needing separate exit
  handling (verified programmatically: opacity is a symmetric function of
  scroll position in both directions, not a one-shot latch).
- Each hook falls back to a static, fully-visible render (no style
  override at all) under `prefers-reduced-motion` — verified via
  Playwright's `reducedMotion: "reduce"` context, not just reading the
  code.
- Per-item reveals (Features' cards, FAQ's accordion rows) are extracted
  into their own small components (`FeatureCard`, `FaqAccordionItem`)
  that each call the hook once. Hooks can't run inside `.map()` — this is
  the pattern to copy for the next list that needs a per-item reveal, not
  a single hook call shared across an array.

### 3D cube (`src/components/Cube.tsx`, Spike 2 Part F — checkpoint, not final)
Built to a working checkpoint; confirm current go/no-go status in
PLAN.md's "Spike 2 / Part F" entry before assuming this is the shipped
state — the brief's own process calls for a human go/no-go here, not an
autonomous ship decision. Upgraded from the original 3-photo checkpoint to
5 photo faces + 1 Logo face + rim glow + magnetic hover + entrance
choreography — see PLAN.md's "Spike 2 continuation" entry for the full
list; this section covers the pieces worth knowing before touching the
file again.
- **Photo pool refreshed (Final Spike)** — 5 faces now come from
  `src/assets/photos/images/` (a 12-image drop, all clean stock
  photography this time — see DECISIONS.md's "Cube photo refresh"):
  `image3` (front), `image2` (left), `image9` (top), `image5` (right),
  `image11` (back). **(P4 of 4, Part B)**: right face changed from
  `image6` to `image5` — the brief's preferred replacement, `image11`,
  turned out to already be the back face (not "unused" as assumed), so
  the fallback was used instead and the discrepancy flagged rather than
  silently duplicating a face. `image5` cleared the same rights check as
  the rest of this pool (studio backdrop, no press/event indicators, no
  recognizable public figure). `image1` is reserved for the About page;
  `image4/6/7/8/10/12` are unused/available. The older `afro-pic-*` files
  in `src/assets/photos/` (not the `images/` subfolder) are no longer
  referenced by the cube or About page but weren't deleted — check before
  assuming they're dead if you see them elsewhere (e.g. Hero's fallback).
  **Still don't add new files from either location without checking them
  first** — two of the four photo drops so far (`afro-pic-4`, and the
  6-image `afro-pic-7`–`12` batch) turned out to be identifiable
  celebrities at real branded press events (paparazzi/red-carpet
  photography, not stock), a publicity-rights/copyright risk, not a style
  call. **Known gap**: none of the current 12 images include a man, though
  Nya's direction asked for a mix that does — flagged, not fixed. Still
  unresolved as of P4 of 4 (re-confirmed during the image6->image5 swap
  above) — worth prioritizing in the next photo drop. **Re-confirmed a
  third time in P5** (explicitly tasked with finding a man image for the
  cube): all 12 images in this pool reviewed individually, all 12 are
  women, no swap made — this needs a genuinely new photo drop, not
  another look at the existing pool.
- **Curl mark changed** (cube-only — `Logo.tsx`/the navbar-footer wordmark
  are untouched). `CURL_PATH_2D` is now a self-intersecting limaçon
  (`r = b + a·cos θ`, `a > b`) rather than the original tight logarithmic
  spiral — closer to Nya's "flipped ➰" direction, picked from 4 generated
  variants (see DECISIONS.md's "Cube curl mark"). `makeLogoFaceTexture`'s
  positioning also changed: the curl is now placed from its own bottom
  edge (`curlBottomLocal = Math.max(...CURL_PATH_2D.map(([, y]) => y))`,
  then offset by a proportional `clearanceGap = fontSize * 0.09`) instead
  of a blind center offset — the old formula could put the curl's lowest
  point *past* the stem's top for some shapes (confirmed true of the
  original spiral, ~12px of real overlap at the cube's actual size).
  **If you swap `CURL_PATH_2D` again**, the positioning formula doesn't
  need retuning — it derives the gap from whatever shape is there.
- **Every photo is center-cropped to square in code**
  (`cropToSquareTexture`), never stretched — source images are portrait,
  not square. Cover-fit math (scale by the larger of width/height ratios,
  let overflow clip against the canvas), same idea as CSS
  `background-size: cover`. Runs once per photo (baked into a canvas,
  not redone per frame).
- **The 6th face is the Logo mark**, canvas-drawn (`makeLogoFaceTexture`)
  as "Nar" text + a stem + the same curl polyline `Logo.tsx`'s SVG uses —
  not another gradient panel. Regenerates per theme (`useTheme()`) since a
  WebGL canvas texture can't read CSS custom properties itself.
- **Rim/edge glow** is a second mesh, not a shader: same geometry scaled
  up ~8% (`RoundedBoxGeometry(2.16,...)` vs. the base `2`), `THREE.BackSide`,
  additive blending, brand-gradient canvas texture, sharing the main
  cube's group/rotation. This is the standard "inverted hull" outline
  trick — the enlarged mesh's back faces are normally occluded by the main
  mesh's front faces via ordinary depth testing, so they're only visible
  in a thin silhouette band, which reads as a rim glow. Deliberately not a
  custom fresnel shader — much lower risk of a silent WebGL compile
  failure for the same visual result. Opacity is one of the two values
  computed in the single blended per-frame state (see below), not
  animated independently.
- **Architecture: one blended rotation + one blended scale per frame,
  computed once, applied once** — not four competing transforms. Hover is
  tracked in a ref (not React state) via `onPointerOver`/`onPointerOut` on
  the group, eased 0→1 each `useFrame` tick. That single eased value drives
  *two* things: it boosts the existing mouse-tilt's contribution to
  rotation (the "leans toward cursor" magnetic feel) and sets
  `group.scale`. If you add a 5th input later, blend it into these same
  two outputs rather than adding a third transform target.
- **Entrance** lives inside `Cube.tsx` itself (the `<Canvas>` wrapper is a
  `motion.div`, opacity/y/scale animating in on mount), composing with —
  not replacing — Hero's existing `clipReveal` wipe on the outer `.art`
  wrapper. Respects `prefers-reduced-motion` (jumps straight to the final
  state).
- **Lazy-loaded from `Hero.tsx`** (`React.lazy` + `Suspense`, fallback is
  an empty `div` sized via `Cube.module.css`'s `.canvasWrap` so there's no
  layout shift). three.js + fiber + drei add ~230kB gzipped — isolating
  that into its own chunk keeps it off the landing page's critical
  first-paint path, but it's still a real, substantial download for
  anyone who lands on `/`, since the cube is above the fold. If Lighthouse
  Performance regresses noticeably from the Milestone 6 baseline (94),
  start here.
- **Geometry is `three-stdlib`'s `RoundedBoxGeometry`** (via
  `new RoundedBoxGeometry(...)`, not drei's `<RoundedBox>` component).
  `RoundedBoxGeometry extends THREE.BoxGeometry` and only rewrites vertex
  positions, so it keeps `BoxGeometry`'s 6 per-face material groups —
  confirmed by reading the source before relying on it. Drei's
  `<RoundedBox>` builds an `ExtrudeGeometry` from a 2D rounded-rect shape
  instead, which does not have 6 discrete face groups — it cannot take 6
  independent face textures. If a future change swaps the geometry, check
  for `groups`/face-group support before assuming a drop-in replacement
  works with the 6-material-array pattern used here.
- **Materials are a plain 6-element array** (`material={[...]}` on the
  `<mesh>`), matching `BoxGeometry`'s fixed face order (+x, -x, +y, -y,
  +z, -z) — not `attach="material-N"` JSX children. Either works in
  principle; the array was chosen to avoid depending on `attach`'s string-
  parsing convention for something this order-sensitive.
- **Rotation combines three additive sources** each frame in `useFrame`:
  idle (from `useScrollProgress`, same hook Part D uses — one shared
  scroll-linked system, not a separate bespoke one for the 3D scene),
  mouse tilt (gated to `(hover:hover) and (pointer:fine)`, same convention
  as `GradientRibbon`'s mouse glow), and a drag offset. The idle rotation
  formula's constants are tuned against the cube's *actual* rest-state
  scroll progress (~0.45, measured directly — the cube sits within the
  fold, so `useScrollProgress`'s 0-1 range is already partway elapsed at
  scroll position 0, it does not start at 0), not against a naive
  progress=0 assumption.
- **Drag decay is delta-time-based** (`Math.pow(base, delta)`, `delta` =
  real seconds since last frame from `useFrame`), not a flat per-frame
  multiplier (`offset *= 0.94`). The flat version only decays at its
  intended rate if frames are actually landing at ~60fps — measured
  empirically that they weren't in this sandbox (~8-12fps), so a flat
  multiplier barely decayed at all over several real seconds. The
  `Math.pow` form reaches the same real-world decay regardless of actual
  frame rate. If drag-release ever looks like it "sticks" instead of
  easing back, check for a flat multiplier having crept back in before
  assuming it's a browser/hardware issue.
- The one non-photo face (bottom) is a canvas-generated texture
  (`CanvasTexture`, not CSS — WebGL materials need real texture data)
  redrawing the Logo's "Nar" + stem + curl-mark path from the same point
  array `Logo.tsx` uses for its SVG curl, rather than duplicating the
  spiral math. See the updated bullet list above (Spike 2 continuation)
  for the other 5 faces, rim glow, magnetic hover, and entrance — this
  was originally 3 photo + 3 gradient faces and has since changed.

### About page opening sentence (Final Spike, P4 of 4, Part C)
`About.tsx`'s first body paragraph is now exactly: "We recommend
products, help you understand your unique hair characteristics, and
tailor support towards your biggest frustrations and goals!" — a verbatim
CEO-provided replacement, no other About page copy touched in this pass.

### Home page sample result (`src/components/SampleResultCard.tsx` +
`ResultsPreview.tsx`, Final Spike, P4 of 4, Part E; widened in P5, Part A)
The landing page's "Sample result" section (in the `ResultsPreview`
section, just above the waitlist form) shows **two static mocks of real
recommendation cards side by side** — `SampleResultCard.tsx` exports two
named real-catalog products, `PATTERN_LEAVE_IN` (Pattern Beauty, $29,
Leave-in) and `OUIDAD_CREAM` (Ouidad, $26, Cream), each with its own
plausible, honestly-mixed ✓/✗ checklist and deliberately *not* the same
mix on both cards (3✓/1✗ and 2✓/2✗) — a uniform four-checkmarks-on-every-
card would read as invented rather than a real recommendation set. This
replaced P4's original single-card version, which itself replaced an even
older mock with a fake "3C" curl-pattern label and no match indicators at
all — see DECISIONS.md's "P5 — Sample Result Card Sizing" for the sizing
rationale (fill with more real content at native size, not one card
stretched past its designed scale) and the static-vs-live-fetch call
(static wins — this section is above/near the fold, and a live
`/api/products` call there would put Airtable/network latency on the
critical path for content that's illustrative, not functional).
- **`SampleResultCard.tsx`** takes a `product` prop
  (`SampleProductData` — category/name/brand/price/checklist), defaulting
  to `PATTERN_LEAVE_IN`, so both cards render through the exact same
  component. Its `.module.css` deliberately duplicates
  `ScanResults.module.css`'s `.productCard`/`.checklist*`/etc. rules
  verbatim (same tokens, same values) rather than importing across the
  component/page boundary — "reuse existing ProductCard conventions"
  means visually identical, not a shared CSS module coupling an unrelated
  marketing component to a results-page stylesheet.
- **Frame**: `ResultsPreview.module.css`'s `.spotlightFrame`
  (`max-width: 620px` as of P5, was `360px` for one card) /
  `.ribbonBadge` — a soft `color-mix()`-tinted panel with a gradient-
  filled ribbon badge (`--gradient-accent-solid`, the same fill every
  other button/pill on the site uses) — plus a new `.twoCol` grid
  (stacks to one column under 480px) holding the two cards. The frame/
  badge treatment itself was picked by the CEO in P4 from 3 options
  (direct card / context-strip / spotlight frame); the two-card layout
  was picked in P5 from 3 sizing options (two cards / product+style /
  product+category-tabs) — both rounds screenshotted at desktop+mobile ×
  light+dark and sent for approval before implementation. See
  DECISIONS.md's "Final Spike — P4 of 4" and "P5 — Sample Result Card
  Sizing" sections for the other options and full reasoning each round.
- **Mockup process (P5)**: when generating visual options for user
  review on this project, save PNGs to a real `/mockups` folder in the
  repo with predictable filenames AND push them through the chat's file-
  send mechanism — don't rely on chat delivery alone (it failed silently
  from the user's side once mid-pass; the `/mockups` files were the
  fallback). Delete `/mockups` and any temporary harness once a variant
  is chosen and implemented.
- Static only — no interactivity, no live scoring call. Don't wire this
  to `getRecommendations()` or make it clickable; it's marketing, not a
  functional preview.
- **Lighthouse in this sandbox**: a single throttled Lighthouse run can
  swing wildly (seen: 44 on one run of an unchanged-in-substance page)
  purely from host CPU contention — Lighthouse's default throttling
  multiplier assumes real, uncontended hardware. Don't trust one number;
  either run `--throttling-method=provided` for a real-hardware read, or
  run several throttled passes before/after and compare distributions.
  See DECISIONS.md's "P5" section for the full methodology.
