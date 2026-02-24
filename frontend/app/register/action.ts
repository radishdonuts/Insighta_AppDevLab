"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function registerUser(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const firstName = String(formData.get("first_name") || "").trim();
  const lastName = String(formData.get("last_name") || "").trim();

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  });

  if (error) return { ok: false, message: error.message };

  redirect(`/login?registered=1&email=${encodeURIComponent(email)}`);
  // Edit code in register for email prefill, registered = 1 is for registered succecssfully message

}