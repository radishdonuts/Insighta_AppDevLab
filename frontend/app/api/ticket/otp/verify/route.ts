import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

const MAX_ATTEMPTS = 5;

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export async function POST(req: Request) {
  let body: { token?: string; otp?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const otp = typeof body.otp === "string" ? body.otp.trim() : "";

  if (!token) {
    return NextResponse.json({ ok: false, message: "Missing tracking token." }, { status: 400 });
  }
  if (!otp || !/^\d{6}$/.test(otp)) {
    return NextResponse.json({ ok: false, message: "Invalid OTP. Please enter the 6-digit code." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const tokenHash = sha256Hex(token);
  const nowIso = new Date().toISOString();

  // Resolve the ticket_id from the token (plain text or hashed)
  const { data: tokenRow } = await supabase
    .from("ticket_access_tokens")
    .select("ticket_id")
    .eq("token_hash", token)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .limit(1)
    .maybeSingle();

  let ticketId = tokenRow?.ticket_id;

  if (!ticketId) {
    const { data: hashedTokenRow } = await supabase
      .from("ticket_access_tokens")
      .select("ticket_id")
      .eq("token_hash", tokenHash)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .limit(1)
      .maybeSingle();

    ticketId = hashedTokenRow?.ticket_id;
  }

  if (!ticketId) {
    const { data: ticketRow } = await supabase
      .from("tickets")
      .select("id")
      .eq("ticket_number", token)
      .limit(1)
      .maybeSingle();

    ticketId = ticketRow?.id;
  }

  if (!ticketId) {
    return NextResponse.json({ ok: false, message: "Invalid or expired tracking token." }, { status: 404 });
  }

  // Find the latest unexpired OTP for this ticket
  const { data: otpRow, error: otpError } = await supabase
    .from("ticket_otp_codes")
    .select("id, otp_hash, attempts")
    .eq("ticket_id", ticketId)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (otpError || !otpRow) {
    return NextResponse.json(
      { ok: false, message: "No active OTP found. Please request a new one." },
      { status: 400 }
    );
  }

  // Check attempt limit
  const attempts = typeof otpRow.attempts === "number" ? otpRow.attempts : 0;
  if (attempts >= MAX_ATTEMPTS) {
    // Invalidate the OTP
    await supabase.from("ticket_otp_codes").delete().eq("id", otpRow.id);
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Please request a new OTP." },
      { status: 429 }
    );
  }

  // Verify OTP
  const otpHash = sha256Hex(otp);
  if (otpHash !== otpRow.otp_hash) {
    // Increment attempts
    await supabase
      .from("ticket_otp_codes")
      .update({ attempts: attempts + 1 })
      .eq("id", otpRow.id);

    const remaining = MAX_ATTEMPTS - attempts - 1;
    return NextResponse.json(
      {
        ok: false,
        message: remaining > 0
          ? `Incorrect OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
          : "Incorrect OTP. Please request a new code.",
      },
      { status: 400 }
    );
  }

  // OTP is valid — clean up
  await supabase.from("ticket_otp_codes").delete().eq("id", otpRow.id);

  return NextResponse.json({ ok: true, ticketId });
}
