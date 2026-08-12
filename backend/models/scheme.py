"""
KrishiMitra AI — Scheme model / row serializers.

Converts sqlite3.Row objects into plain dicts suitable for JSON serialization.

Two shapes are defined per docs/API_DOCUMENTATION.md:

  scheme_to_list_dict()  — light list-view (GET /api/schemes): omits
                           eligibility_keywords and required_documents.
  scheme_to_detail_dict() — full detail view (GET /api/schemes/<id> and
                            embedded in POST /api/recommend results): all
                            columns; required_documents is split from
                            comma-separated TEXT into a Python list.

Per docs/DATABASE_SCHEMA.md: required_documents is stored as TEXT
(comma-separated). The API contract (docs/API_DOCUMENTATION.md) shows it
as a JSON array in responses — so the split happens here, not in the schema.
"""


def _parse_required_documents(raw: str | None) -> list[str]:
    """Split a comma-separated required_documents string into a list.

    Returns an empty list if the value is null/empty.
    """
    if not raw:
        return []
    return [item.strip() for item in raw.split(",") if item.strip()]


def scheme_to_list_dict(row) -> dict:
    """Light serialization for the GET /api/schemes list view.

    Intentionally omits eligibility_keywords and required_documents to keep
    the list payload small, per docs/API_DOCUMENTATION.md.
    """
    return {
        "id": row["id"],
        "scheme_name": row["scheme_name"],
        "description": row["description"],
        "benefits": row["benefits"],
        "state": row["state"],
        "crop": row["crop"],
        "category": row["category"],
        "application_link": row["application_link"],
        "source": row["source"],
        "last_verified": row["last_verified"],
    }


def scheme_to_detail_dict(row) -> dict:
    """Full serialization for GET /api/schemes/<id> and recommend results.

    Includes all columns. required_documents is split from comma-separated
    TEXT into a list.
    """
    return {
        "id": row["id"],
        "scheme_name": row["scheme_name"],
        "description": row["description"],
        "benefits": row["benefits"],
        "state": row["state"],
        "crop": row["crop"],
        "category": row["category"],
        "eligibility_keywords": row["eligibility_keywords"],
        "required_documents": _parse_required_documents(row["required_documents"]),
        "application_link": row["application_link"],
        "source": row["source"],
        "last_verified": row["last_verified"],
        "min_land_acres": row["min_land_acres"],
        "max_land_acres": row["max_land_acres"],
    }
