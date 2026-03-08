import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { jsonError, jsonServerError, parseJsonRequestBody } from "@/lib/api/admin-utils";
import { requireAnyRole } from "@/lib/auth/api-guards";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const MIN_PASSWORD_LENGTH = 8;

type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

function readStringField(body: Record<string, unknown>, key: keyof ChangePasswordInput): string {
  const value = body[key];
  return typeof value === "string" ? value : "";
}

function readInput(body: Record<string, unknown>): ChangePasswordInput {
  return {
    currentPassword: readStringField(body, "currentPassword"),
    newPassword: readStringField(body, "newPassword"),
    confirmPassword: readStringField(body, "confirmPassword"),
  };
}

function validateInput(input: ChangePasswordInput): string | null {
  if (!input.currentPassword) return "Current password is required.";
  if (!input.newPassword) return "New password is required.";
  if (!input.confirmPassword) return "Please confirm your new password.";
  if (input.newPassword.length < MIN_PASSWORD_LENGTH) {
    return `New password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  }
  if (input.newPassword !== input.confirmPassword) {
    return "New password and confirm password do not match.";
  }
  if (input.newPassword === input.currentPassword) {
    return "New password must be different from the current password.";
  }

  return null;
}

export async function POST(request: Request) {
  const authResult = await requireAnyRole(["Customer", "Staff"]);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const body = await parseJsonRequestBody(request);
    const input = readInput(body);
    const validationError = validateInput(input);

    if (validationError) {
      return jsonError(400, "Invalid request.", validationError);
    }

    const authClient = await createClient();
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user || !user.email) {
      return jsonError(401, "Authentication required.");
    }

    const verifyClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { error: verifyError } = await verifyClient.auth.signInWithPassword({
      email: user.email,
      password: input.currentPassword,
    });

    if (verifyError) {
      return jsonError(400, "Invalid request.", "Current password is incorrect.");
    }

    const { error: updateError } = await authClient.auth.updateUser({
      password: input.newPassword,
    });

    if (updateError) {
      return jsonError(400, "Unable to update password.", updateError.message);
    }

    return NextResponse.json({ message: "Password updated successfully." });
  } catch (error) {
    return jsonServerError(error, "Failed to update password.");
  }
}
