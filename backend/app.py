"""
KrishiMitra AI — Flask application factory.

Startup sequence (per docs/ARCHITECTURE.md §5 and §10, and the Phase 4 spec):

  1. Run seed_db() — idempotent: drops + recreates schema, inserts all records.
     This must happen first so the DB file always reflects the current seed
     dataset, regardless of whether this is a cold Render deployment or a local
     restart. The .db file cannot be assumed to exist or be current.

  2. Load all scheme rows from SQLite.

  3. Fit the SchemeRecommender ONCE on the scheme corpus.
     The fitted vectorizer and scheme matrix stay in memory for the process
     lifetime. A refit is only needed if schemes change (Admin CRUD, Phase 5+).

  4. Store recommender and scheme list on the Flask app object so routes can
     access them without re-importing or refitting.

  5. Register blueprints (routes) and start Flask.

No Flask imports in ml/, services/, or utils/ — the layering rule from
docs/ARCHITECTURE.md §5 is enforced here: routes → services → ml/database.
"""
import sys
from pathlib import Path

# Ensure `backend/` is on sys.path when this file is run directly (e.g.
# `python app.py` from the backend/ directory or from the project root).
_BACKEND_DIR = Path(__file__).resolve().parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from flask import Flask
from flask_cors import CORS

from database.seed_db import main as run_seed
from ml.recommender import SchemeRecommender
from services.scheme_service import get_all_schemes_for_recommender


def create_app() -> Flask:
    """Create and configure the Flask application.

    Returns a fully-configured Flask app with the recommender already fitted
    and all blueprints registered. Suitable for both direct running and for
    use as the application factory in test_api.py.
    """
    app = Flask(__name__)

    # Allow cross-origin requests from any origin (React dev server on a
    # different port, Vercel on a different domain). Configured here so it
    # applies to every blueprint registered below.
    CORS(app)

    # ------------------------------------------------------------------
    # Step 1 — Seed the database (idempotent: safe to run on every boot).
    # ------------------------------------------------------------------
    run_seed()

    # ------------------------------------------------------------------
    # Step 2 — Load scheme rows needed to fit the TF-IDF vectorizer.
    # ------------------------------------------------------------------
    schemes = get_all_schemes_for_recommender()
    if not schemes:
        # This should never happen after a successful seed, but fail loudly
        # rather than silently starting with an unfitted recommender.
        raise RuntimeError(
            "No schemes found in the database after seeding. "
            "Check that seed_db completed successfully."
        )

    # ------------------------------------------------------------------
    # Step 3 — Fit the TF-IDF recommender ONCE on the scheme corpus.
    # ------------------------------------------------------------------
    recommender = SchemeRecommender()
    recommender.fit(schemes)

    # ------------------------------------------------------------------
    # Step 4 — Store recommender and scheme list on the app object.
    # Routes access them via current_app.recommender and
    # current_app.all_schemes without re-importing or refitting.
    # ------------------------------------------------------------------
    app.recommender = recommender
    app.all_schemes = schemes

    # ------------------------------------------------------------------
    # Step 5 — Register blueprints.
    # ------------------------------------------------------------------
    from routes.schemes import schemes_bp
    from routes.recommend import recommend_bp

    app.register_blueprint(schemes_bp)
    app.register_blueprint(recommend_bp)

    return app


if __name__ == "__main__":
    application = create_app()
    # Debug mode is for local development only. Production deployments (Render)
    # should use a WSGI server like gunicorn, not `python app.py` directly.
    application.run(debug=True, host="0.0.0.0", port=5000)
