import { useState } from "react";
import { motion } from "motion/react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { CategoryRecommendation, RecommendedProduct, ScoredRecommendationSet, SensitivityAnswer } from "@/lib/products/scoring";
import { getOptionLabel } from "@/features/scanner/quiz/quizLabels";
import { useSubscribe } from "@/lib/useSubscribe";
import { track } from "@/lib/analytics";
import { fadeUp, staggerChildren } from "@/styles/motionVariants";
import s from "@/styles/ScanResults.module.css";

interface ScanResultsLocationState {
  recommendations?: ScoredRecommendationSet;
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

function unenforcedSensitivityLabel(sensitivity: SensitivityAnswer): string {
  return getOptionLabel("sensitivities", sensitivity).toLowerCase();
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
  const recommendations = (location.state as ScanResultsLocationState | null)?.recommendations;

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

  return <ScanResultsContent recommendations={recommendations} onScanAgain={() => navigate("/scan")} />;
}

function ScanResultsContent({
  recommendations,
  onScanAgain,
}: {
  recommendations: ScoredRecommendationSet;
  onScanAgain: () => void;
}) {
  // First tab open by default, per the brief.
  const [activeCategory, setActiveCategory] = useState(recommendations.categories[0]?.category ?? "");
  const active =
    recommendations.categories.find((c) => c.category === activeCategory) ?? recommendations.categories[0];

  return (
    <div className={s.screen}>
      <motion.div className={s.card} initial="hidden" animate="visible" variants={staggerChildren}>
        <motion.div variants={fadeUp}>
          <p className={s.eyebrow}>Your recommendations</p>
          <h1 className={s.heading}>Built for your hair</h1>
          <p className={s.body}>Based on your diagnostic, here&rsquo;s a routine you can try tomorrow.</p>
        </motion.div>

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
                  <ProductCard key={pick.product.id} pick={pick} />
                ))}
              </ul>
            )}
          </motion.div>
        )}

        <motion.p className={s.privacyLine} variants={fadeUp}>
          Your answers are used only to build these recommendations — never stored or shared.
        </motion.p>

        {/* Edge case #5 — offered after results, never gating them. */}
        <motion.div variants={fadeUp}>
          <EmailCapture />
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

function ProductCard({ pick }: { pick: RecommendedProduct }) {
  const { product } = pick;
  const [whyOpen, setWhyOpen] = useState(false);

  return (
    <li className={s.productCard}>
      {product.imageUrl && <img src={product.imageUrl} alt="" className={s.productImage} />}

      <span className={s.categoryBadge}>{product.category}</span>
      <h3 className={s.productName}>{product.name}</h3>
      <p className={s.productBrand}>{product.brand}</p>

      {/* Edge case #3 — omit entirely for null-priced products, never "$0"/"null". */}
      {product.price !== null && <p className={s.productPrice}>{formatPrice(product.price)}</p>}

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

function EmailCapture() {
  const { submit, loading, error, success } = useSubscribe();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await submit({ firstName, lastName, email });
    if (ok) {
      track("email_captured", { email_hint: email.slice(0, 3) + "***" });
    }
  }

  if (success) {
    return (
      <div className={s.captureBox}>
        <p className={s.captureSuccess}>You&rsquo;re on the list — check your email for your full routine.</p>
      </div>
    );
  }

  return (
    <form className={s.captureBox} onSubmit={onSubmit} aria-describedby="capture-help">
      <h2 className={s.captureHeading}>Get your full routine</h2>
      <div className={s.captureRow}>
        <label className="sr-only" htmlFor="results-firstName">
          First name
        </label>
        <input
          id="results-firstName"
          type="text"
          placeholder="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          disabled={loading}
        />
        <label className="sr-only" htmlFor="results-lastName">
          Last name
        </label>
        <input
          id="results-lastName"
          type="text"
          placeholder="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
          disabled={loading}
        />
      </div>
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
          {loading ? "Sending..." : "Send it to me"}
        </button>
      </div>
      <p id="capture-help" className={s.captureHelp}>
        We&rsquo;ll email your full routine and launch updates. Unsubscribe anytime.
      </p>
      {error && (
        <p role="alert" className={s.captureError}>
          {error}
        </p>
      )}
    </form>
  );
}
