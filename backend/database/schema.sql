-- KrishiMitra AI — schemes table
-- Matches docs/DATABASE_SCHEMA.md exactly. Single table by design (see that doc for reasoning).

DROP TABLE IF EXISTS schemes;

CREATE TABLE schemes (
    id                    TEXT PRIMARY KEY,
    scheme_name           TEXT NOT NULL,
    description           TEXT NOT NULL,
    benefits              TEXT NOT NULL,
    state                 TEXT NOT NULL,
    crop                  TEXT,
    category              TEXT,
    eligibility_keywords  TEXT NOT NULL,
    required_documents    TEXT,
    application_link      TEXT,
    source                TEXT NOT NULL,
    last_verified         TEXT NOT NULL,   -- ISO date YYYY-MM-DD
    min_land_acres        REAL,
    max_land_acres        REAL,
    income_requirement    TEXT,
    beneficiary_type      TEXT
);
