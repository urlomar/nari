import s from "@/styles/Swatches.module.css";

const NEUTRAL_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const SPACE_STEPS = ["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"];
const RADIUS_STEPS = ["sm", "md", "lg", "xl", "2xl", "card", "pill"];
const TYPE_STEPS = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl"];
const DURATIONS = [
  { name: "fast", value: "150ms" },
  { name: "base", value: "250ms" },
  { name: "slow", value: "400ms" },
];

/**
 * Dev-only design token review page. Excluded from production builds —
 * see the `import.meta.env.DEV` guard in router.tsx.
 */
export default function Swatches() {
  return (
    <div className={s.page}>
      <h1 className={s.pageTitle}>Design tokens</h1>
      <p className={s.pageNote}>Dev-only review route — not shipped in production.</p>

      <section className={s.section}>
        <h2 className={s.sectionTitle}>Neutral ramp</h2>
        <div className={s.swatchRow}>
          {NEUTRAL_STEPS.map((step) => (
            <div key={step} className={s.swatch}>
              <div className={s.swatchColor} style={{ background: `var(--color-neutral-${step})` }} />
              <span className={s.swatchLabel}>{step}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={s.section}>
        <h2 className={s.sectionTitle}>Accent</h2>
        <div className={s.swatchRow}>
          <div className={s.swatch}>
            <div className={s.swatchColor} style={{ background: "var(--color-accent-start)" }} />
            <span className={s.swatchLabel}>accent-start</span>
          </div>
          <div className={s.swatch}>
            <div className={s.swatchColor} style={{ background: "var(--color-accent-end)" }} />
            <span className={s.swatchLabel}>accent-end</span>
          </div>
          <div className={s.swatch}>
            <div className={s.swatchColor} style={{ background: "var(--color-accent-tint-1)" }} />
            <span className={s.swatchLabel}>tint-1</span>
          </div>
          <div className={s.swatch}>
            <div className={s.swatchColor} style={{ background: "var(--color-accent-tint-2)" }} />
            <span className={s.swatchLabel}>tint-2</span>
          </div>
          <div className={s.swatch}>
            <div className={s.swatchColor} style={{ background: "var(--gradient-accent)" }} />
            <span className={s.swatchLabel}>gradient</span>
          </div>
        </div>
        <div className={s.glowDemo}>Glow shadow</div>
        <p className={s.contrastNote}>
          Both accent-start and accent-end pass WCAG AA as text on --color-bg (~5.2:1 and ~5.8:1).
        </p>
      </section>

      <section className={s.section}>
        <h2 className={s.sectionTitle}>Status</h2>
        <div className={s.swatchRow}>
          <div className={s.swatch}>
            <div className={s.swatchColor} style={{ background: "var(--color-success)" }} />
            <span className={s.swatchLabel}>success</span>
          </div>
          <div className={s.swatch}>
            <div className={s.swatchColor} style={{ background: "var(--color-error)" }} />
            <span className={s.swatchLabel}>error</span>
          </div>
        </div>
      </section>

      <section className={s.section}>
        <h2 className={s.sectionTitle}>Typography</h2>
        <p className={s.bodySample}>
          Inter body text — the quick brown fox jumps over the lazy dog. 0123456789
        </p>
        {TYPE_STEPS.map((step) => (
          <p key={step} className={s.typeSample} style={{ fontSize: `var(--text-${step})` }}>
            {step} — Nari
          </p>
        ))}
        <p className={s.contrastNote}>
          --color-text (white) on --color-bg: ~20.4:1. --color-text-muted on --color-bg: ~5.0:1. Both clear WCAG AA (4.5:1).
        </p>
      </section>

      <section className={s.section}>
        <h2 className={s.sectionTitle}>Spacing</h2>
        <div className={s.spaceColumn}>
          {SPACE_STEPS.map((step) => (
            <div key={step} className={s.spaceRow}>
              <span className={s.spaceLabel}>{step}</span>
              <div className={s.spaceBar} style={{ width: `var(--space-${step})` }} />
            </div>
          ))}
        </div>
      </section>

      <section className={s.section}>
        <h2 className={s.sectionTitle}>Radius</h2>
        <div className={s.swatchRow}>
          {RADIUS_STEPS.map((step) => (
            <div key={step} className={s.swatch}>
              <div className={s.radiusBox} style={{ borderRadius: `var(--radius-${step})` }} />
              <span className={s.swatchLabel}>{step}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={s.section}>
        <h2 className={s.sectionTitle}>Timing</h2>
        <div className={s.swatchRow}>
          {DURATIONS.map((d) => (
            <div key={d.name} className={s.durationDemo}>
              <div
                className={s.durationBox}
                style={{ transitionDuration: d.value, transitionTimingFunction: "var(--ease-out)" }}
              />
              <span className={s.swatchLabel}>
                {d.name} ({d.value})
              </span>
            </div>
          ))}
        </div>
        <p className={s.contrastNote}>Hover a box to see its duration/easing.</p>
      </section>
    </div>
  );
}
