import { useEffect, useState } from "react";
import { getProducts } from "@/lib/dataSource";
import type { ProductsResponse } from "@/lib/products/schema";
import s from "@/styles/ProductsDebug.module.css";

/**
 * Dev-only verification surface for Prompt 1 (Airtable product pipeline).
 * Renders the parsed catalog + normalization report as JSON. Excluded from
 * production builds — see the `import.meta.env.DEV` guard in router.tsx.
 * Temporary: Prompt 4 removes or gates this once the real results page
 * consumes the catalog.
 */
export default function ProductsDebug() {
  const [data, setData] = useState<ProductsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProducts()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  return (
    <div className={s.page}>
      <h1 className={s.pageTitle}>Product catalog debug</h1>
      <p className={s.pageNote}>
        Dev-only verification route (Prompt 1) — not shipped in production. Source: /api/products.
      </p>

      {error && (
        <section className={s.section}>
          <h2 className={s.sectionTitle}>Error</h2>
          <pre className={s.pre}>{error}</pre>
        </section>
      )}

      {!data && !error && <p>Loading…</p>}

      {data && (
        <>
          <section className={s.section}>
            <h2 className={s.sectionTitle}>
              Normalization report
              <span className={`${s.badge} ${data.meta.stale ? s.badgeStale : s.badgeOk}`}>
                {data.meta.stale ? "STALE (served from cache after a failed refetch)" : "fresh"}
              </span>
            </h2>
            <pre className={s.pre}>{JSON.stringify(data.meta, null, 2)}</pre>
          </section>

          <section className={s.section}>
            <h2 className={s.sectionTitle}>Products ({data.products.length})</h2>
            <pre className={s.pre}>{JSON.stringify(data.products, null, 2)}</pre>
          </section>
        </>
      )}
    </div>
  );
}
