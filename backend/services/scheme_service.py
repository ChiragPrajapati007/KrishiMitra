"""
KrishiMitra AI — Scheme data-access service.

All SQLite reads for the /api/schemes endpoints live here.
No Flask imports — this layer is independently testable.

Per docs/ARCHITECTURE.md §5: routes/ never imports from database/ directly.
Routes call services/, which call database/.
"""
from database.db import get_connection
from models.scheme import scheme_to_detail_dict, scheme_to_list_dict


def get_all_schemes(state: str | None = None, crop: str | None = None) -> list[dict]:
    """Return all schemes, optionally filtered by state and/or crop.

    Filtering logic (per docs/API_DOCUMENTATION.md GET /api/schemes):
    - When state is provided, include rows where the scheme's state column
      equals the requested state OR equals "All" (nationwide schemes must
      always be included when filtering by state).
    - Same logic applies to crop.
    - A plain WHERE state = ? would exclude nationwide "All" schemes, which
      is wrong — this is explicitly handled here.

    Returns a list of light-serialized dicts (no eligibility_keywords or
    required_documents in the list view).
    """
    conditions = []
    params = []

    if state:
        conditions.append("(state = ? OR state = 'All')")
        params.append(state)

    if crop:
        conditions.append("(crop = ? OR crop = 'All' OR crop IS NULL)")
        params.append(crop)

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

    query = f"""
        SELECT id, scheme_name, description, benefits, state, crop, category,
               application_link, source, last_verified
        FROM schemes
        {where_clause}
        ORDER BY scheme_name
    """

    conn = get_connection()
    try:
        rows = conn.execute(query, params).fetchall()
        return [scheme_to_list_dict(row) for row in rows]
    finally:
        conn.close()


def get_scheme_by_id(scheme_id: str) -> dict | None:
    """Return a single scheme's full detail dict, or None if not found.

    Used by GET /api/schemes/<id>. Returns all 14 columns including
    eligibility_keywords, required_documents, min_land_acres, max_land_acres.
    """
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM schemes WHERE id = ?", (scheme_id,)
        ).fetchone()
        if row is None:
            return None
        return scheme_to_detail_dict(row)
    finally:
        conn.close()


def get_all_schemes_for_recommender() -> list[dict]:
    """Return all scheme rows as plain dicts for fitting the TF-IDF recommender.

    This returns the raw full rows (including eligibility_keywords) so the
    ML module can build its scheme documents. Called once at app startup.
    """
    conn = get_connection()
    try:
        rows = conn.execute("SELECT * FROM schemes").fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()
