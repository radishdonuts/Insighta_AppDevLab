export type NlpPriority = "Low" | "Medium" | "High";

export type NlpAnalysisRequest = {
  text: string;
  ticketId?: string | null;
  provider?: string | null;
  apiKey?: string | null;
};

export type NlpAnalysisResponse = {
  priority: NlpPriority | null;
  categoryName: string | null;
  confidence: number | null;
  confidenceCategory: number | null;
  confidencePriority: number | null;
  prioritySource: "ml" | "rule" | null;
  suggestedCategoryName: string | null;
  suggestedPriority: NlpPriority | null;
  priorityRuleDebug: Record<string, unknown> | null;
  rawOutput: string | null;
};

const ALLOWED_PRIORITIES = new Set<NlpPriority>(["Low", "Medium", "High"]);

export class NlpClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly endpoint: string,
    public readonly details?: string
  ) {
    super(message);
    this.name = "NlpClientError";
  }
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePriority(value: unknown): NlpPriority | null {
  const raw = asTrimmedString(value);
  if (!raw) return null;

  const key = raw.toLowerCase();
  const normalized =
    key === "low"
      ? "Low"
      : key === "medium" || key === "med"
        ? "Medium"
        : key === "high"
          ? "High"
          : raw;

  return ALLOWED_PRIORITIES.has(normalized as NlpPriority)
    ? (normalized as NlpPriority)
    : null;
}

function normalizeConfidence(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

function normalizeNlpPayload(payload: unknown): NlpAnalysisResponse {
  const record =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};

  const categoryName = asTrimmedString(record.categoryName) || asTrimmedString(record.category_name) || null;
  const rawOutput =
    asTrimmedString(record.rawOutput) ||
    (record.rawOutput && typeof record.rawOutput === "object" ? JSON.stringify(record.rawOutput) : "") ||
    asTrimmedString(record.raw_output) ||
    asTrimmedString(record.output) ||
    asTrimmedString(record.response) ||
    null;
  const prioritySourceRaw = asTrimmedString(record.prioritySource) || asTrimmedString(record.priority_source);
  const prioritySource = prioritySourceRaw === "ml" || prioritySourceRaw === "rule" ? prioritySourceRaw : null;

  return {
    priority: normalizePriority(record.priority),
    categoryName,
    confidence: normalizeConfidence(record.confidence),
    confidenceCategory: normalizeConfidence(record.confidenceCategory ?? record.confidence_category ?? record.categoryConfidence),
    confidencePriority: normalizeConfidence(record.confidencePriority ?? record.confidence_priority ?? record.priorityConfidence),
    prioritySource,
    suggestedCategoryName:
      asTrimmedString(record.suggestedCategoryName) ||
      asTrimmedString(record.suggested_category_name) ||
      categoryName,
    suggestedPriority: normalizePriority(record.suggestedPriority ?? record.suggested_priority ?? record.priority),
    priorityRuleDebug:
      record.priorityRuleDebug && typeof record.priorityRuleDebug === "object"
        ? (record.priorityRuleDebug as Record<string, unknown>)
        : record.priority_rule_debug && typeof record.priority_rule_debug === "object"
          ? (record.priority_rule_debug as Record<string, unknown>)
          : null,
    rawOutput,
  };
}

function resolveProviderBaseUrl(provider: string): string | undefined {
  const key = provider.toLowerCase();

  if (key === "openai") return asTrimmedString(process.env.FASTAPI_URL_OPENAI) || undefined;
  if (key === "gemini") return asTrimmedString(process.env.FASTAPI_URL_GEMINI) || undefined;
  if (key === "claude") return asTrimmedString(process.env.FASTAPI_URL_CLAUDE) || undefined;
  if (key === "local") return asTrimmedString(process.env.FASTAPI_URL_LOCAL) || undefined;

  return undefined;
}

export function getNlpEndpoint(provider?: string | null) {
  const providerKey = asTrimmedString(provider).toLowerCase();
  const providerBase = providerKey ? resolveProviderBaseUrl(providerKey) : undefined;
  const defaultBase = asTrimmedString(process.env.FASTAPI_URL) || "http://127.0.0.1:8000";
  const fastApiBase = providerBase || defaultBase;

  return `${fastApiBase.replace(/\/$/, "")}/nlp/generate`;
}

export async function requestNlpAnalysis(input: NlpAnalysisRequest): Promise<NlpAnalysisResponse> {
  const text = asTrimmedString(input.text);
  const provider = asTrimmedString(input.provider) || null;
  const apiKey = asTrimmedString(input.apiKey) || null;
  const endpoint = getNlpEndpoint(provider);

  if (!text) {
    throw new NlpClientError("Text is required.", 400, endpoint);
  }

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        ...(asTrimmedString(input.ticketId) ? { ticketId: asTrimmedString(input.ticketId) } : {}),
        ...(provider ? { provider } : {}),
        ...(apiKey ? { apiKey } : {}),
      }),
    });
  } catch (error) {
    throw new NlpClientError(
      "FastAPI NLP endpoint unavailable.",
      502,
      endpoint,
      error instanceof Error ? error.message : undefined
    );
  }

  if (!response.ok) {
    let details = "";

    try {
      const errorPayload = (await response.json()) as Record<string, unknown>;
      details =
        asTrimmedString(errorPayload.error) ||
        asTrimmedString(errorPayload.detail) ||
        asTrimmedString(errorPayload.message);
    } catch {
      details = asTrimmedString(await response.text());
    }

    throw new NlpClientError(
      details || "FastAPI NLP endpoint unavailable.",
      502,
      endpoint,
      details || undefined
    );
  }

  const payload = (await response.json()) as unknown;
  return normalizeNlpPayload(payload);
}
