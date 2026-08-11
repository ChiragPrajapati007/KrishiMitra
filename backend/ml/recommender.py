"""
KrishiMitra AI — ML Recommender core.

Implements the FINAL, LOCKED design from docs/ML_RECOMMENDER.md §3-4 (Approach A):

    scheme_matrix = TfidfVectorizer().fit_transform(scheme_documents)   # fit ONCE
    profile_vector = vectorizer.transform([profile_text])                # per request
    scores = cosine_similarity(profile_vector, scheme_matrix)            # per request
    ranked = sort(schemes, key=score, descending=True, tiebreak=scheme_name)

No Flask, no sqlite3 import here — this module only knows about text in,
scores out. Fitting happens once (see services/ for when `fit()` is called
in the running app — at startup, not per-request), not per request.
No random/fabricated scores anywhere in this file — every number returned
is the actual output of TfidfVectorizer + cosine_similarity.
"""
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from ml.scheme_document import build_scheme_document


class SchemeRecommender:
    def __init__(self):
        self._vectorizer: TfidfVectorizer | None = None
        self._scheme_matrix = None
        self._scheme_ids: list[str] = []
        self._scheme_names: dict[str, str] = {}  # id -> scheme_name, for tiebreak sorting

    @property
    def is_fitted(self) -> bool:
        return self._vectorizer is not None

    def fit(self, schemes: list[dict]) -> None:
        """Fit the vectorizer ONCE on the scheme corpus. Call this once at app
        startup (see services/recommend_service.py), not per request. Calling
        it again (e.g. after Admin CRUD writes, ONLY IF TIME REMAINS) is a
        deliberate refit, not something that happens implicitly per query.
        """
        if not schemes:
            raise ValueError("Cannot fit recommender on an empty scheme list")

        documents = [build_scheme_document(s) for s in schemes]
        self._vectorizer = TfidfVectorizer(stop_words="english")
        self._scheme_matrix = self._vectorizer.fit_transform(documents)
        self._scheme_ids = [s["id"] for s in schemes]
        self._scheme_names = {s["id"]: s["scheme_name"] for s in schemes}

    def recommend(self, profile_text: str) -> list[dict]:
        """Transform profile_text as a query against the fitted vectorizer,
        compute cosine similarity against every scheme, and return all
        schemes ranked descending by score (alphabetical tiebreak on
        scheme_name), per docs/ML_RECOMMENDER.md §7.

        Returns: [{"id": ..., "relevance_score": float 0-1, "relevance_percent": int}, ...]
        """
        if not self.is_fitted:
            raise RuntimeError("Recommender has not been fit yet — call fit() first")

        profile_vector = self._vectorizer.transform([profile_text])
        # cosine_similarity returns shape (1, n_schemes); flatten to 1D.
        scores = cosine_similarity(profile_vector, self._scheme_matrix)[0]

        results = [
            {
                "id": scheme_id,
                "relevance_score": float(score),
                "relevance_percent": round(float(score) * 100),
            }
            for scheme_id, score in zip(self._scheme_ids, scores)
        ]

        # Descending score, alphabetical scheme_name tiebreak — deterministic,
        # per docs/ML_RECOMMENDER.md §7 and the v3 reproducibility requirement.
        results.sort(key=lambda r: (-r["relevance_score"], self._scheme_names[r["id"]]))
        return results
