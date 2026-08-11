"""
KrishiMitra AI — Eligibility assessment service.

CRITICAL ARCHITECTURE RULES (see docs/PROJECT_CONTEXT.md §9, docs/ARCHITECTURE.md §5):

  1. THIS IS NOT TF-IDF.
     TF-IDF answers: "How relevant does this scheme appear?"
     THIS service answers: "Does the farmer appear to meet the scheme's
     stated structural requirements, based on verified structured data?"
     These are PERMANENTLY SEPARATE responsibilities.

  2. NO Flask imports. No sklearn imports. No SQLite imports.
     Pure business logic, testable without a running Flask app.

  3. DO NOT INVENT eligibility rules.
     If a requirement cannot be assessed from verified structured data in the
     current schema, return 'unknown' and 'cannot_determine'. NEVER convert
     TF-IDF relevance into an eligibility claim.

STATUSES
--------
Overall:
  'likely_eligible'        — all assessable requirements return 'met'
  'not_currently_eligible' — at least one requirement returns 'not_met'
  'cannot_determine'       — no 'not_met', but at least one 'unknown';
                             insufficient data to make a reliable assessment

Per-requirement:
  'met'            — structured data confirms requirement is satisfied
  'not_met'        — structured data confirms requirement is NOT satisfied
  'unknown'        — structured data is absent/insufficient for this check
  'not_applicable' — requirement does not apply to this scheme

CURRENT DATASET LIMITATIONS (11 dev-seed schemes)
--------------------------------------------------
  - state:      Reliable. 10x 'All', 1x 'Maharashtra'. Fully assessable.
  - crop:       Reliable. null / 'All' / CSV string. Fully assessable.
  - land_size:  ALL min_land_acres and max_land_acres are null in the dev seed.
                Returns 'unknown' for every scheme in the current dataset.
                Will work correctly once thresholds are added.
  - category:   Free-text prose, not a structured enum. Returns 'unknown'.

  When the full 30-50 verified dataset is loaded, state/crop checks continue
  to work without code changes. Land-size checks will start returning 'met'
  or 'not_met' as soon as thresholds are populated in the database.
"""

from typing import Literal

RequirementStatus = Literal['met', 'not_met', 'unknown', 'not_applicable']
OverallStatus = Literal['likely_eligible', 'not_currently_eligible', 'cannot_determine']

# Guidance strings are kept short and factual. They never promise approval.
_GUIDANCE = {
    'state_not_met': (
        "This requirement is not currently satisfied. "
        "Check whether another scheme is more suitable."
    ),
    'state_met_all': (
        "This requirement matches the information provided."
    ),
    'state_met_specific': (
        "This requirement matches the information provided."
    ),
    'crop_not_met': (
        "This requirement is not currently satisfied. "
        "Check whether another scheme is more suitable."
    ),
    'crop_met_all': (
        "This requirement matches the information provided."
    ),
    'crop_met_specific': (
        "This requirement matches the information provided."
    ),
    'land_unknown': (
        "Verify this requirement using the official scheme source."
    ),
    'category_unknown': (
        "Verify this requirement using the official scheme source."
    ),
}

_DISCLAIMER = (
    "This is an informational assessment based on structured scheme data, "
    "not a government eligibility determination. Always verify official requirements "
    "on the scheme's official portal before applying."
)


def assess_eligibility(profile: dict, scheme: dict) -> dict:
    """Assess the farmer's apparent eligibility for a scheme.

    Args:
        profile: Farmer profile dict with keys 'state', 'crop', 'land_size'.
                 district and interests are not used in eligibility assessment.
        scheme:  Full scheme dict as returned by get_scheme_by_id() —
                 must include 'state', 'crop', 'min_land_acres', 'max_land_acres'.

    Returns:
        {
            "status": "likely_eligible" | "not_currently_eligible" | "cannot_determine",
            "checks": [
                {
                    "requirement": "State",
                    "status": "met" | "not_met" | "unknown" | "not_applicable",
                    "detail": "...",
                    "what_you_can_do": "..."
                },
                ...
            ],
            "disclaimer": "..."
        }
    """
    checks = []

    # ------------------------------------------------------------------
    # 1. State check — fully reliable with current data
    # ------------------------------------------------------------------
    state_check = _check_state(profile, scheme)
    checks.append(state_check)

    # ------------------------------------------------------------------
    # 2. Crop check — fully reliable with current data
    # ------------------------------------------------------------------
    crop_check = _check_crop(profile, scheme)
    checks.append(crop_check)

    # ------------------------------------------------------------------
    # 3. Land size check — always 'unknown' in current dev dataset
    #    (all min_land_acres / max_land_acres are null)
    # ------------------------------------------------------------------
    land_check = _check_land_size(profile, scheme)
    checks.append(land_check)

    # ------------------------------------------------------------------
    # 4. Category check — derived from land size and checked against enum
    # ------------------------------------------------------------------
    category_check = _check_category(profile, scheme)
    checks.append(category_check)

    # ------------------------------------------------------------------
    # 5. Income check
    # ------------------------------------------------------------------
    income_check = _check_income(profile, scheme)
    checks.append(income_check)

    # ------------------------------------------------------------------
    # Derive overall status
    # ------------------------------------------------------------------
    statuses = [c['status'] for c in checks]
    if 'not_met' in statuses:
        overall = 'not_currently_eligible'
    elif 'unknown' in statuses:
        overall = 'cannot_determine'
    else:
        overall = 'likely_eligible'

    return {
        'status': overall,
        'checks': checks,
        'disclaimer': _DISCLAIMER,
    }


# ---------------------------------------------------------------------------
# Individual requirement checks
# ---------------------------------------------------------------------------

def _check_state(profile: dict, scheme: dict) -> dict:
    """Check state requirement."""
    scheme_state = (scheme.get('state') or '').strip()
    farmer_state = (profile.get('state') or '').strip()

    if scheme_state.lower() == 'all':
        return {
            'requirement': 'State',
            'status': 'met',
            'detail': f"Nationwide scheme — {farmer_state} is covered.",
            'what_you_can_do': _GUIDANCE['state_met_all'],
        }

    if scheme_state.lower() == farmer_state.lower():
        return {
            'requirement': 'State',
            'status': 'met',
            'detail': f"Scheme targets {scheme_state} — your state ({farmer_state}) matches.",
            'what_you_can_do': _GUIDANCE['state_met_specific'],
        }

    return {
        'requirement': 'State',
        'status': 'not_met',
        'detail': (
            f"Scheme is restricted to {scheme_state}. "
            f"Your state ({farmer_state}) is not in the stated coverage area."
        ),
        'what_you_can_do': _GUIDANCE['state_not_met'],
    }


def _check_crop(profile: dict, scheme: dict) -> dict:
    """Check crop requirement."""
    scheme_crop = scheme.get('crop')
    farmer_crop = (profile.get('crop') or '').strip()

    if not scheme_crop or scheme_crop.strip().lower() == 'all':
        return {
            'requirement': 'Crop',
            'status': 'met',
            'detail': f"Not restricted to a specific crop — {farmer_crop} growers may apply.",
            'what_you_can_do': _GUIDANCE['crop_met_all'],
        }

    scheme_crops = [c.strip().lower() for c in scheme_crop.split(',')]
    if farmer_crop.lower() in scheme_crops:
        return {
            'requirement': 'Crop',
            'status': 'met',
            'detail': f"Your crop ({farmer_crop}) is in the scheme's stated crop coverage.",
            'what_you_can_do': _GUIDANCE['crop_met_specific'],
        }

    return {
        'requirement': 'Crop',
        'status': 'not_met',
        'detail': (
            f"Scheme covers: {scheme_crop}. "
            f"Your crop ({farmer_crop}) is not listed."
        ),
        'what_you_can_do': _GUIDANCE['crop_not_met'],
    }


def _check_land_size(profile: dict, scheme: dict) -> dict:
    """Check land size requirement.

    Returns 'unknown' when no thresholds are set (all dev-seed schemes).
    Returns 'met' / 'not_met' when thresholds exist — ready for full dataset.
    """
    min_acres = scheme.get('min_land_acres')
    max_acres = scheme.get('max_land_acres')

    if min_acres is None and max_acres is None:
        return {
            'requirement': 'Land Size',
            'status': 'unknown',
            'detail': "We don't have enough verified information to determine this requirement.",
            'what_you_can_do': _GUIDANCE['land_unknown'],
        }

    land = float(profile.get('land_size', 0))
    below_min = (min_acres is not None and land < float(min_acres))
    above_max = (max_acres is not None and land > float(max_acres))

    if below_min or above_max:
        if min_acres and max_acres:
            detail = (
                f"Your land size ({land} acres) is outside the stated range "
                f"({min_acres}–{max_acres} acres)."
            )
        elif min_acres:
            detail = (
                f"Your land size ({land} acres) is below the stated minimum "
                f"of {min_acres} acres."
            )
        else:
            detail = (
                f"Your land size ({land} acres) exceeds the stated upper limit "
                f"of {max_acres} acres."
            )
        return {
            'requirement': 'Land Size',
            'status': 'not_met',
            'detail': detail,
            'what_you_can_do': (
                "This requirement is not currently satisfied. "
                "Check whether another scheme is more suitable."
            ),
        }

    if min_acres and max_acres:
        detail = f"Your land size ({land} acres) is within the range ({min_acres}–{max_acres} acres)."
    elif min_acres:
        detail = f"Your land size ({land} acres) meets the minimum of {min_acres} acres."
    else:
        detail = f"Your land size ({land} acres) is within the upper limit of {max_acres} acres."

    return {
        'requirement': 'Land Size',
        'status': 'met',
        'detail': detail,
        'what_you_can_do': "This requirement matches the information provided.",
    }


def _check_category(profile: dict, scheme: dict) -> dict:
    """Check farmer category requirement."""
    scheme_category = (scheme.get('category') or '').strip()
    
    if not scheme_category or scheme_category.lower() == 'all':
        return {
            'requirement': 'Farmer Category',
            'status': 'met',
            'detail': "Nationwide scheme — open to all farmer categories.",
            'what_you_can_do': "This requirement matches the information provided."
        }
        
    land = profile.get('land_size')
    if land is None or land == '':
        return {
            'requirement': 'Farmer Category',
            'status': 'unknown',
            'detail': "Please provide your land size to determine your farmer category (Marginal, Small, Medium, or Large).",
            'what_you_can_do': "Update your profile with your land size."
        }
        
    try:
        land_acres = float(land)
    except ValueError:
        return {
            'requirement': 'Farmer Category',
            'status': 'unknown',
            'detail': "Invalid land size provided.",
            'what_you_can_do': "Update your profile with a valid land size in acres."
        }

    # Derive category
    if land_acres == 0:
        farmer_category = 'Landless'
    elif land_acres <= 2.47:
        farmer_category = 'Marginal'
    elif land_acres <= 4.94:
        farmer_category = 'Small'
    elif land_acres <= 9.88:
        farmer_category = 'Semi-Medium'
    elif land_acres <= 24.7:
        farmer_category = 'Medium'
    else:
        farmer_category = 'Large'
        
    scheme_categories = [c.strip().lower() for c in scheme_category.split(',')]
    
    if farmer_category.lower() in scheme_categories:
        return {
            'requirement': 'Farmer Category',
            'status': 'met',
            'detail': f"Your derived category ({farmer_category} based on {land_acres} acres) is in the scheme's allowed categories.",
            'what_you_can_do': "This requirement matches the information provided."
        }
        
    return {
        'requirement': 'Farmer Category',
        'status': 'not_met',
        'detail': f"Scheme requires: {scheme_category}. Your category ({farmer_category}) is not listed.",
        'what_you_can_do': "Check whether another scheme is more suitable for your category."
    }

def _check_income(profile: dict, scheme: dict) -> dict:
    """Check income requirement."""
    scheme_income = scheme.get('income_requirement')
    farmer_income = profile.get('annual_income')
    
    if scheme_income is None:
        return {
            'requirement': 'Income',
            'status': 'unknown',
            'detail': "We don't have enough verified information to determine this requirement.",
            'what_you_can_do': "Verify this requirement using the official scheme source."
        }
        
    if farmer_income is None or farmer_income == '':
        return {
            'requirement': 'Income',
            'status': 'unknown',
            'detail': "Please provide your annual family income to determine eligibility.",
            'what_you_can_do': "Update your profile with your annual income."
        }
        
    try:
        farmer_income_val = float(farmer_income)
        scheme_income_val = float(scheme_income)
    except ValueError:
        return {
            'requirement': 'Income',
            'status': 'unknown',
            'detail': "Invalid income provided.",
            'what_you_can_do': "Update your profile with a valid numeric income."
        }
        
    if farmer_income_val <= scheme_income_val:
        return {
            'requirement': 'Income',
            'status': 'met',
            'detail': f"Your annual income (₹{farmer_income_val}) is within the scheme's limit (₹{scheme_income_val}).",
            'what_you_can_do': "This requirement matches the information provided."
        }
        
    return {
        'requirement': 'Income',
        'status': 'not_met',
        'detail': f"Your annual income (₹{farmer_income_val}) exceeds the scheme's limit (₹{scheme_income_val}).",
        'what_you_can_do': "This requirement is not currently satisfied. Check whether another scheme is more suitable."
    }
