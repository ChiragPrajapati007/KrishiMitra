"""
KrishiMitra AI — Recommendation route.

Blueprint: recommend_bp
Prefix:    /api

Endpoint:
  POST /api/recommend — validate farmer profile, run TF-IDF recommender,
                        return ranked schemes with informational match flags.

Per docs/API_DOCUMENTATION.md and docs/PROJECT_CONTEXT.md:
  - Validates input before calling the ML module.
  - Returns all schemes, ranked by TF-IDF cosine similarity descending.
  - match_flags are informational only — they never filter, reorder, or
    remove schemes, and must never use eligibility-confirmation language.
  - Raw tracebacks are never exposed; 500 with a generic message only.
"""
from flask import Blueprint, current_app, jsonify, request

from services.recommend_service import build_recommendation, validate_recommend_request

recommend_bp = Blueprint("recommend", __name__, url_prefix="/api")


@recommend_bp.route("/recommend", methods=["POST"])
def recommend():
    """POST /api/recommend — farmer profile in, ranked schemes out."""
    # Flask parses the body as JSON. force=False means we require the client
    # to send Content-Type: application/json; silent=True means we get None
    # instead of a 400 if parsing fails, which we handle below.
    data = request.get_json(force=False, silent=True)

    if data is None:
        return (
            jsonify({"error": "Request body must be valid JSON", "field": None}),
            400,
        )

    # Validate before anything reaches the ML layer.
    cleaned, error = validate_recommend_request(data)
    if error is not None:
        return jsonify(error), 400

    # Retrieve the pre-fitted recommender and scheme list stored at startup.
    recommender = current_app.recommender
    all_schemes = current_app.all_schemes

    try:
        response_data = build_recommendation(
            profile=cleaned,
            recommender=recommender,
            all_schemes=all_schemes,
        )
    except Exception:
        current_app.logger.exception("Recommendation pipeline failed")
        return jsonify({"error": "Internal server error"}), 500

    return jsonify(response_data), 200
