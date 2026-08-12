"""
Shared text/profile helpers. No Flask, no sklearn imports here — pure functions
only, per docs/ARCHITECTURE.md §5's layering rule.

CORRECTION (post Phase 3): farmer category is no longer derived from land size
via universal acreage thresholds, and is no longer part of the TF-IDF query
text at all. This was reversed per an explicit PROJECT_CONTEXT correction —
see docs/ML_RECOMMENDER.md §1 and docs/DEVELOPMENT_LOG.md for the reasoning.
Land size stays a numeric field, used only against verified, scheme-specific
min_land_acres/max_land_acres thresholds in the rule/match layer (Phase 5,
not yet implemented) — never a universal bucketing scheme.
"""

# Interest chip id -> natural-language keyword phrase folded into the query
# text, per docs/ML_RECOMMENDER.md §1. Kept intentionally short and factual —
# not keyword-stuffed padding, per docs/DATASET_STRUCTURE.md's quality rules
# applying equally to query-side text.
INTEREST_KEYWORDS = {
    "irrigation": "irrigation water drip sprinkler micro-irrigation",
    "insurance": "insurance crop protection risk cover",
    "credit": "credit loan finance capital interest subvention",
    "equipment": "equipment machinery mechanization custom hiring",
    "seeds": "seeds quality seed distribution",
    "fertilizer": "fertilizer soil health nutrient",
    "marketing": "marketing price discovery mandi trading",
    "food_processing": "food processing value addition micro enterprise",
    "women_empowerment": "women farmer empowerment collective",
}

VALID_INTEREST_IDS = set(INTEREST_KEYWORDS.keys())


def build_profile_text(state: str, crop: str, interests: list[str] | None = None) -> str:
    """Builds the farmer profile query text per docs/ML_RECOMMENDER.md §1.

    Fields used: crop, state, optional interest keywords.

    Deliberately excluded from this text:
    - district (near-zero signal against the scheme corpus — unchanged from before)
    - land_size, in any form — no raw number (numbers carry no TF-IDF meaning)
      and, as of this correction, no derived category label either. Land size
      is purely a numeric field now, consumed only by the rule/match layer
      against scheme-specific thresholds — never converted into query text.
    """
    parts = [crop, "farmer", state, "state", "farming"]

    if interests:
        known = [i for i in interests if i in VALID_INTEREST_IDS]
        # Unknown interest ids are dropped silently, not rejected — matches
        # the validation behavior documented in API_DOCUMENTATION.md.
        for interest_id in known:
            parts.append(INTEREST_KEYWORDS[interest_id])

    return " ".join(parts)
