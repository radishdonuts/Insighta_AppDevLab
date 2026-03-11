import type {
  AdminCreateStaffAccountRequest,
  AdminCreateStaffAccountResponse,
} from "@/types/admin-stats";
import {
  asTrimmedString,
  sleep,
  type AdminSupabaseServerClient,
} from "@/lib/admin/common";

type JsonObject = Record<string, unknown>;

type StaffAccountCreateConflict = { ok: false; reason: "conflict"; message: string };
type StaffAccountCreateValidation = { ok: false; reason: "validation"; message: string };
type StaffAccountCreateSuccess = { ok: true; data: AdminCreateStaffAccountResponse };

export type CreateStaffAccountResult =
  | StaffAccountCreateConflict
  | StaffAccountCreateValidation
  | StaffAccountCreateSuccess;

export { getAdminSupabase } from "@/lib/admin/common";
export { requireAdminApiAuth } from "@/lib/admin/common";

function isEmailLike(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const DEFAULT_STAFF_PASSWORD = "staff123";

export function parseCreateStaffAccountRequest(body: JsonObject): AdminCreateStaffAccountRequest {
  const email = asTrimmedString(body.email).toLowerCase();
  const firstName = asTrimmedString(body.firstName);
  const lastName = asTrimmedString(body.lastName);

  if (!email) {
    throw new Error("Email is required.");
  }

  if (!isEmailLike(email)) {
    throw new Error("Email must be a valid email address.");
  }

  if (!firstName) {
    throw new Error("First name is required.");
  }

  if (!lastName) {
    throw new Error("Last name is required.");
  }

  return {
    email,
    firstName,
    lastName,
  };
}

async function promoteProfileToStaff(
  supabase: AdminSupabaseServerClient,
  userId: string,
  input: AdminCreateStaffAccountRequest
) {
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        role: "Staff",
        is_active: true,
      })
      .eq("id", userId)
      .select("id, email, first_name, last_name, role, is_active")
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update Staff profile role: ${error.message}`);
    }

    if (data?.id) {
      return data;
    }

    await sleep(250);
  }

  throw new Error("Profile row was not found after creating auth user. The profile trigger may be delayed.");
}

function isAuthConflictMessage(message: string) {
  return /already|exists|registered|duplicate/i.test(message);
}

export async function createStaffAccount(
  supabase: AdminSupabaseServerClient,
  input: AdminCreateStaffAccountRequest
): Promise<CreateStaffAccountResult> {
  if (!input.email) {
    return { ok: false, reason: "validation", message: "Email is required." };
  }

  if (!input.firstName) {
    return { ok: false, reason: "validation", message: "First name is required." };
  }

  if (!input.lastName) {
    return { ok: false, reason: "validation", message: "Last name is required." };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: DEFAULT_STAFF_PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name: input.firstName,
      last_name: input.lastName,
    },
  });

  if (error) {
    if (isAuthConflictMessage(error.message)) {
      return {
        ok: false,
        reason: "conflict",
        message: "An account with this email already exists.",
      };
    }

    throw new Error(`Failed to create auth user: ${error.message}`);
  }

  const userId = data.user?.id;
  if (!userId) {
    throw new Error("Supabase did not return a user ID after creating the Staff account.");
  }

  const profile = await promoteProfileToStaff(supabase, userId, input);

  return {
    ok: true,
    data: {
      message: "Staff account created successfully. Default password is staff123.",
      account: {
        id: String(profile.id),
        email: typeof profile.email === "string" ? profile.email : input.email,
        firstName: typeof profile.first_name === "string" ? profile.first_name : input.firstName,
        lastName: typeof profile.last_name === "string" ? profile.last_name : input.lastName,
        role: "Staff",
        isActive: profile.is_active === true,
      },
    },
  };
}
