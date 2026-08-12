"""
Converts a scheme record into the text document that gets fed into TF-IDF.

Per docs/ML_RECOMMENDER.md §2, only scheme_name + description + benefits +
eligibility_keywords participate — required_documents, application_link,
source and last_verified are deliberately excluded (they carry no topical
signal and would only add noise or spurious matches).
"""


def build_scheme_document(scheme: dict) -> str:
    """scheme is expected to have at least: scheme_name, description, benefits,
    eligibility_keywords (all required, non-null per the DB schema)."""
    fields = [
        scheme["scheme_name"],
        scheme["description"],
        scheme["benefits"],
        scheme["eligibility_keywords"],
    ]
    return " ".join(f for f in fields if f)
