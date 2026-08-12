# KrishiMitra AI — API_DOCUMENTATION.md
**Step 2 — Final API Contract (locked)**

Three endpoints for MVP. Admin CRUD is spec'd only at a high level, since it's ONLY IF TIME REMAINS — fully detailing it now risks planning time better spent on the core loop.

---

## `GET /api/schemes`

**Purpose:** list schemes, optionally filtered — backs both the "browse all schemes" case and the SHOULD-HAVE search/filter feature.

**Query params (all optional):**
| Param | Type | Notes |
|---|---|---|
| `state` | string | Exact or `"All"`-inclusive match |
| `crop` | string | Exact or `"All"`-inclusive match |

**Response `200`:**
```json
{
  "count": 42,
  "schemes": [
    {
      "id": "pmkisan",
      "scheme_name": "PM Kisan Samman Nidhi",
      "description": "...",
      "benefits": "...",
      "state": "All",
      "crop": "All",
      "application_link": "https://pmkisan.gov.in",
      "source": "pmkisan.gov.in",
      "last_verified": "2026-06-01"
    }
  ]
}
```
(List view omits `eligibility_keywords` and `required_documents` — full detail is fetched via `/api/schemes/:id`, keeping the list payload light.)

**Validation:** unrecognized query params are ignored, not rejected (permissive on reads). No required params.

**Errors:** `500` only on a genuine server/DB failure — this endpoint has no way to receive invalid input, since every param is optional and unconstrained.

---

## `GET /api/schemes/:id`

**Purpose:** full detail for the Scheme Details view.

**Response `200`:** full row from `schemes` (`DATABASE_SCHEMA.md`), all columns.

**Response `404`:**
```json
{ "error": "Scheme not found", "id": "unknownid" }
```

---

## `POST /api/recommend`

**Purpose:** the core ML endpoint — profile in, ranked schemes out.

**Request body:**
```json
{
  "state": "Maharashtra",
  "district": "Nashik",
  "crop": "Cotton",
  "land_size": 1.8,
  "interests": ["irrigation", "credit"]
}
```
Note: **`category` is not part of the current request body and is not derived from `land_size`.** The previous universal Marginal/Small/Medium/Large thresholds were removed from the implementation. `land_size` remains numeric and is reserved for future scheme-specific threshold checks in the rule/match layer. The exact farmer-side category handling is intentionally left unresolved for Phase 5; this API does not invent or infer it. `district` is accepted and stored/echoed but does not affect the ML query (`ML_RECOMMENDER.md` §1). `interests` is optional and may be omitted or empty.

**Validation (server-side, before anything reaches the ML module):**
| Field | Rule | On failure |
|---|---|---|
| `state` | required, non-empty string | `400` |
| `crop` | required, non-empty string | `400` |
| `land_size` | required, numeric, `> 0` | `400` |
| `district` | optional, string | — |
| `interests` | optional, array of known interest ids | unknown ids dropped silently, not rejected |

**Response `200`:**
```json
{
  "profile": {
    "state": "Maharashtra",
    "district": "Nashik",
    "crop": "Cotton",
    "land_size": 1.8,
  },
  "results": [
    {
      "id": "pmkisan",
      "scheme_name": "PM Kisan Samman Nidhi",
      "relevance_score": 0.62,
      "relevance_percent": 62,
      "benefits": "...",
      "application_link": "https://pmkisan.gov.in",
      "required_documents": ["Aadhaar Card", "Bank Account", "Land Record / 7-12 Extract"],
      "match_flags": {
        "state": true,
        "crop": true,
        "land_size": true
      }
    }
  ]
}
```
`results` contains **every** scheme in the dataset, sorted by `relevance_score` descending, alphabetical tiebreak on `scheme_name` (`ML_RECOMMENDER.md` §7) — the frontend decides how much of the list to show at once, the API doesn't truncate. `match_flags` are the rule-layer output (`ML_RECOMMENDER.md` §5) — informational, never used to remove a scheme from `results`.

**Response `400`** (validation failure):
```json
{ "error": "land_size must be a positive number", "field": "land_size" }
```

**Response `500`:** genuine server/ML failure (e.g., vectorizer not loaded) — should be effectively unreachable once the vectorizer is confirmed fit at startup, but the route should still handle it rather than 500 with a raw stack trace.

---

## Admin CRUD (ONLY IF TIME REMAINS — high-level only)

If built: `POST /api/schemes`, `PUT /api/schemes/:id`, `DELETE /api/schemes/:id`, standard REST semantics, writing to the same `schemes` table. The one MVP-relevant design note to bank now, so it isn't a surprise later: **any write here must trigger a vectorizer refit** (`ARCHITECTURE.md` §5), since the TF-IDF model is fit once in memory at startup — a scheme added via CRUD won't be findable by `/api/recommend` until the vectorizer is refit. Not designing this in detail now; just flagging the dependency so it isn't discovered mid-implementation.

---

## HTTP Status Code Summary

| Code | Used for |
|---|---|
| `200` | Successful GET/POST |
| `400` | Client validation failure (`/api/recommend` only) |
| `404` | Scheme id not found (`/api/schemes/:id`) |
| `500` | Unhandled server error |
