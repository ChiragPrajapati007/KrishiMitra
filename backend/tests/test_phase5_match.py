"""
KrishiMitra AI — Phase 5 unit tests for services/match_service.py

Pure function tests — no Flask, no database, no TF-IDF.
Tests all four informational match signals (state, crop, land_size, interests)
and the match_reasons generator.

Run from the project root:
    python -m pytest backend/tests/test_phase5_match.py -v
Run from backend/:
    python -m pytest tests/test_phase5_match.py -v

Covers all 12 required test conditions:
  1.  State signal — exact state match
  2.  State signal — nationwide ("All") scheme
  3.  State signal — state mismatch
  4.  Crop signal — exact crop match
  5.  Crop signal — "All" scheme
  6.  Crop signal — null crop (not crop-specific)
  7.  Crop signal — crop mismatch
  8.  Land size — within declared thresholds
  9.  Land size — outside declared thresholds
  10. Land size — no threshold → null
  11. Interests — matched keywords
  12. Interests — no interests
  13. Interests — not found
  14. Unknown interest IDs (already dropped by validation; defensive)
  15. Nationwide "All" scheme — all signals correct
  16. match_reasons — is a list of strings
  17. match_reasons — no eligibility language in any string
  18. match_reasons — state-covered text for nationwide scheme
  19. match_reasons — land-size null text
  20. match_reasons — interest found/not-found text
"""
import sys
from pathlib import Path

import pytest

# Ensure backend/ is on sys.path when running from the project root.
# conftest.py at backend/ handles this for pytest runs via the test client,
# but these are standalone unit tests that don't go through Flask.
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from services.match_service import (
    build_match_reasons,
    compute_match_signals,
)

# ---------------------------------------------------------------------------
# Shared test fixtures (plain dicts — no pytest fixture needed here)
# ---------------------------------------------------------------------------

PROFILE_MH = {
    "state": "Maharashtra",
    "crop": "Cotton",
    "land_size": 1.8,
    "interests": ["irrigation", "credit"],
}

PROFILE_PB = {
    "state": "Punjab",
    "crop": "Wheat",
    "land_size": 1.2,
    "interests": ["insurance"],
}

PROFILE_GJ_NO_INTERESTS = {
    "state": "Gujarat",
    "crop": "Vegetables",
    "land_size": 40.0,
    "interests": [],
}

SCHEME_NATIONWIDE_NO_CROP = {
    "id": "pmkisan",
    "scheme_name": "PM Kisan Samman Nidhi",
    "state": "All",
    "crop": None,
    "category": "All",
    "eligibility_keywords": "Available to all landholding farmer families across India",
    "description": "Central government income support scheme",
    "benefits": "Rs 6,000 per year",
    "min_land_acres": None,
    "max_land_acres": None,
}

SCHEME_MH_ONLY = {
    "id": "namo_shetkari",
    "scheme_name": "Namo Shetkari Mahasanman Nidhi Yojana",
    "state": "Maharashtra",
    "crop": None,
    "category": "All",
    "eligibility_keywords": "Exclusively for landholding farmer families in Maharashtra",
    "description": "Maharashtra state government income support top-up scheme",
    "benefits": "Rs 6,000 per year additional to PM-KISAN",
    "min_land_acres": None,
    "max_land_acres": None,
}

SCHEME_CROP_SPECIFIC = {
    "id": "pmfby",
    "scheme_name": "PM Fasal Bima Yojana",
    "state": "All",
    "crop": "Cotton, Wheat, Rice, Sugarcane",
    "category": "All",
    "eligibility_keywords": "Crop insurance for Cotton, Wheat, Rice and Sugarcane",
    "description": "Crop insurance scheme covering Cotton, Wheat, Rice",
    "benefits": "Low-premium crop insurance coverage",
    "min_land_acres": None,
    "max_land_acres": None,
}

SCHEME_WITH_LAND_THRESHOLDS = {
    "id": "test_threshold_scheme",
    "scheme_name": "Small Farmer Scheme",
    "state": "All",
    "crop": "All",
    "category": "Small",
    "eligibility_keywords": "Support for small farmers with land between 1 and 5 acres",
    "description": "Support for small and marginal farmers",
    "benefits": "Subsidy for farm inputs",
    "min_land_acres": 1.0,
    "max_land_acres": 5.0,
}

SCHEME_IRRIGATION_MENTION = {
    "id": "pmksy",
    "scheme_name": "PMKSY",
    "state": "All",
    "crop": "All",
    "category": "All",
    "eligibility_keywords": "Irrigation and micro-irrigation subsidy, drip and sprinkler systems",
    "description": "Umbrella irrigation scheme for micro-irrigation (drip and sprinkler)",
    "benefits": "Subsidy for micro-irrigation systems and drip installation",
    "min_land_acres": None,
    "max_land_acres": None,
}

SCHEME_NO_RELEVANT_KEYWORDS = {
    "id": "enam",
    "scheme_name": "e-NAM",
    "state": "All",
    "crop": "All",
    "category": "All",
    "eligibility_keywords": "Online agricultural marketing platform for price discovery at mandi",
    "description": "Pan-India electronic trading portal for agricultural produce",
    "benefits": "Transparent price discovery and online payment",
    "min_land_acres": None,
    "max_land_acres": None,
}

BANNED_TERMS = {"eligible", "eligibility", "approved", "guaranteed", "qualify", "qualifies"}


# ===========================================================================
# Test 1-3: State signal
# ===========================================================================

def test_state_signal_exact_match():
    """Profile state matches scheme state exactly."""
    signals = compute_match_signals(PROFILE_MH, SCHEME_MH_ONLY)
    assert signals["state"] is True


def test_state_signal_nationwide_scheme():
    """State signal is True when scheme.state == 'All'."""
    signals = compute_match_signals(PROFILE_PB, SCHEME_NATIONWIDE_NO_CROP)
    assert signals["state"] is True


def test_state_signal_no_match():
    """State signal is False when farmer's state differs from scheme's state."""
    signals = compute_match_signals(PROFILE_PB, SCHEME_MH_ONLY)
    assert signals["state"] is False


def test_state_signal_case_insensitive():
    """State matching is case-insensitive."""
    profile = {**PROFILE_MH, "state": "maharashtra"}
    signals = compute_match_signals(profile, SCHEME_MH_ONLY)
    assert signals["state"] is True


# ===========================================================================
# Tests 4-7: Crop signal
# ===========================================================================

def test_crop_signal_exact_match():
    """Crop signal True when farmer's crop is in scheme's crop list."""
    signals = compute_match_signals(PROFILE_MH, SCHEME_CROP_SPECIFIC)
    assert signals["crop"] is True


def test_crop_signal_scheme_crop_all():
    """Crop signal True when scheme.crop is 'All'."""
    scheme = {**SCHEME_NATIONWIDE_NO_CROP, "crop": "All"}
    signals = compute_match_signals(PROFILE_MH, scheme)
    assert signals["crop"] is True


def test_crop_signal_null_crop_not_crop_specific():
    """Crop signal True when scheme.crop is null (not crop-specific)."""
    signals = compute_match_signals(PROFILE_MH, SCHEME_NATIONWIDE_NO_CROP)
    # SCHEME_NATIONWIDE_NO_CROP has crop=None
    assert signals["crop"] is True


def test_crop_signal_no_match():
    """Crop signal False when farmer's crop is not in scheme's crop list."""
    profile = {**PROFILE_MH, "crop": "Vegetables"}
    signals = compute_match_signals(profile, SCHEME_CROP_SPECIFIC)
    # SCHEME_CROP_SPECIFIC covers Cotton, Wheat, Rice, Sugarcane — not Vegetables
    assert signals["crop"] is False


def test_crop_signal_case_insensitive():
    """Crop matching is case-insensitive."""
    profile = {**PROFILE_MH, "crop": "cotton"}
    signals = compute_match_signals(profile, SCHEME_CROP_SPECIFIC)
    assert signals["crop"] is True


# ===========================================================================
# Tests 8-10: Land size signal
# ===========================================================================

def test_land_size_within_thresholds():
    """land_size True when profile.land_size is within scheme thresholds."""
    profile = {**PROFILE_MH, "land_size": 2.0}
    signals = compute_match_signals(profile, SCHEME_WITH_LAND_THRESHOLDS)
    # min=1.0, max=5.0 → 2.0 is in range
    assert signals["land_size"] is True


def test_land_size_above_max_threshold():
    """land_size False when profile.land_size exceeds scheme's max."""
    profile = {**PROFILE_GJ_NO_INTERESTS, "land_size": 40.0}
    signals = compute_match_signals(profile, SCHEME_WITH_LAND_THRESHOLDS)
    # max=5.0 → 40.0 exceeds it
    assert signals["land_size"] is False


def test_land_size_below_min_threshold():
    """land_size False when profile.land_size is below scheme's min."""
    profile = {**PROFILE_MH, "land_size": 0.5}
    signals = compute_match_signals(profile, SCHEME_WITH_LAND_THRESHOLDS)
    # min=1.0 → 0.5 is below it
    assert signals["land_size"] is False


def test_land_size_no_threshold_returns_null():
    """land_size returns None when scheme has no declared thresholds."""
    signals = compute_match_signals(PROFILE_MH, SCHEME_NATIONWIDE_NO_CROP)
    assert signals["land_size"] is None


def test_land_size_only_max_threshold():
    """Works correctly when only max_land_acres is set."""
    scheme = {**SCHEME_NATIONWIDE_NO_CROP, "min_land_acres": None, "max_land_acres": 3.0}
    profile_small = {**PROFILE_MH, "land_size": 1.5}
    profile_large = {**PROFILE_MH, "land_size": 5.0}
    assert compute_match_signals(profile_small, scheme)["land_size"] is True
    assert compute_match_signals(profile_large, scheme)["land_size"] is False


def test_land_size_only_min_threshold():
    """Works correctly when only min_land_acres is set."""
    scheme = {**SCHEME_NATIONWIDE_NO_CROP, "min_land_acres": 2.0, "max_land_acres": None}
    profile_above = {**PROFILE_MH, "land_size": 3.0}
    profile_below = {**PROFILE_MH, "land_size": 0.8}
    assert compute_match_signals(profile_above, scheme)["land_size"] is True
    assert compute_match_signals(profile_below, scheme)["land_size"] is False


# ===========================================================================
# Tests 11-14: Interests signal
# ===========================================================================

def test_interests_matched_when_keywords_present():
    """Interest is matched when its keywords appear in scheme text."""
    profile = {**PROFILE_MH, "interests": ["irrigation"]}
    signals = compute_match_signals(profile, SCHEME_IRRIGATION_MENTION)
    assert "irrigation" in signals["interests"]["matched"]
    assert "irrigation" not in signals["interests"]["not_found"]


def test_interests_not_found_when_keywords_absent():
    """Interest is not_found when its keywords do not appear in scheme text."""
    profile = {**PROFILE_MH, "interests": ["insurance"]}
    # SCHEME_IRRIGATION_MENTION mentions irrigation/drip, not insurance
    signals = compute_match_signals(profile, SCHEME_IRRIGATION_MENTION)
    assert "insurance" in signals["interests"]["not_found"]
    assert "insurance" not in signals["interests"]["matched"]


def test_interests_empty_profile():
    """Empty interests list returns {"matched": [], "not_found": []}."""
    signals = compute_match_signals(PROFILE_GJ_NO_INTERESTS, SCHEME_NATIONWIDE_NO_CROP)
    assert signals["interests"] == {"matched": [], "not_found": []}


def test_interests_unknown_ids_ignored():
    """Unknown interest IDs are silently ignored (defensive — validation strips them first)."""
    profile = {**PROFILE_MH, "interests": ["NOT_A_REAL_ID", "also_fake"]}
    signals = compute_match_signals(profile, SCHEME_NATIONWIDE_NO_CROP)
    # Unknown IDs must not appear in matched or not_found
    assert "NOT_A_REAL_ID" not in signals["interests"]["matched"]
    assert "NOT_A_REAL_ID" not in signals["interests"]["not_found"]
    assert "also_fake" not in signals["interests"]["matched"]
    assert "also_fake" not in signals["interests"]["not_found"]


def test_interests_multiple_mixed():
    """Multiple interests: some matched, some not found."""
    profile = {**PROFILE_MH, "interests": ["irrigation", "insurance"]}
    signals = compute_match_signals(profile, SCHEME_IRRIGATION_MENTION)
    # irrigation → mentioned in keywords/description/benefits
    # insurance → not mentioned by SCHEME_IRRIGATION_MENTION
    assert "irrigation" in signals["interests"]["matched"]
    assert "insurance" in signals["interests"]["not_found"]


# ===========================================================================
# Test 15: Nationwide "All" scheme — all applicable signals
# ===========================================================================

def test_nationwide_all_scheme_signals():
    """Nationwide 'All' scheme: state=True, crop=True (null crop), land_size=None."""
    signals = compute_match_signals(PROFILE_PB, SCHEME_NATIONWIDE_NO_CROP)
    assert signals["state"] is True    # scheme.state == "All"
    assert signals["crop"] is True     # scheme.crop is None → not crop-specific
    assert signals["land_size"] is None  # no thresholds → null


# ===========================================================================
# Tests 16-20: match_reasons structure and content
# ===========================================================================

def test_match_reasons_is_list_of_strings():
    """build_match_reasons returns a non-empty list of str."""
    signals = compute_match_signals(PROFILE_MH, SCHEME_NATIONWIDE_NO_CROP)
    reasons = build_match_reasons(PROFILE_MH, SCHEME_NATIONWIDE_NO_CROP, signals)
    assert isinstance(reasons, list), "match_reasons must be a list"
    assert len(reasons) >= 1, "match_reasons must have at least one entry"
    for r in reasons:
        assert isinstance(r, str), f"Every reason must be a string, got {type(r)}"
        assert len(r) > 0, "Reason strings must not be empty"


def test_match_reasons_no_eligibility_language():
    """No banned eligibility term appears in any match_reasons string."""
    test_cases = [
        (PROFILE_MH, SCHEME_NATIONWIDE_NO_CROP),
        (PROFILE_MH, SCHEME_MH_ONLY),
        (PROFILE_PB, SCHEME_MH_ONLY),          # state mismatch
        (PROFILE_MH, SCHEME_CROP_SPECIFIC),
        (PROFILE_GJ_NO_INTERESTS, SCHEME_NATIONWIDE_NO_CROP),  # no interests
        (PROFILE_MH, SCHEME_WITH_LAND_THRESHOLDS),
        ({**PROFILE_GJ_NO_INTERESTS, "land_size": 40.0}, SCHEME_WITH_LAND_THRESHOLDS),  # land exceeds
    ]
    for profile, scheme in test_cases:
        signals = compute_match_signals(profile, scheme)
        reasons = build_match_reasons(profile, scheme, signals)
        for reason in reasons:
            lower = reason.lower()
            for term in BANNED_TERMS:
                assert term not in lower, (
                    f"Banned term '{term}' found in reason for "
                    f"profile({profile['state']}/{profile['crop']}) + "
                    f"scheme({scheme['id']}): {reason!r}"
                )


def test_match_reasons_nationwide_scheme_covered_text():
    """Nationwide scheme generates a 'covered' state reason, not a mismatch reason."""
    signals = compute_match_signals(PROFILE_PB, SCHEME_NATIONWIDE_NO_CROP)
    reasons = build_match_reasons(PROFILE_PB, SCHEME_NATIONWIDE_NO_CROP, signals)
    state_reason = reasons[0]  # state is always the first reason
    assert "nationwide" in state_reason.lower() or "covered" in state_reason.lower(), (
        f"Nationwide state reason should mention 'nationwide' or 'covered': {state_reason!r}"
    )
    assert "Punjab" in state_reason, (
        f"Farmer state should appear in the reason: {state_reason!r}"
    )


def test_match_reasons_land_size_null_text():
    """When land_size signal is None, reason says no threshold specified."""
    signals = compute_match_signals(PROFILE_MH, SCHEME_NATIONWIDE_NO_CROP)
    reasons = build_match_reasons(PROFILE_MH, SCHEME_NATIONWIDE_NO_CROP, signals)
    land_reasons = [r for r in reasons if "land size" in r.lower() or "threshold" in r.lower()]
    assert len(land_reasons) >= 1, "Should have a land size reason"
    assert "not specified" in land_reasons[0].lower() or "no land" in land_reasons[0].lower(), (
        f"null land_size reason should say 'not specified' or 'no land': {land_reasons[0]!r}"
    )


def test_match_reasons_interest_found_text():
    """Matched interest produces an affirmative reason."""
    profile = {**PROFILE_MH, "interests": ["irrigation"]}
    signals = compute_match_signals(profile, SCHEME_IRRIGATION_MENTION)
    reasons = build_match_reasons(profile, SCHEME_IRRIGATION_MENTION, signals)
    interest_reasons = [r for r in reasons if "irrigation" in r.lower()]
    assert len(interest_reasons) >= 1, "Should have an irrigation interest reason"
    # The reason should be affirmative (irrigation was found), not a "not mentioned" message
    found_reason = interest_reasons[0]
    assert "not specifically mentioned" not in found_reason.lower(), (
        f"Matched interest should have affirmative reason: {found_reason!r}"
    )


def test_match_reasons_interest_not_found_text():
    """Not-found interest produces a 'not specifically mentioned' reason."""
    profile = {**PROFILE_MH, "interests": ["insurance"]}
    signals = compute_match_signals(profile, SCHEME_IRRIGATION_MENTION)
    reasons = build_match_reasons(profile, SCHEME_IRRIGATION_MENTION, signals)
    interest_reasons = [r for r in reasons if "insurance" in r.lower()]
    assert len(interest_reasons) >= 1, "Should have an insurance interest reason"
    not_found_reason = interest_reasons[0]
    assert "not specifically mentioned" in not_found_reason.lower(), (
        f"Not-found interest reason should say 'not specifically mentioned': {not_found_reason!r}"
    )


def test_match_reasons_no_interests_no_interest_reasons():
    """Profile with no interests produces no interest-related reason lines."""
    signals = compute_match_signals(PROFILE_GJ_NO_INTERESTS, SCHEME_NATIONWIDE_NO_CROP)
    reasons = build_match_reasons(PROFILE_GJ_NO_INTERESTS, SCHEME_NATIONWIDE_NO_CROP, signals)
    # Reasons should cover state, crop, land_size — but no interests rows
    interest_labels = [
        "irrigation", "insurance", "credit", "equipment", "seeds",
        "fertilizer", "marketing", "food processing", "women farmer",
    ]
    for label in interest_labels:
        for reason in reasons:
            assert label not in reason.lower(), (
                f"No-interest profile should produce no interest reasons, "
                f"but found '{label}' in: {reason!r}"
            )


def test_compute_match_signals_returns_required_keys():
    """compute_match_signals always returns exactly the four required keys."""
    signals = compute_match_signals(PROFILE_MH, SCHEME_NATIONWIDE_NO_CROP)
    assert set(signals.keys()) == {"state", "crop", "land_size", "interests"}, (
        f"Unexpected signal keys: {set(signals.keys())}"
    )


def test_interests_signal_returns_required_keys():
    """interests signal always returns matched and not_found keys."""
    profile = {**PROFILE_MH, "interests": ["credit"]}
    signals = compute_match_signals(profile, SCHEME_NATIONWIDE_NO_CROP)
    interests = signals["interests"]
    assert "matched" in interests, "interests signal missing 'matched' key"
    assert "not_found" in interests, "interests signal missing 'not_found' key"
    assert isinstance(interests["matched"], list)
    assert isinstance(interests["not_found"], list)
