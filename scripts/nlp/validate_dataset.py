import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

INTENTS = {
    "General Complaint",
    "Request Status Update",
    "Request Refund",
    "Request Cancellation",
    "Appeal Claim Decision",
    "Report Billing Error",
    "Report Policy Change Issue",
    "Report Document Processing Delay",
    "Share Positive Feedback",
}

ISSUE_TYPES = {
    "Claim Denial",
    "Billing Dispute",
    "Policy Cancellation",
    "Policy Update Issue",
    "Payment Issue",
    "Document Processing Delay",
    "Technical Issue",
    "Fraud Report",
    "Delivery Issue",
    "Uncategorized",
    "Positive Feedback",
}

PRIORITIES = {"Low", "Medium", "High"}
SENTIMENTS = {"Negative", "Neutral", "Positive"}
REFERENCE_PROFILES = {"none", "claim_only", "policy_only", "both"}
TONE_STYLES = {"formal", "neutral", "informal", "terse"}
COMPLETENESS_STYLES = {"complete", "partial", "fragment"}
HARD_CASE_TYPES = {
    "none",
    "issue_ambiguity_billing_payment",
    "intent_ambiguity_status_general",
    "neutral_urgency_tension",
    "sentiment_priority_conflict",
}

TARGET_REFERENCE = {"none": 0.55, "claim_only": 0.20, "policy_only": 0.15, "both": 0.10}
TARGET_TONE = {"formal": 0.35, "neutral": 0.30, "informal": 0.25, "terse": 0.10}
TARGET_COMPLETENESS = {"complete": 0.65, "partial": 0.25, "fragment": 0.10}
TARGET_SENTIMENT = {"Negative": 0.45, "Neutral": 0.35, "Positive": 0.20}
TARGET_PRIORITY = {"Low": 0.30, "Medium": 0.40, "High": 0.30}
MIN_HARD_CASE_RATIO = 0.20
MIN_CONTRADICTION_RATIO = 0.08

CATEGORY_BY_ISSUE = {
    "Claim Denial": "Claim Denial",
    "Billing Dispute": "Billing Issues",
    "Policy Cancellation": "Policy Cancellation",
    "Policy Update Issue": "Policy Update",
    "Payment Issue": "Billing",
    "Document Processing Delay": "Document Processing",
    "Technical Issue": "Technical Support",
    "Fraud Report": "Fraud",
    "Delivery Issue": "Delivery Issues",
    "Uncategorized": "Uncategorized",
    "Positive Feedback": "Positive Feedback",
}

CLAIM_TOKEN_RE = re.compile(
    r"(\bCLM-[A-Za-z0-9*]+\b|\bcl(?:ai|ia)m\s*(#|no\.?|ref:?|id)\s*(?:CLM-)?\d[\d*]*\b)",
    re.IGNORECASE,
)
POLICY_TOKEN_RE = re.compile(
    r"(\bPOL-[A-Za-z0-9*]+\b|\bpol(?:icy|cy)?\s*(#|no\.?|ref:?|id)\s*(?:POL-)?\d[\d*]*\b)",
    re.IGNORECASE,
)


def _load_jsonl(path: Path) -> list[dict]:
    rows = []
    with path.open("r", encoding="utf-8") as fh:
        for line_no, line in enumerate(fh, start=1):
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    return rows


def _check_distribution(
    name: str,
    counts: Counter,
    total: int,
    targets: dict[str, float],
    tolerance: float,
    errors: list[str],
) -> None:
    for key, target in targets.items():
        actual = counts.get(key, 0) / total if total else 0.0
        if abs(actual - target) > tolerance:
            errors.append(
                f"Distribution {name}.{key} out of tolerance: actual={actual:.3f} target={target:.3f} tol={tolerance:.3f}"
            )


def validate(rows: list[dict]) -> dict:
    errors: list[str] = []
    seen_ids: set[str] = set()
    seen_text_hashes: set[str] = set()

    counts_intent = Counter()
    counts_issue = Counter()
    counts_sentiment = Counter()
    counts_priority = Counter()
    counts_reference = Counter()
    counts_tone = Counter()
    counts_completeness = Counter()
    counts_hard_case = Counter()
    counts_hard_case_type = Counter()
    counts_contradiction = Counter()

    for idx, row in enumerate(rows, start=1):
        sample_id = row.get("sample_id")
        title = row.get("title")
        description = row.get("description")
        text = row.get("text")
        labels = row.get("labels")
        metadata = row.get("metadata")

        if not isinstance(sample_id, str) or not sample_id.strip():
            errors.append(f"Row {idx}: invalid sample_id")
            continue
        if sample_id in seen_ids:
            errors.append(f"Row {idx}: duplicate sample_id {sample_id}")
        seen_ids.add(sample_id)

        if not isinstance(title, str) or not title.strip():
            errors.append(f"Row {idx}: invalid title")
        if not isinstance(description, str) or not description.strip():
            errors.append(f"Row {idx}: invalid description")
        if not isinstance(text, str) or not text.strip():
            errors.append(f"Row {idx}: invalid text")
        else:
            digest = hashlib.sha256(text.strip().lower().encode("utf-8")).hexdigest()
            if digest in seen_text_hashes:
                errors.append(f"Row {idx}: duplicate normalized text")
            seen_text_hashes.add(digest)

        if not isinstance(labels, dict):
            errors.append(f"Row {idx}: labels must be object")
            continue

        sentiment = labels.get("sentiment")
        intent = labels.get("detectedIntent")
        issue = labels.get("issueType")
        priority = labels.get("priority")
        category = labels.get("categoryName")

        if sentiment not in SENTIMENTS:
            errors.append(f"Row {idx}: invalid sentiment {sentiment}")
        if intent not in INTENTS:
            errors.append(f"Row {idx}: invalid detectedIntent {intent}")
        if issue not in ISSUE_TYPES:
            errors.append(f"Row {idx}: invalid issueType {issue}")
        if priority not in PRIORITIES:
            errors.append(f"Row {idx}: invalid priority {priority}")

        expected_category = CATEGORY_BY_ISSUE.get(issue)
        if category != expected_category:
            errors.append(
                f"Row {idx}: categoryName mismatch for issueType {issue} (got {category}, expected {expected_category})"
            )

        if not isinstance(metadata, dict):
            errors.append(f"Row {idx}: metadata must be object")
            continue

        ref_profile = metadata.get("reference_profile")
        tone_style = metadata.get("tone_style")
        completeness = metadata.get("completeness")
        hard_case = metadata.get("hard_case")
        hard_case_type = metadata.get("hard_case_type")
        contradiction_case = metadata.get("contradiction_case")

        if ref_profile not in REFERENCE_PROFILES:
            errors.append(f"Row {idx}: invalid reference_profile {ref_profile}")
        if tone_style not in TONE_STYLES:
            errors.append(f"Row {idx}: invalid tone_style {tone_style}")
        if completeness not in COMPLETENESS_STYLES:
            errors.append(f"Row {idx}: invalid completeness {completeness}")
        if not isinstance(hard_case, bool):
            errors.append(f"Row {idx}: hard_case must be boolean")
        if hard_case_type not in HARD_CASE_TYPES:
            errors.append(f"Row {idx}: invalid hard_case_type {hard_case_type}")
        if not isinstance(contradiction_case, bool):
            errors.append(f"Row {idx}: contradiction_case must be boolean")

        if isinstance(hard_case, bool):
            if hard_case and hard_case_type == "none":
                errors.append(f"Row {idx}: hard_case true but hard_case_type is none")
            if not hard_case and hard_case_type != "none":
                errors.append(f"Row {idx}: hard_case false but hard_case_type is not none")

        has_claim = bool(CLAIM_TOKEN_RE.search(text)) if isinstance(text, str) else False
        has_policy = bool(POLICY_TOKEN_RE.search(text)) if isinstance(text, str) else False

        if ref_profile == "none" and (has_claim or has_policy):
            errors.append(f"Row {idx}: reference_profile=none but found ID token")
        if ref_profile == "claim_only" and (not has_claim or has_policy):
            errors.append(f"Row {idx}: reference_profile=claim_only token mismatch")
        if ref_profile == "policy_only" and (has_claim or not has_policy):
            errors.append(f"Row {idx}: reference_profile=policy_only token mismatch")
        if ref_profile == "both" and (not has_claim or not has_policy):
            errors.append(f"Row {idx}: reference_profile=both token mismatch")

        counts_intent[intent] += 1
        counts_issue[issue] += 1
        counts_sentiment[sentiment] += 1
        counts_priority[priority] += 1
        counts_reference[ref_profile] += 1
        counts_tone[tone_style] += 1
        counts_completeness[completeness] += 1
        counts_hard_case[str(hard_case).lower()] += 1
        counts_hard_case_type[hard_case_type] += 1
        counts_contradiction[str(contradiction_case).lower()] += 1

    for label in INTENTS:
        if counts_intent[label] < 150:
            errors.append(f"Coverage: intent '{label}' has {counts_intent[label]} rows (<150)")
    for label in ISSUE_TYPES:
        if counts_issue[label] < 150:
            errors.append(f"Coverage: issueType '{label}' has {counts_issue[label]} rows (<150)")

    total = len(rows)
    _check_distribution("reference_profile", counts_reference, total, TARGET_REFERENCE, 0.03, errors)
    _check_distribution("tone_style", counts_tone, total, TARGET_TONE, 0.04, errors)
    _check_distribution("completeness", counts_completeness, total, TARGET_COMPLETENESS, 0.04, errors)
    _check_distribution("sentiment", counts_sentiment, total, TARGET_SENTIMENT, 0.03, errors)
    _check_distribution("priority", counts_priority, total, TARGET_PRIORITY, 0.03, errors)

    hard_ratio = counts_hard_case.get("true", 0) / total if total else 0.0
    contradiction_ratio = counts_contradiction.get("true", 0) / total if total else 0.0

    if hard_ratio < MIN_HARD_CASE_RATIO:
        errors.append(
            f"hard_case ratio below target: actual={hard_ratio:.3f} target>={MIN_HARD_CASE_RATIO:.3f}"
        )
    if contradiction_ratio < MIN_CONTRADICTION_RATIO:
        errors.append(
            f"contradiction_case ratio below target: actual={contradiction_ratio:.3f} target>={MIN_CONTRADICTION_RATIO:.3f}"
        )

    summary = {
        "total": total,
        "intent": dict(counts_intent),
        "issueType": dict(counts_issue),
        "sentiment": dict(counts_sentiment),
        "priority": dict(counts_priority),
        "reference_profile": dict(counts_reference),
        "tone_style": dict(counts_tone),
        "completeness": dict(counts_completeness),
        "hard_case": dict(counts_hard_case),
        "hard_case_type": dict(counts_hard_case_type),
        "contradiction_case": dict(counts_contradiction),
        "errors": errors,
    }
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate synthetic NLP JSONL dataset")
    parser.add_argument("--input", default="data/nlp/synthetic_v1.jsonl")
    args = parser.parse_args()

    rows = _load_jsonl(Path(args.input))
    summary = validate(rows)

    if summary["errors"]:
        print("Validation failed:")
        for err in summary["errors"][:120]:
            print(f"- {err}")
        print(f"Total errors: {len(summary['errors'])}")
        raise SystemExit(1)

    print("Validation passed")
    print(json.dumps({k: v for k, v in summary.items() if k != "errors"}, indent=2))


if __name__ == "__main__":
    main()
