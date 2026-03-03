from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="Insighta Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class NLPRequest(BaseModel):
    text: str
    ticketId: Optional[str] = None
    provider: Optional[str] = None
    apiKey: Optional[str] = None


class NLPResponse(BaseModel):
    sentiment: Optional[str] = None
    detectedIntent: Optional[str] = None
    detectedIntentId: Optional[str] = None
    issueType: Optional[str] = None
    issueTypeId: Optional[str] = None
    priority: Optional[str] = None
    categoryName: Optional[str] = None
    categoryId: Optional[str] = None
    confidence: Optional[float] = None
    rawOutput: Optional[str] = None


def infer_sentiment(text: str) -> str:
    value = text.lower()
    if any(token in value for token in ["angry", "delay", "failed", "denied", "worst", "frustrated"]):
        return "Negative"
    if any(token in value for token in ["great", "satisfied", "thank", "resolved"]):
        return "Positive"
    return "Neutral"


def infer_priority(text: str) -> str:
    value = text.lower()
    if any(token in value for token in ["urgent", "immediately", "critical", "asap"]):
        return "High"
    if any(token in value for token in ["whenever", "minor", "small issue"]):
        return "Low"
    return "Medium"


def infer_issue_type(text: str) -> Optional[str]:
    value = text.lower()
    if any(token in value for token in ["fraud", "scam", "phishing", "unauthorized", "identity theft"]):
        return "Fraud Report"
    if any(token in value for token in ["claim denied", "claim denial", "denied", "declined", "rejected"]):
        return "Claim Denial"
    if any(token in value for token in ["cancel policy", "policy cancellation", "terminate policy", "cancellation"]):
        return "Policy Cancellation"
    if any(token in value for token in ["policy update", "policy change", "coverage update", "beneficiary update"]):
        return "Policy Update Issue"
    if any(token in value for token in ["payment", "premium", "autodebit", "auto debit", "payment failed"]):
        return "Payment Issue"
    if any(token in value for token in ["document", "paperwork", "processing delay", "verification delay"]):
        return "Document Processing Delay"
    if any(token in value for token in ["delivery", "shipment", "tracking", "courier", "late"]):
        return "Delivery Issue"
    if any(token in value for token in ["app", "login", "error", "bug", "crash", "portal", "website"]):
        return "Technical Issue"
    if any(token in value for token in ["refund", "charge", "billing", "invoice", "overcharged"]):
        return "Billing Dispute"
    return "Uncategorized"


def infer_confidence(text: str, issue_type: Optional[str], intent: str) -> float:
    value = text.lower()

    issue_confidence = 0.92 if issue_type and issue_type != "Uncategorized" else 0.82
    intent_confidence = 0.90 if intent != "General Complaint" else 0.84

    # Escalation wording usually indicates clearer complaint signals.
    urgent_bonus = 0.02 if any(token in value for token in ["urgent", "immediately", "critical", "asap"]) else 0.0
    detailed_bonus = 0.01 if len(value) >= 80 else 0.0

    confidence = max(issue_confidence, intent_confidence) + urgent_bonus + detailed_bonus
    return min(0.99, round(confidence, 4))


def infer_detected_intent(text: str) -> str:
    value = text.lower()
    if any(
        token in value
        for token in [
            "claim denied",
            "claim denial",
            "appeal",
            "reconsider",
            "dispute decision",
        ]
    ):
        return "Appeal Claim Decision"
    if any(
        token in value
        for token in [
            "wrong charge",
            "incorrect charge",
            "billing error",
            "invoice error",
            "overcharged",
            "double charged",
            "duplicate charge",
        ]
    ):
        return "Report Billing Error"
    if any(
        token in value
        for token in [
            "policy change issue",
            "cannot update policy",
            "policy update failed",
            "coverage change issue",
            "beneficiary change issue",
        ]
    ):
        return "Report Policy Change Issue"
    if any(
        token in value
        for token in [
            "document delay",
            "processing delay",
            "document processing delay",
            "verification delay",
            "paperwork delay",
        ]
    ):
        return "Report Document Processing Delay"
    if "refund" in value:
        return "Request Refund"
    if "cancel" in value:
        return "Request Cancellation"
    if "status" in value or "update" in value:
        return "Request Status Update"
    return "General Complaint"


def infer_category_name(issue_type: Optional[str]) -> Optional[str]:
    if issue_type == "Claim Denial":
        return "Claim Denial"
    if issue_type == "Billing Dispute":
        return "Billing Issues"
    if issue_type == "Policy Cancellation":
        return "Policy Cancellation"
    if issue_type == "Policy Update Issue":
        return "Policy Update"
    if issue_type == "Payment Issue":
        return "Billing"
    if issue_type == "Document Processing Delay":
        return "Document Processing"
    if issue_type == "Technical Issue":
        return "Technical Support"
    if issue_type == "Fraud Report":
        return "Fraud"
    if issue_type == "Delivery Issue":
        return "Delivery Issues"
    return "Uncategorized"


@app.post("/nlp/generate", response_model=NLPResponse)
async def nlp_generate(req: NLPRequest):
    # Scaffold-only logic; replace with model-backed inference later.
    text = req.text.strip()
    issue_type = infer_issue_type(text)
    intent = infer_detected_intent(text)
    provider = (req.provider or "fastapi").strip().lower()

    return NLPResponse(
        sentiment=infer_sentiment(text),
        detectedIntent=intent,
        detectedIntentId=None,
        issueType=issue_type,
        issueTypeId=None,
        priority=infer_priority(text),
        categoryName=infer_category_name(issue_type),
        categoryId=None,
        confidence=infer_confidence(text, issue_type, intent),
        rawOutput=f"scaffold-analysis provider={provider} ticketId={req.ticketId or 'n/a'}",
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
