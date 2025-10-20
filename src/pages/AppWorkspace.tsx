import { useState } from "react";
import { z } from "zod";
import s from "@/styles/Page.module.css";

/**
 * Algorithm workspace stub.
 * @description Accepts basic hair profile inputs and produces mock results:
 * hair type suggestion, product ideas, and a sample routine.
 */
export default function AppWorkspace() {
  const [form, setForm] = useState({
    texture: "4C",
    porosity: "low",
    goals: "reduce breakage"
  });
  const [result, setResult] = useState<string | null>(null);

  const schema = z.object({
    texture: z.enum(["2C", "3A", "3B", "3C", "4A", "4B", "4C"]),
    porosity: z.enum(["low", "medium", "high"]),
    goals: z.string().min(3).max(80)
  });

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm({ ...form, [k]: v });
  }

  async function onRun(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setResult("Please complete all fields correctly.");
      return;
    }
    // TODO: replace with real API call (POST /api/profile -> recommendations)
    const mock = await new Promise<string>((r) =>
      setTimeout(
        () =>
          r(
            JSON.stringify(
              {
                hairType: parsed.data.texture,
                routine: ["Sulfate-free cleanse", "Hydrating mask 1×/wk", "Leave-in + oil seal"],
                products: ["Moisture-rich co-wash", "Ceramide conditioner", "Silicone-free heat protectant"]
              },
              null,
              2
            )
          ),
        500
      )
    );
    setResult(mock);
  }

  return (
    <section className={s.section}>
      <div className={s.wrap}>
        <h1>Try the algorithm</h1>
        <form onSubmit={onRun} className={s.form}>
          <label>
            Texture
            <select value={form.texture} onChange={(e) => update("texture", e.target.value as any)} aria-label="Texture">
              {["2C","3A","3B","3C","4A","4B","4C"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label>
            Porosity
            <select value={form.porosity} onChange={(e) => update("porosity", e.target.value as any)} aria-label="Porosity">
              {["low","medium","high"].map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label>
            Goal
            <input
              type="text"
              value={form.goals}
              onChange={(e) => update("goals", e.target.value)}
              placeholder="e.g., reduce breakage"
              aria-label="Goal"
            />
          </label>
          <button type="submit" className={s.button}>Run</button>
        </form>
        {result && (
          <>
            <h2>Results</h2>
            <pre aria-live="polite" className={s.code}>{result}</pre>
          </>
        )}
      </div>
    </section>
  );
}
