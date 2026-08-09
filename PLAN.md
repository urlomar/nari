# PLAN.md

Milestone list for the Nari build. Statuses are kept current here so a new
session (or another dev) can see progress without re-reading chat history.

## Milestone 1 — Project setup & waitlist capture
**Status: done**
Vite/React/TS scaffold, `api/subscribe.ts` (Vercel serverless function),
Resend confirmation email, Google Sheets waitlist storage.

## Milestone 2 — Scanner flow
**Status: done**
Multi-step photo capture flow (`src/features/scanner`), client-side image
compression, step reducer.

## Milestone 3 — Design token system
**Status: done**
`src/styles/variables.css` established as the single source of truth for
color, spacing, radius, typography, and motion tokens.

## Milestone 4 — Landing page redesign + scanner restyle
**Status: done**
Hero, Features, ResultsPreview, CTA, FAQ sections built on the token system;
scanner flow restyled to match.

## Milestone 5 — Real vision analysis + results page
**Status: done**
`analyzeHair` vision pipeline wired up with a fallback, `ScanResults` page
rebuilt to present real output.

## Design Polish Sprint — light/ethereal theme pivot
**Status: done**
Pivoting the visual direction from dark to a light, airy, Stripe-referenced
theme: white canvas, gradient ribbon, refined navbar/hero, senior-level
polish details. Tracked pass-by-pass, each reviewed visually before moving on.

- [x] **Pass 1 — Theme flip in tokens.** `variables.css` rewritten for
      light/warm-white backgrounds and near-black text; added the warm-orange
      ribbon stop and a deepened `--gradient-accent-solid` for button fills;
      fixed hardcoded dark values that didn't flip automatically
      (`global.css`, `Page.module.css`, `Contact.module.css` were rewritten
      to read from tokens). WCAG AA verified — see CLAUDE.md Design System
      Notes for the specific hex adjustments and why.
- [x] **Pass 2 — Gradient ribbon.** Replaced `LightStreaks` with
      `GradientRibbon` — a layered (2-3), Stripe-style diagonal gradient band
      (orange→pink→purple→blue), each layer on its own 8-13s transform-only
      loop, plus a fainter `variant="accent"` near the final CTA. Pinned via
      `position: fixed` behind the hero so it reads as bleeding off the
      viewport's top-right; caught and fixed a real stacking bug in the
      process (see CLAUDE.md Design System Notes — a fixed/`z-index:0`
      layer paints above plain static content regardless of DOM order, so
      it was bleeding through every later section until moved to `z-index:
      -1`).
- [x] **Pass 3 — Navbar.** Wordmark + quiet nav links (About, Get updates)
      + a `Scan my hair` gradient CTA, transparent-over-hero → frosted-on-
      scroll (background/backdrop-filter transition only, hairline border
      present in both states), full-screen mobile sheet menu. Found and
      fixed a real, pre-existing bug in the process: `#root { height: 100%
      }` in `global.css` capped the header's sticky containing block to one
      viewport, so it stopped sticking and scrolled away entirely past that
      point — changed to `min-height: 100%` (see CLAUDE.md Design System
      Notes).
- [x] **Pass 4 — Hero.** "Nari" eyebrow types on letter-by-letter (4
      letters, 80ms stagger, no cursor), then headline/subline/CTA cascade
      in (measured via computed-opacity sampling: typewriter done ~550ms,
      full sequence settled ~1.2s, under the 1.8s budget); "finally
      understood." accented via gradient-clip text; `HeroMedia` got a
      colored `--shadow-glow`. Container switched to `var(--w)` for
      consistency with other sections. Found and fixed a real orchestration
      bug — see CLAUDE.md Design System Notes (a `transition` prop passed
      alongside `variants` doesn't reliably override the variant's own
      baked-in stagger/delay for child orchestration).
- [x] **Pass 5 — Global polish.** Container/spacing audit (all sections now
      read from the spacing scale — no ad-hoc px/rem, fixed several
      hardcoded transition durations to `--duration-fast`/`--duration-base`
      tokens too); card hover = lift + shadow-deepen added consistently
      (Features, ResultsPreview, ScanResults recommendation cards); scroll
      fade-up timing corrected to the spec'd 250ms (was drifted to 400ms);
      letter-spacing tightened on large headings site-wide; verified focus
      rings programmatically (all tabbable elements get a visible ring —
      global purple by default, white override on gradient-fill buttons for
      contrast); scanner analyzing screen's spinner replaced with a light
      ribbon shimmer bar; drove the full scanner flow end-to-end with test
      images to confirm the light theme holds all the way to results; added
      a favicon (there wasn't one — `public/` didn't exist and
      `favicon.ico` 404'd).
- [x] **API check (ad hoc, requested alongside Pass 5).** `/api/subscribe`
      verified working end-to-end (live test: wrote a marked test row to
      the real Google Sheet, sent a real confirmation email) — unaffected
      by the design sprint since it never touched `api/`. Noted one
      pre-existing drift for the user to fix: `GOOGLE_SHEET_RANGE` env var
      is `Sheet1!A:D` (4 cols) but the code writes 5; harmless today
      (Sheets auto-expands) but worth updating.
- [x] **Pass 6 — Senior-level details.**
  - **Tier 1 (done):** site-wide grain overlay (`GrainOverlay`, mounted at
    the app root in `main.tsx` so it covers the scanner routes too, which
    live outside `RootLayout`); mouse-reactive glow on the hero ribbon
    (desktop/fine-pointer only, gated by an actual `@media (hover:hover)
    and (pointer:fine)` query, not just a JS check); two-layer shadow
    system (`--shadow-elevation-1` / `--shadow-glow` redefined as tight-dark
    + soft-color-tinted, shared tokens, not per-component values);
    `::selection` custom tint (this landed back in Pass 1 already).
  - **Tier 2 (done):** clip-path wipe reveal (`clipReveal` variant) on
    `HeroMedia` and the `ResultsPreview` sample card; button press feedback
    (`scale(0.97)` on `:active`, 80ms) + gradient-angle hover shift
    (`--gradient-accent-solid-hover`) across every primary button in the
    app; `scroll-behavior: smooth` (reduced-motion respected) +
    `scroll-margin-top` on `#main`.
  - **Tier 2, skipped:** skeleton loaders on the analyzing screen — the
    scope turned out bigger than "if time allows" justified (would mean
    redesigning the scanner's analyzing step to preview the eventual
    results layout, not just swap a spinner). The shimmer bar from Pass 5
    already covers the "no more spinner" part of the ask.
  - **Tier 3: skipped**, per the brief's own guidance to cut it first.
  - All Pass 6 mechanisms verified programmatically (computed styles,
    CSS custom property values, 404 checks), not just eyeballed — several
    of these effects are deliberately low-opacity/subtle and don't show up
    reliably in a before/after screenshot diff.

## Milestone 6 — Ship checklist
**Status: done**
- **Typecheck**: green (`tsc -b`, zero errors).
- **Tests**: no test files exist yet in the repo (pre-existing — not
  introduced or fixed by this sprint; `npm test` exits with "no test files
  found"). Worth a follow-up milestone of its own.
- **Console errors**: zero, crawled across `/`, `/about`, `/contact`,
  `/contact?subscribed=1`, `/scan`, and an unknown route (404 fallback),
  plus a full scripted run through the scanner flow to `/scan/results` —
  against the actual production build (`vite build` + `vite preview`), not
  just dev.
- **Lighthouse** (production build, headless Chrome, default mobile
  throttling): **Performance 94, Accessibility 100, Best Practices 100,
  SEO 100** — all comfortably ≥ 90. Three real issues were found and fixed
  to get here, not just measured:
  - Google Fonts + Fontshare `<link rel="stylesheet">` tags were
    render-blocking (~1.4s of first-paint delay) despite being preloaded —
    switched to the `media="print" onload="this.media='all'"` pattern (+
    a `<noscript>` fallback) so they load without blocking first paint.
  - `role="text"` added to the Hero's typewriter eyebrow — `aria-label` on
    a bare `<p>` with no role is invalid ARIA and Lighthouse correctly
    flagged it (a Pass 4 regression, introduced by the typewriter split).
  - Footer LinkedIn icon text contrast measured 4.4:1 (needs 4.5:1) —
    `--color-accent-tint-1` is used as both the text color and (at 12%)
    the background tint on the same element, so a *stronger* tint was
    pulling the background toward the text's own dark luminance and
    *hurting* contrast, not helping it. Dropped to 8% (~4.78:1). See
    CLAUDE.md if this pattern (same color as both fg tint-source and text)
    shows up elsewhere — it's counterintuitive.
  - Also added `public/robots.txt` (didn't exist — SEO dinged it).
- **Side-by-side with stripe.com**: airy white canvas, layered gradient
  ribbon, orchestrated hero reveal, consistent card/shadow/motion system,
  grain texture, mouse-reactive glow — holds its own. Subjective by
  nature; screenshots throughout this sprint are the evidence trail.
- **API**: `/api/subscribe` verified live end-to-end (see above).
  `/api/analyze` reviewed by hand (retry logic, schema validation, clean
  error responses) but couldn't be fully invoked in this sandbox — its
  `ANTHROPIC_API_KEY` isn't set in `.env.local`, and the harness used for
  the live `/api/subscribe` test can't resolve this file's extensionless
  relative import the way Vercel's bundler does. Confirmed via the full
  scanner-flow test that the app degrades cleanly to the rules-based
  fallback when this endpoint is unreachable, rather than crashing.

## Spike 2 — Branding, theme, copy, images, animation
**Status: Parts A-E done. Part F (cube) built to checkpoint, awaiting go/no-go.**
No dark mode in this spike (light theme only, per brief). Verified with a
temporary local Playwright install (`npm install --no-save playwright`,
not a project dependency — used for screenshots/console-error checks
throughout, not committed) since no browser-driving skill existed yet
for this repo.

- [x] **Part A — Logo.** New `<Logo />` component
      (`src/components/Logo.tsx`): "Nar" as real text (Figtree, new
      `--font-wordmark` token, loaded alongside Inter in `index.html`) +
      a hand-built "i" — a plain div stem plus an SVG curl (a sampled
      logarithmic spiral, not hand-drawn bezier guesses) standing in for
      the dot, rather than CSS-masking the font's own dot (fragial across
      browsers). `currentColor`/em-sized throughout so nav/footer/mobile
      sheet all get the same mark at their own size/color for free via
      normal CSS inheritance — no size/color props needed at any of the
      three current call sites. Verified pixel-level via real headless
      Chromium screenshots (not just visual inspection) at all three
      sizes; iterated the curl's size/position/viewBox twice from those
      screenshots before it read cleanly as a curl rather than a floating
      blob. Footer's old bespoke uppercase/letter-spacing wordmark
      treatment was removed — one wordmark rendering sitewide now, not two.
- [x] **Part B — Photos.** 6 images turned up in `src/assets/photos/`
      against a brief that said 3 — one (`afro-pic-4.png`) is a
      paparazzi-style photo of an identifiable person at a real branded
      event (Amazon Prime Video step-and-repeat visible in frame), not
      stock photography; excluded from use as a publicity-rights/licensing
      risk and flagged to the user rather than silently used. Used:
      `pic-1` (Hero + cube front face), `pic-5`/`pic-6` (cube faces),
      `pic-2` (About). `pic-3` unused/available.
- [x] **Part C — Copy.** All specified edits applied (Hero value prop,
      pre-footer heading/subtext, FAQ Q&A add/remove/replace, footer
      tagline removal, About photo+layout). "kinky" grepped and removed
      site-wide, not just the one called-out section — also found in
      `index.html` meta/title, `api/analyze.ts`'s system prompt, and
      `README.md`. Two real bugs found and fixed along the way, not just
      copy swaps:
      - The nav's "Get updates" link pointed at `/contact`, but the actual
        subscribe form lives in `CTA.tsx` on the landing page (`/#mailing`)
        — `/contact` only had a post-signup thank-you screen. Repointed
        both nav links to `/#mailing`; `ScrollToTop` (see below) now
        handles the hash-scroll instead of a second competing effect.
      - `About.tsx`'s content rendered fully invisible (stuck at
        `opacity:0`) because its content was already inside the viewport
        at mount, so its `whileInView` trigger never fired an enter
        transition — same underlying class of bug the Part D rebuild
        exists to eliminate. Fixed then, superseded by the Part D rebuild.
- [x] **Part D — Scroll animation.** New shared hooks in
      `src/styles/useScrollReveal.ts` (`useScrollReveal`,
      `useScrollParallax`, `useScrollProgress`), all built on Motion's
      `useScroll`/`useTransform` against a per-element ref rather than a
      shared `whileInView`+variants trigger. Applied to Features (per-card
      reveal, extracted into `<FeatureCard>` since hooks can't run inside
      `.map()`), ResultsPreview, CTA, FAQ (per-item, extracted
      `<FaqAccordionItem>`), and About. Verified programmatically (not
      just eyeballed) that opacity is a continuous, symmetric function of
      scroll position — scrolling back up genuinely reverses the reveal,
      not just a re-triggered one-shot. Hero's mount intro and
      ScanResults' post-scan reveal deliberately untouched — both are
      one-time `animate` triggers on mount, not scroll-position-linked,
      so they're outside what this part targeted. `ScrollToTop.tsx` also
      extended to handle the URL hash case (see Part C).
- [x] **Part D/B fallback — HeroMedia real photo.** Cube's fallback path
      (per Part B) implemented now rather than left contingent on the
      Part F outcome, since Parts A-E are the guaranteed deliverable and
      shouldn't depend on whether the cube ships: `HeroMedia` now renders
      `afro-pic-1.jpg` (card-styled: border + `--shadow-glow` +
      `--shadow-elevation-1`) instead of the old animated gradient-blob
      placeholder, which is fully removed (dead code, not disabled).
- [x] **Part E — Regression pass.** `tsc -b` clean. Zero console errors /
      zero failed requests / zero 4xx-5xx crawled across `/`, `/about`,
      `/contact`, `/contact?subscribed=1`, `/scan`, and an unknown route
      — both dev server and an actual `vite build` + `vite preview`
      production build (matching Milestone 6's rigor). FAQ accordion and
      mobile menu open/close interactions verified live, not just
      visually. Both real photos (Hero, About) confirmed rendering at
      desktop and mobile widths in the production build.
- [~] **Part F — 3D cube.** Built to a working checkpoint; **go/no-go
      pending user confirmation**, per the brief's own checkpoint
      instruction — do not treat this as shipped until confirmed.
      `three` + `@react-three/fiber@^8` + `@react-three/drei@^9` (pinned
      to the v8/v9 lines deliberately — the latest `@react-three/fiber@9`
      requires React 19; this app is on React 18). New
      `src/components/Cube.tsx`, wired into `Hero.tsx` in place of
      `HeroMedia`, lazy-loaded (`React.lazy`+`Suspense`) so its ~230kB
      gzipped weight streams in after first paint rather than blocking it
      — still substantial for a typical visit since the cube is above the
      fold, flagged to the user as a real cost, not hidden.
      - 6-face `BoxGeometry`-based mesh (via `three-stdlib`'s
        `RoundedBoxGeometry`, which extends `THREE.BoxGeometry` and so
        keeps its 6 per-face material groups — confirmed by reading the
        source before relying on it; drei's own `<RoundedBox>` component
        uses an extruded 2D shape instead and does *not* preserve
        per-face groups, so it can't take 6 independent textures/materials
        and was ruled out for this rather than discovered broken later).
      - 3 real photo faces (`pic-1` front, `pic-5` right, `pic-6` back);
        3 canvas-generated gradient-texture faces in the brand palette,
        one with the Logo's curl-mark path redrawn onto the canvas (same
        point data as the SVG, since a WebGL texture can't reference an
        SVG element directly).
      - Ambient + one directional key light (plus a low-intensity purple
        fill light from the opposite side) — materials are
        `MeshStandardMaterial` with light roughness/metalness, not flat
        `MeshBasicMaterial`.
      - Rotation is driven by `useScrollProgress` (same underlying
        `useScroll` primitive as Part D, not a second bespoke system),
        plus a `pointermove`-driven tilt (gated to
        `(hover:hover) and (pointer:fine)`, same convention as
        `GradientRibbon`'s mouse glow) and drag-to-spin via Pointer
        Events with `setPointerCapture`.
      - Real bug found and fixed during checkpoint testing: the initial
        drag ease-back used a flat per-frame multiplier (`offset *=
        0.94`) to decay back to the idle pose. That only decays at the
        intended rate if `useFrame` is actually ticking at ~60fps — measured
        empirically that it wasn't in the test environment (~8-12fps),
        so the offset barely moved even after several real seconds.
        Rewrote it as `Math.pow(base, delta)` (delta = real seconds since
        last frame, from `useFrame`'s own callback), which reaches the
        same real-world decay regardless of actual frame rate — verified
        by sampling the offset over time before and after the fix, not
        just eyeballing a screenshot.
      - Resting rotation angle tuned empirically, not guessed: the cube
        sits within the fold, so `useScrollProgress`'s 0-1 value is
        already partway through its range at rest (~0.45 at a 900px-tall
        viewport) rather than starting at 0 — measured this directly
        before picking the idle-rotation formula's constants, so the
        resting pose reliably shows a photo face at a 3/4 angle instead
        of whatever the raw math happened to land on.
      - Not verified in this sandbox: true 60fps on real hardware (the
        test environment's headless WebGL context runs well under 60fps
        as noted above — the delta-correct fix makes the *behavior*
        frame-rate-independent, but doesn't prove the frame rate itself
        is smooth on a real device/GPU) or real touch-drag on a physical
        touchscreen (Pointer Events unify mouse/touch/pen by spec, and
        `touch-action: none` is set on the canvas wrapper, but this was
        only exercised via synthetic mouse events here).

## Spike 2 continuation — dark mode + cube upgrade
**Status: Parts A/D bug fix/F-upgrade done. Part F still at go/no-go
checkpoint (now on the upgraded build) — checkpoint screenshots below,
pending user confirmation before calling it shipped.**

- [x] **Photo pool re-audit (blocking issue, resolved with user input).**
      6 more images had been dropped into `src/assets/photos/`
      (`afro-pic-7` through `12`) since the last pass, against a brief
      asking for "3 candidate photos." All 6 turned out to be
      identifiable, famous people (Lupita Nyong'o, Solange Knowles,
      Viola Davis, Oprah Winfrey, and others) photographed at real
      branded press/red-carpet events (SAG Awards, TIFF, etc. — event
      backdrops visible in frame) — the same publicity-rights/copyright
      problem already flagged for `afro-pic-4` last pass, just six more
      of it. None were used anywhere. Flagged to the user before
      proceeding rather than guessing; user chose to keep the photo pool
      at the 5 previously-vetted clean images (`pic-1/2/3/5/6`) and let
      the About page reuse one of the cube's photos (`pic-2`) rather than
      requiring a distinct 6th image.
- [x] **Part A — Dark mode (real toggle, not a stretch item this time).**
      `src/styles/useTheme.tsx` (`ThemeProvider` + `useTheme`) toggles a
      `data-theme="dark"` attribute on `<html>`; `variables.css` gained a
      `:root[data-theme="dark"]` block overriding only the base
      accent/neutral/shadow tokens (lighter/neon accent stops, near-black
      bg, bloom-style glow shadows) — `--gradient-accent` /
      `--gradient-ribbon` / `--gradient-accent-solid` were deliberately
      **not** redefined for dark, since they're declared once at `:root`
      as `var()` references and repaint automatically once the tokens
      they reference change (confirmed working, not just assumed).
      Toggle is a sun/moon icon (`ThemeToggle.tsx`) in the navbar,
      visible on both desktop and mobile (sits outside `.navLinks`, which
      is hidden below 900px, so it doesn't disappear on mobile).
      `document.startViewTransition` wraps the toggle for a smooth
      crossfade, tuned via `::view-transition-old/new(root)` in
      `global.css`; browsers without support just swap instantly — the
      toggle never blocks on feature detection. Every new visitor
      defaults to light regardless of OS `prefers-color-scheme`, per
      spec — the blocking inline script in `index.html` only applies
      `data-theme="dark"` if `localStorage` already has an explicit prior
      toggle, so a first-time visitor's initial paint is always light.
      **Two real hardcoded-white bugs found via actual dark-mode
      screenshots, not just a code read** (see CLAUDE.md Design System
      Notes for the general pattern this represents): the mobile sheet
      menu (`background: var(--color-white)`) and the frosted header-on-
      scroll (`color-mix(..., var(--color-white) ...)`) both ignored the
      theme entirely and stayed white-on-dark — both use `var(--color-bg)`
      now. Also fixed the same class of bug in `Contact.module.css`'s
      success card and icon-circle background (`.card`, `.iconCircle`)
      and the skip-link's focus state, all found via the same
      light/dark screenshot diff rather than a manual grep alone
      (grep found the literal, screenshots confirmed which ones were
      actually surface-background bugs vs. intentional white-on-gradient
      button text, which is correct as-is in both themes).
- [x] **Part D — Reload scroll bug (separate from the animation
      rework).** `history.scrollRestoration = "manual"` +
      `window.scrollTo(0, 0)` added to `main.tsx`, run once before React
      mounts — browsers restore prior scroll position on a hard reload by
      default, which `ScrollToTop.tsx` never covered (it only fires on
      in-app route changes via `useLocation`, not on a fresh page load).
- [x] **Part F — Cube upgrade to the new scope** (5 photo faces + rim
      glow + magnetic hover + entrance choreography, up from the earlier
      checkpoint's 3 photos + 3 gradient faces). `src/components/Cube.tsx`
      rewritten:
      - **5 real photo faces** (`pic-1` front, `pic-5` right, `pic-2`
        left, `pic-3` top, `pic-6` back) + **1 Logo face** (bottom) —
        the Logo face is a canvas-drawn "Nar" + stem + curl (same curl
        polyline as `Logo.tsx`/the SVG), not a repeated gradient panel.
      - **Center-crop-to-square in code** (`cropToSquareTexture`): every
        source photo is portrait-oriented, none square — each is drawn
        onto a 768px canvas via cover-fit math (scale by the larger of
        width/height ratios, let the overflow clip against canvas
        bounds) rather than stretched to fit, per the brief.
        `texture.anisotropy` set from `gl.capabilities.getMaxAnisotropy()`
        for sharper grazing-angle sampling on top of the existing
        `dpr={[1,2]}` + `SRGBColorSpace` sharpness fixes.
      - **Rim/edge glow**: a second, slightly-enlarged
        (`RoundedBoxGeometry(2.16,...)` vs. the base `2`),
        `BackSide`-rendered mesh sharing the same group/rotation as the
        main cube — the classic inverted-hull outline technique (its
        back faces are only visible in a thin silhouette band, occluded
        elsewhere by the main mesh's front faces via normal depth
        testing), textured with a brand-gradient canvas texture,
        additive blending, opacity driven by the hover-blend value
        (0 at rest → ~0.55 hovered). No custom GLSL — lower risk than a
        hand-written fresnel shader, same visual read.
      - **Magnetic hover + single blended state**: hover is tracked via
        `onPointerOver`/`onPointerOut` on the group (a ref, not React
        state, so it doesn't re-render), eased 0→1 each frame. That
        eased value does two things every `useFrame` tick, per the
        brief's "one shared state, not four competing transforms"
        requirement: boosts the existing mouse-tilt contribution
        (`hoverLean`, up to 1.8x) for the "leans toward cursor" feel, and
        drives `group.scale` up to 1.06. Rotation (scroll idle + mouse +
        drag) and scale (hover) are each computed once per frame and
        applied once, not as separate effects.
      - **Entrance**: the `<Canvas>` wrapper is now a `motion.div`
        (`opacity 0→1`, `y: 28→0`, `scale: 0.92→1`, 0.8s
        `cubic-bezier(0.16,1,0.3,1)`) inside `Cube.tsx` itself, so it
        animates in once the lazy-loaded chunk actually mounts — composes
        with (doesn't replace) Hero's existing `clipReveal` wipe on the
        outer `.art` wrapper. Respects `prefers-reduced-motion` (skips to
        the final state immediately).
      - Logo-face texture and rim-glow colors are theme-aware (regenerate
        via `useTheme()` when the user toggles dark mode), consistent
        with the "same components, both themes" requirement — verified
        in the dark-mode screenshot below.
- [x] **Checkpoint verification** (temporary local Playwright, same
      approach as the last pass — not a project dependency): `tsc -b`
      clean; zero console errors crawled across `/`, `/about`,
      `/contact`, `/contact?subscribed=1`, `/scan`, and a 390px mobile
      viewport (including opening the mobile sheet) in both themes.
      Screenshots confirm: light hero, dark hero, cube hover (rim glow +
      lean + scale visible), About page in both themes, mobile home +
      mobile menu in dark (post-fix), Contact success card in dark. Not
      yet verified: real 60fps/GPU behavior or a physical touchscreen
      drag (same caveat as the original Part F checkpoint — nothing
      about this pass's changes affects that gap either way).
- [ ] **Go/no-go decision on the upgraded cube — pending the user**, per
      the brief's own checkpoint instruction. Do not treat Part F as
      shipped until confirmed either way.

## Product recommendation feature — Prompt 1 of 4: Airtable data pipeline
**Status: done.** Data pipeline only — no scoring, quiz, or results UI
(Prompts 2-4). `api/products.ts` fetches Nya's Airtable catalog
(paginated, ~10min in-memory cache, serves stale on failure),
`src/lib/products/fieldMap.ts` + `schema.ts` normalize/validate it into a
typed `Product[]`, `dataSource.ts` exposes it via `getProducts()`, and
`/debug/products` (dev-only) renders the parsed catalog + normalization
report for verification. See CLAUDE.md "Product Data Pipeline" for full
details, the live-schema mismatches found, the corrected `.env.local`
Airtable vars (base ID was a mangled full URL path; table name didn't
resolve, switched to table ID), and the verified distinct tag values
Prompt 2 needs. Corrected an earlier (uncommitted-to-docs) plan to
generate recommendations via an LLM — matching is deterministic scoring
against tags instead, no `api/analyze.ts` involvement.
- Live catalog: 47 records fetched, 45 valid, 2 skipped (both missing
  the required `Product name` field).
- No image URL column exists yet in the live base (non-blocking — schema
  field is optional, Prompt 4 handles absence).
- **Production fix (post-ship):** `api/products.ts` crashed on Vercel with
  `FUNCTION_INVOCATION_FAILED` — its normalization import reached outside
  `api/` into `src/lib/products/`, which Vercel's Node function builder
  didn't trace into the Lambda bundle (confirmed working locally the whole
  time, since local testing used a general-purpose bundler that traces
  cross-directory imports fine — the gap was Vercel-builder-specific).
  Moved all server-side normalization code to `api/_lib/` so the function
  matches `api/subscribe.ts`'s working pattern (zero imports outside
  `api/`); the client keeps only a type-only import of `Product` (erased
  at compile time) plus its own lightweight response-shape validator.
- **Second production fix, same day:** after the `api/_lib/` move, a
  *different*, more specific crash surfaced —
  `ERR_MODULE_NOT_FOUND: Cannot find module '/var/task/api/_lib/schema'`.
  Cause: the project is `"type": "module"`, so Node's own ESM loader
  requires explicit `.js` extensions on relative imports; Vercel
  transpiles each `api/*.ts` file individually (not bundled) and doesn't
  add them. `tsc` didn't catch this because `moduleResolution: "bundler"`
  tolerates extensionless imports on the assumption something else
  resolves them — true locally (Vite), false for how Vercel packages
  functions. Fixed by adding explicit `.js` extensions to every relative
  import under `api/`. Also fixed `api/analyze.ts`'s identical
  cross-boundary import (never confirmed working in production, silently
  maskable by `analyzeHair.ts`'s fallback-on-failure behavior) by giving
  it the same treatment: a new `api/_lib/schemas.ts` holds a server-only
  subset of `src/lib/schemas.ts`. Verified with a purpose-built harness
  that transpiles each file individually (esbuild transform-only mode,
  which — unlike bundling — doesn't resolve/rewrite import specifiers) and
  loads the result with Node's real ESM resolver; confirmed as a faithful
  reproduction by checking it fails the same way against the old code
  (negative control) before confirming it passes against the fix. See
  CLAUDE.md "Server code boundary" for the full writeup.
- *(Note: `fieldMap.ts`/`schema.ts` referenced above moved to `api/_lib/`
  in that same-day fix — this status entry is left as originally written
  for the historical record; see the fix note directly above.)*

## Product recommendation feature — Prompt 2 of 4: Scoring engine
**Status: done.** Scoring only — no quiz UI, no results page (Prompts 3-4).
`src/lib/products/scoring.ts` exports a pure `scoreProducts(answers,
catalog): ScoredRecommendationSet` — hard sensitivity filters, then
weighted scoring (porosity > curl type > goals > frustrations > density >
budget > black-owned > EWG/sentiment tiebreakers), then top-3-per-category
selection with a brand-diversity cap, then progressive relaxation
(density → curl type → porosity, never sensitivities) when a category's
eligible pool is thin. All weights live in one exported `SCORING_WEIGHTS`
object. 14 Vitest cases pass (`src/lib/products/scoring.test.ts`),
including the two required profiles run against a real catalog fixture.
See CLAUDE.md "Product Scoring" for the full stage-by-stage writeup and
DECISIONS.md for the reasoning behind each major call.
- **Part A**: extended `FIELD_MAP`/`ProductSchema` for four
  previously-unmapped live columns — `"Best For Goals"` → `goals`,
  `"Frustrations"` → `frustrations`, `"Fragrance Free"` → `fragranceFree`
  (confirmed a checkbox), `"Key ingredients"` → `keyIngredients`
  (display-only). Goals needed a small alias table for two values that
  didn't match the quiz vocabulary (`"scalp health"` → `"scalp"`,
  `"heat or color damage"` → `"damage"`); frustrations matched exactly
  once lowercased. Live catalog re-verified same day: grown to 51 records
  (50 valid, 1 skipped for missing name+brand — a different row than
  Prompt 1's two skips, which appear to have since been fixed by Nya).
- **Real gap found while writing tests, not assumed**: Mousse (0/6) and
  Oil/Sealant (0/4) currently have zero protein-free products anywhere in
  the catalog — since relaxation never touches sensitivities, any
  protein-sensitive user gets a correctly-empty result for those two
  categories today. Caught by running the required Demanding test profile
  against the real fixture rather than synthetic data; documented in
  DECISIONS.md alongside the pre-existing 2A/2B/2C tagging gap.
- **A type-design call worth flagging**: the brief's signature referenced
  the existing `QuizAnswers`/`RecommendationSet` types, but those belong
  to the old placeholder quiz/mock and can't hold what this needs
  (ranked frustrations, match reasons, relaxation flags). `scoring.ts`
  defines its own `DiagnosticAnswers`/`ScoredRecommendationSet` instead —
  Prompt 3 will need to produce a `DiagnosticAnswers` from the real quiz,
  and two of its fields (`budgetMax` as a plain number, `blackOwnedPref`'s
  exact literal casing) were inferred rather than given verbatim by this
  prompt. Flagged in DECISIONS.md for Prompt 3 to confirm against the
  real quiz JSX.
- Next: Prompt 3 (port the real 9-question quiz).

## Product recommendation feature — Prompt 3 of 4: Real diagnostic quiz port
**Status: done.** Quiz UI only — no results page, no `scoreProducts()`
wiring (Prompt 4). Nya's real 9-question quiz
(`src/features/scanner/quiz/`) replaces the old placeholder flow (2
hair-context questions + a 10-question mock quiz) entirely. See CLAUDE.md
"Diagnostic Quiz UI" for the file-by-file breakdown and how to add/edit a
question, and DECISIONS.md's "Diagnostic quiz UI (Prompt 3)" section for
the full reasoning writeup.
- **One config-driven `QuestionRenderer`** replaces Nya's five separate
  layout components (`IconGrid`/`CurlGrid`/`VisualSingle`/`ChipMulti`/
  `RankCards`) — driven by `selectionMode` (single/multi/ranked) and
  `layout` (grid/list/chips) config per question. Ranked selection (tap
  to add a numbered badge, tap again to remove and renumber, an
  `exclusiveValue` like `"nothing"`/`"none"` clears everything else) uses
  the same toggle mechanics as plain multi-select — they only differ in
  what gets rendered.
- **Flow reordered**: quiz now comes before the photo (previously the
  reverse), matching Nya's "answer questions, then upload a photo" shape.
  `STEP_ORDER` is now `["intro", "quiz", "photo", "analyzing"]`.
- **Dropped the 2 hair-context questions** (natural state / product in
  hair) — they only ever fed `api/analyze.ts`'s photo vision pipeline,
  which isn't wired into this flow at all. `NaturalStateAnswerSchema`/
  `ProductAnswerSchema` stay in `src/lib/schemas.ts` for that separate,
  still-dormant pipeline; the quiz-specific `HairContextSchema` and the
  old flat `QuizAnswersSchema`/`QuizQuestionSchema` were deleted as
  genuinely dead code, along with the old mock 10-question quiz JSON and
  `dataSource.ts`'s `getQuizQuestions()`.
- **Confirmed the two literals Prompt 2 flagged as inferred**:
  `budgetMax` bucket mapping (`budget`→10, `mid`→25, `premium`→50,
  `any`→null) and `blackOwnedPref`'s exact casing — corrected in
  `scoring.ts` from a guessed `"yes_always"/"no_preference"` to the real
  quiz's `"yes"/"mixed"/"no_pref"`, so it passes through with no
  translation layer, same as every other scored dimension. New
  `toDiagnosticAnswers.ts` (`QuizAnswers → DiagnosticAnswers`, typechecked
  against `scoreProducts()`'s signature, not calling it) is what Prompt 4
  will call.
- **`PhaseBar` not ported** — Nya's three phase names feed the existing
  `ScanProgress` bar's single active-section label (now shown next to a
  `unit / total` counter, not all 4 section names side by side — they're
  full sentences, and the bar lives in a 480px-max-width column).
- **Real bug found and fixed during verification**: reordering quiz-before-
  photo exposed a sessionStorage bug where refreshing on the photo step
  bounced the user back into the last quiz question instead of leaving
  them on photo, because the persisted quiz blob was frozen at its last
  quiz-step snapshot. Fixed by clearing the persisted blob the moment the
  user reaches "photo" — verified via a scripted refresh at both points
  (mid-quiz restores; photo-step resets to intro cleanly).
- **Verification**: `npm run typecheck` clean; `npx vitest run` — 18
  tests pass (14 existing scoring tests + 4 new `toDiagnosticAnswers`
  tests). Full flow walked end-to-end via a temporary local Playwright
  install (same approach as the design sprint — not a project dependency)
  across light/dark themes and desktop/390px mobile viewports, zero
  console errors in any combination; screenshots confirmed the
  3-column layouts (curl_type, black_owned_pref) collapse to 2 columns at
  390px, ranked selection's add/remove/renumber and "nothing" exclusivity
  both work correctly, and dark mode holds (no hardcoded-white
  regressions) throughout the whole quiz.
- Next: Prompt 4 (results page + wiring `scoreProducts()` into the real
  flow, replacing the mock `getRecommendations()`).
