import { requestNlpAnalysis, type NlpAnalysisResponse } from "@/lib/nlp/client";
import { getSupabaseServerClient } from "@/lib/supabase";

type SupabaseServerClient = ReturnType<typeof getSupabaseServerClient>;
type TicketPriority = "Low" | "Medium" | "High";

const FIXED_CATEGORIES = [
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

type TicketCategoryName = (typeof FIXED_CATEGORIES)[number];

type AppSettingRow = {
  key?: unknown;
  value?: unknown;
};

const UNCATEGORIZED_CATEGORY_NAME: TicketCategoryName = "Other / Uncategorized";
const DEFAULT_NLP_THRESHOLD = 0.85;
const DEFAULT_NLP_THRESHOLD_CATEGORY = 0.75;
const DEFAULT_NLP_THRESHOLD_PRIORITY = 0.75;
const DEFAULT_NLP_AUTO_ROUTE = true;
const RUNTIME_SETTING_KEYS = [
  "nlp_threshold",
  "nlp_threshold_category",
  "nlp_threshold_priority",
  "nlp_provider",
  "nlp_api_key",
  "nlp_auto_route",
] as const;
const ALLOWED_PRIORITIES = new Set<TicketPriority>(["Low", "Medium", "High"]);

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableTrimmedString(value: unknown): string | null {
  const trimmed = asTrimmedString(value);
  return trimmed || null;
}

function parseThreshold(value: unknown, fallback = DEFAULT_NLP_THRESHOLD): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 0 && value <= 1 ? value : fallback;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
      return parsed;
    }
  }

  return fallback;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
}

function normalizePriority(value: unknown): TicketPriority | null {
  const raw = asTrimmedString(value);
  if (!raw) return null;

  const key = raw.toLowerCase();
  const normalized = key === "low" ? "Low" : key === "high" ? "High" : key === "med" || key === "medium" ? "Medium" : raw;

  return ALLOWED_PRIORITIES.has(normalized as TicketPriority) ? (normalized as TicketPriority) : null;
}

function normalizeConfidence01(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  if (value >= 0 && value <= 1) return value;
  if (value > 1 && value <= 100) return Number((value / 100).toFixed(4));
  return null;
}

function getModelMetadata(providerOverride?: string | null) {
  return {
    provider:
      asTrimmedString(providerOverride) ||
      asTrimmedString(process.env.NLP_MODEL_PROVIDER) ||
      "fastapi",
    name: asTrimmedString(process.env.NLP_MODEL_NAME) || "unspecified",
    version: asTrimmedString(process.env.NLP_MODEL_VERSION) || "unspecified",
    promptVersion: asNullableTrimmedString(process.env.NLP_PROMPT_VERSION),
  };
}

function buildRawOutputPayload(analysis: NlpAnalysisResponse) {
  const payload: Record<string, unknown> = {
    ...(analysis.rawOutput ? { rawOutput: analysis.rawOutput } : {}),
    ...(analysis.prioritySource ? { prioritySource: analysis.prioritySource } : {}),
    ...(analysis.confidenceCategory !== null ? { confidenceCategory: analysis.confidenceCategory } : {}),
    ...(analysis.confidencePriority !== null ? { confidencePriority: analysis.confidencePriority } : {}),
    ...(analysis.suggestedCategoryName ? { suggestedCategoryName: analysis.suggestedCategoryName } : {}),
    ...(analysis.suggestedPriority ? { suggestedPriority: analysis.suggestedPriority } : {}),
    ...(analysis.priorityRuleDebug ? { priorityRuleDebug: analysis.priorityRuleDebug } : {}),
  };
  return Object.keys(payload).length > 0 ? payload : null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error.";
}

function normalizeCategoryName(value: unknown): TicketCategoryName | null {
  const raw = asTrimmedString(value);
  if (!raw) return null;

  const normalized = raw.toLowerCase();
  if (["policy & account servicing", "policy cancellation", "policy update"].includes(normalized)) return "Policy & Account Servicing";
  if (["claims experience", "claim denial"].includes(normalized)) return "Claims Experience";
  if (["payments, billing & refunds", "billing issues", "billing", "billing dispute", "payment issue"].includes(normalized)) {
    return "Payments, Billing & Refunds";
  }
  if (["documents & requirements", "document processing"].includes(normalized)) return "Documents & Requirements";
  if (["customer support & service quality"].includes(normalized)) return "Customer Support & Service Quality";
  if (["digital access & technical issues", "technical support"].includes(normalized)) return "Digital Access & Technical Issues";
  if (["fraud, security & privacy", "fraud"].includes(normalized)) return "Fraud, Security & Privacy";
  if (["product/partner service delivery", "delivery issues"].includes(normalized)) return "Product/Partner Service Delivery";
  if (["other / uncategorized", "uncategorized"].includes(normalized)) return "Other / Uncategorized";

  return null;
}

type NlpRuntimeSettings = {
  threshold: number;
  thresholdCategory: number;
  thresholdPriority: number;
  provider: string;
  apiKey: string | null;
  autoRoute: boolean;
};

export async function getConfiguredNlpRuntimeSettings(
  supabase: SupabaseServerClient
): Promise<NlpRuntimeSettings> {
  const defaultProvider = asTrimmedString(process.env.NLP_MODEL_PROVIDER) || "fastapi";
  const defaultApiKey = asNullableTrimmedString(process.env.NLP_MODEL_API_KEY);

  const defaults: NlpRuntimeSettings = {
    threshold: DEFAULT_NLP_THRESHOLD,
    thresholdCategory: DEFAULT_NLP_THRESHOLD_CATEGORY,
    thresholdPriority: DEFAULT_NLP_THRESHOLD_PRIORITY,
    provider: defaultProvider,
    apiKey: defaultApiKey,
    autoRoute: DEFAULT_NLP_AUTO_ROUTE,
  };

  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", RUNTIME_SETTING_KEYS as unknown as string[]);

  if (error) {
    console.warn("[nlp.enrichment] Failed to read app_settings; using defaults", {
      error: error.message,
      defaults,
    });
    return defaults;
  }

  const map = new Map<string, unknown>();
  for (const row of Array.isArray(data) ? data : []) {
    const key = asTrimmedString((row as { key?: unknown }).key);
    if (!key) continue;
    map.set(key, (row as AppSettingRow).value);
  }

  return {
    threshold: parseThreshold(map.get("nlp_threshold"), DEFAULT_NLP_THRESHOLD),
    thresholdCategory: parseThreshold(
      map.get("nlp_threshold_category") ?? map.get("nlp_threshold"),
      DEFAULT_NLP_THRESHOLD_CATEGORY
    ),
    thresholdPriority: parseThreshold(
      map.get("nlp_threshold_priority") ?? map.get("nlp_threshold"),
      DEFAULT_NLP_THRESHOLD_PRIORITY
    ),
    provider: asTrimmedString(map.get("nlp_provider")) || defaults.provider,
    apiKey: asNullableTrimmedString(map.get("nlp_api_key")) ?? defaults.apiKey,
    autoRoute: parseBoolean(map.get("nlp_auto_route"), defaults.autoRoute),
  };
}

async function insertTicketNlpAnalysis(
  supabase: SupabaseServerClient,
  row: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from("ticket_nlp_analyses").insert(row);
  if (error) {
    throw new Error(`Failed to write ticket NLP analysis log: ${error.message}`);
  }
}

export function buildNlpInputText(title: string, description: string): string {
  const trimmedTitle = asTrimmedString(title);
  const trimmedDescription = asTrimmedString(description);
  return trimmedTitle ? `${trimmedTitle}\n\n${trimmedDescription}` : trimmedDescription;
}

export async function resolveActiveCategoryIdByName(
  supabase: SupabaseServerClient,
  categoryName: string
): Promise<string | null> {
  const target = asTrimmedString(categoryName);
  if (!target) return null;

  const exact = await supabase
    .from("complaint_categories")
    .select("id")
    .eq("category_name", target)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (exact.error) {
    throw new Error(`Failed to resolve category: ${exact.error.message}`);
  }

  if (exact.data?.id) return asTrimmedString(exact.data.id) || null;

  const fallback = await supabase
    .from("complaint_categories")
    .select("id")
    .ilike("category_name", target)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (fallback.error) {
    throw new Error(`Failed to resolve category: ${fallback.error.message}`);
  }

  return fallback.data?.id ? asTrimmedString(fallback.data.id) : null;
}

export async function resolveUncategorizedCategoryId(
  supabase: SupabaseServerClient
): Promise<string> {
  const strict = await resolveActiveCategoryIdByName(supabase, UNCATEGORIZED_CATEGORY_NAME);
  if (strict) return strict;

  const legacy = await resolveActiveCategoryIdByName(supabase, "Uncategorized");
  if (legacy) return legacy;

  throw new Error(`Active "${UNCATEGORIZED_CATEGORY_NAME}" category is required.`);
}

type RunTicketNlpEnrichmentInput = {
  supabase: SupabaseServerClient;
  ticketId: string;
  text: string;
  allowCategoryOverride?: boolean;
  uncategorizedCategoryId?: string | null;
};

type RunTicketNlpEnrichmentResult = {
  analysis: NlpAnalysisResponse;
  nlpFieldsUpdated: boolean;
  categoryUpdated: boolean;
  skippedLowConfidence: boolean;
  skippedMissingTaxonomy: boolean;
  applied: boolean;
};

export async function runTicketNlpEnrichment(
  input: RunTicketNlpEnrichmentInput
): Promise<RunTicketNlpEnrichmentResult> {
  const ticketId = asTrimmedString(input.ticketId);
  const text = asTrimmedString(input.text);

  if (!ticketId) throw new Error("Ticket ID is required for NLP enrichment.");
  if (!text) throw new Error("NLP enrichment text is required.");

  const nowIso = new Date().toISOString();
  const runtimeSettings = await getConfiguredNlpRuntimeSettings(input.supabase);
  const thresholdCategory = runtimeSettings.thresholdCategory;
  const thresholdPriority = runtimeSettings.thresholdPriority;
  const metadata = getModelMetadata(runtimeSettings.provider);

  let analysisRowWritten = false;
  let analysis: NlpAnalysisResponse | null = null;

  try {
    analysis = await requestNlpAnalysis({
      text,
      ticketId,
      provider: runtimeSettings.provider,
      apiKey: runtimeSettings.apiKey,
    });

    const confidence = normalizeConfidence01(analysis.confidence);
    const confidenceCategory = normalizeConfidence01(analysis.confidenceCategory);
    const confidencePriority = normalizeConfidence01(analysis.confidencePriority);
    const resolvedPriority = normalizePriority(analysis.priority);
    const resolvedCategoryName = normalizeCategoryName(analysis.categoryName ?? analysis.suggestedCategoryName);

    const categoryPasses =
      !!resolvedCategoryName &&
      confidenceCategory !== null &&
      confidenceCategory >= thresholdCategory;
    const priorityPasses =
      !!resolvedPriority &&
      confidencePriority !== null &&
      confidencePriority >= thresholdPriority;
    const skippedMissingTaxonomy = !!analysis.categoryName && !resolvedCategoryName;
    const skippedLowConfidence =
      (!!resolvedCategoryName && !categoryPasses) || (!!resolvedPriority && !priorityPasses);
    const appliedAny = categoryPasses || priorityPasses;

    const analysisStatus = appliedAny ? "succeeded" : "skipped";
    const analysisError = skippedMissingTaxonomy
      ? "Missing taxonomy mapping for categoryName."
      : skippedLowConfidence
        ? `Prediction below threshold (category >= ${thresholdCategory}, priority >= ${thresholdPriority}).`
        : null;

    let categoryUpdated = false;
    let nlpFieldsUpdated = false;
    if (appliedAny) {
      const ticketUpdates: Record<string, unknown> = {
        nlp_model_version: metadata.version,
        nlp_updated_at: nowIso,
        ...(confidenceCategory !== null
          ? { nlp_confidence: confidenceCategory }
          : confidence !== null
            ? { nlp_confidence: confidence }
            : {}),
        ...(priorityPasses && resolvedPriority ? { priority: resolvedPriority } : {}),
        ...(categoryPasses && resolvedCategoryName ? { category_name: resolvedCategoryName } : {}),
      };

      const { error: updateError } = await input.supabase
        .from("tickets")
        .update(ticketUpdates)
        .eq("id", ticketId);

      if (updateError) {
        throw new Error(`Failed to update NLP fields: ${updateError.message}`);
      }
      nlpFieldsUpdated = true;

      if (categoryPasses && resolvedCategoryName) {
        const resolvedCategoryId = await resolveActiveCategoryIdByName(input.supabase, resolvedCategoryName);
        if (resolvedCategoryId && input.allowCategoryOverride !== false) {
          const { error: categoryError } = await input.supabase
            .from("tickets")
            .update({ category_id: resolvedCategoryId })
            .eq("id", ticketId);
          if (!categoryError) {
            categoryUpdated = true;
          }
        }
      }
    }

    await insertTicketNlpAnalysis(input.supabase, {
      ticket_id: ticketId,
      input_text: text,
      model_provider: metadata.provider,
      model_name: metadata.name,
      model_version: metadata.version,
      prompt_version: metadata.promptVersion,
      priority: resolvedPriority,
      category_name: resolvedCategoryName,
      confidence: confidenceCategory ?? confidence,
      raw_output: buildRawOutputPayload(analysis),
      status: analysisStatus,
      error_message: analysisError,
      is_applied: appliedAny,
      applied_at: appliedAny ? nowIso : null,
    });
    analysisRowWritten = true;

    return {
      analysis,
      nlpFieldsUpdated,
      categoryUpdated,
      skippedLowConfidence,
      skippedMissingTaxonomy,
      applied: appliedAny,
    };
  } catch (error) {
    if (!analysisRowWritten) {
      try {
        const resolvedPriority = analysis ? normalizePriority(analysis.priority) : null;
        const resolvedCategoryName = analysis ? normalizeCategoryName(analysis.categoryName) : null;
        await insertTicketNlpAnalysis(input.supabase, {
          ticket_id: ticketId,
          input_text: text,
          model_provider: metadata.provider,
          model_name: metadata.name,
          model_version: metadata.version,
          prompt_version: metadata.promptVersion,
          priority: resolvedPriority,
          category_name: resolvedCategoryName,
          confidence: normalizeConfidence01(analysis?.confidence ?? null),
          raw_output: analysis ? buildRawOutputPayload(analysis) : null,
          status: "failed",
          error_message: getErrorMessage(error),
          is_applied: false,
        });
      } catch (analysisError) {
        console.error("[nlp.enrichment] failed to persist error analysis row", {
          ticketId,
          error: getErrorMessage(analysisError),
        });
      }
    }

    throw error;
  }
}
