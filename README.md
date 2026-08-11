# KrishiMitra AI

A farmer-focused web application that ranks government agricultural schemes by relevance to a farmer's profile, using TF-IDF + cosine similarity (Python/Scikit-learn). Built for a hackathon — see `docs/` for the full locked technical specification.

**This is a decision-support tool. It does not determine official government eligibility.**

## Status

Step 3 — Implementation, in progress. See `docs/DEVELOPMENT_LOG.md` for what's done and what's next.

## Project Structure

```
krishimitra-ai/
├── backend/          # Flask + Python + Scikit-learn
│   ├── app.py
│   ├── routes/
│   ├── services/
│   ├── ml/
│   ├── database/
│   ├── models/
│   ├── utils/
│   └── tests/
├── frontend/          # React + Tailwind (Phase 7)
├── docs/              # Locked technical specification (Steps 1 & 2) + development log
├── README.md
└── .gitignore
```

## Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
python database/seed_db.py         # creates + seeds the SQLite database
python app.py                       # starts the Flask dev server on :5000
```

## Documentation

The technical decisions below are **locked** (see `docs/`) — do not reopen them without a concrete implementation blocker:

- `docs/ARCHITECTURE.md` — product definition, MVP scope, system architecture, final decisions
- `docs/ML_RECOMMENDER.md` — TF-IDF + cosine similarity methodology
- `docs/DATABASE_SCHEMA.md` — SQLite schema
- `docs/API_DOCUMENTATION.md` — REST API contract
- `docs/DATASET_STRUCTURE.md` — scheme dataset schema and sourcing rules
- `docs/DESIGN_SYSTEM.md` — extracted visual design tokens
- `docs/STEP1_AUDIT_REPORT.md` — prototype audit
- `docs/DEVELOPMENT_LOG.md` — what's actually been built, updated after each phase
