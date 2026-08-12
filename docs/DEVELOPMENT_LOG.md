# KrishiMitra AI — Development Log

## Session 4 — Phase 5: Informational Match and Explanation Layer

**Date:** 2026-08-09
**Scope:** Add the informational match/explanation layer to `POST /api/recommend`. Implements four match signals (state, crop, land_size, interests) and generates human-readable `match_reasons` strings per recommendation result. No ML files, database schema, routes, or Phase 3/4 behavior were modified. Category matching intentionally skipped (known data limitation).

### Files created

| File | Purpose |
|---|---|
| `backend/services/match_service.py` | Pure-function match service: `compute_match_signals()` (four signals) and `build_match_reasons()` (explanation strings with hard eligibility-language ban). No Flask, no sklearn, no SQLite imports — fully testable in isolation. |
| `backend/tests/test_phase5_match.py` | 30-test pure-function unit test suite for match_service. No Flask client, no database required. |

### Files modified

| File | What changed |
|---|---|
| `backend/services/recommend_service.py` | Removed inline `_compute_match_flags()` (logic moved to `match_service`). Added `from services.match_service import compute_match_signals, build_match_reasons`. Each recommendation result now includes `match_reasons: list[str]` and an extended `match_flags` with an `interests` key. No route, ML, or validation logic changed. |
| `backend/tests/test_api.py` | 6 new Phase 5 API tests appended (existing 16 preserved unchanged). `test_response_structure` extended to assert `match_reasons` key present and `match_flags.interests` structure. |

### Phase 5 match signals — design record

| Signal | Type | Data source | Notes |
|---|---|---|---|
| `state` | `bool` | `scheme.state` vs `profile.state` | `"All"` → always True; case-insensitive |
| `crop` | `bool` | `scheme.crop` vs `profile.crop` | null or `"All"` → True (not crop-specific); comma-separated list checked |
| `land_size` | `bool \| null` | `scheme.min_land_acres`, `scheme.max_land_acres` | `null` when no threshold declared; **null for all 11 dev-seed schemes** |
| `interests` | `{matched: [], not_found: []}` | `INTEREST_KEYWORDS` vs scheme text | Reuses same mapping that builds TF-IDF query; tokens checked against `eligibility_keywords + description + benefits` |

**Category matching:** intentionally skipped. The `category` column is free-text prose (e.g. `"All, with priority for Marginal and Small farmers"`) — a reliable boolean comparison is not possible without a structured enum. Documented as a known data limitation in `match_service.py` module docstring.

**Land size — all null:** All 11 development seed schemes have `min_land_acres = null, max_land_acres = null`. The `land_size` signal returns `null` for all records. This is correct and expected behavior — the real 30-50 verified dataset may add thresholds where applicable (equipment subsidies, state schemes). Do not invent thresholds.

**Eligibility language ban:** `build_match_reasons()` includes a defensive scan that drops any reason string containing banned terms (`eligible`, `eligibility`, `approved`, `guaranteed`, `qualify`, `qualifies`). All reason templates are built from structured fields (state names, crop names, numeric thresholds, controlled interest labels) — none of which contain these terms, so the scan is a safety net only.

**TF-IDF unchanged:** `match_service` runs after the recommender returns ranked scores. It has no access to the vectorizer and makes no changes to scores or ordering. Confirmed by `test_phase5_tfidf_ranking_unchanged`.

### Phase 5 test results

```
test_phase5_match.py: 30 passed in 0.13s
test_api.py:          22 passed in 0.66s  (16 Phase 4 + 6 Phase 5, all passed)
test_ml_pipeline.py:   5 passed, 1 xfailed (unchanged from Phase 4)
-------
Total:                57 passed, 1 xfailed in 0.79s — ALL TESTS PASSED
```

All 12 required test conditions covered:
1. State signal exact match ✅
2. State signal nationwide ("All") ✅
3. State signal mismatch ✅
4. Crop signal exact match ✅
5. Crop signal "All" / null ✅
6. Crop signal mismatch ✅
7. Land size within thresholds ✅
8. Land size without threshold → null ✅
9. Interests signal matched ✅
10. Interests signal not found ✅
11. Empty/unknown interests ✅
12. Nationwide schemes, no interests, match_reasons structure, no eligibility language, TF-IDF unchanged ✅

### match_reasons example — live output

Profile: Maharashtra / Cotton / 1.8 ac / [irrigation, credit]
Scheme: PMKSY (irrigation scheme, All states):
```json
[
  "This scheme is available nationwide — your state (Maharashtra) is covered.",
  "This scheme is not restricted to a specific crop — Cotton growers may apply.",
  "No land size threshold is specified for this scheme.",
  "Your interest in irrigation support is reflected in what this scheme supports.",
  "Your interest in credit / loans is reflected in what this scheme supports."
]
```

### Current development position

End of Phase 5 — informational match and explanation layer complete. All tests passing.

**Next:** React + Tailwind frontend (Phase 6). Backend is now feature-complete for the MVP core loop. Dataset expansion to 30-50 schemes remains pending (separate task).

---

## Session 3 — Phase 4: Flask REST API integration

**Scope:** Implement the three core Flask endpoints (`GET /api/schemes`, `GET /api/schemes/<id>`, `POST /api/recommend`) connecting the existing Phase 3 SQLite database and TF-IDF recommender through a validated API. No Phase 3 ML files were modified.

### Files created

| File | Purpose |
|---|---|
| `backend/app.py` | Flask app factory: idempotent seed at startup, fit recommender once, register blueprints |
| `backend/database/db.py` | SQLite connection helper with `__file__`-relative path resolution |
| `backend/models/scheme.py` | Row serializers: `scheme_to_list_dict()` (light view), `scheme_to_detail_dict()` (full view including required_documents as list) |
| `backend/services/scheme_service.py` | `get_all_schemes(state, crop)` with `OR state = 'All'` filter; `get_scheme_by_id(id)`; `get_all_schemes_for_recommender()` |
| `backend/services/recommend_service.py` | `validate_recommend_request()` (validation before ML); `build_recommendation()` (profile text → ML → metadata merge → match_flags); `_compute_match_flags()` (informational only, land_size returns null if no scheme thresholds) |
| `backend/routes/schemes.py` | Blueprint for GET /api/schemes and GET /api/schemes/<id> |
| `backend/routes/recommend.py` | Blueprint for POST /api/recommend |
| `backend/tests/test_api.py` | 16-test API test suite using Flask test client |

### Files modified

None of the Phase 3 implementation files were modified. `docs/API_DOCUMENTATION.md` was inspected — the stale "category derived from land_size" sentence was already absent; no change was needed.

### Phase 3 ML pipeline rerun (unchanged behavior confirmed)

Run against the same 11-scheme dev corpus and 3 test profiles. Results identical to Session 2:

| Check | Result |
|---|---|
| Determinism | PASS |
| Different profiles → different rankings | PASS |
| Maharashtra-only scheme scores higher for MH vs PB profile | **FAIL** (0.0648 vs 0.0974) — expected, same root cause as Sessions 1 & 2 (IDF collapse from seed data overuse of "Maharashtra"); no code change |
| Empty interests no crash | PASS |
| Scores in [0,1] | PASS |
| All 11 schemes returned | PASS |

Top-3 per profile (unchanged from Session 2): Profile A: PMKSY 59%, KCC 15%, PM-FME 13%. Profile B: NFSM 17%, PMFBY 16%, Namo Shetkari 10%. Profile C: NFSM 13%, Namo Shetkari 12%, PM-KISAN 11%.

### Phase 4 API test results

**359 passed, 0 failed — ALL TESTS PASSED**

16 test groups covering: valid recommend request, missing state/crop/land_size, zero/negative/non-numeric land_size, whitespace-only required fields, unknown interest IDs silently dropped, recommend with no interests, GET /api/schemes unfiltered and filtered, GET by valid and nonexistent ID, different profiles produce different rankings, full response structure validation including no eligibility-confirmation language in structural API fields.

### Live endpoint verification (Flask dev server)

All 5 manual checks passed:
- `GET /api/schemes` → 200, count:11, eligibility_keywords absent from list view ✅
- `GET /api/schemes/pmkisan` → 200, full detail, required_documents as JSON list ✅
- `POST /api/recommend` (Maharashtra/Cotton/1.8ac/irrigation+credit) → 200, top scheme PMKSY 59%, match_flags informational ✅
- `POST /api/recommend` (missing land_size) → 400, {"error": "land_size is required", "field": "land_size"} ✅
- `GET /api/schemes/NONEXISTENT_ID_99` → 404, {"error": "Scheme not found", "id": "NONEXISTENT_ID_99"} ✅

### Issues discovered and resolved

**Test: eligibility language scan false positives.** The initial `test_api.py` scanned raw scheme `benefits` text for words like "eligible" and "approved". Two Phase 3 seed records contain these words in factual government language ("per eligible farmer family", "eligible for a claim") — these are not eligibility-confirmation language introduced by the API. Resolution: narrowed the check to scan only structural API fields (match_flags dict, result key names, relevance label names) rather than raw text content from the database. The important invariants (no `eligibility_percent` field, no `eligibility_score` field, no eligibility terms in `match_flags` values or result keys) are still fully enforced.

**Test: Unicode arrow in assertion label.** The label "whitespace state → 400" used a Unicode arrow character (→) that caused a `UnicodeEncodeError` on the Windows cp1252 console. Resolution: replaced with ASCII "->".

### Match flags design (confirmed informational only)

`match_flags` in every `/api/recommend` result contains exactly: `{"state": bool, "crop": bool, "land_size": bool|null}`. `land_size` is `null` for all 11 dev-seed schemes (none declare `min_land_acres`/`max_land_acres` thresholds). No eligibility-confirmation language appears in any API-generated structural field. TF-IDF cosine similarity remains the ranking mechanism; match_flags do not affect ranking.

### Not implemented (out of scope for Phase 4)

- Phase 5 rule/keyword layer
- React frontend
- Final 30-50 verified dataset
- Admin CRUD endpoints
- Bookmarking

### Next steps

1. Expand dataset from 11 dev-seed schemes to 30-50 verified schemes with Maharashtra coverage (Dataset team).
2. Phase 5: add the 4-check informational rule layer (state/crop/category/land threshold).
3. React + Tailwind frontend wired to the live API.

---

## Session 2 — Correction: category no longer derived from land size

**Instruction:** category must not be derived from land size via universal acreage thresholds anywhere in the TF-IDF query path. Land size stays numeric, used only against verified, scheme-specific thresholds in the rule/match layer (Phase 5, not yet built). Scope: this one correction only — no ML redesign, no new features, no Flask/API/frontend work.

**Files changed:**
- `backend/utils/text_utils.py` — removed `CATEGORY_THRESHOLDS`, `DEFAULT_CATEGORY`, and `land_size_to_category()` entirely (not just unused — deleted, since the rule layer needs a direct numeric comparison against `min_land_acres`/`max_land_acres`, not a category label, so the function had no remaining purpose). `build_profile_text()` signature changed from `(state, crop, category, interests)` to `(state, crop, interests)`.
- `backend/tests/test_ml_pipeline.py` — updated both call sites, removed the "Derived category" print line, replaced with an explicit note that `land_size` is present on each test profile but not used in query construction.
- `docs/ML_RECOMMENDER.md` §1 — rewritten: query template, examples, and the "why interests matter" argument all updated to reflect the now-thinner 2-3 token base query (crop + state only, no category). Added an explicit note flagging that the rule layer's own "Category" check (§5) now has an open question — it previously assumed a derived farmer-category value to compare against a scheme's target categories, and that value no longer exists. **Not resolved here** — left for Phase 5, per the instruction not to redesign anything beyond the specific correction requested. §8's test profile table updated to drop the derived-category column. §9 addendum extended with the rerun results below.

**Not touched, on purpose (flagged for follow-up before Phase 4):** `docs/API_DOCUMENTATION.md`'s `POST /api/recommend` spec still says category is "derived server-side from land_size" and explicitly not accepted from the client — that's now stale given this correction, but updating it wasn't in the requested file list for this correction, so it's left as-is here and flagged for whoever picks up Phase 4 to reconcile before wiring the actual endpoint. Same applies to `docs/ARCHITECTURE.md` §4.1/§12, which still describe category as "auto-computed."

### Rerun results (same 11-scheme dev corpus, same 3 profiles, category removed from query)

| Check | Before correction | After correction |
|---|---|---|
| Determinism | PASS | PASS |
| Different profiles → different rankings | PASS | PASS |
| Maharashtra-only scheme scores higher for MH profile than Punjab profile | FAIL (0.0684 vs 0.0996) | **FAIL (0.0648 vs 0.0974)** |
| Empty interests doesn't crash | PASS | PASS |
| Scores in [0,1] | PASS | PASS |
| All schemes returned, no hidden threshold | PASS | PASS |

The one pre-existing failure persists, at essentially the same magnitude, for the same reason recorded in Session 1 (every scheme document contains the literal word "Maharashtra," so its IDF is at the floor regardless of what else is or isn't in the query). That the failure didn't change meaningfully after removing category from the query is itself useful confirmation that the Session 1 diagnosis was correct — the cause really is the seed data's overuse of "Maharashtra" as boilerplate, not something related to category tokens. No new failures were introduced.

Top-3 ranked schemes per profile, actual computed percentages, post-correction:
- **Profile A** (Maharashtra / Cotton / Irrigation+Credit): PMKSY 59%, KCC 15%, PM-FME 13%
- **Profile B** (Punjab / Wheat / Insurance): NFSM 17%, PMFBY 16%, Namo Shetkari 10%
- **Profile C** (Gujarat / Vegetables / no interests): NFSM 13%, Namo Shetkari 12%, PM-KISAN 11%

---

## Session 1 — Step 3, Phases 1-3

### What was implemented

**Phase 1 — Project foundation**
- Created `krishimitra-ai/{frontend,backend,docs}` structure exactly as specified.
- `backend/` scaffolded with `routes/`, `services/`, `ml/`, `database/`, `models/`, `utils/`, `tests/` — all importable Python packages.
- `requirements.txt` pinned to what actually installed and was tested in this environment: Flask 3.1.3, Flask-Cors 6.0.5, scikit-learn 1.8.0.
- Root `README.md` and `.gitignore` written.
- Locked Step 1 & 2 docs (`ARCHITECTURE.md`, `ML_RECOMMENDER.md`, `DATABASE_SCHEMA.md`, `API_DOCUMENTATION.md`, `DATASET_STRUCTURE.md`, `DESIGN_SYSTEM.md`, `STEP1_AUDIT_REPORT.md`) copied into `docs/` unchanged. `PROJECT_CONTEXT_v4.md` copied in as `docs/PROJECT_CONTEXT.md`.

**Phase 2 — Dataset and database**
- `backend/database/schema.sql` — the `schemes` table, exactly matching `DATABASE_SCHEMA.md` (single table, 14 columns, no accounts/bookmarks tables).
- `backend/database/seed/schemes_seed.json` — **an 11-scheme development/test seed dataset, explicitly NOT the final 30-50 verified dataset.** 5 records (PM-KISAN, PMFBY, KCC, Soil Health Card, e-NAM) were confirmed via live web search this session, cited in each record's `source` field. 6 records (SMAM, PM-FME, NFSM, MKSP, PMKSY, Namo Shetkari) rely on stable general knowledge and are explicitly flagged in their own `source` field as needing a Research/Data team verification pass before final submission — no benefit figures were invented for any of them; where I wasn't confident of an exact number I described the benefit qualitatively instead. One genuine Maharashtra state scheme (Namo Shetkari Mahasanman Nidhi Yojana) is included, directly addressing the Maharashtra-coverage gap flagged in `STEP1_AUDIT_REPORT.md` and `DATASET_STRUCTURE.md` — though at 1 of 11, Maharashtra coverage is still far short of the 10-15 target and needs real work in Phase 3(data)/dataset-sourcing.
- `backend/database/seed_db.py` — idempotent seed script (drop+recreate schema, validate required fields present before inserting, refuse to seed a scheme missing any required field). Run and verified: seeds 11 rows correctly.

**Phase 3 — ML recommender**
- `backend/utils/text_utils.py` — `land_size_to_category()` (deterministic bucketing, same thresholds as the original prototype) and `build_profile_text()` (implements the exact query template from `ML_RECOMMENDER.md` §1 — crop/category/state only, district and raw land size excluded, optional interest keywords folded in).
- `backend/ml/scheme_document.py` — builds each scheme's TF-IDF document from `scheme_name + description + benefits + eligibility_keywords`, per `ML_RECOMMENDER.md` §2.
- `backend/ml/recommender.py` — `SchemeRecommender` class implementing Approach A exactly: `fit()` is called once on the scheme corpus, `recommend()` transforms a profile as a query and returns every scheme ranked by cosine similarity descending, alphabetical tiebreak. No Flask or sqlite3 imports in this file, per the architecture's layering rule.
- `backend/tests/test_ml_pipeline.py` — runs the actual pipeline against the real seeded schemes and the 3 test profiles from `ML_RECOMMENDER.md` §8. **No scores were written in advance** — the script prints whatever the pipeline actually computes.

### Actual test results (run against the 11-scheme dev seed set)

Full output is reproducible via `python tests/test_ml_pipeline.py`. Summary:

| Check | Result |
|---|---|
| Determinism (same profile, run twice → identical ranking) | **PASS** |
| Different profiles (A vs B) produce different rankings | **PASS** |
| Maharashtra-only scheme scores higher for Maharashtra profile than Punjab profile | **FAIL** (0.068 vs 0.100 — see "Problem encountered" below) |
| Empty interests list doesn't crash the pipeline | **PASS** |
| All relevance scores fall within [0, 1] | **PASS** |
| Every profile returns all 11 schemes (no hidden threshold) | **PASS** |

Top-3 ranked schemes per test profile, actual computed percentages:

- **Profile A** (Maharashtra / Cotton / Marginal / Irrigation+Credit): PMKSY 60%, KCC 16%, PM-FME 13%
- **Profile B** (Punjab / Wheat / Marginal / Insurance): NFSM 17%, PMFBY 17%, PM-KISAN 11%
- **Profile C** (Gujarat / Vegetables / Large / no interests): PM-KISAN 15%, NFSM 11%, Namo Shetkari 11%

### Problem encountered — and what it actually revealed

One of my own diagnostic checks (not part of the locked spec's required tests — an extra one I added to sanity-check state-text matching specifically) failed: the Namo Shetkari scheme (Maharashtra-only) scored **higher** for the Punjab profile (10.0%) than for the Maharashtra profile (6.8%). That's backwards from what you'd naively expect.

Root cause, confirmed by inspecting the fitted vectorizer's IDF weights directly: **I used "Maharashtra" as the illustrative example state in nearly every scheme's `eligibility_keywords` field** while writing the seed data (e.g. "...in Maharashtra and other participating states" appears in 8 of 11 records, including ones that have nothing state-specific about them). The result: "Maharashtra" appears in **all 11 of 11** scheme documents, so its IDF collapses to the mathematical floor (1.0 — the minimum possible). A term that appears in every document carries almost no discriminative power in cosine similarity, no matter how many times a query repeats it. Separately, Profile A's query is longer and includes several high-IDF, irrigation/credit-specific terms (`irrigation`, `drip`, `credit` — IDF 2.1–2.8) that don't appear in the Namo Shetkari document at all; those terms inflate the query vector's norm without adding to the dot product against that scheme, which — because cosine similarity normalizes by vector length — mechanically dilutes Namo Shetkari's *relative* score for Profile A even though it should, intuitively, be a strong match.

This is not a bug in `ml/recommender.py` — the math is doing exactly what TF-IDF + cosine similarity is supposed to do. It's a **seed-data quality problem I introduced**: I violated my own guidance in `DATASET_STRUCTURE.md` ("no keyword-stuffing... `eligibility_keywords` should read as a genuine sentence, not a keyword dump") by defaulting to "Maharashtra" as a lazy example state across records that are genuinely nationwide. Fix, to apply during real dataset sourcing: only name a state in `eligibility_keywords` when the scheme is actually state-restricted; for genuinely nationwide schemes, say "available nationwide" or similar rather than naming an example state, so state names stay high-IDF and discriminative for the schemes that actually need them (state-specific ones like Namo Shetkari).

Worth keeping in view, not just as a one-off fix: this same dilution effect will show up again as the dataset grows to 30-50 schemes if descriptions aren't written with real variation — a good thing to re-check once the real dataset lands, not just something to patch in this dev set and forget.

**Encouraging finding, same session:** the §4.1 rationale for keeping optional interest chips (`ARCHITECTURE.md`) shows up directly in the real numbers — Profile A (with interests selected) tops out at 60% relevance with clear separation between ranks 1-3; Profile C (no interests, same otherwise-thin profile) tops out at only 15% with much flatter differentiation. That's the exact "thin query → flat scores" effect predicted before any code existed, now confirmed empirically rather than just argued for.

### What remains (next phases)

- Phase 4: Flask routes + services wiring (`GET /api/schemes`, `GET /api/schemes/:id`, `POST /api/recommend`), vectorizer fit once at app startup.
- Phase 5: the 4-check rule layer (state/crop/category/land threshold), informational only, non-gating.
- Phase 6: full testing including invalid-input handling at the API validation layer (not yet built) — the ML-layer-only checks above are a subset of this, done early per the "implement and test ML before frontend" instruction.
- Phase 7-8: React + Tailwind frontend, wired to the real API.
- Dataset: expand from 11 dev-seed schemes to the real 30-50, with the `eligibility_keywords` fix above applied, and genuine Maharashtra coverage brought from 1 up to the 10-15 target in `DATASET_STRUCTURE.md`.
