import { NextResponse } from "next/server";

import { jsonServerError } from "@/app/api/admin/_utils";
import {
  getAdminCreatedVsResolved,
  getAdminSupabase,
  parseAdminStatsDateRange,
  requireAdminApiAuth,
} from "@/lib/admin/stats";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await requireAdminApiAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const searchParams = new URL(request.url).searchParams;
    const range = parseAdminStatsDateRange(searchParams);
    const granularity = searchParams.get("granularity") === "month" ? "month" : "week";
    const response = await getAdminCreatedVsResolved(getAdminSupabase(), range, granularity);
    return NextResponse.json(response);
  } catch (error) {
    return jsonServerError(error, "Failed to load created vs resolved stats.");
  }
}
