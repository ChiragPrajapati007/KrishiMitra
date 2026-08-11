"""
KrishiMitra AI — Recommendation service.

Owns two responsibilities:
  1. validate_recommend_request()  — server-side validation of the
     POST /api/recommend request body, executed before anything reaches
     the ML module (per docs/API_DOCUMENTATION.md validation table).
  2. build_recommendation()        — orchestrates profile-text construction,
     ML scoring, metadata merge, match_signal computation, and match_reasons
     generation.

Per docs/ARCHITECTURE.md §5: no Flask imports here. Routes call this layer;
this layer calls utils/, ml/, and services/match_service. This keeps the
business logic testable in isolation without a running Flask app.

MATCH SIGNALS — INFORMATIONAL ONLY (docs/ML_RECOMMENDER.md §5-6):
  match_flags and match_reasons communicate whether profile signals appear to
  align with scheme information. They do NOT determine eligibility, are NOT
  used to filter, reorder, or remove schemes, and must NEVER produce
  eligibility-confirmation language ("eligible", "eligibility percent", etc.).
  TF-IDF relevance ranking is the ranking mechanism — match signals ride
  alongside it purely for display/explainability.

LAND SIZE (docs/ML_RECOMMENDER.md §1, docs/PROJECT_CONTEXT.md §7):
  land_size remains a raw numeric value. It is never converted into a
  category label (Marginal/Small/Medium/Large). The match signal for land
  size is null when the scheme declares no numeric thresholds.

CATEGORY:
  Category matching is intentionally omitted (known data limitation — the
  `category` field in the current dataset is free-text prose, not a
  structured enum). See services/match_service.py module docstring.
"""
from models.scheme import _parse_required_documents
from services.match_service import build_match_reasons, compute_match_signals
from utils.text_utils import VALID_INTEREST_IDS, build_profile_text


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate_recommend_request(data: dict) -> tuple[dict, dict | None]:
    """Validate the POST /api/recommend JSON body.

    Returns (cleaned_data, error). If error is not None, the route should
    return a 400 response with the error dict. If error is None, cleaned_data
    is ready for build_recommendation().

    Validation rules (per docs/API_DOCUMENTATION.md):
      - state:     required, non-empty string (whitespace-only treated as empty)
      - crop:      required, non-empty string (whitespace-only treated as empty)
      - land_size: required, numeric, strictly > 0
      - district:  optional, string, passed through unchanged
      - interests: optional, list of strings; unknown IDs dropped silently
    """
    if not isinstance(data, dict):
        return {}, {"error": "Request body must be a JSON object", "field": None}

    # --- state ---
    state = data.get("state")
    if not isinstance(state, str) or not state.strip():
        return {}, {"error": "state is required and must be a non-empty string", "field": "state"}
    state = state.strip()

    # --- crop ---
    crop = data.get("crop")
    if not isinstance(crop, str) or not crop.strip():
        return {}, {"error": "crop is required and must be a non-empty string", "field": "crop"}
    crop = crop.strip()

    # --- land_size ---
    land_size_raw = data.get("land_size")
    if land_size_raw is None:
        return {}, {"error": "land_size is required", "field": "land_size"}
    # Booleans pass isinstance(x, (int, float)) in Python, so reject them.
    if isinstance(land_size_raw, bool):
        return {}, {"error": "land_size must be a non-negative number", "field": "land_size"}
    if not isinstance(land_size_raw, (int, float)):
        return {}, {"error": "land_size must be a non-negative number", "field": "land_size"}
    land_size = float(land_size_raw)
    if land_size < 0:
        return {}, {"error": "land_size must be a non-negative number", "field": "land_size"}

    # --- district (optional) ---
    district = data.get("district")
    if district is not None and not isinstance(district, str):
        district = None  # silently drop non-string district rather than rejecting

    # --- interests (optional) ---
    raw_interests = data.get("interests")
    if raw_interests is None:
        interests = []
    elif not isinstance(raw_interests, list):
        interests = []  # non-list interests silently treated as empty
    else:
        # Unknown IDs dropped silently per docs/API_DOCUMENTATION.md.
        interests = [i for i in raw_interests if isinstance(i, str) and i in VALID_INTEREST_IDS]

    cleaned = {
        "state": state,
        "district": district,
        "crop": crop,
        "land_size": land_size,
        "interests": interests,
    }
    return cleaned, None



# ---------------------------------------------------------------------------
# Build recommendation response
# ---------------------------------------------------------------------------

def build_recommendation(profile: dict, recommender, all_schemes: list[dict]) -> dict:
    """Run the recommendation pipeline and build the full API response dict.

    Steps:
      1. Build profile query text via existing build_profile_text() utility.
      2. Call recommender.recommend() → ranked list of {id, relevance_score,
         relevance_percent} for every scheme.
      3. Build a lookup from scheme id → scheme metadata.
      4. For each ranked result, merge metadata + compute match_flags.
      5. Return the full response dict (not yet JSON — Flask route does that).

    The recommender is the pre-fitted SchemeRecommender instance stored on
    the Flask app object. It is never re-fitted here. Fitting happens once
    at app startup (app.py).

    all_schemes must be the same list that was used to fit the recommender
    so that scheme IDs match. Passing a different list would produce key
    errors on the merge step.
    """
    profile_text = build_profile_text(
        state=profile["state"],
        crop=profile["crop"],
        interests=profile["interests"],
    )

    ranked_scores = recommender.recommend(profile_text)

    # Build lookup: id → full scheme dict (already fetched from DB at startup)
    scheme_lookup = {s["id"]: s for s in all_schemes}

    results = []
    for score_item in ranked_scores:
        scheme_id = score_item["id"]
        scheme = scheme_lookup[scheme_id]

        # Parse required_documents from comma-separated TEXT to list.
        required_docs = _parse_required_documents(scheme.get("required_documents"))

        signals = compute_match_signals(profile, scheme)

        # Build the match_flags dict from the four signals.
        # match_flags is the machine-readable version for frontend logic.
        match_flags = {
            "state":     signals["state"],
            "crop":      signals["crop"],
            "land_size": signals["land_size"],
            "interests": signals["interests"],
        }

        # Build match_reasons: human-readable explanation list for display.
        match_reasons = build_match_reasons(profile, scheme, signals)

        results.append({
            "id": scheme_id,
            "scheme_name": scheme["scheme_name"],
            "relevance_score": score_item["relevance_score"],
            "relevance_percent": score_item["relevance_percent"],
            "description": scheme["description"],
            "benefits": scheme["benefits"],
            "application_link": scheme["application_link"],
            "required_documents": required_docs,
            "match_flags": match_flags,
            "match_reasons": match_reasons,
        })

    return {
        "profile": {
            "state": profile["state"],
            "district": profile.get("district"),
            "crop": profile["crop"],
            "land_size": profile["land_size"],
        },
        "results": results,
    }
