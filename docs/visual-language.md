# Visual language

**Status: approved, 2026-10-26.** Jeremy answered its four calls (at the
end), so this is the spec for Phase 6 stages 2–5 in [`PLAN.md`](PLAN.md). Once
`tokens.ts` carries these values, the generated design-system page replaces
this file.

Why it exists: the approved direction (gold on ink, structure from type) fixed
the plumbing and the palette, but on review it still read as bland. This is
the layer on top — materials, light, type personality, motion and three
signature moments — without giving up the accessibility and performance the
direction already promised.

How it was made: four reviewers (visual language, motion, the salon market,
accessibility and performance) studied Linear, Vercel, Raycast, Stripe,
Apple's Liquid Glass, Arc, Notion Calendar, Cal.com and Attio, and the salon
products Mangomint, GlossGenius, Boulevard, Fresha and Vagaro. Each wrote a
position, then critiqued the other three. Values below are measured, not
guessed: contrast by OKLCH → sRGB → WCAG, springs by simulation. They
converged on 13 of 15 disagreements; the two they didn't are marked ⚖, with
the reason for the call.

A clickable prototype of Today, the calendar, booking on a phone in both
themes, and this system sheet was built from these values for review.

## Materials

| Material     | Where                                                                                                               | Recipe                                                                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Solid**    | cards, tables, calendar grid and blocks, forms, sheets, privacy screen                                              | approved surfaces; dark edge `inset 0 1px 0 oklch(1 0 0/.04)`                                                                                               |
| **Lit**      | menus, popovers, dialogs, toasts, appointment panel, ⌘K ⚖, confirmation ticket                                      | `raised`, a real 1px border, top highlight `oklch(1 0 0/.12)`, shadow `0 16px 40px -12px oklch(0 0 0/.55)` (light: approved overlay shadow)                 |
| **Glass**    | desktop app header, phone tab bar, `/book` summary bar. Nothing else                                                | tint .80 (`canvas` at 80%), `blur(16px)` (12px below 1024px), `saturate(140%)`, 1px border at 8%, teal rim highlight `inset 0 1px 0 oklch(.95 .02 200/.10)` |
| **Fallback** | reduced transparency, increased contrast, forced colours, no `backdrop-filter`, device setting "Glass effects: Off" | tint .97, no blur; forced colours: `Canvas`, real border                                                                                                    |

- **Text on glass** is `ink` or stronger, never `ink-muted`. Proven over pure
  white (dark theme) and pure black (light theme), with no blur credit:
  `ink` ≥ 7.6:1.
- **Budget:** 2 glass surfaces on desktop, 1 below 1024px (the phone header is
  solid), 0 on shared tablets; ≤ 20% of the viewport in total.
- **Never:** glass on glass, glass inside an element whose opacity animates,
  glass on rows, the calendar or inner scrollers; animating blur, shadows or
  gradients.
- **Grain** only on the canvas and ambient light, as `/textures/grain.webp`
  (≤ 4 KB), never on a surface that carries text.
- **⚖ ⌘K is Lit, not glass.** Motion showed it animates in, so glass inside
  a fading parent pops; and front desks are touch, so ⌘K is a feature, not
  the identity.
- `-webkit-backdrop-filter` (via `browserslist`) ships only together with the
  per-device setting, defaulting to solid on shared devices.

## Light and colour

- **Ambient:** gold only, static, top of the dashboard, sign-in and
  onboarding: `radial-gradient(1200px 560px at 15% -10%, oklch(.86 .145 88/.07), transparent 60%)`;
  light theme .06. Never behind data, never animated.
- **Metallic gold button (dashboard only):**
  `linear-gradient(180deg, oklch(.90 .13 92), oklch(.84 .15 85))`, inset top
  `oklch(1 0 0/.45)`, inset bottom `oklch(.62 .12 75/.35)`, a real border.
  Hover +.02 L, pressed flat .82. No shine animation. Both stops in
  `contrastPairs`.
- **`/book` actions** are ink-strong with canvas text (17.7:1); the selected
  slot is ink-strong too. Gold never appears on `/book`.
- **Focus:** dark: 2px gold plus a 4px halo at .28. Light: 2px
  `oklch(.55 .11 72)` plus a halo at .18.
- **Category and staff hues (8):** Rose 15, Clay 45, Sage 135, Jade 170,
  Lagoon 200, Sky 235, Iris 280, Orchid 330. Dark: bar `oklch(.78 .10 h)`
  on a 14% tint. Light: bar `oklch(.57 .095 h)` on a 10% tint. "No purple"
  applies to Lumina's own brand surfaces only.
- **Booking presets (8):** Champagne 85, Rosewood 15, Terracotta 45, Sage 140,
  Lagoon 200, Midnight 260, Amethyst 305, Graphite (C .015). Chroma ≤ .14 dark
  / .09 light, and ≤ 90% of the gamut maximum.

## Type

- **Inter** for UI and data, `opsz` on, `cv05 cv08`. Stats in Inter 600,
  tabular figures, never serif (serif metrics are GlossGenius's mark).
- **⚖ Fraunces** (SIL OFL, one static weight-400 instance, Latin, ≤ 20 KB,
  `font-display: optional`, never preloaded on `/book`) for dashboard h1s
  and the confirmation date only. Accessibility preferred Inter for the
  date; the date is the one moment clients screenshot, and `optional` plus a
  prefetch once a time is picked means it costs neither LCP nor a layout
  shift. Never in tables, buttons, labels, stats, the calendar or the
  salon's name.
- **Empty states:** flat hairline SVGs of salon objects (a chair, scissors, a
  mirror), 1px `currentColor` at 14% with one gold stroke. Never isometric
  or 3D.

## Motion

- **Durations:** instant 0, micro 80, fast 120, base 180, slow 240 ms.
  Nothing over 240 ms except the undo countdown and the skeleton.
- **Springs** (`linear()`, 32 stops, with a `cubic-bezier` fallback swapped in
  under `@supports`):
  |        | k/c    | Overshoot | Settles                          |
  | ------ | ------ | --------- | -------------------------------- |
  | snappy | 800/57 | none      | 240 ms                           |
  | smooth | 600/46 | none      | 234 ms                           |
  | bounce | 750/41 | 2.8%      | 240 ms, small-element scale only |
- **View Transitions** through a ~40-line hook around
  `document.startViewTransition`, not Next 15.5's flag, which switches the
  App Router to experimental React (verified by three reviewers in
  `next/dist/build/create-compiler-aliases.js:251`). Revisit with Next 16.
  At most 4 named elements, never the whole calendar.
- **No animation library.** A ~1.5 KB velocity helper for sheet release and
  calendar drop.
- **Reduced motion:** opacity and colour only, 150 ms at most.
- **Never:** parallax, scroll-linked motion, ambient loops, count-ups,
  `transition: all`, `hover:scale`.

## Signature moments

1. **The gold now-line** (Today, My day, calendar): 2px gold, `0 0 12px` glow
   at .55, an 8px dot and a time label; the appointment in progress spills
   gold at .10 to 40% of its row. Apart from the primary button, the only
   gold on screen, so "now" reads from across the salon.
2. **The time travels, then the ticket** (`/book`): the tapped slot morphs
   into the glass summary bar (one named element, 240 ms, smooth). After the
   server confirms, the bar grows into a solid ticket over the salon's band:
   logo, date in Fraunces 40/44, stylist face if opted in, notched edges. A
   20px success check draws over 200 ms from 160 ms; actions fade in 35 ms
   apart; all done by 450 ms. `role=status`, focus to the ticket heading.
   Reduced motion: one 120 ms fade.
3. **Checked in** (Today, calendar): a success tint sweeps across the block
   by `scaleX` over 240 ms; the 3px bar keeps the category hue so the block
   still says whose it is; "Arrived" appears beside a dot.

Plus **calendar lift, snap, drop** (motion's moment 2): lift after 4px with a
mouse or a 350 ms still press, snap to 15-minute rows and stylist columns on
snappy, drop on bounce, optimistic save with Undo.

## Booking page (`/book`)

- A band in the preset hue, 96px on phone and 160px on desktop, with no text
  on it; a Solid logo plate 64/80px overlapping its lower edge; the salon's
  name below in Inter 24/32 at 600; one line of Inter 14. No logo: a 48px band
  and the name, never a placeholder tile.
- The summary bar is the only glass. "No account or app needed · Free to
  cancel until …" under the button. Lumina appears once, in the footer, at
  11px.

## Shared front-desk tablets

Glass off by default, motion switchable per device. The idle privacy screen
is Solid: the canvas, the logo, and the time in large type. Privacy never
depends on blur (on iPadOS 17 the blur doesn't render at all).

## Guardrails (each becomes a test)

Class-hygiene allow-list for `backdrop-*`, `glass-*` and gradients;
Playwright: glass area and count per route, no glass under glass, worst-case
backdrop pixel test, reduced-transparency equals `data-surfaces=solid`,
forced-colours screenshots, reduced motion moves nothing, no idle animation
after 2 s, nothing over 240 ms; at most one gold-filled element per view
plus the now-line; Lighthouse CI on `/book` (LCP ≤ 2.5 s and within 100 ms
of the solid build, CLS < .05, INP ≤ 200 ms); material CSS ≤ 2 KB gzipped.

## Decided (Jeremy, 2026-10-26)

1. **Fraunces** is the second, display-only face (free, OFL, ≤ 20 KB).
2. **Test devices:** Jeremy's 2019 iPad (the older-GPU front-desk case) and a
   current Samsung tablet. Nothing is bought. The mid-range-phone case for
   clients on `/book` stays covered by Lighthouse CI with CPU and network
   throttling.
3. **Footer credit on `/book`:** "Booking by Lumina · Source" at 11px,
   removable by self-hosters; the Source link also serves AGPL §13.
4. **`qrcode`** (server-only, MIT) for the printable counter card in the brand
   try-on. Adds no client JavaScript.

Settled without a decision: no cover photo on `/book` at launch (Phase 8);
no animation library; ink button on `/book`.
