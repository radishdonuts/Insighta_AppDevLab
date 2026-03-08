import { STAFF_WORKSPACE_ROLES } from "@/types/auth";
import {
  STAFF_ASSIGNMENT_FILTERS,
  STAFF_TICKET_TABS,
  type StaffAssignRequest,
  type StaffAssignResponse,
  type StaffAssignmentFilter,
  type StaffCategorySummary,
  type StaffPersonSummary,
  type StaffQueueFilters,
  type StaffStatusUpdateRequest,
  type StaffStatusUpdateResponse,
  type StaffTicketDetail,
  type StaffTicketDetailResponse,
  type StaffTicketQueueItem,
  type StaffTicketQueueResponse,
  type StaffTicketTab,
  type StaffTicketStatusHistoryItem,
  type TicketFieldSource,
} from "@/types/staff-tickets";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/types/tickets";
import type { ApiRoleGuardSuccess } from "@/lib/auth/api-guards";
import { requireAnyRole } from "@/lib/auth/api-guards";
import {
  CANONICAL_COMPLAINT_CATEGORIES,
  normalizeCanonicalComplaintCategory,
} from "@/lib/nlp/taxonomy";
import { getSupabaseServerClient } from "@/lib/supabase";

type JsonObject = Record<string, unknown>;
type SupabaseServerClient = ReturnType<typeof getSupabaseServerClient>;

type RawProfile = {
  id?: unknown;
  email?: unknown;
  first_name?: unknown;
  last_name?: unknown;
};

type RawTicketAccessToken = {
  token_hash?: unknown;
};
type RawNlpAnalysisRow = {
  id?: unknown;
  priority?: unknown;
  category_name?: unknown;
  confidence?: unknown;
  status?: unknown;
  is_applied?: unknown;
  raw_output?: unknown;
  created_at?: unknown;
};

type MutationNotFound = { ok: false; reason: "not_found" };
type MutationConflict = { ok: false; reason: "conflict"; message: string };
type MutationSuccess<T> = { ok: true; data: T };

export type StaffMutationResult<T> = MutationNotFound | MutationConflict | MutationSuccess<T>;

const TICKET_STATUS_SET = new Set<string>(TICKET_STATUSES);
const TICKET_PRIORITY_SET = new Set<string>(TICKET_PRIORITIES);
const STAFF_TAB_SET = new Set<string>(STAFF_TICKET_TABS);
const STAFF_ASSIGNMENT_FILTER_SET = new Set<string>(STAFF_ASSIGNMENT_FILTERS);
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const STAFF_ATTACHMENT_SIGNED_URL_TTL_SECONDS = 60 * 60;
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "attachments";
export async function requireStaffApiAuth() {
  return requireAnyRole(STAFF_WORKSPACE_ROLES);
}

export function getStaffSupabase() {
  return getSupabaseServerClient();
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableTrimmedString(value: unknown): string | null {
  const trimmed = asTrimmedString(value);
  return trimmed || null;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asJsonObject(value: unknown): JsonObject | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value as JsonObject;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as JsonObject;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function isMissingColumnError(error: unknown, columnName: string): boolean {
  const message = asTrimmedString((error as { message?: unknown } | null)?.message).toLowerCase();
  if (!message.includes("column")) return false;
  const col = columnName.toLowerCase();
  return message.includes(col) || message.includes(`tickets.${col}`) || message.includes(`'${col}'`);
}

function isSourceColumnMissingError(error: unknown): boolean {
  return isMissingColumnError(error, "category_source") || isMissingColumnError(error, "priority_source");
}

function mapTicketFieldSource(value: unknown): TicketFieldSource {
  const raw = asTrimmedString(value);
  if (raw === "user" || raw === "nlp" || raw === "human_intervention" || raw === "default") {
    return raw;
  }
  return null;
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return (value[0] ?? null) as T | null;
  return (value ?? null) as T | null;
}

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function splitForwardedFor(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
}

function formatDisplayName(firstName: string | null, lastName: string | null, email: string | null): string {
  const full = [firstName, lastName].filter(Boolean).join(" ").trim();
  return full || email || "Unknown User";
}

function mapPerson(raw: RawProfile | null | undefined): StaffPersonSummary | null {
  if (!raw || typeof raw !== "object") return null;

  const id = asString(raw.id);
  if (!id) return null;

  const email = asNullableTrimmedString(raw.email);
  const firstName = asNullableTrimmedString(raw.first_name);
  const lastName = asNullableTrimmedString(raw.last_name);

  return {
    id,
    email,
    firstName,
    lastName,
    displayName: formatDisplayName(firstName, lastName, email),
  };
}

function mapCategoryNameToId(name: string | null): string | null {
  return normalizeCanonicalComplaintCategory(name);
}

function safeIso(value: unknown): string {
  return asString(value) ?? new Date(0).toISOString();
}

function inferSubmitterType(customerId: unknown, guestId: unknown): "Customer" | "Guest" | "Unknown" {
  if (asString(customerId)) return "Customer";
  if (asString(guestId)) return "Guest";
  return "Unknown";
}

function readTrackingCode(value: unknown): string | null {
  if (Array.isArray(value)) {
    const preferred = value
      .map((item) => readTrackingCode(item))
      .find((code) => typeof code === "string" && code.startsWith("TRK-"));
    if (preferred) return preferred;
    return null;
  }

  if (!value || typeof value !== "object") return null;
  const token = asNullableTrimmedString((value as RawTicketAccessToken).token_hash);
  return token && token.startsWith("TRK-") ? token : null;
}

function sanitizeSearchTerm(raw: string): string {
  return raw.replace(/[(),]/g, " ").replace(/\s+/g, " ").trim();
}

function mapQueueItem(row: any): StaffTicketQueueItem {
  const trackingCode = readTrackingCode(row?.ticket_access_tokens);
  const categoryName = asNullableTrimmedString(row?.category_name);

  return {
    id: asString(row?.id) ?? "",
    ticketNumber: trackingCode ?? asString(row?.ticket_number) ?? "",
    ticketType: asString(row?.ticket_type) ?? "",
    title: asNullableTrimmedString(row?.title),
    status: asString(row?.status) ?? "",
    priority: asString(row?.priority) ?? "",
    description: asString(row?.description) ?? "",
    submittedAt: safeIso(row?.submitted_at),
    lastUpdatedAt: safeIso(row?.last_updated_at),
    category: categoryName ? { id: categoryName, name: categoryName } : null,
    categorySource: mapTicketFieldSource(row?.category_source),
    prioritySource: mapTicketFieldSource(row?.priority_source),
    assignedStaff: mapPerson(row?.assigned_staff),
    submitterType: inferSubmitterType(row?.customer_id, row?.guest_id),
  };
}

function mapStatusHistoryItem(row: any): StaffTicketStatusHistoryItem {
  return {
    id: asString(row?.id) ?? "",
    oldStatus: asString(row?.old_status) ?? "",
    newStatus: asString(row?.new_status) ?? "",
    changedAt: safeIso(row?.changed_at),
    remarks: asNullableTrimmedString(row?.remarks),
    changedBy: mapPerson(row?.changed_by),
  };
}

function mapNlpSuggestion(row: RawNlpAnalysisRow | null | undefined) {
  if (!row) return null;
  const rawOutput = asJsonObject(row.raw_output);
  const prioritySourceRaw = asTrimmedString(rawOutput?.prioritySource ?? rawOutput?.priority_source);
  const prioritySource: "ml" | "rule" | null =
    prioritySourceRaw === "ml" || prioritySourceRaw === "rule" ? prioritySourceRaw : null;
  const suggestedCategoryName =
    asNullableTrimmedString(rawOutput?.suggestedCategoryName ?? rawOutput?.suggested_category_name) ??
    asNullableTrimmedString(row.category_name);
  const suggestedPriority =
    asNullableTrimmedString(rawOutput?.suggestedPriority ?? rawOutput?.suggested_priority) ??
    asNullableTrimmedString(row.priority);
  const confidenceCategory = asFiniteNumber(rawOutput?.confidenceCategory ?? rawOutput?.confidence_category ?? row.confidence);
  const confidencePriority = asFiniteNumber(rawOutput?.confidencePriority ?? rawOutput?.confidence_priority ?? row.confidence);

  return {
    analysisId: asNullableTrimmedString(row.id),
    status: asNullableTrimmedString(row.status),
    isApplied: row.is_applied === true,
    suggestedCategoryName,
    suggestedPriority,
    confidenceCategory,
    confidencePriority,
    prioritySource,
    createdAt: asNullableTrimmedString(row.created_at),
  };
}

async function createAttachmentSignedUrl(
  supabase: SupabaseServerClient,
  filePath: string
): Promise<string | null> {
  const trimmedPath = filePath.trim();
  if (!trimmedPath) return null;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(trimmedPath, STAFF_ATTACHMENT_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.warn("Failed to create attachment signed URL:", error?.message ?? "missing signed URL");
    return null;
  }

  return data.signedUrl;
}

export function parseStaffQueueFilters(searchParams: URLSearchParams): StaffQueueFilters {
  const tabRaw = asTrimmedString(searchParams.get("tab"));
  const statusRaw = asTrimmedString(searchParams.get("status"));
  const priorityRaw = asTrimmedString(searchParams.get("priority"));
  const categoryId = asTrimmedString(searchParams.get("categoryId")) || undefined;
  const q = sanitizeSearchTerm(asTrimmedString(searchParams.get("q"))) || undefined;
  const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
  const pageSize = clamp(parsePositiveInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE), 1, MAX_PAGE_SIZE);

  const assignmentRaw = asTrimmedString(searchParams.get("assignment"));
  const assignedToRaw = asTrimmedString(searchParams.get("assignedTo"));
  const assignedTo = isUuid(assignedToRaw) ? assignedToRaw : undefined;

  // Canonical precedence: assignedTo > assignment > tab > default.
  let assignment: StaffAssignmentFilter = "mine";
  let tab: StaffTicketTab = "my";

  if (assignedTo) {
    assignment = "all";
    tab = "all";
  } else if (STAFF_ASSIGNMENT_FILTER_SET.has(assignmentRaw)) {
    // Keep legacy `assigned` accepted in URLs, but canonicalize it to `all`
    // so UI state and API semantics stay aligned.
    assignment = assignmentRaw === "assigned" ? "all" : (assignmentRaw as StaffAssignmentFilter);
    tab =
      assignment === "mine"
        ? "my"
        : assignment === "unassigned"
          ? "unassigned"
          : "all";
  } else if (STAFF_TAB_SET.has(tabRaw)) {
    tab = tabRaw as StaffTicketTab;
    assignment = tab === "my" ? "mine" : tab === "unassigned" ? "unassigned" : "all";
  }

  return {
    tab,
    page,
    pageSize,
    status: TICKET_STATUS_SET.has(statusRaw) ? (statusRaw as StaffQueueFilters["status"]) : undefined,
    priority: TICKET_PRIORITY_SET.has(priorityRaw) ? (priorityRaw as StaffQueueFilters["priority"]) : undefined,
    categoryId,
    assignment,
    assignedTo,
    q,
  };
}

function applyQueueFilters(query: any, filters: StaffQueueFilters, authUserId: string) {
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.priority) {
    query = query.eq("priority", filters.priority);
  }

  if (filters.categoryId) {
    query = query.eq("category_name", filters.categoryId);
  }

  if (filters.assignedTo) {
    query = query.eq("assigned_staff_id", filters.assignedTo);
  } else if (filters.assignment === "mine") {
    query = query.eq("assigned_staff_id", authUserId);
  } else if (filters.assignment === "unassigned") {
    query = query.is("assigned_staff_id", null);
  } else if (filters.assignment === "assigned") {
    query = query.not("assigned_staff_id", "is", null);
  }

  if (filters.q) {
    const term = sanitizeSearchTerm(filters.q);
    if (term) {
      query = query.or(`ticket_number.ilike.%${term}%,description.ilike.%${term}%`);
    }
  }

  return query;
}

async function countStaffTickets(
  supabase: SupabaseServerClient,
  filters: StaffQueueFilters,
  authUserId: string
): Promise<number> {
  let query: any = supabase.from("tickets").select("id", { count: "exact", head: true });
  query = applyQueueFilters(query, filters, authUserId);
  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to count staff tickets: ${error.message}`);
  }

  return count ?? 0;
}

async function listActiveCategories(_supabase: SupabaseServerClient): Promise<StaffCategorySummary[]> {
  return CANONICAL_COMPLAINT_CATEGORIES.map((name) => ({ id: name, name }));
}

async function listAssignableStaff(supabase: SupabaseServerClient): Promise<StaffPersonSummary[]> {
  const { data, error } = await supabase
    .from("tickets")
    .select(
      `
        assigned_staff_id,
        assigned_staff:profiles!tickets_assigned_staff_id_fkey (id, email, first_name, last_name)
      `
    )
    .not("assigned_staff_id", "is", null)
    .order("last_updated_at", { ascending: false })
    .limit(5000);

  if (error) {
    throw new Error(`Failed to load assignable staff: ${error.message}`);
  }

  const deduped = new Map<string, StaffPersonSummary>();
  for (const row of Array.isArray(data) ? data : []) {
    const person = mapPerson(firstRow(row?.assigned_staff) as RawProfile | null);
    if (!person) continue;
    if (!deduped.has(person.id)) {
      deduped.set(person.id, person);
    }
  }

  return Array.from(deduped.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function listStaffTickets(
  supabase: SupabaseServerClient,
  filters: StaffQueueFilters,
  authUserId: string
): Promise<StaffTicketQueueResponse> {
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  const selectWithSources = `
        id,
        ticket_number,
        ticket_type,
        title,
        status,
        priority,
        description,
        submitted_at,
        last_updated_at,
        category_name,
        category_source,
        priority_source,
        customer_id,
        guest_id,
        assigned_staff_id,
        ticket_access_tokens!ticket_access_tokens_ticket_id_fkey (token_hash, created_at),
        assigned_staff:profiles!tickets_assigned_staff_id_fkey (id, email, first_name, last_name)
      `;
  const selectLegacy = `
        id,
        ticket_number,
        ticket_type,
        title,
        status,
        priority,
        description,
        submitted_at,
        last_updated_at,
        category_name,
        customer_id,
        guest_id,
        assigned_staff_id,
        ticket_access_tokens!ticket_access_tokens_ticket_id_fkey (token_hash, created_at),
        assigned_staff:profiles!tickets_assigned_staff_id_fkey (id, email, first_name, last_name)
      `;

  const runQuery = (selectClause: string) => {
    let query: any = supabase
      .from("tickets")
      .select(selectClause, { count: "exact" })
      .order("created_at", { foreignTable: "ticket_access_tokens", ascending: false })
      .order("last_updated_at", { ascending: false })
      .order("submitted_at", { ascending: false })
      .range(from, to);
    return applyQueueFilters(query, filters, authUserId);
  };

  const myCountFilters: StaffQueueFilters = {
    ...filters,
    tab: "my",
    assignment: "mine",
    assignedTo: undefined,
  };
  const unassignedCountFilters: StaffQueueFilters = {
    ...filters,
    tab: "unassigned",
    assignment: "unassigned",
    assignedTo: undefined,
  };
  const allCountFilters: StaffQueueFilters = {
    ...filters,
    tab: "all",
    assignment: "all",
    assignedTo: undefined,
  };
  const highPriorityCountFilters: StaffQueueFilters = {
    ...filters,
    priority: "High",
  };

  const [resultWithSources, categoryOptions, staffOptions, myCount, unassignedCount, allCount, highPriorityCount] = await Promise.all([
    runQuery(selectWithSources),
    listActiveCategories(supabase),
    listAssignableStaff(supabase),
    countStaffTickets(supabase, myCountFilters, authUserId),
    countStaffTickets(supabase, unassignedCountFilters, authUserId),
    countStaffTickets(supabase, allCountFilters, authUserId),
    countStaffTickets(supabase, highPriorityCountFilters, authUserId),
  ]);

  let data = resultWithSources.data;
  let error = resultWithSources.error;
  let count = resultWithSources.count;

  if (error && isSourceColumnMissingError(error)) {
    const legacyResult = await runQuery(selectLegacy);
    data = legacyResult.data;
    error = legacyResult.error;
    count = legacyResult.count;
  }

  if (error) {
    throw new Error(`Failed to load staff tickets: ${error.message}`);
  }

  const total = count ?? 0;
  const totalPages = total === 0 ? 1 : Math.ceil(total / filters.pageSize);

  return {
    data: (Array.isArray(data) ? data : []).map(mapQueueItem),
    pagination: {
      page: clamp(filters.page, 1, totalPages),
      pageSize: filters.pageSize,
      total,
      totalPages,
    },
    filters: {
      ...filters,
      page: clamp(filters.page, 1, totalPages),
    },
    categoryOptions,
    staffOptions,
    tabCounts: {
      my: myCount,
      unassigned: unassignedCount,
      all: allCount,
    },
    summary: {
      total,
      unassigned: unassignedCount,
      highPriority: highPriorityCount,
    },
  };
}

export async function getStaffTicketDetail(
  supabase: SupabaseServerClient,
  ticketId: string
): Promise<StaffTicketDetailResponse | null> {
  const selectWithSources = `
        id,
        ticket_number,
        ticket_type,
        title,
        status,
        priority,
        description,
        submitted_at,
        last_updated_at,
        category_name,
        category_source,
        priority_source,
        customer_id,
        guest_id,
        assigned_staff_id,
        ticket_access_tokens!ticket_access_tokens_ticket_id_fkey (token_hash, created_at),
        submitter_profile:profiles!tickets_customer_id_fkey (id, email, first_name, last_name),
        assigned_staff:profiles!tickets_assigned_staff_id_fkey (id, email, first_name, last_name),
        guest_contact:guest_contacts!tickets_guest_id_fkey (id, email)
      `;
  const selectLegacy = `
        id,
        ticket_number,
        ticket_type,
        title,
        status,
        priority,
        description,
        submitted_at,
        last_updated_at,
        category_name,
        customer_id,
        guest_id,
        assigned_staff_id,
        ticket_access_tokens!ticket_access_tokens_ticket_id_fkey (token_hash, created_at),
        submitter_profile:profiles!tickets_customer_id_fkey (id, email, first_name, last_name),
        assigned_staff:profiles!tickets_assigned_staff_id_fkey (id, email, first_name, last_name),
        guest_contact:guest_contacts!tickets_guest_id_fkey (id, email)
      `;

  const runDetailQuery = (selectClause: string) =>
    supabase
      .from("tickets")
      .select(selectClause)
      .eq("id", ticketId)
      .order("created_at", { foreignTable: "ticket_access_tokens", ascending: false })
      .limit(1)
      .maybeSingle();

  let { data: ticket, error: ticketError } = await runDetailQuery(selectWithSources);
  if (ticketError && isSourceColumnMissingError(ticketError)) {
    const legacyResult = await runDetailQuery(selectLegacy);
    ticket = legacyResult.data;
    ticketError = legacyResult.error;
  }

  if (ticketError) {
    throw new Error(`Failed to load ticket detail: ${ticketError.message}`);
  }

  if (!ticket) {
    return null;
  }
  const ticketRow: any = ticket;

  const [attachmentsResult, historyResult, nlpAnalysisResult] = await Promise.all([
    supabase
      .from("attachments")
      .select("id, file_name, file_type, file_path, uploaded_at")
      .eq("ticket_id", ticketId)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("ticket_status_history")
      .select(
        `
          id,
          old_status,
          new_status,
          changed_at,
          remarks,
          changed_by:profiles!ticket_status_history_changed_by_user_id_fkey (id, email, first_name, last_name)
        `
      )
      .eq("ticket_id", ticketId)
      .order("changed_at", { ascending: false }),
    supabase
      .from("ticket_nlp_analyses")
      .select("id, priority, category_name, confidence, status, is_applied, raw_output, created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (attachmentsResult.error) {
    throw new Error(`Failed to load attachments: ${attachmentsResult.error.message}`);
  }

  if (historyResult.error) {
    throw new Error(`Failed to load status history: ${historyResult.error.message}`);
  }
  if (nlpAnalysisResult.error) {
    throw new Error(`Failed to load NLP analysis summary: ${nlpAnalysisResult.error.message}`);
  }

  const attachmentRows = Array.isArray(attachmentsResult.data) ? attachmentsResult.data : [];
  const attachments = await Promise.all(
    attachmentRows.map(async (row: any) => {
      const filePath = asString(row?.file_path) ?? "";
      return {
        id: asString(row?.id) ?? "",
        fileName: asString(row?.file_name) ?? "",
        fileType: asNullableTrimmedString(row?.file_type),
        filePath,
        signedUrl: filePath ? await createAttachmentSignedUrl(supabase, filePath) : null,
        uploadedAt: safeIso(row?.uploaded_at),
      };
    })
  );

  const submitterProfile = mapPerson(firstRow(ticketRow.submitter_profile));
  const guestContact = firstRow<{ email?: unknown }>(ticketRow.guest_contact);
  const guestEmail = asNullableTrimmedString(guestContact?.email);
  const trackingCode = readTrackingCode(ticketRow.ticket_access_tokens);
  const detail: StaffTicketDetail = {
    id: asString(ticketRow.id) ?? "",
    ticketNumber: trackingCode ?? asString(ticketRow.ticket_number) ?? "",
    ticketType: asString(ticketRow.ticket_type) ?? "",
    title: asNullableTrimmedString(ticketRow.title),
    status: asString(ticketRow.status) ?? "",
    priority: asString(ticketRow.priority) ?? "",
    description: asString(ticketRow.description) ?? "",
    submittedAt: safeIso(ticketRow.submitted_at),
    lastUpdatedAt: safeIso(ticketRow.last_updated_at),
    categoryName: asNullableTrimmedString(ticketRow.category_name),
    category: (() => {
      const categoryName = asNullableTrimmedString(ticketRow.category_name);
      return categoryName ? { id: categoryName, name: categoryName } : null;
    })(),
    categoryId: mapCategoryNameToId(asNullableTrimmedString(ticketRow.category_name)),
    categorySource: mapTicketFieldSource(ticketRow.category_source),
    prioritySource: mapTicketFieldSource(ticketRow.priority_source),
    submitterType: submitterProfile ? "Customer" : guestEmail ? "Guest" : "Unknown",
    submitter: submitterProfile,
    guestEmail,
    assignedStaff: mapPerson(firstRow(ticketRow.assigned_staff)),
    nlpSuggestion: mapNlpSuggestion((nlpAnalysisResult.data as RawNlpAnalysisRow | null | undefined) ?? null),
    attachments,
    statusHistory: (Array.isArray(historyResult.data) ? historyResult.data : []).map(mapStatusHistoryItem),
  };

  return { ticket: detail };
}

export async function logSystemActivity(
  supabase: SupabaseServerClient,
  args: {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    ipAddress?: string | null;
  }
) {
  const { error } = await supabase.from("system_activity_logs").insert({
    user_id: args.userId ?? null,
    action: args.action,
    entity_type: args.entityType,
    entity_id: args.entityId ?? null,
    ip_address: args.ipAddress ?? null,
  });

  if (error) {
    console.error("Failed to write system activity log:", error.message);
  }
}

export function getRequestIpAddress(headers: Headers): string | null {
  return splitForwardedFor(headers.get("x-forwarded-for")) ?? asNullableTrimmedString(headers.get("x-real-ip"));
}

export function parseJsonBodyObject(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Request body must be a JSON object.");
  }

  return value as JsonObject;
}

export function parseStatusUpdateRequest(body: JsonObject): StaffStatusUpdateRequest {
  const status = asTrimmedString(body.status);
  if (!status || !TICKET_STATUS_SET.has(status)) {
    throw new Error(`Status must be one of: ${TICKET_STATUSES.join(", ")}.`);
  }

  const remarks = asTrimmedString(body.remarks);

  return {
    status,
    remarks: remarks || undefined,
  };
}

export function parseAssignRequest(body: JsonObject): StaffAssignRequest {
  const action = asTrimmedString(body.action);
  if (!action) {
    return {};
  }

  if (action !== "self_assign") {
    throw new Error('Only action "self_assign" is supported.');
  }

  return { action: "self_assign" };
}

export async function updateStaffTicketStatus(
  supabase: SupabaseServerClient,
  ticketId: string,
  actor: ApiRoleGuardSuccess,
  input: StaffStatusUpdateRequest,
  ipAddress?: string | null
): Promise<StaffMutationResult<StaffStatusUpdateResponse>> {
  const { data: existing, error: existingError } = await supabase
    .from("tickets")
    .select("id, ticket_number, status, last_updated_at")
    .eq("id", ticketId)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to load ticket: ${existingError.message}`);
  }

  if (!existing?.id) {
    return { ok: false, reason: "not_found" };
  }

  const currentStatus = asString(existing.status) ?? "";
  if (currentStatus === input.status) {
    return {
      ok: true,
      data: {
        message: "Ticket status is already set to the requested value.",
        ticket: {
          id: String(existing.id),
          ticketNumber: asString(existing.ticket_number) ?? "",
          status: currentStatus,
          lastUpdatedAt: safeIso(existing.last_updated_at),
        },
      },
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from("tickets")
    .update({ status: input.status })
    .eq("id", ticketId)
    .select("id, ticket_number, status, last_updated_at")
    .single();

  if (updateError || !updated?.id) {
    throw new Error(updateError?.message ?? "Failed to update ticket status.");
  }

  const { error: historyError } = await supabase.from("ticket_status_history").insert({
    ticket_id: ticketId,
    old_status: currentStatus,
    new_status: input.status,
    changed_by_user_id: actor.userId,
    remarks: input.remarks ?? null,
  });

  if (historyError) {
    throw new Error(`Ticket status updated but failed to write status history: ${historyError.message}`);
  }

  await logSystemActivity(supabase, {
    userId: actor.userId,
    action: "staff_ticket_status_updated",
    entityType: "ticket",
    entityId: ticketId,
    ipAddress,
  });

  return {
    ok: true,
    data: {
      message: "Ticket status updated successfully.",
      ticket: {
        id: String(updated.id),
        ticketNumber: asString(updated.ticket_number) ?? "",
        status: asString(updated.status) ?? "",
        lastUpdatedAt: safeIso(updated.last_updated_at),
      },
    },
  };
}

export async function selfAssignStaffTicket(
  supabase: SupabaseServerClient,
  ticketId: string,
  actor: ApiRoleGuardSuccess,
  ipAddress?: string | null
): Promise<StaffMutationResult<StaffAssignResponse>> {
  const { data: existing, error: existingError } = await supabase
    .from("tickets")
    .select("id, ticket_number, assigned_staff_id, last_updated_at")
    .eq("id", ticketId)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to load ticket: ${existingError.message}`);
  }

  if (!existing?.id) {
    return { ok: false, reason: "not_found" };
  }

  const assignedStaffId = asString(existing.assigned_staff_id);

  if (assignedStaffId && assignedStaffId !== actor.userId) {
    return { ok: false, reason: "conflict", message: "Ticket is already assigned to another staff member." };
  }

  if (assignedStaffId === actor.userId) {
    return {
      ok: true,
      data: {
        message: "Ticket is already assigned to you.",
        ticket: {
          id: String(existing.id),
          ticketNumber: asString(existing.ticket_number) ?? "",
          lastUpdatedAt: safeIso(existing.last_updated_at),
          assignedStaff: {
            id: actor.userId,
            email: actor.email,
            firstName: null,
            lastName: null,
            displayName: formatDisplayName(null, null, actor.email),
          },
        },
      },
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from("tickets")
    .update({ assigned_staff_id: actor.userId })
    .eq("id", ticketId)
    .is("assigned_staff_id", null)
    .select("id, ticket_number, assigned_staff_id, last_updated_at")
    .maybeSingle();

  if (updateError) {
    throw new Error(`Failed to assign ticket: ${updateError.message}`);
  }

  if (!updated?.id) {
    return { ok: false, reason: "conflict", message: "Ticket assignment changed. Refresh and try again." };
  }

  await logSystemActivity(supabase, {
    userId: actor.userId,
    action: "staff_ticket_self_assigned",
    entityType: "ticket",
    entityId: ticketId,
    ipAddress,
  });

  return {
    ok: true,
    data: {
      message: "Ticket assigned to you.",
      ticket: {
        id: String(updated.id),
        ticketNumber: asString(updated.ticket_number) ?? "",
        lastUpdatedAt: safeIso(updated.last_updated_at),
        assignedStaff: {
          id: actor.userId,
          email: actor.email,
          firstName: null,
          lastName: null,
          displayName: formatDisplayName(null, null, actor.email),
        },
      },
    },
  };
}
