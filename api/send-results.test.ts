/**
 * Tests for the results email body generator. Both builders are pure
 * functions of the wire-shaped recommendations payload — no network, no
 * Resend/Google calls — so these assert against the returned string
 * directly, same principle as scoring.ts's own pure-function tests.
 */
import { describe, it, expect } from "vitest";
import { buildResultsEmailHtml, buildResultsEmailText } from "./send-results";

type Category = Parameters<typeof buildResultsEmailHtml>[0]["categories"][number];
type Style = NonNullable<Parameters<typeof buildResultsEmailHtml>[0]["styles"]>[number];

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    category: "Shampoo",
    relaxed: false,
    relaxedConstraints: [],
    picks: [
      {
        name: "Test Shampoo",
        brand: "Test Brand",
        price: 12.99,
        buyLink: "https://example.com/buy",
        matchLine: "✓ your porosity · ✗ not Black-owned",
      },
    ],
    ...overrides,
  };
}

// All 7 real live-catalog categories (CLAUDE.md's "Category order" /
// "Live schema notes" sections) — Gel included specifically since it was
// once a real gap where a whole category silently never rendered.
const ALL_CATEGORIES: Category[] = [
  "Shampoo",
  "Conditioner",
  "Leave-in",
  "Cream",
  "Mousse",
  "Oil/Sealant",
  "Gel",
].map((category) => makeCategory({ category }));

const styleWithNotes: Style = {
  name: "Twist/Natural Cornrow & Protective",
  matchLine: "Matches your deep moisture goal and helps with breakage & shedding.",
  notes: "Best on freshly washed, detangled hair for the cleanest parts.",
};

const styleWithoutNotes: Style = {
  name: "Wash and Go",
  matchLine: "Matches your deep moisture goal.",
};

describe("buildResultsEmailHtml / buildResultsEmailText — styles section", () => {
  it("includes style names in both the HTML and plain-text bodies when styles are present", () => {
    const recommendations = { categories: [makeCategory()], styles: [styleWithNotes, styleWithoutNotes] };
    const html = buildResultsEmailHtml(recommendations);
    const text = buildResultsEmailText(recommendations);

    expect(html).toContain("Twist/Natural Cornrow &amp; Protective");
    expect(html).toContain("Wash and Go");
    expect(text).toContain("Twist/Natural Cornrow & Protective");
    expect(text).toContain("Wash and Go");
  });

  it("shows the 'Keep in mind' note when a style has one", () => {
    const recommendations = { categories: [makeCategory()], styles: [styleWithNotes] };
    const html = buildResultsEmailHtml(recommendations);
    const text = buildResultsEmailText(recommendations);

    expect(html).toContain("Keep in mind:");
    expect(html).toContain("Best on freshly washed, detangled hair for the cleanest parts.");
    expect(text).toContain("Keep in mind: Best on freshly washed, detangled hair for the cleanest parts.");
  });

  it("does not render an orphaned 'Keep in mind' heading for a style with no note", () => {
    const recommendations = { categories: [makeCategory()], styles: [styleWithoutNotes] };
    const html = buildResultsEmailHtml(recommendations);
    const text = buildResultsEmailText(recommendations);

    expect(html).not.toContain("Keep in mind");
    expect(text).not.toContain("Keep in mind");
  });

  it("renders both cases correctly side by side — one style with a note, one without", () => {
    const recommendations = { categories: [makeCategory()], styles: [styleWithNotes, styleWithoutNotes] };
    const html = buildResultsEmailHtml(recommendations);

    // Exactly one "Keep in mind:" — from styleWithNotes only, not duplicated
    // onto styleWithoutNotes.
    expect(html.match(/Keep in mind:/g)?.length).toBe(1);
  });

  it("renders correctly with no styles at all — no broken/empty section", () => {
    const withEmptyArray = buildResultsEmailHtml({ categories: [makeCategory()], styles: [] });
    const withMissingField = buildResultsEmailHtml({ categories: [makeCategory()] });
    const textEmpty = buildResultsEmailText({ categories: [makeCategory()], styles: [] });

    for (const html of [withEmptyArray, withMissingField]) {
      expect(html).not.toContain("Styles worth trying");
      expect(html).not.toContain("Keep in mind");
    }
    expect(textEmpty).not.toContain("Styles worth trying");
  });
});

describe("buildResultsEmailHtml / buildResultsEmailText — categories", () => {
  it("includes every category in the recommendation set, including Gel", () => {
    const recommendations = { categories: ALL_CATEGORIES };
    const html = buildResultsEmailHtml(recommendations);
    const text = buildResultsEmailText(recommendations);

    for (const cat of ALL_CATEGORIES) {
      expect(html).toContain(`>${cat.category}<`);
      expect(text).toContain(`## ${cat.category}`);
    }
  });
});

describe("buildResultsEmailHtml / buildResultsEmailText — copy", () => {
  it("contains no em dashes anywhere in the app-authored copy", () => {
    const recommendations = {
      categories: [
        makeCategory({ picks: [] }), // exercises the empty-category copy path
        makeCategory({ category: "Conditioner", relaxed: true, relaxedConstraints: ["porosity", "density"] }), // exercises the relaxed-match copy path
      ],
      styles: [styleWithNotes, styleWithoutNotes],
    };
    const html = buildResultsEmailHtml(recommendations);
    const text = buildResultsEmailText(recommendations);

    expect(html).not.toContain("—");
    expect(text).not.toContain("—");
  });

  it("does not imply Nari is pre-launch (no 'launch updates' / 'opens up' language)", () => {
    const recommendations = { categories: [makeCategory()] };
    const html = buildResultsEmailHtml(recommendations);
    const text = buildResultsEmailText(recommendations);

    for (const body of [html, text]) {
      expect(body.toLowerCase()).not.toContain("launch updates");
      expect(body.toLowerCase()).not.toContain("opens up");
    }
  });
});
