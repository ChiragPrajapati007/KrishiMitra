"""
KrishiMitra AI — Scheme listing and detail routes.

Blueprint: schemes_bp
Prefix:    /api

Endpoints:
  GET /api/schemes                      — list all schemes (optional state/crop filters)
  GET /api/schemes/<id>                 — full detail for one scheme
  GET /api/schemes/<id>/eligibility     — informational eligibility assessment
                                          (requires ?state=&crop=&land_size= query params)

Per docs/API_DOCUMENTATION.md:
  - GET /api/schemes list view omits eligibility_keywords and required_documents.
  - GET /api/schemes/<id> returns all columns.
  - Filtering by state must include nationwide schemes (state == "All").
  - 404 when id not found.
  - 500 (generic) on genuine DB failure; raw tracebacks are never exposed.

ELIGIBILITY ENDPOINT ARCHITECTURE:
  The eligibility endpoint is intentionally separate from /api/recommend.
  TF-IDF relevance (recommendation) and structured requirement checks
  (eligibility assessment) are PERMANENTLY separate responsibilities.
  See services/eligibility_service.py for the full architecture rationale.
"""
from flask import Blueprint, jsonify, request, current_app

from services.scheme_service import get_all_schemes, get_scheme_by_id
from services.eligibility_service import assess_eligibility

schemes_bp = Blueprint("schemes", __name__, url_prefix="/api")


@schemes_bp.route("/schemes", methods=["GET"])
def list_schemes():
    """GET /api/schemes — list schemes, optionally filtered by state and/or crop."""
    state = request.args.get("state", "").strip() or None
    crop = request.args.get("crop", "").strip() or None

    try:
        schemes = get_all_schemes(state=state, crop=crop)
    except Exception:
        current_app.logger.exception("Failed to fetch schemes list")
        return jsonify({"error": "Internal server error"}), 500

    return jsonify({"count": len(schemes), "schemes": schemes}), 200


@schemes_bp.route("/schemes/<string:scheme_id>", methods=["GET"])
def get_scheme(scheme_id: str):
    """GET /api/schemes/<id> — full detail for a single scheme."""
    try:
        scheme = get_scheme_by_id(scheme_id)
    except Exception:
        current_app.logger.exception("Failed to fetch scheme by id: %s", scheme_id)
        return jsonify({"error": "Internal server error"}), 500

    if scheme is None:
        return jsonify({"error": "Scheme not found", "id": scheme_id}), 404

    return jsonify(scheme), 200


@schemes_bp.route("/schemes/<string:scheme_id>/eligibility", methods=["GET"])
def get_eligibility(scheme_id: str):
    """GET /api/schemes/<id>/eligibility — informational eligibility assessment.

    Query parameters (all required):
      state      — farmer's state (string)
      crop       — farmer's primary crop (string)
      land_size  — farmer's land holding in acres (positive number)

    Returns an eligibility assessment dict with status and per-requirement checks.
    This endpoint is INFORMATIONAL ONLY — it does not determine legal eligibility.
    TF-IDF relevance (from /api/recommend) and this eligibility assessment are
    completely separate; this endpoint does not interact with the ML layer.
    """
    # --- Fetch scheme ---
    try:
        scheme = get_scheme_by_id(scheme_id)
    except Exception:
        current_app.logger.exception("Failed to fetch scheme for eligibility: %s", scheme_id)
        return jsonify({"error": "Internal server error"}), 500

    if scheme is None:
        return jsonify({"error": "Scheme not found", "id": scheme_id}), 404

    # --- Parse and validate farmer profile from query params ---
    state = request.args.get("state", "").strip()
    crop = request.args.get("crop", "").strip()
    land_size_raw = request.args.get("land_size", "")

    if not state:
        return jsonify({"error": "state query parameter is required", "field": "state"}), 400
    if not crop:
        return jsonify({"error": "crop query parameter is required", "field": "crop"}), 400

    try:
        land_size = float(land_size_raw)
        if land_size <= 0:
            raise ValueError("non-positive")
    except (ValueError, TypeError):
        return jsonify({"error": "land_size must be a positive number", "field": "land_size"}), 400

    profile = {"state": state, "crop": crop, "land_size": land_size}

    # --- Run eligibility assessment ---
    try:
        assessment = assess_eligibility(profile, scheme)
    except Exception:
        current_app.logger.exception("Eligibility assessment failed for scheme: %s", scheme_id)
        return jsonify({"error": "Internal server error"}), 500

    return jsonify({
        "scheme_id": scheme_id,
        "scheme_name": scheme.get("scheme_name"),
        "profile": profile,
        **assessment,
    }), 200
