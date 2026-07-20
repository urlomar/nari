import Hero from "@/components/Hero";
import Features from "@/components/Features";
import ResultsPreview from "@/components/ResultsPreview";
import CTA from "@/components/CTA";
import FAQ from "@/components/FAQ";

/** Landing: hero, how it works, results preview, trust + CTA, FAQ. */
export default function Landing() {
  return (
    <>
      <Hero />
      <Features />
      <ResultsPreview />
      <CTA />
      <FAQ />
    </>
  );
}
