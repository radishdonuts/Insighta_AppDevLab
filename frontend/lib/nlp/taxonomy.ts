export const CANONICAL_COMPLAINT_CATEGORIES = [
  "Policy & Account Servicing",
  "Claims Experience",
  "Payments, Billing & Refunds",
  "Documents & Requirements",
  "Customer Support & Service Quality",
  "Digital Access & Technical Issues",
  "Fraud, Security & Privacy",
  "Product/Partner Service Delivery",
  "Other / Uncategorized",
] as const;

export type CanonicalComplaintCategory = (typeof CANONICAL_COMPLAINT_CATEGORIES)[number];

const CATEGORY_ALIASES: Record<string, CanonicalComplaintCategory> = {
  "policy & account servicing": "Policy & Account Servicing",
  "policy cancellation": "Policy & Account Servicing",
  "policy update": "Policy & Account Servicing",
  "claims experience": "Claims Experience",
  "claim denial": "Claims Experience",
  "payments, billing & refunds": "Payments, Billing & Refunds",
  "billing issues": "Payments, Billing & Refunds",
  "billing": "Payments, Billing & Refunds",
  "billing dispute": "Payments, Billing & Refunds",
  "payment issue": "Payments, Billing & Refunds",
  "documents & requirements": "Documents & Requirements",
  "document processing": "Documents & Requirements",
  "customer support & service quality": "Customer Support & Service Quality",
  "digital access & technical issues": "Digital Access & Technical Issues",
  "technical support": "Digital Access & Technical Issues",
  "fraud, security & privacy": "Fraud, Security & Privacy",
  "fraud": "Fraud, Security & Privacy",
  "product/partner service delivery": "Product/Partner Service Delivery",
  "delivery issues": "Product/Partner Service Delivery",
  "other / uncategorized": "Other / Uncategorized",
  uncategorized: "Other / Uncategorized",
};

export function normalizeCanonicalComplaintCategory(value: unknown): CanonicalComplaintCategory | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return CATEGORY_ALIASES[normalized] ?? null;
}

