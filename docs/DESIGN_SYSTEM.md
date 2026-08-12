# KrishiMitra AI — Design System (Extracted from krishimitra-ai.html)

**Source of truth:** `krishimitra-ai.html`, `<style>` block, lines 10–335.
Every value below is copied verbatim from that file — nothing here is invented or estimated.

---

## 1. Color Tokens

All defined as CSS custom properties on `:root`.

| Token | Value | Actual role in the file |
|---|---|---|
| `--bg` | `#0F2A22` | Page background (deep forest green), base of the radial-gradient hero background |
| `--bg2` | `#153A2D` | Dark-theme card surface (`.card`, `header.topbar`'s translucent overlay base) |
| `--bg3` | `#1C4739` | Inset/input surface (`select`, `input`, `.chip`, `.computed` box) |
| `--bg4` | `#234f40` | Floating compare-bar background |
| `--paper` | `#F7F2E4` | Light "paper" surface — used only for scheme cards on the results screen (deliberate theme flip from dark chrome to a light card for readability of dense scheme info) |
| `--paper2` | `#EFE7D2` | Secondary paper tone (declared; used for the "almost eligible" card variant background is actually a separate literal `#F0EAD5`, not this token — see §5 note) |
| `--turmeric` | `#E7A72C` | Primary accent — CTA buttons, hero eyebrow, active language toggle, focus outline |
| `--turmeric-dim` | `#9c7626` | Dimmed turmeric (declared, no active usage found in the reviewed markup) |
| `--clay` | `#C1622E` | Secondary accent — "Relevance" score number, "almost eligible" badge background family |
| `--sky` | `#5FA8C7` | Link color, Stage 3 icon accent |
| `--sprout` | `#8FBF5C` | Secondary/success accent — active nav pill, selected chip, progress bar fill, focus border on inputs |
| `--text` | `#F3EFE2` | Primary text on dark backgrounds |
| `--text-dim` | `#AFC3B5` | Muted text on dark backgrounds (labels, sub-copy) |
| `--ink` | `#1B2E27` | Primary text on light/paper backgrounds |
| `--ink-dim` | `#5b6d64` | Muted text on light/paper backgrounds |
| `--danger` | `#E07A5F` | Failure state ("✕" explain rows), disclaimer accent |
| `--line` | `rgba(243,239,226,0.14)` | Border color on dark surfaces |
| `--line-paper` | `rgba(27,46,39,0.12)` | Border color on paper/light surfaces |

**Category badge colors** (scheme category chips, not root tokens — declared per-class):

| Category class | Background | Text |
|---|---|---|
| `.cat-income` | `#e7d9ba` | `#6b4b12` |
| `.cat-insurance` | `#cfe3ea` | `#245064` |
| `.cat-credit` | `#e3d3f0` | `#5a3480` |
| `.cat-soil` | `#ddebd0` | `#3c6321` |
| `.cat-irrigation` | `#c9e6f0` | `#1c5a72` |
| `.cat-marketing` | `#f0dcc9` | `#8a4416` |
| `.cat-mechanization` | `#dfe1e8` | `#3a4152` |
| `.cat-women` | `#f3d6de` | `#8f2f4f` |
| `.cat-food` | `#f5e2b8` | `#7a5305` |
| `.cat-crop` | `#d9ecd1` | `#356121` |

Background is not flat — the body uses two radial gradients layered over `--bg`:
```css
radial-gradient(ellipse 900px 500px at 15% -10%, rgba(143,191,92,0.10), transparent 60%),
radial-gradient(ellipse 700px 500px at 100% 0%, rgba(231,167,44,0.08), transparent 55%),
var(--bg)
```
(sprout-tinted glow top-left, turmeric-tinted glow top-right).

---

## 2. Typography

| Token | Stack | Used for |
|---|---|---|
| `--font-display` | `'Fraunces', Georgia, 'Times New Roman', serif` | All headings (`h1`, `h2`, `h3`, `.card h2`, `.section-title`, brand name) — variable optical-size serif, weights 400/500/600/700 loaded |
| `--font-body` | `'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif` | Body copy, buttons, form controls — weights 400/500/600/700/800 loaded |
| `--font-mono` | `'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace` | Numeric/data elements: hero-stat numbers, score chips, badges, profile-strip tags, table headers — weights 400/500/600 loaded |

**Scale actually used in the file:**

| Element | Size | Weight | Notes |
|---|---|---|---|
| `.hero h1` | `clamp(2.4rem, 5.2vw, 4.1rem)` | 600 | line-height 1.04, max-width 15ch, `-0.01em` tracking |
| `.hero p.lede` | `1.14rem` | — | line-height 1.6, max-width 52ch |
| how-it-works `h2` | `1.8rem` | 600 (inline style) | |
| `.card h2` | `1.55rem` | 600 | |
| `.section-title` | `1.3rem` | 600 | |
| `.scheme-title-block h3` | `1.28rem` | 600 | |
| how-it-works card `h3` | `1.15rem` | inherits | |
| `.hero-stats b` | `1.9rem` | 600 | display font |
| `.gauge .inner` | `0.72rem` | 700 | mono |
| `.badge` | `0.7rem` | 700 | uppercase, 0.5px tracking |
| `.hero-eyebrow` | `0.72rem` | — | mono, uppercase, 1.5px tracking |

No explicit global body font-size or line-height is set beyond browser default (16px); component-level sizes above are the effective scale.

---

## 3. Border Radius

| Token/value | Used for |
|---|---|
| `--radius: 14px` | `.card`, `.scheme-card` |
| `10px` | `.btn-primary`, `.btn-secondary` |
| `9px` | form inputs/selects, `.link-btn`, `.ghost-btn`, `.computed` box |
| `8px` | `.link-btn`, `.ghost-btn` |
| `12px` | `details.collapse` |
| `100px` (pill) | `.pill-btn`, `.chip`, `.hero-eyebrow`, `.lang-toggle`, `.profile-strip`, `.badge`, `.doc-pill`, `.compare-bar`, `.section-title .count` |

---

## 4. Shadows

| Element | Shadow |
|---|---|
| `.btn-primary` | `0 8px 24px -8px rgba(231,167,44,0.5)` (turmeric glow) |
| `.btn-primary:hover` | `0 12px 28px -8px rgba(231,167,44,0.6)` + `translateY(-2px)` |
| `.compare-bar` | `0 12px 32px rgba(0,0,0,0.4)` |

No shadow is used on `.card` or `.scheme-card` — surface separation there comes from background-color contrast and a 1px border only.

---

## 5. Component Reference

- **Buttons**
  - `.btn-primary`: turmeric fill, `--ink` text, bold, 15px/28px padding, glow shadow, lift-on-hover.
  - `.btn-secondary`: transparent, `--line` border, hover border → `--text-dim`.
  - `.pill-btn`: nav pill, transparent → `--sprout` fill when `.active`.
  - `.link-btn`: solid `--ink` fill / `--paper` text — the "action" button *inside* scheme cards (paper theme), not the same as `.btn-primary`.
  - `.ghost-btn`: outlined button for paper-theme cards (`Why this scheme?`).
- **Cards** — two distinct card families, intentionally different themes:
  - `.card` (dark): `--bg2` background, used for wizard steps and the "how it works" tiles.
  - `.scheme-card` (light/paper): `--paper` background, `--ink` text — used only for scheme results. The `.almost` variant swaps to a literal `#F0EAD5` background with a dashed `#c9a25c` border (not the `--paper2` token, despite `--paper2` being declared — worth normalizing when porting to Tailwind).
- **Forms**: dark inputs on `--bg3`, `--line` border, focus state → `--sprout` border. Multi-select `.chip` toggles (unselected: `--bg3`/`--text-dim`; selected: `--sprout` fill). Custom radio buttons use the CSS `:has()` selector for the checked-parent highlight style — a modern-browser-only dependency worth flagging for cross-browser QA.
- **Navigation**: sticky, blurred glass topbar (`backdrop-filter: blur(10px)`), segmented pill language toggle, underline-style tabs on the results screen (`--turmeric` active underline).
- **Status/score elements**: circular conic-gradient gauge for "readiness" (`.gauge`), plain mono-number `.score-chip` for eligibility % and relevance %, colored badges for scheme category, pass/fail (✓/✕) explain list.
- **Icons**: emoji only (🌾 logo, 🌱🪴🌿🌾 growth-stage icons, ✅⚠️🌤️ status, 💵⏱📅 detail icons). No SVG icon set, no icon font/library is loaded.

---

## 6. Layout & Spacing

- Global content width: `.wrap { max-width:1180px; margin:0 auto; padding:0 24px; }`
- Wizard content width: `.wizard-shell { max-width:760px; }` (narrower, single-column form flow)
- Card padding: `34px` desktop → `22px` at ≤640px
- Grid gaps: `.field-grid` 20px; `.chip-group` 9px; hero-stats 38px; how-it-works grid `minmax(230px,1fr)` auto-fit, 20px gap
- Hero vertical rhythm: `76px 0 60px` desktop → `56px 0 40px` at ≤640px

---

## 7. Responsive Breakpoints

Only three breakpoints exist in the file — no tablet-specific (768–979px) rules beyond these:

| Breakpoint | Effect |
|---|---|
| `max-width: 980px` | Decorative `.field-row` (floating mono-text decoration in hero) is hidden entirely |
| `max-width: 700px` | `.explain-grid` (eligibility + documents panel) collapses from 2 columns to 1 |
| `max-width: 640px` | `.field-grid` collapses to 1 column; `.card` padding 34px→22px; `.hero` padding reduced; `.scheme-card` padding 26/28px→20px |

There is no distinct mobile navigation pattern (no hamburger menu) — the topbar nav simply wraps/stays as-is at all widths in the reviewed markup.

---

## 8. Porting Notes for Tailwind/React

- Map every token above to Tailwind theme `extend.colors` 1:1 by name (`turmeric`, `sprout`, `bg2`, `bg3`, `ink-dim`, etc.) rather than renaming — several of these exact token names are already referenced in `PROJECT_CONTEXT.md` §12, so keeping identical names avoids drift between design docs and code.
- Normalize the `--paper2` / `#F0EAD5` inconsistency (see §5) — decide whether `--paper2` becomes the "almost eligible" background formally, or drop the unused token.
- The `:has()` selector used for the gender radio (`label:has(input:checked)`) has real but not universal browser support; confirm target browser support before relying on it in production Tailwind/React, or replace with a controlled `checked` class from React state (the more robust option anyway, since React will manage this state directly).
- Emoji-based iconography is a legitimate lightweight choice for a hackathon, but it will render inconsistently across OS/browsers (Windows vs. macOS vs. Android emoji sets look different). Flag as a decision point, not an oversight: keep for speed, or swap to `lucide-react` for visual consistency — either is defensible, but it should be a conscious choice going into the rebuild rather than inherited by default.
