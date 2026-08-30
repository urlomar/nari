import { motion } from "motion/react";
import s from "@/styles/About.module.css";
import { useScrollReveal, useScrollParallax } from "@/styles/useScrollReveal";
import aboutPhoto from "@/assets/photos/images/image1.png";

/** About page with mission, inclusion statement, and a real photo. */
export default function About() {
  const eyebrow = useScrollReveal<HTMLParagraphElement>();
  const title = useScrollReveal<HTMLHeadingElement>();
  const body1 = useScrollReveal<HTMLParagraphElement>();
  const body2 = useScrollReveal<HTMLParagraphElement>();
  const photoReveal = useScrollReveal<HTMLImageElement>({ distance: 36 });
  const parallax = useScrollParallax<HTMLDivElement>(24);

  return (
    <section className={s.section}>
      <div className={s.wrap}>
        <div className={s.copy}>
          {/* The heading itself no longer repeats "About" (redundant with
              the eyebrow right above it, and with the page already titled
              About) — just "Nari" now. The eyebrow stays, with more room
              below it — see DECISIONS.md "About page heading" for the
              interpretation call. */}
          <motion.p ref={eyebrow.ref} style={eyebrow.style} className={s.eyebrow}>
            About
          </motion.p>
          <motion.h1 ref={title.ref} style={title.style} className={s.title}>
            Nari
          </motion.h1>
          <motion.p ref={body1.ref} style={body1.style} className={s.body}>
            We recommend products, help you understand your unique hair characteristics, and
            tailor support towards your biggest frustrations and goals!
          </motion.p>
          <motion.p ref={body2.ref} style={body2.style} className={s.body}>
            We&rsquo;re starting with a focus on Black women and expanding for all curl patterns.
          </motion.p>
        </div>

        <motion.div ref={parallax.ref} style={parallax.style} className={s.photoWrap}>
          <motion.img
            ref={photoReveal.ref}
            style={photoReveal.style}
            className={s.photo}
            src={aboutPhoto}
            alt="Portrait of a woman with a full, healthy natural curl pattern"
          />
        </motion.div>
      </div>
    </section>
  );
}
