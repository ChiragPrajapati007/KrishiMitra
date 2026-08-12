# KrishiMitra AI — DATASET_STRUCTURE.md
**Step 2 — Final Dataset Specification (structure only — no scheme data invented here)**

Per both Step 2 instructions and v3 §13: this document defines structure and sourcing rules only. No actual scheme records are created in this step — that's Step 3 dataset-sourcing work, done against official portals.

---

## Final Schema (matches `DATABASE_SCHEMA.md`)

| Field | Type | Required | Purpose |
|---|---|---|---|
| `id` | string (slug) | Yes | Unique identifier, human-readable |
| `scheme_name` | string | Yes | Official scheme name |
| `description` | string | Yes | Main descriptive text — feeds TF-IDF |
| `benefits` | string | Yes | Benefit summary — feeds TF-IDF |
| `state` | string | Yes | Applicable state(s) or `"All"` |
| `crop` | string | No | Applicable crop(s) or `"All"`; null if not crop-specific |
| `category` | string | No | Target farmer category/categories or `"All"`; null if not category-specific |
| `eligibility_keywords` | string | Yes | Natural-language applicability phrase — feeds TF-IDF (see `ML_RECOMMENDER.md` §2 for why this field matters) |
| `required_documents` | string (comma-separated) | No | Populate wherever the official source specifies it |
| `application_link` | string (URL) | Yes | Official portal link |
| `source` | string | Yes | Where the record was verified — **no source, no entry in the dataset** |
| `last_verified` | date (`YYYY-MM-DD`) | Yes | Verification date |
| `min_land_acres` | number | No | Rule-layer threshold only |
| `max_land_acres` | number | No | Rule-layer threshold only |

---

## Target Distribution (30–50 schemes)

Reasoning, not just a quota: Step 1 found the existing 10-scheme prototype dataset had **zero genuinely Maharashtra-specific state schemes** despite v3 explicitly calling for a Maharashtra/state mix — this distribution exists specifically to close that gap, not as an arbitrary split.

| Bucket | Suggested count | Notes |
|---|---|---|
| Central government — income/credit/insurance | 8–10 | PM-KISAN, PMFBY, KCC-style schemes; likely already well-covered by the existing 10, just needs source/date verification |
| Central government — irrigation/mechanization/soil/marketing/processing | 6–8 | Same category shape as the existing 10, verify and retain what's accurate |
| **Maharashtra-specific state schemes** | **10–15** | The gap. Needs direct sourcing from Maharashtra's Department of Agriculture and `mahadbt.maharashtra.gov.in` or equivalent official portals — do not substitute a central scheme that merely happens to include Maharashtra in its state list |
| Other state schemes (only if genuinely relevant/available) | 0–5 | Optional filler if Maharashtra sourcing alone doesn't reach the target count |
| Crop insurance / welfare (women, SC/ST, etc.) | 4–6 | Broadens category diversity for demo purposes (visibly different `catLabel`s make the ranked list more convincing) |

Total: 30–50. Exact split is a data-sourcing outcome, not a hard requirement — the Maharashtra minimum (10–15) is the one number worth holding firm on, since it's the one Step 1 explicitly flagged as missing.

---

## Data Quality Rules (non-negotiable, per v3 §13)

1. **Official source preferred** — government portal, ministry site, or `myscheme.gov.in`-style aggregator that itself cites the official scheme.
2. **Valid, working application/information link** — checked at the time of entry, not assumed from an old reference.
3. **No fabricated benefits.** If an exact figure (₹ amount, subsidy %) can't be confirmed, describe it qualitatively rather than inventing a number.
4. **No fabricated eligibility conditions.** Same principle — omit rather than guess.
5. **No duplicate schemes** — check `id`/`scheme_name` against the existing set before adding.
6. **Clear, factual description** — no keyword-stuffing beyond what's naturally true of the scheme (v3 §8 explicitly warns against this; `eligibility_keywords` should read as a genuine sentence, not a keyword dump — see `ML_RECOMMENDER.md` §2).
7. **`source` recorded** for every entry — a scheme without a recorded source does not go into the dataset, full stop.
8. **`last_verified` recorded** for every entry, and re-checked if the hackathon timeline stretches over multiple weeks (scheme terms and portal URLs do change).

---

## Handoff to Step 3

This document intentionally stops at structure. Step 3's Research/Data workstream (`ARCHITECTURE.md` §13, step 1) is responsible for populating this schema with real, sourced records and feeding them into the seed script defined in `DATABASE_SCHEMA.md`.
