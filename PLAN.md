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

## Spike A — End-to-end results (Day 1 of 2)
**Status: done.** The product works end to end for the first time: quiz
→ profile summary → photo (optional) → real scored recommendations from
the live Airtable catalog. See CLAUDE.md's "Product Data Pipeline" and
new "Scanner Flow: Profile Step, Photo Honesty, Results" sections for
the file-by-file breakdown, and DECISIONS.md's "Spike A" section for the
reasoning behind the prefetch timing, the five locked edge cases, the
photo-honesty fix, and how this was verified without a `.env.local` in
this sandbox.

- **Part A — Real data wiring.** `dataSource.ts`'s `getRecommendations()`
  now fetches the live catalog via `getProducts()` and runs the real
  `scoreProducts()` — no mock data left in this path. `getProducts()`
  caches its own promise so repeat callers share one request.
  `prefetchProducts()` (new) is called from `ScannerRoute.tsx` the
  moment the quiz starts, not at the results page — see DECISIONS.md for
  why precomputing the score itself was deliberately not done. The old
  placeholder `RecommendationSet`/`ProductPick`/`RecommendationCategory`
  types (`src/lib/schemas.ts`) and the mock JSON
  (`src/lib/mock/recommendations.json`) were retired — nothing else
  referenced them once `ScanResults.tsx` moved onto the real
  `ScoredRecommendationSet` type.
- **Part B — Profile summary step (new).** `ProfileStep.tsx`, inserted
  into `STEP_ORDER` between "quiz" and "photo" — ports Nya's "Your Nari
  profile / Nari's got you, sis. 🌿" done-screen, restyled in Nari
  tokens, both themes, showing every answered question's human label
  (`quiz/quizLabels.ts`, new shared helper — also used by the results
  page's "why we picked this"). Two actions per her design (Continue →
  photo, Start over → confirm then clear everything) plus a standard
  Back for consistency with the rest of the flow. `scannerReducer.ts`
  gained a `RESET` action and a simplified `BACK` case (leaving
  "profile," not "photo," is now the special case that returns to the
  quiz's last question).
- **Part C — Photo step honesty fix (launch-blocking).** Grepped for and
  corrected every instance of the "analyzed and immediately deleted"
  claim (`CTA.tsx`'s landing trust line, `PhotoStep.tsx`'s copy) — none
  of it was true, since `api/analyze.ts` still isn't wired into this
  flow. Also fixed a second, adjacent stale claim in `Features.tsx`
  ("Snap three quick photos" — the flow has taken one optional photo for
  a while now). The photo step is now explicitly optional: a "Skip for
  now" button (new `SKIP_PHOTO` reducer action) advances cleanly with a
  null photo, and "Take a photo" (camera) / "Choose a photo" (file
  picker) are two distinct buttons (`PhotoCapture.tsx`'s `capture` prop
  is now optional instead of hardcoded), not one input that jumps
  straight to the camera with no way to pick an existing shot.
- **Part D — Results page.** `ScanResults.tsx` rebuilt to render a real
  `ScoredRecommendationSet` as routine-ordered tabs (Shampoo →
  Conditioner → Leave-in → Cream → Mousse → Oil/Sealant — already
  `scoring.ts`'s own category order, no re-sorting needed) with a count
  badge per tab, first tab open by default. Product cards show name,
  brand, category, price (omitted if null), buy link (omitted if
  absent), image if a URL exists (none do yet), and an expandable "why
  we picked this" that humanizes `scoring.ts`'s raw `matchReasons` into
  plain language. All five locked edge cases implemented and
  screenshot-verified against live data — see DECISIONS.md. One bug
  found and fixed during verification, not anticipated up front: a
  category that's both relaxed and still empty rendered a
  self-contradictory "closest match" banner next to "no matches" —
  fixed with a one-line guard.
- **Part E — Documentation.** DECISIONS.md and CLAUDE.md both updated;
  this entry.
- **Verification.** `npm run typecheck` clean; all 18 existing tests
  (14 scoring + 4 toDiagnosticAnswers) still pass, untouched. Full flow
  walked end to end twice (once with a photo, once skipping) in both
  light/dark and desktop/390px, via a temporary local Playwright install
  (not a project dependency, removed after) — zero console errors across
  every run. **This sandbox has no `.env.local`**, so `api/products.ts`
  couldn't literally be invoked as a Vercel function here; instead, the
  live Airtable catalog was pulled via the Airtable MCP connector and
  run through the actual `api/_lib/schema.ts` normalization code (a
  temporary, unshipped Vitest file), then served to the real running app
  through a temporary, gated Vite dev-middleware (reverted immediately
  after) — so every screenshot reflects genuine live Airtable data
  through the real normalization logic, not mocks or hand-written
  fixtures. This also surfaced that the checked-in scoring test fixture
  (`__fixtures__/catalog.json`, 2026-08-07) has drifted from live data
  (18/50 products changed, mostly Nya widening porosity tags) — flagged
  in DECISIONS.md, deliberately left unfixed since updating a Prompt 2
  test fixture is out of this spike's scope and the existing tests still
  pass against it as-is.
- **Handled crudely, flagged for Spike B**: the results page's tabs are
  plain buttons with correct ARIA roles/states but no roving-tabindex
  arrow-key navigation; "why we picked this" only humanizes
  `scoring.ts`'s existing matchReasons (no sensitivity-driven callout
  like "protein-free," since hard filters don't produce a matchReason
  for what they excluded); the actual Vercel Lambda transport for
  `api/products.ts` (auth, cache, stale-fallback) is unverified in this
  sandbox, same pre-existing gap Milestone 6 already noted for
  `api/analyze.ts`.
- Next: Spike B (Day 2) — thorough error handling, automated tests for
  the new UI, and a review pass.

## Spike B — Hardening, Tests & Scoring Transparency (Day 2 of 2)
**Status: done.** See CLAUDE.md's new "Spike B" section for the file-by-file
breakdown and DECISIONS.md's "Spike B" section for the full reasoning
behind every piece, including the review pass's 5 refactor candidates.

- **Part A — Error handling.** Catalog-fetch failures (cold cache
  included) now show specific, actionable copy with a real retry (verified
  via mocked-fetch tests in `dataSource.test.ts`, not just read); quiz
  sessionStorage resume was verified end-to-end rather than trusted
  (`scannerReducer.test.ts`), including a corrupted-blob case; an
  all-categories-empty results page now shows a distinct "loosen your
  filters" banner instead of six copies of the per-category message; a
  real "Something went wrong" copy violation was found and fixed in
  `useSubscribe.ts`; a real uncaught-rejection bug was found and fixed in
  the photo-capture path (an undecodable HEIC on a non-Safari browser
  silently killed the compress step with no user-visible error — see
  DECISIONS.md); the `/scan/results` deep-link-with-no-state case was
  already handled from Spike A, confirmed via a new render test.
- **Part B — Automated tests (none existed before this pass).** 82 tests
  across 6 files: extended scoring guarantee tests (porosity/sensitivity
  honesty, no fabricated products, relaxation order, determinism), new
  Airtable normalization tests (`api/_lib/schema.test.ts`), a new
  quiz→scoring "contract" test that actually calls `scoreProducts()`
  rather than just type-checking the boundary, new scanner-persistence
  tests, new catalog-fetch-failure tests, and new results-page render
  tests. `vite.config.ts` gained a `test` block (jsdom + jest-dom matchers
  via a new `src/test/setup.ts`) so `npm test` needs no CLI flags anymore.
- **Part C — Scoring transparency for users.** Every product card shows a
  compact ✓/✗ checklist against up to 5 dimensions the user actually
  expressed a preference on (porosity, curl type, sensitivities, budget,
  black-owned) — matches first, deliberately no numeric score anywhere
  (see DECISIONS.md). New `buildMatchChecklist()` export in `scoring.ts`;
  `ScannerRoute.tsx` now passes `answers` through to `/scan/results`'s
  router state alongside `recommendations` so the checklist has something
  to compare against.
- **Part D — Scoring debug view.** `/debug/scoring`, production-accessible,
  gated by `api/debug-scoring.ts` checking `?key=` against
  `process.env.ONYAPROJECTX` server-side (never a client-bundled secret);
  a wrong/missing key renders the literal same `NotFound` component the
  wildcard route does. Comparison tables reuse the real pipeline's
  internal functions via three new debug-only `scoring.ts` exports
  (`scoreProductBreakdown`, `debugHardFilterExclusions`,
  `debugScoreCategory`) rather than a second, driftable implementation.
  4 built-in example profiles, each verified against the real catalog
  fixture to actually demonstrate what its name claims; query-param
  overrides for ad hoc checking. **Not yet verified against a real Vercel
  deploy** — this sandbox has no way to actually deploy and hit the
  production key gate; see DECISIONS.md's open questions.
- **Part E — Two small fixes.** Dark mode is now the default for a
  first-time visitor (inverted from the prior light-first default, per
  Nya); the results-page email capture's copy no longer promises a
  personalized routine email that was never built ("Join the waitlist for
  launch updates" instead of "Get your full routine") — logged as a real,
  scoped post-launch feature in DECISIONS.md rather than built now.
- **Part F — Review pass.** Top 5 findings written to DECISIONS.md's "Post-
  launch refactor candidates": a stringly-typed `matchReasons` contract
  between `scoring.ts` and `ScanResults.tsx`; `ScannerRoute.tsx` as a God
  component (and the app's most bug-prone file); this spike's own
  checklist feature adding a second, parallel humanization code path
  alongside the first finding; `api/_lib/schemas.ts`'s hand-maintained
  duplication of `src/lib/schemas.ts`; and duplicated test factories in
  `scoring.test.ts`. Nothing refactored beyond what Parts A-E already
  needed — see DECISIONS.md for the "why not now" rationale (two of three
  production incidents so far came from moving files).
- **Verification**: `npm run typecheck` clean; all 82 tests pass (18
  pre-existing + 64 new). Full flow driven end to end against the actual
  running app (temporary local Playwright install, same
  not-a-project-dependency approach as prior passes; a temporary, gated
  Vite dev-middleware served the checked-in catalog fixture at
  `/api/products` since this sandbox has no `.env.local` — reverted
  immediately after, same pattern Spike A used) across light/dark themes
  and desktop/390px: dark-by-default confirmed, light-mode toggle
  confirmed still rendering correctly, full quiz → profile → photo (both
  an invalid-file rejection and skip) → results walked with zero console
  errors, the results-page checklist and corrected email copy both
  confirmed rendering, the catalog-fetch failure path confirmed showing
  the specific error copy with a working "Try again," and the
  `/debug/scoring` no-key case confirmed rendering byte-identical to a
  genuinely nonexistent route. **Two real bugs were found and fixed by
  this live verification pass, not anticipated from reading the code**:
  the debug-scoring auth check trusted `res.ok` alone (see Part D above);
  and `Hero.tsx`'s subline still claimed "Three photos..." — the same
  class of honesty bug Spike A's photo-step fix addressed elsewhere, just
  never checked in this specific file. Both documented in DECISIONS.md.
  **Not verified**: `/debug/scoring` against a real production deploy (no
  deploy target in this sandbox), and the actual Vercel Lambda transport
  for `api/debug-scoring.ts`/`api/products.ts` itself (same pre-existing
  category of gap already noted for `api/analyze.ts`) — `ONYAPROJECTX`
  must be set in Vercel before the gate will open post-deploy.

## Final Spike — Results Email, Cube Photos, About Page
**Status: Parts A, B, and C done. Deploy + live verification still
pending (see below).** See CLAUDE.md's new "Results Email" section and
DECISIONS.md's "Final Spike" section for full detail; this is the status
summary.

- **Part A — Results email.** New `api/send-results.ts` (+
  `api/_lib/resultsSchema.ts`, `src/lib/useSendResults.ts`) emails a user
  their actual scan recommendations (all 6 categories, no trimming, plain
  HTML + text fallback) and, only after a confirmed send, logs to a new
  `Results` sheet tab and joins the same waitlist `api/subscribe.ts`
  writes to (one-directional). Replaces the old waitlist-only
  `EmailCapture` on `ScanResults.tsx` with `SendResultsCapture` — email
  field only, plain-language success/loading/error states, a
  `results_emailed` analytics event on success. `scan_completed` was
  already firing from `ScannerRoute.tsx` before this spike — confirmed,
  not duplicated.
  - 82 pre-existing tests still pass unmodified; 6 new tests for
    `SendResultsRequestSchema`. `npm run typecheck` clean.
  - Verified via the esbuild-transform + Node-ESM-resolver harness (same
    one that caught the original two production import bugs — see
    CLAUDE.md "Server code boundary") — confirms the new endpoint's
    `.js`-suffixed relative import resolves the way Vercel's per-file
    transpilation would produce it.
  - **Not verified**: an actual send/receive against live Resend/Google
    credentials — this sandbox's env files are dotless
    (`env.local`/`env.example`, not `.env.local`/`.env.example`), so
    neither Vite nor a local `vercel dev` would load them; a real email
    send, a deliberate-failure check, and confirming both sheet rows
    appear are the user's to run post-deploy, per this spike's own
    verification checklist. `GOOGLE_RESULTS_RANGE` needs to be set in
    Vercel (defaults to `Results!A:E` locally if unset).
- **Part B — Cube photos.** All 12 newly-dropped images
  (`src/assets/photos/images/`) were visually inspected before use — the
  first photo drop in this project that needed **zero** exclusions (unlike
  the two prior drops, both of which turned out to be identifiable public
  figures at press events). 5 faces swapped in: `image3` (front), `image2`
  (left), `image9` (top), `image6` (right), `image11` (back); `image1`
  reserved for the About page; `image4/5/7/8/10/12` unused/available.
  **Real gap found, not fixed**: none of the 12 include a man, though
  Nya's direction asked for a mix that does — flagged for a future photo
  drop.
- **Part B — Cube curl mark.** Diagnosed the "too close to the stem"
  complaint as a real, measurable overlap (the old formula could position
  the curl's bottom edge ~12px *past* the stem's top edge at the cube's
  actual size, not just tight spacing) and fixed the positioning approach
  (gap measured from the shape's own bottom edge, not a blind center
  offset) — applies to whichever variant ships. Generated and screenshotted
  4 parametric curl variants (open loop CW, its literal mirror, a
  self-intersecting limaçon double-loop closest to ➰, and a loose loop with
  a long tail), rendered through the exact production draw code at both
  full texture resolution and the cube's real ~170px on-screen face size,
  published as an artifact for review. **Variant C (double loop) picked
  and applied** — `CURL_PATH_2D` + the positioning formula both updated in
  `Cube.tsx`; `tsc -b` clean, zero errors driving the real landing page
  post-change. `Logo.tsx`/the site-wide wordmark were never touched
  (cube-only scope, as specified).
- **Part C — About page.** Photo swapped to `image1` (same rights check,
  cleared). Heading changed from "About Nari" to just "Nari" (the small
  "About" eyebrow above it already said "About," so the H1 repeating it
  was redundant) with more vertical room between the eyebrow and the H1
  (`--space-sm` → `--space-lg`) — the brief flagged the "which two
  elements" question as ambiguous and asked for a reported interpretation;
  see DECISIONS.md for the reasoning and the alternative reading
  considered. Nav "Get updates" link (desktop + mobile sheet) verified
  already pointing at `/#mailing` — fixed in an earlier pass (Spike 2 Part
  C), confirmed not regressed, no change needed.
- **Verification**: `npm run typecheck` clean; full test suite (88 tests:
  82 pre-existing + 6 new) passes. Full quiz → skip photo → results flow
  driven for real (temporary gated Vite dev-middleware serving the checked-
  in catalog fixture, same pattern as Spikes A/B, reverted after) across
  both themes and desktop/390px mobile — zero console errors in any
  combination; the new email form's success state, failure state (via a
  second temporary middleware pass simulating a Resend failure), and both
  themes/viewports all screenshot-confirmed. About page and the landing-
  page cube (new photos + new curl mark) also driven live, zero console
  errors, both themes. **Not verified**: an actual send/receive against
  live Resend/Google credentials (this sandbox's env files are dotless —
  see CLAUDE.md) and a real Vercel deploy — both are the user's to run,
  per this spike's own verification checklist.

## Final Spike — Scoring Engine Update (P1 of 4)
**Status: Done.** Four prompts split the remainder of the Final Spike;
this is the first — scoring logic only, no UI changes (P2 handles the
flow, P3 the results page, P4 content edits). See CLAUDE.md's "Product
Scoring" section and DECISIONS.md's "Final Spike — Scoring Engine Update
(P1 of 4)" for full detail; this is the status summary.

- **Part A — Ranking reorder, per the CEO/hair expert.** New priority
  order in `SCORING_WEIGHTS`: porosity → goals → frustrations (still
  rank-weighted 3x/2x/1x) → density → budget → black-owned → curl type
  (now last). Curl type dropped out of `requiredDimensionsFor`/
  `RELAXATION_ORDER` entirely — it's a pure weight now, never a hard
  eligibility gate; porosity and density remain hard requirements with
  the existing progressive relaxation (density first, then porosity,
  never sensitivities). No "clean formulation" bonus was added for
  undeclared sensitivities — considered and explicitly rejected (some
  users genuinely benefit from protein/silicones/etc.). The exported
  `relaxedConstraints` type shape was deliberately left untouched
  (still allows `"curlType"`, which now simply never appears at runtime)
  specifically to avoid touching `ScanResults.tsx`/`useSendResults.ts`/
  `api/_lib/resultsSchema.ts`/`api/send-results.ts` — see DECISIONS.md.
- **Part B — Mineral oil filter.** Checked and confirmed already fully
  wired as of the 2026-08-29 data pipeline fixes pass — no code change
  needed; verified via the existing passing test block rather than
  assumed.
- **Part C — Styles scoring (new).** The 5 "Style" catalog rows are now
  scored via a dedicated `scoreStyle`/`buildStyleRecommendations` path,
  returning the top 2 on a new `styles` field on `ScoredRecommendationSet`.
  `notes` is never read for scoring — display-only, per the brief. New
  `debugScoreStyles` export (mirrors the existing
  `debugHardFilterExclusions`/`debugScoreCategory` pattern) powers the
  tests directly. **Correction, P1 follow-up:** the frustration direction
  originally shipped here (inverted — a style's frustration tag treated
  as a risk it causes) was wrong, per the CEO's direct correction, and has
  since been reverted to positive (same direction as products); the
  neutral goal baseline mentioned below was also removed as a result. See
  the "P1 follow-up" entry further down and DECISIONS.md for the full
  story — left in place here as the historical record of what originally
  shipped.
- **Part D — `length retention` → `growth` alias.** Added to
  `GOAL_ALIASES` in `api/_lib/schema.ts`. The catalog fixture's one
  affected row was hand-updated to the post-alias value rather than
  re-pulled live (this sandbox's env files are dotless — no real
  `/api/products` fetch was possible here). `valueDrift.goals` confirmed
  clean afterward via an updated `schema.test.ts` case.
- **Part E — Tests and docs.** 109 tests passing (up from 97): new/updated
  coverage for curl type no longer excluding products, porosity/density
  still excluding, mineral-oil enforcement (pre-existing, re-verified),
  style frustration inversion + rank-weighting, the no-goals neutral
  baseline, and styles never being excluded by sensitivities. `npm run
  typecheck` clean. CLAUDE.md and DECISIONS.md both updated; this PLAN.md
  entry is the third leg.
- **Report (per the original brief, now superseded — see the P1 follow-up
  below for the corrected numbers): top-2 styles for a user whose top
  frustrations are dryness and frizz** — "Braids/Protective Style with
  Added Hair" (26.0, neutral baseline) and "Blow Out (& Afro)" (0.0).
  "Wash and Go" (tagged dryness + frizz — exactly this user's top two)
  landed dead last at -50.0 under the (since-reverted) inversion.
- **Known side effect, not in scope to fix:** `/debug/scoring`'s built-in
  `"relaxation"` demo profile (`ScoringDebug.tsx`) is now mislabeled — its
  comment claims it triggers curl-type relaxation, which is no longer
  possible. Flagged in DECISIONS.md's "Open questions" for P2/P3 or a
  standalone fix; left untouched here since it's a UI file outside this
  prompt's scope. Still true as of the P1 follow-up below.

## Final Spike — Scoring Engine Update, P1 follow-up (styles frustration correction)
**Status: Done.** The CEO (domain expert) corrected a wrong assumption
in P1's styles scoring: frustrations on styles mean the same thing they
mean on products (problems the style HELPS ADDRESS), not problems it
causes — she tags styles with the frustrations they solve and *omits* a
tag where a style risks causing that problem instead. See DECISIONS.md's
"Styles frustration scoring correction" for the full reasoning; this is
the status summary.

- **Reverted the inversion.** `scoreStyle` now scores frustration overlap
  POSITIVELY, same rank weighting as products (#1 ~3x, #2 ~2x, #3 ~1x).
  Extracted two shared functions, `scoreGoalOverlap` and
  `scoreFrustrationOverlap`, used by both `scoreStyle` and
  `computeScoreBreakdown` (products) — a structural safeguard so the two
  can't silently diverge in direction again the way they did the first
  time.
- **Removed the neutral goal baseline** (`STYLE_NEUTRAL_GOAL_BASELINE`).
  Its only justification (protecting a goal-less style from being
  structurally guaranteed last place under inverted scoring) no longer
  applies now that frustrations score positively. Numeric check: the
  live catalog currently has zero styles with an empty `goals` array (the
  CEO has since tagged goals on every style row, including the one that
  originally needed the baseline), so it was already fully inert before
  removal — see DECISIONS.md for the full numbers.
- **Re-pulled the live catalog for real.** The original P1 pass believed
  live Airtable access wasn't possible in this sandbox and hand-edited
  the fixture instead; that belief was wrong (it was true only for
  automatic loading via Vite/`vercel dev`, not for manually sourcing
  `env.local` and calling the Airtable API directly). This pass did a
  genuine live pull — 62 records, same count as before, 0 skipped, 0
  unmapped fields. One new value-drift finding: goals value `"tehnique"`
  (likely a typo for the already-real `"technique"` quiz value) now
  appears on all 5 style rows — flagged in DECISIONS.md's Open Questions,
  deliberately not aliased (an alias table entry would mask what looks
  like a data-entry typo rather than get it fixed at the source).
- **Tests updated**: the "ranks lower" assertion replaced with "ranks
  higher"; the neutral-baseline test replaced with a synthetic-style test
  (no live example exists anymore); added a test confirming the shared
  match-reason format/direction can't silently revert to the old
  "caution:" wording. All 109 tests still passing, `npm run typecheck`
  clean.
- **Report (corrected): top-2 styles for a user with frustrations
  [dryness, frizz] and goals [moisture, definition]** — **"Wash and Go"
  (102.0)** and **"Twist/Braid Out & Rod Set" (56.0)**. Wash and Go —
  tagged for exactly this user's two goals and both frustrations — now
  correctly ranks first, the direct opposite of the previous (wrong)
  result. Full ranking table in DECISIONS.md.

## Final Spike — Flow Reorder & Review Screen (P2 of 4)
**Status: Done.** Scan flow only — no results-page changes (P3), no
content/copy edits outside the photo step and the new review screen (P4
handles the rest). See CLAUDE.md's "Scanner Flow: Photo, Quiz, Review,
Results" section and DECISIONS.md's "Final Spike — Flow Reorder & Review
Screen (P2 of 4)" for full detail; this is the status summary.

- **Part A — Reorder.** `STEP_ORDER` is now `["intro", "photo", "quiz",
  "review", "analyzing"]` (was `["intro", "quiz", "profile", "photo",
  "analyzing"]`) — photo moved from after the quiz to right after the
  intro, per the CEO's direction. The old "profile" step/file was renamed
  "review" throughout (`ProfileStep.tsx` → `ReviewStep.tsx`, `StepId`,
  the reducer's quiz↔review boundary special-casing, `ScanProgress`'s
  section label). `ScanProgress.tsx`'s unit math updated: photo is now
  unit 1 of 10, each quiz question offset by 1, review/analyzing show the
  full bar under a new "Review your answers" label — `TOTAL_PROGRESS_UNITS`
  itself unchanged (still `QUIZ_QUESTION_COUNT + 1`). The mid-quiz
  interstitial's position (`INTERSTITIAL_AFTER_INDEX`, still `6`) needed
  no change — confirmed, not assumed, via live screenshots — since it's
  about position within the 9-question sequence, unrelated to where the
  photo sits. sessionStorage persistence, the persistent `ScanBackground`,
  and Back-preserves-answers were all preserved without rebuilding — the
  one persistence special case that moved was the "clear the stale quiz
  blob" effect, now firing on reaching "review" instead of "profile" (the
  photo step itself needs no equivalent effect anymore, since it now sits
  *before* the quiz, so there's no stale blob to bounce back from yet).
- **Part B — Photo step copy.** "(optional)" dropped from the heading
  ("A photo of your hair"); "Skip for now" stays — framing change, not a
  capability change. New body copy given by the brief, used as specified:
  "Full photo analysis is coming soon and will help Nari tailor style
  recommendations. For now, your recommendations primarily come from your
  quiz answers." Both capture paths (take a photo / choose a photo) were
  already implemented as distinct actions from Spike A and needed no
  change.
- **Part C — Review screen (new).** `ReviewStep.tsx`, read-only,
  heading "Here's what you told Nari" / subtext "Take a look and fix
  anything that looks incorrect before we build your recommendations." —
  no em dashes, matching the brief. Lists all 9 questions with
  human-readable labels via `quiz/quizLabels.ts`; a `ranked` answer
  (frustrations) is now numbered by priority order
  ("1. Breakage & shedding   2. Constant dryness   3. ..."), a new
  capability added to `formatAnswerDisplay` for this screen. No photo
  shown (it feeds nothing — showing it would imply otherwise). No inline
  editing or step-jumping — Back (already fully answer-preserving since
  Prompt 3) is the only way to fix a wrong answer; inline editing across
  all 9 question types was considered and explicitly deferred as the
  single largest, lowest-payoff item in this prompt's scope — see
  DECISIONS.md.
- **Part D — Documentation.** CLAUDE.md's old "Scanner Flow: Profile
  Step, Photo Honesty, Results (Spike A)" section reworked into "Scanner
  Flow: Photo, Quiz, Review, Results," with a new "How to add or reorder
  a scanner step" how-to; DECISIONS.md gained a new top-level section for
  this prompt's reasoning; this PLAN.md entry is the third leg.
- **Verification.** `npm run typecheck` clean; all 109 tests pass (106
  unmodified + 3 in `scannerReducer.test.ts` updated for the "review"
  rename, same assertions). Full flow driven end to end twice (once
  taking a real photo, once skipping) across light-desktop (1280×900) and
  dark-mobile (390×844) via a temporary local Playwright install (not a
  project dependency, removed after) against a temporary gated Vite
  dev-middleware serving the checked-in catalog fixture (this sandbox has
  no `.env.local` — same workaround as every prior spike, reverted
  immediately after) — zero console errors in any run. Scripted
  assertions (not just visual inspection) confirmed: no "optional" text
  anywhere on the photo step; the progress bar's exact label/unit sequence
  at the photo step, mid-quiz, the interstitial, and the review screen;
  the ranked-frustrations numbering; Back from review restoring quiz
  question 9/9 with its answer still selected (checked via `data-selected`
  in the DOM); a mid-quiz refresh restoring in-progress answers; a
  photo-step refresh (after capturing a photo) resetting cleanly to the
  intro with no photo restored; and a full run through to real scored
  results in both themes/viewports, confirming this prompt's flow changes
  didn't disturb the scoring/results handoff.
- Next: P3 (results page) and P4 (content/copy edits — cube image, quiz
  density wording, About page, em dash removal elsewhere, home page
  sample result).

## Final Spike — Results Page Styles & Categories (P3 of 4)
**Status: Done.** Results page only — no flow or scoring-priority
changes (those were P1/P2). See CLAUDE.md's "Product Scoring" and
"Results page" sections and DECISIONS.md's "Final Spike — Results Page
Styles & Categories (P3 of 4)" for full detail; this is the status
summary.

- **Part A — Typo alias.** `api/_lib/schema.ts`'s `GOAL_ALIASES` now
  maps both `"tehnique"` (the live Airtable typo on all 5 Style rows) and
  `"technique"` to `"technique"`, so the goal matches today and keeps
  matching once the CEO corrects the spelling in Airtable — no deploy-
  timing dependency either way. Flagged as temporary in both the code
  comment and DECISIONS.md's open questions; the checked-in catalog
  fixture was hand-patched to reflect the same normalization.
- **Part B — Gel category, fixed at the root.** `scoring.ts`'s hardcoded
  `CATEGORIES` const is gone, replaced by `deriveCategories(catalog)`:
  categories are now whatever the catalog actually contains (minus
  "Style"), ordered per a known-category display-order hint with
  anything unrecognized appended alphabetically after. This is why "Gel"
  (8 real products) was invisible before — a hardcoded list silently
  drops any category Nya adds until a developer notices — and why the
  fix is category-agnostic going forward, not just "Gel" added as a 7th
  literal. `ScoringDebug.tsx` updated to call the same function against
  its own loaded catalog, so the debug view and the real results page
  can never show different category lists for the same data.
- **Part C — Styles strip.** Renders the top 2 styles as a card row below
  the product tabs (never another tab, never above the products) —
  `StylesStrip`/`buildStyleMatchLine` in `ScanResults.tsx`, new
  `.stylesSection`/`.styleCard`/etc. rules in `ScanResults.module.css`.
  Layout picked by the CEO from 3 generated options (card row / tinted
  panel / compact list rows), screenshotted at desktop/mobile ×
  light/dark via a temporary dev-only harness (deleted after the
  decision) — she chose the card row, which reuses `ProductCard`'s exact
  hairline-border/shadow/hover-lift convention. Renders nothing at all
  (not an empty-state message) when there are 0 styles; the "Keep in
  mind" notes line is omitted entirely, no orphaned heading, for the 2
  live styles that have none. Match line is UI-only (`ScanResults.tsx`),
  reusing `scoreStyle`'s existing `matchReasons` — no new `scoring.ts`
  exports, and `notes` remains display-only, never read for ranking.
- **Part D — Product card match text.** Verified, not changed: confirmed
  live (crafted "2b" profile, a curl type with zero tagged catalog
  products) that a product can show an honest "✗ not your curl type"
  next to a real "✓ your porosity" without reading as broken, now that
  curl type is a pure weight rather than a hard requirement (P1).
  `buildMatchChecklist` needed no change — it was already dimension-
  agnostic to whether a dimension happened to be a hard filter.
- **Part E — Documentation.** CLAUDE.md's "Product Data Pipeline" gained
  a note on category derivation; DECISIONS.md gained a new top-level
  section for this prompt's reasoning plus a continuation of "Open
  questions" resolving two previously-flagged items (the typo, the
  notes-less styles) and logging one new one (remove the dual-spelling
  alias once Airtable is confirmed fixed); this PLAN.md entry is the
  third leg.
- **Verification.** `npm run typecheck` clean; all 113 tests pass (109
  pre-existing + a new 4-test block in `ScanResults.test.tsx` covering
  the styles strip's 2/1/0-style and styles-field-absent cases). Full
  results page driven end to end via a temporary local Playwright
  install (not a project dependency, removed after) against a temporary
  harness that ran the real `scoreProducts()` against the checked-in
  catalog fixture and navigated into the real `ScanResults` component
  with real router state — across desktop/mobile × light/dark for a
  "Demanding" profile (Gel tab populated with a real "3" badge; styles
  strip showing one style with notes and one without) and a "2b"
  curl-mismatch profile (Part D's check). Zero console/page errors in
  any of the 8 screenshot passes; the harness and its router.tsx entry
  were deleted afterward, confirmed via `git diff` that `router.tsx`
  ended byte-identical to how it started.
- Next: P4 (content/copy edits — cube image, quiz density wording, About
  page, em dash removal elsewhere, home page sample result).

## Final Spike — Content & Visual Edits (P4 of 4)
**Status: Done.** Last prompt of the spike — low-risk, additive
content/copy/visual changes only, nothing touching scoring or the flow
reducer. See CLAUDE.md's relevant sections and DECISIONS.md's "Final
Spike — P4 of 4" section for full detail; this is the status summary.

- **Part A — Quiz density wording.** `quizQuestions.ts`'s `density`
  question's five `sub` labels reworded to a consistent "[strand
  thickness] / [density level]" pattern (Fine/Low, Fine/High,
  Medium/Medium, Thick/Low, Thick/High) per the CEO's request for more
  professional copy. Display-only — all 5 `value`s unchanged, confirmed
  by the full test suite (including the `toDiagnosticAnswers.test.ts`
  contract section, which runs real `scoreProducts()` calls) passing
  unmodified.
- **Part B — Cube image swap, with a flagged substitution.** The brief's
  preferred replacement (`image11`) turned out to already be the cube's
  `photoBack` face — not "unused" as assumed — so the fallback,
  `image5`, was used instead for the right face (was `image6`) and the
  discrepancy flagged rather than silently duplicating a face. Rights
  check passed for both candidates (clean stock/editorial photography,
  no press/event indicators, no recognizable public figure). Reconfirmed
  the pre-existing "no man in the photo pool" gap — not fixed, out of
  this pass's scope, but now flagged across two spikes.
- **Part C / D — About sentence & Analyze copy.** Verbatim CEO-provided
  replacement for `About.tsx`'s opening sentence; `Features.tsx`'s
  Analyze line's em dashes replaced with a colon+comma construction,
  scoped to that one sentence only — no broader em-dash sweep, and
  Airtable-sourced text explicitly untouched (regenerated on every
  catalog fetch).
- **Part E — Home page sample result.** Old mock (fake "3C" label,
  invented product bullets, no match indicators) replaced with a static
  `SampleResultCard` built from real catalog data (Pattern Leave-In,
  Pattern Beauty, $29) and a plausible, honestly-mixed match checklist —
  the results page's actual differentiator, absent from the old mock
  entirely. 3 layout options (direct card / context-strip / gradient-
  tinted spotlight frame) built behind a temporary dev-only harness,
  screenshotted at desktop/mobile × light/dark, sent for approval before
  implementation — same process as P3's styles-strip decision. CEO chose
  the **spotlight frame**. Harness deleted after the decision;
  `router.tsx` ended net-unchanged.
- **Part F — Documentation.** This entry; CLAUDE.md gained sections for
  the density wording, the cube image swap, the About sentence, the
  Analyze copy, and the new `SampleResultCard`/spotlight-frame component;
  DECISIONS.md gained a new top-level section for this prompt's reasoning
  plus a continuation of "Open questions" carrying the `"tehnique"` alias
  status forward (still unresolved — no Airtable confirmation yet) and
  logging the cube diversity gap again.
- **Verification.** `npm run typecheck` clean; all 113 tests pass
  unmodified (this prompt touches no scoring/reducer code). Quiz
  question 4 verified at desktop/mobile × light/dark with the new
  labels, values confirmed unchanged via the passing test suite. Cube
  verified rendering cleanly (no texture/console errors) at desktop/
  mobile × light/dark with the new right face. Real landing page (not
  the harness) re-screenshotted post-integration at all 4 combos — zero
  console errors, spotlight frame matches the approved option exactly.
  Not yet done: production deploy + live verification (this sandbox has
  no deploy target — see CLAUDE.md's env-file note).
- This closes out the Final Spike's four-prompt content/copy/visual
  pass. Remaining open items for whoever picks this up next: the
  `"tehnique"` alias removal (pending Airtable confirmation), the cube's
  missing-man photo gap, and Milestone 6's outstanding production-deploy
  verification for the serverless endpoints touched across the spike.
