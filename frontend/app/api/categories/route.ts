import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("complaint_categories")
      .select("id, category_name")
      .eq("is_active", true)
      .order("category_name", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const categories = (Array.isArray(data) ? data : [])
      .map((row) => {
        const id = typeof row.id === "string" ? row.id.trim() : "";
        const name = typeof row.category_name === "string" ? row.category_name.trim() : "";
        return id && name ? { id, name } : null;
      })
      .filter((entry): entry is { id: string; name: string } => entry !== null);

    return NextResponse.json({ ok: true, categories });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Failed to load categories." },
      { status: 500 }
    );
  }
}
