# KrishiMitra AI — Project Context
## Version 3.1 — Post-Step-3 Implementation Context

> Single source of truth for AI/developers working on KrishiMitra AI. Read before making architectural, ML, UI, or implementation decisions.

## 1. Project Overview

KrishiMitra AI is a farmer-focused web application that helps farmers discover government agricultural subsidy and welfare schemes most relevant to their profile.

Core flow:

**Farmer Profile → TF-IDF + Cosine Similarity → Relevance Score → Ranked Schemes → Scheme Details → Official Application Link**

The system is a decision-support/recommendation tool. It must NOT claim that its ML model officially determines government eligibility.

## 2. Hackathon Requirement

A farmer enters:
- Land size
- Crop
- State
- Category

The system ranks available schemes by relevance.

Required:
1. Farmer profile input
2. Scheme description/data
3. TF-IDF + cosine similarity
4. Ranked scheme dashboard
5. Scheme details/application links

Optional:
- Highlight matched/missing eligibility keywords
- Bookmark/save schemes

ML constraint: **TF-IDF + Cosine Similarity using Python/Scikit-learn.**
Do not replace it with embeddings, transformers, or LLM ranking.

## 3. Target User

Primary user: a farmer, potentially with limited technical/digital literacy. The interface should be simple, clear, and responsive on mobile-sized screens.

## 4. Farmer Profile

Hackathon-required profile inputs:
- State
- District
- Crop
- Land Size
- Category

Current implementation status:
- State and crop are used in the TF-IDF query.
- District is collected but deliberately excluded from the TF-IDF query because it provides little signal against the current scheme corpus.
- Land size remains a numeric field and is NOT converted into Marginal/Small/Medium/Large categories.
- Category is NOT derived from land size. The current Phase-3 ML query does not use category. Whether category should be collected and used later as a deterministic match signal is an explicit Phase-5 design decision.
- Interest/Support Need chips are optional and are used to strengthen the TF-IDF query.

Removed from the MVP profile unless a concrete downstream use is approved:
- Age
- Gender
- Annual income
- Disability status

Do not collect unused fields.

## 5. Final User Flow

Landing → Farmer Profile → Validation → `POST /api/recommend` → Profile preprocessing → TF-IDF → Cosine Similarity → Relevance Score → Rank schemes → Dashboard → Scheme Details → Official Application Link.

## 6. ML Methodology

Use:
- Python
- Scikit-learn
- `TfidfVectorizer`
- `cosine_similarity`

Recommended final design:

1. Fit TF-IDF on the **scheme corpus**.
2. Transform the farmer profile as a query using the same fitted vectorizer.
3. Calculate cosine similarity between the profile vector and every scheme vector.
4. Rank schemes by descending similarity.

This is preferred over refitting TF-IDF for every submission because it gives a stable, reproducible query-vs-document retrieval system.

Formula:

`cosine(A,B) = (A · B) / (||A|| ||B||)`

The result is a **Relevance/Match Score**, not an eligibility probability.

## 7. Profile Text

Current Phase-3 query construction uses only state, crop, and optional interest keywords.

Example:

```text
Cotton farmer Maharashtra state farming
irrigation water drip sprinkler micro irrigation
```

The following collected profile values are deliberately NOT inserted into the TF-IDF query:
- District
- Land size
- Category

Land size remains numeric and may later be checked only against a verified, scheme-specific threshold in the deterministic match layer. It must never be converted into universal acreage categories. Category handling is unresolved for Phase 5 and must not be invented during Phase 4.

## 8. Scheme Representation

Each scheme should have structured metadata plus searchable text containing relevant information such as:
- Scheme name
- Description
- Benefits
- Target farmer
- State applicability
- Crop applicability
- Category
- Relevant eligibility keywords

Do not create artificially long descriptions to manipulate TF-IDF.

## 9. Relevance vs Eligibility

ML determines:
- Textual similarity
- Profile match
- Relevance ranking

ML does NOT determine:
- Official government eligibility
- Guaranteed approval
- Probability of receiving a subsidy

Avoid:
- “You are officially eligible”
- “Eligibility: 100%”
- “Guaranteed eligible”

Prefer:
- “Strong profile match”
- “High relevance”
- “Potentially relevant”
- “Based on the information provided”

## 10. Optional Rule/Keyword Layer

A lightweight deterministic layer may later handle obvious, explicitly supported conditions such as state, crop, and verified scheme-specific land-size thresholds.

Category handling is currently unresolved because the old universal land-size-to-category logic was removed. Phase 5 must decide whether category is collected and compared as a direct profile attribute, and how that comparison is represented. Do not derive category from land size and do not invent universal thresholds.

This layer must not become a large legal eligibility engine. It only provides informational match signals and must never remove, reorder, or officially approve a scheme. If a condition cannot be reliably determined, show the limitation rather than making a definitive claim.

## 11. Explainability

Optional explainability can show which profile attributes are relevant:

```text
Why this scheme matches

Matched:
✓ Maharashtra
✓ Cotton
✓ Small Farmer

Not found / not provided:
— Income information
```

Keyword matching is explainability, not the ML model itself. The ML score comes from TF-IDF + cosine similarity.

## 12. Recommendation Output

Each result should contain approximately:
- Scheme name
- Relevance score
- Short description
- Key benefits
- Why it matches
- Eligibility information
- Required documents
- Application link
- Source
- Last verified date

Any displayed percentage must be labelled **Relevance Score / Match Score**.

## 13. Dataset

Target: **30–50 verified agricultural schemes**.

Include a sensible mixture of:
- Central government agricultural schemes
- Maharashtra/state schemes where applicable
- Subsidy schemes
- Welfare schemes
- Crop insurance
- Irrigation support
- Equipment/mechanization
- Crop/seed assistance
- Other relevant agricultural support

Each scheme should preferably have:
- Official source
- Valid application/information link
- Accurate description
- Accurate benefits
- Eligibility information
- Required documents where available
- State applicability
- Crop applicability
- Category applicability
- Last verified date

Never fabricate scheme information or benefits.

## 14. Database

Minimum `schemes` table:

| Field | Purpose |
|---|---|
| id | Unique identifier |
| scheme_name | Scheme name |
| description | Main description |
| benefits | Benefits |
| state | Applicable state(s) |
| crop | Applicable crop(s) |
| category | Target farmer category |
| eligibility_keywords | Explainability/matching |
| required_documents | Document checklist |
| application_link | Official application URL |
| source | Official/reference source |
| last_verified | Verification date |

Only add other tables if required by the MVP. Persistent farmer accounts are not required for the core demo.

## 15. API

Minimum:
- `GET /api/schemes`
- `GET /api/schemes/:id`
- `POST /api/recommend`

Admin CRUD only if retained:
- `POST /api/schemes`
- `PUT /api/schemes/:id`
- `DELETE /api/schemes/:id`

ML logic must be separated from Flask route functions.

## 16. Backend

Stack:
- Flask
- Python
- Scikit-learn
- SQLite

Suggested structure:

```text
backend/
├── app.py
├── routes/
├── services/
├── ml/
├── database/
├── models/
└── utils/
```

## 17. Frontend

Stack:
- React
- Tailwind CSS

`krishimitra-ai.html` is the primary visual reference. Preserve its existing visual identity rather than redesigning from scratch:
- Colors
- Typography
- Cards
- Buttons
- Forms
- Navigation
- Scheme cards
- Responsive behavior

Use `DESIGN_SYSTEM.md` when available for exact values.

## 18. Current Prototype

The HTML prototype contains:
- Farmer profile wizard
- Scheme data
- Recommendation UI
- TF-IDF implementation
- Cosine similarity
- Scheme cards
- Comparison
- Action plan
- Dataset/admin interface
- Responsive styling
- Language-related UI

Treat it as a UI/logic reference, not the final architecture. Final ML must run in Python/Scikit-learn through Flask.

## 19. Final Step 2 Decisions

The following decisions are now locked for implementation:

1. **TF-IDF + cosine similarity is the required ML method.**
2. TF-IDF is fitted on the scheme corpus; the farmer profile is transformed as a query.
3. The ML score is called **Relevance Score / Match Score**, never Eligibility Score.
4. The rule layer only flags profile conditions; it does not declare eligibility or remove/reorder schemes.
5. Gender, age, income, and disability are removed from the MVP profile.
6. Optional **Interest / Support Need** chips may be included to make the farmer query more informative.
7. Land size remains numeric and is never converted into a universal farmer category. It may only be used against verified, scheme-specific thresholds in the future deterministic match layer.
8. The database remains intentionally simple, centered on a single `schemes` table.
9. The core API remains `GET /api/schemes`, `GET /api/schemes/:id`, and `POST /api/recommend`.
10. Action Plan and Admin Analytics are removed from the MVP scope.
11. The existing HTML remains the visual reference; the final implementation moves ML to Python/Scikit-learn.
12. The dataset target remains 30–50 verified schemes with source and verification information.
13. No embeddings, transformers, LLM ranking, or fabricated ML scores are allowed.

These decisions should not be reopened during Step 3 unless a concrete implementation blocker is discovered.

## 20. Current Implementation Status — Step 3

### Completed
- Project foundation and backend package structure created.
- SQLite schema created.
- Idempotent seed process created.
- 11-scheme development seed corpus created for implementation/testing; this is NOT the final 30–50 verified dataset.
- Python ML recommender implemented with Scikit-learn `TfidfVectorizer` and `cosine_similarity`.
- TF-IDF is fit once on the scheme corpus and farmer profiles are transformed as queries.
- ML pipeline tests executed against three test profiles.
- Land-size categorization correction completed: `land_size_to_category()` and universal acreage thresholds were removed.
- `build_profile_text()` now uses state, crop, and optional interests only.
- ML documentation and development log updated with the correction and actual rerun results.
- Active architecture/API documentation was cleaned up so it no longer describes automatic land-size category derivation.

### Verified test state
- Determinism: PASS
- Different profiles produce different rankings: PASS
- Empty interests do not crash: PASS
- Scores remain in [0,1]: PASS
- All schemes are returned: PASS
- Maharashtra-specific ranking diagnostic: FAIL in the development seed corpus. This is a dataset-quality issue caused by the literal `Maharashtra` token appearing across scheme documents, not evidence that TF-IDF/cosine implementation is broken. Do not manipulate the algorithm to force this diagnostic to pass.

### Known implementation limitation
The development corpus contains 11 schemes and is not submission-ready. The final dataset must reach 30–50 verified schemes with accurate sources/provenance. State names should appear in `eligibility_keywords` only when factually relevant; nationwide schemes must not be padded with example state names because this weakens TF-IDF discrimination.

### Not implemented yet
- React frontend
- API/frontend integration
- Final 30–50 scheme dataset
- End-to-end testing
- Deployment

### Phase 4 completed
- `backend/app.py` — Flask app factory with enforced startup sequence (seed → load → fit → routes).
- `backend/database/db.py` — SQLite connection helper.
- `backend/models/scheme.py` — row serializers including required_documents comma→list split.
- `backend/services/scheme_service.py` — scheme data access with correct `OR state = 'All'` filter.
- `backend/services/recommend_service.py` — validation + recommendation orchestration + informational match_flags.
- `backend/routes/schemes.py`, `backend/routes/recommend.py` — Flask blueprints for all 3 endpoints.
- `backend/tests/test_api.py` — 16 test groups, 359 assertions, all passed.
- All 3 endpoints verified live on Flask dev server.
- No Phase 3 ML files modified.

### Phase 5 completed
- `backend/services/match_service.py` — NEW. Pure-function match service: `compute_match_signals()` (state, crop, land_size, interests) and `build_match_reasons()` (human-readable explanation strings). No Flask, no sklearn imports. Testable in isolation.
- `backend/services/recommend_service.py` — MODIFIED. Removed inline `_compute_match_flags()`. Now calls `match_service.compute_match_signals()` and `match_service.build_match_reasons()`. Each result includes `match_reasons: list[str]` and `match_flags.interests: {matched: [], not_found: []}`.
- `backend/tests/test_phase5_match.py` — NEW. 30 pure-function unit tests for match_service.
- `backend/tests/test_api.py` — EXTENDED. 6 new Phase 5 API tests added; existing 16 unchanged.

**Category matching:** intentionally skipped (known data limitation). The `category` column is free-text prose in the current dataset; a reliable boolean comparison cannot be made without a structured enum. This decision is final for Phase 5 and documented in `match_service.py`.

**Phase 5 test results:** 57 passed, 1 xfailed (test_ml_maharashtra_state_signal — expected, pre-existing dataset issue). All 22 API tests pass, all 30 match_service unit tests pass.

**Current development position: end of Phase 5 — informational match and explanation layer complete. Next: React + Tailwind frontend (Phase 6). Backend feature-complete for MVP core loop.**

## 21. Phase 4 Handoff

Phase 4 must implement the Flask API around the existing ML and database components without redesigning them.

Start by reading:
- `API_DOCUMENTATION.md`
- `ARCHITECTURE.md`
- `DATABASE_SCHEMA.md`
- `ML_RECOMMENDER.md`
- `DEVELOPMENT_LOG.md`

Core endpoints:
- `GET /api/schemes`
- `GET /api/schemes/:id`
- `POST /api/recommend`

Phase 4 rules:
- Do not replace TF-IDF/cosine similarity.
- Do not reintroduce automatic land-size categorization.
- Do not invent a Phase-5 category solution.
- Do not build the React frontend yet.
- Keep ML logic separate from Flask route functions.
- Use the existing database and recommender modules.
- Validate input before calling ML.
- Return relevance scores, never official eligibility claims.

After Phase 4, update `DEVELOPMENT_LOG.md` and this context file with actual implementation/test results.

## 22. MVP Scope

### MUST HAVE
- Farmer profile
- 30–50 scheme dataset
- SQLite
- Flask backend
- React + Tailwind
- TF-IDF
- Cosine similarity
- Ranked recommendations
- Relevance score
- Scheme details
- Official application links
- Basic explainability

### SHOULD HAVE
- Matched/missing keywords
- Mobile-responsive interface
- Search/filter
- Bookmarking if time permits

### ONLY IF TIME REMAINS
- Scheme comparison
- Advanced filtering
- Admin scheme management
- Improved multilingual UI

### FUTURE SCOPE
- Voice assistant
- WhatsApp integration
- OCR document verification
- Government API integration
- Push notifications
- Mobile app
- Satellite/weather recommendations
- AI form filling
- Real-time scheme updates

Do not prioritize future-scope features before the core ML pipeline works.

## 23. Avoid Overbuilding

Do not turn the project into:
- A generic chatbot
- A government portal replacement
- A full application submission system
- A large eligibility-rule engine
- A complex authentication platform
- A production-scale analytics system

Judges must clearly see the required ML recommendation pipeline.

## 24. Deployment

Target:
- Frontend → Vercel
- Backend → Render
- Database → SQLite

Keep deployment simple and reliable.

## 25. Testing

Use at least three substantially different farmer profiles.

Verify:
- Valid profile produces recommendations
- Different profiles produce different rankings
- Relevant schemes rank higher
- Missing/empty fields are handled
- Zero-similarity schemes are handled
- Invalid input does not crash the backend
- Scheme details and links work
- Ranking is deterministic/reproducible

Do not invent expected numerical scores before running the implementation.

## 26. Demo Flow

Recommended 2–3 minute demo:

1. Explain the farmer problem
2. Enter a sample farmer profile
3. Submit
4. Show TF-IDF + cosine similarity processing
5. Display ranked schemes
6. Show relevance score
7. Explain why the top scheme matches
8. Open scheme details
9. Show official application link
10. Briefly explain architecture

The demo must visibly prove that ranking is generated by the ML pipeline rather than hard-coded.

## 27. Team Responsibilities

### Frontend
React, Tailwind, profile form, dashboard, scheme cards/details, API integration.

### Backend
Flask, REST APIs, validation, SQLite, error handling.

### ML
Profile preprocessing, TF-IDF, cosine similarity, ranking, relevance score, explainability support.

### Research/Data
30–50 schemes, official sources, eligibility information, application links, verification.

### Presentation
PPT, architecture, ML explanation, demo flow, judge Q&A.

## 28. Documentation Rule

After every major task, update Markdown documentation so another AI/team member can continue without losing context.

Recommended files:

```text
PROJECT_CONTEXT.md
ARCHITECTURE.md
DATABASE_SCHEMA.md
ML_RECOMMENDER.md
API_DOCUMENTATION.md
DATASET_STRUCTURE.md
DESIGN_SYSTEM.md
FRONTEND.md
BACKEND.md
TESTING.md
DEVELOPMENT_LOG.md
```

Record:
- Completed work
- Important technical decisions
- Known issues
- Next steps

## 29. Source-of-Truth Priority

When documents conflict:

1. Official hackathon problem statement
2. Verified government scheme information
3. `PROJECT_CONTEXT.md`
4. Approved technical architecture
5. Existing HTML prototype
6. AI suggestions

The prototype must not override hackathon requirements.

## 30. Final Project Definition

**KrishiMitra AI is a farmer-focused government scheme recommendation web application that converts a farmer's profile into a searchable text query, compares it with agricultural scheme descriptions using TF-IDF and cosine similarity, ranks schemes by relevance, and presents understandable match information with official application links.**

The project is intentionally focused on solving the hackathon's core problem well rather than replacing government portals or becoming an unnecessarily large AI platform.

## 31. Development Status

### Completed
- Problem statement and product concept finalized.
- Initial HTML prototype created and audited.
- Step 2 architecture, ML, database, API, dataset, and design documentation completed.
- Step 3 project foundation completed.
- SQLite schema and development seed completed.
- Python TF-IDF + cosine recommender completed and tested.
- Land-size categorization correction completed and tested.
- Documentation inconsistencies caused by that correction have been cleaned up.

### Current Phase
**Phase 4 — Flask REST API integration — COMPLETE**

All three core endpoints are implemented, validated, and tested. The existing Phase 3 ML pipeline was not modified.

### Immediate Next Steps
1. Expand dataset from 11 dev-seed schemes to 30–50 verified schemes with Maharashtra coverage.
2. Phase 5: implement the 4-check informational rule layer (state/crop/category/land threshold).
3. React + Tailwind frontend wired to the live API.
4. Deploy: Vercel (frontend) + Render (backend), verify idempotent seed survives redeploy.

Do not reopen locked architecture decisions unless a concrete implementation blocker is found and documented.
