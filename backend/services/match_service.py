"""
KrishiMitra AI — Phase 5 informational match service.

Computes four informational match signals (state, crop, land_size, interests)
and generates human-readable match_reasons for each recommendation result.

CRITICAL DESIGN CONSTRAINTS (per docs/PROJECT_CONTEXT.md §9,
docs/ML_RECOMMENDER.md §5-6):

  1. ALL signals are INFORMATIONAL ONLY.
     They NEVER filter, reorder, remove, boost, or penalize schemes.
     TF-IDF + cosine similarity is the ONLY ranking mechanism.

  2. match_reasons strings NEVER claim official government eligibility.
     Banned language: "eligible", "eligibility", "approved", "guaranteed",
     "qualify", "qualifies". These are enforced by a defensive output scan.

  3. land_size stays numeric. It is NEVER converted to a category label
     (Marginal/Small/Medium/Large). The signal is returned as null when no
     scheme-specific threshold is available — this is the correct, honest
     answer, not a gap to be filled with invented data.

  4. Category matching is intentionally skipped. The `category` field in the
     current dataset is free-text prose (e.g. "All, with priority for Marginal
     and Small farmers") — not a structured enum. A reliable boolean comparison
     cannot be made without a data model change. This is a known limitation,
     documented here; it does not affect the four implemented signals.

  5. Interest keyword matching reuses INTEREST_KEYWORDS and VALID_INTEREST_IDS
     from utils/text_utils.py — the same mapping that builds the TF-IDF query.
     This ensures the explanation reflects exactly what the ML query asked about.

This module has no Flask, no sklearn, and no SQLite imports. It is pure
business logic and is testable in isolation without a running Flask application.
"""

from utils.text_utils import INTEREST_KEYWORDS, VALID_INTEREST_IDS

# ---------------------------------------------------------------------------
# Human-readable labels for interest IDs (display use in match_reasons).
# Must cover every key in INTEREST_KEYWORDS — add here when text_utils.py
# gains new interest IDs.
# ---------------------------------------------------------------------------
_INTEREST_LABELS: dict[str, str] = {
    "irrigation": "irrigation support",
    "insurance": "crop insurance",
    "credit": "credit / loans",
    "equipment": "farm equipment / mechanization",
    "seeds": "quality seeds",
    "fertilizer": "fertilizer / soil health",
    "marketing": "market access / price discovery",
    "food_processing": "food processing / value addition",
    "women_empowerment": "women farmer support",
}

# Terms that must never appear in any match_reasons string — enforced by
# the defensive scan in build_match_reasons().
_BANNED_TERMS: frozenset[str] = frozenset(
    {"eligible", "eligibility", "approved", "guaranteed", "qualify", "qualifies"}
)


# ---------------------------------------------------------------------------
# Public API — compute_match_signals
# ---------------------------------------------------------------------------

def compute_match_signals(profile: dict, scheme: dict) -> dict:
    """Compute the four informational match signals for a profile+scheme pair.

    Returns:
        {
            "state":     bool,
            "crop":      bool,
            "land_size": bool | None,
            "interests": {"matched": [...], "not_found": [...]},
        }

    None of these values affects TF-IDF ranking, scheme ordering, or
    scheme inclusion. They exist purely for display/explainability.
    """
    return {
        "state":     _state_signal(profile, scheme),
        "crop":      _crop_signal(profile, scheme),
        "land_size": _land_size_signal(profile, scheme),
        "interests": _interests_signal(profile, scheme),
    }


# ---------------------------------------------------------------------------
# Individual signal helpers
# ---------------------------------------------------------------------------

def _state_signal(profile: dict, scheme: dict) -> bool:
    """True if the scheme is nationwide ("All") or matches the farmer's state.

    Comparison is case-insensitive and strip()-ed. "All" always maps to True.
    """
    scheme_state = (scheme.get("state") or "").strip()
    if scheme_state.lower() == "all":
        return True
    return scheme_state.lower() == profile["state"].strip().lower()


def _crop_signal(profile: dict, scheme: dict) -> bool:
    """True if the scheme is not crop-specific, covers "All", or lists the crop.

    scheme.crop is null/empty  → scheme not crop-specific  → True
    scheme.crop == "All"       → nationwide crop coverage  → True
    scheme.crop contains crop  → case-insensitive token    → True
    otherwise                  → False

    Comparison is against comma-separated crop tokens.
    """
    scheme_crop = scheme.get("crop")
    if not scheme_crop or scheme_crop.strip().lower() == "all":
        return True
    scheme_crops = [c.strip().lower() for c in scheme_crop.split(",")]
    return profile["crop"].strip().lower() in scheme_crops


def _land_size_signal(profile: dict, scheme: dict) -> bool | None:
    """Numeric land-size comparison against scheme-specific declared thresholds.

    Returns:
      True  — scheme has thresholds; profile.land_size is within them
      False — scheme has thresholds; profile.land_size is outside them
      None  — scheme has no thresholds; comparison cannot be made; not invented

    IMPORTANT: land_size is NEVER converted into a category label here.
    If no threshold exists, None is the correct, honest return value.
    """
    min_acres = scheme.get("min_land_acres")
    max_acres = scheme.get("max_land_acres")
    if min_acres is None and max_acres is None:
        return None
    land = float(profile["land_size"])
    below_min = (min_acres is not None and land < float(min_acres))
    above_max = (max_acres is not None and land > float(max_acres))
    return not (below_min or above_max)


def _interests_signal(profile: dict, scheme: dict) -> dict:
    """Check which of the farmer's interests appear in the scheme's text.

    For each validated interest ID, checks whether any keyword from its
    INTEREST_KEYWORDS phrase appears (as a substring token) in the scheme's
    eligibility_keywords, description, or benefits text.

    Reuses INTEREST_KEYWORDS from text_utils.py — the same mapping used to
    build the TF-IDF query — so the explanation reflects what the ML query
    was actually asking about.

    Interest IDs not in VALID_INTEREST_IDS are silently ignored (they are
    stripped by validate_recommend_request before this point; this check is
    defensive only).

    Returns:
        {"matched": [list of interest_ids], "not_found": [list of interest_ids]}
    """
    interests = profile.get("interests") or []
    if not interests:
        return {"matched": [], "not_found": []}

    # Fields searched: same as those in the TF-IDF scheme document
    # (ML_RECOMMENDER.md §2) minus required_documents/application_link/source
    # which carry no topical signal.
    scheme_text = " ".join(filter(None, [
        scheme.get("eligibility_keywords") or "",
        scheme.get("description") or "",
        scheme.get("benefits") or "",
    ])).lower()

    matched: list[str] = []
    not_found: list[str] = []

    for interest_id in interests:
        if interest_id not in VALID_INTEREST_IDS:
            continue  # defensive; validation already stripped unknown IDs
        keyword_phrase = INTEREST_KEYWORDS[interest_id]
        phrase_tokens = keyword_phrase.lower().split()
        # An interest matches if ANY of its keyword tokens appears in the
        # scheme text — reflects how TF-IDF token overlap works.
        found = any(token in scheme_text for token in phrase_tokens)
        if found:
            matched.append(interest_id)
        else:
            not_found.append(interest_id)

    return {"matched": matched, "not_found": not_found}


# ---------------------------------------------------------------------------
# Public API — build_match_reasons
# ---------------------------------------------------------------------------

def build_match_reasons(profile: dict, scheme: dict, signals: dict) -> list[str]:
    """Generate a list of "why this scheme may be relevant" explanation strings.

    Each string is a factual statement about the scheme's stated coverage
    relative to the farmer's profile. The framing is always:
      "what the scheme says about itself" — not "what we conclude about you".

    No string may claim government eligibility, guaranteed approval, or
    probability of receiving benefits. The defensive scan at the end enforces
    this as a hard invariant.

    Category matching is intentionally omitted — see module docstring.
    """
    reasons: list[str] = []

    # ------------------------------------------------------------------
    # State
    # ------------------------------------------------------------------
    state_match = signals.get("state")
    scheme_state = (scheme.get("state") or "").strip()
    farmer_state = profile["state"].strip()

    if scheme_state.lower() == "all":
        reasons.append(
            f"This scheme is available nationwide — your state ({farmer_state}) is covered."
        )
    elif state_match:
        reasons.append(
            f"This scheme applies specifically to farmers in {scheme_state} — "
            f"your state ({farmer_state}) matches."
        )
    else:
        reasons.append(
            f"This scheme applies specifically to {scheme_state} — "
            f"your state ({farmer_state}) is not in the scheme's stated coverage area."
        )

    # ------------------------------------------------------------------
    # Crop
    # ------------------------------------------------------------------
    crop_match = signals.get("crop")
    scheme_crop = scheme.get("crop")
    farmer_crop = profile["crop"].strip()

    if not scheme_crop or scheme_crop.strip().lower() == "all":
        reasons.append(
            f"This scheme is not restricted to a specific crop — "
            f"{farmer_crop} growers may apply."
        )
    elif crop_match:
        reasons.append(
            f"This scheme covers {scheme_crop} — "
            f"your crop ({farmer_crop}) is mentioned."
        )
    else:
        reasons.append(
            f"This scheme mentions {scheme_crop} — "
            f"your crop ({farmer_crop}) is not listed in the scheme's stated crop coverage."
        )

    # ------------------------------------------------------------------
    # Land size
    # ------------------------------------------------------------------
    land_signal = signals.get("land_size")
    min_acres = scheme.get("min_land_acres")
    max_acres = scheme.get("max_land_acres")
    farmer_land = profile["land_size"]

    if land_signal is None:
        reasons.append(
            "No land size threshold is specified for this scheme."
        )
    elif land_signal is True:
        if min_acres is not None and max_acres is not None:
            reasons.append(
                f"Your land size ({farmer_land} acres) is within this scheme's "
                f"stated range ({min_acres}–{max_acres} acres)."
            )
        elif min_acres is not None:
            reasons.append(
                f"Your land size ({farmer_land} acres) meets this scheme's "
                f"stated minimum of {min_acres} acres."
            )
        else:
            reasons.append(
                f"Your land size ({farmer_land} acres) is within this scheme's "
                f"stated upper limit of {max_acres} acres."
            )
    else:  # False
        if min_acres is not None and max_acres is not None:
            reasons.append(
                f"Your land size ({farmer_land} acres) is outside this scheme's "
                f"stated range ({min_acres}–{max_acres} acres)."
            )
        elif min_acres is not None:
            reasons.append(
                f"Your land size ({farmer_land} acres) is below this scheme's "
                f"stated minimum of {min_acres} acres."
            )
        else:
            reasons.append(
                f"Your land size ({farmer_land} acres) exceeds this scheme's "
                f"stated upper limit of {max_acres} acres."
            )

    # ------------------------------------------------------------------
    # Interests
    # ------------------------------------------------------------------
    interests_signal = signals.get("interests", {})
    matched_ids = interests_signal.get("matched", [])
    not_found_ids = interests_signal.get("not_found", [])

    for interest_id in matched_ids:
        label = _INTEREST_LABELS.get(interest_id, interest_id)
        reasons.append(
            f"Your interest in {label} is reflected in what this scheme supports."
        )
    for interest_id in not_found_ids:
        label = _INTEREST_LABELS.get(interest_id, interest_id)
        reasons.append(
            f"Your interest in {label} is not specifically mentioned by this scheme."
        )

    # ------------------------------------------------------------------
    # Defensive eligibility-language scan.
    # The reasons above are built from templates using structured profile/
    # scheme fields (state names, crop names, numbers, our own labels) —
    # none of which should contain banned terms. This scan is a last-resort
    # safeguard in case scheme data itself introduces problematic text.
    # A reason that triggers it is dropped rather than surfaced.
    # ------------------------------------------------------------------
    safe_reasons = [
        r for r in reasons
        if not any(term in r.lower() for term in _BANNED_TERMS)
    ]
    return safe_reasons
