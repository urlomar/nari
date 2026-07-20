import { useState } from "react";
import { motion } from "motion/react";
import { useLocation, useNavigate } from "react-router-dom";
import type { HairAnalysis } from "@/lib/schemas";
import { track } from "@/lib/analytics";
import { useSubscribe } from "@/lib/useSubscribe";
import { fadeUp, staggerChildren } from "@/styles/motionVariants";
import s from "@/styles/ScanResults.module.css";

interface ScanResultsLocationState {
  analysis?: HairAnalysis;
}

/** The most beautiful, screenshot-worthy screen in the app. */
export default function ScanResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const analysis = (location.state as ScanResultsLocationState | null)?.analysis;

  if (!analysis) {
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
          <p className={s.eyebrow}>Your hair type</p>
          <h1 className={s.heading}>{analysis.curlPattern}</h1>
          <p className={s.body}>{analysis.conditionNotes}</p>
          <p className={s.hint}>Estimated porosity: {analysis.porosity}</p>
        </motion.div>

        <motion.ul className={s.recommendationList} variants={fadeUp}>
          {analysis.recommendations.map((rec) => (
            <li key={rec.title} className={s.recommendationCard}>
              <h2 className={s.recommendationTitle}>{rec.title}</h2>
              <p className={s.body}>{rec.why}</p>
            </li>
          ))}
        </motion.ul>

        <motion.p className={s.privacyLine} variants={fadeUp}>
          Your photos are analyzed and immediately deleted — never stored or shared.
        </motion.p>

        <motion.div variants={fadeUp}>
          <EmailCapture hairType={analysis.curlPattern} />
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

function EmailCapture({ hairType }: { hairType: string }) {
  const { submit, loading, error, success } = useSubscribe();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await submit({ firstName, lastName, email, hairType });
    if (ok) {
      track("email_captured", { email_hint: email.slice(0, 3) + "***", hair_type: hairType });
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
