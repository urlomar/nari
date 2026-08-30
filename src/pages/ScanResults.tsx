import { useState } from "react";
import { motion } from "motion/react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type {
  CategoryRecommendation,
  DiagnosticAnswers,
  MatchChecklistItem,
  RecommendedProduct,
  RecommendedStyle,
  ScoredRecommendationSet,
  SensitivityAnswer,
} from "@/lib/products/scoring";
import { buildMatchChecklist } from "@/lib/products/scoring";
import { getOptionLabel } from "@/features/scanner/quiz/quizLabels";
import { useSendResults, type SendResultsPayload } from "@/lib/useSendResults";
import { track } from "@/lib/analytics";
import { fadeUp, staggerChildren } from "@/styles/motionVariants";
import s from "@/styles/ScanResults.module.css";

interface ScanResultsLocationState {
  recommendations?: ScoredRecommendationSet;
  /**
   * Optional for backward compatibility (an older cached history entry from
   * before this field existed) — the checklist and "loosen your filters"
   * banner degrade gracefully rather than crash if it's ever missing.
   */
  answers?: DiagnosticAnswers;
}

function joinWithAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

const RELAXED_DIMENSION_LABELS: Record<CategoryRecommendation["relaxedConstraints"][number], string> = {
  density: "density",
  curlType: "curl type",
  porosity: "porosity",
};

/** Edge case #2 — a relaxed category must say what was dropped, not silently backfill. */
function relaxedMessage(constraints: CategoryRecommendation["relaxedConstraints"]): string {
  const labels = constraints.map((c) => RELAXED_DIMENSION_LABELS[c]);
  return `Closest match — no products tagged for your ${joinWithAnd(labels)} yet.`;
}

/**
 * The "cheap version" of match reasons: humanizes scoring.ts's raw
 * matchReasons strings (e.g. "porosity: high", "goal: moisture") into
 * plain language, reusing the quiz's own option labels so "goal: frizz"
 * reads as "your frizz control goal" rather than the raw catalog tag.
 * Spike B may deepen this with notes/keyIngredients — this stays
 * additive to that, not a rewrite (see DECISIONS.md).
 */
function humanizeMatchReason(reason: string): string | null {
  const porosity = reason.match(/^porosity: (.+)$/);
  if (porosity) return `your ${porosity[1]} porosity`;

  if (reason.startsWith("curl type:")) return "your curl type";

  const goal = reason.match(/^goal: (.+)$/);
  if (goal) return `your ${getOptionLabel("goals", goal[1]).toLowerCase()} goal`;

  const frustration = reason.match(/^frustration #(\d+): (.+)$/);
  if (frustration) {
    const rank = frustration[1];
    const label = getOptionLabel("frustrations", frustration[2]).toLowerCase();
    return rank === "1" ? `your top frustration (${label})` : `your #${rank} frustration (${label})`;
  }

  if (reason.startsWith("density:")) return "your density";
  if (reason.startsWith("within budget")) return "your budget";
  if (reason === "black-owned brand") return "being Black-owned";

  return null;
}

function buildWhyText(reasons: string[]): string {
  const parts = reasons.map(humanizeMatchReason).filter((p): p is string => Boolean(p));
  if (parts.length === 0) return "A solid pick for your routine.";
  return `Matches ${joinWithAnd(parts)}.`;
}

/**
 * Plain-language match line for a style card (Final Spike, P3 of 4, Part
 * C), e.g. "Matches your moisture goal and helps with dryness and frizz."
 * Draws on the same raw `matchReasons` scoring.ts's scoreStyle already
 * computes (goals and frustrations only — styles have no porosity/curl
 * type/budget/black-owned data), reusing `getOptionLabel` the same way
 * `humanizeMatchReason` does for products, but phrased as one sentence
 * rather than a bag of parts — a style card has only two dimensions to
 * report, not five, so it doesn't need that function's generality.
 */
function buildStyleMatchLine(matchReasons: string[]): string {
  const goalLabels = matchReasons
    .map((r) => r.match(/^goal: (.+)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => getOptionLabel("goals", m[1]).toLowerCase());

  const frustrationLabels = matchReasons
    .map((r) => r.match(/^frustration #\d+: (.+)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => getOptionLabel("frustrations", m[1]).toLowerCase());

  const goalPart =
    goalLabels.length > 0 ? `your ${joinWithAnd(goalLabels)} ${goalLabels.length > 1 ? "goals" : "goal"}` : null;
  const frustrationPart = frustrationLabels.length > 0 ? `helps with ${joinWithAnd(frustrationLabels)}` : null;

  if (goalPart && frustrationPart) return `Matches ${goalPart} and ${frustrationPart}.`;
  if (goalPart) return `Matches ${goalPart}.`;
  if (frustrationPart) return `A style that ${frustrationPart}.`;
  return "A style worth trying as part of your routine.";
}

function unenforcedSensitivityLabel(sensitivity: SensitivityAnswer): string {
  return getOptionLabel("sensitivities", sensitivity).toLowerCase();
}

const SENSITIVITY_FREE_LABEL: Partial<Record<SensitivityAnswer, string>> = {
  protein: "protein-free",
  sulfates: "sulfate-free",
  silicones: "silicone-free",
  fragrance: "fragrance-free",
  mineral_oil: "mineral-oil-free",
};

/** Short, plain-language label for one checklist row — see buildMatchChecklist's brief for the "why" behind each phrasing. */
function formatChecklistLabel(item: MatchChecklistItem): string {
  switch (item.key) {
    case "porosity":
      return item.matched ? "your porosity" : "not your porosity";
    case "curlType":
      return item.matched ? "your curl type" : "not your curl type";
    case "sensitivities":
      return joinWithAnd(item.values.map((v) => SENSITIVITY_FREE_LABEL[v] ?? `${v}-free`));
    case "budget":
      return item.matched ? "in your budget" : "over your budget";
    case "blackOwned":
      return item.matched ? "Black-owned" : "not Black-owned";
  }
}

/** Plain-text match line for the results email, e.g. "✓ your porosity · ✗ not Black-owned" — same checklist data and labels as the on-screen list, just joined into one line instead of rendered as separate items. */
function buildMatchLine(checklist: MatchChecklistItem[]): string {
  const ordered = [...checklist].sort((a, b) => Number(b.matched) - Number(a.matched));
  return ordered.map((item) => `${item.matched ? "✓" : "✗"} ${formatChecklistLabel(item)}`).join(" · ");
}

/**
 * Builds api/send-results.ts's request body from data already on screen.
 * Deliberately sends a display-shaped projection (name/brand/price/buyLink
 * + a precomputed matchLine), not the full Product/ScoredRecommendationSet
 * — the endpoint never re-derives a match verdict itself, so the email can
 * never show a different checkmark than what the user is looking at right
 * now. See api/_lib/resultsSchema.ts.
 */
function buildSendResultsPayload(
  recommendations: ScoredRecommendationSet,
  answers: DiagnosticAnswers,
  email: string
): SendResultsPayload {
  return {
    email,
    curlType: answers.curlType,
    porosity: answers.porosity,
    recommendations: {
      categories: recommendations.categories.map((category) => ({
        category: category.category,
        relaxed: category.relaxed,
        relaxedConstraints: category.relaxedConstraints,
        picks: category.picks.map((pick) => ({
          name: pick.product.name,
          brand: pick.product.brand ?? "",
          price: pick.product.price,
          buyLink: pick.product.buyLink || undefined,
          matchLine: buildMatchLine(buildMatchChecklist(pick.product, answers, recommendations.unenforcedSensitivities)),
        })),
      })),
    },
  };
}

function slugify(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, "-");
}

function formatPrice(price: number): string {
  return Number.isInteger(price) ? `$${price}` : `$${price.toFixed(2)}`;
}

/** The most beautiful, screenshot-worthy screen in the app. */
export default function ScanResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ScanResultsLocationState | null;
  const recommendations = state?.recommendations;

  if (!recommendations) {
    return (
      <div className={s.notFoundScreen}>
        <div className={s.card}>
          <p className={s.body}>We couldn&rsquo;t find your scan results — let&rsquo;s start a new scan.</p>
          <div className={s.footerActions}>
            <button type="button" className={s.primaryButton} onClick={() => navigate("/scan", { replace: true })}>
              Start a scan
            </button>
            <Link to="/" className={s.secondaryLink}>
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScanResultsContent
      recommendations={recommendations}
      answers={state?.answers}
      onScanAgain={() => navigate("/scan")}
    />
  );
}

function ScanResultsContent({
  recommendations,
  answers,
  onScanAgain,
}: {
  recommendations: ScoredRecommendationSet;
  answers?: DiagnosticAnswers;
  onScanAgain: () => void;
}) {
  // First tab open by default, per the brief.
  const [activeCategory, setActiveCategory] = useState(recommendations.categories[0]?.category ?? "");
  const active =
    recommendations.categories.find((c) => c.category === activeCategory) ?? recommendations.categories[0];
  const allEmpty = recommendations.categories.every((c) => c.picks.length === 0);

  return (
    <div className={s.screen}>
      <motion.div className={s.card} initial="hidden" animate="visible" variants={staggerChildren}>
        <motion.div variants={fadeUp}>
          <p className={s.eyebrow}>Your recommendations</p>
          <h1 className={s.heading}>Built for your hair</h1>
          <p className={s.body}>Based on your diagnostic, here&rsquo;s a routine you can try tomorrow.</p>
        </motion.div>

        {/* Every category came back empty — over-narrow filters, not a bug.
            A distinct, prominent banner rather than six copies of the same
            per-category "no matches" line. */}
        {allEmpty && (
          <motion.div className={s.emptyAllBanner} role="alert" variants={fadeUp}>
            <p>
              Your filters are very specific, so we don&rsquo;t have a match yet in any category. Try loosening your
              sensitivities or budget — or scan again with different answers.
            </p>
            <button type="button" className={s.secondaryButton} onClick={onScanAgain}>
              Scan again
            </button>
          </motion.div>
        )}

        {/* Edge case #4 — never claim a filter ran that didn't. */}
        {recommendations.unenforcedSensitivities.length > 0 && (
          <motion.p className={s.unenforcedBanner} role="note" variants={fadeUp}>
            Heads up: we can&rsquo;t verify{" "}
            {joinWithAnd(recommendations.unenforcedSensitivities.map(unenforcedSensitivityLabel))} in our catalog
            yet, so that filter isn&rsquo;t applied to these results.
          </motion.p>
        )}

        <motion.div className={s.tabList} role="tablist" aria-label="Product categories" variants={fadeUp}>
          {recommendations.categories.map((category) => {
            const isActive = category.category === active?.category;
            return (
              <button
                key={category.category}
                type="button"
                role="tab"
                id={`tab-${slugify(category.category)}`}
                aria-selected={isActive}
                aria-controls={`panel-${slugify(category.category)}`}
                className={`${s.tab} ${isActive ? s.tabActive : ""}`}
                onClick={() => setActiveCategory(category.category)}
              >
                {category.category}
                <span className={s.tabBadge}>{category.picks.length}</span>
              </button>
            );
          })}
        </motion.div>

        {active && (
          <motion.div
            key={active.category}
            role="tabpanel"
            id={`panel-${slugify(active.category)}`}
            aria-labelledby={`tab-${slugify(active.category)}`}
            className={s.tabPanel}
            variants={fadeUp}
          >
            {/* Edge case #2 — only meaningful when there's actually a match to label; an empty
                category already says so itself below, and pairing both reads as self-contradictory. */}
            {active.relaxed && active.picks.length > 0 && (
              <p className={s.relaxedBanner}>{relaxedMessage(active.relaxedConstraints)}</p>
            )}

            {/* Edge case #1 — keep the tab, don't hide it, just say so honestly. */}
            {active.picks.length === 0 ? (
              <p className={s.emptyCategory}>No matches in this category yet — we&rsquo;re adding products.</p>
            ) : (
              <ul className={s.productGrid}>
                {active.picks.map((pick) => (
                  <ProductCard
                    key={pick.product.id}
                    pick={pick}
                    answers={answers}
                    unenforcedSensitivities={recommendations.unenforcedSensitivities}
                  />
                ))}
              </ul>
            )}
          </motion.div>
        )}

        {/* Below the product tabs, not another tab and not above the products —
            products remain the main event, styles are a complementary addition. */}
        <StylesStrip styles={recommendations.styles ?? []} />

        <motion.p className={s.privacyLine} variants={fadeUp}>
          Your answers are used only to build these recommendations — never stored or shared.
        </motion.p>

        {/* Edge case #5 — offered after results, never gating them. */}
        <motion.div variants={fadeUp}>
          <SendResultsCapture recommendations={recommendations} answers={answers} />
        </motion.div>

        <motion.div className={s.footerActions} variants={fadeUp}>
          <button type="button" className={s.secondaryButton} onClick={onScanAgain}>
            Scan again
          </button>
          <Link to="/" className={s.secondaryLink}>
            Back to home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

function ProductCard({
  pick,
  answers,
  unenforcedSensitivities,
}: {
  pick: RecommendedProduct;
  answers?: DiagnosticAnswers;
  unenforcedSensitivities: SensitivityAnswer[];
}) {
  const { product } = pick;
  const [whyOpen, setWhyOpen] = useState(false);

  // Backward-compat only (see ScanResultsLocationState) — in normal use
  // `answers` always rides along from ScannerRoute.
  const checklist = answers ? buildMatchChecklist(product, answers, unenforcedSensitivities) : [];
  // Matches first so a card with one or two honest X's still reads as a
  // good recommendation at a glance, not a wall of red (per the brief).
  const orderedChecklist = [...checklist].sort((a, b) => Number(b.matched) - Number(a.matched));

  return (
    <li className={s.productCard}>
      {product.imageUrl && <img src={product.imageUrl} alt="" className={s.productImage} />}

      <span className={s.categoryBadge}>{product.category}</span>
      <h3 className={s.productName}>{product.name}</h3>
      <p className={s.productBrand}>{product.brand}</p>

      {/* Edge case #3 — omit entirely for null-priced products, never "$0"/"null". */}
      {product.price !== null && <p className={s.productPrice}>{formatPrice(product.price)}</p>}

      {orderedChecklist.length > 0 && (
        <ul className={s.checklist} aria-label="How this matches what you told us">
          {orderedChecklist.map((item) => (
            <li
              key={item.key}
              className={`${s.checklistItem} ${item.matched ? s.checklistYes : s.checklistNo}`}
            >
              <span className={s.checklistIcon} aria-hidden="true">
                {item.matched ? "✓" : "✗"}
              </span>
              {formatChecklistLabel(item)}
            </li>
          ))}
        </ul>
      )}

      {product.buyLink && (
        <a href={product.buyLink} target="_blank" rel="noopener noreferrer" className={s.buyLink}>
          Buy →
        </a>
      )}

      <div className={s.whyWrap}>
        <button
          type="button"
          className={s.whyToggle}
          aria-expanded={whyOpen}
          aria-controls={`why-${product.id}`}
          onClick={() => setWhyOpen((prev) => !prev)}
        >
          {whyOpen ? "Hide why we picked this" : "Why we picked this"}
        </button>
        {whyOpen && (
          <p id={`why-${product.id}`} className={s.whyText}>
            {buildWhyText(pick.matchReasons)}
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * Top 2 styles, rendered as a card row below the product tabs (Final
 * Spike, P3 of 4, Part C) — visually modeled on ProductCard's own hairline-
 * border + shadow-elevation-1 + hover-lift convention (see CLAUDE.md's
 * "Card / shadow conventions") so it reads as native to this page, not
 * bolted on, while a small "Style" eyebrow badge (in place of a category
 * badge) signals it's a different kind of pick — no brand/price/buy link,
 * deliberately, since a style is a technique, not a purchased product.
 * Renders nothing at all when there are zero styles (a thin/empty catalog
 * case), rather than an empty-state message — unlike a product category,
 * "styles" isn't a fixed slot users expect to always see.
 */
function StylesStrip({ styles }: { styles: RecommendedStyle[] }) {
  if (styles.length === 0) return null;

  return (
    <motion.div className={s.stylesSection} variants={fadeUp}>
      <p className={s.stylesEyebrow}>Styles worth trying</p>
      <ul className={s.stylesGrid}>
        {styles.map((style) => (
          <li key={style.product.id} className={s.styleCard}>
            <span className={s.styleBadge}>Style</span>
            <h3 className={s.styleName}>{style.product.name}</h3>
            <p className={s.styleMatchLine}>{buildStyleMatchLine(style.matchReasons)}</p>
            {/* Two styles in the live catalog have no notes — omit the
                "Keep in mind" heading entirely rather than leaving it
                hanging with nothing under it. Display-only: notes never
                drive ranking or filtering (see scoring.ts's scoreStyle). */}
            {style.product.notes && (
              <p className={s.styleNotes}>
                <span className={s.styleNotesLabel}>Keep in mind:</span> {style.product.notes}
              </p>
            )}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

/**
 * Replaces the old waitlist-only EmailCapture (Spike A/B) — see
 * DECISIONS.md. Emails the user their actual recommendations via
 * api/send-results.ts, which also joins the waitlist server-side
 * (one-directional: results recipients join the waitlist, waitlist
 * signups never get results). No name field — lower friction, and the
 * endpoint doesn't need one.
 */
function SendResultsCapture({
  recommendations,
  answers,
}: {
  recommendations: ScoredRecommendationSet;
  answers?: DiagnosticAnswers;
}) {
  const { submit, loading, error, success } = useSendResults();
  const [email, setEmail] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!answers) return;
    const ok = await submit(buildSendResultsPayload(recommendations, answers, email));
    if (ok) {
      track("results_emailed", { email_hint: email.slice(0, 3) + "***" });
    }
  }

  // Backward-compat only (see ScanResultsLocationState) — a stale cached
  // history entry from before `answers` existed can't build match lines
  // or the sheet's curl-type/porosity columns, so the form doesn't render
  // rather than send an email with no way to honestly fill those in.
  if (!answers) return null;

  if (success) {
    return (
      <div className={s.captureBox}>
        <p className={s.captureSuccess}>
          Check your inbox — we just sent your recommendations. You&rsquo;re also on our list for launch updates.
        </p>
      </div>
    );
  }

  return (
    <form className={s.captureBox} onSubmit={onSubmit} aria-describedby="capture-help">
      <h2 className={s.captureHeading}>Get your recommendations by email</h2>
      <div className={s.captureRow}>
        <label className="sr-only" htmlFor="results-email">
          Email
        </label>
        <input
          id="results-email"
          type="email"
          placeholder="you@domain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-invalid={error ? "true" : "false"}
          disabled={loading}
        />
        <button type="submit" className={s.captureButton} disabled={loading}>
          {loading ? "Sending..." : "Email my results"}
        </button>
      </div>
      <p id="capture-help" className={s.captureHelp}>
        We&rsquo;ll send your full routine to this email. You&rsquo;ll also be added to our list for launch updates.
      </p>
      {error && (
        <p role="alert" className={s.captureError}>
          {error}
        </p>
      )}
    </form>
  );
}
