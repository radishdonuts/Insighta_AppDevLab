import { NextResponse } from "next/server";

import {
  CANONICAL_COMPLAINT_CATEGORIES,
} from "@/lib/nlp/taxonomy";

export const runtime = "nodejs";

export async function GET() {
  try {
    const categories = CANONICAL_COMPLAINT_CATEGORIES
      .map((name) => ({ id: name, name }));

    return NextResponse.json({ ok: true, categories });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Failed to load categories." },
      { status: 500 }
    );
  }
}
