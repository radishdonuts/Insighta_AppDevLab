"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowUpRight, Filter, Search, Sparkles, UserRound, Users } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { StaffTicketQueueResponse, StaffTicketTab } from "@/types/staff-tickets";

import {
  AssignmentSelection,
  MetricCard,
  QueueFilters,
  categoryBadge,
  formatDateTime,
  initialsForName,
  priorityBadge,
  sourceSummary,
  statusBadge,
} from "./queue-ui";
import { QueueMobileCard, QueueSkeleton } from "./queue-states";

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
  const selectedStaffName =
    assignmentSelection.kind === "staff"
      ? staffOptions.find((staff) => staff.id === assignmentSelection.value)?.displayName ?? "Staff member"
      : null;
  const visibleTickets = data?.data ?? [];
  const visibleCount = visibleTickets.length;
  const visibleUnassigned = visibleTickets.filter((ticket) => !ticket.assignedStaff).length;
  const visibleHighPriority = visibleTickets.filter((ticket) => ticket.priority === "High").length;
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

  function handleAssignmentChange(next: AssignmentSelection) {
    if (next.kind === "staff") {
      updateQuery({ assignedTo: next.value, assignment: "all", tab: "all", page: "1" });
      return;
    }

    updateQuery({
      assignedTo: null,
      assignment: next.value,
      tab: assignmentToTab(next.value),
      page: "1",
    });
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

  useEffect(() => {
    const currentQ = (searchParams.get("q") ?? "").trim();
    const nextQ = searchInput.trim();
    if (currentQ === nextQ) return;

    const timer = window.setTimeout(() => {
      updateQuery({ q: nextQ || null, page: "1" });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchInput, searchKey]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-2xl flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Queue Console</Badge>
              <Badge variant="secondary">Triage First</Badge>
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Staff Ticket Workspace</h1>
              <p className="text-sm text-muted-foreground md:text-base">
                Scan priority, ownership, and current case state from one queue before opening the full workbench.
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setTab(value as StaffTicketTab)} className="w-full lg:w-auto">
            <TabsList className="grid h-auto w-full grid-cols-3 lg:w-auto">
              <TabsTrigger value="my">My Tickets</TabsTrigger>
              <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center justify-between gap-3 md:hidden">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">Queue controls</span>
            <span className="text-sm text-muted-foreground">Filters, assignment scope, and reset live in one sheet.</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <Filter data-icon="inline-start" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Queue Filters</SheetTitle>
                <SheetDescription>Change queue scope, search terms, and classification filters.</SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <QueueFilters
                  searchValue={searchInput}
                  status={currentStatus}
                  priority={currentPriority}
                  categoryId={currentCategoryId}
                  assignmentSelection={assignmentSelection}
                  categoryOptions={categoryOptions}
                  staffOptions={staffOptions}
                  selectedStaffName={selectedStaffName}
                  isUpdating={isUpdating}
                  onSearchChange={setSearchInput}
                  onStatusChange={(value) => setFilter("status", value)}
                  onPriorityChange={(value) => setFilter("priority", value)}
                  onCategoryChange={(value) => setFilter("categoryId", value)}
                  onAssignmentChange={handleAssignmentChange}
                  onReset={handleReset}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Visible tickets" value={loading && !data ? "--" : String(visibleCount)} description="Count for the current filter set and page." icon={<Users />} />
        <MetricCard title="Unassigned" value={loading && !data ? "--" : String(visibleUnassigned)} description="Tickets on this page that have no current owner." icon={<UserRound />} />
        <MetricCard title="High priority" value={loading && !data ? "--" : String(visibleHighPriority)} description="Cases on this page that should be reviewed first." icon={<Sparkles />} />
      </div>

      <div className="hidden md:block">
        <QueueFilters
          searchValue={searchInput}
          status={currentStatus}
          priority={currentPriority}
          categoryId={currentCategoryId}
          assignmentSelection={assignmentSelection}
          categoryOptions={categoryOptions}
          staffOptions={staffOptions}
          selectedStaffName={selectedStaffName}
          isUpdating={isUpdating}
          onSearchChange={setSearchInput}
          onStatusChange={(value) => setFilter("status", value)}
          onPriorityChange={(value) => setFilter("priority", value)}
          onCategoryChange={(value) => setFilter("categoryId", value)}
          onAssignmentChange={handleAssignmentChange}
          onReset={handleReset}
        />
      </div>

      {loading && !data ? <QueueSkeleton /> : null}

      {!loading && error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Queue request failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!loading && !error && data ? (
        <Card className="border-border/70 bg-card">
          <CardHeader className="flex flex-col gap-4 pb-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle>Ticket Queue</CardTitle>
                <CardDescription>
                  {pagination
                    ? pagination.total === 0
                      ? "No matching tickets in the current queue scope."
                      : `Showing ${(pagination.page - 1) * pagination.pageSize + 1}-${Math.min(
                          pagination.page * pagination.pageSize,
                          pagination.total
                        )} of ${pagination.total}`
                    : "Queue results"}
                </CardDescription>
              </div>
              {pagination ? (
                <div className="flex flex-col gap-2 text-sm text-muted-foreground lg:items-end">
                  <span>{pagination.total.toLocaleString()} total tickets</span>
                  <span>Page {pagination.page} of {pagination.totalPages}</span>
                </div>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            {visibleTickets.length === 0 ? (
              <Empty className="border border-dashed border-border bg-muted/20">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Search />
                  </EmptyMedia>
                  <EmptyTitle>No tickets match this view</EmptyTitle>
                  <EmptyDescription>Adjust the current filters or switch queue presets to reveal more tickets.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[34%]">Ticket</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Assignee</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleTickets.map((ticket) => (
                        <TableRow key={ticket.id} className="align-top">
                          <TableCell>
                            <div className="flex min-w-0 flex-col gap-2">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Link href={`/staff/tickets/${ticket.id}`} className="truncate font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline">
                                      {ticket.ticketNumber}
                                    </Link>
                                    <Badge variant="outline">{ticket.submitterType}</Badge>
                                  </div>
                                  <p className="mt-1 truncate text-sm text-foreground">{ticket.title ?? ticket.description}</p>
                                  {ticket.title ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{ticket.description}</p> : null}
                                </div>
                                <Button asChild variant="ghost" size="sm">
                                  <Link href={`/staff/tickets/${ticket.id}`}>
                                    Open
                                    <ArrowUpRight data-icon="inline-end" />
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{statusBadge(ticket.status)}</TableCell>
                          <TableCell>{priorityBadge(ticket.priority)}</TableCell>
                          <TableCell>{categoryBadge(ticket.category?.name ?? "Uncategorized")}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="size-8">
                                <AvatarFallback>{initialsForName(ticket.assignedStaff?.displayName ?? "Unassigned")}</AvatarFallback>
                              </Avatar>
                              <div className="flex min-w-0 flex-col gap-0.5">
                                <span className="truncate font-medium text-foreground">{ticket.assignedStaff?.displayName ?? "Unassigned"}</span>
                                <span className="truncate text-xs text-muted-foreground">{ticket.assignedStaff?.email ?? "No current owner"}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDateTime(ticket.lastUpdatedAt)}</TableCell>
                          <TableCell>
                            <div className="flex max-w-[14rem] flex-wrap gap-2">
                              <Badge variant="outline">{sourceSummary(ticket.prioritySource, ticket.categorySource)}</Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid gap-4 lg:hidden">
                  {visibleTickets.map((ticket) => <QueueMobileCard key={ticket.id} ticket={ticket} />)}
                </div>
              </>
            )}

            {pagination ? (
              <div className="flex flex-col gap-3 border-t border-border/70 pt-4 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-muted-foreground">
                  {pagination.total === 0
                    ? "Showing 0 of 0"
                    : `Showing ${(pagination.page - 1) * pagination.pageSize + 1}-${Math.min(
                        pagination.page * pagination.pageSize,
                        pagination.total
                      )} of ${pagination.total}`}
                </p>
                <Pagination className="mx-0 w-auto justify-start md:justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        aria-disabled={pagination.page <= 1}
                        className={cn(pagination.page <= 1 && "pointer-events-none opacity-50")}
                        onClick={(event) => {
                          event.preventDefault();
                          if (pagination.page > 1) setPage(pagination.page - 1);
                        }}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <Badge variant="outline" className="h-9 rounded-md px-3 text-sm">
                        {pagination.page} / {pagination.totalPages}
                      </Badge>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        aria-disabled={pagination.page >= pagination.totalPages}
                        className={cn(pagination.page >= pagination.totalPages && "pointer-events-none opacity-50")}
                        onClick={(event) => {
                          event.preventDefault();
                          if (pagination.page < pagination.totalPages) setPage(pagination.page + 1);
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
