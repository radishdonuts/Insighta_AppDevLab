import { NextResponse } from "next/server";

export const runtime = "nodejs";

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/**
 * GET /api/ticket/[id]/feedback - deprecated.
 * Use /api/feedback for universal company feedback.
 */
export async function GET() {
  return jsonError(410, "Ticket-scoped feedback is deprecated. Use /api/feedback instead.");
}

/**
 * POST /api/ticket/[id]/feedback - deprecated.
 * Use /api/feedback for universal company feedback submissions.
 */
export async function POST() {
  return jsonError(410, "Ticket-scoped feedback is deprecated. Use /api/feedback instead.");
}
