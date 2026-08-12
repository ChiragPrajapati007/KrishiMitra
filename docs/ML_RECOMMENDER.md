# KrishiMitra AI — ML_RECOMMENDER.md
**Step 2 — Final ML Methodology (locked)**

This is the single most important document in the spec — everything else exists to support this pipeline.

---

## 1. Farmer Profile → Text

**CORRECTED (post Phase 3):** category is no longer derived from land size for TF-IDF purposes, and is no longer part of the query text at all. This reverses what this document originally specified — see the note at the end of this section for why, and `DEVELOPMENT_LOG.md` for the full change record.

**Fields used in the TF-IDF query:** crop, state, and — if selected — interest keywords.

**Fields collected but NOT put into the TF-IDF text:**
- **Land size (raw number or any derived form of it).** Numbers don't carry TF-IDF meaning: `"1.8"` as a token won't generalize and can't express a threshold like "≤5 acres" through textual similarity — cosine similarity has no concept of numeric comparison. Land size is **not** converted into a category label for query purposes either. It stays a purely numeric, collected, MUST-HAVE profile field, used only by the deterministic rule layer (§5) against **verified, scheme-specific** `min_land_acres`/`max_land_acres` thresholds — never a universal Marginal/Small/Medium/Large bucketing applied uniformly across schemes.
- **Category**, for the same reason as land size, once the universal-threshold derivation that used to produce it is removed — see below.
- **District.** Central and Maharashtra state scheme descriptions essentially never mention specific districts — including District in the query text would almost always contribute zero signal (out-of-vocabulary against the fitted corpus) for no benefit. District stays a collected, displayed, MUST-HAVE profile field (the hackathon statement requires it as input) but does not participate in the ML query. Unlike the prototype's dead `district`/`disability` fields, this is a deliberate, documented exclusion, not an oversight.

**Query text template:**
```
{crop} farmer {state} state farming
[optional, if interests selected] {interest_keyword_1} {interest_keyword_2} ...
```

Example (Maharashtra / Cotton / no interests selected):
```
Cotton farmer Maharashtra state farming
```

Example (same profile, "Irrigation support" + "Credit / loan" selected):
```
Cotton farmer Maharashtra state farming
irrigation water drip sprinkler micro irrigation credit loan finance capital interest subvention
```

Tokenization (lowercase, strip punctuation, drop stopwords, drop length-1 tokens) removes stray words like "farmer," "state," "farming" if they're in the stopword list — their presence in the template doesn't hurt, it just improves readability of the raw string before tokenization.

**Why interests are still worth including (SHOULD HAVE, not required):** with only crop+state, the query is now only 2–3 meaningful tokens against scheme documents that run 40–100 words — thinner than before this correction, since category is no longer contributing tokens either. Interest keywords give the query enough real text to differentiate between, say, two schemes that both mention Maharashtra and Cotton but serve different needs (insurance vs. mechanization). If cut for time, the pipeline still works correctly — it will just be less differentiated, which is an acceptable, known limitation, not a bug. This makes interests more important to keep, not less, now that category no longer contributes to the query.

**Why category was removed from the query (correction record):** the original design in this section auto-computed a farmer category label from land size via universal acreage thresholds (Marginal ≤2.5 / Small ≤5 / Medium ≤25 / Large >25) and folded that label into the TF-IDF query text. This was corrected per an explicit instruction: category must not be derived via universal thresholds anywhere in the ML query path. Land size now does exactly one job in this system — numeric comparison against a specific scheme's own declared thresholds in the rule layer (§5) — and nothing else. The rule layer's own "Category" check (§5) previously assumed a farmer-side category value would exist to compare against a scheme's target categories; with that value gone, **how the rule layer's category check should work is now an open question for Phase 5**, not resolved by this correction (this document is not being redesigned beyond the specific change requested — see `DEVELOPMENT_LOG.md`).

---

## 2. Scheme Representation

**Fields combined into each scheme's TF-IDF document:**
`scheme_name + description + benefits + eligibility_keywords`

**Fields deliberately excluded from the TF-IDF document:** `required_documents`, `application_link`, `source`, `last_verified`. These carry no topical/relevance signal — including them would only add noise or, worse, spurious matches (e.g., two unrelated schemes sharing "Aadhaar Card" as a required document would falsely inflate their similarity).

**Why `eligibility_keywords` is treated as a first-class TF-IDF field, not just a display field:** TF-IDF only compares text — it has no built-in knowledge that "Maharashtra" is a state or "Cotton" is a crop. For a farmer's state/crop/category tokens to actually match anything, the scheme's own document needs those same tokens present in it. `eligibility_keywords` is exactly the place to put a natural-language phrase like *"Available to farmers in Maharashtra, Punjab and Haryana growing Cotton, Wheat and Sugarcane, targeting Small and Marginal farmers"* — this is what makes state/crop/category matching actually work through the ML pipeline rather than requiring a separate hard-coded lookup. This directly matches why v3 already includes `eligibility_keywords` in its schema (§8, §14) — this spec is making explicit *why* that field exists and *how* it's used, not introducing something new.

Do not pad descriptions with unnecessary repeated keywords purely to game the score (v3 §8 explicitly warns against this) — `eligibility_keywords` should read as a genuine, factual sentence about who the scheme serves, not a keyword-stuffing block.

---

## 3. Corpus Decision — Approach A, Final

**Approach A (fit on scheme corpus, transform profile as query) is the final decision.** Approach B (refit jointly per request, which is what the JS prototype does) is rejected.

Reasoning:
- **Stability/reproducibility:** under Approach A, a given profile always produces the same score against a given scheme, independent of any other request. v3 §22 explicitly requires ranking to be deterministic/reproducible — Approach B, which recomputes IDF including whatever profile happens to be in the current request, doesn't guarantee this as cleanly, since IDF statistics shift with the live document even though the scheme corpus hasn't changed.
- **Matches standard sklearn usage:** `TfidfVectorizer.fit()` once, `.transform()` many times, is the idiomatic retrieval pattern (query vs. document corpus) and is straightforward to explain to judges in one sentence.
- **Operationally simpler:** fit cost is paid once at startup, not on every request.

**Exact mechanics:**
- **What's fitted:** the vectorizer is fit on the full set of scheme documents (§2), loaded from SQLite.
- **When:** once, at Flask app startup (or lazily on first import of the `ml` module, cached thereafter). Not refit per request. A refit is only needed if the scheme dataset changes — relevant solely if Admin CRUD (ONLY IF TIME REMAINS) is built; not required for MVP.
- **How the profile is transformed:** `vectorizer.transform([profile_text])` using the vocabulary and IDF weights learned from the scheme corpus. Any profile token not seen in the scheme corpus is simply ignored (zero weight) — this is expected sklearn behavior, not an error condition, and should be treated as such in code (no special-casing needed).
- **Cosine similarity:** `cosine_similarity(profile_vector, scheme_matrix)` → one score per scheme, in `[0, 1]` (TF-IDF vectors are non-negative, so cosine similarity here can't go negative).
- **Ranking:** sort all schemes by descending score. Tie-break alphabetically by `scheme_name` for determinism (satisfies v3 §22's reproducibility requirement explicitly).
- **Display:** `relevance_percent = round(score * 100)`, always labeled "Relevance Score" or "Match Score" in the UI — never "Eligibility."

---

## 4. Exact ML Formula

```
scheme_matrix = TfidfVectorizer().fit_transform(scheme_documents)     # fit ONCE
profile_vector = vectorizer.transform([profile_text])                  # per request

cosine(A, B) = (A · B) / (||A|| ||B||)

scores = cosine_similarity(profile_vector, scheme_matrix)              # per request
ranked = sort(schemes, key=score, descending=True, tiebreak=scheme_name)
```

**What a score means:** the proportion of weighted, distinctive vocabulary the farmer's query text shares with a given scheme's document, normalized for document length and term rarity across the corpus. It is a **textual similarity measure**, not a probability of anything. A score of 0 means no shared distinctive vocabulary — it is a valid, expected, and worth-showing result, not a failure state.

**What it explicitly is not:** an eligibility probability, an approval likelihood, or a legal determination of any kind.

---

## 5. Eligibility vs. Relevance — Final Design

**ML determines:** textual relevance only (§4).

**ML does NOT determine:** official government eligibility, guaranteed approval, or subsidy probability.

**The supporting rule/keyword layer — deliberately small:**

| Field used | Check | Mandatory? |
|---|---|---|
| State | Is farmer's state in scheme's applicable states (or scheme is "All")? | Informational only |
| Crop | Is farmer's crop in scheme's applicable crops (or scheme is "All")? | Informational only |
| Category | Is farmer's category in scheme's target categories (or scheme is "All")? | Informational only |
| Land size (exact number) | Within scheme's min/max acre thresholds, if any | Informational only |

That's the entire rule layer — four checks, all reusing fields already collected for the MUST-HAVE profile. No gender/age/income/disability rules exist, because those fields are no longer collected (see `ARCHITECTURE.md` §9) — this is a direct, deliberate narrowing from the prototype's eligibility engine, not an oversight.

**What happens when a condition fails:** the scheme is **never removed and never re-bucketed**. It stays in its rank position exactly where its relevance score puts it. The failed condition is surfaced as a flag in the explainability panel (§6) — informational, not gating. This is the direct fix for the Step 1 finding: the prototype's Eligible/Almost/Not-eligible buckets are gone entirely, replaced by flags that ride alongside the relevance-ranked list without altering it.

**How it interacts with ML:** not at all, computationally — the rule layer runs independently and its output is merged into the API response for display purposes only. It never feeds back into the cosine similarity score or the ranking order.

---

## 6. Explainability — Final Design

Two clearly separated things, never conflated in the UI copy:

**ML relevance** (the score): TF-IDF + cosine similarity, as above. Labeled "Relevance Score" / "Match Score."

**Explainability** (the "why"): output of the rule layer (§5), rendered as:
```
Why this scheme may be relevant

Matched:
✓ Maharashtra
✓ Cotton
✓ Small Farmer

Not indicated / not applicable:
— Land size threshold not specified for this scheme
```
Copy explicitly avoids "eligible"/"eligibility" anywhere in this panel. Suggested heading: "Why this may be relevant" (not "Why you're eligible" or "Eligibility check" — both banned per v3 §9).

---

## 7. Scoring & Ranking — Operational Details

- **Return all schemes, ranked** — not just top 5/10. Dataset is small (30–50); showing the full ranked list (with low/zero scores visible at the bottom) is itself a useful demo moment, proving the ranking is real computation and not a curated top list. Frontend may choose to visually paginate or truncate display, but the API returns everything.
- **No minimum similarity threshold** that removes schemes from the response — hiding low scorers would undercut the transparency goal and make it harder to demonstrate that the pipeline correctly gives near-zero scores to genuinely irrelevant schemes.
- **Ties:** alphabetical by `scheme_name`, deterministic.
- **Zero-similarity schemes:** returned normally, at 0%, at the bottom of the list. This is expected, correct behavior for a scheme that shares no distinctive vocabulary with the query — not an error to special-case away.

---

## 8. Testing Strategy

Three profiles spanning different states/crops/land/categories, to be run once the pipeline exists — **no expected numerical scores are specified here**, per v3 §22's explicit instruction not to fabricate them in advance:

| Profile | State | Crop | Land size (numeric, not in query) | Interests |
|---|---|---|---|---|
| A | Maharashtra | Cotton | 1.8 acres | Irrigation support, Credit/loan |
| B | Punjab | Wheat | 1.2 acres | Insurance |
| C | Gujarat | Vegetables | 40 acres | (none selected) |

**What to verify once real scores exist:**
- All three profiles produce non-identical rankings (proves the ML is actually responsive to input, not a static list).
- Schemes whose `eligibility_keywords` mention the profile's exact crop/state/category rank visibly higher than ones that don't.
- Profile C (Large category, no interests) is a deliberate stress case — several schemes explicitly target Small/Marginal farmers only; this should surface as a low relevance score plus a "Not indicated" flag in explainability (§6, §5), not an error or a hidden result.
- Empty/missing optional fields (no interests selected) don't crash the pipeline — query text degrades gracefully to just crop+category+state.
- Invalid input (e.g., negative land size, empty crop) is rejected at the API validation layer (`API_DOCUMENTATION.md`) before it ever reaches the ML module — the ML module should never need to defend against malformed input.
- Re-running the same profile twice produces identical scores and ranking (determinism check, directly required by v3 §22).

---

## 9. Implementation Note (Phase 3 — actual results, added after first real run)

The pipeline described above has been implemented and run against a real (dev-seed) scheme corpus and the 3 profiles in §8. Full results are in `docs/DEVELOPMENT_LOG.md`. One finding worth folding back into this spec rather than leaving buried in the log:

**IDF collapses toward the same floor for any term that appears in most/all scheme documents, regardless of how important that term feels conceptually.** In the dev run, "Maharashtra" appeared in the `eligibility_keywords` of every single scheme (a seed-data mistake, not a code issue — see the log) and its IDF dropped to the theoretical minimum, making state-name matching almost non-discriminative. This is expected TF-IDF behavior, not a defect in the corpus-decision or formula sections above — but it's a concrete reminder for whoever writes the real 30-50 `eligibility_keywords` values: **name a state only when the scheme is actually restricted to it.** For genuinely nationwide schemes, say so in general terms rather than listing an example state — otherwise every state name in the corpus dilutes toward uselessness the same way "Maharashtra" did here, which quietly defeats the exact mechanism §2 above depends on for state/crop/category matching to work at all.

### 9.1 Correction rerun (category removed from query — see §1)

After removing category derivation from the query (§1), the pipeline was rerun against the same 11-scheme dev corpus and the same 3 profiles, with `land_size` no longer feeding the query at all. Full output in `DEVELOPMENT_LOG.md`. Headline: **the same diagnostic still fails, with the same root cause, at essentially the same magnitude** (Namo Shetkari: 0.0648 for the Maharashtra profile vs. 0.0974 for the Punjab profile — compare to 0.0684 vs. 0.0996 before the correction). That's expected, not a new problem: removing "category" tokens from the query doesn't touch the actual cause (every scheme document containing the literal word "Maharashtra"), so the failure persisting confirms the earlier diagnosis was right rather than revealing a new one. All 5 previously-passing checks still pass. No new failures were introduced by this correction.
