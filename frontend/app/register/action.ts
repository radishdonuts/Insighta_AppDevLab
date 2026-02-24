"use server";

import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function safeNextPath(value: string) {
  if (!value || !value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
}

function registerRedirect(path: string, params?: Record<string, string>) {
  const qs = new URLSearchParams(params ?? {});
  redirect(qs.size ? `${path}?${qs.toString()}` : path);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function promoteProfileToStaff(userId: string) {
  const admin = getSupabaseServerClient();

  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const { data, error } = await admin
      .from("profiles")
      .update({ role: "Staff", is_active: true })
      .eq("id", userId)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update profile role: ${error.message}`);
    }

    if (data?.id) {
      return;
    }

    await sleep(250);
  }

  throw new Error("Profile row was not found after signup. The profile trigger may not have completed yet.");
}

export async function registerAction(formData: FormData) {
  const firstName = readString(formData, "firstName");
  const lastName = readString(formData, "lastName");
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");
  const confirmPassword = readString(formData, "confirmPassword");
  const wantsDevStaffRole = readBoolean(formData, "bootstrapStaff");
  const next = safeNextPath(readString(formData, "next"));

  if (!email || !password) {
    registerRedirect("/register", { error: "Email and password are required.", next });
  }

  if (password.length < 6) {
    registerRedirect("/register", { error: "Password must be at least 6 characters.", next });
  }

  if (confirmPassword !== password) {
    registerRedirect("/register", { error: "Passwords do not match.", next });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName || undefined,
        last_name: lastName || undefined,
      },
    },
  });

  if (error) {
    registerRedirect("/register", { error: error.message, next });
  }

  const userId = data.user?.id;
  let message = "Registration successful.";

  if (wantsDevStaffRole && userId) {
    if (process.env.NODE_ENV === "production") {
      message = "Registration successful. Staff bootstrap is disabled in production.";
    } else {
      try {
        await promoteProfileToStaff(userId);
        message = "Registration successful. Your account was bootstrapped as Staff (development only).";
      } catch (promoteError) {
        registerRedirect("/login", {
          message: "Account created, but Staff bootstrap did not complete. Sign in, then update role in profiles table.",
          error: promoteError instanceof Error ? promoteError.message : "Failed to bootstrap Staff role.",
          next: "/staff",
        });
      }
    }
  }

  if (data.session) {
    registerRedirect(wantsDevStaffRole ? "/staff" : next || "/", { message });
  }

  registerRedirect("/login", {
    message: `${message} Sign in with your new account.`,
    next: wantsDevStaffRole ? "/staff" : next || "/",
  });
}
