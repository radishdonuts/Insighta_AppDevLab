import { jsonError } from "@/app/api/admin/_utils";
import {
  requireAdminApiAuth,
} from "@/lib/admin/categories";

export const runtime = "nodejs";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireAdminApiAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  void request;
  void context;
  return jsonError(403, "Category management is locked.", "Complaint categories are fixed and cannot be updated.");
}
