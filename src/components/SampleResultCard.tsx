import s from "@/styles/SampleResultCard.module.css";

export interface SampleProductData {
  category: string;
  name: string;
  brand: string;
  price: string;
  checklist: { label: string; matched: boolean }[];
}

/**
 * Static landing-page mock of a real recommendation card (Final Spike, P4
 * of 4, Part E; generalized to take a `product` prop in P5, Part A, so
 * two real products can sit side by side and fill the section at native
 * card sizing rather than one stretched card — see DECISIONS.md's "Sample
 * result sizing" section). Both exported products are copied verbatim
 * from the live catalog fixture (src/lib/products/__fixtures__/
 * catalog.json) for the same plausible answer set (high porosity, curl
 * type 4A, $10-$25 budget, Black-owned preferred) run through the same
 * checklist logic ScanResults.tsx uses, so each ✓/✗ mix is exactly what a
 * real user with those answers would see — not invented, and deliberately
 * not identical between the two (an honest recommendation set has some
 * variation, not a uniform four checkmarks on every card). Presentation
 * only, no live scoring call — see ResultsPreview.tsx for where it's placed.
 */
export const PATTERN_LEAVE_IN: SampleProductData = {
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

export const OUIDAD_CREAM: SampleProductData = {
  category: "Cream",
  name: "Vital Curl Define and Shine Styling Gel Cream",
  brand: "Ouidad",
  price: "$26",
  checklist: [
    { label: "your porosity", matched: true },
    { label: "your curl type", matched: true },
    { label: "over your budget", matched: false },
    { label: "not Black-owned", matched: false },
  ],
};

export default function SampleResultCard({
  product = PATTERN_LEAVE_IN,
  className,
}: {
  product?: SampleProductData;
  className?: string;
}) {
  return (
    <div className={`${s.card} ${className ?? ""}`}>
      <span className={s.categoryBadge}>{product.category}</span>
      <h3 className={s.productName}>{product.name}</h3>
      <p className={s.productBrand}>{product.brand}</p>
      <p className={s.productPrice}>{product.price}</p>

      <ul className={s.checklist} aria-label="How this matches a sample profile">
        {product.checklist.map((item) => (
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
