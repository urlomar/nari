/**
 * Normalization tests for the Airtable -> Product pipeline (Spike B, Part
 * B). Priority principle per the brief: test what fails silently. A
 * malformed row that crashes the endpoint is loud and gets caught fast; a
 * quietly-wrong coercion (a missing price becoming $0 instead of "unknown")
 * degrades every recommendation involving that product for weeks before
 * anyone notices.
 */
import { describe, it, expect } from "vitest";
import { normalizeProduct, buildNormalizationReport, type AirtableRecord } from "./schema";

function record(id: string, fields: Record<string, unknown>): AirtableRecord {
  return { id, fields };
}

describe("normalizeProduct — malformed rows are skipped, never crash the caller", () => {
  it("skips a row missing the required name field", () => {
    const result = normalizeProduct(record("rec1", { Brand: "Cantu", Category: "Shampoo" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.skipped.id).toBe("rec1");
      expect(result.skipped.reasons.some((r) => r.includes("name"))).toBe(true);
    }
  });

  it("skips a row missing brand", () => {
    const result = normalizeProduct(record("rec2", { "Product name": "Test Shampoo", Category: "Shampoo" }));
    expect(result.success).toBe(false);
  });

  it("skips a row missing category", () => {
    const result = normalizeProduct(record("rec3", { "Product name": "Test", Brand: "Cantu" }));
    expect(result.success).toBe(false);
  });

  it("never throws, even on a completely empty fields object", () => {
    expect(() => normalizeProduct(record("rec4", {}))).not.toThrow();
    expect(normalizeProduct(record("rec4", {})).success).toBe(false);
  });

  it("never throws on garbage-typed field values (numbers where arrays are expected, etc.)", () => {
    expect(() =>
      normalizeProduct(
        record("rec5", {
          "Product name": 12345,
          Brand: { nested: "object" },
          Category: ["Shampoo"],
          "Best for hair type": "not-an-array",
          Price: "not-a-number",
        })
      )
    ).not.toThrow();
  });
});

describe("normalizeProduct — case normalization", () => {
  it("lowercases and trims hairTypes/porosity/density (Airtable stores them capitalized)", () => {
    const result = normalizeProduct(
      record("rec6", {
        "Product name": "Test",
        Brand: "Cantu",
        Category: "Shampoo",
        "Best for hair type": ["4C", " 4B "],
        "Best for porosity": ["High"],
        "Best for density": ["Medium"],
      })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.product.hairTypes).toEqual(["4c", "4b"]);
      expect(result.product.porosity).toEqual(["high"]);
      expect(result.product.density).toEqual(["medium"]);
    }
  });
});

describe("normalizeProduct — missing numeric fields become null, not 0", () => {
  it("a record with no Price field gets price: null", () => {
    const result = normalizeProduct(record("rec7", { "Product name": "Test", Brand: "Cantu", Category: "Shampoo" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.product.price).toBeNull();
      expect(result.product.price).not.toBe(0);
    }
  });

  it("a record with no Ounces field gets ounces: null", () => {
    const result = normalizeProduct(record("rec8", { "Product name": "Test", Brand: "Cantu", Category: "Shampoo" }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.product.ounces).toBeNull();
  });

  it("an explicit Price of 0 is preserved as 0, distinct from missing/null", () => {
    const result = normalizeProduct(
      record("rec9", { "Product name": "Test", Brand: "Cantu", Category: "Shampoo", Price: 0 })
    );
    expect(result.success).toBe(true);
    if (result.success) expect(result.product.price).toBe(0);
  });
});

describe("normalizeProduct — checkbox fields", () => {
  it("treats an absent checkbox as false (Airtable omits unchecked checkboxes from its response)", () => {
    const result = normalizeProduct(record("rec10", { "Product name": "Test", Brand: "Cantu", Category: "Shampoo" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.product.sulfateFree).toBe(false);
      expect(result.product.blackOwned).toBe(false);
    }
  });

  it("an explicit checked box normalizes to true", () => {
    const result = normalizeProduct(
      record("rec11", { "Product name": "Test", Brand: "Cantu", Category: "Shampoo", "Sulfate free": true })
    );
    expect(result.success).toBe(true);
    if (result.success) expect(result.product.sulfateFree).toBe(true);
  });
});

describe("normalizeProduct — goals alias table", () => {
  it("rewrites Airtable's goal wording to the quiz's vocabulary", () => {
    const result = normalizeProduct(
      record("rec12", {
        "Product name": "Test",
        Brand: "Cantu",
        Category: "Shampoo",
        "Best For Goals": ["Scalp health", "Heat or color damage", "Moisture"],
      })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.product.goals).toEqual(["scalp", "damage", "moisture"]);
    }
  });
});

describe("buildNormalizationReport", () => {
  it("counts valid vs skipped rows correctly", () => {
    const records: AirtableRecord[] = [
      record("ok1", { "Product name": "A", Brand: "B", Category: "Shampoo" }),
      record("bad1", { Brand: "B", Category: "Shampoo" }), // missing name
    ];
    const results = records.map(normalizeProduct);
    const report = buildNormalizationReport(records, results);
    expect(report.totalFetched).toBe(2);
    expect(report.validCount).toBe(1);
    expect(report.skippedCount).toBe(1);
    expect(report.skippedRows).toHaveLength(1);
    expect(report.skippedRows[0].id).toBe("bad1");
  });

  it("surfaces a column present in the response but absent from FIELD_MAP as unmapped, rather than silently dropping it", () => {
    const records: AirtableRecord[] = [
      record("ok1", { "Product name": "A", Brand: "B", Category: "Shampoo", "Some New Column": "value" }),
    ];
    const results = records.map(normalizeProduct);
    const report = buildNormalizationReport(records, results);
    expect(report.unmappedFields).toContain("Some New Column");
  });

  it("surfaces a FIELD_MAP column that never appears in any fetched record (a renamed/removed Airtable column)", () => {
    const records: AirtableRecord[] = [record("ok1", { "Product name": "A", Brand: "B", Category: "Shampoo" })];
    const results = records.map(normalizeProduct);
    const report = buildNormalizationReport(records, results);
    // "Ounces" is a real FIELD_MAP entry that this record set never sends.
    expect(report.missingMappedFields).toContain("Ounces");
  });

  it("does not flag a column as unmapped or missing when it's actually present and mapped", () => {
    const records: AirtableRecord[] = [
      record("ok1", { "Product name": "A", Brand: "B", Category: "Shampoo", Ounces: 8 }),
    ];
    const results = records.map(normalizeProduct);
    const report = buildNormalizationReport(records, results);
    expect(report.unmappedFields).not.toContain("Ounces");
    expect(report.missingMappedFields).not.toContain("Ounces");
  });
});
