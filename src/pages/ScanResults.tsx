import { useLocation, useNavigate } from "react-router-dom";
import type { HairAnalysis } from "@/lib/schemas";
import s from "@/styles/ScanResults.module.css";

interface ScanResultsLocationState {
  analysis?: HairAnalysis;
}

/**
 * Placeholder results screen. Milestone 5 rebuilds this as the
 * screenshot-worthy hero-card layout; for now it just proves the flow
 * end-to-end with the data the scanner hands off.
 */
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
      <div className={s.card}>
        <p className={s.eyebrow}>Your hair type</p>
        <h1 className={s.heading}>{analysis.curlPattern}</h1>
        <p className={s.body}>{analysis.conditionNotes}</p>
        <p className={s.hint}>Estimated porosity: {analysis.porosity}</p>

        <ul className={s.recommendationList}>
          {analysis.recommendations.map((rec) => (
            <li key={rec.title} className={s.recommendationCard}>
              <h2 className={s.recommendationTitle}>{rec.title}</h2>
              <p className={s.body}>{rec.why}</p>
            </li>
          ))}
        </ul>

        <p className={s.privacyLine}>
          Your photos are analyzed and immediately deleted — never stored or shared.
        </p>

        <button type="button" className={s.primaryButton} onClick={() => navigate("/scan")}>
          Scan again
        </button>
      </div>
    </div>
  );
}
