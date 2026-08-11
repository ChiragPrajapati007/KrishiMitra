# KrishiMitra AI — DATABASE_SCHEMA.md
**Step 2 — Final Database Schema (locked)**

---

## Decision: one table

The MVP needs exactly one table: `schemes`. No `users`, `profiles`, `applications`, or `bookmarks` tables.

- **No persistent farmer accounts** — v3 §14 explicitly says these aren't required for the core demo, and nothing in the MUST/SHOULD-HAVE scope needs a farmer to be identifiable across sessions.
- **Bookmarking (SHOULD HAVE)** is implemented as client-side React state only. With no accounts, there's nothing meaningful to persist server-side — a `bookmarks` table would need a `user_id` that doesn't exist. If judges close the tab, bookmarks reset; that's an acceptable, correctly-scoped limitation for a hackathon demo, not a gap.
- Adding tables "because they might be useful later" is exactly the over-engineering v3 §20 warns against — resist it here.

---

## `schemes` table

| Column | Type | Primary Key | Nullable | Description |
|---|---|---|---|---|
| `id` | `TEXT` | Yes | No | Unique scheme identifier (short slug, e.g. `pmkisan`, `pmfby` — matches the prototype's existing id convention, human-readable in logs/debugging) |
| `scheme_name` | `TEXT` | No | No | Full official scheme name |
| `description` | `TEXT` | No | No | Main descriptive text — participates in TF-IDF (see `ML_RECOMMENDER.md` §2) |
| `benefits` | `TEXT` | No | No | Benefit summary — participates in TF-IDF |
| `state` | `TEXT` | No | No | Applicable state(s), comma-separated or `"All"` for nationwide schemes |
| `crop` | `TEXT` | No | Yes | Applicable crop(s), comma-separated or `"All"`; nullable because some schemes (e.g. soil health, credit) aren't crop-specific |
| `category` | `TEXT` | No | Yes | Target farmer category/categories (Marginal/Small/Medium/Large or `"All"`); nullable for the same reason as `crop` |
| `eligibility_keywords` | `TEXT` | No | No | Natural-language phrase covering state/crop/category applicability in prose form — participates in TF-IDF (this is the field that makes state/crop/category matching work through the ML pipeline; see `ML_RECOMMENDER.md` §2) |
| `required_documents` | `TEXT` | No | Yes | Comma-separated document list; nullable if genuinely undocumented for a scheme, but should be populated wherever the official source specifies it |
| `application_link` | `TEXT` | No | No | Official application/information URL |
| `source` | `TEXT` | No | No | Where the scheme information was verified (official portal name/URL) — required, per v3 §13's "never fabricate" rule; a scheme with no recorded source should not enter the dataset |
| `last_verified` | `TEXT` (ISO date `YYYY-MM-DD`) | No | No | Date the scheme's information was last checked against the official source |
| `min_land_acres` | `REAL` | No | Yes | Lower land-size threshold, if the scheme has one; used only by the rule layer, never by TF-IDF |
| `max_land_acres` | `REAL` | No | Yes | Upper land-size threshold, if the scheme has one; used only by the rule layer |

**Why `min_land_acres`/`max_land_acres` exist as separate numeric columns** even though `eligibility_keywords` already covers land in prose for TF-IDF purposes: the rule layer (`ML_RECOMMENDER.md` §5) needs an exact numeric threshold to compare against the farmer's raw acre figure — text similarity can't do that comparison, so it needs its own typed columns, not a prose field.

**Not included, deliberately:** `ministry`, `processing_time`, `deadline`, `financial_assistance` — these existed in the prototype's richer schema and are genuinely nice-to-have display fields, but they aren't in v3's minimum schema (§14) and don't affect ML, ranking, or eligibility flags. Add them only if dataset-sourcing time allows populating them accurately for all 30–50 schemes — don't let filling in "nice" fields delay reaching the 30–50 count with the required fields fully populated.

---

## Seed strategy

The `schemes` table is populated by an **idempotent seed script**, not manual `INSERT` statements run once and forgotten. Rationale is deployment-driven, not just tidiness: Render's ephemeral filesystem behavior (`ARCHITECTURE.md` §10) means the SQLite file itself may not survive every redeploy — the seed script re-running safely on every boot (e.g., `INSERT OR REPLACE`, or check-then-insert) guarantees the dataset is always present without anyone needing to remember a manual step mid-hackathon.

The seed script's source data should be the verified dataset produced under `DATASET_STRUCTURE.md`, not hand-typed SQL — keeping one canonical source of scheme data avoids the dataset silently drifting between a spreadsheet/JSON file and what's actually loaded into SQLite.
