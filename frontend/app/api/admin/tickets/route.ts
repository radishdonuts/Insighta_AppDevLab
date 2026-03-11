import { NextResponse } from "next/server";

import { jsonServerError } from "@/lib/api/staff-utils";
import {
  getStaffSupabase,
  listStaffTickets,
  parseStaffQueueFilters,
  requireAdminApiAuth,
} from "@/lib/staff/ticket-workspace";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await requireAdminApiAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const searchParams = new URL(request.url).searchParams;
    const filters = parseStaffQueueFilters(searchParams, { tab: "all", assignment: "all" });
    const response = await listStaffTickets(getStaffSupabase(), filters, authResult.auth);
    return NextResponse.json(response);
  } catch (error) {
    return jsonServerError(error, "Failed to load admin tickets.");
  }
}
