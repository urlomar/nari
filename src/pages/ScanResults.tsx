import { useState } from "react";
import { motion } from "motion/react";
import { useLocation, useNavigate } from "react-router-dom";
import type { RecommendationSet } from "@/lib/schemas";
import { track } from "@/lib/analytics";
import { useSubscribe } from "@/lib/useSubscribe";
import { fadeUp, staggerChildren } from "@/styles/motionVariants";
import s from "@/styles/ScanResults.module.css";

interface ScanResultsLocationState {
  recommendations?: RecommendationSet;
}

/** The most beautiful, screenshot-worthy screen in the app. */
export default function ScanResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const recommendations = (location.state as ScanResultsLocationState | null)?.recommendations;

  if (!recommendations) {
    return (
      <div className={s.screen}>
        <div className={s.card}>
          <p className={s.body}>We couldn&rsquo;t find your scan results — let&rsquo;s start a new scan.</p>
          <button type="button" className={s.primaryButton} onClick={() => navigate("/scan", { replace: true })}>
            Start a scan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={s.screen}>
      <motion.div className={s.card} initial="hidden" animate="visible" variants={staggerChildren}>
        <motion.div variants={fadeUp}>
          <p className={s.eyebrow}>Your recommendations</p>
          <h1 className={s.heading}>Built for your hair</h1>
          <p className={s.body}>Based on your diagnostic, here&rsquo;s what we&rsquo;d reach for first.</p>
        </motion.div>

        {recommendations.categories.map((category) => (
          <motion.section key={category.name} className={s.categorySection} variants={fadeUp}>
            <h2 className={s.categoryHeading}>{category.name}</h2>
            <ul className={s.recommendationList}>
              {category.picks.map((pick) => (
                <li key={pick.name} className={s.recommendationCard}>
                  <span className={s.categoryBadge}>{pick.category}</span>
                  <h3 className={s.recommendationTitle}>{pick.name}</h3>
                  <p className={s.body}>{pick.why}</p>
                </li>
              ))}
            </ul>
          </motion.section>
        ))}

        <motion.p className={s.privacyLine} variants={fadeUp}>
          Your answers are used only to build these recommendations — never stored or shared.
        </motion.p>

        <motion.div variants={fadeUp}>
          <EmailCapture />
        </motion.div>

        <motion.button
          type="button"
          className={s.secondaryButton}
          variants={fadeUp}
          onClick={() => navigate("/scan")}
        >
          Scan again
        </motion.button>
      </motion.div>
    </div>
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
