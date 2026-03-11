"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LayoutDashboard,
  Loader2,
  Search,
  Ticket,
  UserX,
} from "lucide-react";

import type {
  StaffCategorySummary,
  StaffPersonSummary,
  StaffTicketQueueResponse,
  StaffTicketTab,
} from "@/types/staff-tickets";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/types/tickets";
import { Badge } from "@/components/ui/badge";
import BadgeTabs from "@/components/ui/badge-tabs";
import { Button } from "@/components/ui/button";
import FilterDropdown from "@/components/ui/filter-dropdown";
import type { FilterOption, FilterOptionGroup } from "@/components/ui/filter-dropdown";
import { Input } from "@/components/ui/input";

import QueueStats from "./QueueStats";
import { QueueSkeleton } from "./queue-states";
import TicketCard from "./TicketCard";

type WorkspaceMode = "staff" | "admin";
type ApiErrorPayload = { error?: string; message?: string };
type AssignmentPreset = "all" | "mine" | "unassigned" | "assigned";

type StaffWorkspaceClientProps = {
  mode?: WorkspaceMode;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function readApiErrorPayload(payload: ApiErrorPayload, fallbackStatus: number) {
  return payload.message || payload.error || `Request failed (${fallbackStatus})`;
}

async function readApiError(response: Response) {
  try {
    return readApiErrorPayload((await response.json()) as ApiErrorPayload, response.status);
  } catch {
    return `Request failed (${response.status})`;
  }
}

function resolveUiState(searchParams: URLSearchParams, mode: WorkspaceMode) {
  const assignedToRaw = (searchParams.get("assignedTo") ?? "").trim();
  const assignedTo = isUuid(assignedToRaw) ? assignedToRaw : "";

  if (mode === "admin" && assignedTo) {
    return { activeTab: "all" as StaffTicketTab };
  }

  const assignmentRaw = (searchParams.get("assignment") ?? "").trim() as AssignmentPreset | "";
  if (mode === "admin") {
    if (assignmentRaw === "assigned") return { activeTab: "my" as StaffTicketTab };
    if (assignmentRaw === "unassigned") return { activeTab: "unassigned" as StaffTicketTab };
    return { activeTab: "all" as StaffTicketTab };
  }

  if (assignmentRaw === "mine") return { activeTab: "my" as StaffTicketTab };
  if (assignmentRaw === "unassigned") return { activeTab: "unassigned" as StaffTicketTab };
  return { activeTab: "my" as StaffTicketTab };
}

export default function StaffWorkspaceClient({
  mode = "staff",
}: StaffWorkspaceClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

  const apiBasePath = mode === "admin" ? "/api/admin/tickets" : "/api/staff/tickets";
  const detailHrefBase = mode === "admin" ? "/admin/work-tickets" : "/staff/tickets";
  const supportsAssignmentFilter = mode === "admin";
  const headerTitle = mode === "admin" ? "Admin Ticket Workspace" : "Staff Ticket Workspace";
  const headerSubtitle =
    mode === "admin"
      ? "View all tickets, assign them to staff, and manage queue operations."
      : "Work only the tickets assigned to you or currently unassigned.";

  const [data, setData] = useState<StaffTicketQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    setSearchInput(searchParams.get("q") ?? "");
  }, [searchKey, searchParams]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const qs = searchParams.toString();
        const response = await fetch(`${apiBasePath}${qs ? `?${qs}` : ""}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(await readApiError(response));
        setData((await response.json()) as StaffTicketQueueResponse);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load tickets.");
      } finally {
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [apiBasePath, searchKey, searchParams]);

  const { activeTab } = useMemo(
    () => resolveUiState(new URLSearchParams(searchParams.toString()), mode),
    [mode, searchKey, searchParams]
  );

  const currentStatus = searchParams.get("status") ?? "";
  const currentPriority = searchParams.get("priority") ?? "";
  const currentCategoryId = searchParams.get("categoryId") ?? "";
  const currentAssignedTo = searchParams.get("assignedTo") ?? "";
  const categoryOptions = useMemo(() => data?.categoryOptions ?? [], [data]);
  const staffOptions = useMemo(() => data?.staffOptions ?? [], [data]);
  const tabCounts = data?.tabCounts ?? { my: 0, unassigned: 0, all: 0 };
  const summary = data?.summary ?? { total: 0, unassigned: 0, highPriority: 0 };
  const pagination = data?.pagination ?? null;
  const visibleTickets = data?.data ?? [];
  const isUpdating = loading && data !== null;
  const selectedStaffName = currentAssignedTo
    ? staffOptions.find((staff) => staff.id === currentAssignedTo)?.displayName ?? "Staff member"
    : null;

  function updateQuery(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    router.replace(params.size ? `${pathname}?${params.toString()}` : pathname);
  }

  function setFilter(key: string, value: string) {
    updateQuery({ [key]: value || null, page: "1" });
  }

  function setPage(page: number) {
    updateQuery({ page: String(page) });
  }

  function setTab(tab: StaffTicketTab) {
    if (mode === "admin") {
      const assignment = tab === "my" ? "assigned" : tab === "unassigned" ? "unassigned" : "all";
      updateQuery({ assignment, tab, assignedTo: null, page: "1" });
      return;
    }

    const assignment = tab === "my" ? "mine" : tab === "unassigned" ? "unassigned" : "all";
    updateQuery({ assignment, tab, assignedTo: null, page: "1" });
  }

  function handleReset() {
    updateQuery({
      q: null,
      status: null,
      priority: null,
      categoryId: null,
      assignedTo: null,
      assignment: mode === "admin" ? "all" : "mine",
      tab: mode === "admin" ? "all" : "my",
      page: "1",
    });
  }

  const statusOptions: FilterOption[] = useMemo(
    () => [{ value: "__all", label: "All statuses" }, ...TICKET_STATUSES.map((s) => ({ value: s, label: s }))],
    []
  );

  const priorityOptions: FilterOption[] = useMemo(
    () => [{ value: "__all", label: "All priorities" }, ...TICKET_PRIORITIES.map((p) => ({ value: p, label: p }))],
    []
  );

  const categoryFilterOptions: FilterOption[] = useMemo(
    () => [{ value: "__all", label: "All categories" }, ...categoryOptions.map((c: StaffCategorySummary) => ({ value: c.id, label: c.name }))],
    [categoryOptions]
  );

  const assignmentGroups: FilterOptionGroup[] = useMemo(() => {
    if (!supportsAssignmentFilter) return [];

    const groups: FilterOptionGroup[] = [
      {
        label: "Queue scopes",
        options: [
          { value: "preset:assigned", label: "Assigned" },
          { value: "preset:unassigned", label: "Unassigned" },
          { value: "preset:all", label: "All" },
        ],
      },
    ];

    if (staffOptions.length > 0) {
      groups.push({
        label: "Staff members",
        options: staffOptions.map((staff: StaffPersonSummary) => ({
          value: `staff:${staff.id}`,
          label: staff.displayName,
        })),
      });
    }

    return groups;
  }, [staffOptions, supportsAssignmentFilter]);

  function handleAssignmentChange(value: string) {
    if (!supportsAssignmentFilter) return;

    if (value.startsWith("staff:")) {
      updateQuery({ assignedTo: value.slice("staff:".length), assignment: "all", tab: "all", page: "1" });
      return;
    }

    const preset = value.replace("preset:", "");
    if (preset === "assigned") {
      updateQuery({ assignedTo: null, assignment: "assigned", tab: "my", page: "1" });
      return;
    }
    if (preset === "unassigned" || preset === "all") {
      updateQuery({ assignedTo: null, assignment: preset, tab: preset === "unassigned" ? "unassigned" : "all", page: "1" });
    }
  }

  const tabItems = useMemo(
    () =>
      mode === "admin"
        ? [
            { value: "my" as const, label: "Assigned", badge: tabCounts.my },
            { value: "unassigned" as const, label: "Unassigned", badge: tabCounts.unassigned },
            { value: "all" as const, label: "All", badge: tabCounts.all },
          ]
        : [
            { value: "my" as const, label: "My Tickets", badge: tabCounts.my },
            { value: "unassigned" as const, label: "Unassigned", badge: tabCounts.unassigned },
          ],
    [mode, tabCounts]
  );

  const statsData = useMemo(
    () => [
      {
        label: mode === "admin" ? "Visible Tickets" : "Available Tickets",
        value: loading && !data ? "--" : summary.total,
        description:
          mode === "admin"
            ? "All tickets matching the current admin queue scope."
            : "Tickets assigned to you or waiting to be claimed.",
        negative: false,
        icon: <Ticket className="h-4 w-4" />,
      },
      {
        label: "Unassigned",
        value: loading && !data ? "--" : summary.unassigned,
        description: "Tickets not yet owned by any staff member.",
        negative: summary.unassigned > 0,
        icon: <UserX className="h-4 w-4" />,
      },
      {
        label: "High Priority",
        value: loading && !data ? "--" : summary.highPriority,
        description: "High-priority tickets in the current queue scope.",
        negative: summary.highPriority > 0,
        icon: <AlertTriangle className="h-4 w-4" />,
      },
    ],
    [mode, loading, data, summary]
  );

  return (
    <main className="mx-auto my-4 min-h-[calc(100vh-4rem)] max-w-6xl space-y-8 rounded-[1.75rem] border border-slate-200 bg-slate-50 px-4 py-8 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-4 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-100 bg-sky-50">
          <LayoutDashboard className="h-5 w-5 text-sky-700" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">{headerTitle}</h1>
          <p className="mt-0.5 text-slate-600">{headerSubtitle}</p>
        </div>
      </div>

      <BadgeTabs items={tabItems} value={activeTab} onValueChange={(value) => setTab(value as StaffTicketTab)} />

      <div className="relative z-20 space-y-4 rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className={`grid grid-cols-1 items-end gap-3 sm:grid-cols-2 ${supportsAssignmentFilter ? "lg:grid-cols-6" : "lg:grid-cols-5"}`}>
          <div className="lg:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Search</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchInput}
                placeholder="Ticket number or description"
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setSearchInput(nextValue);
                  setFilter("q", nextValue.trim());
                }}
                className="pl-9"
              />
            </div>
          </div>

          <FilterDropdown
            label="Status"
            options={statusOptions}
            value={currentStatus || "__all"}
            onChange={(value) => setFilter("status", value === "__all" ? "" : value)}
          />

          <FilterDropdown
            label="Priority"
            options={priorityOptions}
            value={currentPriority || "__all"}
            onChange={(value) => setFilter("priority", value === "__all" ? "" : value)}
          />

          <FilterDropdown
            label="Category"
            options={categoryFilterOptions}
            value={currentCategoryId || "__all"}
            onChange={(value) => setFilter("categoryId", value === "__all" ? "" : value)}
          />

          {supportsAssignmentFilter ? (
            <FilterDropdown
              label="Assignment"
              groups={assignmentGroups}
              value={currentAssignedTo ? `staff:${currentAssignedTo}` : `preset:${activeTab === "my" ? "assigned" : activeTab}`}
              onChange={handleAssignmentChange}
            />
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-slate-600">
              {selectedStaffName
                ? `Filtering tickets assigned to ${selectedStaffName}.`
                : mode === "admin"
                  ? "Admin view includes every ticket in the system."
                  : "Staff view is limited to your tickets and unassigned work."}
              {isUpdating ? (
                <span className="ml-2 inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Refreshing...
                </span>
              ) : null}
            </p>
            {currentStatus ? (
              <Badge variant="secondary" className="gap-1 border border-sky-100 bg-sky-50 pl-2 pr-1 text-sky-800">
                Status: {currentStatus}
              </Badge>
            ) : null}
            {currentPriority ? (
              <Badge variant="secondary" className="gap-1 border border-sky-100 bg-sky-50 pl-2 pr-1 text-sky-800">
                Priority: {currentPriority}
              </Badge>
            ) : null}
            {currentCategoryId ? (
              <Badge variant="secondary" className="gap-1 border border-sky-100 bg-sky-50 pl-2 pr-1 text-sky-800">
                Category: {categoryOptions.find((category) => category.id === currentCategoryId)?.name ?? "Selected"}
              </Badge>
            ) : null}
          </div>
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset Filters
          </Button>
        </div>
      </div>

      <QueueStats stats={statsData} loading={loading && !data} />

      {loading && !data ? <QueueSkeleton /> : null}

      {!loading && error ? (
        <div className="flex items-start gap-3 rounded-[1.25rem] border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">Queue request failed.</p>
            <p className="mt-1 text-sm text-slate-600">{error}</p>
          </div>
        </div>
      ) : null}

      {!loading && !error && data ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Ticket Queue</h2>
              <p className="mt-1 text-sm text-slate-600">
                {pagination
                  ? pagination.total === 0
                    ? "No matching tickets in the current queue scope."
                    : `Showing ${(pagination.page - 1) * pagination.pageSize + 1}-${Math.min(pagination.page * pagination.pageSize, pagination.total)} of ${pagination.total}`
                  : "Queue results"}
              </p>
            </div>
            {pagination ? (
              <p className="text-sm text-slate-500">
                {pagination.total.toLocaleString()} total · page {pagination.page} of {pagination.totalPages}
              </p>
            ) : null}
          </div>

          {visibleTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[1.4rem] border border-dashed border-slate-300 bg-white py-16 text-center">
              <Inbox className="h-10 w-10 text-slate-400" />
              <p className="font-medium text-slate-600">No tickets match this view.</p>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="relative">
              {isUpdating ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[1.4rem] bg-white/70">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {visibleTickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} detailHrefBase={detailHrefBase} />
                ))}
              </div>
            </div>
          )}

          {pagination ? (
            <div className="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row">
              <p className="text-sm text-slate-600">
                {pagination.total === 0
                  ? "Showing 0 of 0"
                  : `Showing ${(pagination.page - 1) * pagination.pageSize + 1}-${Math.min(pagination.page * pagination.pageSize, pagination.total)} of ${pagination.total}`}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[4rem] text-center text-sm tabular-nums text-slate-600">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage(pagination.page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
