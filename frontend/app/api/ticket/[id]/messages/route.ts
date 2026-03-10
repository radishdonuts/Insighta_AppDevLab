import { NextResponse } from "next/server";

import { jsonError, jsonServerError, parseJsonRequestBody } from "@/lib/api/staff-utils";
import { getSupabaseServerClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function requireOwnedTicket(ticketId: string, userId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("tickets")
    .select("id")
    .eq("id", ticketId)
    .eq("customer_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to authorize ticket access: ${error.message}`);
  }

  return { supabase, ok: !!data?.id };
}

async function requireCustomerAccess(ticketId: string) {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return { ok: false as const, response: jsonError(401, "Sign in to view ticket messages.") };
  }

  const access = await requireOwnedTicket(ticketId, user.id);
  if (!access.ok) {
    return { ok: false as const, response: jsonError(403, "You do not have access to this ticket.") };
  }

  return { ok: true as const, userId: user.id, supabase: access.supabase };
}

export async function GET(_request: Request, context: RouteContext) {
  const ticketId = context.params.id;
  if (!isUuid(ticketId)) {
    return jsonError(400, "Invalid ticket ID.");
  }

  try {
    const auth = await requireCustomerAccess(ticketId);
    if (!auth.ok) return auth.response;

    const { data, error } = await auth.supabase
      .from("ticket_messages")
      .select(
        `id, content, sender_type, created_at,
         sender:profiles!ticket_messages_sender_id_fkey (id, email, first_name, last_name)`
      )
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[ticket/messages] Fetch failed:", error.message);
      return jsonError(500, "Failed to fetch messages.");
    }

    const messages = (data ?? []).map((row: Record<string, unknown>) => {
      const sender = row.sender as { id?: string; email?: string; first_name?: string; last_name?: string } | null;
      const firstName = sender?.first_name ?? null;
      const lastName = sender?.last_name ?? null;
      const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || sender?.email || "Unknown";

      return {
        id: row.id,
        content: row.content,
        senderType: row.sender_type,
        createdAt: row.created_at,
        sender: sender
          ? {
              id: sender.id,
              email: sender.email ?? null,
              firstName,
              lastName,
              displayName,
            }
          : null,
      };
    });

    return NextResponse.json({ messages });
  } catch (error) {
    return jsonServerError(error, "Failed to load messages.");
  }
}

export async function POST(request: Request, context: RouteContext) {
  const ticketId = context.params.id;
  if (!isUuid(ticketId)) {
    return jsonError(400, "Invalid ticket ID.");
  }

  let body: Record<string, unknown>;
  try {
    body = await parseJsonRequestBody(request);
  } catch (error) {
    return jsonError(400, error instanceof Error ? error.message : "Invalid JSON.");
  }

  const content = asString(body.content) ?? "";
  if (!content) {
    return jsonError(400, "Message content is required.");
  }
  if (content.length > 5000) {
    return jsonError(400, "Message must be 5000 characters or fewer.");
  }

  try {
    const auth = await requireCustomerAccess(ticketId);
    if (!auth.ok) return auth.response;

    const { data, error } = await auth.supabase
      .from("ticket_messages")
      .insert({
        ticket_id: ticketId,
        sender_id: auth.userId,
        sender_type: "customer",
        content,
      })
      .select("id, content, sender_type, created_at")
      .single();

    if (error) {
      console.error("[ticket/messages] Insert failed:", error.message);
      return jsonError(500, "Failed to send message.");
    }

    return NextResponse.json({ message: "Message sent.", data }, { status: 201 });
  } catch (error) {
    return jsonServerError(error, "Failed to send message.");
  }
}
