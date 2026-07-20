import { HairAnalysisSchema, type HairAnalysis, type ScanData } from "./schemas";
import { analyzeHairFallback } from "./analyzeHairFallback";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.slice(dataUrl.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Calls /api/analyze for a real vision-based read of the photos. On any
 * failure (network, server error, malformed response) falls back to
 * rules-based results derived from the questionnaire — the caller never
 * knows which path ran.
 */
export async function analyzeHair(scanData: ScanData): Promise<HairAnalysis> {
  try {
    const [front, back, strand] = await Promise.all([
      fileToBase64(scanData.photos.front),
      fileToBase64(scanData.photos.back),
      fileToBase64(scanData.photos.strand),
    ]);

    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        photos: {
          front: { base64: front, mediaType: "image/jpeg" },
          back: { base64: back, mediaType: "image/jpeg" },
          strand: { base64: strand, mediaType: "image/jpeg" },
        },
        answers: scanData.answers,
      }),
    });

    if (!res.ok) {
      throw new Error(`Analyze request failed with status ${res.status}`);
    }

    const data = await res.json();
    const parsed = HairAnalysisSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error("Analyze response failed schema validation.");
    }

    return parsed.data;
  } catch (err) {
    console.error("analyzeHair: falling back to rules-based results", err);
    return analyzeHairFallback(scanData);
  }
}
