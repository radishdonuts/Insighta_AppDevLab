# NLP Synthetic Dataset Spec (Complaint Two-Head)

## Purpose
This dataset trains a complaint-only multi-task classifier for Insighta using `distilbert-base-uncased`.

Only two labels are predicted by NLP:
- `labels.categoryName`
- `labels.priority`

Feedback entries are excluded from NLP training and handled by star-rating workflow.

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
- `labels.categoryName`: one of:
  - `Policy & Account Servicing`
  - `Claims Experience`
  - `Payments, Billing & Refunds`
  - `Documents & Requirements`
  - `Customer Support & Service Quality`
  - `Digital Access & Technical Issues`
  - `Fraud, Security & Privacy`
  - `Product/Partner Service Delivery`
  - `Feedback, Suggestions & Compliments`
  - `Other / Uncategorized`
- `labels.priority`: `Low | Med | High`

## Balance Requirement
- Class imbalance must stay in `1.0-1.3` for each predicted label set.
- Measured as: `max_class_count / min_class_count`.
- Applies to:
  - `labels.categoryName`
  - `labels.priority`

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
