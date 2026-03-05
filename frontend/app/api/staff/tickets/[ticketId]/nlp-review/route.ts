import { NextResponse } from "next/server";

import { jsonError, jsonServerError, parseJsonRequestBody } from "@/app/api/staff/_utils";
import {
  getRequestIpAddress,
  getStaffSupabase,
  isUuid,
  logSystemActivity,
  requireStaffApiAuth,
} from "@/lib/staff/ticket-workspace";
import { TICKET_PRIORITIES } from "@/types/tickets";

export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;
type ActiveCategoryRow = { category_name?: unknown };
type TicketNlpRow = {
  id?: unknown;
  priority?: unknown;
  category_name?: unknown;
};

const PRIORITY_SET = new Set<string>(TICKET_PRIORITIES);
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
const CATEGORY_SET = new Set<string>(FIXED_CATEGORIES);

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

    const [ticketResult, categoriesResult] = await Promise.all([
      supabase
        .from("tickets")
        .select("id, priority, category_name")
        .eq("id", ticketId)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("complaint_categories")
        .select("category_name")
        .eq("is_active", true)
        .order("category_name", { ascending: true }),
    ]);

    if (ticketResult.error) {
      throw new Error(`Failed to load ticket NLP state: ${ticketResult.error.message}`);
    }

    if (!ticketResult.data?.id) {
      return jsonError(404, "Ticket not found.");
    }

    if (categoriesResult.error) {
      throw new Error(`Failed to load categories: ${categoriesResult.error.message}`);
    }

    const dbCategories = (Array.isArray(categoriesResult.data) ? categoriesResult.data : [])
      .map((row) => asTrimmedString((row as ActiveCategoryRow).category_name))
      .filter((value) => value && CATEGORY_SET.has(value));

    const finalCategories = dbCategories.length > 0 ? dbCategories : [...FIXED_CATEGORIES];
    const ticket = ticketResult.data as TicketNlpRow;

    return NextResponse.json({
      ticket: {
        id: asTrimmedString(ticket.id),
        priority: asNullableTrimmedString(ticket.priority) ?? "Medium",
        categoryName: asNullableTrimmedString(ticket.category_name),
        categoryId: asNullableTrimmedString(ticket.category_name),
      },
      options: {
        priorities: [...TICKET_PRIORITIES],
        categories: finalCategories.map((name) => ({ id: name, name })),
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
    const analysisId = readOptionalNullableString(body, "analysisId") ?? null;

    const correctedPriorityRaw = readOptionalNullableString(body, "correctedPriority");
    if (correctedPriorityRaw !== undefined && correctedPriorityRaw !== null && !PRIORITY_SET.has(correctedPriorityRaw)) {
      return jsonError(400, `correctedPriority must be one of: ${TICKET_PRIORITIES.join(", ")}`);
    }

    const correctedCategoryName = readOptionalNullableString(body, "correctedCategoryName");
    if (correctedCategoryName !== undefined && correctedCategoryName !== null && !CATEGORY_SET.has(correctedCategoryName)) {
      return jsonError(400, "correctedCategoryName is invalid.");
    }

    const notes = readOptionalNullableString(body, "notes") ?? null;

    const hasAnyCorrection = [
      correctedPriorityRaw,
      correctedCategoryName,
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

    const { error: reviewError } = await supabase.from("ticket_nlp_reviews").insert({
      ticket_id: ticketId,
      analysis_id: analysisId,
      reviewer_id: authResult.auth.userId,
      corrected_priority: correctedPriorityRaw ?? null,
      corrected_category_name: correctedCategoryName ?? null,
      notes,
    });

    if (reviewError) {
      throw new Error(`Failed to save NLP review: ${reviewError.message}`);
    }

    const ticketUpdates: Record<string, unknown> = {
      nlp_updated_at: new Date().toISOString(),
    };

    if (correctedPriorityRaw !== undefined && correctedPriorityRaw !== null) {
      ticketUpdates.priority = correctedPriorityRaw;
    }

    if (correctedCategoryName !== undefined && correctedCategoryName !== null) {
      ticketUpdates.category_name = correctedCategoryName;
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
