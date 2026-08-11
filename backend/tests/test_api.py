"""
KrishiMitra AI — Phase 4 + Phase 5 API tests (pytest).

Tests the three Flask endpoints using Flask's built-in test client.
The `client` fixture is provided by backend/conftest.py.

Run from the project root:
    python -m pytest backend/tests/test_api.py -v
Run from the backend/ directory:
    python -m pytest tests/test_api.py -v

Also runnable as a standalone script (backwards-compatible):
    python tests/test_api.py

Per the Phase 4 spec:
  - Assertions do NOT hardcode "exactly 11 schemes" — the dataset will grow
    to 30-50 schemes, so count-based assertions use >= not ==.
  - match_flags are verified to be informational dicts; no eligibility language
    is asserted or expected.
  - TF-IDF is verified as the ranking mechanism (scores sorted descending).

Covers all 16 required test cases:
  1.  Valid POST /api/recommend
  2.  Missing state
  3.  Missing crop
  4.  Missing land_size
  5.  Zero land_size
  6.  Negative land_size
  7.  Non-numeric land_size
  8.  Whitespace-only required fields
  9.  Unknown interest IDs
  10. Recommendation without interests
  11. GET /api/schemes (unfiltered)
  12. GET /api/schemes with filters
  13. GET valid scheme by ID
  14. GET nonexistent scheme by ID
  15. Different profiles produce different rankings
  16. Response structure validation
"""
import json
import sys
from pathlib import Path

import pytest

# Ensure backend/ is on sys.path when this file is run directly as a script.
# When run via pytest the conftest.py at backend/ handles this already.
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))


# ---------------------------------------------------------------------------
# Shared valid profile
# ---------------------------------------------------------------------------

VALID_PROFILE = {
    "state": "Maharashtra",
    "district": "Nashik",
    "crop": "Cotton",
    "land_size": 1.8,
    "interests": ["irrigation", "credit"],
}


# ---------------------------------------------------------------------------
# Test 1 — Valid POST /api/recommend
# ---------------------------------------------------------------------------

def test_valid_recommend(client):
    resp = client.post("/api/recommend", json=VALID_PROFILE)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.get_json()
    assert "profile" in data, "Response missing 'profile' key"
    assert "results" in data, "Response missing 'results' key"
    assert isinstance(data["results"], list), "'results' is not a list"
    assert len(data["results"]) >= 1, f"Expected at least 1 result, got {len(data['results'])}"

    # TF-IDF ranking: scores must be sorted descending
    scores = [r["relevance_score"] for r in data["results"]]
    assert scores == sorted(scores, reverse=True), (
        f"Results not sorted by relevance_score descending. First few: {scores[:5]}"
    )
    # All scores in valid range
    assert all(0.0 <= s <= 1.0 for s in scores), (
        f"Some relevance_scores outside [0, 1]: {[s for s in scores if not 0.0 <= s <= 1.0]}"
    )


# ---------------------------------------------------------------------------
# Tests 2-4 — Missing required fields
# ---------------------------------------------------------------------------

def test_missing_state(client):
    resp = client.post(
        "/api/recommend",
        json={"crop": "Cotton", "land_size": 1.8},
    )
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
    body = resp.get_json()
    assert "error" in body, "Missing 'error' key in 400 response"
    assert body.get("field") == "state", (
        f"Expected field='state', got {body.get('field')!r}"
    )


def test_missing_crop(client):
    resp = client.post(
        "/api/recommend",
        json={"state": "Maharashtra", "land_size": 1.8},
    )
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
    body = resp.get_json()
    assert "error" in body, "Missing 'error' key in 400 response"
    assert body.get("field") == "crop", (
        f"Expected field='crop', got {body.get('field')!r}"
    )


def test_missing_land_size(client):
    resp = client.post(
        "/api/recommend",
        json={"state": "Maharashtra", "crop": "Cotton"},
    )
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
    body = resp.get_json()
    assert "error" in body, "Missing 'error' key in 400 response"
    assert body.get("field") == "land_size", (
        f"Expected field='land_size', got {body.get('field')!r}"
    )


# ---------------------------------------------------------------------------
# Tests 5-7 — Invalid land_size values
# ---------------------------------------------------------------------------

def test_zero_land_size(client):
    resp = client.post(
        "/api/recommend",
        json={"state": "Maharashtra", "crop": "Cotton", "land_size": 0},
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    # Verify the ML pipeline completes successfully and returns data
    data = resp.get_json()
    assert "profile" in data
    assert "results" in data


def test_negative_land_size(client):
    resp = client.post(
        "/api/recommend",
        json={"state": "Maharashtra", "crop": "Cotton", "land_size": -3.5},
    )
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
    assert resp.get_json().get("field") == "land_size"


def test_nonnumeric_land_size(client):
    resp = client.post(
        "/api/recommend",
        json={"state": "Maharashtra", "crop": "Cotton", "land_size": "big"},
    )
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
    assert resp.get_json().get("field") == "land_size"


# ---------------------------------------------------------------------------
# Test 8 — Whitespace-only required fields
# ---------------------------------------------------------------------------

def test_whitespace_required_fields(client):
    # Whitespace-only state
    resp = client.post(
        "/api/recommend",
        json={"state": "   ", "crop": "Cotton", "land_size": 1.8},
    )
    assert resp.status_code == 400, (
        f"Whitespace-only state should return 400, got {resp.status_code}"
    )
    assert resp.get_json().get("field") == "state"

    # Whitespace-only crop
    resp = client.post(
        "/api/recommend",
        json={"state": "Maharashtra", "crop": "\t\n", "land_size": 1.8},
    )
    assert resp.status_code == 400, (
        f"Whitespace-only crop should return 400, got {resp.status_code}"
    )
    assert resp.get_json().get("field") == "crop"


# ---------------------------------------------------------------------------
# Test 9 — Unknown interest IDs dropped silently
# ---------------------------------------------------------------------------

def test_unknown_interest_ids(client):
    resp = client.post(
        "/api/recommend",
        json={
            "state": "Maharashtra",
            "crop": "Cotton",
            "land_size": 1.8,
            "interests": ["irrigation", "NOT_A_REAL_INTEREST", "also_fake"],
        },
    )
    # Must succeed — unknown IDs are not rejected
    assert resp.status_code == 200, (
        f"Unknown interest IDs should be silently dropped, not cause {resp.status_code}"
    )
    data = resp.get_json()
    assert "results" in data and len(data["results"]) >= 1


# ---------------------------------------------------------------------------
# Test 10 — Recommendation without interests
# ---------------------------------------------------------------------------

def test_recommend_no_interests(client):
    # interests omitted entirely
    resp = client.post(
        "/api/recommend",
        json={"state": "Gujarat", "crop": "Vegetables", "land_size": 40},
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.get_json()
    assert "results" in data and len(data["results"]) >= 1
    scores = [r["relevance_score"] for r in data["results"]]
    assert all(0.0 <= s <= 1.0 for s in scores)


# ---------------------------------------------------------------------------
# Test 11 — GET /api/schemes (unfiltered)
# ---------------------------------------------------------------------------

def test_get_schemes_unfiltered(client):
    resp = client.get("/api/schemes")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "count" in data, "Response missing 'count' key"
    assert "schemes" in data, "Response missing 'schemes' key"
    assert data["count"] == len(data["schemes"]), (
        f"count ({data['count']}) does not match len(schemes) ({len(data['schemes'])})"
    )
    assert data["count"] >= 1, "Expected at least one scheme"

    # List view must NOT contain eligibility_keywords or required_documents
    for scheme in data["schemes"]:
        assert "eligibility_keywords" not in scheme, (
            f"scheme {scheme.get('id')} should omit eligibility_keywords in list view"
        )
        assert "required_documents" not in scheme, (
            f"scheme {scheme.get('id')} should omit required_documents in list view"
        )


# ---------------------------------------------------------------------------
# Test 12 — GET /api/schemes with filters
# ---------------------------------------------------------------------------

def test_get_schemes_filtered(client):
    # Filter by state — all returned schemes must have state == filter value OR "All"
    resp = client.get("/api/schemes?state=Maharashtra")
    assert resp.status_code == 200
    data = resp.get_json()
    for s in data["schemes"]:
        assert s["state"] in ("Maharashtra", "All"), (
            f"scheme '{s['id']}' has unexpected state {s['state']!r} "
            f"(expected Maharashtra or All)"
        )

    # Filter by crop — nationwide "All" schemes must be included
    resp = client.get("/api/schemes?crop=Cotton")
    assert resp.status_code == 200
    data_crop = resp.get_json()
    for s in data_crop["schemes"]:
        # crop can be Cotton, All, or None/null (not crop-specific)
        crop_val = s.get("crop") or "All"
        assert crop_val in ("Cotton", "All") or s.get("crop") is None, (
            f"scheme '{s['id']}' has unexpected crop {s.get('crop')!r} "
            f"after filtering for Cotton"
        )


# ---------------------------------------------------------------------------
# Test 13 — GET valid scheme by ID
# ---------------------------------------------------------------------------

def test_get_scheme_by_id_valid(client):
    # First get any scheme id from the list
    list_resp = client.get("/api/schemes")
    first_scheme = list_resp.get_json()["schemes"][0]
    scheme_id = first_scheme["id"]

    resp = client.get(f"/api/schemes/{scheme_id}")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["id"] == scheme_id

    # Detail view must include eligibility_keywords and required_documents
    assert "eligibility_keywords" in data, "Detail view missing eligibility_keywords"
    assert "required_documents" in data, "Detail view missing required_documents"
    # required_documents must be a list (not a raw comma-separated string)
    assert isinstance(data["required_documents"], list), (
        f"required_documents should be a list, got "
        f"{type(data['required_documents']).__name__}: {data['required_documents']!r}"
    )


# ---------------------------------------------------------------------------
# Test 14 — GET nonexistent scheme by ID
# ---------------------------------------------------------------------------

def test_get_scheme_by_id_not_found(client):
    resp = client.get("/api/schemes/THIS_ID_DOES_NOT_EXIST_12345")
    assert resp.status_code == 404
    body = resp.get_json()
    assert body.get("error") == "Scheme not found"
    assert body.get("id") == "THIS_ID_DOES_NOT_EXIST_12345"


# ---------------------------------------------------------------------------
# Test 15 — Different profiles produce different rankings
# ---------------------------------------------------------------------------

def test_different_profiles_different_rankings(client):
    resp_a = client.post(
        "/api/recommend",
        json={
            "state": "Maharashtra",
            "crop": "Cotton",
            "land_size": 1.8,
            "interests": ["irrigation", "credit"],
        },
    )
    resp_b = client.post(
        "/api/recommend",
        json={
            "state": "Punjab",
            "crop": "Wheat",
            "land_size": 1.2,
            "interests": ["insurance"],
        },
    )
    assert resp_a.status_code == 200, f"Profile A request failed: {resp_a.status_code}"
    assert resp_b.status_code == 200, f"Profile B request failed: {resp_b.status_code}"

    ids_a = [r["id"] for r in resp_a.get_json()["results"]]
    ids_b = [r["id"] for r in resp_b.get_json()["results"]]
    assert ids_a != ids_b, (
        "Profile A and Profile B produced identical rankings — "
        "TF-IDF may not be differentiating on input"
    )


# ---------------------------------------------------------------------------
# Test 16 — Response structure validation
# ---------------------------------------------------------------------------

def test_response_structure(client):
    resp = client.post("/api/recommend", json=VALID_PROFILE)
    assert resp.status_code == 200
    data = resp.get_json()

    # Profile echo
    profile = data.get("profile", {})
    for key in ("state", "crop", "land_size"):
        assert key in profile, f"profile.{key} missing from response"

    # Each result must have required keys
    required_result_keys = {
        "id", "scheme_name", "relevance_score", "relevance_percent",
        "benefits", "application_link", "required_documents",
        "match_flags", "match_reasons",
    }
    for result in data.get("results", []):
        rid = result.get("id")
        for key in required_result_keys:
            assert key in result, f"result '{rid}' missing required key '{key}'"

        # match_flags structure — Phase 4 keys
        flags = result.get("match_flags", {})
        assert "state" in flags, f"match_flags missing 'state' for result '{rid}'"
        assert "crop" in flags, f"match_flags missing 'crop' for result '{rid}'"
        assert "land_size" in flags, f"match_flags missing 'land_size' for result '{rid}'"

        # Phase 5: match_flags must also contain 'interests'
        assert "interests" in flags, f"match_flags missing 'interests' for result '{rid}' (Phase 5)"
        interests_flag = flags["interests"]
        assert isinstance(interests_flag, dict), (
            f"match_flags.interests must be a dict for '{rid}', got {type(interests_flag).__name__}"
        )
        assert "matched" in interests_flag, (
            f"match_flags.interests missing 'matched' key for '{rid}'"
        )
        assert "not_found" in interests_flag, (
            f"match_flags.interests missing 'not_found' key for '{rid}'"
        )

        # land_size flag must be bool or null (None/null in JSON) — never a string
        land_flag = flags.get("land_size")
        assert land_flag is None or isinstance(land_flag, bool), (
            f"match_flags.land_size must be bool or null for '{rid}', got {land_flag!r}"
        )

        # required_documents must be a list
        assert isinstance(result.get("required_documents"), list), (
            f"required_documents must be a list for '{rid}'"
        )

        # Relevance percent must be an integer in [0, 100]
        pct = result.get("relevance_percent")
        assert isinstance(pct, int) and 0 <= pct <= 100, (
            f"relevance_percent must be int in [0,100] for '{rid}', got {pct!r}"
        )

        # CRITICAL: no eligibility-confirmation language in API-generated
        # structural fields (match_flags keys, relevance labels, top-level keys).
        # We do NOT scan benefits/description text from the seed data because
        # government scheme descriptions legitimately use words like "eligible
        # farmer family" or "eligible for a claim" — that is factual content,
        # not eligibility-confirmation language introduced by the API.
        # What we ban: field names, match_flag keys/values, relevance label names.
        match_flags_str = json.dumps(flags).lower()
        top_level_keys = list(result.keys())
        banned_key_terms = ["eligible", "eligibility", "approved", "guaranteed"]

        for term in banned_key_terms:
            assert term not in match_flags_str, (
                f"Banned term '{term}' found in match_flags for '{rid}': {match_flags_str}"
            )
            assert not any(term in k.lower() for k in top_level_keys), (
                f"Banned term '{term}' found in result keys for '{rid}': {top_level_keys}"
            )

        # "eligibility_percent" and "eligibility_score" must not exist as fields
        assert "eligibility_percent" not in result, (
            f"'eligibility_percent' must not be a field (found in result '{rid}')"
        )
        assert "eligibility_score" not in result, (
            f"'eligibility_score' must not be a field (found in result '{rid}')"
        )


# ---------------------------------------------------------------------------
# Phase 5 Tests — match_reasons and extended match_flags
# ---------------------------------------------------------------------------

_BANNED_ELIGIBILITY_TERMS = frozenset(
    {"eligible", "eligibility", "approved", "guaranteed", "qualify", "qualifies"}
)


def test_phase5_match_reasons_present(client):
    """Every result in a valid recommend response has a match_reasons key."""
    resp = client.post("/api/recommend", json=VALID_PROFILE)
    assert resp.status_code == 200
    data = resp.get_json()
    for result in data["results"]:
        rid = result.get("id")
        assert "match_reasons" in result, (
            f"result '{rid}' missing 'match_reasons' key (Phase 5)"
        )


def test_phase5_match_reasons_is_list(client):
    """match_reasons is always a non-null list of strings."""
    resp = client.post("/api/recommend", json=VALID_PROFILE)
    assert resp.status_code == 200
    data = resp.get_json()
    for result in data["results"]:
        rid = result.get("id")
        reasons = result.get("match_reasons")
        assert isinstance(reasons, list), (
            f"match_reasons must be a list for '{rid}', got {type(reasons).__name__}"
        )
        for r in reasons:
            assert isinstance(r, str) and len(r) > 0, (
                f"Every match_reason must be a non-empty string for '{rid}': {r!r}"
            )


def test_phase5_match_reasons_no_eligibility_language(client):
    """No banned eligibility term appears in any match_reasons string.

    Tests three profiles to cover different signal combinations:
    - Profile with interests + state match
    - Profile with no interests
    - Profile with state mismatch (Punjab vs Maharashtra-only scheme)
    """
    profiles = [
        VALID_PROFILE,
        {"state": "Gujarat", "crop": "Vegetables", "land_size": 40.0},
        {"state": "Punjab", "crop": "Wheat", "land_size": 1.2, "interests": ["insurance"]},
    ]
    for profile in profiles:
        resp = client.post("/api/recommend", json=profile)
        assert resp.status_code == 200, (
            f"Request failed for profile {profile}: {resp.status_code}"
        )
        data = resp.get_json()
        for result in data["results"]:
            rid = result.get("id")
            reasons = result.get("match_reasons", [])
            for reason in reasons:
                lower = reason.lower()
                for term in _BANNED_ELIGIBILITY_TERMS:
                    assert term not in lower, (
                        f"Banned term '{term}' in match_reasons for '{rid}' "
                        f"(profile state={profile['state']}): {reason!r}"
                    )


def test_phase5_match_flags_interests_structure(client):
    """match_flags.interests has 'matched' and 'not_found' keys when interests provided."""
    profile = {
        "state": "Maharashtra",
        "crop": "Cotton",
        "land_size": 1.8,
        "interests": ["irrigation", "insurance"],
    }
    resp = client.post("/api/recommend", json=profile)
    assert resp.status_code == 200
    data = resp.get_json()
    for result in data["results"]:
        rid = result.get("id")
        flags = result.get("match_flags", {})
        interests_flag = flags.get("interests")
        assert isinstance(interests_flag, dict), (
            f"match_flags.interests must be a dict for '{rid}'"
        )
        assert "matched" in interests_flag, (
            f"match_flags.interests missing 'matched' for '{rid}'"
        )
        assert "not_found" in interests_flag, (
            f"match_flags.interests missing 'not_found' for '{rid}'"
        )
        assert isinstance(interests_flag["matched"], list), (
            f"match_flags.interests.matched must be a list for '{rid}'"
        )
        assert isinstance(interests_flag["not_found"], list), (
            f"match_flags.interests.not_found must be a list for '{rid}'"
        )
        # Every ID in matched/not_found must be a valid interest ID
        all_ids = interests_flag["matched"] + interests_flag["not_found"]
        for interest_id in all_ids:
            assert interest_id in ("irrigation", "insurance", "credit", "equipment",
                                   "seeds", "fertilizer", "marketing",
                                   "food_processing", "women_empowerment"), (
                f"Unknown interest ID '{interest_id}' in match_flags for '{rid}'"
            )


def test_phase5_match_flags_interests_empty_when_no_interests(client):
    """When request has no interests, match_flags.interests has empty matched/not_found."""
    profile = {"state": "Gujarat", "crop": "Vegetables", "land_size": 40.0}
    resp = client.post("/api/recommend", json=profile)
    assert resp.status_code == 200
    data = resp.get_json()
    for result in data["results"]:
        rid = result.get("id")
        flags = result.get("match_flags", {})
        interests_flag = flags.get("interests", {})
        assert interests_flag.get("matched") == [], (
            f"No interests in profile → matched should be [] for '{rid}', "
            f"got {interests_flag.get('matched')!r}"
        )
        assert interests_flag.get("not_found") == [], (
            f"No interests in profile → not_found should be [] for '{rid}', "
            f"got {interests_flag.get('not_found')!r}"
        )


def test_phase5_tfidf_ranking_unchanged(client):
    """Phase 5 additions must not change TF-IDF rankings (determinism + no ML side-effects).

    Makes the same request twice and verifies the results are identical —
    relevance_scores, ordering, and scheme IDs must match exactly.
    """
    resp_1 = client.post("/api/recommend", json=VALID_PROFILE)
    resp_2 = client.post("/api/recommend", json=VALID_PROFILE)
    assert resp_1.status_code == 200
    assert resp_2.status_code == 200

    results_1 = resp_1.get_json()["results"]
    results_2 = resp_2.get_json()["results"]

    assert len(results_1) == len(results_2), (
        f"Different number of results across two identical requests: "
        f"{len(results_1)} vs {len(results_2)}"
    )
    for r1, r2 in zip(results_1, results_2):
        assert r1["id"] == r2["id"], (
            f"Scheme ordering differs: {r1['id']} vs {r2['id']}"
        )
        assert r1["relevance_score"] == r2["relevance_score"], (
            f"relevance_score differs for '{r1['id']}': "
            f"{r1['relevance_score']} vs {r2['relevance_score']}"
        )


# ---------------------------------------------------------------------------
# Standalone script runner (backwards-compatible with `python tests/test_api.py`)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import subprocess
    sys.exit(
        subprocess.call(
            [sys.executable, "-m", "pytest", __file__, "-v"],
            cwd=str(_BACKEND_DIR),
        )
    )
