// api/debug-scoring.ts

/**
 * Gate for the /debug/scoring client route (see src/pages/debug/ScoringDebug.tsx).
 *
 * That route is a normal client-rendered page — it needs to run in
 * production so it can be screenshotted against live Airtable data for
 * Nya, but it's an internal tuning instrument, not something meant for
 * public/casual discovery. The actual gating value can't live in a
 * VITE_-prefixed env var (CLAUDE.md: secrets never ship in the client
 * bundle), so the comparison happens here, server-side, against
 * `process.env.ONYAPROJECTX`. The page calls this endpoint with the `key`
 * query param it was loaded with; a 404 here (identical shape to hitting
 * any nonexistent /api/* route) makes the page render the same NotFound
 * component a bogus path would.
 *
 * Note: the underlying catalog data itself is NOT secret — it's already
 * public, unauthenticated, at /api/products. This endpoint only gates
 * access to the debug *tool*, not to any data that isn't already exposed.
 */
export default async function handler(req: any, res: any) {
  res.setHeader?.("Content-Type", "application/json");

  if (req.method !== "GET") {
    res.setHeader?.("Allow", "GET");
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  let key: string | undefined = req.query?.key;
  if (typeof key !== "string") {
    try {
      key = new URL(req.url, "http://localhost").searchParams.get("key") ?? undefined;
    } catch {
      key = undefined;
    }
  }

  const expected = process.env.ONYAPROJECTX;

  if (!expected || !key || key !== expected) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  res.statusCode = 200;
  res.end(JSON.stringify({ ok: true }));
}
