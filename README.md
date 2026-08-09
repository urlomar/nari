# nari
AI Haircare Startup for individuals with curly, coily, and afro-textured hair

## Product recommendation pipeline

Nari recommends products from Nya's Airtable catalog using deterministic
tag matching, not an LLM call — see `DECISIONS.md` for why. The pipeline,
end to end:

1. **Airtable → normalized catalog.** `api/products.ts` (a Vercel
   serverless function) fetches Nya's product base, paginating past
   Airtable's 100-record page cap. `api/_lib/fieldMap.ts` maps her
   human-edited column names to internal property names, and
   `api/_lib/schema.ts` validates/coerces each row (checkboxes → booleans,
   tags lowercased and trimmed, missing prices as `null` not `0`) into a
   typed `Product`. Invalid rows are logged and skipped, never allowed to
   crash the endpoint. Results are cached in-memory (~10 min) and served
   stale on a failed refetch, so a brief Airtable outage doesn't break the
   app. The client reaches this only through `src/lib/dataSource.ts`'s
   `getProducts()` — nothing else calls `/api/products` directly.
2. **Filter.** `src/lib/products/scoring.ts`'s `scoreProducts()` first
   removes any product that doesn't positively match a reported
   sensitivity (protein, sulfates, silicones, fragrance) — an exclusion,
   not a lowered score, and conservative about it: an unchecked box
   (unverified or actually-contains-it, Airtable can't tell which) is
   treated as unsafe either way.
3. **Score.** Every surviving product gets a weighted score across
   porosity, curl type, goals, ranked frustrations, density, budget, and
   a black-owned preference, plus small EWG/community-sentiment
   tiebreakers — heaviest dimensions first. All weights live in one
   place (`SCORING_WEIGHTS`) for easy tuning.
4. **Top picks per category.** The best-scoring 2-3 products per category
   (Shampoo, Conditioner, Leave-in, Cream, Mousse, Oil/Sealant), capped at
   one product per brand unless there's no alternative, with a relaxation
   fallback (drop the weakest requirement first) when a category's pool
   is too thin — labeled honestly in the result, not silently backfilled.

See `CLAUDE.md`'s "Product Data Pipeline" and "Product Scoring" sections
for the full implementation details, and `DECISIONS.md` for the reasoning
behind the major calls (why deterministic scoring, why porosity is
weighted heaviest, why sensitivities are hard filters, etc.) and the list
of open questions to raise with Nya.
