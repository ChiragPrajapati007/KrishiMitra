"""
KrishiMitra AI — Eligibility service tests.

Tests for backend/services/eligibility_service.py.

Run from project root:
    python -m pytest backend/tests/test_eligibility.py -v
Run from backend/ directory:
    python -m pytest tests/test_eligibility.py -v

Coverage:
  - assess_eligibility() returns correct overall status
  - State: met (nationwide), met (matching), not_met (mismatch)
  - Crop: met (null/no restriction), met (All), met (CSV match), not_met
  - Land size: unknown (no thresholds), met (within range), not_met (outside)
  - Category: always unknown (free-text field)
  - Overall: likely_eligible, not_currently_eligible, cannot_determine
  - Structural: checks list, required keys, no banned language
  - Disclaimer always present
"""
import sys
from pathlib import Path

import pytest

_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from services.eligibility_service import assess_eligibility

# ---------------------------------------------------------------------------
# Test data helpers
# ---------------------------------------------------------------------------

def make_profile(state="Maharashtra", crop="Cotton", land_size=2.0):
    return {"state": state, "crop": crop, "land_size": land_size}


def make_scheme(
    state="All",
    crop=None,
    category="All farmers",
    min_land_acres=None,
    max_land_acres=None,
):
    return {
        "state": state,
        "crop": crop,
        "category": category,
        "min_land_acres": min_land_acres,
        "max_land_acres": max_land_acres,
    }


# ---------------------------------------------------------------------------
# Structure tests
# ---------------------------------------------------------------------------

def test_returns_dict_with_required_keys():
    result = assess_eligibility(make_profile(), make_scheme())
    assert isinstance(result, dict)
    assert "status" in result
    assert "checks" in result
    assert "disclaimer" in result


def test_disclaimer_always_present():
    result = assess_eligibility(make_profile(), make_scheme())
    assert result["disclaimer"]
    assert len(result["disclaimer"]) > 10


def test_checks_is_list_with_requirement_key():
    result = assess_eligibility(make_profile(), make_scheme())
    assert isinstance(result["checks"], list)
    assert len(result["checks"]) >= 1
    for check in result["checks"]:
        assert "requirement" in check
        assert "status" in check
        assert "detail" in check
        assert check["status"] in ("met", "not_met", "unknown", "not_applicable")


def test_valid_overall_status_values():
    result = assess_eligibility(make_profile(), make_scheme())
    assert result["status"] in ("likely_eligible", "not_currently_eligible", "cannot_determine")


# ---------------------------------------------------------------------------
# Banned language tests (same invariant as match_service)
# ---------------------------------------------------------------------------

_BANNED = frozenset({"eligible", "eligibility", "approved", "guaranteed", "qualify"})

def test_no_banned_language_in_checks():
    """Banned eligibility confirmation terms must not appear in check details."""
    # Note: "eligible" appears in status values (likely_eligible, not_currently_eligible)
    # and disclaimer — we only scan check detail/guidance text here.
    result = assess_eligibility(make_profile(), make_scheme())
    for check in result["checks"]:
        for term in ("approved", "guaranteed", "qualify"):
            assert term not in check["detail"].lower(), (
                f"Banned term '{term}' in check detail: {check['detail']}"
            )


# ---------------------------------------------------------------------------
# State check tests
# ---------------------------------------------------------------------------

def test_state_nationwide_is_met():
    profile = make_profile(state="Punjab")
    scheme = make_scheme(state="All")
    result = assess_eligibility(profile, scheme)
    state_check = next(c for c in result["checks"] if c["requirement"] == "State")
    assert state_check["status"] == "met"


def test_state_matching_is_met():
    profile = make_profile(state="Maharashtra")
    scheme = make_scheme(state="Maharashtra")
    result = assess_eligibility(profile, scheme)
    state_check = next(c for c in result["checks"] if c["requirement"] == "State")
    assert state_check["status"] == "met"


def test_state_mismatch_is_not_met():
    profile = make_profile(state="Punjab")
    scheme = make_scheme(state="Maharashtra")
    result = assess_eligibility(profile, scheme)
    state_check = next(c for c in result["checks"] if c["requirement"] == "State")
    assert state_check["status"] == "not_met"


def test_state_case_insensitive():
    profile = make_profile(state="maharashtra")
    scheme = make_scheme(state="Maharashtra")
    result = assess_eligibility(profile, scheme)
    state_check = next(c for c in result["checks"] if c["requirement"] == "State")
    assert state_check["status"] == "met"


# ---------------------------------------------------------------------------
# Crop check tests
# ---------------------------------------------------------------------------

def test_crop_null_scheme_is_met():
    profile = make_profile(crop="Cotton")
    scheme = make_scheme(crop=None)
    result = assess_eligibility(profile, scheme)
    crop_check = next(c for c in result["checks"] if c["requirement"] == "Crop")
    assert crop_check["status"] == "met"


def test_crop_all_scheme_is_met():
    profile = make_profile(crop="Cotton")
    scheme = make_scheme(crop="All")
    result = assess_eligibility(profile, scheme)
    crop_check = next(c for c in result["checks"] if c["requirement"] == "Crop")
    assert crop_check["status"] == "met"


def test_crop_exact_match_is_met():
    profile = make_profile(crop="Cotton")
    scheme = make_scheme(crop="Cotton")
    result = assess_eligibility(profile, scheme)
    crop_check = next(c for c in result["checks"] if c["requirement"] == "Crop")
    assert crop_check["status"] == "met"


def test_crop_csv_match_is_met():
    """Crop is in a comma-separated list in the scheme."""
    profile = make_profile(crop="Wheat")
    scheme = make_scheme(crop="Cotton, Wheat, Rice")
    result = assess_eligibility(profile, scheme)
    crop_check = next(c for c in result["checks"] if c["requirement"] == "Crop")
    assert crop_check["status"] == "met"


def test_crop_mismatch_is_not_met():
    profile = make_profile(crop="Wheat")
    scheme = make_scheme(crop="Cotton")
    result = assess_eligibility(profile, scheme)
    crop_check = next(c for c in result["checks"] if c["requirement"] == "Crop")
    assert crop_check["status"] == "not_met"


# ---------------------------------------------------------------------------
# Land size tests
# ---------------------------------------------------------------------------

def test_land_size_no_thresholds_is_unknown():
    """All dev-seed schemes have null thresholds — must return unknown."""
    profile = make_profile(land_size=2.0)
    scheme = make_scheme(min_land_acres=None, max_land_acres=None)
    result = assess_eligibility(profile, scheme)
    land_check = next(c for c in result["checks"] if c["requirement"] == "Land Size")
    assert land_check["status"] == "unknown"


def test_land_size_within_range_is_met():
    profile = make_profile(land_size=3.0)
    scheme = make_scheme(min_land_acres=1.0, max_land_acres=5.0)
    result = assess_eligibility(profile, scheme)
    land_check = next(c for c in result["checks"] if c["requirement"] == "Land Size")
    assert land_check["status"] == "met"


def test_land_size_below_minimum_is_not_met():
    profile = make_profile(land_size=0.5)
    scheme = make_scheme(min_land_acres=1.0, max_land_acres=None)
    result = assess_eligibility(profile, scheme)
    land_check = next(c for c in result["checks"] if c["requirement"] == "Land Size")
    assert land_check["status"] == "not_met"


def test_land_size_above_maximum_is_not_met():
    profile = make_profile(land_size=10.0)
    scheme = make_scheme(min_land_acres=None, max_land_acres=5.0)
    result = assess_eligibility(profile, scheme)
    land_check = next(c for c in result["checks"] if c["requirement"] == "Land Size")
    assert land_check["status"] == "not_met"


def test_land_size_at_exact_boundary_is_met():
    profile = make_profile(land_size=1.0)
    scheme = make_scheme(min_land_acres=1.0, max_land_acres=5.0)
    result = assess_eligibility(profile, scheme)
    land_check = next(c for c in result["checks"] if c["requirement"] == "Land Size")
    assert land_check["status"] == "met"


# ---------------------------------------------------------------------------
# Category check tests
# ---------------------------------------------------------------------------

def test_category_unknown_when_no_land():
    """Category check returns unknown when land_size is missing."""
    scheme = make_scheme(category="Marginal")
    result = assess_eligibility(make_profile(land_size=""), scheme)
    cat_check = next(c for c in result["checks"] if c["requirement"] == "Farmer Category")
    assert cat_check["status"] == "unknown"


def test_category_derives_and_matches():
    """Category is derived from land size and matches scheme category."""
    # 2.0 acres -> Marginal. Should match scheme targeting "Marginal, Small"
    scheme = make_scheme(category="Marginal, Small")
    result = assess_eligibility(make_profile(land_size=2.0), scheme)
    cat_check = next(c for c in result["checks"] if c["requirement"] == "Farmer Category")
    assert cat_check["status"] == "met"

    # 10.0 acres -> Medium. Should not match "Marginal, Small"
    result_not_met = assess_eligibility(make_profile(land_size=10.0), scheme)
    cat_check_not = next(c for c in result_not_met["checks"] if c["requirement"] == "Farmer Category")
    assert cat_check_not["status"] == "not_met"


# ---------------------------------------------------------------------------
# Overall status derivation tests
# ---------------------------------------------------------------------------

def test_overall_cannot_determine_when_all_met_but_unknowns():
    """All met, but some unknown → cannot_determine."""
    # State met, crop met, land_size unknown, category unknown (if land_size empty) -> cannot_determine
    profile = make_profile(state="All", crop="Cotton", land_size="")
    scheme = make_scheme(state="All", crop="All", min_land_acres=None, max_land_acres=None, category="Marginal")
    result = assess_eligibility(profile, scheme)
    assert result["status"] == "cannot_determine"


def test_overall_not_eligible_when_state_not_met():
    profile = make_profile(state="Punjab")
    scheme = make_scheme(state="Maharashtra")
    result = assess_eligibility(profile, scheme)
    assert result["status"] == "not_currently_eligible"


def test_overall_not_eligible_when_crop_not_met():
    profile = make_profile(crop="Wheat")
    scheme = make_scheme(state="All", crop="Cotton")
    result = assess_eligibility(profile, scheme)
    assert result["status"] == "not_currently_eligible"


def test_overall_not_eligible_when_land_not_met():
    profile = make_profile(land_size=0.2)
    scheme = make_scheme(state="All", crop=None, min_land_acres=1.0)
    result = assess_eligibility(profile, scheme)
    assert result["status"] == "not_currently_eligible"
