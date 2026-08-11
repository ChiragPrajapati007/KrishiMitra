"""
Phase 3/6 — ML pipeline sanity test.

Runs the actual fit-once/transform-per-query pipeline against the real seeded
scheme corpus, using the 3 test profiles defined in docs/ML_RECOMMENDER.md §8.

Per docs/ARCHITECTURE.md §5: this exercises ml/ in isolation, no Flask involved.
Per the Step 3 instructions: no expected scores are hard-coded here — this
script prints the actual computed output so it can be inspected and recorded
in docs/DEVELOPMENT_LOG.md, not invented ahead of time.

Run from the backend/ directory:
    python tests/test_ml_pipeline.py
"""
import json
import sqlite3
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from ml.recommender import SchemeRecommender
from utils.text_utils import build_profile_text

DB_PATH = BACKEND_DIR / "database" / "krishimitra.db"

# The 3 profiles from docs/ML_RECOMMENDER.md §8, verbatim. `land_size` is kept
# on each profile dict for record-keeping / future rule-layer (Phase 5) tests
# — it is NOT used in query construction anymore (see the correction note in
# text_utils.py and ML_RECOMMENDER.md §1).
TEST_PROFILES = [
    {
        "label": "Profile A — Maharashtra / Cotton / Irrigation+Credit",
        "state": "Maharashtra",
        "district": "Nashik",
        "crop": "Cotton",
        "land_size": 1.8,
        "interests": ["irrigation", "credit"],
    },
    {
        "label": "Profile B — Punjab / Wheat / Insurance",
        "state": "Punjab",
        "district": "Ludhiana",
        "crop": "Wheat",
        "land_size": 1.2,
        "interests": ["insurance"],
    },
    {
        "label": "Profile C — Gujarat / Vegetables / no interests (weak-match stress case)",
        "state": "Gujarat",
        "district": "Anand",
        "crop": "Vegetables",
        "land_size": 40,
        "interests": [],
    },
]


def load_schemes() -> list[dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM schemes").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def main():
    schemes = load_schemes()
    scheme_lookup = {s["id"]: s for s in schemes}

    recommender = SchemeRecommender()
    recommender.fit(schemes)  # fit ONCE, exactly like production startup will
    print(f"Fit vectorizer on {len(schemes)} schemes (dev seed set).\n")

    all_results = {}
    for profile in TEST_PROFILES:
        profile_text = build_profile_text(
            state=profile["state"],
            crop=profile["crop"],
            interests=profile["interests"],
        )
        ranked = recommender.recommend(profile_text)
        all_results[profile["label"]] = ranked

        print("=" * 100)
        print(profile["label"])
        print(f"  Land size (numeric, NOT used in query — reserved for rule layer): {profile['land_size']} acres")
        print(f"  Query text: \"{profile_text}\"")
        print("-" * 100)
        for r in ranked:
            name = scheme_lookup[r["id"]]["scheme_name"]
            print(f"  {r['relevance_percent']:>3}%  {r['id']:<16} {name}")
        print()

    # --- Sanity checks (not fabricated scores — just structural properties
    #     that must hold if the pipeline is genuinely working) ---
    print("=" * 100)
    print("SANITY CHECKS")
    print("=" * 100)

    # 1. Determinism: same profile, run twice, identical results.
    p = TEST_PROFILES[0]
    text = build_profile_text(p["state"], p["crop"], p["interests"])
    run1 = recommender.recommend(text)
    run2 = recommender.recommend(text)
    deterministic = run1 == run2
    print(f"[{'PASS' if deterministic else 'FAIL'}] Determinism: identical profile produces identical ranking twice")

    # 2. Different profiles produce different rankings.
    rank_a = [r["id"] for r in all_results[TEST_PROFILES[0]["label"]]]
    rank_b = [r["id"] for r in all_results[TEST_PROFILES[1]["label"]]]
    different = rank_a != rank_b
    print(f"[{'PASS' if different else 'FAIL'}] Different profiles (A vs B) produce different rankings")

    # 3. Namo Shetkari (Maharashtra-only scheme) should score higher for the
    #    Maharashtra profile (A) than for the Punjab profile (B) — proves
    #    state-text matching is actually doing something, not just decorative.
    namo_a = next(r["relevance_score"] for r in all_results[TEST_PROFILES[0]["label"]] if r["id"] == "namo_shetkari")
    namo_b = next(r["relevance_score"] for r in all_results[TEST_PROFILES[1]["label"]] if r["id"] == "namo_shetkari")
    state_signal_works = namo_a > namo_b
    print(f"[{'PASS' if state_signal_works else 'FAIL'}] Maharashtra-only scheme scores higher for Maharashtra profile than Punjab profile ({namo_a:.4f} vs {namo_b:.4f})")

    # 4. Empty/invalid-ish input doesn't crash: empty interests, still ranks.
    try:
        empty_text = build_profile_text("Gujarat", "Vegetables", [])
        recommender.recommend(empty_text)
        no_crash = True
    except Exception as e:
        no_crash = False
        print(f"  Exception: {e}")
    print(f"[{'PASS' if no_crash else 'FAIL'}] Empty interests list does not crash the pipeline")

    # 5. All scores are in the valid [0, 1] range (non-negative TF-IDF vectors).
    all_scores = [r["relevance_score"] for results in all_results.values() for r in results]
    valid_range = all(0.0 <= s <= 1.0 for s in all_scores)
    print(f"[{'PASS' if valid_range else 'FAIL'}] All relevance scores fall within [0, 1]")

    # 6. Every scheme is returned for every profile (no silent filtering/threshold).
    complete = all(len(results) == len(schemes) for results in all_results.values())
    print(f"[{'PASS' if complete else 'FAIL'}] Every profile returns all {len(schemes)} schemes (no hidden threshold)")

    all_pass = deterministic and different and state_signal_works and no_crash and valid_range and complete
    print()
    print("ALL CHECKS PASSED" if all_pass else "SOME CHECKS FAILED — see above")
    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(main())


# ---------------------------------------------------------------------------
# pytest-compatible test functions
# ---------------------------------------------------------------------------
# These allow `python -m pytest backend/tests/test_ml_pipeline.py` to work.
# They exercise the SAME logic as main() — no duplication — but use pytest's
# assert/xfail instead of the custom [PASS]/[FAIL] print format.
#
# The existing main() and standalone `python test_ml_pipeline.py` path are
# fully preserved.  Nothing in the Phase 3 ML implementation is modified.
# ---------------------------------------------------------------------------

import pytest as _pytest  # imported here to keep it isolated from the script path


def _build_pipeline():
    """Helper: load schemes, fit recommender, run all 3 profiles.

    Returns (schemes, recommender, all_results, scheme_lookup) ready for
    individual test functions to inspect.  The recommender is fit once here
    and reused — exactly as production does it.
    """
    schemes = load_schemes()
    recommender = SchemeRecommender()
    recommender.fit(schemes)

    all_results = {}
    for profile in TEST_PROFILES:
        profile_text = build_profile_text(
            state=profile["state"],
            crop=profile["crop"],
            interests=profile["interests"],
        )
        all_results[profile["label"]] = recommender.recommend(profile_text)

    scheme_lookup = {s["id"]: s for s in schemes}
    return schemes, recommender, all_results, scheme_lookup


# Run the pipeline once at module load time so each test function is fast.
# pytest collects modules at import time so this executes before any test runs.
_SCHEMES, _RECOMMENDER, _ALL_RESULTS, _SCHEME_LOOKUP = _build_pipeline()
_PROFILE_A_LABEL = TEST_PROFILES[0]["label"]
_PROFILE_B_LABEL = TEST_PROFILES[1]["label"]


def test_ml_determinism():
    """Same profile → same ranking twice (determinism check)."""
    p = TEST_PROFILES[0]
    text = build_profile_text(p["state"], p["crop"], p["interests"])
    run1 = _RECOMMENDER.recommend(text)
    run2 = _RECOMMENDER.recommend(text)
    assert run1 == run2, "Recommender is non-deterministic: two identical calls gave different results"


def test_ml_different_profiles_different_rankings():
    """Different profiles (A vs B) produce different scheme rankings."""
    rank_a = [r["id"] for r in _ALL_RESULTS[_PROFILE_A_LABEL]]
    rank_b = [r["id"] for r in _ALL_RESULTS[_PROFILE_B_LABEL]]
    assert rank_a != rank_b, (
        "Profile A and Profile B produced identical rankings — "
        "TF-IDF may not be differentiating on input"
    )


def test_ml_maharashtra_state_signal():
    """Namo Shetkari (Maharashtra) must score higher for Profile A (Maharashtra) than Profile B (Punjab)."""
    namo_a = next(
        r["relevance_score"]
        for r in _ALL_RESULTS[_PROFILE_A_LABEL]
        if r["id"] == "namo_shetkari"
    )
    namo_b = next(
        r["relevance_score"]
        for r in _ALL_RESULTS[_PROFILE_B_LABEL]
        if r["id"] == "namo_shetkari"
    )
    assert namo_a > namo_b, (
        f"namo_shetkari scored {namo_a:.4f} for Maharashtra profile "
        f"but {namo_b:.4f} for Punjab profile (expected MH > PB)"
    )


def test_ml_empty_interests_no_crash():
    """Empty interests list must not crash the pipeline."""
    text = build_profile_text("Gujarat", "Vegetables", [])
    results = _RECOMMENDER.recommend(text)
    assert isinstance(results, list) and len(results) > 0, (
        "recommend() with empty interests returned empty or non-list result"
    )


def test_ml_scores_in_valid_range():
    """All relevance scores for all 3 profiles must be in [0.0, 1.0]."""
    bad = [
        (profile_label, r["id"], r["relevance_score"])
        for profile_label, results in _ALL_RESULTS.items()
        for r in results
        if not (0.0 <= r["relevance_score"] <= 1.0)
    ]
    assert not bad, f"Scores outside [0, 1]: {bad}"


def test_ml_all_schemes_returned():
    """Every profile must return ALL schemes — no silent filtering or threshold."""
    for profile_label, results in _ALL_RESULTS.items():
        assert len(results) == len(_SCHEMES), (
            f"Profile '{profile_label}' returned {len(results)} schemes, "
            f"expected {len(_SCHEMES)}"
        )
