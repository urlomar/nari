import { useState } from "react";
import { SubscribeInputSchema, type SubscribeInput } from "./schemas";

/** Shared /api/subscribe submission logic for CTA and the results page. */
export function useSubscribe() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(input: SubscribeInput): Promise<boolean> {
    setError(null);

    const parsed = SubscribeInputSchema.safeParse(input);
    if (!parsed.success) {
      const errs = parsed.error.flatten().fieldErrors;
      setError(
        errs.firstName?.[0] ??
          errs.lastName?.[0] ??
          errs.email?.[0] ??
          errs.hairType?.[0] ??
          "Please check your details and try again."
      );
      return false;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          email: parsed.data.email,
          hairType: parsed.data.hairType?.trim() || null,
        }),
      });

      if (!res.ok) {
        let message = "Something went wrong. Please try again.";
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
