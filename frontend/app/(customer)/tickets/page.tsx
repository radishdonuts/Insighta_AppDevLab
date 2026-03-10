"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Ticket,
} from "lucide-react";

import CustomerWorkspaceSkeleton from "@/components/features/customer/tickets/CustomerWorkspaceSkeleton";
import CustomerWorkspaceTicketCard from "@/components/features/customer/tickets/CustomerWorkspaceTicketCard";
import QueueStats from "@/components/features/staff/workspace/QueueStats";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import FilterDropdown from "@/components/ui/filter-dropdown";
import { Input } from "@/components/ui/input";
import { TicketStatus } from "@/types/tickets";

type UserTicket = {
  id: string;
  tracking_number: string | null;
  status: TicketStatus;
  title: string | null;
  category_name: string;
  description: string;
};

type TicketSummary = {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
};

type MyTicketsResponse = {
  tickets: UserTicket[];
  total: number;
  summary: TicketSummary;
};

function toTrackToken(value: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.startsWith("TRK-") ? trimmed : null;
}

async function readApiError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string; message?: string };
    return payload.message || payload.error || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

async function fetchMyTickets(search: string, status: string, page: number): Promise<MyTicketsResponse> {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (status && status !== "all") params.set("status", status);
  params.set("page", String(page));

  const res = await fetch(`/api/tickets/my?${params.toString()}`);
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }

  return res.json();
}

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<UserTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<TicketSummary>({
    totalTickets: 0,
    openTickets: 0,
    resolvedTickets: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [tempSearch, setTempSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetchMyTickets(searchQuery, statusFilter, page).then((res) => {
      if (!active) return;
      setTickets(res.tickets);
      setTotal(res.total);
      setSummary(res.summary);
      setLoading(false);
    }).catch((loadError) => {
      if (!active) return;
      setTickets([]);
      setTotal(0);
      setError(loadError instanceof Error ? loadError.message : "Failed to load tickets.");
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [searchQuery, statusFilter, page]);

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSearchQuery(tempSearch);
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize) || 1;
  const hasFilters = Boolean(searchQuery) || statusFilter !== "all";
  const hasLoadedData = tickets.length > 0 || total > 0;
  const statusOptions = [
    { value: "__all", label: "All statuses" },
    { value: "Under Review", label: "Under Review" },
    { value: "In Progress", label: "In Progress" },
    { value: "Pending Customer Response", label: "Pending Customer Response" },
    { value: "Resolved", label: "Resolved" },
    { value: "Closed", label: "Closed" },
  ];
  const statsData = [
    {
      label: "Total Tickets",
      value: summary.totalTickets,
      description: "All complaints and inquiries you have submitted.",
      icon: <Ticket className="h-4 w-4" />,
    },
    {
      label: "Open Tickets",
      value: summary.openTickets,
      description: "Tickets still being reviewed or waiting for action.",
      negative: summary.openTickets > 0,
      icon: <Loader2 className="h-4 w-4" />,
    },
    {
      label: "Resolved Tickets",
      value: summary.resolvedTickets,
      description: "Tickets that have already been resolved or closed.",
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
  ];
  const brandBlueVars = {
    "--accent": "#179fe5",
    "--accent-hover": "#138dc9",
  } as CSSProperties;

  return (
    <main className="mx-auto my-4 min-h-[calc(100vh-4rem)] max-w-6xl rounded-xl border bg-white px-4 py-8" style={brandBlueVars}>
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e8f6ff]">
            <Ticket className="h-5 w-5 text-[#179fe5]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">My Tickets</h1>
            <p className="mt-0.5 text-muted-foreground">
              Track and manage your submitted complaints and inquiries.
            </p>
          </div>
        </div>

        <QueueStats stats={statsData} loading={loading && !hasLoadedData && !error} />

        <div className="relative z-20 space-y-4 rounded-xl border bg-white p-5">
          <form className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-6" onSubmit={handleSearchSubmit}>
            <div className="lg:col-span-4">
              <span className="mb-1.5 block text-sm font-medium text-foreground">Search</span>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    value={tempSearch}
                    placeholder="Tracking number or description"
                    onChange={(e) => setTempSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  type="submit"
                  className="border border-[#179fe5] bg-[#179fe5] text-[#f8fafc] hover:border-[#138dc9] hover:bg-[#138dc9]"
                >
                  Apply
                </Button>
              </div>
            </div>

            <FilterDropdown
              label="Status"
              options={statusOptions}
              value={statusFilter === "all" ? "__all" : statusFilter}
              onChange={(value) => {
                setStatusFilter(value === "__all" ? "all" : value);
                setPage(1);
              }}
            />

            <div className="flex items-end justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full lg:w-auto"
                onClick={() => {
                  setTempSearch("");
                  setSearchQuery("");
                  setStatusFilter("all");
                  setPage(1);
                }}
              >
                Reset Filters
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            {loading && hasLoadedData ? (
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Refreshing...
              </span>
            ) : null}
            {searchQuery ? (
              <Badge variant="secondary" className="gap-1">
                Search: {searchQuery}
              </Badge>
            ) : null}
            {statusFilter !== "all" ? (
              <Badge variant="secondary" className="gap-1">
                Status: {statusFilter}
              </Badge>
            ) : null}
          </div>
        </div>

        {error && !loading ? (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-semibold text-destructive">Ticket request failed.</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#179fe5]">Ticket Queue</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {total === 0
                  ? hasFilters
                    ? "No matching tickets for the current filters."
                    : "Your submitted tickets will appear here."
                  : `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}`}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {total.toLocaleString()} total {total === 1 ? "ticket" : "tickets"}
            </p>
          </div>

          {loading && !hasLoadedData ? <CustomerWorkspaceSkeleton /> : null}

          {!loading && !error && tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
              <Ticket className="h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium text-muted-foreground">
                {hasFilters ? "No tickets match this view." : "You have not submitted any tickets yet."}
              </p>
              {!hasFilters ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/submit">Submit a Complaint</Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTempSearch("");
                    setSearchQuery("");
                    setStatusFilter("all");
                    setPage(1);
                  }}
                >
                  Reset Filters
                </Button>
              )}
            </div>
          ) : null}

          {!error && tickets.length > 0 ? (
            <div className="relative">
              {loading ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-sm">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {tickets.map((ticket) => {
                  const token = toTrackToken(ticket.tracking_number);
                  const destination = `/tickets/${ticket.id}${token ? `?token=${encodeURIComponent(token)}` : ""}`;

                  return (
                    <CustomerWorkspaceTicketCard
                      key={ticket.id}
                      id={ticket.id}
                      destination={destination}
                      trackingNumber={ticket.tracking_number ?? "Pending Tracking Number"}
                      complaintTitle={ticket.title}
                      categoryName={ticket.category_name}
                      status={ticket.status}
                      description={ticket.description}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}

          {!error && total > 0 ? (
            <div className="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  type="button"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[4rem] text-center text-sm tabular-nums text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  type="button"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
