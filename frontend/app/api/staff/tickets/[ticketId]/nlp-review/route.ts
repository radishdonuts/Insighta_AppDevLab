import { NextResponse } from "next/server";

import { jsonError, jsonServerError, parseJsonRequestBody } from "@/app/api/staff/_utils";
import {
  getRequestIpAddress,
  getStaffSupabase,
  isUuid,
  logSystemActivity,
  requireStaffApiAuth,
} from "@/lib/staff/ticket-workspace";
import { TICKET_PRIORITIES, TICKET_SENTIMENTS } from "@/types/tickets";

export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;
type ActiveLabelRow = { id?: unknown; display_name?: unknown };
type ActiveCategoryRow = { id?: unknown; category_name?: unknown };
type TicketNlpRow = {
  id?: unknown;
  sentiment?: unknown;
  detected_intent?: unknown;
  detected_intent_id?: unknown;
  issue_type?: unknown;
  issue_type_id?: unknown;
  priority?: unknown;
  category_id?: unknown;
};

const SENTIMENT_SET = new Set<string>(TICKET_SENTIMENTS);
const PRIORITY_SET = new Set<string>(TICKET_PRIORITIES);

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableTrimmedString(value: unknown): string | null {
  const trimmed = asTrimmedString(value);
  return trimmed || null;
}

function hasOwn(body: JsonObject, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function readOptionalNullableString(body: JsonObject, key: string): string | null | undefined {
  if (!hasOwn(body, key)) return undefined;
  if (body[key] === null) return null;
  return asNullableTrimmedString(body[key]);
}

function validateOptionalUuid(value: string | null | undefined, field: string): string | null | undefined {
  if (value === undefined || value === null) return value;
  if (!isUuid(value)) {
    throw new Error(`${field} must be a valid UUID when provided.`);
  }
  return value;
}

async function resolveActiveIntentLabel(
  supabase: ReturnType<typeof getStaffSupabase>,
  id: string | null | undefined
) {
  if (!id) return null;

  const { data, error } = await supabase
    .from("nlp_intent_labels")
    .select("id, display_name")
    .eq("id", id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve intent label: ${error.message}`);
  }

  if (!data?.id || !data?.display_name) {
    throw new Error("correctedIntentId is invalid or inactive.");
  }

  return {
    id: asTrimmedString(data.id),
    displayName: asTrimmedString(data.display_name),
  };
}

async function resolveActiveIssueTypeLabel(
  supabase: ReturnType<typeof getStaffSupabase>,
  id: string | null | undefined
) {
  if (!id) return null;

  const { data, error } = await supabase
    .from("nlp_issue_type_labels")
    .select("id, display_name")
    .eq("id", id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve issue type label: ${error.message}`);
  }

  if (!data?.id || !data?.display_name) {
    throw new Error("correctedIssueTypeId is invalid or inactive.");
  }

  return {
    id: asTrimmedString(data.id),
    displayName: asTrimmedString(data.display_name),
  };
}

async function resolveActiveCategory(
  supabase: ReturnType<typeof getStaffSupabase>,
  id: string | null | undefined
) {
  if (!id) return null;

  const { data, error } = await supabase
    .from("complaint_categories")
    .select("id")
    .eq("id", id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve category: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error("correctedCategoryId is invalid or inactive.");
  }

  return asTrimmedString(data.id);
}

export async function GET(
  _request: Request,
  context: { params: { ticketId: string } }
) {
  const authResult = await requireStaffApiAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  const ticketId = context.params.ticketId;
  if (!isUuid(ticketId)) {
    return jsonError(400, "Invalid ticket ID.");
  }

  try {
    const supabase = getStaffSupabase();

    const [ticketResult, intentsResult, issueTypesResult, categoriesResult] = await Promise.all([
      supabase
        .from("tickets")
        .select("id, sentiment, detected_intent, detected_intent_id, issue_type, issue_type_id, priority, category_id")
        .eq("id", ticketId)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("nlp_intent_labels")
        .select("id, display_name")
        .eq("is_active", true)
        .order("display_name", { ascending: true }),
      supabase
        .from("nlp_issue_type_labels")
        .select("id, display_name")
        .eq("is_active", true)
        .order("display_name", { ascending: true }),
      supabase
        .from("complaint_categories")
        .select("id, category_name")
        .eq("is_active", true)
        .order("category_name", { ascending: true }),
    ]);

    if (ticketResult.error) {
      throw new Error(`Failed to load ticket NLP state: ${ticketResult.error.message}`);
    }

    if (!ticketResult.data?.id) {
      return jsonError(404, "Ticket not found.");
    }

    if (intentsResult.error) {
      throw new Error(`Failed to load intent labels: ${intentsResult.error.message}`);
    }

    if (issueTypesResult.error) {
      throw new Error(`Failed to load issue type labels: ${issueTypesResult.error.message}`);
    }

    if (categoriesResult.error) {
      throw new Error(`Failed to load categories: ${categoriesResult.error.message}`);
    }

    const ticket = ticketResult.data as TicketNlpRow;

    return NextResponse.json({
      ticket: {
        id: asTrimmedString(ticket.id),
        sentiment: asNullableTrimmedString(ticket.sentiment),
        detectedIntent: asNullableTrimmedString(ticket.detected_intent),
        detectedIntentId: asNullableTrimmedString(ticket.detected_intent_id),
        issueType: asNullableTrimmedString(ticket.issue_type),
        issueTypeId: asNullableTrimmedString(ticket.issue_type_id),
        priority: asNullableTrimmedString(ticket.priority) ?? "Medium",
        categoryId: asNullableTrimmedString(ticket.category_id),
      },
      options: {
        sentiments: [...TICKET_SENTIMENTS],
        priorities: [...TICKET_PRIORITIES],
        intents: (Array.isArray(intentsResult.data) ? intentsResult.data : [])
          .map((row) => row as ActiveLabelRow)
          .map((row) => ({
            id: asTrimmedString(row.id),
            displayName: asTrimmedString(row.display_name),
          }))
          .filter((item) => item.id && item.displayName),
        issueTypes: (Array.isArray(issueTypesResult.data) ? issueTypesResult.data : [])
          .map((row) => row as ActiveLabelRow)
          .map((row) => ({
            id: asTrimmedString(row.id),
            displayName: asTrimmedString(row.display_name),
          }))
          .filter((item) => item.id && item.displayName),
        categories: (Array.isArray(categoriesResult.data) ? categoriesResult.data : [])
          .map((row) => row as ActiveCategoryRow)
          .map((row) => ({
            id: asTrimmedString(row.id),
            name: asTrimmedString(row.category_name),
          }))
          .filter((item) => item.id && item.name),
      },
    });
  } catch (error) {
    return jsonServerError(error, "Failed to load NLP review options.");
  }
}

export async function PATCH(
  request: Request,
  context: { params: { ticketId: string } }
) {
  const authResult = await requireStaffApiAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  const ticketId = context.params.ticketId;
  if (!isUuid(ticketId)) {
    return jsonError(400, "Invalid ticket ID.");
  }

  let body: JsonObject;
  try {
    body = await parseJsonRequestBody(request);
  } catch (error) {
    return jsonError(400, "Invalid request.", error instanceof Error ? error.message : "Invalid request body.");
  }

  try {
    const analysisId = validateOptionalUuid(
      readOptionalNullableString(body, "analysisId"),
      "analysisId"
    ) ?? null;

    const correctedSentimentRaw = readOptionalNullableString(body, "correctedSentiment");
    if (correctedSentimentRaw !== undefined && correctedSentimentRaw !== null && !SENTIMENT_SET.has(correctedSentimentRaw)) {
      return jsonError(400, `correctedSentiment must be one of: ${TICKET_SENTIMENTS.join(", ")}`);
    }

    const correctedIntentId = validateOptionalUuid(
      readOptionalNullableString(body, "correctedIntentId"),
      "correctedIntentId"
    );
    const correctedIssueTypeId = validateOptionalUuid(
      readOptionalNullableString(body, "correctedIssueTypeId"),
      "correctedIssueTypeId"
    );
    const correctedCategoryId = validateOptionalUuid(
      readOptionalNullableString(body, "correctedCategoryId"),
      "correctedCategoryId"
    );

    const correctedPriorityRaw = readOptionalNullableString(body, "correctedPriority");
    if (correctedPriorityRaw !== undefined && correctedPriorityRaw !== null && !PRIORITY_SET.has(correctedPriorityRaw)) {
      return jsonError(400, `correctedPriority must be one of: ${TICKET_PRIORITIES.join(", ")}`);
    }

    const notes = readOptionalNullableString(body, "notes") ?? null;

    const hasAnyCorrection = [
      correctedSentimentRaw,
      correctedIntentId,
      correctedIssueTypeId,
      correctedPriorityRaw,
      correctedCategoryId,
      notes,
    ].some((value) => value !== undefined && value !== null && value !== "");

    if (!hasAnyCorrection) {
      return jsonError(400, "At least one correction field or notes must be provided.");
    }

    const supabase = getStaffSupabase();
    const { data: ticketExists, error: ticketCheckError } = await supabase
      .from("tickets")
      .select("id")
      .eq("id", ticketId)
      .limit(1)
      .maybeSingle();

    if (ticketCheckError) {
      throw new Error(`Failed to validate ticket: ${ticketCheckError.message}`);
    }

    if (!ticketExists?.id) {
      return jsonError(404, "Ticket not found.");
    }

    const resolvedIntent = await resolveActiveIntentLabel(supabase, correctedIntentId);
    const resolvedIssueType = await resolveActiveIssueTypeLabel(supabase, correctedIssueTypeId);
    const resolvedCategoryId = await resolveActiveCategory(supabase, correctedCategoryId);

    const { error: reviewError } = await supabase.from("ticket_nlp_reviews").insert({
      ticket_id: ticketId,
      analysis_id: analysisId,
      reviewer_id: authResult.auth.userId,
      corrected_sentiment: correctedSentimentRaw ?? null,
      corrected_intent_id: resolvedIntent?.id ?? null,
      corrected_issue_type_id: resolvedIssueType?.id ?? null,
      corrected_priority: correctedPriorityRaw ?? null,
      corrected_category_id: resolvedCategoryId ?? null,
      notes,
    });

    if (reviewError) {
      throw new Error(`Failed to save NLP review: ${reviewError.message}`);
    }

    const ticketUpdates: Record<string, unknown> = {
      nlp_updated_at: new Date().toISOString(),
    };

    if (correctedSentimentRaw !== undefined) {
      ticketUpdates.sentiment = correctedSentimentRaw;
    }

    if (correctedPriorityRaw !== undefined && correctedPriorityRaw !== null) {
      ticketUpdates.priority = correctedPriorityRaw;
    }

    if (correctedIntentId !== undefined) {
      ticketUpdates.detected_intent_id = resolvedIntent?.id ?? null;
      ticketUpdates.detected_intent = resolvedIntent?.displayName ?? null;
    }

    if (correctedIssueTypeId !== undefined) {
      ticketUpdates.issue_type_id = resolvedIssueType?.id ?? null;
      ticketUpdates.issue_type = resolvedIssueType?.displayName ?? null;
    }

    if (correctedCategoryId !== undefined && resolvedCategoryId) {
      ticketUpdates.category_id = resolvedCategoryId;
    }

    const { error: updateError } = await supabase
      .from("tickets")
      .update(ticketUpdates)
      .eq("id", ticketId);

    if (updateError) {
      throw new Error(`Failed to apply ticket NLP corrections: ${updateError.message}`);
    }

    await logSystemActivity(supabase, {
      userId: authResult.auth.userId,
      action: "staff_ticket_nlp_reviewed",
      entityType: "ticket",
      entityId: ticketId,
      ipAddress: getRequestIpAddress(request.headers),
    });

    return NextResponse.json({ message: "NLP review saved successfully." });
  } catch (error) {
    return jsonServerError(error, "Failed to save NLP review.");
  }
}
