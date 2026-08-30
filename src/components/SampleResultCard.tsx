import s from "@/styles/SampleResultCard.module.css";

/**
 * Static landing-page mock of a real recommendation card (Final Spike, P4
 * of 4, Part E). Data below is copied verbatim from the live catalog
 * fixture (Pattern Leave-In, Pattern Beauty — src/lib/products/__fixtures__/
 * catalog.json) with a plausible answer set (high porosity, curl type 4A,
 * $10-$25 budget, Black-owned preferred) run through the same checklist
 * logic ScanResults.tsx uses, so the ✓/✗ mix is exactly what a real user
 * with those answers would see — not invented. This is presentation only
 * (no props, no interactivity) — see ResultsPreview.tsx for where it's
 * placed; do not wire it to live scoring.
 */
const SAMPLE = {
  category: "Leave-in",
  name: "Pattern Leave-In",
  brand: "Pattern Beauty",
  price: "$29",
  checklist: [
    { label: "your porosity", matched: true },
    { label: "your curl type", matched: true },
    { label: "Black-owned", matched: true },
    { label: "over your budget", matched: false },
  ],
};

export default function SampleResultCard({ className }: { className?: string }) {
  return (
    <div className={`${s.card} ${className ?? ""}`}>
      <span className={s.categoryBadge}>{SAMPLE.category}</span>
      <h3 className={s.productName}>{SAMPLE.name}</h3>
      <p className={s.productBrand}>{SAMPLE.brand}</p>
      <p className={s.productPrice}>{SAMPLE.price}</p>

      <ul className={s.checklist} aria-label="How this matches a sample profile">
        {SAMPLE.checklist.map((item) => (
          <li
            key={item.label}
            className={`${s.checklistItem} ${item.matched ? s.checklistYes : s.checklistNo}`}
          >
            <span className={s.checklistIcon} aria-hidden="true">
              {item.matched ? "✓" : "✗"}
            </span>
            {item.label}
          </li>
        ))}
      </ul>

      <span className={s.buyLink}>Buy →</span>
    </div>
  );
}
