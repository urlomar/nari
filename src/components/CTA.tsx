import s from "@/styles/CTA.module.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { z } from "zod";
import { track } from "@/lib/analytics";

/**
 * Mailing-list CTA box with hover glow and dynamic interactions.
 * @remarks We light up on hover; we navigate on submit (not on hover) for accessibility.
 */
export default function CTA() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const emailSchema = z.string().email();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = emailSchema.safeParse(email).success;
    if (!ok) return setMsg("Please enter a valid email.");
    // Mock async subscribe
    await new Promise((r) => setTimeout(r, 400));
    track("join_waitlist", { email_hint: email.slice(0, 3) + "***" });
    navigate("/contact?subscribed=1", { replace: false });
  }

  return (
    <section id="mailing" className={s.section} aria-labelledby="cta-title">
      <div className={s.wrap}>
        <h2 id="cta-title">Get early access updates</h2>
        <p className={s.copy}>
          Join the Nari list for launch news, early invites, and pro curl tips.
        </p>

        <form className={s.box} onSubmit={onSubmit} aria-describedby="cta-help">
          <label className="sr-only" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-invalid={msg ? "true" : "false"}
          />
          <button type="submit" className={s.button} aria-label="Join the mailing list">
            Join waitlist
          </button>
          <p id="cta-help" className={s.help}>
            We’ll only email important updates. Unsubscribe anytime.
          </p>
          {msg && <p role="alert" className={s.error}>{msg}</p>}
        </form>
      </div>
    </section>
  );
}
