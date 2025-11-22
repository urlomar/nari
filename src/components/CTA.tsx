import s from "@/styles/CTA.module.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { z } from "zod";
import { track } from "@/lib/analytics";

/**
 * Mailing-list CTA box with hover glow and dynamic interactions.
 * Captures first name, last name, and email, then POSTs to /api/subscribe.
 */
export default function CTA() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const schema = z.object({
    firstName: z.string().min(1, "First name is required."),
    lastName: z.string().min(1, "Last name is required."),
    email: z.string().email("Please enter a valid email address."),
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const parsed = schema.safeParse({ firstName, lastName, email });
    if (!parsed.success) {
      const errs = parsed.error.flatten().fieldErrors;
      const firstError =
        errs.firstName?.[0] ?? errs.lastName?.[0] ?? errs.email?.[0];
      setMsg(firstError ?? "Please check your details and try again.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = "/api/subscribe";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ firstName, lastName, email }),
      });

      if (!res.ok) {
        let errorMessage = "Something went wrong. Please try again.";
        try {
          const data = await res.json();
          if (data?.error) errorMessage = data.error;
        } catch {
          // ignore JSON parse issues
        }
        setMsg(errorMessage);
        return;
      }

      track("join_waitlist", { email_hint: email.slice(0, 3) + "***" });
      navigate("/contact?subscribed=1", { replace: false });
    } catch (err) {
      console.error(err);
      setMsg("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="mailing" className={s.section} aria-labelledby="cta-title">
      <div className={s.wrap}>
        <h2 id="cta-title">Get early access updates</h2>
        <p className={s.copy}>
          Join the Nari list for launch news, early invites, and pro curl tips.
        </p>

        <form className={s.box} onSubmit={onSubmit} aria-describedby="cta-help">
          <label className="sr-only" htmlFor="firstName">
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            disabled={loading}
          />

          <label className="sr-only" htmlFor="lastName">
            Last name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            disabled={loading}
          />

          <label className="sr-only" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-invalid={msg ? "true" : "false"}
            disabled={loading}
          />

          <button
            type="submit"
            className={s.button}
            aria-label="Join the mailing list"
            disabled={loading}
          >
            {loading ? "Joining..." : "Join waitlist"}
          </button>

          <p id="cta-help" className={s.help}>
            We’ll only email important updates. Unsubscribe anytime.
          </p>

          {msg && (
            <p role="alert" className={s.error}>
              {msg}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
