import { useState } from "react";
import { SendResultsInputSchema } from "./schemas";

/** Wire shape api/send-results.ts expects — see api/_lib/resultsSchema.ts. */
export interface SendResultsProduct {
  name: string;
  brand: string;
  price: number | null;
  buyLink?: string;
  matchLine: string;
}
export interface SendResultsCategory {
  category: string;
  relaxed: boolean;
  relaxedConstraints: Array<"density" | "curlType" | "porosity">;
  picks: SendResultsProduct[];
}
export interface SendResultsStyle {
  name: string;
  matchLine: string;
  notes?: string;
}
export interface SendResultsPayload {
  email: string;
  curlType: string;
  porosity: string;
  recommendations: { categories: SendResultsCategory[]; styles?: SendResultsStyle[] };
}

/** Shared /api/send-results submission logic for ScanResults.tsx's "email my results" form — mirrors useSubscribe's shape/states. */
export function useSendResults() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(payload: SendResultsPayload): Promise<boolean> {
    setError(null);

    const parsed = SendResultsInputSchema.safeParse({ email: payload.email });
    if (!parsed.success) {
      setError(parsed.error.flatten().fieldErrors.email?.[0] ?? "Please enter a valid email address.");
      return false;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/send-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, email: parsed.data.email }),
      });

      if (!res.ok) {
        let message = "We couldn't send your results — please try again in a moment.";
        try {
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch {
          // ignore JSON parse issues
        }
        setError(message);
        return false;
      }

      setSuccess(true);
      return true;
    } catch (err) {
      console.error(err);
      setError("Network error. Please check your connection and try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, error, success };
}
