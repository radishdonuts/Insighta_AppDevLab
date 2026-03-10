import { NextResponse } from "next/server";

import { jsonError, jsonServerError } from "@/lib/api/staff-utils";
import {
  getStaffSupabase,
  getStaffTicketDetail,
  isUuid,
  requireAdminApiAuth,
} from "@/lib/staff/ticket-workspace";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: { ticketId: string } }
) {
  const authResult = await requireAdminApiAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  const ticketId = context.params.ticketId;
  if (!isUuid(ticketId)) {
    return jsonError(400, "Invalid ticket ID.");
  }

  try {
    const detail = await getStaffTicketDetail(getStaffSupabase(), ticketId, authResult.auth);
    if (!detail) {
      return jsonError(404, "Ticket not found.");
    }

    return NextResponse.json(detail);
  } catch (error) {
    return jsonServerError(error, "Failed to load admin ticket detail.");
  }
}
