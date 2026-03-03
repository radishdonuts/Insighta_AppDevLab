import argparse
import json
import random
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

INTENTS = [
    "General Complaint",
    "Request Status Update",
    "Request Refund",
    "Request Cancellation",
    "Appeal Claim Decision",
    "Report Billing Error",
    "Report Policy Change Issue",
    "Report Document Processing Delay",
    "Share Positive Feedback",
]

ISSUE_TYPES = [
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
]

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

INTENT_PREFERENCES = {
    "Claim Denial": ["Appeal Claim Decision", "Request Status Update", "General Complaint"],
    "Billing Dispute": ["Report Billing Error", "Request Refund", "General Complaint"],
    "Policy Cancellation": ["Request Cancellation", "Request Status Update", "General Complaint"],
    "Policy Update Issue": ["Report Policy Change Issue", "Request Status Update", "General Complaint"],
    "Payment Issue": ["Report Billing Error", "Request Refund", "General Complaint"],
    "Document Processing Delay": ["Report Document Processing Delay", "Request Status Update", "General Complaint"],
    "Technical Issue": ["General Complaint", "Request Status Update"],
    "Fraud Report": ["General Complaint", "Request Status Update"],
    "Delivery Issue": ["Request Status Update", "General Complaint"],
    "Uncategorized": ["General Complaint", "Request Status Update"],
    "Positive Feedback": ["Share Positive Feedback", "General Complaint"],
}

ISSUE_TEMPLATE = {
    "Claim Denial": {
        "title": [
            "Claim denied without clear reason",
            "Need review of denied claim",
            "Denied claim despite full documents",
            "Appeal needed for rejected claim",
            "Claim decision seems unfair",
        ],
        "details": [
            "I submitted receipts and the police report but got a denial notice.",
            "Your adjuster closed my claim and marked it ineligible with no clear explanation.",
            "The claim portal shows rejected even after uploading all requested files.",
            "I only got a generic denial email and still do not know the exact basis.",
            "The rejection reason does not match the policy clause I was told before.",
        ],
    },
    "Billing Dispute": {
        "title": [
            "Wrong charges on my policy",
            "Billing amount looks incorrect",
            "Unexpected insurance charge",
            "Duplicate charge on invoice",
            "Need correction for premium billing",
        ],
        "details": [
            "I was billed extra fees that were never discussed in my renewal call.",
            "The invoice includes a duplicate line item for processing.",
            "This month I was overcharged compared to the quoted premium.",
            "The billing summary does not match what your staff confirmed by phone.",
            "I need a correction because the latest amount is significantly higher than expected.",
        ],
    },
    "Policy Cancellation": {
        "title": [
            "Cancel policy request not processed",
            "Need immediate policy cancellation",
            "Policy still active after cancellation request",
            "Cancellation pending too long",
            "Please terminate my policy",
        ],
        "details": [
            "I already asked to cancel, but auto-debit still happened this month.",
            "Customer support confirmed cancellation but my account remains active.",
            "Please end this policy and confirm final billing adjustments.",
            "I filed cancellation last week and the status has not changed yet.",
            "Please confirm if additional verification is needed to complete cancellation.",
        ],
    },
    "Policy Update Issue": {
        "title": [
            "Cannot update policy details",
            "Beneficiary update failed",
            "Coverage change request stuck",
            "Policy amendment not reflected",
            "Update request keeps failing",
        ],
        "details": [
            "The app errors out when I try to edit beneficiary information.",
            "My request to change coverage has been pending for over a week.",
            "Support asked me to resubmit forms repeatedly and nothing changes.",
            "I submitted policy changes but the account page still shows old details.",
            "Your portal confirms update submission but nothing is actually applied.",
        ],
    },
    "Payment Issue": {
        "title": [
            "Auto-debit payment failed",
            "Premium payment issue",
            "Payment posted incorrectly",
            "Payment status not updated",
            "Failed premium posting",
        ],
        "details": [
            "My bank shows successful transfer but your portal marks it unpaid.",
            "I got a failed payment notice even though my account has enough balance.",
            "Please verify why the premium was not reflected in my policy status.",
            "Payment was deducted but no receipt is visible in my account.",
            "The payment page timed out and now I am unsure if the transaction went through.",
        ],
    },
    "Document Processing Delay": {
        "title": [
            "Document verification taking too long",
            "Claim paperwork still pending",
            "Processing delay for submitted docs",
            "No update on verification",
            "Documents not reviewed yet",
        ],
        "details": [
            "I uploaded every required document and verification is still pending.",
            "The status has not changed for days and no one provided an update.",
            "Please confirm receipt of forms and expected completion date.",
            "I followed all upload steps but document review remains stalled.",
            "There has been no progress message despite complete paperwork submission.",
        ],
    },
    "Technical Issue": {
        "title": [
            "Portal login keeps failing",
            "Website error during submission",
            "App crashes on ticket form",
            "System bug blocks complaint",
            "Technical problem on dashboard",
        ],
        "details": [
            "I receive a server error whenever I try to submit the complaint form.",
            "The mobile app logs me out repeatedly while uploading attachments.",
            "Your website freezes on the payment page and does not save progress.",
            "The dashboard returns a blank page after I sign in.",
            "The complaint form keeps resetting before I can finish submission.",
        ],
    },
    "Fraud Report": {
        "title": [
            "Possible fraud activity detected",
            "Unauthorized policy changes",
            "Need to report scam contact",
            "Suspicious claim under my name",
            "Potential identity misuse",
        ],
        "details": [
            "I received suspicious calls asking for OTP and policy credentials.",
            "Someone changed account details without my authorization.",
            "There is a claim filed under my name that I never initiated.",
            "I noticed activity in my account that I did not approve.",
            "A third party contacted me pretending to be from your fraud team.",
        ],
    },
    "Delivery Issue": {
        "title": [
            "Policy documents not delivered",
            "Courier tracking not moving",
            "Late delivery of insurance papers",
            "No delivery update received",
            "Shipment delay for policy packet",
        ],
        "details": [
            "Tracking has been stuck for several days with no courier update.",
            "My policy booklet was promised last week but nothing arrived.",
            "Please check shipment status and provide a firm delivery date.",
            "Delivery window passed but there is no final dispatch confirmation.",
            "The courier says pending while your portal says shipped.",
        ],
    },
    "Uncategorized": {
        "title": [
            "Need help with unresolved insurance concern",
            "Support request not handled",
            "General complaint about service quality",
            "No clear resolution from support",
            "Escalation request for unresolved issue",
        ],
        "details": [
            "I have contacted support many times and the issue is still unresolved.",
            "Responses are inconsistent and I do not know what step to take next.",
            "Please assign someone to review this complaint end to end.",
            "I keep receiving generic replies that do not address my concern.",
            "I need a clear resolution path because the issue remains open.",
        ],
    },
    "Positive Feedback": {
        "title": [
            "Great support experience",
            "Positive feedback for your team",
            "Appreciation for quick assistance",
            "Thank you for resolving my issue",
            "Compliment for staff handling",
        ],
        "details": [
            "Your support team handled my concern professionally and quickly.",
            "I want to share appreciation because the process was smooth and clear.",
            "The update and resolution were communicated well, thank you.",
            "Staff was helpful and responsive throughout my request.",
            "This was resolved faster than expected and I am satisfied with the experience.",
        ],
    },
}

REFERENCE_PROFILE_WEIGHTS = {"none": 55, "claim_only": 20, "policy_only": 15, "both": 10}
TONE_WEIGHTS = {"formal": 35, "neutral": 30, "informal": 25, "terse": 10}
COMPLETENESS_WEIGHTS = {"complete": 65, "partial": 25, "fragment": 10}
ISSUE_WEIGHTS = {
    "Claim Denial": 9,
    "Billing Dispute": 9,
    "Policy Cancellation": 9,
    "Policy Update Issue": 9,
    "Payment Issue": 9,
    "Document Processing Delay": 9,
    "Technical Issue": 9,
    "Fraud Report": 9,
    "Delivery Issue": 9,
    "Uncategorized": 9,
    "Positive Feedback": 10,
}
NOISE_WEIGHTS = {
    "none": 50,
    "typos": 12,
    "short": 8,
    "long": 8,
    "angry_tone": 7,
    "missing_punctuation": 5,
    "sms_shorthand": 5,
    "mixed_case": 5,
}

# Hardening targets
SENTIMENT_WEIGHTS = {"Negative": 45, "Neutral": 35, "Positive": 20}
PRIORITY_WEIGHTS = {"Low": 30, "Medium": 40, "High": 30}
INTENT_WEIGHTS = {
    "General Complaint": 11,
    "Request Status Update": 11,
    "Request Refund": 11,
    "Request Cancellation": 11,
    "Appeal Claim Decision": 11,
    "Report Billing Error": 11,
    "Report Policy Change Issue": 11,
    "Report Document Processing Delay": 11,
    "Share Positive Feedback": 12,
}
HARD_CASE_WEIGHTS = {"true": 20, "false": 80}
CONTRADICTION_WEIGHTS = {"true": 8, "false": 92}

HARD_CASE_TYPES = [
    "issue_ambiguity_billing_payment",
    "intent_ambiguity_status_general",
    "neutral_urgency_tension",
    "sentiment_priority_conflict",
]

SENTIMENT_CUES = {
    "Negative": [
        "I am frustrated and this has become stressful.",
        "This experience has been disappointing so far.",
        "I am not satisfied with how this was handled.",
    ],
    "Neutral": [
        "I am sharing this for review and clarification.",
        "I need a clear update on the next steps.",
        "Please confirm the status and expected timeline.",
    ],
    "Positive": [
        "I appreciate your team's effort and just need this finalized.",
        "Support has been helpful so far, but this remains open.",
        "Thank you for assisting; please help close this properly.",
    ],
}

PRIORITY_CUES = {
    "High": [
        "This is urgent and impacts me immediately.",
        "Please prioritize this today due to immediate impact.",
        "I need urgent resolution within 24 hours.",
    ],
    "Medium": [
        "This can be resolved in the normal support timeline.",
        "Please handle this in standard priority queue.",
        "I need a regular follow-up schedule for this case.",
    ],
    "Low": [
        "This is not time-critical but should be corrected.",
        "No immediate urgency, but please log and resolve it.",
        "You may process this in low priority.",
    ],
}

CLAIM_PATTERNS = [
    "CLM-{id}",
    "claim #{id}",
    "claim no. {id}",
    "claim ref: {id}",
    "claim id {id}",
    "cliam #{id}",
    "claim ref {short}",
    "CLM-{prefix}***",
]

POLICY_PATTERNS = [
    "POL-{id}",
    "policy #{id}",
    "policy no {id}",
    "policy ref: {id}",
    "policy id {id}",
    "polcy no {id}",
    "policy ref {short}",
    "POL-{prefix}***",
]


def _choices_weighted(rng: random.Random, mapping: dict[str, int]) -> str:
    keys = list(mapping.keys())
    weights = list(mapping.values())
    return rng.choices(keys, weights=weights, k=1)[0]


def _build_weighted_order(total: int, weights: dict[str, int], rng: random.Random) -> list[str]:
    weight_sum = sum(weights.values())
    exact = {k: total * v / weight_sum for k, v in weights.items()}
    counts = {k: int(exact[k]) for k in weights}
    remainder = total - sum(counts.values())

    if remainder > 0:
        ranked = sorted(weights.keys(), key=lambda k: (exact[k] - counts[k]), reverse=True)
        for i in range(remainder):
            counts[ranked[i % len(ranked)]] += 1

    order: list[str] = []
    for key, count in counts.items():
        order.extend([key] * count)
    rng.shuffle(order)
    return order


def _build_weighted_counts(total: int, weights: dict[str, int]) -> Counter:
    weight_sum = sum(weights.values())
    exact = {k: total * v / weight_sum for k, v in weights.items()}
    counts = {k: int(exact[k]) for k in weights}
    remainder = total - sum(counts.values())

    if remainder > 0:
        ranked = sorted(weights.keys(), key=lambda k: (exact[k] - counts[k]), reverse=True)
        for i in range(remainder):
            counts[ranked[i % len(ranked)]] += 1

    return Counter(counts)


def _apply_noise(text: str, noise: str) -> str:
    if noise == "none":
        return text
    if noise == "typos":
        return text.replace("please", "pls").replace("because", "becuz").replace("policy", "polcy")
    if noise == "short":
        return text.split(".")[0].strip() + "."
    if noise == "long":
        return text + " I also need confirmation by email with reference details and next steps for escalation."
    if noise == "angry_tone":
        return "This is honestly unacceptable. " + text
    if noise == "missing_punctuation":
        return re.sub(r"[.,]", "", text)
    if noise == "sms_shorthand":
        return text.replace("you", "u").replace("Please", "Pls").replace("cannot", "cant")
    if noise == "mixed_case":
        words = text.split()
        return " ".join(w.upper() if i % 5 == 0 else w for i, w in enumerate(words))
    return text


def _apply_tone(text: str, tone: str) -> str:
    if tone == "formal":
        return "Dear Support, " + text
    if tone == "neutral":
        return text
    if tone == "informal":
        return "Hi team, " + text.replace("Please", "please").replace("I have", "i've")
    if tone == "terse":
        return "Need help. " + text
    return text


def _apply_completeness(text: str, completeness: str) -> str:
    if completeness == "complete":
        return text

    sentences = [s.strip() for s in text.split(".") if s.strip()]
    if not sentences:
        return text

    if completeness == "partial":
        keep = max(1, len(sentences) - 1)
        return ". ".join(sentences[:keep]) + "."

    words = sentences[0].split()
    return " ".join(words[: max(3, len(words) // 2)])


def _apply_hard_case(text: str, issue_type: str, intent: str, hard_case_type: str) -> str:
    if hard_case_type == "issue_ambiguity_billing_payment":
        return text + " Also invoice and payment posting details are conflicting in the account summary."
    if hard_case_type == "intent_ambiguity_status_general":
        return text + " I need an update but I am also raising this as a formal complaint."
    if hard_case_type == "neutral_urgency_tension":
        return text + " I am calm about this but need immediate action within 24 hours."
    if hard_case_type == "sentiment_priority_conflict":
        return text + " I appreciate previous help, but this now blocks a time-sensitive requirement."
    return text


def _apply_contradiction(text: str) -> str:
    return "Please treat this politely, but this is urgent and causing serious impact right now. " + text


def _build_issue_order(total: int) -> list[str]:
    counts = _build_weighted_counts(total, ISSUE_WEIGHTS)
    order: list[str] = []
    for issue in ISSUE_TYPES:
        order.extend([issue] * counts[issue])
    return order


def _pick_intent(issue_type: str, intent_remaining: Counter, rng: random.Random) -> str:
    preferred = [i for i in INTENT_PREFERENCES[issue_type] if intent_remaining[i] > 0]
    if preferred:
        return rng.choice(preferred)

    available = [intent for intent, remaining in intent_remaining.items() if remaining > 0]
    if not available:
        raise RuntimeError("No intent remaining for allocation")
    return rng.choice(available)


def _derive_sentiment_scores(issue_type: str, tone_style: str, contradiction_case: bool, hard_case_type: str) -> dict[str, int]:
    scores = {"Negative": 1, "Neutral": 1, "Positive": 1}

    if issue_type in {"Claim Denial", "Fraud Report", "Billing Dispute"}:
        scores["Negative"] += 5
    if issue_type in {"Document Processing Delay", "Delivery Issue", "Policy Update Issue", "Payment Issue"}:
        scores["Neutral"] += 3
    if issue_type in {"Uncategorized", "Policy Cancellation"}:
        scores["Neutral"] += 2
    if issue_type == "Positive Feedback":
        scores["Positive"] += 8
        scores["Neutral"] += 2

    if tone_style == "formal":
        scores["Neutral"] += 1
    if tone_style == "informal":
        scores["Negative"] += 1

    if contradiction_case:
        scores["Neutral"] += 2
        scores["Negative"] += 1
    if hard_case_type == "sentiment_priority_conflict":
        scores["Positive"] += 2
        scores["Negative"] += 1

    return scores


def _derive_priority_scores(issue_type: str, intent: str, contradiction_case: bool, hard_case_type: str) -> dict[str, int]:
    scores = {"Low": 1, "Medium": 1, "High": 1}

    if issue_type in {"Fraud Report", "Claim Denial"}:
        scores["High"] += 5
    if issue_type in {"Document Processing Delay", "Technical Issue", "Payment Issue"}:
        scores["Medium"] += 3
    if issue_type in {"Delivery Issue", "Policy Update Issue"}:
        scores["Medium"] += 2
    if issue_type == "Uncategorized":
        scores["Low"] += 2
    if issue_type == "Positive Feedback":
        scores["Low"] += 6
        scores["Medium"] += 1

    if intent in {"Request Refund", "Request Cancellation"}:
        scores["Medium"] += 2
    if intent == "Appeal Claim Decision":
        scores["High"] += 2

    if contradiction_case:
        scores["High"] += 2
    if hard_case_type == "neutral_urgency_tension":
        scores["High"] += 3
    if hard_case_type == "sentiment_priority_conflict":
        scores["Medium"] += 2

    return scores


def _pick_label_with_remaining(
    rng: random.Random,
    scores: dict[str, int],
    remaining: Counter,
) -> str:
    candidates = [k for k, v in remaining.items() if v > 0]
    if not candidates:
        raise RuntimeError("No remaining labels available.")

    weighted_scores = []
    for label in candidates:
        base = max(1, scores.get(label, 1))
        weighted_scores.append(base * max(1, remaining[label]))

    return rng.choices(candidates, weights=weighted_scores, k=1)[0]


def _fmt_id(rng: random.Random) -> tuple[str, str, str]:
    value = f"{rng.randint(100000, 999999)}"
    return value, value[-4:], value[:3]


def _render_pattern(rng: random.Random, kind: str) -> tuple[str, str]:
    value, short, prefix = _fmt_id(rng)
    patterns = CLAIM_PATTERNS if kind == "claim" else POLICY_PATTERNS
    style = rng.choice(patterns)
    rendered = style.format(id=value, short=short, prefix=prefix)
    return rendered, style


def _compose_reference_segment(rng: random.Random, profile: str) -> tuple[str, str]:
    if profile == "none":
        return "", "none"

    claim_rendered, claim_style = _render_pattern(rng, "claim")
    policy_rendered, policy_style = _render_pattern(rng, "policy")

    if profile == "claim_only":
        return f" Ref: {claim_rendered}.", f"claim:{claim_style}"
    if profile == "policy_only":
        return f" Ref: {policy_rendered}.", f"policy:{policy_style}"

    sep = rng.choice([", ", " | ", " and "])
    return f" Ref: {claim_rendered}{sep}{policy_rendered}.", f"both:{claim_style}+{policy_style}"


def generate_dataset(total: int, seed: int) -> tuple[list[dict], dict]:
    rng = random.Random(seed)
    issue_order = _build_issue_order(total)
    rng.shuffle(issue_order)

    intent_remaining = _build_weighted_counts(total, INTENT_WEIGHTS)

    reference_order = _build_weighted_order(total, REFERENCE_PROFILE_WEIGHTS, rng)
    tone_order = _build_weighted_order(total, TONE_WEIGHTS, rng)
    completeness_order = _build_weighted_order(total, COMPLETENESS_WEIGHTS, rng)
    hard_case_order = _build_weighted_order(total, HARD_CASE_WEIGHTS, rng)
    contradiction_order = _build_weighted_order(total, CONTRADICTION_WEIGHTS, rng)

    target_sentiment_counts = Counter({k: int(total * v / 100) for k, v in SENTIMENT_WEIGHTS.items()})
    target_priority_counts = Counter({k: int(total * v / 100) for k, v in PRIORITY_WEIGHTS.items()})

    # Fix any rounding remainder deterministically.
    target_sentiment_counts["Neutral"] += total - sum(target_sentiment_counts.values())
    target_priority_counts["Medium"] += total - sum(target_priority_counts.values())

    records: list[dict] = []
    seen_texts: set[str] = set()

    for idx, issue_type in enumerate(issue_order, start=1):
        intent = _pick_intent(issue_type, intent_remaining, rng)
        intent_remaining[intent] -= 1

        ref_profile = reference_order[idx - 1]
        tone_style = tone_order[idx - 1]
        completeness = completeness_order[idx - 1]
        hard_case = hard_case_order[idx - 1] == "true"
        contradiction_case = contradiction_order[idx - 1] == "true"

        hard_case_type = "none"
        if hard_case:
            hard_case_type = rng.choice(HARD_CASE_TYPES)

        sentiment_scores = _derive_sentiment_scores(issue_type, tone_style, contradiction_case, hard_case_type)
        priority_scores = _derive_priority_scores(issue_type, intent, contradiction_case, hard_case_type)

        sentiment = _pick_label_with_remaining(rng, sentiment_scores, target_sentiment_counts)
        priority = _pick_label_with_remaining(rng, priority_scores, target_priority_counts)

        tmpl = ISSUE_TEMPLATE[issue_type]
        accepted = False
        title = ""
        description = ""
        text = ""
        noise = "none"
        ref_style = "none"

        for _ in range(60):
            title = rng.choice(tmpl["title"])
            details = rng.sample(tmpl["details"], k=min(2, len(tmpl["details"])))
            connector = rng.choice([" ", " Also, ", " Additionally, ", " Another point: "])
            base = connector.join(details)

            base = _apply_tone(base, tone_style)
            base = _apply_completeness(base, completeness)

            if hard_case:
                base = _apply_hard_case(base, issue_type, intent, hard_case_type)
            if contradiction_case:
                base = _apply_contradiction(base)

            base = f"{base} {rng.choice(SENTIMENT_CUES[sentiment])} {rng.choice(PRIORITY_CUES[priority])}"

            noise = _choices_weighted(rng, NOISE_WEIGHTS)
            description = _apply_noise(base, noise)

            ref_segment, ref_style = _compose_reference_segment(rng, ref_profile)
            if ref_profile != "none":
                description = f"{description} {ref_segment.strip()}"

            text = f"{title}\n\n{description}"
            key = text.strip().lower()
            if key not in seen_texts:
                seen_texts.add(key)
                accepted = True
                break

        if not accepted:
            for salt in range(1, 150):
                candidate = f"{description} Context token {idx:06d}-{salt}."
                key = f"{title}\n\n{candidate}".strip().lower()
                if key not in seen_texts:
                    seen_texts.add(key)
                    description = candidate
                    text = f"{title}\n\n{description}"
                    accepted = True
                    break

        if not accepted:
            raise RuntimeError(f"Could not create unique sample at index {idx}")

        target_sentiment_counts[sentiment] -= 1
        target_priority_counts[priority] -= 1

        created = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

        records.append(
            {
                "sample_id": f"syn_{idx:06d}",
                "title": title,
                "description": description,
                "text": text,
                "labels": {
                    "sentiment": sentiment,
                    "detectedIntent": intent,
                    "issueType": issue_type,
                    "priority": priority,
                    "categoryName": CATEGORY_BY_ISSUE[issue_type],
                },
                "metadata": {
                    "language": "en",
                    "source": "synthetic_v1",
                    "scenario": issue_type.lower().replace(" ", "_"),
                    "noise_profile": noise,
                    "reference_profile": ref_profile,
                    "reference_style": ref_style,
                    "tone_style": tone_style,
                    "completeness": completeness,
                    "hard_case": hard_case,
                    "hard_case_type": hard_case_type,
                    "contradiction_case": contradiction_case,
                    "created_at": created,
                },
            }
        )

    counts = {
        "total": len(records),
        "intent": Counter(r["labels"]["detectedIntent"] for r in records),
        "issueType": Counter(r["labels"]["issueType"] for r in records),
        "sentiment": Counter(r["labels"]["sentiment"] for r in records),
        "priority": Counter(r["labels"]["priority"] for r in records),
        "noise": Counter(r["metadata"]["noise_profile"] for r in records),
        "referenceProfile": Counter(r["metadata"]["reference_profile"] for r in records),
        "toneStyle": Counter(r["metadata"]["tone_style"] for r in records),
        "completeness": Counter(r["metadata"]["completeness"] for r in records),
        "hardCase": Counter(str(r["metadata"]["hard_case"]).lower() for r in records),
        "hardCaseType": Counter(r["metadata"]["hard_case_type"] for r in records),
        "contradictionCase": Counter(str(r["metadata"]["contradiction_case"]).lower() for r in records),
    }

    report = {
        "dataset": "synthetic_v1",
        "seed": seed,
        "total": counts["total"],
        "label_counts": {
            "detectedIntent": dict(counts["intent"]),
            "issueType": dict(counts["issueType"]),
            "sentiment": dict(counts["sentiment"]),
            "priority": dict(counts["priority"]),
            "noiseProfile": dict(counts["noise"]),
            "referenceProfile": dict(counts["referenceProfile"]),
            "toneStyle": dict(counts["toneStyle"]),
            "completeness": dict(counts["completeness"]),
            "hardCase": dict(counts["hardCase"]),
            "hardCaseType": dict(counts["hardCaseType"]),
            "contradictionCase": dict(counts["contradictionCase"]),
        },
    }

    return records, report


def write_jsonl(path: Path, records: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        for row in records:
            fh.write(json.dumps(row, ensure_ascii=True) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic NLP dataset for Insighta.")
    parser.add_argument("--output", default="data/nlp/synthetic_v1.jsonl")
    parser.add_argument("--report", default="data/nlp/dataset_report.json")
    parser.add_argument("--size", type=int, default=2000)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    records, report = generate_dataset(args.size, args.seed)
    out_path = Path(args.output)
    report_path = Path(args.report)

    write_jsonl(out_path, records)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"Generated {len(records)} rows at {out_path}")
    print(f"Report written to {report_path}")


if __name__ == "__main__":
    main()
