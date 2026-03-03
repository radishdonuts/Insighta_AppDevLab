# NLP Synthetic Dataset Spec (DistilBERT CPU)

## Purpose
This dataset trains a multi-task complaint classifier for Insighta using `distilbert-base-uncased`.

## Source Files
- `data/nlp/synthetic_v1.jsonl`
- `data/nlp/train.jsonl`
- `data/nlp/val.jsonl`
- `data/nlp/test.jsonl`
- `data/nlp/dataset_report.json`

## Schema
Each JSONL row contains:
- `sample_id`: string, unique
- `title`: string
- `description`: string
- `text`: string (`title + "\n\n" + description`)
- `labels.sentiment`: `Negative | Neutral | Positive`
- `labels.detectedIntent`: one of 9 intent labels
- `labels.issueType`: one of 11 issue type labels
- `labels.priority`: `Low | Medium | High`
- `labels.categoryName`: category mapped from issue type
- `metadata.language`: `en`
- `metadata.source`: `synthetic_v1`
- `metadata.scenario`: snake-case issue type marker
- `metadata.noise_profile`: `none | typos | short | long | angry_tone | missing_punctuation | sms_shorthand | mixed_case`
- `metadata.reference_profile`: `none | claim_only | policy_only | both`
- `metadata.reference_style`: pattern used for ID phrasing
- `metadata.tone_style`: `formal | neutral | informal | terse`
- `metadata.completeness`: `complete | partial | fragment`
- `metadata.hard_case`: boolean
- `metadata.hard_case_type`: `none | issue_ambiguity_billing_payment | intent_ambiguity_status_general | neutral_urgency_tension | sentiment_priority_conflict`
- `metadata.contradiction_case`: boolean
- `metadata.created_at`: ISO-8601 UTC

## Distribution Targets
- Sentiment: `Negative 45%`, `Neutral 35%`, `Positive 20%` (±3%)
- Priority: `Low 30%`, `Medium 40%`, `High 30%` (±3%)
- Reference presence:
  - none 55%
  - claim_only 20%
  - policy_only 15%
  - both 10%
- Tone style:
  - formal 35%
  - neutral 30%
  - informal 25%
  - terse 10%
- Completeness:
  - complete 65%
  - partial 25%
  - fragment 10%
- Hard case coverage: >=20%
- Contradiction case coverage: >=8%

## Taxonomy
### detectedIntent (9)
- General Complaint
- Request Status Update
- Request Refund
- Request Cancellation
- Appeal Claim Decision
- Report Billing Error
- Report Policy Change Issue
- Report Document Processing Delay
- Share Positive Feedback

### issueType (11)
- Claim Denial
- Billing Dispute
- Policy Cancellation
- Policy Update Issue
- Payment Issue
- Document Processing Delay
- Technical Issue
- Fraud Report
- Delivery Issue
- Uncategorized
- Positive Feedback

## Commands
Generate:
```bash
python scripts/nlp/generate_synthetic_dataset.py --size 2000 --seed 42
```

Validate:
```bash
python scripts/nlp/validate_dataset.py --input data/nlp/synthetic_v1.jsonl
```

Split:
```bash
python scripts/nlp/split_dataset.py --input data/nlp/synthetic_v1.jsonl
```

## Notes
- Generation is deterministic by seed.
- Category labels are rule-derived from issue type.
- Reference IDs are optional realism signals and should not be treated as required features.
- This dataset is synthetic and should be complemented with reviewed production feedback later.
