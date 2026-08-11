# KrishiMitra AI — ARCHITECTURE.md
**Step 2 — Final Technical Specification (locked)**
Source of truth: `PROJECT_CONTEXT_v3.md`. Conflicts with the original `PROJECT_CONTEXT.md` or the HTML prototype are resolved in v3's favor per its own §26 priority order, and called out explicitly where they occur.

---

## 1. Final Product Definition

**KrishiMitra AI** is a web application where a farmer enters a short profile and the system ranks government agricultural schemes by **textual relevance**, computed with TF-IDF + cosine similarity in Python/Scikit-learn.

- **Problem solved:** farmers can't tell which of dozens of schemes actually apply to them; scheme portals aren't organized by personal relevance.
- **Who uses it:** a farmer with limited technical/digital literacy, likely on a mobile-sized screen.
- **Input:** state, district, crop, and numeric land size. Optional interests capture what kind of support the farmer is looking for (see §4.1). The hackathon statement mentions farmer category, but the current implementation does **not** derive a farmer category from land size; the Phase 5 rule-layer treatment of category remains an explicit open design decision rather than an invented universal threshold.
- **What the system does:** converts the profile into a text query, compares it against a fitted TF-IDF model of the scheme corpus, ranks schemes by cosine similarity, and returns a relevance-ordered dashboard with supporting (non-gating) match information.
- **Output:** a ranked list of schemes, each with a relevance/match score, a short "why this may be relevant" explanation, benefit summary, required documents, and an official application link.
- **What it does NOT claim:** it never states or implies official government eligibility, guaranteed approval, or subsidy probability. No output string may say "eligible," "approved," or show a percentage without the words "Relevance" or "Match" attached.

This is a decision-support tool, not a chatbot, not an application-submission system, not a general agricultural advisory platform.

---

## 2. MVP Scope (frozen)

Adopting v3 §19 as the authority, with two corrections driven by the Step 1 audit and this spec's own analysis (see §19 conflict notes below for the reasoning):

### MUST HAVE
- Farmer profile: state, district, crop, numeric land size, optional interests. No automatic farmer-category derivation.
- 30–50 verified scheme dataset
- SQLite `schemes` table
- Flask backend, ML logic isolated from routes
- React + Tailwind frontend, existing visual identity preserved
- TF-IDF + cosine similarity (fit once on scheme corpus, farmer profile as query)
- Ranked recommendation list (all schemes, descending relevance)
- Relevance/Match score, correctly labeled
- Scheme details view (dedicated, not just an inline expand)
- Official application links
- Basic explainability (matched/not-found fields, not an eligibility gate)

### SHOULD HAVE
- Optional "what support are you looking for" interest selection, to strengthen the TF-IDF query — **recommended addition, see §4.1**
- Matched/missing keyword display
- Mobile-responsive layout
- Basic search/filter on `GET /api/schemes` (state, crop; any category-related filtering remains subject to the unresolved Phase 5 rule-layer design).
- Bookmarking, client-side only, if time permits

### ONLY IF TIME REMAINS
- Scheme comparison
- Advanced filtering
- Admin scheme CRUD (`POST/PUT/DELETE /api/schemes`)
- Improved multilingual UI (full dynamic-content Hindi translation, not just chrome)
- Required-documents readiness indicator, restored as a *correctly labeled* visual (see §19)

### FUTURE SCOPE (do not build)
Voice assistant, WhatsApp integration, OCR, government API integration, push notifications, native mobile app, weather/satellite recommendations, AI form-filling, real-time scheme updates, action-plan/roadmap generation, read-only admin analytics dashboard.

---

## 3. Final User Flow

```
Landing Page                          [Frontend]
      ↓
Farmer Profile (5 fields + optional interests)   [Frontend]
      ↓
Client-side validation                [Frontend]
      ↓
POST /api/recommend                   [Frontend → Backend]
      ↓
Server-side validation                [Backend]
      ↓
Profile → query text                  [Backend / ML boundary]
      ↓
TF-IDF transform (fitted vectorizer)  [ML]
      ↓
Cosine similarity vs. scheme matrix   [ML]
      ↓
Relevance score per scheme            [ML]
      ↓
Rank descending, deterministic ties   [ML / Backend]
      ↓
JSON response                         [Backend → Frontend]
      ↓
Recommendation Dashboard              [Frontend]
      ↓
Scheme Details view                   [Frontend, GET /api/schemes/:id]
      ↓
Official Application Link             [External]
```

Fits in a 2–3 minute demo: fill 5 fields → submit → ranked list with visible scores → expand one card to show matched keywords → open details → click the official link.

---

## 4.1 Why the profile isn't kept to the bare minimum

v3 §4 is right to say "do not collect unused fields" — the prototype's gender/age/income/disability fields are correctly cut (see §19). But strict minimalism has a real cost the spec doesn't account for: a query built from just `state + crop` is only two or three meaningful tokens long. Compared against scheme documents that run 40–100 words, that's a very thin basis for cosine similarity to differentiate on — most schemes that mention "Maharashtra" or "Cotton" at all will score similarly, and the ranking will mostly just reduce to "does this scheme literally name my state/crop," which is closer to a keyword filter wearing a TF-IDF costume than genuine relevance ranking.

That's not a reason to abandon TF-IDF — it's the correct required method, and it will work — but it is a reason to give the query more real text to work with. The lowest-cost fix that doesn't reintroduce the fields v3 correctly cut: keep the prototype's **interest chips** ("what kind of support are you looking for" — income support, insurance, credit, irrigation, mechanization, etc.), map each to a short keyword phrase, and fold the selected phrases into the query text. This is optional for the farmer, adds no new required profile field, and meaningfully increases how differentiated the rankings look in a demo. Recommended as **SHOULD HAVE**, not MUST HAVE — the pipeline works without it, just with less differentiation.

---

## 5. Backend Architecture

```
backend/
├── app.py            # Flask app factory, blueprint registration, startup: fit vectorizer once
├── routes/            # Thin HTTP layer only — parse request, call services, format response
├── services/           # Business logic: validation, orchestration of ML + DB calls
├── ml/                 # TF-IDF fit/transform, cosine similarity, ranking — no Flask imports
├── database/           # SQLite connection handling, schema creation, seed script
├── models/             # Scheme data class / row-mapping
└── utils/              # Shared helpers (text preprocessing, response formatting)
```

**Hard rule (from v3 §15):** `routes/` never imports from `ml/` directly. Routes call `services/`, which call `ml/` and `database/`. This keeps the ML pipeline testable in isolation (unit-test `ml/` with the 3 profiles from §20 of `ML_RECOMMENDER.md` without spinning up Flask at all).

The vectorizer is fit **once**, at app startup, on the full scheme corpus loaded from SQLite (see `ML_RECOMMENDER.md` §Corpus Decision). It stays in memory for the process lifetime. A refit is needed only if the scheme dataset changes — not required for MVP; if Admin CRUD is built (ONLY IF TIME REMAINS), a refit-on-write is a one-line addition, not a redesign.

---

## 6. Frontend Architecture

```
frontend/
├── src/
│   ├── components/     # Navbar, ProfileWizard (steps), SchemeCard, ScoreBadge,
│   │                    # ExplainPanel, Tabs, Disclaimer
│   ├── pages/           # LandingPage, ProfileWizardPage, DashboardPage, SchemeDetailsPage
│   ├── services/        # API client (fetch wrappers to Flask)
│   ├── hooks/            # useRecommendation, useSchemes
│   └── App.jsx           # Routing
```

**What carries over conceptually from the HTML** (full token values in `DESIGN_SYSTEM.md`): header/brand lockup, hero section copy and layout, the wizard stepper pattern (now 2 steps instead of 4 — see §19), the scheme-card + expand-panel pattern (relabeled, see §19), the tab bar (Recommendations always present; Compare only if built), the disclaimer block verbatim, the footer.

**What does not carry over:** all client-side TF-IDF/cosine JS (moves to Python), the categorical eligible/almost/not-eligible bucket logic (removed, see §19), the Action Plan tab and Admin analytics tab (removed, see §19).

Scheme Details becomes an actual routed page/view (`/schemes/:id` or a modal treated as a distinct view in the component tree), not just an inline `<details>`-style expand — this directly closes the Step 1 gap where the spec's "Scheme Status Page" requirement wasn't structurally met.

---

## 7. Frontend → Backend Data Flow

```
User fills 5-field form (+ optional interests)
      ↓
React validation (required fields, land size > 0)
      ↓
POST /api/recommend
      ↓
Flask route (routes/recommend.py) — parses & re-validates request
      ↓
Service layer — builds profile query text, calls ml/
      ↓
ML module — transform(profile_text) against pre-fitted vectorizer
      ↓
Cosine similarity vs. in-memory scheme matrix
      ↓
Ranking (descending score, alphabetical tiebreak)
      ↓
Service layer — merges scores with scheme metadata from SQLite
      ↓
JSON response
      ↓
React dashboard renders ranked cards
```

Responsibility split: **Frontend** owns form UX and validation feedback; **Backend/services** own request validation and response shaping; **ML** owns only the vector math and ranking, nothing else; **Database** owns scheme storage and is read-only at request time (no writes happen on `/api/recommend`).

---

## 8. Design Integration

Use `DESIGN_SYSTEM.md` token-for-token in the Tailwind config (`theme.extend.colors`, etc.) — same names as the CSS custom properties (`turmeric`, `sprout`, `bg2`, `bg3`, `ink-dim`, ...) to keep design docs and code from drifting apart.

Two open items from `DESIGN_SYSTEM.md` §8, resolved here:
- **`--paper2` vs. the literal `#F0EAD5`** used for the "almost eligible" card variant: moot now, since that variant is removed along with the eligibility buckets (§19). `--paper2` can be repurposed for any future secondary paper surface, or dropped.
- **Emoji iconography vs. `lucide-react`:** keep emoji for MVP. Zero migration cost, matches the existing visual identity exactly, and hackathon time is better spent on the ML pipeline and dataset. Revisit only in the ONLY-IF-TIME-REMAINS pass.
- **`:has()` CSS selector** for the gender radio: moot — gender is cut from the profile entirely (§19).

---

## 9. Remove / Simplify / Keep — Full Decision Table

| Existing Feature | Decision | Reason |
|---|---|---|
| 4-step wizard, 9+ fields (incl. income, gender, age, disability) | **Simplify** | Trim to the 5 v3-required fields + optional interest chips. Income/gender/age/disability are cut entirely — not in v3's required profile, and the rule layer they used to feed (§8 below) is also being narrowed. |
| Automatic farmer-category derivation from land size | **Remove** | Universal acreage thresholds were removed. Land size stays numeric and is reserved for verified scheme-specific threshold checks; the Phase 5 category rule is unresolved. |
| Client-side JS TF-IDF/cosine | **Remove from frontend** | Must run in Python/Scikit-learn per the hackathon's explicit ML constraint. |
| Eligible / Almost eligible / Not eligible categorical buckets | **Remove** | Directly produces the "Eligibility: 100%" language v3 §9 explicitly bans. Replaced by non-gating match/no-match flags — see `ML_RECOMMENDER.md` §Eligibility vs Relevance. |
| "Why this scheme?" explain panel | **Simplify** | Keep the structure, relabel from "Eligibility check" to "Why this may be relevant," drop the rows tied to fields that no longer exist (gender/age/income). |
| Circular readiness gauge (document completeness %) | **Simplify, defer** | The plain required-documents list stays (it's part of the MUST-HAVE output schema). The percentage gauge and "Growing/Sprouting/Ready" language implied progress toward *eligibility* — the same overclaim risk as the buckets above. Restore as ONLY-IF-TIME-REMAINS with corrected labeling ("Documents you may need" rather than a stage/progress metaphor). |
| Compare tab + floating compare bar | **Keep, ONLY IF TIME REMAINS** | Matches v3 §19 exactly; not core to the judged demo. |
| Action Plan / roadmap tab | **Remove entirely** | Not present in any of v3's four scope tiers. Functionally adjacent to "crop advisory," which the original `PROJECT_CONTEXT.md` explicitly lists as Future Scope. Not deferred — cut. |
| Dataset & Insights ("admin") analytics tab | **Remove** | Not requested anywhere in v3. It also isn't the admin feature v3 actually sanctions — v3's Admin CRUD (ONLY IF TIME REMAINS) is a *different* capability (letting the data team edit scheme records without touching SQL), not read-only session analytics. Build the CRUD version later if time remains; don't resurrect the analytics tab. |
| EN/HI language toggle | **Simplify** | Keep for static UI chrome (already mostly works). Do not attempt full dynamic-content Hindi translation for MVP — matches v3 §19's "improved multilingual UI" being ONLY IF TIME REMAINS, and avoids the partial-coverage look flagged in Step 1. |
| Disclaimer block | **Keep, verbatim pattern** | Doing real compliance work; non-negotiable. |
| Bookmark/save | **Add (new)** | SHOULD HAVE per v3. No farmer accounts exist, so implement as client-side React state only — no backend table needed (see `DATABASE_SCHEMA.md`). |
| Search/filter on scheme list | **Add (new)** | SHOULD HAVE per v3; simple query params on `GET /api/schemes`. |
| Voice / WhatsApp / OCR / government API / push / mobile app / weather / satellite | **Correctly absent** | Future Scope; no action needed, nothing to walk back. |

---

## 10. Deployment Architecture

```
Frontend → Vercel
Backend  → Render
Database → SQLite (file-based, seeded at boot)
```

SQLite is appropriate here: 30–50 rows, read-heavy, single judged-demo concurrency level — a production database would be solving a problem this project doesn't have. One real caveat worth planning around: some Render tiers have ephemeral or cold-start-reset filesystems, which can silently wipe a bare SQLite file across redeploys. Mitigation: the seed script (loading the verified scheme dataset into SQLite) should run idempotently at app startup, not be treated as a one-time manual step — so a redeploy during the hackathon never means "the data's gone until someone remembers to reseed it."

---

## 11. Final Architecture Diagram

```
                 ┌─────────────────────┐
                 │   React Frontend    │
                 │  (Vercel)            │
                 └──────────┬──────────┘
                            │
                         REST API (JSON)
                            │
                 ┌──────────▼──────────┐
                 │     Flask Backend    │
                 │  (Render)             │
                 │  routes → services    │
                 └───────┬───────┬─────┘
                         │       │
                ┌────────▼───┐ ┌─▼──────────────┐
                │ ML Engine   │ │  SQLite         │
                │ (in-process)│ │  schemes table  │
                │             │ │  seeded at boot │
                │ TfidfVectorizer  │             │
                │ fit ONCE at    │             │
                │ startup on     │             │
                │ scheme corpus  │             │
                │             │ │             │
                │ cosine_similarity│           │
                │ per request    │ │             │
                └────────────┘ └────────────────┘
```

---

## 12. Final Decisions (locked)

```
ML:                     TF-IDF + Cosine Similarity
ML library:             Scikit-learn (TfidfVectorizer, cosine_similarity)
Corpus fitting:         Fit ONCE on scheme corpus at app startup; profile transformed as a query
Backend:                Flask, ML logic isolated in ml/, never imported by routes/
Frontend:               React + Tailwind, existing visual identity preserved via DESIGN_SYSTEM.md
Database:               SQLite, single `schemes` table, no persistent accounts
Profile fields:         state, district, crop, land_size, optional interests — MUST HAVE / SHOULD HAVE as defined in the locked MVP. No automatic category derivation.
                        interests — SHOULD HAVE, improves query signal (see §4.1)
                        gender/age/income/disability — CUT, not collected
Dataset:                30–50 verified schemes, source + last_verified recorded
Primary ML output:      Relevance Score / Match Score — never "Eligibility %"
Official eligibility:   NOT determined by ML or by the rule layer; rule layer only flags, never gates
Ranking:                All schemes returned, cosine similarity descending, alphabetical tiebreak
Removed from prototype: Action Plan tab, Admin analytics tab, categorical eligibility buckets,
                        client-side ML, gender/age/income/disability profile fields
Deployment:             Vercel (frontend) / Render (backend) / SQLite seeded idempotently at boot
```

---

## 13. STEP 3 — Implementation Plan

Build in this order — each step should be independently demoable/testable before moving to the next:

1. **Dataset sourcing & verification** — reach 30–50 schemes with `source` + `last_verified` populated; explicitly close the Maharashtra-scheme gap flagged in Step 1. (See `DATASET_STRUCTURE.md`.)
2. **Database** — create the `schemes` table, write an idempotent seed script from the verified dataset. (See `DATABASE_SCHEMA.md`.)
3. **ML module** — implement fit-once/transform-per-query TF-IDF + cosine similarity in `ml/`, unit-tested against the 3 profiles defined in `ML_RECOMMENDER.md` §Testing, with no Flask dependency.
4. **Backend wiring** — `routes/` + `services/` implementing the three core endpoints in `API_DOCUMENTATION.md`; manual/Postman verification of request/response shapes and error codes.
5. **Frontend scaffold** — Tailwind config from `DESIGN_SYSTEM.md`, base layout, routing.
6. **Wizard + Dashboard + SchemeCard** — wired to the live API, using the trimmed 5-field (+interests) profile.
7. **Scheme Details view** and **Explain panel** (relabeled, non-gating).
8. **SHOULD-HAVE additions** — search/filter, bookmarking — only after the core loop is demo-ready end to end.
9. **Deployment** — Vercel + Render, verify the seed script survives a redeploy.
10. **Demo rehearsal** against the 3 test profiles from `ML_RECOMMENDER.md`, confirming visibly different rankings and that the ML pipeline (not a lookup table) is what's on screen.
11. **ONLY-IF-TIME-REMAINS** items last, in the order listed in §2, only if the core loop is solid.

Do not start step *n+1* before step *n* is verifiably working — this is a small team on a deadline, and the biggest risk to the demo is a half-wired backend, not a missing polish feature.
