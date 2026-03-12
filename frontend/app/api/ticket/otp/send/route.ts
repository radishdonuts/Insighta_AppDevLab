import { createHash, randomInt } from "node:crypto";

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { sendOtpEmail, isEmailConfigured } from "@/lib/email";

const OTP_EXPIRY_MINUTES = 5;
const OTP_RATE_LIMIT_SECONDS = 60;

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***";
  const visible = local.slice(0, 1);
  return `${visible}${"*".repeat(Math.max(local.length - 1, 3))}@${domain}`;
}

/**
 * Resolves a tracking token to the ticket and guest email.
 * Tries plain-text match first, then SHA-256 hash.
 */
async function resolveTokenToOwnerEmail(token: string) {
  const supabase = getSupabaseServerClient();
  const tokenHash = sha256Hex(token);
  const nowIso = new Date().toISOString();

  const baseSelect = `
    ticket_id,
    expires_at,
    ticket:tickets!ticket_access_tokens_ticket_id_fkey (
      id,
      customer_id,
      guest_id,
      guest:guest_contacts!tickets_guest_id_fkey ( email ),
      customer:profiles!tickets_customer_id_fkey ( email )
    )
  `;

  // Try plain text first (legacy tokens stored as-is)
  const { data: plainRow } = await supabase
    .from("ticket_access_tokens")
    .select(baseSelect)
    .eq("token_hash", token)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .limit(1)
    .maybeSingle();

  let row = plainRow;

  if (!row?.ticket_id) {
    const { data: hashedRow } = await supabase
      .from("ticket_access_tokens")
      .select(baseSelect)
      .eq("token_hash", tokenHash)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .limit(1)
      .maybeSingle();

    row = hashedRow;
  }

  let ticket = Array.isArray(row?.ticket) ? row?.ticket[0] : row?.ticket;

  if (!row?.ticket_id) {
    const { data: ticketRow } = await supabase
      .from("tickets")
      .select(
        `
          id,
          customer_id,
          guest_id,
          guest:guest_contacts!tickets_guest_id_fkey ( email ),
          customer:profiles!tickets_customer_id_fkey ( email )
        `
      )
      .eq("ticket_number", token)
      .limit(1)
      .maybeSingle();

    if (!ticketRow?.id) return null;
    ticket = ticketRow;
  }

  if (!ticket || typeof ticket !== "object") return null;

  const ticketObj = ticket as {
    id?: string;
    customer_id?: string | null;
    guest_id?: string | null;
    guest?: { email?: string } | { email?: string }[] | null;
    customer?: { email?: string } | { email?: string }[] | null;
  };

  const customer = Array.isArray(ticketObj.customer) ? ticketObj.customer[0] : ticketObj.customer;
  const customerEmail = customer?.email?.trim() || null;
  if (ticketObj.customer_id && customerEmail) {
    return { ticketId: ticketObj.id ?? "", email: customerEmail };
  }

  const guest = Array.isArray(ticketObj.guest) ? ticketObj.guest[0] : ticketObj.guest;
  const email = guest?.email?.trim() || null;

  return { ticketId: ticketObj.id ?? "", email };
}

export async function POST(req: Request) {
  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json({ ok: false, message: "Missing tracking token." }, { status: 400 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Email service is not configured." },
      { status: 503 }
    );
  }

  const result = await resolveTokenToOwnerEmail(token);

  if (!result) {
    return NextResponse.json({ ok: false, message: "Invalid or expired tracking token." }, { status: 404 });
  }

  if (!result.email) {
    return NextResponse.json({ ok: false, message: "No email on file for this ticket." }, { status: 404 });
  }

  const supabase = getSupabaseServerClient();

  // Rate-limit: check if an unexpired OTP was sent recently
  const cutoff = new Date(Date.now() - OTP_RATE_LIMIT_SECONDS * 1000).toISOString();
  const { data: recentOtp } = await supabase
    .from("ticket_otp_codes")
    .select("id")
    .eq("ticket_id", result.ticketId)
    .gt("created_at", cutoff)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (recentOtp) {
    return NextResponse.json({
      ok: true,
      otpRequired: true,
      maskedEmail: maskEmail(result.email),
      message: "An OTP was already sent recently. Please check your email.",
    });
  }

  // Generate 6-digit OTP
  const otpCode = String(randomInt(100000, 999999));
  const otpHash = sha256Hex(otpCode);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  // Invalidate any old OTPs for this ticket
  await supabase
    .from("ticket_otp_codes")
    .delete()
    .eq("ticket_id", result.ticketId);

  // Store hashed OTP
  const { error: insertError } = await supabase
    .from("ticket_otp_codes")
    .insert({
      ticket_id: result.ticketId,
      otp_hash: otpHash,
      expires_at: expiresAt,
    });

  if (insertError) {
    return NextResponse.json({ ok: false, message: "Failed to generate OTP." }, { status: 500 });
  }

  // Send email
  try {
    await sendOtpEmail({ to: result.email, otp: otpCode });
  } catch {
    return NextResponse.json({ ok: false, message: "Failed to send OTP email." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    otpRequired: true,
    maskedEmail: maskEmail(result.email),
  });
}
