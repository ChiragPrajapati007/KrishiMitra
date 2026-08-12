# KrishiMitra AI — Step 1 Audit Report

**Scope:** Audit only. No application code was written or modified for this task.
**Inputs reviewed:** `PROJECT_CONTEXT.md` (full), `krishimitra-ai.html` (full — 1,244 lines, all CSS and JS read directly, not sampled).
**Companion doc:** `DESIGN_SYSTEM.md` (color/type/component tokens extracted from the HTML).

---

## Headline finding (read this first)

The prototype's biggest risk is not missing functionality — it's that the results screen actively **violates the project's own compliance rule**. `PROJECT_CONTEXT.md` §7 says the app must never claim *"Government eligibility confirmed"* and should prefer language like *"Relevance Score"* or *"Profile Match."* The HTML does the opposite: it runs a hard-coded rule engine and then labels the output `✅ Eligible schemes`, shows an `Eligibility: 100%` chip, and buckets every scheme into **Eligible / Almost eligible / Not eligible**. That's categorical eligibility language, generated client-side from a simplified, unverifiable rule set, presented with the same confidence as a government verdict. This has to be relabeled before the final build — not as polish, but because it's the exact overclaim the spec explicitly warns against.

Everything else below is secondary to that.

---

## 1. Actual Hackathon Requirement (per `PROJECT_CONTEXT.md`)

**Problem statement:** farmers fill a short profile (land size, crop, state, category); the tool ranks schemes by relevance using TF-IDF + cosine similarity. Explicitly: *no embeddings, no transformers.*

**MUST HAVE:** farmer profile, scheme dataset, scheme descriptions, TF-IDF, cosine similarity, relevance score, ranking, farmer dashboard, scheme details, official application links, basic explainability.

**OPTIONAL (only after MVP is stable):** bookmark/save, scheme comparison, readiness indicator, additional structured eligibility checks, Hindi/Marathi UI.

**FUTURE SCOPE (do not build):** LLM chatbot, voice assistant, OCR, WhatsApp, government API integration, auto-submission, push notifications, mobile app, weather, satellite data, crop advisory, advanced analytics.

**Technology requirements:** React + Tailwind (frontend), Flask + REST (backend), Python + Scikit-learn (`TfidfVectorizer`, `cosine_similarity`) for ML, SQLite (database).

**What judges are likely expecting:** a farmer fills a profile, sees a ranked list with visible relevance scores, understands *why* something ranked highly, opens scheme details, reaches an official portal link — and can be shown, on request, that the ranking is genuinely TF-IDF + cosine similarity and not a lookup table.

---

## 2. Existing HTML Audit

### A. Existing Pages / Sections

| Section | Purpose | Functional or simulated | Keep in MVP? |
|---|---|---|---|
| Sticky header/topbar | Branding, language toggle, home/dashboard nav | Functional | Yes |
| Landing screen | Marketing hero + 3-stage "how it works" explainer | Functional (navigation, scroll), content is static copy | Yes, trim copy |
| Wizard — Step 1: Location & crop | Collects state, district, crop, season | Functional, validated | Yes (district currently unused downstream — see §4) |
| Wizard — Step 2: Land & income | Collects land size, income; auto-computes farmer category live | Functional, validated | Yes — this live category computation is a genuinely nice UX touch worth keeping |
| Wizard — Step 3: About you | Gender, age, disability status | Functional, validated | Gender/age are used in eligibility rules; **disability is collected but never used anywhere** — dead field |
| Wizard — Step 4: Interests & documents | Multi-select interest chips (feeds TF-IDF query weighting) + documents-on-hand chips (feeds readiness score) | Functional | Yes — interests are real signal into the ranking |
| Results — Recommendations tab | Ranked scheme cards, eligible/almost/not-eligible buckets, expandable "why" panel | Functional, computed live in-browser | Yes, but **relabel the eligibility language** (see headline finding) |
| Results — Compare tab | Side-by-side table, up to 3 schemes | Functional | Optional per spec — keep only after MVP is stable |
| Results — Action Plan tab | Auto-generated day-by-day roadmap from missing documents | Functional | Not in spec's MUST HAVE or OPTIONAL list — it's closer to Future Scope's "crop advisory"-style guidance generation. Cut or defer. |
| Results — Dataset & Insights ("admin") tab | Read-only session stats + full scheme table | Functional, but **not an admin authoring tool** despite the name (see §2C) | Cut or defer — not requested, not what its name implies |
| Floating compare bar | Persistent selection counter/shortcut | Functional | Tied to Compare tab — same call as above |
| Disclaimer block | States the dataset is illustrative and to confirm on official portals | Functional, static | Yes — keep verbatim, it's doing real compliance work |
| Footer | Static attribution text | Static | Yes |

### B. Existing Components (only what's actually present)

Topbar/brand lockup, language toggle, pill-nav buttons, hero eyebrow badge, primary/secondary buttons, hero stats, 3-card "how it works" grid, stepper, wizard card, field-grid inputs/selects, chip multi-select, custom gender radio, live-computed category readout, wizard back/next nav, profile strip, tab bar, scheme card (+ "almost eligible" variant), circular readiness gauge, score chips, ghost/link buttons, compare checkbox, expandable explain panel (rule list + document pills), collapsible not-eligible list, floating compare bar, compare table, action-plan timeline, admin stat grid, missing-document bar chart, admin scheme table, disclaimer box, footer.

### C. Existing Functionality — real vs. simulated

**Actually functional (verified by reading the JS, not assumed):**
- The full 4-step wizard with per-step validation.
- Live farmer-category computation from land size.
- A genuine TF-IDF implementation: tokenizer with stopword removal, `computeIdf()`, `tfidfVector()` (TF × IDF on sparse token dictionaries) — this is real math, not a placeholder.
- A genuine cosine similarity function (dot product over shared keys, normalized by vector magnitudes) — standard, correct formula.
- A rule-based eligibility engine checking state, crop, land min/max, income max, farmer category, gender, age min/max, season — against 10 hard-coded schemes.
- Document "readiness" scoring, scheme ranking/sorting, the compare table, the action-plan generator, and the admin stats — all computed live from the in-memory `SCHEMES` array. No network calls exist anywhere in the file (no `fetch`, no `XMLHttpRequest`) — this is 100% client-side with no persistence; a page refresh loses everything.

**Simulated / not what it appears to be:**
- The "Dataset & Insights" tab is labeled and positioned like an admin panel, but it is **read-only analytics**, not the admin scheme-authoring tool `PROJECT_CONTEXT.md` describes ("let an admin paste/upload scheme description text"). That authoring capability does not exist anywhere in the HTML — it needs to be built from scratch for the Flask backend, not adapted from this tab.
- The EN/HI language toggle only localizes static UI chrome (labels, buttons, headings via `data-i18n`). It does **not** localize the dynamically generated scheme cards, explain panels, or any content pulled from the `SCHEMES` array — those stay English-only regardless of language setting. If a judge tests Hindi mode on the results screen specifically, it will look unfinished.
- Bookmark/save is not implemented (correctly deferred — it's already Optional in the spec).

---

## 3. Design System

Extracted in full, with actual hex/rem values, in `docs/DESIGN_SYSTEM.md`. Summary: dark forest-green (`#0F2A22`) base with turmeric (`#E7A72C`) and sprout-green (`#8FBF5C`) accents on the app chrome, flipping to a light "paper" (`#F7F2E4`) card surface specifically for scheme results; Fraunces serif for display type, Inter for body, IBM Plex Mono for data/scores; 14px base radius, pill-shaped (100px) buttons/badges/nav; three breakpoints at 980/700/640px; emoji-based iconography throughout, no icon library.

---

## 4. Product Flow Audit

**Actual flow found in the HTML:**
```
Landing
  ↓
Wizard (4 sub-steps: Location & Crop → Land & Income → About You → Interests & Documents)
  ↓
Results screen, tabbed:
  Recommendations (default) | Compare | Action Plan | Dataset & Insights
  ↓
Scheme details = inline expandable panel on each card (not a separate page)
  ↓
Official application link (opens in new tab)
```

**Required flow per spec:**
```
Farmer Profile → TF-IDF → Cosine Similarity → Ranked Schemes → Scheme Details → Official Application Link
```

**Gaps against the required flow:**
1. **No standalone Scheme Details page.** The spec's MUST-HAVE list includes a distinct "Scheme Status Page" ("a simple page listing scheme details, application info, official links"). The prototype folds this into an inline expand-panel on the card instead of a dedicated page/route. Functionally the information exists; structurally it doesn't match what was asked for, and a React rebuild with routing should probably give schemes a real detail view/route rather than porting the expand-panel pattern as-is.
2. **The ranking pipeline is entangled with a hard eligibility filter the spec never asked for.** The spec wants relevance ranking. The prototype instead runs eligibility-as-a-gate first (Eligible / Almost / Not-eligible buckets) and only ranks by relevance *within* the "Eligible" bucket. That's a bigger, riskier feature than requested — see the headline finding.
3. **Profile scope creep.** The spec's minimum profile is 5 fields (state, district, crop, land size, category) and explicitly warns: *"Do not turn the profile into a long government application form."* The prototype collects 9+ fields across 4 wizard steps (adds season, income, gender, age, disability, interests, documents-on-hand). Some of this is justified (income/gender/age feed real eligibility rules; interests feed real TF-IDF signal) — but it's worth a deliberate decision, not inheritance by default, about how much of this survives the rebuild.
4. **Two dead fields.** `district` is collected and displayed but never used in eligibility or in the TF-IDF profile text. `disability` is collected in Step 3 but never referenced anywhere downstream. Either wire them in or drop them — collecting data that goes nowhere undermines the "explainable, no black box" claim the landing page itself makes.

---

## 5. ML Audit

**TF-IDF:** genuinely implemented, not simulated. `tokenize()` lowercases, strips non-alphanumerics, drops a stopword list and single-character tokens. `computeIdf()` computes `idf = ln(N / (1 + df)) + 1` over the combined set of scheme-description token lists plus the single current farmer-profile token list. `tfidfVector()` multiplies term frequency (`count / doc length`) by that IDF. This is a legitimate, if idiosyncratic, TF-IDF.

**Cosine similarity:** genuinely implemented — dot product over shared keys, divided by the product of the two vector magnitudes. Standard, correct formula.

**Important migration note:** the IDF formula above is *not* identical to scikit-learn's default (`TfidfVectorizer`'s smoothed IDF is `ln((1+n)/(1+df)) + 1`, with the `+1` inside the numerator too). Porting "the same logic" to Python by eye will silently produce different scores and different rankings in edge cases. This needs to be a deliberate choice: replicate the JS formula exactly in Python for continuity, or adopt sklearn's default and accept the ranking will shift slightly — but it should be decided, not assumed.

**Corpus-fitting pattern also needs a decision, not a port.** The JS recomputes IDF from scratch on every submission, over a tiny "corpus" of the 10 scheme descriptions *plus* the one current farmer's profile text as an 11th document. That means IDF statistics are re-derived per user and are influenced by that user's own profile text. The more standard and more defensible pattern for the Python backend — and the one that matches how `TfidfVectorizer` is normally used — is: **fit the vectorizer once on the scheme corpus** (at app startup or dataset load), then **transform each farmer profile as a query vector** against that fixed vocabulary. This also means ranking behavior becomes independent of what any other farmer has entered, which is a better property for a real backend anyway.

**What's genuinely reusable conceptually:**
- The token pipeline shape (lowercase → strip punctuation → stopword removal).
- The idea of building a synthetic "profile document" from structured fields (crop, category, season, state) plus repeated interest keywords as a weighting hack — this is a reasonable, explainable way to inject user intent into a TF-IDF query, and translates cleanly to Python (e.g., repeat/duplicate tokens before vectorizing, or use `TfidfVectorizer`'s built-in term weighting if a cleaner approach is preferred).
- The "why this scheme" explain panel's structure (pass/fail rule list + document checklist) as a template for the Python-side explainability output — it just needs to stay clearly separated from the ML score, per `PROJECT_CONTEXT.md` §8's own distinction between "Relevance" (TF-IDF) and "Keyword Explanation" (simple matching). The current build already keeps these visually distinct (score chips vs. explain panel), which is good practice to preserve.

**What must be rebuilt outright:** everything, in Python, using `sklearn.feature_extraction.text.TfidfVectorizer` and `sklearn.metrics.pairwise.cosine_similarity`, served from Flask — per the spec's explicit requirement. This is not a translation exercise so much as a redesign around fit-once/transform-per-query.

---

## 6. Data Audit

- **Number of schemes:** 10, counted directly from the `SCHEMES` array (`pmkisan, pmfby, kcc, shc, pmksy, enam, smam, mksp, pmfme, nfsm`). Target is 30–50 — this is the single largest volume gap in the whole project.
- **Fields per scheme:** id, name, shortName, ministry, category key/label, states[], crops[], min/max land acres, max income, farmer categories[], gender, min/max age, seasons[], benefit text, financial assistance text, processing time, deadline, required documents[], official link, description. This already covers the spec's recommended fields (§9) and more — it's a richer schema than the minimum, which is good, **except** it has no `source` or `last_verified` field anywhere.
- **Provenance gap:** `PROJECT_CONTEXT.md` §9 is explicit: *"Do not invent government scheme information... verify against reliable/official sources before adding to the final dataset."* [Guessing, since the file itself carries no citations] — I cannot confirm from the HTML alone whether the benefit figures (e.g., PM-KISAN's ₹6,000/year, PMKSY's 55% subsidy) were sourced from official portals or approximated for the demo. Every one of the 10 existing schemes needs a verification pass against its official link before being carried forward, and every new scheme added to reach 30–50 needs a `source`/`last_verified` field from day one.
- **State coverage gap:** `PROJECT_CONTEXT.md` §9 asks for a mix including "Maharashtra agricultural schemes" specifically. The current 10 are all either nationwide (`states:["All"]`) or, for e-NAM, a fixed list of major agri-states that happens to include Maharashtra — but there is **zero genuinely Maharashtra-specific state scheme** in the dataset. That's a named requirement, not implied — needs direct sourcing.
- **Description design pattern:** descriptions are natural sentences with deliberate keyword-stuffed phrases appended at the end (e.g., a PM-KISAN description ending in "...income support direct benefit cash transfer small marginal farmer family."). This is a legitimate, purposeful TF-IDF tuning technique, but it's manual and won't scale cleanly to 30–50 schemes by hand without a documented template — otherwise the vocabulary and score distribution will get noisy as more schemes are added inconsistently.
- **Verdict:** current data is a good *shape* reference (schema is sound, richer than the minimum) but insufficient in *volume* and missing *provenance* — not usable as-is for the final submission.

---

## 7. Architecture Gap

| Area | Current Prototype | Final Implementation | Required Change |
|---|---|---|---|
| Frontend | Single static HTML file, vanilla JS, inline `<style>` | React + Tailwind, componentized | Full rebuild as components, preserving design tokens from `DESIGN_SYSTEM.md` |
| Backend | None — all logic runs client-side in the browser | Flask REST API | Build from scratch: scheme API, recommendation API, no existing backend to port |
| ML | Hand-written JS TF-IDF + cosine similarity, recomputed per submission, fit over a tiny 11-document corpus | Python / Scikit-learn `TfidfVectorizer` + `cosine_similarity`, fit once on the scheme corpus | Reimplement with a fit-once/transform-per-query design; do not assume identical output to the JS version (different IDF formula) |
| Database | None — schemes live in an in-memory JS `const` array; no persistence, refresh loses all state | SQLite | Build schema and seed from the verified 30–50 scheme dataset; wizard state should also survive refresh, which it currently does not |
| Scheme Data | 10 hard-coded schemes, no source/last_verified fields, no Maharashtra-specific entries | 30–50 verified schemes | Source, verify, and add provenance fields; fill the Maharashtra gap specifically |
| API | None (no network calls anywhere in the file) | REST endpoints for schemes + recommendations | Design a contract before frontend work starts (Phase 1 of `PROJECT_CONTEXT.md`'s own plan) |
| Recommendation logic | Eligibility-gate-then-rank, categorical Eligible/Almost/Not buckets | Relevance-ranked list per spec, with eligibility as *optional* supporting signal, not a gate | Decouple hard eligibility from relevance ranking, and relabel eligibility language per the headline finding |

---

## 8. Scope Audit

**Essential for judging:** trimmed farmer profile (the 5 required fields, plus season/interests if they stay), Python TF-IDF + cosine ranking, ranked dashboard with visible relevance scores, a real scheme details view, official application links, basic keyword-level explainability.

**Useful but optional (build only after MVP is stable, per spec's own phasing):** document readiness gauge, scheme comparison table.

**Unnecessary for this hackathon / active scope-creep risk:**
- The categorical eligibility engine (Eligible/Almost/Not-eligible) — bigger than requested, and the source of the headline compliance risk.
- The Action Plan / roadmap generator — not in MUST HAVE or OPTIONAL; it's adjacent to "crop advisory," which is explicitly Future Scope.
- The Dataset & Insights ("admin") analytics tab as currently built — not requested, and its name overpromises relative to what it does.
- Full EN/HI localization of dynamic content — the spec lists "Hindi/Marathi interface" as Optional-after-MVP, and the current partial implementation (chrome-only) risks looking broken rather than helpful if demoed carelessly.
- The `disability` field, with no eligibility logic behind it.

**Should be future scope (already correctly absent — no violation to flag):** no LLM chatbot, voice, OCR, WhatsApp, government API, auto-submission, push notifications, mobile app, weather, satellite, or crop advisory features exist in the current build. Good — nothing to walk back here.

---

## 9. Technical Risks

1. **Compliance/language risk (highest priority):** eligibility-confirmation-style language throughout the results screen directly contradicts `PROJECT_CONTEXT.md` §7. [Certain — this is a direct read of the rendered strings in `schemeCardHTML()` and `renderResults()`.] Must be relabeled before any demo or submission, independent of anything else in this list.
2. **IDF formula mismatch on migration.** The JS IDF formula differs from sklearn's default smoothed IDF. [Certain, from direct comparison of the two formulas.] Silent score drift is likely if this isn't a deliberate decision.
3. **Fit-per-query vs. fit-once corpus design.** The current pattern recomputes IDF including the live farmer profile as a document each time; the Python backend should fit once on the scheme corpus and transform the profile as a query. [Likely the right call — this is the standard sklearn usage pattern, not a hard requirement, but deviating from it without reason adds needless complexity.]
4. **Dataset scaling from 10 to 30–50 schemes** by hand, using the current keyword-stuffed description pattern, will get inconsistent without a documented template. [Likely to cause noisy/unpredictable rankings if left ad hoc.]
5. **No provenance on existing scheme data.** [Guessing — unverifiable from the file alone] whether current benefit figures are accurate; must be checked against official sources before reuse, and every new scheme needs `source`/`last_verified` from the start, per the spec's explicit "do not invent" rule.
6. **Partial bilingual coverage.** Dynamic scheme/result content stays English-only under the Hindi toggle. [Certain, from reading `data-i18n` usage — it only touches static chrome elements.] Low risk if Hindi mode isn't demoed on the results screen; real risk if it is.
7. **Zero backend/persistence currently exists.** [Certain — no `fetch`/`XMLHttpRequest` anywhere in the file, no `localStorage`.] The Flask/SQLite/API layer is a from-scratch build, not a port — worth budgeting Phase 4 time accordingly rather than treating it as "just wiring up what's already there."
8. **Two dead profile fields** (`district`, `disability`) create a mismatch between what the UI implies it's using and what the engine actually uses, undermining the "100% explainable, no black box" claim on the landing page itself. [Certain, from reading `checkEligibility()` and `buildProfileText()` — neither field appears in either function.]

---

## Recommended Next Step

This audit deliberately stops short of proposing the database schema, API contract, or dataset template — those are Phase 1 planning deliverables that should follow from decisions made in response to this report (especially items 1 and 3 above), not be pre-baked into the audit. Once eligibility-language and IDF-formula decisions are made, Phase 1 (finalize dataset fields, DB schema, API contract, user flow) can start.
