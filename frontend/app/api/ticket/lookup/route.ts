import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

const GUEST_ACCESS_COOKIE = "ticket_guest_access";
const STAFF_ROLE_SET = new Set(["staff", "admin"]);

type LookupTicketRow = {
  id?: unknown;
  ticket_number?: unknown;
  ticket_type?: unknown;
  title?: unknown;
  status?: unknown;
  priority?: unknown;
  description?: unknown;
  submitted_at?: unknown;
  last_updated_at?: unknown;
  category_name?: unknown;
  customer_id?: unknown;
};

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function getGuestAccessSecret(): string {
  return process.env.TICKET_GUEST_ACCESS_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "guest-access-secret";
}

function signGuestAccessToken(tokenHash: string): string {
  return createHmac("sha256", getGuestAccessSecret()).update(tokenHash, "utf8").digest("hex");
}

function hasGuestAccessCookie(request: Request, token: string): boolean {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookieValue = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${GUEST_ACCESS_COOKIE}=`))
    ?.slice(GUEST_ACCESS_COOKIE.length + 1);

  if (!cookieValue) return false;

  const [storedHash, storedSignature] = cookieValue.split(".");
  const tokenHash = sha256Hex(token);
  if (!storedHash || !storedSignature || storedHash !== tokenHash) return false;

  const expected = Buffer.from(signGuestAccessToken(storedHash), "utf8");
  const provided = Buffer.from(storedSignature, "utf8");
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

async function isAuthorizedViewer(ticket: LookupTicketRow | null): Promise<boolean> {
  const ticketId = asString(ticket?.id);
  if (!ticketId) return false;

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) return false;
  if (asString(ticket?.customer_id) === user.id) return true;

  const supabase = getSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .limit(1)
    .maybeSingle();

  const role = asString(profile?.role);
  return profile?.is_active === true && !!role && STAFF_ROLE_SET.has(role);
}

function buildLookupTicketPayload(input: {
  ticket: LookupTicketRow | null;
  trackingNumber: string;
}) {
  const ticket = input.ticket;
  return {
    id: asString(ticket?.id),
    reference: asString(ticket?.ticket_number) ?? input.trackingNumber,
    ticket_number: asString(ticket?.ticket_number),
    ticketType: asString(ticket?.ticket_type),
    ticket_type: asString(ticket?.ticket_type),
    title: asString(ticket?.title),
    status: asString(ticket?.status),
    priority: asString(ticket?.priority),
    categoryName: asString(ticket?.category_name),
    category_name: asString(ticket?.category_name),
    description: asString(ticket?.description),
    submittedAt: asString(ticket?.submitted_at),
    submitted_at: asString(ticket?.submitted_at),
    lastUpdatedAt: asString(ticket?.last_updated_at),
    last_updated_at: asString(ticket?.last_updated_at),
    guest_tracking_number: input.trackingNumber,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json({ ok: false, message: "Missing token." }, { status: 400 });
  }

  const supabase = await createClient();
  const tokenHash = sha256Hex(token);
  const nowIso = new Date().toISOString();

  const baseSelect = `
        ticket_id,
        expires_at,
        ticket:tickets!ticket_access_tokens_ticket_id_fkey (
          id,
          ticket_number,
          ticket_type,
          title,
          status,
          priority,
          description,
          submitted_at,
          last_updated_at,
          category_name,
          customer_id
        )
      `;

  const { data: plainRow, error: plainError } = await supabase
    .from("ticket_access_tokens")
    .select(baseSelect)
    .eq("token_hash", token)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .limit(1)
    .maybeSingle();

  if (plainError) {
    return NextResponse.json({ ok: false, message: "Lookup failed." }, { status: 500 });
  }

  let row = plainRow;
  let matchedTokenHash = row?.ticket_id ? token : "";

  if (!row?.ticket_id) {
    const { data: hashedRow, error } = await supabase
      .from("ticket_access_tokens")
      .select(baseSelect)
      .eq("token_hash", tokenHash)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, message: "Lookup failed." }, { status: 500 });
    }

    row = hashedRow;
    matchedTokenHash = row?.ticket_id ? tokenHash : "";
  }

  if (!row?.ticket_id) {
    const writer = getSupabaseServerClient();
    const { data: ticketRow, error: ticketError } = await writer
      .from("tickets")
      .select(
        `
          id,
          ticket_number,
          ticket_type,
          title,
          status,
          priority,
          description,
          submitted_at,
          last_updated_at,
          category_name,
          customer_id
        `
      )
      .eq("ticket_number", token)
      .limit(1)
      .maybeSingle();

    if (ticketError) {
      return NextResponse.json({ ok: false, message: "Lookup failed." }, { status: 500 });
    }

    if (ticketRow?.id) {
      const ticketPayload = ticketRow as LookupTicketRow;
      const isAllowed = (await isAuthorizedViewer(ticketPayload)) || hasGuestAccessCookie(req, token);
      if (!isAllowed) {
        return NextResponse.json({ ok: false, otpRequired: true, message: "OTP verification is required." }, { status: 401 });
      }

      return NextResponse.json({
        ok: true,
        ticket: buildLookupTicketPayload({
          ticket: ticketPayload,
          trackingNumber: token,
        }),
      });
    }

    return NextResponse.json({ ok: false, message: "Invalid or expired link." }, { status: 404 });
  }

  const ticket = Array.isArray(row.ticket) ? row.ticket[0] : row.ticket;
  const ticketObject = ticket && typeof ticket === "object" ? ticket : null;
  const ticketPayload = ticketObject as LookupTicketRow | null;
  const isAllowed = (await isAuthorizedViewer(ticketPayload)) || hasGuestAccessCookie(req, token);

  if (!isAllowed) {
    return NextResponse.json({ ok: false, otpRequired: true, message: "OTP verification is required." }, { status: 401 });
  }

  void (async () => {
    try {
      const writer = getSupabaseServerClient();
      const targetHash = matchedTokenHash || tokenHash;
      await writer
        .from("ticket_access_tokens")
        .update({ used_at: nowIso })
        .eq("token_hash", targetHash);
    } catch {}
  })();

  return NextResponse.json({
    ok: true,
    ticket: buildLookupTicketPayload({
      ticket: ticketPayload,
      trackingNumber: token,
    }),
  });
}
