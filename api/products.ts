import {
  normalizeProduct,
  buildNormalizationReport,
  type AirtableRecord,
  type NormalizationReport,
  type Product,
} from "../src/lib/products/schema";

/**
 * Nari product catalog endpoint.
 *
 * - Authenticated GET to the Airtable REST API, paginating past the
 *   100-record-per-page cap until exhausted.
 * - In-memory cache (~10 min TTL) so Nya's catalog edits go live without a
 *   redeploy, without hitting Airtable on every request.
 * - Serves stale cached data (flagged via meta.stale) if a refetch fails —
 *   Airtable being briefly unavailable must not break the results page.
 * - Returns normalized, validated products only; the client never sees
 *   Airtable's raw response shape or field names.
 */

const CACHE_TTL_MS = 10 * 60 * 1000;
const AIRTABLE_PAGE_SIZE = 100;

interface CacheEntry {
  products: Product[];
  report: NormalizationReport;
  fetchedAt: number;
}

let cache: CacheEntry | null = null;

async function fetchAllRecords(baseId: string, table: string, token: string): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`);
    url.searchParams.set("pageSize", String(AIRTABLE_PAGE_SIZE));
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Airtable request failed (${res.status}): ${body}`);
    }

    const json = (await res.json()) as { records: AirtableRecord[]; offset?: string };
    records.push(...json.records);
    offset = json.offset;
  } while (offset);

  return records;
}

async function refreshCatalog(baseId: string, table: string, token: string): Promise<CacheEntry> {
  const records = await fetchAllRecords(baseId, table, token);
  const results = records.map(normalizeProduct);
  const products = results
    .filter((r): r is Extract<(typeof results)[number], { success: true }> => r.success)
    .map((r) => r.product);
  const report = buildNormalizationReport(records, results);

  console.log("Products normalization report", report);

  const entry: CacheEntry = { products, report, fetchedAt: Date.now() };
  cache = entry;
  return entry;
}

function sendCatalog(res: any, status: number, entry: CacheEntry, stale: boolean) {
  res.statusCode = status;
  res.end(
    JSON.stringify({
      products: entry.products,
      meta: {
        stale,
        fetchedAt: new Date(entry.fetchedAt).toISOString(),
        ...entry.report,
      },
    })
  );
}

export default async function handler(req: any, res: any) {
  res.setHeader?.("Content-Type", "application/json");

  if (req.method !== "GET") {
    res.setHeader?.("Allow", "GET");
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    sendCatalog(res, 200, cache, false);
    return;
  }

  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_TABLE_NAME;

  if (!token || !baseId || !table) {
    console.error("Products config error", {
      hasToken: !!token,
      hasBaseId: !!baseId,
      hasTableName: !!table,
    });
    res.statusCode = 500;
    res.end(
      JSON.stringify({
        error: "Server misconfigured.",
        details: "Missing one or more Airtable env vars (token, base ID, or table name).",
      })
    );
    return;
  }

  try {
    const entry = await refreshCatalog(baseId, table, token);
    sendCatalog(res, 200, entry, false);
  } catch (err: any) {
    const details = err?.message ?? String(err);
    console.error("Products fetch error", { message: details });

    if (cache) {
      sendCatalog(res, 200, cache, true);
      return;
    }

    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Failed to load products.", details }));
  }
}
