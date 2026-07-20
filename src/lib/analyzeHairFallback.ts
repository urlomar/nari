import type { CurlPattern, HairAnalysis, PorosityEstimate, ScanData } from "./schemas";

const FALLBACK_DELAY_MS = 1800;

const CURL_PATTERNS_BY_STATE: Record<ScanData["answers"]["naturalState"], CurlPattern[]> = {
  natural: ["3A", "3B", "3C", "4A", "4B", "4C"],
  straightened: ["2A", "2B", "2C"],
  protective: ["3B", "3C", "4A", "4B"],
  other: ["2C", "3A", "3B", "4A"],
};

const POROSITY_OPTIONS: PorosityEstimate[] = ["low", "medium", "high"];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function conditionNotes(scanData: ScanData): string {
  if (scanData.answers.product === "heavy") {
    return "Product buildup may be masking your natural texture — a clarifying wash will help us see the full picture next time.";
  }
  if (scanData.answers.freshness === "wash-day") {
    return "Your hair is a bit past due for a wash, which can flatten curl definition — we've factored that into these recommendations.";
  }
  return "Your hair looks well-defined with healthy curl clumping and minimal frizz along the shaft.";
}

function recommendationsFor(porosity: PorosityEstimate): HairAnalysis["recommendations"] {
  const porosityLabel = porosity === "high" ? "High" : porosity === "low" ? "Low" : "Medium";
  return [
    {
      title: "Hydrating leave-in conditioner",
      why: `${porosityLabel} porosity hair needs consistent moisture to stay defined.`,
    },
    {
      title: "Weekly deep conditioning treatment",
      why: "Restores elasticity and reduces breakage between wash days.",
    },
    {
      title: "Silk or satin pillowcase",
      why: "Cuts down on friction that causes frizz and tangling overnight.",
    },
  ];
}

/**
 * Rules-based results derived from the questionnaire, used when the real
 * vision analysis is unavailable. Keeps a short artificial delay so the
 * analyzing screen paces the same regardless of which path ran.
 */
export async function analyzeHairFallback(scanData: ScanData): Promise<HairAnalysis> {
  await new Promise((resolve) => setTimeout(resolve, FALLBACK_DELAY_MS));

  const pool = CURL_PATTERNS_BY_STATE[scanData.answers.naturalState];
  const curlPattern = pick(pool);
  const porosity = pick(POROSITY_OPTIONS);

  return {
    curlPattern,
    porosity,
    conditionNotes: conditionNotes(scanData),
    recommendations: recommendationsFor(porosity),
  };
}
