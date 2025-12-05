import Hero from "@/components/Hero";
import Features from "@/components/Features";
import CTA from "@/components/CTA";
import FAQ from "@/components/FAQ";

/** Landing aggregates hero, benefits, proof, CTA, and FAQ. */
export default function Landing() {
  return (
    <>
      <Hero />
      <Features />
      <CTA />
      <FAQ />
    </>
  );
}
