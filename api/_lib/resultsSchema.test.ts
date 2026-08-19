import { describe, it, expect } from "vitest";
import { SendResultsRequestSchema } from "./resultsSchema";

function validPayload() {
  return {
    email: "test@example.com",
    curlType: "4c",
    porosity: "high",
    recommendations: {
      categories: [
        {
          category: "Shampoo",
          relaxed: false,
          relaxedConstraints: [],
          picks: [
            { name: "Test Shampoo", brand: "TestBrand", price: 12, buyLink: "https://example.com", matchLine: "✓ your porosity" },
          ],
        },
      ],
    },
  };
}

describe("SendResultsRequestSchema", () => {
  it("accepts a well-formed request", () => {
    expect(SendResultsRequestSchema.safeParse(validPayload()).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const payload = validPayload();
    payload.email = "not-an-email";
    expect(SendResultsRequestSchema.safeParse(payload).success).toBe(false);
  });

  it("allows a null price and a missing buyLink (edge cases the real catalog has today)", () => {
    const payload = validPayload();
    payload.recommendations.categories[0].picks[0] = {
      name: "Unpriced Product",
      brand: "BrandX",
      price: null,
      matchLine: "",
    } as any;
    expect(SendResultsRequestSchema.safeParse(payload).success).toBe(true);
  });

  it("allows an empty picks array (an honestly-empty category, not trimmed away)", () => {
    const payload = validPayload();
    payload.recommendations.categories[0].picks = [];
    expect(SendResultsRequestSchema.safeParse(payload).success).toBe(true);
  });

  it("rejects an unknown relaxedConstraints value", () => {
    const payload = validPayload();
    (payload.recommendations.categories[0].relaxedConstraints as string[]) = ["not-a-real-dimension"];
    expect(SendResultsRequestSchema.safeParse(payload).success).toBe(false);
  });

  it("rejects a request with no categories at all", () => {
    const payload = validPayload();
    payload.recommendations.categories = [];
    expect(SendResultsRequestSchema.safeParse(payload).success).toBe(false);
  });
});
