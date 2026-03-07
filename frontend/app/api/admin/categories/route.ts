import { NextResponse } from "next/server";

import { jsonError, jsonServerError } from "@/lib/api/admin-utils";
import {
  getAdminCategories,
  getAdminSupabase,
  requireAdminApiAuth,
} from "@/lib/admin/categories";

export const runtime = "nodejs";

export async function GET() {
  const authResult = await requireAdminApiAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const data = await getAdminCategories(getAdminSupabase());
    return NextResponse.json(data);
  } catch (error) {
    return jsonServerError(error, "Failed to load complaint categories.");
  }
}

export async function POST(request: Request) {
  const authResult = await requireAdminApiAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  void request;
  return jsonError(403, "Category management is locked.", "Complaint categories are fixed and cannot be created.");
}

