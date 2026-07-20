// src/components/CTA.tsx
import { motion } from "motion/react";
import s from "@/styles/CTA.module.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { track } from "@/lib/analytics";
import { useSubscribe } from "@/lib/useSubscribe";
import { fadeUp, staggerChildren } from "@/styles/motionVariants";

/**
 * Mailing-list CTA box with hover glow and dynamic interactions.
 * Captures first name, last name, optional hair type, and email, then POSTs to /api/subscribe.
 */
export default function CTA() {
  const navigate = useNavigate();
  const { submit, loading, error } = useSubscribe();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [hairType, setHairType] = useState("");
  const [email, setEmail] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await submit({ firstName, lastName, email, hairType });
    if (ok) {
      track("join_waitlist", { email_hint: email.slice(0, 3) + "***" });
      navigate("/contact?subscribed=1", { replace: false });
    }
  }

  return (
    <section id="mailing" className={s.section} aria-labelledby="cta-title">
      <motion.div
        className={s.wrap}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerChildren}
      >
        <motion.p className={s.trustLine} variants={fadeUp}>
          Your photos are analyzed and immediately deleted — never stored or shared.
        </motion.p>
        <motion.p className={s.curlRange} variants={fadeUp}>
          Built for every curl pattern — 1A to 4C.
        </motion.p>

        <motion.h2 id="cta-title" variants={fadeUp}>
          Get notified when Nari launches
        </motion.h2>
        <motion.p className={s.copy} variants={fadeUp}>
          Be first in line for launch updates, early demos, and pro curl tips.
        </motion.p>

        <motion.form
          className={s.box}
          onSubmit={onSubmit}
          aria-describedby="cta-help"
          variants={fadeUp}
        >
          {/* Row 1: first, last, hair type */}
          <div className={s.row}>
            <div className={s.fieldGroup}>
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
            </div>

            <div className={s.fieldGroup}>
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
            </div>

            <div className={s.fieldGroupSmall}>
              <label className="sr-only" htmlFor="hairType">
                Hair type (optional)
              </label>
              <input
                id="hairType"
                name="hairType"
                type="text"
                placeholder="Hair type (optional)"
                value={hairType}
                onChange={(e) => setHairType(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Row 2: email + button */}
          <div className={s.row}>
            <div className={s.fieldGroupWide}>
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
                aria-invalid={error ? "true" : "false"}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className={s.button}
              aria-label="Join the Nari waitlist"
              disabled={loading}
            >
              {loading ? "Joining..." : "Join waitlist"}
            </button>
          </div>

          <p id="cta-help" className={s.help}>
            We’ll only email important updates. You can unsubscribe anytime.
          </p>

          {error && (
            <p role="alert" className={s.error}>
              {error}
            </p>
          )}
        </motion.form>
      </motion.div>
    </section>
  );
}
