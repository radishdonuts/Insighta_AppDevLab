"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import TicketCard, {
  type TicketCardBadge,
  type TicketCardBadgeTone,
} from "@/components/features/customer/tickets/TicketCard";
import TicketGrid from "@/components/features/customer/tickets/TicketGrid";
import WorkspaceTopStrip from "@/components/features/customer/tickets/WorkspaceTopStrip";
import workspaceStyles from "@/components/features/customer/tickets/workspace-ui.module.css";
import { TicketStatus } from "@/types/tickets";

type UserTicket = {
  id: string;
  tracking_number: string | null;
  status: TicketStatus;
  category_name: string;
  description: string;
  submitted_at: string;
};

function getRelativeDate(isoString: string) {
  const date = new Date(isoString);
  const diffInDays = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 3600 * 24));

  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 30) return `${diffInDays} days ago`;
  return date.toLocaleDateString();
}

function toTrackToken(value: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.startsWith("TRK-") ? trimmed : null;
}

function truncate(text: string, max = 120) {
  return text.length <= max ? text : `${text.slice(0, max - 1)}...`;
}

function statusTone(status: string): TicketCardBadgeTone {
  if (status === "Resolved" || status === "Closed") return "success";
  if (status === "In Progress") return "warning";
  if (status === "Pending Customer Response") return "info";
  return "accent";
}

function iconToneForStatus(status: string): "blue" | "mint" | "amber" | "rose" | "lavender" {
  if (status === "Resolved" || status === "Closed") return "mint";
  if (status === "Pending Customer Response") return "lavender";
  if (status === "In Progress") return "amber";
  return "blue";
}

async function fetchMyTickets(search: string, status: string, page: number): Promise<{ tickets: UserTicket[]; total: number }> {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (status && status !== "all") params.set("status", status);
  params.set("page", String(page));

  const res = await fetch(`/api/tickets/my?${params.toString()}`);
  if (!res.ok) {
    return { tickets: [], total: 0 };
  }

  return res.json();
}

export default function MyTicketsPage() {
  const router = useRouter();

  const [tickets, setTickets] = useState<UserTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [tempSearch, setTempSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchMyTickets(searchQuery, statusFilter, page).then((res) => {
      if (!active) return;
      setTickets(res.tickets);
      setTotal(res.total);
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

  return (
    <main className={workspaceStyles.page}>
      <WorkspaceTopStrip
        title="My Tickets"
        subtitle="Track and manage your submitted complaints and inquiries."
      />

      <section className={`${workspaceStyles.surfaceCard} ${workspaceStyles.controlCard}`}>
        <form className={workspaceStyles.filtersGrid} onSubmit={handleSearchSubmit}>
          <label className={workspaceStyles.field}>
            <span className={workspaceStyles.fieldLabel}>Search</span>
            <div className={workspaceStyles.inlineField}>
              <input
                type="search"
                className={workspaceStyles.input}
                placeholder="Tracking number or description"
                value={tempSearch}
                onChange={(e) => setTempSearch(e.target.value)}
              />
              <button type="submit" className={workspaceStyles.buttonPrimary}>
                Apply
              </button>
            </div>
          </label>

          <label className={workspaceStyles.field}>
            <span className={workspaceStyles.fieldLabel}>Status</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className={workspaceStyles.select}
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="Under Review">Under Review</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending Customer Response">Pending Customer Response</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </label>
        </form>
      </section>

      <section className={`${workspaceStyles.surfaceCard} ${workspaceStyles.sectionCard}`}>
        <div className={workspaceStyles.sectionHeader}>
          <h2 className={workspaceStyles.sectionTitle}>Ticket List</h2>
          <p className={workspaceStyles.metaText}>{total} ticket(s)</p>
        </div>

        {loading ? <p className={workspaceStyles.stateCard}>Loading tickets...</p> : null}

        {!loading && tickets.length === 0 ? (
          <div className={workspaceStyles.stateCard}>
            <p>{hasFilters ? "No tickets found for the current filters." : "You have not submitted any tickets yet."}</p>
            {!hasFilters ? (
              <p style={{ marginTop: 10 }}>
                <Link href="/submit" className={workspaceStyles.buttonPrimary}>
                  Submit a Complaint
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}

        {!loading && tickets.length > 0 ? (
          <>
            <TicketGrid
              items={tickets}
              getKey={(ticket) => ticket.id}
              renderCard={(ticket) => {
                const token = toTrackToken(ticket.tracking_number);
                const destination = `/tickets/${ticket.id}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
                const badges: TicketCardBadge[] = [
                  { label: ticket.status, tone: statusTone(ticket.status) },
                  { label: ticket.category_name, tone: "accent" },
                ];

                return (
                  <TicketCard
                    icon="MY"
                    iconTone={iconToneForStatus(ticket.status)}
                    title={ticket.tracking_number ?? "Pending Tracking Number"}
                    subtitle={ticket.category_name}
                    description={truncate(ticket.description, 156)}
                    badges={badges}
                    metaItems={[
                      { label: "Submitted", value: getRelativeDate(ticket.submitted_at) },
                    ]}
                    footerNote="View latest status and timeline"
                    ctaLabel="View"
                    onOpen={() => router.push(destination)}
                    ariaLabel={`View ticket ${ticket.tracking_number ?? ticket.id}`}
                  />
                );
              }}
            />

            {total > 0 ? (
              <div className={workspaceStyles.paginationBar}>
                <span className={workspaceStyles.metaText}>
                  Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className={workspaceStyles.buttonSecondary}
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    type="button"
                  >
                    Previous
                  </button>
                  <button
                    className={workspaceStyles.buttonSecondary}
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  );
}
