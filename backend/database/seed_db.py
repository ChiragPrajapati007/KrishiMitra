"""
Idempotent database seed script for KrishiMitra AI.

Per docs/DATABASE_SCHEMA.md and docs/ARCHITECTURE.md §10: this script is designed
to run safely on every app boot (not just once), since some deployment targets
(e.g. Render's ephemeral filesystem) may not preserve the SQLite file across
redeploys. Running this twice produces the same end state as running it once.

Usage:
    python database/seed_db.py
"""
import json
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
SCHEMA_PATH = BASE_DIR / "schema.sql"
SEED_PATH = BASE_DIR / "seed" / "schemes_seed.json"
DB_PATH = BASE_DIR / "krishimitra.db"

REQUIRED_FIELDS = [
    "id", "scheme_name", "description", "benefits", "state",
    "eligibility_keywords", "source", "last_verified",
]


def load_seed_schemes() -> list[dict]:
    with open(SEED_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    schemes = data["schemes"]

    # Fail loudly rather than silently seeding incomplete/invalid records —
    # per docs/DATASET_STRUCTURE.md's "no source, no entry" rule.
    for scheme in schemes:
        missing = [field for field in REQUIRED_FIELDS if not scheme.get(field)]
        if missing:
            raise ValueError(
                f"Scheme '{scheme.get('id', '?')}' is missing required field(s): {missing}"
            )
    return schemes


def create_schema(conn: sqlite3.Connection) -> None:
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        conn.executescript(f.read())


def seed_schemes(conn: sqlite3.Connection, schemes: list[dict]) -> None:
    conn.executemany(
        """
        INSERT INTO schemes (
            id, scheme_name, description, benefits, state, crop, category,
            eligibility_keywords, required_documents, application_link,
            source, last_verified, min_land_acres, max_land_acres,
            income_requirement, beneficiary_type
        ) VALUES (
            :id, :scheme_name, :description, :benefits, :state, :crop, :category,
            :eligibility_keywords, :required_documents, :application_link,
            :source, :last_verified, :min_land_acres, :max_land_acres,
            :income_requirement, :beneficiary_type
        )
        """,
        schemes,
    )


def main() -> None:
    schemes = load_seed_schemes()

    conn = sqlite3.connect(DB_PATH)
    try:
        create_schema(conn)  # DROP + CREATE — idempotent by construction
        seed_schemes(conn, schemes)
        conn.commit()
        count = conn.execute("SELECT COUNT(*) FROM schemes").fetchone()[0]
        print(f"Seeded {count} schemes into {DB_PATH}")
        if count < 30:
            print(
                f"NOTE: this is a {count}-scheme DEVELOPMENT seed dataset, not the "
                f"final 30-50 verified dataset required by docs/DATASET_STRUCTURE.md. "
                f"See schemes_seed.json's '_NOTE' field."
            )
    finally:
        conn.close()


if __name__ == "__main__":
    main()
