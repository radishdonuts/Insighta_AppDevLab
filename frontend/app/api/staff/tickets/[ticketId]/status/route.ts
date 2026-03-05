import { createHash, randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { jsonError, jsonServerError, parseJsonRequestBody } from "@/app/api/staff/_utils";
import { isEmailConfigured, sendTicketStatusUpdatedEmail } from "@/lib/email";
import {
  getRequestIpAddress,
  getStaffSupabase,
  isUuid,
  parseStatusUpdateRequest,
  requireStaffApiAuth,
  updateStaffTicketStatus,
} from "@/lib/staff/ticket-workspace";

export const runtime = "nodejs";

type TicketNotifyRow = {
  ticket_number?: unknown;
  customer?: { email?: unknown } | Array<{ email?: unknown }> | null;
  guest?: { email?: unknown } | Array<{ email?: unknown }> | null;
  ticket_access_tokens?: Array<{ token_hash?: unknown }> | null;
};

const GUEST_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_GUEST_TRACKING_RETRIES = 4;
const TRACKING_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function pickTrackingNumber(tokens: unknown): string | null {
  if (!Array.isArray(tokens)) {
    return null;
  }

  const list = tokens
    .map((item) => asTrimmedString((item as { token_hash?: unknown })?.token_hash))
    .filter((value) => value.startsWith("TRK-"));

  return list[0] || null;
}

function buildGuestTrackingCode(): string {
  const bytes = randomBytes(12);
  let value = "";

  for (let index = 0; index < bytes.length; index += 1) {
    value += TRACKING_CODE_ALPHABET[bytes[index] % TRACKING_CODE_ALPHABET.length];
  }

  return `TRK-${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}`;
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === "string" ? maybeCode : undefined;
}

async function createGuestStatusToken(supabase: ReturnType<typeof getStaffSupabase>, ticketId: string) {
  for (let attempt = 1; attempt <= MAX_GUEST_TRACKING_RETRIES; attempt += 1) {
    const rawToken = buildGuestTrackingCode();

    const { error } = await supabase.from("ticket_access_tokens").insert({
      ticket_id: ticketId,
      token_hash: sha256Hex(rawToken),
      expires_at: new Date(Date.now() + GUEST_TOKEN_TTL_MS).toISOString(),
    });

    if (!error) {
      return rawToken;
    }

    if (getErrorCode(error) !== "23505") {
      console.error("[staff/status] Failed to create guest tracking token", {
        ticketId,
        error: error.message,
      });
      return null;
    }
  }

  return null;
}

async function sendStatusUpdatedEmailSafe(input: {
  ticketId: string;
  status: string;
  remarks?: string;
  feedbackUrl?: string | null;
}) {
  if (!isEmailConfigured()) {
    return;
  }

  const supabase = getStaffSupabase();
  const { data, error } = await supabase
    .from("tickets")
    .select(
      `
        ticket_number,
        customer:profiles!tickets_customer_id_fkey (email),
        guest:guest_contacts!tickets_guest_id_fkey (email),
        ticket_access_tokens!ticket_access_tokens_ticket_id_fkey (token_hash, created_at)
      `
    )
    .eq("id", input.ticketId)
    .order("created_at", { foreignTable: "ticket_access_tokens", ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[staff/status] Failed to load email recipient", {
      ticketId: input.ticketId,
      error: error.message,
    });
    return;
  }

  const row = (data ?? null) as TicketNotifyRow | null;
  const customer = firstRow(row?.customer);
  const guest = firstRow(row?.guest);
  const recipientEmail = asTrimmedString(customer?.email) || asTrimmedString(guest?.email);
  const ticketNumber = asTrimmedString(row?.ticket_number);
  const existingTrackingNumber = pickTrackingNumber(row?.ticket_access_tokens);

  if (!recipientEmail) {
    return;
  }

  const isGuestRecipient = !asTrimmedString(customer?.email) && !!asTrimmedString(guest?.email);
  const trackingNumber = isGuestRecipient
    ? (await createGuestStatusToken(supabase, input.ticketId)) || existingTrackingNumber
    : existingTrackingNumber || ticketNumber;

  if (!trackingNumber) return;
  const feedbackUrl = input.feedbackUrl ?? null;

  try {
    await sendTicketStatusUpdatedEmail({
      to: recipientEmail,
      trackingNumber,
      status: input.status,
      remarks: input.remarks,
      feedbackUrl,
    });
  } catch (notifyError) {
    console.error("[staff/status] Failed to send status update email", {
      ticketId: input.ticketId,
      recipientEmail,
      error: notifyError instanceof Error ? notifyError.message : "Unknown error",
    });
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

  let input: ReturnType<typeof parseStatusUpdateRequest>;
  try {
    const body = await parseJsonRequestBody(request);
    input = parseStatusUpdateRequest(body);
  } catch (error) {
    return jsonError(400, "Invalid request.", error instanceof Error ? error.message : "Invalid request body.");
  }

  try {
    const result = await updateStaffTicketStatus(
      getStaffSupabase(),
      ticketId,
      authResult.auth,
      input,
      getRequestIpAddress(request.headers)
    );

    if (!result.ok && result.reason === "not_found") {
      return jsonError(404, "Ticket not found.");
    }

    if (!result.ok && result.reason === "conflict") {
      return jsonError(409, "Conflict", result.message);
    }

    if (result.ok && result.data.message === "Ticket status updated successfully.") {
      const statusNormalized = result.data.ticket.status.trim().toLowerCase();
      const includeFeedback = statusNormalized === "resolved" || statusNormalized === "closed";
      const origin = new URL(request.url).origin;
      const feedbackUrl = includeFeedback
        ? `${origin}/feedback`
        : null;

      await sendStatusUpdatedEmailSafe({
        ticketId,
        status: result.data.ticket.status,
        remarks: input.remarks,
        feedbackUrl,
      });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return jsonServerError(error, "Failed to update ticket status.");
  }
}
