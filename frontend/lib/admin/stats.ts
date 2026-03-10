import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "@/types/tickets";
import type {
  AdminStatsBreakdownItem,
  AdminStatsBreakdownsResponse,
  AdminStatsDateRange,
  AdminStatsOverviewResponse,
  AdminTicketTrendPoint,
  AdminTicketsTrendsResponse,
  AdminResolutionTrendPoint,
  AdminResolutionTimeResponse,
  AdminCreatedResolvedPoint,
  AdminCreatedResolvedResponse,
  AdminFeedbackStatsResponse,
  AdminFeedbackCategoryScore,
  AdminFeedbackAverageRatingPoint,
  AdminFeedbackSubmissionsPoint,
} from "@/types/admin-stats";
import {
  asString,
  type AdminSupabaseServerClient,
} from "@/lib/admin/common";

const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 366;
const RESOLVED_STATUSES = new Set<string>(["Resolved", "Closed"]);
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const UTC_DATE_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const FEEDBACK_CATEGORY_ORDER = [
  "overall_experience",
  "speed_turnaround_time",
  "communication_updates",
  "resolution_quality_fairness",
  "ease_of_process",
  "staff_helpfulness_professionalism",
  "platform_app_website_experience",
] as const;

const FEEDBACK_CATEGORY_LABELS: Record<(typeof FEEDBACK_CATEGORY_ORDER)[number], string> = {
  overall_experience: "Overall Experience",
  speed_turnaround_time: "Speed / Turnaround Time",
  communication_updates: "Communication / Updates",
  resolution_quality_fairness: "Resolution Quality / Fairness",
  ease_of_process: "Ease of Process",
  staff_helpfulness_professionalism: "Staff Helpfulness / Professionalism",
  platform_app_website_experience: "Platform / App / Website Experience",
};

type OverviewRow = {
  submitted_at?: unknown;
  status?: unknown;
  assigned_staff_id?: unknown;
};

type TrendsRow = {
  submitted_at?: unknown;
};

type BreakdownRow = {
  status?: unknown;
  priority?: unknown;
  category_name?: unknown;
};

type FeedbackRow = {
  id?: unknown;
  submitted_at?: unknown;
};

type FeedbackCategoryRatingRow = {
  feedback_id?: unknown;
  category?: unknown;
  rating?: unknown;
};

export type AdminStatsQueryRange = AdminStatsDateRange & {
  fromIso: string;
  toExclusiveIso: string;
};

export { getAdminSupabase } from "@/lib/admin/common";
export { requireAdminApiAuth } from "@/lib/admin/common";

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return startOfUtcDay(next);
}

function formatDateOnlyUtc(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDateOnlyUtc(value: string | null): Date | null {
  if (!value || !DATE_ONLY_RE.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return formatDateOnlyUtc(parsed) === value ? parsed : null;
}

function toPublicDateRange(range: AdminStatsQueryRange): AdminStatsDateRange {
  return {
    from: range.from,
    to: range.to,
    days: range.days,
  };
}

function slugKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatFeedbackCategoryLabel(key: string) {
  const known = FEEDBACK_CATEGORY_LABELS[key as keyof typeof FEEDBACK_CATEGORY_LABELS];
  if (known) return known;
  const tokens = key
    .split("_")
    .map((token) => token.trim())
    .filter(Boolean);
  if (!tokens.length) return "Other";
  return tokens
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function roundPercentage(count: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

function roundRating(value: number) {
  return Math.round(value * 100) / 100;
}

function sortBreakdownItems(items: AdminStatsBreakdownItem[]) {
  return [...items].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label);
  });
}

function buildKnownValueBreakdown(
  labels: readonly string[],
  counts: Map<string, number>,
  total: number
): AdminStatsBreakdownItem[] {
  return labels.map((label) => {
    const count = counts.get(label) ?? 0;
    return {
      key: slugKey(label),
      label,
      count,
      percentage: roundPercentage(count, total),
    };
  });
}

function buildMapBreakdown(counts: Map<string, number>, total: number): AdminStatsBreakdownItem[] {
  return sortBreakdownItems(
    Array.from(counts.entries()).map(([label, count]) => ({
      key: slugKey(label),
      label,
      count,
      percentage: roundPercentage(count, total),
    }))
  );
}

function startOfUtcIsoWeek(date: Date) {
  const day = date.getUTCDay(); // 0=Sun, 1=Mon
  const mondayOffset = (day + 6) % 7;
  return addUtcDays(startOfUtcDay(date), -mondayOffset);
}

function applySubmittedDateRange(query: any, range: AdminStatsQueryRange) {
  return query.gte("submitted_at", range.fromIso).lt("submitted_at", range.toExclusiveIso);
}

function toUtcDateKey(isoString: string | null): string | null {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;
  return formatDateOnlyUtc(date);
}

function countByDateRange(
  rows: Array<{ submitted_at?: unknown }>,
  lowerBound: Date,
  upperBoundExclusive: Date
) {
  const lower = lowerBound.getTime();
  const upper = upperBoundExclusive.getTime();
  let count = 0;

  for (const row of rows) {
    const value = asString(row.submitted_at);
    if (!value) continue;
    const time = new Date(value).getTime();
    if (Number.isNaN(time)) continue;
    if (time >= lower && time < upper) {
      count += 1;
    }
  }

  return count;
}

export function parseAdminStatsDateRange(searchParams: URLSearchParams): AdminStatsQueryRange {
  const today = startOfUtcDay(new Date());
  const defaultTo = today;
  const defaultFrom = addUtcDays(defaultTo, -(DEFAULT_RANGE_DAYS - 1));

  let fromDate = parseDateOnlyUtc(searchParams.get("from")) ?? defaultFrom;
  let toDate = parseDateOnlyUtc(searchParams.get("to")) ?? defaultTo;

  if (fromDate.getTime() > toDate.getTime()) {
    const swap = fromDate;
    fromDate = toDate;
    toDate = swap;
  }

  const minAllowedFrom = addUtcDays(toDate, -(MAX_RANGE_DAYS - 1));
  if (fromDate.getTime() < minAllowedFrom.getTime()) {
    fromDate = minAllowedFrom;
  }

  const from = formatDateOnlyUtc(fromDate);
  const to = formatDateOnlyUtc(toDate);
  const toExclusive = addUtcDays(toDate, 1);
  const days = Math.floor((toExclusive.getTime() - fromDate.getTime()) / 86_400_000);

  return {
    from,
    to,
    days,
    fromIso: fromDate.toISOString(),
    toExclusiveIso: toExclusive.toISOString(),
  };
}

/**
 * Overview response is intentionally chart/card-friendly:
 * - `metrics` powers KPI cards directly
 * - `statusSnapshot` provides a small breakdown list without another request
 */
export async function getAdminStatsOverview(
  supabase: AdminSupabaseServerClient,
  range: AdminStatsQueryRange
): Promise<AdminStatsOverviewResponse> {
  const { data, error } = await applySubmittedDateRange(
    supabase.from("tickets").select("submitted_at, status, assigned_staff_id"),
    range
  );

  if (error) {
    throw new Error(`Failed to load admin overview stats: ${error.message}`);
  }

  const rows = (Array.isArray(data) ? data : []) as OverviewRow[];
  const statusCounts = new Map<string, number>();

  let totalTickets = 0;
  let openInProgressTickets = 0;
  let resolvedTickets = 0;
  let unassignedTickets = 0;

  for (const row of rows) {
    totalTickets += 1;

    const status = asString(row.status) ?? "Unknown";
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);

    if (RESOLVED_STATUSES.has(status)) {
      resolvedTickets += 1;
    } else {
      openInProgressTickets += 1;
    }

    if (!asString(row.assigned_staff_id)) {
      unassignedTickets += 1;
    }
  }

  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const tomorrowStart = addUtcDays(todayStart, 1);
  const weekStart = startOfUtcIsoWeek(now);

  const createdToday = countByDateRange(rows, todayStart, tomorrowStart);
  const createdThisWeek = countByDateRange(rows, weekStart, tomorrowStart);

  return {
    dateRange: toPublicDateRange(range),
    metrics: {
      totalTickets,
      openInProgressTickets,
      resolvedTickets,
      unassignedTickets,
      createdToday,
      createdThisWeek,
    },
    statusSnapshot: buildKnownValueBreakdown(TICKET_STATUSES, statusCounts, totalTickets),
  };
}

/**
 * Trend response returns a dense daily series with zero-filled days so any chart
 * renderer can plot a stable x-axis without client-side preprocessing.
 */
export async function getAdminTicketTrends(
  supabase: AdminSupabaseServerClient,
  range: AdminStatsQueryRange
): Promise<AdminTicketsTrendsResponse> {
  const { data, error } = await applySubmittedDateRange(
    supabase.from("tickets").select("submitted_at"),
    range
  );

  if (error) {
    throw new Error(`Failed to load ticket trends: ${error.message}`);
  }

  const rows = (Array.isArray(data) ? data : []) as TrendsRow[];
  const countsByDate = new Map<string, number>();

  for (const row of rows) {
    const dateKey = toUtcDateKey(asString(row.submitted_at));
    if (!dateKey) continue;
    countsByDate.set(dateKey, (countsByDate.get(dateKey) ?? 0) + 1);
  }

  const series: AdminTicketTrendPoint[] = [];
  let totalTickets = 0;

  let cursor = parseDateOnlyUtc(range.from);
  const end = parseDateOnlyUtc(range.to);

  if (!cursor || !end) {
    return {
      dateRange: toPublicDateRange(range),
      granularity: "day",
      totalTickets: 0,
      series: [],
    };
  }

  while (cursor.getTime() <= end.getTime()) {
    const dateKey = formatDateOnlyUtc(cursor);
    const count = countsByDate.get(dateKey) ?? 0;
    totalTickets += count;

    series.push({
      date: dateKey,
      label: UTC_DATE_LABEL_FORMATTER.format(cursor),
      count,
    });

    cursor = addUtcDays(cursor, 1);
  }

  return {
    dateRange: toPublicDateRange(range),
    granularity: "day",
    totalTickets,
    series,
  };
}

/**
 * Breakdown response groups ticket counts for charting. Percentages are precomputed
 * against `totalTickets` so the UI can render pie/bar summaries without math.
 */
export async function getAdminTicketBreakdowns(
  supabase: AdminSupabaseServerClient,
  range: AdminStatsQueryRange
): Promise<AdminStatsBreakdownsResponse> {
  const { data, error } = await applySubmittedDateRange(
    supabase
      .from("tickets")
      .select(
        `
          status,
          priority,
          category_name
        `
      ),
    range
  );

  if (error) {
    throw new Error(`Failed to load ticket breakdowns: ${error.message}`);
  }

  const rows = (Array.isArray(data) ? data : []) as BreakdownRow[];
  const totalTickets = rows.length;

  const statusCounts = new Map<string, number>();
  const priorityCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();

  for (const row of rows) {
    const status = asString(row.status) ?? "Unknown";
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);

    const priority = asString(row.priority) ?? "Unknown";
    priorityCounts.set(priority, (priorityCounts.get(priority) ?? 0) + 1);

    const categoryLabel = asString(row.category_name) ?? "Other / Uncategorized";
    categoryCounts.set(categoryLabel, (categoryCounts.get(categoryLabel) ?? 0) + 1);
  }

  return {
    dateRange: toPublicDateRange(range),
    totalTickets,
    breakdowns: {
      status: buildKnownValueBreakdown(TICKET_STATUSES, statusCounts, totalTickets),
      priority: buildKnownValueBreakdown(TICKET_PRIORITIES, priorityCounts, totalTickets),
      category: buildMapBreakdown(categoryCounts, totalTickets),
    },
  };
}

type ResolutionRow = {
  ticket_id: string;
  submitted_at: string;
  resolved_at: string;
};

const WEEK_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function getWeekKey(date: Date): string {
  const weekStart = startOfUtcIsoWeek(date);
  return formatDateOnlyUtc(weekStart);
}

function getMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Resolution time trend – calculates average time to resolution by week/month
 */
export async function getAdminResolutionTimeTrend(
  supabase: AdminSupabaseServerClient,
  range: AdminStatsQueryRange,
  granularity: "week" | "month" = "week"
): Promise<AdminResolutionTimeResponse> {
  // Query tickets that were resolved within the date range
  // We need to join with ticket_status_history to find when status changed to Resolved/Closed
  const { data, error } = await supabase
    .from("ticket_status_history")
    .select(`
      ticket_id,
      new_status,
      changed_at,
      tickets!inner (
        id,
        submitted_at,
        status
      )
    `)
    .in("new_status", ["Resolved", "Closed"])
    .gte("changed_at", range.fromIso)
    .lt("changed_at", range.toExclusiveIso);

  if (error) {
    throw new Error(`Failed to load resolution time stats: ${error.message}`);
  }

  // Group by ticket_id and take the earliest resolution time for each ticket
  const ticketResolutions = new Map<string, { submitted_at: string; resolved_at: string }>();

  for (const row of data || []) {
    const ticketId = row.ticket_id;
    const resolvedAt = row.changed_at;
    const ticket = row.tickets as unknown as { id: string; submitted_at: string; status: string };
    const submittedAt = ticket?.submitted_at;

    if (!submittedAt || !resolvedAt) continue;

    const existing = ticketResolutions.get(ticketId);
    if (!existing || new Date(resolvedAt).getTime() < new Date(existing.resolved_at).getTime()) {
      ticketResolutions.set(ticketId, { submitted_at: submittedAt, resolved_at: resolvedAt });
    }
  }

  // Aggregate by period
  const periodData = new Map<string, { totalHours: number; count: number }>();

  for (const { submitted_at, resolved_at } of Array.from(ticketResolutions.values())) {
    const resolvedDate = new Date(resolved_at);
    const submittedDate = new Date(submitted_at);
    const hoursToResolve = (resolvedDate.getTime() - submittedDate.getTime()) / (1000 * 60 * 60);

    const periodKey = granularity === "week" ? getWeekKey(resolvedDate) : getMonthKey(resolvedDate);
    const existing = periodData.get(periodKey) || { totalHours: 0, count: 0 };
    existing.totalHours += hoursToResolve;
    existing.count += 1;
    periodData.set(periodKey, existing);
  }

  // Generate dense series
  const series: AdminResolutionTrendPoint[] = [];
  let cursor = parseDateOnlyUtc(range.from);
  const end = parseDateOnlyUtc(range.to);

  if (!cursor || !end) {
    return {
      dateRange: toPublicDateRange(range),
      granularity,
      avgResolutionHours: 0,
      totalResolvedTickets: 0,
      series: [],
    };
  }

  const seenPeriods = new Set<string>();

  while (cursor.getTime() <= end.getTime()) {
    const periodKey = granularity === "week" ? getWeekKey(cursor) : getMonthKey(cursor);

    if (!seenPeriods.has(periodKey)) {
      seenPeriods.add(periodKey);
      const data = periodData.get(periodKey);
      const avgHours = data ? Math.round(data.totalHours / data.count) : 0;
      const label =
        granularity === "week"
          ? `Week of ${WEEK_LABEL_FORMATTER.format(cursor)}`
          : MONTH_LABEL_FORMATTER.format(cursor);

      series.push({
        period: periodKey,
        label,
        avgHours,
        ticketCount: data?.count || 0,
      });
    }

    cursor = granularity === "week" ? addUtcDays(cursor, 7) : addUtcDays(cursor, 30);
  }

  // Calculate overall average
  let totalHours = 0;
  let totalTickets = 0;

  for (const { totalHours: h, count: c } of Array.from(periodData.values())) {
    totalHours += h;
    totalTickets += c;
  }

  return {
    dateRange: toPublicDateRange(range),
    granularity,
    avgResolutionHours: totalTickets > 0 ? Math.round(totalHours / totalTickets) : 0,
    totalResolvedTickets: totalTickets,
    series,
  };
}

/**
 * Created vs Resolved comparison – shows tickets created vs resolved by week/month
 */
export async function getAdminCreatedVsResolved(
  supabase: AdminSupabaseServerClient,
  range: AdminStatsQueryRange,
  granularity: "week" | "month" = "week"
): Promise<AdminCreatedResolvedResponse> {
  // Get created tickets
  const { data: createdData, error: createdError } = await applySubmittedDateRange(
    supabase.from("tickets").select("submitted_at"),
    range
  );

  if (createdError) {
    throw new Error(`Failed to load created tickets: ${createdError.message}`);
  }

  // Get resolved tickets (from status history)
  const { data: resolvedData, error: resolvedError } = await supabase
    .from("ticket_status_history")
    .select("ticket_id, changed_at")
    .in("new_status", ["Resolved", "Closed"])
    .gte("changed_at", range.fromIso)
    .lt("changed_at", range.toExclusiveIso);

  if (resolvedError) {
    throw new Error(`Failed to load resolved tickets: ${resolvedError.message}`);
  }

  // Count created by period
  const createdByPeriod = new Map<string, number>();

  for (const row of createdData || []) {
    const date = new Date(asString(row.submitted_at) || "");
    if (Number.isNaN(date.getTime())) continue;

    const periodKey = granularity === "week" ? getWeekKey(date) : getMonthKey(date);
    createdByPeriod.set(periodKey, (createdByPeriod.get(periodKey) || 0) + 1);
  }

  // Count resolved by period (deduplicate by ticket_id to count each ticket once)
  const resolvedTickets = new Map<string, string>(); // ticket_id -> earliest resolved_at

  for (const row of resolvedData || []) {
    const existing = resolvedTickets.get(row.ticket_id);
    if (!existing || new Date(row.changed_at).getTime() < new Date(existing).getTime()) {
      resolvedTickets.set(row.ticket_id, row.changed_at);
    }
  }

  const resolvedByPeriod = new Map<string, number>();

  for (const changedAt of Array.from(resolvedTickets.values())) {
    const date = new Date(changedAt);
    const periodKey = granularity === "week" ? getWeekKey(date) : getMonthKey(date);
    resolvedByPeriod.set(periodKey, (resolvedByPeriod.get(periodKey) || 0) + 1);
  }

  // Generate dense series
  const series: AdminCreatedResolvedPoint[] = [];
  let cursor = parseDateOnlyUtc(range.from);
  const end = parseDateOnlyUtc(range.to);

  if (!cursor || !end) {
    return {
      dateRange: toPublicDateRange(range),
      granularity,
      series: [],
    };
  }

  const seenPeriods = new Set<string>();

  while (cursor.getTime() <= end.getTime()) {
    const periodKey = granularity === "week" ? getWeekKey(cursor) : getMonthKey(cursor);

    if (!seenPeriods.has(periodKey)) {
      seenPeriods.add(periodKey);
      const label =
        granularity === "week"
          ? `Week of ${WEEK_LABEL_FORMATTER.format(cursor)}`
          : MONTH_LABEL_FORMATTER.format(cursor);

      series.push({
        period: periodKey,
        label,
        created: createdByPeriod.get(periodKey) || 0,
        resolved: resolvedByPeriod.get(periodKey) || 0,
      });
    }

    cursor = granularity === "week" ? addUtcDays(cursor, 7) : addUtcDays(cursor, 30);
  }

  return {
    dateRange: toPublicDateRange(range),
    granularity,
    series,
  };
}

/**
 * Feedback statistics for admin analytics:
 * - average rating across all category ratings
 * - response totals
 * - category score breakdown
 * - daily submission and daily average rating series
 */
export async function getAdminFeedbackStats(
  supabase: AdminSupabaseServerClient,
  range: AdminStatsQueryRange
): Promise<AdminFeedbackStatsResponse> {
  const { data: feedbackData, error: feedbackError } = await applySubmittedDateRange(
    supabase.from("feedback").select("id, submitted_at"),
    range
  );

  if (feedbackError) {
    throw new Error(`Failed to load feedback responses: ${feedbackError.message}`);
  }

  const feedbackRows = (Array.isArray(feedbackData) ? feedbackData : []) as FeedbackRow[];
  const submissionCountsByDate = new Map<string, number>();
  const feedbackDateById = new Map<string, string>();

  for (const row of feedbackRows) {
    const feedbackId = asString(row.id);
    const dateKey = toUtcDateKey(asString(row.submitted_at));
    if (!dateKey) continue;
    submissionCountsByDate.set(dateKey, (submissionCountsByDate.get(dateKey) ?? 0) + 1);
    if (feedbackId) {
      feedbackDateById.set(feedbackId, dateKey);
    }
  }

  const categoryStats = new Map<string, { sum: number; count: number }>();
  for (const category of FEEDBACK_CATEGORY_ORDER) {
    categoryStats.set(category, { sum: 0, count: 0 });
  }

  const dailyRatingStats = new Map<string, { sum: number; count: number }>();
  let overallRatingsSum = 0;
  let overallRatingsCount = 0;

  const feedbackIds = Array.from(feedbackDateById.keys());
  if (feedbackIds.length) {
    const { data: ratingsData, error: ratingsError } = await supabase
      .from("feedback_category_ratings")
      .select("feedback_id, category, rating")
      .in("feedback_id", feedbackIds);

    if (ratingsError) {
      throw new Error(`Failed to load feedback category ratings: ${ratingsError.message}`);
    }

    const ratingsRows = (Array.isArray(ratingsData) ? ratingsData : []) as FeedbackCategoryRatingRow[];

    for (const row of ratingsRows) {
      const feedbackId = asString(row.feedback_id);
      const category = asString(row.category);
      const rating = typeof row.rating === "number" && Number.isFinite(row.rating) ? row.rating : null;
      if (!feedbackId || !category || rating === null) continue;

      const submittedDate = feedbackDateById.get(feedbackId);
      if (!submittedDate) continue;

      overallRatingsSum += rating;
      overallRatingsCount += 1;

      const categoryEntry = categoryStats.get(category) ?? { sum: 0, count: 0 };
      categoryEntry.sum += rating;
      categoryEntry.count += 1;
      categoryStats.set(category, categoryEntry);

      const dayEntry = dailyRatingStats.get(submittedDate) ?? { sum: 0, count: 0 };
      dayEntry.sum += rating;
      dayEntry.count += 1;
      dailyRatingStats.set(submittedDate, dayEntry);
    }
  }

  const orderedCategoryBreakdown: AdminFeedbackCategoryScore[] = FEEDBACK_CATEGORY_ORDER.map((category) => {
    const stats = categoryStats.get(category) ?? { sum: 0, count: 0 };
    const avgRating = stats.count > 0 ? roundRating(stats.sum / stats.count) : 0;
    return {
      key: category,
      label: FEEDBACK_CATEGORY_LABELS[category],
      avgRating,
      responseCount: stats.count,
    };
  });

  const extraCategoryBreakdown = Array.from(categoryStats.entries())
    .filter(([category]) => !FEEDBACK_CATEGORY_ORDER.includes(category as (typeof FEEDBACK_CATEGORY_ORDER)[number]))
    .map(([category, stats]) => ({
      key: category,
      label: formatFeedbackCategoryLabel(category),
      avgRating: stats.count > 0 ? roundRating(stats.sum / stats.count) : 0,
      responseCount: stats.count,
    }))
    .sort((a, b) => {
      if (b.responseCount !== a.responseCount) return b.responseCount - a.responseCount;
      return a.label.localeCompare(b.label);
    });

  const categoryBreakdown = [...orderedCategoryBreakdown, ...extraCategoryBreakdown];

  const submissionsSeries: AdminFeedbackSubmissionsPoint[] = [];
  const averageRatingSeries: AdminFeedbackAverageRatingPoint[] = [];

  let cursor = parseDateOnlyUtc(range.from);
  const end = parseDateOnlyUtc(range.to);

  if (!cursor || !end) {
    return {
      dateRange: toPublicDateRange(range),
      totalResponses: feedbackRows.length,
      overallAverageRating: overallRatingsCount > 0 ? roundRating(overallRatingsSum / overallRatingsCount) : 0,
      categoryBreakdown,
      submissionsSeries: [],
      averageRatingSeries: [],
    };
  }

  while (cursor.getTime() <= end.getTime()) {
    const dateKey = formatDateOnlyUtc(cursor);
    const ratingStatsForDay = dailyRatingStats.get(dateKey);

    submissionsSeries.push({
      date: dateKey,
      label: UTC_DATE_LABEL_FORMATTER.format(cursor),
      count: submissionCountsByDate.get(dateKey) ?? 0,
    });

    averageRatingSeries.push({
      date: dateKey,
      label: UTC_DATE_LABEL_FORMATTER.format(cursor),
      avgRating:
        ratingStatsForDay && ratingStatsForDay.count > 0
          ? roundRating(ratingStatsForDay.sum / ratingStatsForDay.count)
          : 0,
    });

    cursor = addUtcDays(cursor, 1);
  }

  return {
    dateRange: toPublicDateRange(range),
    totalResponses: feedbackRows.length,
    overallAverageRating: overallRatingsCount > 0 ? roundRating(overallRatingsSum / overallRatingsCount) : 0,
    categoryBreakdown,
    submissionsSeries,
    averageRatingSeries,
  };
}
