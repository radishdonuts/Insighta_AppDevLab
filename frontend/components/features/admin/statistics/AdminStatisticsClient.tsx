"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import styles from "../admin.module.css";
import chartStyles from "@/app/(admin)/admin/statistics/statistics.module.css";
import type {
  AdminCreatedResolvedResponse,
  AdminResolutionTimeResponse,
  AdminStatsBreakdownsResponse,
  AdminStatsOverviewResponse,
  AdminTicketsTrendsResponse,
} from "@/types/admin-stats";
import {
  CategoryBreakdownChart,
  CreatedVsResolvedChart,
  PriorityDonutChart,
  ResolutionTimeTrendChart,
  StatusDistributionChart,
  TicketsOverTimeChart,
} from "@/components/admin/RechartsComponents";

type ApiErrorPayload = { error?: string; message?: string };
type GranularityToggle = "daily" | "weekly";
type ResolutionGranularity = "week" | "month";

function formatDateKey(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

function getPresetDateRange(days: number) {
  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (Math.max(days, 1) - 1));

  return {
    from: formatDateKey(start),
    to: formatDateKey(end),
  };
}

async function readApiError(response: Response) {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    return payload.message || payload.error || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export default function AdminStatisticsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

  const [trends, setTrends] = useState<AdminTicketsTrendsResponse | null>(null);
  const [breakdowns, setBreakdowns] = useState<AdminStatsBreakdownsResponse | null>(null);
  const [resolutionTime, setResolutionTime] = useState<AdminResolutionTimeResponse | null>(null);
  const [createdResolved, setCreatedResolved] = useState<AdminCreatedResolvedResponse | null>(null);
  const [overview, setOverview] = useState<AdminStatsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [ticketsOverTimeGranularity, setTicketsOverTimeGranularity] =
    useState<GranularityToggle>("daily");
  const [resolutionGranularity, setResolutionGranularity] =
    useState<ResolutionGranularity>("week");
  const [createdResolvedGranularity, setCreatedResolvedGranularity] =
    useState<ResolutionGranularity>("week");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const qs = searchParams.toString();
        const suffix = qs ? `?${qs}` : "";
        const separator = qs ? "&" : "?";
        const [
          trendsResponse,
          breakdownsResponse,
          resolutionResponse,
          createdResolvedResponse,
          overviewResponse,
        ] = await Promise.all([
          fetch(`/api/admin/stats/tickets-trends${suffix}`, {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch(`/api/admin/stats/breakdowns${suffix}`, {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch(
            `/api/admin/stats/resolution-time${suffix}${separator}granularity=${resolutionGranularity}`,
            {
              cache: "no-store",
              signal: controller.signal,
            }
          ),
          fetch(
            `/api/admin/stats/created-resolved${suffix}${separator}granularity=${createdResolvedGranularity}`,
            {
              cache: "no-store",
              signal: controller.signal,
            }
          ),
          fetch(`/api/admin/stats/overview${suffix}`, {
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);

        if (!trendsResponse.ok) throw new Error(await readApiError(trendsResponse));
        if (!breakdownsResponse.ok) throw new Error(await readApiError(breakdownsResponse));

        const [trendsPayload, breakdownsPayload] = await Promise.all([
          trendsResponse.json() as Promise<AdminTicketsTrendsResponse>,
          breakdownsResponse.json() as Promise<AdminStatsBreakdownsResponse>,
        ]);

        setTrends(trendsPayload);
        setBreakdowns(breakdownsPayload);

        if (resolutionResponse.ok) {
          setResolutionTime(
            (await resolutionResponse.json()) as AdminResolutionTimeResponse
          );
        }

        if (createdResolvedResponse.ok) {
          setCreatedResolved(
            (await createdResolvedResponse.json()) as AdminCreatedResolvedResponse
          );
        }

        if (overviewResponse.ok) {
          setOverview((await overviewResponse.json()) as AdminStatsOverviewResponse);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load statistics.");
      } finally {
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [searchKey, searchParams, resolutionGranularity, createdResolvedGranularity]);

  useEffect(() => {
    const urlFrom = searchParams.get("from");
    const urlTo = searchParams.get("to");
    const fallbackFrom = breakdowns?.dateRange.from ?? trends?.dateRange.from ?? "";
    const fallbackTo = breakdowns?.dateRange.to ?? trends?.dateRange.to ?? "";

    setDraftFrom(urlFrom ?? fallbackFrom);
    setDraftTo(urlTo ?? fallbackTo);
  }, [
    searchKey,
    searchParams,
    breakdowns?.dateRange.from,
    breakdowns?.dateRange.to,
    trends?.dateRange.from,
    trends?.dateRange.to,
  ]);

  function updateDateQuery(next: { from?: string | null; to?: string | null }) {
    const params = new URLSearchParams(searchParams.toString());

    if ("from" in next) {
      if (next.from) params.set("from", next.from);
      else params.delete("from");
    }

    if ("to" in next) {
      if (next.to) params.set("to", next.to);
      else params.delete("to");
    }

    router.replace(params.size ? `${pathname}?${params.toString()}` : pathname);
  }

  function applyPreset(days: number) {
    updateDateQuery(getPresetDateRange(days));
  }

  function resetDateRange() {
    updateDateQuery({ from: null, to: null });
  }

  const ticketsOverTimeData = (trends?.series ?? []).map((point) => ({
    label: point.label,
    date: point.date,
    count: point.count,
  }));

  const weeklyTicketsData = aggregateToWeekly(ticketsOverTimeData);

  const statusData = (breakdowns?.breakdowns.status ?? []).map((item) => ({
    key: item.key,
    label: item.label,
    count: item.count,
    percentage: item.percentage,
  }));

  const priorityData = (breakdowns?.breakdowns.priority ?? []).map((item) => ({
    key: item.key,
    label: item.label,
    count: item.count,
    percentage: item.percentage,
  }));

  const categoryData = (breakdowns?.breakdowns.category ?? [])
    .filter(
      (item) =>
        !item.label.toLowerCase().includes("other") &&
        !item.label.toLowerCase().includes("uncategorized")
    )
    .map((item) => ({
      key: item.key,
      label: item.label,
      count: item.count,
      percentage: item.percentage,
    }));

  const resolutionTrendData = (resolutionTime?.series ?? []).map((point) => ({
    label: point.label,
    period: point.period,
    avgHours: point.avgHours,
  }));

  const createdResolvedData = (createdResolved?.series ?? []).map((point) => ({
    label: point.label,
    created: point.created,
    resolved: point.resolved,
  }));

  const totalTickets = breakdowns?.totalTickets ?? trends?.totalTickets ?? 0;
  const dateRange = breakdowns?.dateRange ?? trends?.dateRange;
  const resolvedCount = statusData.find((item) => item.label === "Resolved")?.count ?? 0;
  const closedCount = statusData.find((item) => item.label === "Closed")?.count ?? 0;
  const totalResolved = resolvedCount + closedCount;
  const openCount = totalTickets - totalResolved;

  return (
    <main className={styles.page}>
      <section className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div className={styles.titleWrap}>
            <h1 className={styles.title}>Admin Statistics</h1>
            <p className={styles.subtitle}>
              Comprehensive analytics for ticket management, resolution performance,
              and category distribution.
            </p>
            {dateRange ? (
              <p className={styles.metaText}>
                {totalTickets.toLocaleString()} tickets from {dateRange.from} to{" "}
                {dateRange.to} ({dateRange.days} days)
              </p>
            ) : null}
          </div>
        </div>

        <div className={styles.toolbar}>
          <span className={styles.toolbarLabel}>Date range filter</span>
          <form
            className={styles.toolbarForm}
            onSubmit={(event) => {
              event.preventDefault();
              updateDateQuery({ from: draftFrom || null, to: draftTo || null });
            }}
          >
            <label className={styles.field}>
              <span className={styles.fieldLabel}>From</span>
              <input
                type="date"
                className={styles.input}
                value={draftFrom}
                onChange={(event) => setDraftFrom(event.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>To</span>
              <input
                type="date"
                className={styles.input}
                value={draftTo}
                onChange={(event) => setDraftTo(event.target.value)}
              />
            </label>

            <button type="submit" className={styles.buttonPrimary}>
              Apply
            </button>
            <button type="button" className={styles.buttonSecondary} onClick={resetDateRange}>
              Reset
            </button>
          </form>

          <div className={styles.toolbarQuick}>
            <button type="button" className={styles.buttonGhost} onClick={() => applyPreset(7)}>
              Last 7 days
            </button>
            <button type="button" className={styles.buttonGhost} onClick={() => applyPreset(30)}>
              Last 30 days
            </button>
            <button type="button" className={styles.buttonGhost} onClick={() => applyPreset(90)}>
              Last 90 days
            </button>
          </div>
        </div>
      </section>

      {loading ? <p className={styles.stateText}>Loading statistics...</p> : null}
      {!loading && error ? <p className={styles.errorText}>{error}</p> : null}
      {!loading && !error && !trends && !breakdowns ? (
        <p className={styles.stateText}>No statistics data available.</p>
      ) : null}

      {!loading && !error ? (
        <>
          <section className={styles.kpiGrid} aria-label="Admin ticket KPIs">
            <article className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Total Tickets</span>
              <strong className={styles.kpiValue}>
                {(overview?.metrics.totalTickets ?? totalTickets).toLocaleString()}
              </strong>
              <span className={styles.kpiHint}>Submitted in selected range</span>
            </article>
            <article className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Open / In Progress</span>
              <strong className={styles.kpiValue}>
                {(overview?.metrics.openInProgressTickets ?? openCount).toLocaleString()}
              </strong>
              <span className={styles.kpiHint}>Excludes Resolved and Closed</span>
            </article>
            <article className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Resolved / Closed</span>
              <strong className={styles.kpiValue}>
                {(overview?.metrics.resolvedTickets ?? totalResolved).toLocaleString()}
              </strong>
              <span className={styles.kpiHint}>Completed tickets in range</span>
            </article>
            <article className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Unassigned</span>
              <strong className={styles.kpiValue}>
                {(overview?.metrics.unassignedTickets ?? 0).toLocaleString()}
              </strong>
              <span className={styles.kpiHint}>No assigned staff member</span>
            </article>
            <article className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Created Today</span>
              <strong className={styles.kpiValue}>
                {(overview?.metrics.createdToday ?? 0).toLocaleString()}
              </strong>
              <span className={styles.kpiHint}>Today, within selected range</span>
            </article>
            <article className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Created This Week</span>
              <strong className={styles.kpiValue}>
                {(overview?.metrics.createdThisWeek ?? 0).toLocaleString()}
              </strong>
              <span className={styles.kpiHint}>Current ISO week, within selected range</span>
            </article>
          </section>

          <section className={chartStyles.statsSection}>
            <h2 className={chartStyles.sectionTitle}>Activity Overview</h2>
            <div className={chartStyles.chartGrid2}>
              <div className={chartStyles.chartCard}>
                <div className={chartStyles.chartHeader}>
                  <div>
                    <h3 className={chartStyles.chartTitle}>Tickets Over Time</h3>
                    <p className={chartStyles.chartSubtitle}>
                      Ticket submissions in the selected range
                    </p>
                  </div>
                  <div className={chartStyles.toggleGroup}>
                    <button
                      type="button"
                      className={`${chartStyles.toggleBtn} ${
                        ticketsOverTimeGranularity === "daily" ? chartStyles.toggleActive : ""
                      }`}
                      onClick={() => setTicketsOverTimeGranularity("daily")}
                    >
                      Daily
                    </button>
                    <button
                      type="button"
                      className={`${chartStyles.toggleBtn} ${
                        ticketsOverTimeGranularity === "weekly" ? chartStyles.toggleActive : ""
                      }`}
                      onClick={() => setTicketsOverTimeGranularity("weekly")}
                    >
                      Weekly
                    </button>
                  </div>
                </div>
                <TicketsOverTimeChart
                  data={
                    ticketsOverTimeGranularity === "daily"
                      ? ticketsOverTimeData
                      : weeklyTicketsData
                  }
                  granularity={ticketsOverTimeGranularity}
                />
              </div>

              <div className={chartStyles.chartCard}>
                <div className={chartStyles.chartHeader}>
                  <div>
                    <h3 className={chartStyles.chartTitle}>Created vs Resolved</h3>
                    <p className={chartStyles.chartSubtitle}>Ticket workflow comparison</p>
                  </div>
                  <div className={chartStyles.toggleGroup}>
                    <button
                      type="button"
                      className={`${chartStyles.toggleBtn} ${
                        createdResolvedGranularity === "week" ? chartStyles.toggleActive : ""
                      }`}
                      onClick={() => setCreatedResolvedGranularity("week")}
                    >
                      Weekly
                    </button>
                    <button
                      type="button"
                      className={`${chartStyles.toggleBtn} ${
                        createdResolvedGranularity === "month" ? chartStyles.toggleActive : ""
                      }`}
                      onClick={() => setCreatedResolvedGranularity("month")}
                    >
                      Monthly
                    </button>
                  </div>
                </div>
                <CreatedVsResolvedChart data={createdResolvedData} />
              </div>
            </div>
          </section>

          <section className={chartStyles.statsSection}>
            <h2 className={chartStyles.sectionTitle}>Tickets Overview</h2>
            <div className={chartStyles.chartGridFull}>
              <div className={chartStyles.chartCard}>
                <div className={chartStyles.chartHeader}>
                  <div>
                    <h3 className={chartStyles.chartTitle}>Category Breakdown</h3>
                    <p className={chartStyles.chartSubtitle}>All complaint categories</p>
                  </div>
                </div>
                <CategoryBreakdownChart data={categoryData} />
              </div>
            </div>

            <div className={chartStyles.chartGrid2}>
              <div className={chartStyles.chartCard}>
                <div className={chartStyles.chartHeader}>
                  <div>
                    <h3 className={chartStyles.chartTitle}>Status Distribution</h3>
                    <p className={chartStyles.chartSubtitle}>Ticket lifecycle stages</p>
                  </div>
                </div>
                <StatusDistributionChart data={statusData} />
              </div>

              <div className={chartStyles.chartCard}>
                <div className={chartStyles.chartHeader}>
                  <div>
                    <h3 className={chartStyles.chartTitle}>Priority Distribution</h3>
                    <p className={chartStyles.chartSubtitle}>Urgency mix for tickets</p>
                  </div>
                </div>
                <PriorityDonutChart data={priorityData} />
              </div>
            </div>
          </section>

          <section className={chartStyles.statsSection}>
            <h2 className={chartStyles.sectionTitle}>Operational Performance</h2>
            <div className={chartStyles.chartGridFull}>
              <div className={chartStyles.chartCard}>
                <div className={chartStyles.chartHeader}>
                  <div>
                    <h3 className={chartStyles.chartTitle}>Resolution Time Trend</h3>
                    <p className={chartStyles.chartSubtitle}>
                      Average time to resolve tickets (
                      {resolutionTime?.totalResolvedTickets ?? 0} resolved)
                    </p>
                  </div>
                  <div className={chartStyles.toggleGroup}>
                    <button
                      type="button"
                      className={`${chartStyles.toggleBtn} ${
                        resolutionGranularity === "week" ? chartStyles.toggleActive : ""
                      }`}
                      onClick={() => setResolutionGranularity("week")}
                    >
                      Weekly
                    </button>
                    <button
                      type="button"
                      className={`${chartStyles.toggleBtn} ${
                        resolutionGranularity === "month" ? chartStyles.toggleActive : ""
                      }`}
                      onClick={() => setResolutionGranularity("month")}
                    >
                      Monthly
                    </button>
                  </div>
                </div>
                <ResolutionTimeTrendChart data={resolutionTrendData} />
              </div>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}

function aggregateToWeekly(dailyData: Array<{ label: string; date: string; count: number }>) {
  if (!dailyData.length) return [];

  const weekMap = new Map<string, { count: number; dates: string[] }>();

  for (const point of dailyData) {
    const date = new Date(`${point.date}T00:00:00Z`);
    const day = date.getUTCDay();
    const mondayOffset = (day + 6) % 7;
    const monday = new Date(date);
    monday.setUTCDate(monday.getUTCDate() - mondayOffset);
    const weekKey = monday.toISOString().slice(0, 10);

    const existing = weekMap.get(weekKey) || { count: 0, dates: [] };
    existing.count += point.count;
    existing.dates.push(point.date);
    weekMap.set(weekKey, existing);
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekKey, data]) => ({
      label: `Week of ${formatter.format(new Date(`${weekKey}T00:00:00Z`))}`,
      date: weekKey,
      count: data.count,
    }));
}
