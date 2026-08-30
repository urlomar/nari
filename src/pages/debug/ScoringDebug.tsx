import { Fragment, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getProducts } from "@/lib/dataSource";
import type { Product } from "@/lib/products/schema";
import {
  deriveCategories,
  SCORING_WEIGHTS,
  debugHardFilterExclusions,
  debugScoreCategory,
  type DebugCategoryRow,
  type DiagnosticAnswers,
  type ScoreBreakdown,
} from "@/lib/products/scoring";
import NotFound from "@/pages/NotFound";
import s from "@/styles/ScoringDebug.module.css";

/**
 * Production-accessible, key-gated instrument for answering "why did
 * product #1 rank above product #2?" without reading code — see CLAUDE.md's
 * "Scoring debug view" and DECISIONS.md for the full writeup, including why
 * this is gated via api/debug-scoring.ts's server-side key check rather
 * than a client-bundled secret.
 */

type AuthState = "checking" | "authorized" | "denied";
type CatalogState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; products: Product[] };

const DIMENSION_COLUMNS: Array<{ key: keyof ScoreBreakdown; label: string }> = [
  { key: "porosity", label: "Porosity" },
  { key: "curlType", label: "Curl type" },
  { key: "goals", label: "Goals" },
  { key: "frustrations", label: "Frustr." },
  { key: "density", label: "Density" },
  { key: "budget", label: "Budget" },
  { key: "blackOwned", label: "Blk-owned" },
  { key: "tiebreakers", label: "Tiebreak" },
];

const BASE_ANSWERS: DiagnosticAnswers = {
  porosity: "unsure",
  curlType: "",
  sensitivities: ["none"],
  goals: [],
  frustrations: [],
  density: "medium",
  budgetMax: null,
  blackOwnedPref: "no_pref",
  journey: "debug",
};

// Verified against the checked-in catalog fixture (see DECISIONS.md — the
// fixture is a real, if slightly stale, Airtable snapshot) before picking
// these specific values, not guessed: "2c3a" genuinely triggers relaxation
// on every category (no 2A/2B/2C tags exist in the catalog), "4a" genuinely
// doesn't relax anything, and the Demanding profile genuinely returns 0
// picks for Mousse/Oil-Sealant (see DECISIONS.md's "Open questions").
const BUILT_IN_PROFILES: Record<string, { label: string; answers: DiagnosticAnswers }> = {
  demanding: {
    label: "Demanding — 4C, high porosity, protein-sensitive, under $10, thick/high-density",
    answers: {
      ...BASE_ANSWERS,
      porosity: "high",
      curlType: "4c",
      sensitivities: ["protein"],
      goals: ["moisture", "definition"],
      frustrations: ["breakage", "dryness"],
      density: "thick_high",
      budgetMax: 10,
    },
  },
  relaxation: {
    label: "2C/3A — triggers curl-type relaxation (catalog has no 2A/2B/2C tags yet)",
    answers: {
      ...BASE_ANSWERS,
      porosity: "normal",
      curlType: "2c3a",
      goals: ["moisture", "definition"],
      density: "medium",
    },
  },
  easy: {
    label: "Easy — 4A, normal porosity, no sensitivities, no budget cap (no relaxation)",
    answers: {
      ...BASE_ANSWERS,
      porosity: "normal",
      curlType: "4a",
      goals: ["definition", "frizz"],
      frustrations: ["frizz"],
      density: "medium",
    },
  },
  blackOwnedPref: {
    label: "Black-owned-always — 4B, low porosity, fine/low-density, mid budget",
    answers: {
      ...BASE_ANSWERS,
      porosity: "low",
      curlType: "4b",
      goals: ["growth", "scalp"],
      density: "fine_low",
      budgetMax: 25,
      blackOwnedPref: "yes",
    },
  },
};

const OVERRIDE_KEYS = [
  "porosity",
  "curlType",
  "sensitivities",
  "goals",
  "frustrations",
  "density",
  "budgetMax",
  "blackOwnedPref",
  "journey",
] as const;

function csv(searchParams: URLSearchParams, name: string): string[] | undefined {
  const raw = searchParams.get(name);
  if (raw === null) return undefined;
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function applyOverrides(searchParams: URLSearchParams, base: DiagnosticAnswers): DiagnosticAnswers {
  const answers: DiagnosticAnswers = { ...base };

  const porosity = searchParams.get("porosity");
  if (porosity) answers.porosity = porosity as DiagnosticAnswers["porosity"];

  const curlType = searchParams.get("curlType");
  if (curlType !== null) answers.curlType = curlType;

  const sensitivities = csv(searchParams, "sensitivities");
  if (sensitivities) answers.sensitivities = sensitivities as DiagnosticAnswers["sensitivities"];

  const goals = csv(searchParams, "goals");
  if (goals) answers.goals = goals as DiagnosticAnswers["goals"];

  const frustrations = csv(searchParams, "frustrations");
  if (frustrations) answers.frustrations = frustrations as DiagnosticAnswers["frustrations"];

  const density = searchParams.get("density");
  if (density) answers.density = density as DiagnosticAnswers["density"];

  const budgetMaxRaw = searchParams.get("budgetMax");
  if (budgetMaxRaw !== null) answers.budgetMax = budgetMaxRaw === "none" ? null : Number(budgetMaxRaw);

  const blackOwnedPref = searchParams.get("blackOwnedPref");
  if (blackOwnedPref) answers.blackOwnedPref = blackOwnedPref as DiagnosticAnswers["blackOwnedPref"];

  const journey = searchParams.get("journey");
  if (journey !== null) answers.journey = journey;

  return answers;
}

interface ResolvedProfile {
  key: string;
  label: string;
  answers: DiagnosticAnswers;
}

/**
 * `?profile=<name>` alone shows just that one built-in. Any individual
 * field override (`?curlType=4c&budgetMax=10`, etc.) — with or without
 * `profile` as a starting point — also narrows to a single, ad hoc profile
 * so a specific case can be checked in isolation. With no query params at
 * all, all four built-ins render side by side.
 */
function resolveProfiles(searchParams: URLSearchParams): ResolvedProfile[] {
  const profileParam = searchParams.get("profile");
  const hasFieldOverride = OVERRIDE_KEYS.some((k) => searchParams.has(k));
  const builtIn = profileParam ? BUILT_IN_PROFILES[profileParam] : undefined;

  if (profileParam || hasFieldOverride) {
    const base = builtIn?.answers ?? BASE_ANSWERS;
    const answers = applyOverrides(searchParams, base);
    const label = builtIn
      ? `${builtIn.label} (overridden via query params)`
      : "Custom profile (from query params)";
    return [{ key: "custom", label, answers }];
  }

  return Object.entries(BUILT_IN_PROFILES).map(([key, p]) => ({ key, ...p }));
}

function biggestGap(a: ScoreBreakdown, b: ScoreBreakdown): { key: keyof ScoreBreakdown; diff: number } {
  let best: { key: keyof ScoreBreakdown; diff: number } = { key: "porosity", diff: 0 };
  for (const col of DIMENSION_COLUMNS) {
    const diff = a[col.key] - b[col.key];
    if (Math.abs(diff) > Math.abs(best.diff)) best = { key: col.key, diff };
  }
  return best;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export default function ScoringDebug() {
  const [searchParams] = useSearchParams();
  const key = searchParams.get("key");
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [catalogState, setCatalogState] = useState<CatalogState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/debug-scoring?key=${encodeURIComponent(key ?? "")}`)
      .then(async (res) => {
        if (cancelled) return;
        // Checks the actual body, not just res.ok — a 200 with the wrong
        // shape (e.g. a dev server or proxy that falls back to serving
        // index.html for an unrecognized path, rather than the real
        // gated function) must fail closed, not be treated as authorized.
        if (!res.ok) {
          setAuthState("denied");
          return;
        }
        try {
          const data = await res.json();
          setAuthState(data?.ok === true ? "authorized" : "denied");
        } catch {
          setAuthState("denied");
        }
      })
      .catch(() => {
        if (!cancelled) setAuthState("denied");
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    if (authState !== "authorized") return;
    let cancelled = false;
    getProducts()
      .then((res) => {
        if (!cancelled) setCatalogState({ status: "ready", products: res.products });
      })
      .catch((err) => {
        if (!cancelled) {
          setCatalogState({ status: "error", message: err instanceof Error ? err.message : String(err) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authState]);

  // Render nothing while the key check is in flight, rather than flashing
  // NotFound (wrong for an authorized visitor) or the tool (wrong for an
  // unauthorized one) first.
  if (authState === "checking") return null;
  if (authState === "denied") return <NotFound />;

  const profiles = resolveProfiles(searchParams);

  return (
    <div className={s.page}>
      <h1 className={s.title}>Scoring debug</h1>
      <p className={s.note}>
        Internal instrument, not linked anywhere in the app — see CLAUDE.md&rsquo;s &ldquo;Scoring debug view&rdquo;
        for how to override profiles via query params.
      </p>

      <section className={s.section}>
        <h2 className={s.sectionTitle}>Current SCORING_WEIGHTS</h2>
        <table className={s.table}>
          <tbody>
            {Object.entries(SCORING_WEIGHTS).map(([k, v]) => (
              <tr key={k}>
                <td className={s.weightKey}>{k}</td>
                <td className={s.num}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {catalogState.status === "loading" && <p className={s.note}>Loading catalog…</p>}
      {catalogState.status === "error" && (
        <p className={s.errorNote}>Failed to load catalog: {catalogState.message}</p>
      )}

      {catalogState.status === "ready" &&
        profiles.map((profile) => (
          <ProfileSection key={profile.key} profile={profile} catalog={catalogState.products} />
        ))}
    </div>
  );
}

function ProfileSection({ profile, catalog }: { profile: ResolvedProfile; catalog: Product[] }) {
  const { answers } = profile;
  const exclusions = debugHardFilterExclusions(catalog, answers.sensitivities);

  return (
    <section className={s.profileSection}>
      <h2 className={s.profileTitle}>{profile.label}</h2>
      <table className={s.table}>
        <tbody>
          <tr>
            <td className={s.weightKey}>porosity</td>
            <td>{answers.porosity}</td>
            <td className={s.weightKey}>curlType</td>
            <td>{answers.curlType || "(none)"}</td>
          </tr>
          <tr>
            <td className={s.weightKey}>density</td>
            <td>{answers.density}</td>
            <td className={s.weightKey}>budgetMax</td>
            <td>{answers.budgetMax === null ? "no cap" : `$${answers.budgetMax}`}</td>
          </tr>
          <tr>
            <td className={s.weightKey}>sensitivities</td>
            <td>{answers.sensitivities.join(", ") || "none"}</td>
            <td className={s.weightKey}>blackOwnedPref</td>
            <td>{answers.blackOwnedPref}</td>
          </tr>
          <tr>
            <td className={s.weightKey}>goals</td>
            <td>{answers.goals.join(", ") || "(none)"}</td>
            <td className={s.weightKey}>frustrations</td>
            <td>{answers.frustrations.join(" > ") || "(none)"}</td>
          </tr>
        </tbody>
      </table>

      {exclusions.length > 0 && (
        <div className={s.exclusions}>
          <h3 className={s.subTitle}>Excluded by hard filters ({exclusions.length})</h3>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Category</th>
                <th>Brand</th>
                <th>Product</th>
                <th>Failed on</th>
              </tr>
            </thead>
            <tbody>
              {exclusions.map(({ product, failedSensitivities }) => (
                <tr key={product.id}>
                  <td>{product.category}</td>
                  <td>{product.brand}</td>
                  <td>{product.name}</td>
                  <td className={s.excludedReason}>{failedSensitivities.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deriveCategories(catalog).map((category) => (
        <CategoryTable key={category} category={category} catalog={catalog} answers={answers} />
      ))}
    </section>
  );
}

function CategoryTable({
  category,
  catalog,
  answers,
}: {
  category: string;
  catalog: Product[];
  answers: DiagnosticAnswers;
}) {
  const detail = debugScoreCategory(category, catalog, answers);

  return (
    <div className={s.categoryBlock}>
      <h3 className={s.subTitle}>
        {category}
        {detail.relaxed && (
          <span className={s.relaxedTag}>relaxed: dropped {detail.relaxedConstraints.join(" → ")}</span>
        )}
      </h3>

      {detail.eligible.length === 0 ? (
        <p className={s.note}>No eligible products in this category for this profile.</p>
      ) : (
        <table className={s.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Picked</th>
              <th>Brand</th>
              <th>Product</th>
              {DIMENSION_COLUMNS.map((col) => (
                <th key={col.key} className={s.num}>
                  {col.label}
                </th>
              ))}
              <th className={s.num}>Total</th>
            </tr>
          </thead>
          <tbody>
            {detail.eligible.map((row, i) => {
              const next: DebugCategoryRow | undefined = detail.eligible[i + 1];
              const gap = next ? biggestGap(row.breakdown, next.breakdown) : null;
              return (
                <Fragment key={row.product.id}>
                  <tr className={row.picked ? s.pickedRow : undefined}>
                    <td>{i + 1}</td>
                    <td>{row.picked ? "✓" : ""}</td>
                    <td>{row.product.brand}</td>
                    <td>{row.product.name}</td>
                    {DIMENSION_COLUMNS.map((col) => (
                      <td
                        key={col.key}
                        className={`${s.num} ${gap && gap.key === col.key ? s.decisiveCell : ""}`}
                      >
                        {fmt(row.breakdown[col.key])}
                      </td>
                    ))}
                    <td className={`${s.num} ${s.totalCell}`}>{fmt(row.breakdown.total)}</td>
                  </tr>
                  {gap && (
                    <tr className={s.gapRow}>
                      <td colSpan={5 + DIMENSION_COLUMNS.length}>
                        Biggest gap vs #{i + 2}: <strong>{DIMENSION_COLUMNS.find((c) => c.key === gap.key)?.label}</strong>{" "}
                        ({gap.diff >= 0 ? "+" : ""}
                        {fmt(gap.diff)})
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
