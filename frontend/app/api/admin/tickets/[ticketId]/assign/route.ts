import { NextResponse } from "next/server";

import { jsonError, jsonServerError, parseJsonRequestBody } from "@/lib/api/staff-utils";
import {
  assignTicketToStaff,
  getRequestIpAddress,
  getStaffSupabase,
  isUuid,
  requireAdminApiAuth,
} from "@/lib/staff/ticket-workspace";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
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

  let assignedStaffId: string | null = null;
  try {
    const body = await parseJsonRequestBody(request);
    const raw = body.assignedStaffId;
    if (raw === null || raw === undefined || raw === "") {
      assignedStaffId = null;
    } else if (typeof raw === "string" && isUuid(raw)) {
      assignedStaffId = raw;
    } else {
      return jsonError(400, "assignedStaffId must be a staff UUID or null.");
    }
  } catch (error) {
    return jsonError(400, "Invalid request.", error instanceof Error ? error.message : "Invalid request body.");
  }

  try {
    const result = await assignTicketToStaff(
      getStaffSupabase(),
      ticketId,
      authResult.auth,
      assignedStaffId,
      getRequestIpAddress(request.headers)
    );

    if (!result.ok && result.reason === "not_found") {
      return jsonError(404, "Ticket not found.");
    }

    if (!result.ok && result.reason === "conflict") {
      return jsonError(409, "Conflict", result.message);
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return jsonServerError(error, "Failed to assign admin ticket.");
  }
}
