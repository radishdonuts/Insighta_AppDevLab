import { randomUUID, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { requireAdminApiAuth } from "@/lib/admin/common";
import {
  buildNlpInputText,
  resolveUncategorizedCategoryId,
  runTicketNlpEnrichment,
} from "@/lib/nlp/ticket-enrichment";
import { getSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;

type NlpJobRow = {
  id?: unknown;
  ticket_id?: unknown;
  input_text?: unknown;
  status?: unknown;
  attempt_count?: unknown;
  locked_at?: unknown;
};

type TicketTextRow = {
  title?: unknown;
  description?: unknown;
  nlp_input_text?: unknown;
};

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_SECONDS = 30;
const STALE_LOCK_MINUTES = 10;

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asInteger(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.trunc(value);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string") {
    return String((error as { message?: unknown }).message);
  }
  return "Unexpected error.";
}

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_LIMIT;
  }
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new ApiError(400, "limit must be an integer.");
  }
  if (value < 1 || value > MAX_LIMIT) {
    throw new ApiError(400, `limit must be between 1 and ${MAX_LIMIT}.`);
  }
  return value;
}

async function parseBody(request: Request): Promise<{ limit: number }> {
  const rawBody = await request.text();
  if (!rawBody.trim()) {
    return { limit: DEFAULT_LIMIT };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApiError(400, "Request body must be a JSON object.");
  }

  const body = payload as JsonObject;
  return { limit: parseLimit(body.limit) };
}

function hasValidSecret(request: Request): boolean {
  const expected = asTrimmedString(process.env.NLP_REPROCESS_SECRET) || asTrimmedString(process.env.CRON_SECRET);
  const providedHeader = asTrimmedString(request.headers.get("x-nlp-reprocess-secret"));
  const authHeader = asTrimmedString(request.headers.get("authorization"));
  const providedBearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  const provided = providedHeader || providedBearer;

  if (!expected || !provided) return false;

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

async function ensureAuthorized(
  request: Request
): Promise<{ ok: true; method: "secret" | "admin" } | { ok: false; response: NextResponse }> {
  if (hasValidSecret(request)) {
    return { ok: true, method: "secret" };
  }

  const adminAuth = await requireAdminApiAuth();
  if (!adminAuth.ok) {
    return { ok: false, response: adminAuth.response };
  }

  return { ok: true, method: "admin" };
}

function computeRetryAvailableAt(attemptCount: number): string {
  const exponent = Math.max(0, attemptCount - 1);
  const backoffSeconds = Math.min(BASE_BACKOFF_SECONDS * (2 ** exponent), 60 * 30);
  return new Date(Date.now() + backoffSeconds * 1000).toISOString();
}

function asJobRow(value: unknown): NlpJobRow | null {
  if (!value || typeof value !== "object") return null;
  return value as NlpJobRow;
}

async function resolveTextForJob(input: {
  ticketId: string;
  jobInputText: string;
}) {
  if (input.jobInputText) return input.jobInputText;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("tickets")
    .select("title, description, nlp_input_text")
    .eq("id", input.ticketId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load ticket text for NLP job: ${error.message}`);
  }

  const row = (data ?? null) as TicketTextRow | null;
  const storedInput = asTrimmedString(row?.nlp_input_text);
  if (storedInput) return storedInput;

  const title = asTrimmedString(row?.title);
  const description = asTrimmedString(row?.description);
  return title || description ? buildNlpInputText(title, description) : "";
}

async function claimPendingJobs(input: { limit: number; workerId: string }) {
  const supabase = getSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const staleLockCutoffIso = new Date(Date.now() - STALE_LOCK_MINUTES * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("ticket_nlp_jobs")
    .select("id, ticket_id, input_text, status, attempt_count, locked_at")
    .or(
      [
        `and(status.eq.pending,available_at.lte.${nowIso})`,
        `and(status.eq.failed,available_at.lte.${nowIso})`,
        `and(status.eq.processing,locked_at.lte.${staleLockCutoffIso})`,
      ].join(",")
    )
    .lt("attempt_count", MAX_ATTEMPTS)
    .order("available_at", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(input.limit * 3);

  if (error) {
    throw new Error(`Failed to read NLP queue: ${error.message}`);
  }

  const candidates = (Array.isArray(data) ? data : [])
    .map(asJobRow)
    .filter((row): row is NlpJobRow => row !== null);

  const claimed: Array<{
    id: string;
    ticketId: string;
    inputText: string;
    attemptCount: number;
    reclaimedStaleLock: boolean;
  }> = [];

  for (const row of candidates) {
    if (claimed.length >= input.limit) break;

    const jobId = asTrimmedString(row.id);
    const ticketId = asTrimmedString(row.ticket_id);
    if (!jobId || !ticketId) continue;

    const currentStatus = asTrimmedString(row.status).toLowerCase();
    const isStaleProcessing = currentStatus === "processing";
    const attemptCount = asInteger(row.attempt_count, 0);
    const nextAttemptCount = attemptCount + 1;

    let claimQuery = supabase
      .from("ticket_nlp_jobs")
      .update({
        status: "processing",
        locked_at: nowIso,
        locked_by: input.workerId,
        updated_at: nowIso,
        attempt_count: nextAttemptCount,
      })
      .eq("id", jobId)
      .eq("status", isStaleProcessing ? "processing" : currentStatus);

    if (isStaleProcessing) {
      claimQuery = claimQuery.lte("locked_at", staleLockCutoffIso);
    } else {
      claimQuery = claimQuery.lte("available_at", nowIso);
    }

    const { data: updated, error: claimError } = await claimQuery
      .select("id, ticket_id, input_text, attempt_count")
      .maybeSingle();

    if (claimError || !updated) {
      continue;
    }

    claimed.push({
      id: asTrimmedString(updated.id),
      ticketId: asTrimmedString(updated.ticket_id),
      inputText: asTrimmedString(updated.input_text),
      attemptCount: asInteger(updated.attempt_count, nextAttemptCount),
      reclaimedStaleLock: isStaleProcessing,
    });
  }

  return claimed;
}

export async function POST(request: Request) {
  try {
    const auth = await ensureAuthorized(request);
    if (!auth.ok) return auth.response;

    const input = await parseBody(request);
    const workerId = randomUUID();
    const jobs = await claimPendingJobs({
      limit: input.limit,
      workerId,
    });

    const supabase = getSupabaseServerClient();
    let uncategorizedCategoryId: string | null = null;
    try {
      uncategorizedCategoryId = await resolveUncategorizedCategoryId(supabase);
    } catch (error) {
      console.warn("[nlp.jobs] Uncategorized fallback unavailable:", getErrorMessage(error));
    }

    let succeeded = 0;
    let failed = 0;
    let applied = 0;
    let reclaimedStaleLocks = 0;
    const errors: Array<{ ticketId: string; error: string }> = [];

    for (const job of jobs) {
      if (job.reclaimedStaleLock) reclaimedStaleLocks += 1;
      const nowIso = new Date().toISOString();
      const ticketId = asTrimmedString(job.ticketId);
      if (!ticketId) continue;

      try {
        const text = await resolveTextForJob({
          ticketId,
          jobInputText: job.inputText,
        });
        if (!text) {
          throw new Error("Ticket has no NLP input text.");
        }

        const result = await runTicketNlpEnrichment({
          supabase,
          ticketId,
          text,
          allowCategoryOverride: true,
          uncategorizedCategoryId,
        });

        const { error: updateError } = await supabase
          .from("ticket_nlp_jobs")
          .update({
            status: "succeeded",
            locked_at: null,
            locked_by: null,
            last_error: null,
            updated_at: nowIso,
          })
          .eq("id", job.id);

        if (updateError) {
          throw new Error(`Failed to update NLP job success status: ${updateError.message}`);
        }

        succeeded += 1;
        if (result.applied) applied += 1;
      } catch (error) {
        const message = getErrorMessage(error);
        failed += 1;
        errors.push({ ticketId, error: message });

        const retryAt = computeRetryAvailableAt(job.attemptCount);
        const { error: failUpdateError } = await supabase
          .from("ticket_nlp_jobs")
          .update({
            status: "failed",
            locked_at: null,
            locked_by: null,
            last_error: message,
            available_at: retryAt,
            updated_at: nowIso,
          })
          .eq("id", job.id);

        if (failUpdateError) {
          console.error("[nlp.jobs] failed to update failed job state", {
            jobId: job.id,
            error: failUpdateError.message,
          });
        }
      }
    }

    console.info("[nlp.jobs] completed", {
      authMethod: auth.method,
      workerId,
      claimed: jobs.length,
      succeeded,
      failed,
      applied,
      reclaimedStaleLocks,
    });

    return NextResponse.json({
      claimed: jobs.length,
      succeeded,
      failed,
      applied,
      reclaimedStaleLocks,
      errors,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error.status, error.message);
    }
    return jsonError(500, getErrorMessage(error));
  }
}
