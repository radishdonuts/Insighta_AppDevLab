from __future__ import annotations

import json
import math
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


def _allowed_origins() -> list[str]:
    configured = [
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
        if origin.strip()
    ]
    frontend_url = os.getenv("FRONTEND_URL", "").strip()
    defaults = ["http://localhost:3000", "http://localhost:3001"]

    origins: list[str] = []
    for candidate in [*configured, frontend_url, *defaults]:
        if candidate and candidate not in origins:
            origins.append(candidate)
    return origins


app = FastAPI(title="Insighta Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CATEGORY_LABELS_DEFAULT = [
    "Policy & Account Servicing",
    "Claims Experience",
    "Payments, Billing & Refunds",
    "Documents & Requirements",
    "Customer Support & Service Quality",
    "Digital Access & Technical Issues",
    "Fraud, Security & Privacy",
    "Product/Partner Service Delivery",
    "Other / Uncategorized",
]
PRIORITY_LABELS_DEFAULT = ["Low", "Medium", "High"]


class NLPRequest(BaseModel):
    text: str
    ticketId: Optional[str] = None
    provider: Optional[str] = None
    apiKey: Optional[str] = None


class NLPResponse(BaseModel):
    priority: Optional[str] = None
    categoryName: Optional[str] = None
    confidence: Optional[float] = None
    confidenceCategory: Optional[float] = None
    confidencePriority: Optional[float] = None
    prioritySource: Optional[str] = None
    suggestedCategoryName: Optional[str] = None
    suggestedPriority: Optional[str] = None
    priorityRuleDebug: Optional[dict[str, Any]] = None
    rawOutput: Optional[str] = None


@dataclass
class RuntimeRules:
    category_base: dict[str, str]
    high_strong_patterns: list[str]
    high_weak_patterns: list[str]
    med_patterns: list[str]
    low_patterns: list[str]
    ml_priority_conf_threshold: float
    rule_advantage: float
    rule_min_confidence: float
    rule_evidence_override_gap: float


@dataclass
class InferenceRuntime:
    tokenizer: Any
    model: Any
    max_length: int
    category_labels: list[str]
    priority_labels: list[str]
    temperature_category: float
    temperature_priority: float
    rules: RuntimeRules


_RUNTIME: Optional[InferenceRuntime] = None
_RUNTIME_ERROR: Optional[str] = None

FALLBACK_RUNTIME_RULES = RuntimeRules(
    category_base={
        "Policy & Account Servicing": "Medium",
        "Claims Experience": "High",
        "Payments, Billing & Refunds": "Medium",
        "Documents & Requirements": "Medium",
        "Customer Support & Service Quality": "Medium",
        "Digital Access & Technical Issues": "Medium",
        "Fraud, Security & Privacy": "High",
        "Product/Partner Service Delivery": "Medium",
        "Other / Uncategorized": "Low",
    },
    high_strong_patterns=[
        r"\burgent\b",
        r"\bimmediate\b",
        r"\basap\b",
        r"\bdenied\b",
        r"\bfraud\b",
        r"\bsecurity\b",
        r"\bprivacy\b",
    ],
    high_weak_patterns=[
        r"\bsevere\b",
        r"\bcritical\b",
        r"\bserious\b",
        r"\bcomplaint\b",
    ],
    med_patterns=[
        r"\bdelay\b",
        r"\bnot resolved\b",
        r"\bissue\b",
        r"\bproblem\b",
        r"\bdispute\b",
    ],
    low_patterns=[
        r"\bno rush\b",
        r"\blow priority\b",
        r"\bwhenever possible\b",
    ],
    ml_priority_conf_threshold=0.75,
    rule_advantage=0.15,
    rule_min_confidence=0.80,
    rule_evidence_override_gap=-0.10,
)

CATEGORY_KEYWORDS: list[tuple[str, list[str]]] = [
    (
        "Claims Experience",
        [
            "claim denied",
            "claim rejection",
            "claim status",
            "claim was denied",
            "adjuster",
            "settlement",
        ],
    ),
    (
        "Payments, Billing & Refunds",
        [
            "billing",
            "charged",
            "payment",
            "refund",
            "invoice",
            "premium",
            "double charge",
        ],
    ),
    (
        "Digital Access & Technical Issues",
        [
            "website",
            "portal",
            "app",
            "login",
            "error",
            "crash",
            "bug",
            "form",
        ],
    ),
    (
        "Policy & Account Servicing",
        [
            "policy update",
            "policy cancellation",
            "cancel policy",
            "account",
            "profile",
            "policy details",
        ],
    ),
    (
        "Documents & Requirements",
        [
            "document",
            "requirements",
            "upload",
            "verification",
            "attachment",
        ],
    ),
    (
        "Customer Support & Service Quality",
        [
            "support",
            "service quality",
            "agent",
            "response time",
            "no response",
            "follow up",
        ],
    ),
    (
        "Fraud, Security & Privacy",
        [
            "fraud",
            "security",
            "privacy",
            "unauthorized",
            "breach",
            "scam",
        ],
    ),
    (
        "Product/Partner Service Delivery",
        [
            "delivery",
            "courier",
            "dispatch",
            "partner",
            "shipment",
            "tracking",
        ],
    ),
]


def _norm_priority(value: str) -> str:
    key = value.strip().lower()
    if key in {"med", "medium"}:
        return "Medium"
    if key == "high":
        return "High"
    if key == "low":
        return "Low"
    return value


def _softmax(values: list[float]) -> list[float]:
    if not values:
        return []
    max_val = max(values)
    ex = [math.exp(v - max_val) for v in values]
    denom = sum(ex)
    return [v / denom for v in ex] if denom > 0 else [0.0 for _ in values]


def _top2_margin(probs: list[float]) -> float:
    if len(probs) < 2:
        return 0.0
    s = sorted(probs)
    return float(s[-1] - s[-2])


def _matched_patterns(text: str, patterns: list[str]) -> list[str]:
    return [p for p in patterns if re.search(p, text, flags=re.IGNORECASE)]


def rule_priority(text: str, category: str, rules: RuntimeRules) -> tuple[str, float, dict[str, Any]]:
    base = _norm_priority(rules.category_base.get(category, "Low"))

    hi_strong_hits = _matched_patterns(text, rules.high_strong_patterns)
    hi_weak_hits = _matched_patterns(text, rules.high_weak_patterns)
    med_hits = _matched_patterns(text, rules.med_patterns)
    low_hits = _matched_patterns(text, rules.low_patterns)

    hi_strong = len(hi_strong_hits)
    hi_weak = len(hi_weak_hits)
    med = len(med_hits)
    low = len(low_hits)

    base_score = {"Low": 0, "Medium": 1, "High": 2}[base]
    score = (
        base_score
        + 2 * min(hi_strong, 2)
        + min(hi_weak, 2)
        + min(med, 2)
        - min(low, 1)
    )

    if (hi_strong >= 1 and score >= 3) or (base == "High" and (hi_strong + med) >= 2 and score >= 3):
        pr = "High"
    elif score >= 1:
        pr = "Medium"
    else:
        pr = "Low"

    evidence = max(2 * min(hi_strong, 2) + min(hi_weak, 2) + min(med, 2) - min(low, 1), 0)
    conf = min(0.50 + 0.10 * evidence, 0.99)

    if base == "High" and pr == "Low":
        pr = "Medium"
        conf = max(conf, 0.55)

    if pr == "High" and hi_strong == 0:
        pr = "Medium"
        conf = min(conf, 0.75)

    return pr, float(conf), {
        "base": base,
        "hi_strong": hi_strong,
        "hi_weak": hi_weak,
        "med": med,
        "low": low,
        "score": score,
        "hits": {
            "hi_strong": hi_strong_hits,
            "hi_weak": hi_weak_hits,
            "med": med_hits,
            "low": low_hits,
        },
    }


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Required file is missing: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def _resolve_artifact_dir() -> Path:
    direct = os.getenv("NLP_ARTIFACT_DIR", "").strip()
    if direct:
        return Path(direct)

    base = os.getenv("NLP_ARTIFACT_BASE_DIR", "").strip()
    run_id = os.getenv("NLP_ARTIFACT_RUN_ID", "").strip()
    if base and run_id:
        return Path(base) / run_id

    raise RuntimeError(
        "NLP artifacts not configured. Set NLP_ARTIFACT_DIR or both NLP_ARTIFACT_BASE_DIR and NLP_ARTIFACT_RUN_ID."
    )


def _read_labels(artifact_dir: Path) -> tuple[list[str], list[str]]:
    category_map = _load_json(artifact_dir / "label_maps_categoryName.json")
    priority_map = _load_json(artifact_dir / "label_maps_priority.json")

    category_labels = CATEGORY_LABELS_DEFAULT
    if isinstance(category_map.get("id2label"), dict):
        id2label = category_map["id2label"]
        category_labels = [id2label[str(i)] for i in range(len(id2label)) if str(i) in id2label] or CATEGORY_LABELS_DEFAULT

    priority_labels = PRIORITY_LABELS_DEFAULT
    if isinstance(priority_map.get("id2label"), dict):
        id2label = priority_map["id2label"]
        loaded = [id2label[str(i)] for i in range(len(id2label)) if str(i) in id2label]
        if loaded:
            priority_labels = [_norm_priority(v) for v in loaded]

    return category_labels, priority_labels


def _load_rules(artifact_dir: Path) -> RuntimeRules:
    data = _load_json(artifact_dir / "nlp_priority_rules.json")
    required = ["category_base", "high_strong_patterns", "high_weak_patterns", "med_patterns", "low_patterns"]
    missing = [k for k in required if k not in data]
    if missing:
        raise RuntimeError(f"nlp_priority_rules.json is missing required keys: {', '.join(missing)}")

    return RuntimeRules(
        category_base={k: _norm_priority(v) for k, v in dict(data["category_base"]).items()},
        high_strong_patterns=list(data["high_strong_patterns"]),
        high_weak_patterns=list(data["high_weak_patterns"]),
        med_patterns=list(data["med_patterns"]),
        low_patterns=list(data["low_patterns"]),
        ml_priority_conf_threshold=float(data.get("ml_priority_conf_threshold", 0.75)),
        rule_advantage=float(data.get("rule_advantage", 0.15)),
        rule_min_confidence=float(data.get("rule_min_confidence", 0.80)),
        rule_evidence_override_gap=float(data.get("rule_evidence_override_gap", -0.10)),
    )


def _load_runtime() -> InferenceRuntime:
    artifact_dir = _resolve_artifact_dir()
    if not artifact_dir.exists():
        raise FileNotFoundError(f"Artifact directory does not exist: {artifact_dir}")

    model_dir = artifact_dir / "model"
    if not model_dir.exists():
        raise FileNotFoundError(f"Model directory is missing: {model_dir}")

    import torch
    import torch.nn as nn
    from transformers import AutoConfig, AutoTokenizer, DistilBertModel, DistilBertPreTrainedModel

    category_labels, priority_labels = _read_labels(artifact_dir)
    rules = _load_rules(artifact_dir)

    inference_cfg = _load_json(artifact_dir / "inference_config.json")
    max_length = int(inference_cfg.get("max_length", 320))

    temp_cfg_path = artifact_dir / "temperature_scaling.json"
    t_cat = 1.0
    t_pri = 1.0
    if temp_cfg_path.exists():
        temp_cfg = _load_json(temp_cfg_path)
        t_cat = float(temp_cfg.get("T_CAT", temp_cfg.get("categoryName", 1.0)))
        t_pri = float(temp_cfg.get("T_PRIO", temp_cfg.get("priority", 1.0)))

    class MultiTaskDistilBert(DistilBertPreTrainedModel):
        def __init__(self, config):
            super().__init__(config)
            self.num_labels_category = config.num_labels_category
            self.num_labels_priority = config.num_labels_priority
            self.distilbert = DistilBertModel(config)
            self.dropout = nn.Dropout(config.seq_classif_dropout)
            hidden = config.dim
            self.classifier_category = nn.Linear(hidden, self.num_labels_category)
            self.classifier_priority = nn.Linear(hidden, self.num_labels_priority)
            self.post_init()

        def forward(self, input_ids=None, attention_mask=None, **kwargs):
            outputs = self.distilbert(input_ids=input_ids, attention_mask=attention_mask)
            pooled = self.dropout(outputs.last_hidden_state[:, 0])
            logits_category = self.classifier_category(pooled)
            logits_priority = self.classifier_priority(pooled)
            return {"logits": (logits_category, logits_priority)}

    config = AutoConfig.from_pretrained(model_dir)
    config.num_labels_category = len(category_labels)
    config.num_labels_priority = len(priority_labels)

    tokenizer = AutoTokenizer.from_pretrained(model_dir)
    model = MultiTaskDistilBert.from_pretrained(model_dir, config=config)
    model.eval()

    return InferenceRuntime(
        tokenizer=tokenizer,
        model=model,
        max_length=max_length,
        category_labels=category_labels,
        priority_labels=priority_labels,
        temperature_category=max(t_cat, 1e-6),
        temperature_priority=max(t_pri, 1e-6),
        rules=rules,
    )


def get_runtime() -> Optional[InferenceRuntime]:
    global _RUNTIME, _RUNTIME_ERROR
    if _RUNTIME is None and _RUNTIME_ERROR is None:
        try:
            _RUNTIME = _load_runtime()
        except Exception as exc:
            _RUNTIME_ERROR = str(exc)
    return _RUNTIME


def _runtime_or_503() -> InferenceRuntime:
    runtime = get_runtime()
    if runtime is None:
        raise HTTPException(
            status_code=503,
            detail=f"NLP runtime unavailable: {_RUNTIME_ERROR or 'unknown error'}",
        )
    return runtime


def infer_with_fallback(text: str) -> tuple[str, float, str, float, float]:
    lowered = text.lower()
    best_category = "Other / Uncategorized"
    best_hits = 0

    for category, keywords in CATEGORY_KEYWORDS:
        hits = sum(1 for keyword in keywords if keyword in lowered)
        if hits > best_hits:
            best_category = category
            best_hits = hits

    conf_cat = 0.78 if best_hits == 0 else min(0.80 + 0.06 * best_hits, 0.96)
    ml_priority = _norm_priority(FALLBACK_RUNTIME_RULES.category_base.get(best_category, "Medium"))
    conf_pri = 0.78 if best_hits == 0 else min(0.80 + 0.05 * best_hits, 0.95)
    return best_category, float(conf_cat), ml_priority, float(conf_pri), 0.10


def infer_with_runtime(text: str, runtime: InferenceRuntime) -> tuple[str, float, str, float, float]:
    import torch

    batch = runtime.tokenizer(
        [text],
        truncation=True,
        max_length=runtime.max_length,
        padding=True,
        return_tensors="pt",
    )

    with torch.no_grad():
        out = runtime.model(**batch)

    logits_cat_t, logits_pri_t = out["logits"]
    logits_cat = logits_cat_t[0].cpu().tolist()
    logits_pri = logits_pri_t[0].cpu().tolist()

    pc = _softmax([v / runtime.temperature_category for v in logits_cat])
    pp = _softmax([v / runtime.temperature_priority for v in logits_pri])

    cat_idx = max(range(len(pc)), key=lambda i: pc[i]) if pc else 0
    pri_idx = max(range(len(pp)), key=lambda i: pp[i]) if pp else 0

    pred_category = runtime.category_labels[cat_idx]
    ml_priority = _norm_priority(runtime.priority_labels[pri_idx])

    return pred_category, float(pc[cat_idx]), ml_priority, float(pp[pri_idx]), _top2_margin(pp)


@app.post("/nlp/generate", response_model=NLPResponse)
async def nlp_generate(req: NLPRequest):
    text = req.text.strip()
    provider = (req.provider or "fastapi").strip().lower()

    if not text:
        raise HTTPException(status_code=400, detail="Text is required.")

    runtime = get_runtime()
    if runtime is None:
        pred_category, conf_cat, ml_priority, conf_pri, ml_margin = infer_with_fallback(text)
        rules = FALLBACK_RUNTIME_RULES
        fallback_mode = True
    else:
        pred_category, conf_cat, ml_priority, conf_pri, ml_margin = infer_with_runtime(text, runtime)
        rules = runtime.rules
        fallback_mode = False

    rule_pri, rule_conf, dbg = rule_priority(text, pred_category, rules)

    if rule_conf >= rules.rule_min_confidence and (rule_conf - conf_pri) >= rules.rule_advantage:
        final_pri, final_pri_conf, pr_source = rule_pri, rule_conf, "rule"
    else:
        final_pri, final_pri_conf, pr_source = ml_priority, conf_pri, "ml"

    if dbg["base"] == "High" and conf_pri < 0.50 and final_pri == "Low":
        final_pri = "Medium"
        final_pri_conf = max(rule_conf, conf_pri, 0.55)
        pr_source = "rule"
        dbg["override_reason"] = "base_high_low_confidence_safeguard"

    if dbg["base"] == "High" and final_pri == "Low":
        final_pri = "Medium"
        final_pri_conf = max(rule_conf, conf_pri, 0.55)
        pr_source = "rule"
        dbg["override_reason"] = "base_high_no_low_output"

    if pr_source == "ml" and rule_pri != final_pri:
        rule_evidence = int(dbg.get("hi_strong", 0)) + int(dbg.get("hi_weak", 0)) + int(dbg.get("med", 0))
        if rule_evidence >= 2 and (rule_conf - conf_pri) > rules.rule_evidence_override_gap:
            final_pri = rule_pri
            final_pri_conf = max(rule_conf, conf_pri)
            pr_source = "rule"
            dbg["override_reason"] = "rule_evidence_override"

    raw_output = {
        "provider": provider,
        "ticketId": req.ticketId,
        "prioritySource": pr_source,
        "runtimeError": _RUNTIME_ERROR,
        "fallbackMode": fallback_mode,
        "ml_priority": ml_priority,
        "ml_priority_confidence": round(conf_pri, 4),
        "ml_priority_margin": round(ml_margin, 4),
        "rule_priority": rule_pri,
        "rule_priority_confidence": round(rule_conf, 4),
    }

    return NLPResponse(
        priority=_norm_priority(final_pri),
        categoryName=pred_category,
        confidence=round(conf_cat, 4),
        confidenceCategory=round(conf_cat, 4),
        confidencePriority=round(final_pri_conf, 4),
        prioritySource=pr_source,
        suggestedCategoryName=pred_category,
        suggestedPriority=_norm_priority(final_pri),
        priorityRuleDebug=dbg,
        rawOutput=json.dumps(raw_output),
    )


@app.get("/health")
async def health():
    runtime = get_runtime()
    if runtime is None:
        return {"status": "not_ready", "runtime_loaded": False, "runtime_error": _RUNTIME_ERROR}
    return {"status": "ok", "runtime_loaded": True, "runtime_error": None}
