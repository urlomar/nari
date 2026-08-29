/**
 * Spike B, Part A/B: the analyzing step's whole error-recovery story rests
 * on two behaviors of getProducts()'s module-level cache — a failed fetch
 * clears itself so retry actually re-attempts (not just replays the same
 * rejection), and concurrent callers share one in-flight request. Both are
 * asserted directly here, mocking fetch, since this sandbox has no
 * .env.local to hit a real Airtable-backed cold-cache failure with.
 *
 * Each test does a fresh `vi.resetModules()` + dynamic import so the
 * module-level `productsPromise` cache starts clean — otherwise a
 * successful fetch in one test would poison every later test in the file.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { DiagnosticAnswers } from "./products/scoring";

const validResponseBody = {
  products: [{ id: "p1", name: "Test", category: "Shampoo" }],
  meta: {
    stale: false,
    fetchedAt: new Date().toISOString(),
    totalFetched: 1,
    validCount: 1,
    skippedCount: 0,
    skippedRows: [],
    unmappedFields: [],
    missingMappedFields: [],
    valueDrift: { goals: [], frustrations: [], porosity: [], density: [], hairTypes: [] },
  },
};

const baseAnswers: DiagnosticAnswers = {
  porosity: "unsure",
  curlType: "",
  sensitivities: ["none"],
  goals: [],
  frustrations: [],
  density: "medium",
  budgetMax: null,
  blackOwnedPref: "no_pref",
  journey: "test",
};

describe("dataSource — catalog fetch error handling", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("rejects when the network is unreachable, and a later call retries fresh instead of replaying the same rejection", async () => {
    let callCount = 0;
    global.fetch = vi.fn(() => {
      callCount += 1;
      if (callCount === 1) return Promise.reject(new Error("network down"));
      return Promise.resolve(new Response(JSON.stringify(validResponseBody), { status: 200 }));
    }) as unknown as typeof fetch;

    const { getProducts } = await import("./dataSource");

    await expect(getProducts()).rejects.toThrow();
    // Retry (e.g. the analyzing step's "Try again" button, which just
    // re-invokes getRecommendations()) must actually hit the network
    // again, not resolve to a cached rejection forever.
    const result = await getProducts();
    expect(result.products).toHaveLength(1);
    expect(callCount).toBe(2);
  });

  it("rejects on a cold-cache server failure — no stale cache to fall back on, matching api/products.ts's 500 response when Airtable is down on first request", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ error: "Failed to load products." }), { status: 500 }))
    ) as unknown as typeof fetch;

    const { getProducts } = await import("./dataSource");
    await expect(getProducts()).rejects.toThrow(/status 500/);
  });

  it("rejects when the response body fails schema validation, rather than handing malformed data to scoreProducts()", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ nonsense: true }), { status: 200 }))
    ) as unknown as typeof fetch;

    const { getProducts } = await import("./dataSource");
    await expect(getProducts()).rejects.toThrow(/schema validation/);
  });

  it("getRecommendations() propagates a catalog fetch failure rather than swallowing it", async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error("network down"))) as unknown as typeof fetch;

    const { getRecommendations } = await import("./dataSource");
    await expect(getRecommendations(baseAnswers)).rejects.toThrow();
  });

  it("dedupes concurrent callers into a single in-flight request (prefetch + analyzing step + any other consumer share one fetch)", async () => {
    let callCount = 0;
    global.fetch = vi.fn(() => {
      callCount += 1;
      return Promise.resolve(new Response(JSON.stringify(validResponseBody), { status: 200 }));
    }) as unknown as typeof fetch;

    const { getProducts } = await import("./dataSource");
    const [a, b] = await Promise.all([getProducts(), getProducts()]);
    expect(a).toBe(b);
    expect(callCount).toBe(1);
  });
});
