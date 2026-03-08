"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, AlertCircle, Loader2, LayoutDashboard, ChevronLeft, ChevronRight, Inbox, X, Ticket, UserX, AlertTriangle } from "lucide-react";

import type {
  StaffCategorySummary,
  StaffPersonSummary,
  StaffTicketQueueResponse,
  StaffTicketTab,
} from "@/types/staff-tickets";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/types/tickets";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BadgeTabs from "@/components/ui/badge-tabs";
import FilterDropdown from "@/components/ui/filter-dropdown";
import type { FilterOption, FilterOptionGroup } from "@/components/ui/filter-dropdown";

import { QueueSkeleton } from "./queue-states";
import QueueStats from "./QueueStats";
import TicketCard from "./TicketCard";
import { assignmentValue, type AssignmentSelection } from "./queue-ui";

type ApiErrorPayload = { error?: string; message?: string };
type AssignmentPreset = "all" | "mine" | "unassigned";

function assignmentToTab(assignment: AssignmentPreset): StaffTicketTab {
  if (assignment === "mine") return "my";
  if (assignment === "unassigned") return "unassigned";
  return "all";
}

function tabToAssignment(tab: StaffTicketTab): AssignmentPreset {
  if (tab === "my") return "mine";
  if (tab === "unassigned") return "unassigned";
  return "all";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function resolveUiState(searchParams: URLSearchParams) {
  const assignedToRaw = (searchParams.get("assignedTo") ?? "").trim();
  const assignedTo = isUuid(assignedToRaw) ? assignedToRaw : "";

  if (assignedTo) {
    return {
      activeTab: "all" as StaffTicketTab,
      assignmentSelection: { kind: "staff", value: assignedTo } as AssignmentSelection,
    };
  }

  const assignmentRaw = (searchParams.get("assignment") ?? "").trim();
  if (
    assignmentRaw === "mine" ||
    assignmentRaw === "unassigned" ||
    assignmentRaw === "all" ||
    assignmentRaw === "assigned"
  ) {
    const assignmentPreset = assignmentRaw === "assigned" ? "all" : (assignmentRaw as AssignmentPreset);
    return {
      activeTab: assignmentToTab(assignmentPreset),
      assignmentSelection: { kind: "preset", value: assignmentPreset } as AssignmentSelection,
    };
  }

  const tabRaw = (searchParams.get("tab") ?? "").trim();
  const mappedAssignment = tabRaw === "unassigned" ? "unassigned" : tabRaw === "all" ? "all" : "mine";

  return {
    activeTab: assignmentToTab(mappedAssignment),
    assignmentSelection: { kind: "preset", value: mappedAssignment } as AssignmentSelection,
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

export default function StaffWorkspaceClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

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
        const response = await fetch(`/api/staff/tickets${qs ? `?${qs}` : ""}`, {
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
  }, [searchKey, searchParams]);

  const { activeTab, assignmentSelection } = useMemo(
    () => resolveUiState(new URLSearchParams(searchParams.toString())),
    [searchKey, searchParams]
  );

  const currentStatus = searchParams.get("status") ?? "";
  const currentPriority = searchParams.get("priority") ?? "";
  const currentCategoryId = searchParams.get("categoryId") ?? "";
  const categoryOptions = useMemo(() => data?.categoryOptions ?? [], [data]);
  const staffOptions = useMemo(() => data?.staffOptions ?? [], [data]);
  const pagination = data?.pagination ?? null;
  const visibleTickets = data?.data ?? [];
  const visibleCount = visibleTickets.length;
  const visibleUnassigned = visibleTickets.filter((ticket) => !ticket.assignedStaff).length;
  const visibleHighPriority = visibleTickets.filter((ticket) => ticket.priority === "High").length;
  const selectedStaffName =
    assignmentSelection.kind === "staff"
      ? staffOptions.find((staff) => staff.id === assignmentSelection.value)?.displayName ?? "Staff member"
      : null;
  const isUpdating = loading && data !== null;

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
    updateQuery({
      assignment: tabToAssignment(tab),
      tab,
      assignedTo: null,
      page: "1",
    });
  }

  function handleAssignmentChange(value: string) {
    if (value.startsWith("staff:")) {
      updateQuery({ assignedTo: value.slice("staff:".length), assignment: "all", tab: "all", page: "1" });
      return;
    }

    const preset = value.replace("preset:", "");
    if (preset === "mine" || preset === "unassigned" || preset === "all") {
      updateQuery({
        assignedTo: null,
        assignment: preset,
        tab: assignmentToTab(preset),
        page: "1",
      });
    }
  }

  function handleReset() {
    updateQuery({
      q: null,
      status: null,
      priority: null,
      categoryId: null,
      assignedTo: null,
      assignment: "mine",
      tab: "my",
      page: "1",
    });
  }

  /* ── derived filter options for FilterDropdown ── */
  const statusOptions: FilterOption[] = useMemo(
    () => [
      { value: "__all", label: "All statuses" },
      ...TICKET_STATUSES.map((s) => ({ value: s, label: s })),
    ],
    []
  );

  const priorityOptions: FilterOption[] = useMemo(
    () => [
      { value: "__all", label: "All priorities" },
      ...TICKET_PRIORITIES.map((p) => ({ value: p, label: p })),
    ],
    []
  );

  const categoryFilterOptions: FilterOption[] = useMemo(
    () => [
      { value: "__all", label: "All categories" },
      ...categoryOptions.map((c: StaffCategorySummary) => ({
        value: c.id,
        label: c.name,
      })),
    ],
    [categoryOptions]
  );

  const assignmentGroups: FilterOptionGroup[] = useMemo(() => {
    const groups: FilterOptionGroup[] = [
      {
        label: "Presets",
        options: [
          { value: "preset:mine", label: "Mine" },
          { value: "preset:unassigned", label: "Unassigned" },
          { value: "preset:all", label: "All" },
        ],
      },
    ];
    if (staffOptions.length > 0) {
      groups.push({
        label: "Staff members",
        options: staffOptions.map((s: StaffPersonSummary) => ({
          value: `staff:${s.id}`,
          label: s.displayName,
        })),
      });
    }
    return groups;
  }, [staffOptions]);

  /* ── tab items with badge counts ── */
  const tabItems = useMemo(
    () => [
      { value: "my" as const, label: "My Tickets", badge: pagination?.total ?? 0 },
      { value: "unassigned" as const, label: "Unassigned", badge: visibleUnassigned },
      { value: "all" as const, label: "All", badge: pagination?.total ?? 0 },
    ],
    [pagination, visibleUnassigned]
  );

  /* ── stats data ── */
  const statsData = useMemo(
    () => [
      {
        label: "Visible Tickets",
        value: loading && !data ? "--" : visibleCount,
        description: "Count for the current filter set and page.",
        negative: false,
        icon: <Ticket className="h-4 w-4" />,
      },
      {
        label: "Unassigned",
        value: loading && !data ? "--" : visibleUnassigned,
        description: "Tickets on this page without an owner.",
        negative: visibleUnassigned > 0,
        icon: <UserX className="h-4 w-4" />,
      },
      {
        label: "High Priority",
        value: loading && !data ? "--" : visibleHighPriority,
        description: "Cases on this page marked high priority.",
        negative: visibleHighPriority > 0,
        icon: <AlertTriangle className="h-4 w-4" />,
      },
    ],
    [loading, data, visibleCount, visibleUnassigned, visibleHighPriority]
  );

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
          <LayoutDashboard className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Staff Ticket Workspace
          </h1>
          <p className="text-muted-foreground mt-0.5">
            Manage and triage incoming tickets.
          </p>
        </div>
      </div>

      {/* ── Badge Tabs ── */}
      <BadgeTabs
        items={tabItems}
        value={activeTab}
        onValueChange={(v) => setTab(v as StaffTicketTab)}
      />

      {/* ── Toolbar: Search + Filters ── */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          {/* Search — spans 2 cols on lg */}
          <div className="lg:col-span-2">
            <span className="block text-sm font-medium text-foreground mb-1.5">
              Search
            </span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                value={searchInput}
                placeholder="Ticket number or description"
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <FilterDropdown
            label="Status"
            options={statusOptions}
            value={currentStatus || "__all"}
            onChange={(v) => setFilter("status", v === "__all" ? "" : v)}
          />

          <FilterDropdown
            label="Priority"
            options={priorityOptions}
            value={currentPriority || "__all"}
            onChange={(v) => setFilter("priority", v === "__all" ? "" : v)}
          />

          <FilterDropdown
            label="Category"
            options={categoryFilterOptions}
            value={currentCategoryId || "__all"}
            onChange={(v) => setFilter("categoryId", v === "__all" ? "" : v)}
          />

          <FilterDropdown
            label="Assignment"
            groups={assignmentGroups}
            value={assignmentValue(assignmentSelection)}
            onChange={handleAssignmentChange}
          />
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {selectedStaffName
                ? `Assigned to ${selectedStaffName}.`
                : "Filters stay synced to the URL."}
              {isUpdating && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Refreshing…
                </span>
              )}
            </p>
            {/* Active filter chips */}
            {currentStatus && (
              <Badge variant="secondary" className="gap-1 pl-2 pr-1 cursor-pointer" onClick={() => setFilter("status", "")}>
                Status: {currentStatus}
                <X className="h-3 w-3" />
              </Badge>
            )}
            {currentPriority && (
              <Badge variant="secondary" className="gap-1 pl-2 pr-1 cursor-pointer" onClick={() => setFilter("priority", "")}>
                Priority: {currentPriority}
                <X className="h-3 w-3" />
              </Badge>
            )}
            {currentCategoryId && (
              <Badge variant="secondary" className="gap-1 pl-2 pr-1 cursor-pointer" onClick={() => setFilter("categoryId", "")}>
                Category: {categoryOptions.find((c) => c.id === currentCategoryId)?.name ?? "Selected"}
                <X className="h-3 w-3" />
              </Badge>
            )}
            {[currentStatus, currentPriority, currentCategoryId].filter(Boolean).length >= 2 && (
              <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground px-2" onClick={handleReset}>
                Clear all
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset Filters
          </Button>
        </div>
      </div>

      {/* ── Queue Stats ── */}
      <QueueStats stats={statsData} loading={loading && !data} />

      {/* ── Loading skeleton (first load only) ── */}
      {loading && !data ? <QueueSkeleton /> : null}

      {/* ── Error ── */}
      {!loading && error ? (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">
              Queue request failed.
            </p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      ) : null}

      {/* ── Ticket Queue ── */}
      {!loading && !error && data ? (
        <div className="space-y-4">
          {/* Section header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Ticket Queue
              </h2>
              <p className="text-sm text-muted-foreground">
                {pagination
                  ? pagination.total === 0
                    ? "No matching tickets in the current queue scope."
                    : `Showing ${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(
                        pagination.page * pagination.pageSize,
                        pagination.total
                      )} of ${pagination.total}`
                  : "Queue results"}
              </p>
            </div>
            {pagination ? (
              <p className="text-sm text-muted-foreground">
                {pagination.total.toLocaleString()} total &middot; page{" "}
                {pagination.page} of {pagination.totalPages}
              </p>
            ) : null}
          </div>

          {/* Ticket cards */}
          {visibleTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 gap-3">
              <Inbox className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-muted-foreground font-medium">
                No tickets match this view.
              </p>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="relative">
              {isUpdating && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-sm">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleTickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {pagination ? (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
              <p className="text-sm text-muted-foreground">
                {pagination.total === 0
                  ? "Showing 0 of 0"
                  : `Showing ${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(
                      pagination.page * pagination.pageSize,
                      pagination.total
                    )} of ${pagination.total}`}
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
                <span className="text-sm text-muted-foreground tabular-nums min-w-[4rem] text-center">
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
