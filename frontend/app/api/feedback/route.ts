import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const FEEDBACK_CATEGORIES = [
  "overall_experience",
  "speed_turnaround_time",
  "communication_updates",
  "resolution_quality_fairness",
  "ease_of_process",
  "staff_helpfulness_professionalism",
  "platform_app_website_experience",
] as const;

type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, "Request body must be valid JSON.");
  }

  const ratingsInput = (body.ratings ?? null) as Record<string, unknown> | null;
  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 500) : "";

  if (!ratingsInput || typeof ratingsInput !== "object" || Array.isArray(ratingsInput)) {
    return jsonError(400, 'Ratings are required as an object under "ratings".');
  }

  const parsedRatings: Record<FeedbackCategory, number> = {
    overall_experience: 0,
    speed_turnaround_time: 0,
    communication_updates: 0,
    resolution_quality_fairness: 0,
    ease_of_process: 0,
    staff_helpfulness_professionalism: 0,
    platform_app_website_experience: 0,
  };

  for (const category of FEEDBACK_CATEGORIES) {
    const value = ratingsInput[category];
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
      return jsonError(400, `Rating for "${category}" must be an integer between 1 and 5.`);
    }
    parsedRatings[category] = value;
  }

  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    const supabase = getSupabaseServerClient();
    const insertPayload: Record<string, unknown> = {
      rating: parsedRatings.overall_experience,
      comment: comment || null,
      submitted_by_user_id: user?.id ?? null,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("feedback")
      .insert(insertPayload)
      .select("id, rating, comment, submitted_at")
      .single();

    if (insertError) {
      console.error("[feedback-universal] Insert failed:", insertError.message);
      return jsonError(500, "Failed to submit feedback.");
    }

    const feedbackId = typeof inserted?.id === "string" ? inserted.id : null;
    if (!feedbackId) {
      return jsonError(500, "Failed to submit feedback.");
    }

    const categoryRows = FEEDBACK_CATEGORIES.map((category) => ({
      feedback_id: feedbackId,
      category,
      rating: parsedRatings[category],
    }));

    const { error: ratingsError } = await supabase.from("feedback_category_ratings").insert(categoryRows);
    if (ratingsError) {
      await supabase.from("feedback").delete().eq("id", feedbackId);
      console.error("[feedback-universal] Rating insert failed:", ratingsError.message);
      return jsonError(500, "Failed to submit feedback.");
    }

    return NextResponse.json(
      {
        message: "Feedback submitted successfully.",
        feedback: {
          ...inserted,
          feedback_category_ratings: categoryRows.map((row) => ({
            category: row.category,
            rating: row.rating,
          })),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[feedback-universal] Unexpected error:", error);
    return jsonError(500, "Internal server error.");
  }
}
