import { requestNlpAnalysis, type NlpAnalysisResponse } from "@/lib/nlp/client";
import { getSupabaseServerClient } from "@/lib/supabase";

type SupabaseServerClient = ReturnType<typeof getSupabaseServerClient>;
type TicketPriority = "Low" | "Medium" | "High";
type TicketSentiment = "Negative" | "Neutral" | "Positive";

type ActiveLabelRow = {
  id?: unknown;
  display_name?: unknown;
};

type CategoryRow = {
  id?: unknown;
  category_name?: unknown;
};

type CategoryMappingRow = {
  default_priority?: unknown;
  category?: CategoryRow | CategoryRow[] | null;
};

type AppSettingRow = {
  key?: unknown;
  value?: unknown;
};

type ResolvedLabel = {
  id: string;
  displayName: string;
};

type ResolvedCategory = {
  id: string;
  name: string;
  defaultPriority: TicketPriority | null;
};

export const UNCATEGORIZED_CATEGORY_NAME = "Uncategorized";
const DEFAULT_NLP_THRESHOLD = 0.85;
const DEFAULT_NLP_AUTO_ROUTE = true;
const RUNTIME_SETTING_KEYS = ["nlp_threshold", "nlp_provider", "nlp_api_key", "nlp_auto_route"] as const;
const ALLOWED_PRIORITIES = new Set<TicketPriority>(["Low", "Medium", "High"]);
const ALLOWED_SENTIMENTS = new Set<TicketSentiment>(["Negative", "Neutral", "Positive"]);

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableTrimmedString(value: unknown): string | null {
  const trimmed = asTrimmedString(value);
  return trimmed || null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function asUuidOrNull(value: unknown): string | null {
  const candidate = asTrimmedString(value);
  return candidate && isUuid(candidate) ? candidate : null;
}

function parseThreshold(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 0 && value <= 1 ? value : DEFAULT_NLP_THRESHOLD;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
      return parsed;
    }
  }

  return DEFAULT_NLP_THRESHOLD;
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
  const normalized =
    key === "low" ? "Low" : key === "medium" ? "Medium" : key === "high" ? "High" : raw;

  return ALLOWED_PRIORITIES.has(normalized as TicketPriority) ? (normalized as TicketPriority) : null;
}

function normalizeSentiment(value: unknown): TicketSentiment | null {
  const raw = asTrimmedString(value);
  if (!raw) return null;

  const key = raw.toLowerCase();
  const normalized =
    key === "negative" ? "Negative" : key === "neutral" ? "Neutral" : key === "positive" ? "Positive" : raw;

  return ALLOWED_SENTIMENTS.has(normalized as TicketSentiment) ? (normalized as TicketSentiment) : null;
}

function normalizeConfidence01(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  if (value >= 0 && value <= 1) return value;
  if (value > 1 && value <= 100) return Number((value / 100).toFixed(4));
  return null;
}

function sanitizeCode(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error.";
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
  return analysis.rawOutput ? { rawOutput: analysis.rawOutput } : null;
}

type NlpRuntimeSettings = {
  threshold: number;
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
    threshold: parseThreshold(map.get("nlp_threshold")),
    provider: asTrimmedString(map.get("nlp_provider")) || defaults.provider,
    apiKey: asNullableTrimmedString(map.get("nlp_api_key")) ?? defaults.apiKey,
    autoRoute: parseBoolean(map.get("nlp_auto_route"), defaults.autoRoute),
  };
}

async function resolveIntentLabel(
  supabase: SupabaseServerClient,
  analysis: NlpAnalysisResponse
): Promise<ResolvedLabel | null> {
  const intentId = asUuidOrNull(analysis.detectedIntentId);

  if (intentId) {
    const byId = await supabase
      .from("nlp_intent_labels")
      .select("id, display_name")
      .eq("id", intentId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (byId.error) {
      throw new Error(`Failed to resolve intent by ID: ${byId.error.message}`);
    }

    if (byId.data?.id && byId.data?.display_name) {
      return {
        id: asTrimmedString(byId.data.id),
        displayName: asTrimmedString(byId.data.display_name),
      };
    }
  }

  const detectedIntent = asTrimmedString(analysis.detectedIntent);
  if (!detectedIntent) return null;

  const byName = await supabase
    .from("nlp_intent_labels")
    .select("id, display_name")
    .ilike("display_name", detectedIntent)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (byName.error) {
    throw new Error(`Failed to resolve intent by display name: ${byName.error.message}`);
  }

  if (byName.data?.id && byName.data?.display_name) {
    return {
      id: asTrimmedString(byName.data.id),
      displayName: asTrimmedString(byName.data.display_name),
    };
  }

  const code = sanitizeCode(detectedIntent);
  if (!code) return null;

  const byCode = await supabase
    .from("nlp_intent_labels")
    .select("id, display_name")
    .eq("code", code)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (byCode.error) {
    throw new Error(`Failed to resolve intent by code: ${byCode.error.message}`);
  }

  if (byCode.data?.id && byCode.data?.display_name) {
    return {
      id: asTrimmedString(byCode.data.id),
      displayName: asTrimmedString(byCode.data.display_name),
    };
  }

  return null;
}

async function resolveIssueTypeLabel(
  supabase: SupabaseServerClient,
  analysis: NlpAnalysisResponse
): Promise<ResolvedLabel | null> {
  const issueTypeId = asUuidOrNull(analysis.issueTypeId);

  if (issueTypeId) {
    const byId = await supabase
      .from("nlp_issue_type_labels")
      .select("id, display_name")
      .eq("id", issueTypeId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (byId.error) {
      throw new Error(`Failed to resolve issue type by ID: ${byId.error.message}`);
    }

    if (byId.data?.id && byId.data?.display_name) {
      return {
        id: asTrimmedString(byId.data.id),
        displayName: asTrimmedString(byId.data.display_name),
      };
    }
  }

  const issueType = asTrimmedString(analysis.issueType);
  if (!issueType) return null;

  const byName = await supabase
    .from("nlp_issue_type_labels")
    .select("id, display_name")
    .ilike("display_name", issueType)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (byName.error) {
    throw new Error(`Failed to resolve issue type by display name: ${byName.error.message}`);
  }

  if (byName.data?.id && byName.data?.display_name) {
    return {
      id: asTrimmedString(byName.data.id),
      displayName: asTrimmedString(byName.data.display_name),
    };
  }

  const code = sanitizeCode(issueType);
  if (!code) return null;

  const byCode = await supabase
    .from("nlp_issue_type_labels")
    .select("id, display_name")
    .eq("code", code)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (byCode.error) {
    throw new Error(`Failed to resolve issue type by code: ${byCode.error.message}`);
  }

  if (byCode.data?.id && byCode.data?.display_name) {
    return {
      id: asTrimmedString(byCode.data.id),
      displayName: asTrimmedString(byCode.data.display_name),
    };
  }

  return null;
}

async function resolveCategoryFromIssueType(
  supabase: SupabaseServerClient,
  issueTypeId: string
): Promise<ResolvedCategory | null> {
  const { data, error } = await supabase
    .from("nlp_issue_category_map")
    .select(
      `
        default_priority,
        category:complaint_categories!nlp_issue_category_map_category_id_fkey (id, category_name)
      `
    )
    .eq("issue_type_id", issueTypeId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve category from issue type mapping: ${error.message}`);
  }

  const mapping = (data ?? null) as CategoryMappingRow | null;
  const category = firstRow(mapping?.category);
  const categoryId = asTrimmedString(category?.id);
  const categoryName = asTrimmedString(category?.category_name);

  if (!categoryId || !categoryName) {
    return null;
  }

  return {
    id: categoryId,
    name: categoryName,
    defaultPriority: normalizePriority(mapping?.default_priority),
  };
}

async function resolveCategoryFromAnalysis(
  supabase: SupabaseServerClient,
  analysis: NlpAnalysisResponse
): Promise<ResolvedCategory | null> {
  const categoryId = asUuidOrNull(analysis.categoryId);

  if (categoryId) {
    const byId = await supabase
      .from("complaint_categories")
      .select("id, category_name")
      .eq("id", categoryId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (byId.error) {
      throw new Error(`Failed to resolve category by ID: ${byId.error.message}`);
    }

    if (byId.data?.id && byId.data?.category_name) {
      return {
        id: asTrimmedString(byId.data.id),
        name: asTrimmedString(byId.data.category_name),
        defaultPriority: null,
      };
    }
  }

  const categoryName = asTrimmedString(analysis.categoryName);
  if (!categoryName) return null;

  const resolvedCategoryId = await resolveActiveCategoryIdByName(supabase, categoryName);
  if (!resolvedCategoryId) return null;

  const byName = await supabase
    .from("complaint_categories")
    .select("id, category_name")
    .eq("id", resolvedCategoryId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (byName.error) {
    throw new Error(`Failed to resolve category metadata: ${byName.error.message}`);
  }

  if (byName.data?.id && byName.data?.category_name) {
    return {
      id: asTrimmedString(byName.data.id),
      name: asTrimmedString(byName.data.category_name),
      defaultPriority: null,
    };
  }

  return null;
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

  if (exact.data?.id) {
    return asTrimmedString(exact.data.id) || null;
  }

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
  const categoryId = await resolveActiveCategoryIdByName(supabase, UNCATEGORIZED_CATEGORY_NAME);
  if (!categoryId) {
    throw new Error(`Active "${UNCATEGORIZED_CATEGORY_NAME}" category is required.`);
  }

  return categoryId;
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

  if (!ticketId) {
    throw new Error("Ticket ID is required for NLP enrichment.");
  }

  if (!text) {
    throw new Error("NLP enrichment text is required.");
  }

  const nowIso = new Date().toISOString();
  const runtimeSettings = await getConfiguredNlpRuntimeSettings(input.supabase);
  const threshold = runtimeSettings.threshold;
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
    const sentiment = normalizeSentiment(analysis.sentiment);
    const resolvedIntent = await resolveIntentLabel(input.supabase, analysis);
    const resolvedIssueType = await resolveIssueTypeLabel(input.supabase, analysis);
    const mappedCategory = resolvedIssueType
      ? await resolveCategoryFromIssueType(input.supabase, resolvedIssueType.id)
      : null;
    const suggestedCategory = mappedCategory ?? (await resolveCategoryFromAnalysis(input.supabase, analysis));
    const resolvedPriority =
      normalizePriority(analysis.priority) ?? mappedCategory?.defaultPriority ?? null;

    const missingIntentTaxonomy = !!asTrimmedString(analysis.detectedIntent) && !resolvedIntent;
    const missingIssueTaxonomy = !!asTrimmedString(analysis.issueType) && !resolvedIssueType;
    const missingCategoryTaxonomy =
      (!!asTrimmedString(analysis.categoryName) || !!asTrimmedString(analysis.categoryId)) &&
      !suggestedCategory;
    const skippedMissingTaxonomy =
      missingIntentTaxonomy || missingIssueTaxonomy || missingCategoryTaxonomy;
    const skippedLowConfidence = confidence === null || confidence < threshold;

    if (skippedLowConfidence || skippedMissingTaxonomy) {
      await insertTicketNlpAnalysis(input.supabase, {
        ticket_id: ticketId,
        input_text: text,
        model_provider: metadata.provider,
        model_name: metadata.name,
        model_version: metadata.version,
        prompt_version: metadata.promptVersion,
        sentiment,
        detected_intent_id: resolvedIntent?.id ?? null,
        detected_intent_raw: asNullableTrimmedString(analysis.detectedIntent),
        issue_type_id: resolvedIssueType?.id ?? null,
        issue_type_raw: asNullableTrimmedString(analysis.issueType),
        priority: resolvedPriority,
        category_id: suggestedCategory?.id ?? null,
        category_name_raw: asNullableTrimmedString(analysis.categoryName),
        confidence,
        raw_output: buildRawOutputPayload(analysis),
        status: "skipped",
        error_message: skippedLowConfidence
          ? confidence === null
            ? "Missing confidence from NLP response."
            : `Confidence ${confidence} below threshold ${threshold}.`
          : "Missing taxonomy mapping for NLP labels.",
        is_applied: false,
      });
      analysisRowWritten = true;

      return {
        analysis,
        nlpFieldsUpdated: false,
        categoryUpdated: false,
        skippedLowConfidence,
        skippedMissingTaxonomy,
        applied: false,
      };
    }

    const updates: Record<string, unknown> = {
      nlp_model_version: metadata.version,
      nlp_updated_at: nowIso,
      ...(confidence !== null ? { nlp_confidence: confidence } : {}),
      ...(sentiment ? { sentiment } : {}),
      ...(resolvedIntent
        ? {
            detected_intent_id: resolvedIntent.id,
            detected_intent: resolvedIntent.displayName,
          }
        : {}),
      ...(resolvedIssueType
        ? {
            issue_type_id: resolvedIssueType.id,
            issue_type: resolvedIssueType.displayName,
          }
        : {}),
      ...(resolvedPriority ? { priority: resolvedPriority } : {}),
    };

    let nlpFieldsUpdated = false;

    if (Object.keys(updates).length > 0) {
      const { error } = await input.supabase
        .from("tickets")
        .update(updates)
        .eq("id", ticketId);

      if (error) {
        throw new Error(`Failed to update NLP fields: ${error.message}`);
      }

      nlpFieldsUpdated = true;
    }

    let categoryUpdated = false;

    if (
      runtimeSettings.autoRoute &&
      input.allowCategoryOverride !== false &&
      input.uncategorizedCategoryId &&
      suggestedCategory?.id
    ) {
      const suggestedCategoryId = suggestedCategory.id;

      if (suggestedCategoryId !== input.uncategorizedCategoryId) {
        const { data, error } = await input.supabase
          .from("tickets")
          .update({ category_id: suggestedCategoryId })
          .eq("id", ticketId)
          .eq("category_id", input.uncategorizedCategoryId)
          .select("id")
          .maybeSingle();

        if (error) {
          throw new Error(`Failed to update ticket category: ${error.message}`);
        }

        categoryUpdated = !!asTrimmedString(data?.id);
      }
    }

    const applied = nlpFieldsUpdated || categoryUpdated;

    await insertTicketNlpAnalysis(input.supabase, {
      ticket_id: ticketId,
      input_text: text,
      model_provider: metadata.provider,
      model_name: metadata.name,
      model_version: metadata.version,
      prompt_version: metadata.promptVersion,
      sentiment,
      detected_intent_id: resolvedIntent?.id ?? null,
      detected_intent_raw: asNullableTrimmedString(analysis.detectedIntent),
      issue_type_id: resolvedIssueType?.id ?? null,
      issue_type_raw: asNullableTrimmedString(analysis.issueType),
      priority: resolvedPriority,
      category_id: suggestedCategory?.id ?? null,
      category_name_raw: asNullableTrimmedString(analysis.categoryName),
      confidence,
      raw_output: buildRawOutputPayload(analysis),
      status: "succeeded",
      error_message: null,
      is_applied: applied,
      ...(applied ? { applied_at: nowIso } : {}),
    });
    analysisRowWritten = true;

    return {
      analysis,
      nlpFieldsUpdated,
      categoryUpdated,
      skippedLowConfidence: false,
      skippedMissingTaxonomy: false,
      applied,
    };
  } catch (error) {
    if (!analysisRowWritten) {
      try {
        await insertTicketNlpAnalysis(input.supabase, {
          ticket_id: ticketId,
          input_text: text,
          model_provider: metadata.provider,
          model_name: metadata.name,
          model_version: metadata.version,
          prompt_version: metadata.promptVersion,
          sentiment: analysis ? normalizeSentiment(analysis.sentiment) : null,
          detected_intent_id: analysis ? asUuidOrNull(analysis.detectedIntentId) : null,
          detected_intent_raw: analysis ? asNullableTrimmedString(analysis.detectedIntent) : null,
          issue_type_id: analysis ? asUuidOrNull(analysis.issueTypeId) : null,
          issue_type_raw: analysis ? asNullableTrimmedString(analysis.issueType) : null,
          priority: analysis ? normalizePriority(analysis.priority) : null,
          category_id: analysis ? asUuidOrNull(analysis.categoryId) : null,
          category_name_raw: analysis ? asNullableTrimmedString(analysis.categoryName) : null,
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
