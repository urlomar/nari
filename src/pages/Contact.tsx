import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import s from "@/styles/Contact.module.css";
import { track } from "@/lib/analytics";

/** Contact/updates page and waitlist success screen. */
export default function Contact() {
  const [params] = useSearchParams();
  const success = params.get("subscribed") === "1";

  // Build a shareable link to your landing page
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = origin ? `${origin}/` : "https://nari.example.com/";

  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      } else if (typeof document !== "undefined") {
        const temp = document.createElement("textarea");
        temp.value = shareUrl;
        temp.style.position = "fixed";
        temp.style.opacity = "0";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }
      setCopied(true);
      track("contact_copy_share_link");
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  }

  const mailBody = [
    "I just joined the Nari waitlist – a personalized hair care app for curls, coils, and fros.",
    "",
    "Tap in and join here:",
    shareUrl,
  ].join("\n");

  const mailtoHref = `mailto:?subject=Join me on Nari&body=${encodeURIComponent(
    mailBody
  )}`;

  if (!success) {
    // Non-success state: simple contact card, but still on-brand.
    return (
      <section className={s.section}>
        <div className={s.wrap}>
          <div className={s.card}>
            <h1 className={s.title}>Contact & Updates</h1>
            <p className={s.body}>
              Have questions or want to collaborate with Nari? Reach out and
              we’ll get back to you.
            </p>
            <a
              href="mailto:nari.curls@gmail.com"
              className={s.primaryLink}
            >
              <span className={s.iconEmail} aria-hidden="true">
                ✉
              </span>
              <span>Email the Nari team</span>
            </a>
          </div>
        </div>
      </section>
    );
  }

  // Success state
  return (
    <section className={s.section}>
      <div className={s.wrap}>
        <div
          className={s.card}
          role="status"
          aria-live="polite"
        >
          <div className={s.iconCircle} aria-hidden="true">
            <span className={s.iconCheck}>✓</span>
          </div>

          <h1 className={s.title}>Welcome to Nari — you&apos;re in ✨</h1>
          <p className={s.body}>
            Stay tuned for launch updates, early demos, and pro curl tips.
          </p>

          <div className={s.shareBlock}>
            <h2 className={s.shareHeading}>
              Want your friends to tap in?
            </h2>
            <p className={s.shareSub}>
              Send them the link and share the love.
            </p>

            <div className={s.shareRow}>
              <div className={s.shareInputWrap}>
                <span className={s.iconLink} aria-hidden="true">
                  🔗
                </span>
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  aria-label="Shareable Nari link"
                />
              </div>

              <button
                type="button"
                className={s.copyButton}
                onClick={handleCopy}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <a
              href={mailtoHref}
              className={s.secondaryButton}
              onClick={() => track("contact_share_via_email")}
            >
              <span className={s.iconEmail} aria-hidden="true">
                ✉
              </span>
              <span>Share via email</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
