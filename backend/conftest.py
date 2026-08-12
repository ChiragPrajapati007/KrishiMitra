"""
conftest.py — pytest configuration for the KrishiMitra AI backend test suite.

Placed at backend/ (the package root) so pytest can discover it regardless of
whether tests are run as:
    python -m pytest backend/tests/test_api.py          (from project root)
    python -m pytest tests/test_api.py                  (from backend/)

Responsibilities:
  1. Add backend/ to sys.path so that `from app import create_app` and all
     intra-package imports resolve correctly without needing an editable
     install or PYTHONPATH manipulation.
  2. Define the `client` pytest fixture that creates a fully-configured Flask
     test client using the real application from app.py (seed → fit → routes).

The `client` fixture is function-scoped: a fresh Flask test client context is
opened for every test function. The underlying Flask app (and its recommender)
is created once per session for efficiency.
"""
import sys
from pathlib import Path

import pytest

# Ensure backend/ is on sys.path.  This file lives at backend/conftest.py,
# so __file__.parent is the backend/ directory itself.
_BACKEND_DIR = Path(__file__).resolve().parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from app import create_app


@pytest.fixture(scope="session")
def app():
    """Create the Flask application once for the entire test session.

    Using session scope avoids re-seeding the database and re-fitting the
    TF-IDF vectorizer on every test function, which would be slow and
    unnecessary.  The app is configured with TESTING=True so Flask propagates
    exceptions to the test client rather than swallowing them.
    """
    application = create_app()
    application.config.update({"TESTING": True})
    return application


@pytest.fixture(scope="function")
def client(app):
    """Yield a Flask test client for a single test function.

    Using the app's test_client() as a context manager ensures that the
    application context is properly set up and torn down around each test.
    """
    with app.test_client() as c:
        yield c
