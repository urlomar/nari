import { useSearchParams } from "react-router-dom";
import s from "@/styles/Page.module.css";

/** Contact/updates page doubles as a simple success screen. */
export default function Contact() {
  const [params] = useSearchParams();
  const success = params.get("subscribed") === "1";
  return (
    <section className={s.section}>
      <div className={s.wrap}>
        <h1>{success ? "You're on the list!" : "Contact & Updates"}</h1>
        {success ? (
          <p>Thanks for joining the Nari waitlist. We’ll be in touch with launch updates.</p>
        ) : (
          <p>Email us at <a href="mailto:hello@nari.example.com">hello@nari.example.com</a></p>
        )}
      </div>
    </section>
  );
}
