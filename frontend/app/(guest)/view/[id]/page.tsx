"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";

type ApiTicket = {
  id?: unknown;
  ticket_id?: unknown;
  reference?: unknown;
  ticket_number?: unknown;
  ticketType?: unknown;
  ticket_type?: unknown;
  title?: unknown;
  status?: unknown;
  priority?: unknown;
  categoryName?: unknown;
  category_name?: unknown;
  description?: unknown;
  submittedAt?: unknown;
  submitted_at?: unknown;
  lastUpdatedAt?: unknown;
  last_updated_at?: unknown;
  guest_tracking_number?: unknown;
};

type TicketResponse = {
  ok?: boolean;
  message?: string;
  ticket?: ApiTicket;
};

type TicketDetail = {
  id: string;
  reference: string;
  ticketType: string;
  title: string;
  status: string;
  category: string;
  description: string;
  submittedAt: string;
  lastUpdatedAt: string;
  guestTrackingNumber: string;
};

const STEPS = ["Received", "In Review", "In Progress", "Resolved"] as const;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toTicketDetail(input: ApiTicket, fallbackId: string): TicketDetail {
  return {
    id: asString(input.id) || asString(input.ticket_id) || fallbackId,
    reference: asString(input.reference) || asString(input.ticket_number),
    ticketType: asString(input.ticketType) || asString(input.ticket_type),
    title: asString(input.title),
    status: asString(input.status),
    category: asString(input.categoryName) || asString(input.category_name),
    description: asString(input.description),
    submittedAt: asString(input.submittedAt) || asString(input.submitted_at),
    lastUpdatedAt: asString(input.lastUpdatedAt) || asString(input.last_updated_at),
    guestTrackingNumber: asString(input.guest_tracking_number),
  };
}

function deriveStepIndex(status: string): number {
  const normalized = status.toLowerCase();
  if (!normalized) return 0;
  if (normalized.includes("resolved") || normalized.includes("closed")) return 3;
  if (normalized.includes("progress") || normalized.includes("pending")) return 2;
  if (normalized.includes("review")) return 1;
  return 0;
}

function formatDate(value: string): string {
  if (!value) return "";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function capitalizeFirstLetter(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<TicketDetailFallback id={params.id} />}>
      <TicketDetailPageContent params={params} />
    </Suspense>
  );
}

function TicketDetailPageContent({
  params,
}: {
  params: { id: string };
}) {
  const searchParams = useSearchParams();
  const token = asString(searchParams.get("token"));

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTicket() {
      setLoading(true);
      setError(null);

      try {
        const useTokenLookup = Boolean(token);

        const primaryEndpoint = useTokenLookup
          ? `/api/ticket/lookup?token=${encodeURIComponent(token)}`
          : `/api/ticket/${encodeURIComponent(params.id)}`;

        const primaryResponse = await fetch(primaryEndpoint, { cache: "no-store" });
        const primaryPayload = (await primaryResponse.json()) as TicketResponse;

        if (primaryResponse.ok && primaryPayload.ok !== false && primaryPayload.ticket) {
          if (!cancelled) {
            setTicket(toTicketDetail(primaryPayload.ticket, params.id));
          }
          return;
        }

        if (useTokenLookup) {
          const fallbackResponse = await fetch(`/api/ticket/${encodeURIComponent(params.id)}`, { cache: "no-store" });
          const fallbackPayload = (await fallbackResponse.json()) as TicketResponse;

          if (fallbackResponse.ok && fallbackPayload.ok !== false && fallbackPayload.ticket) {
            if (!cancelled) {
              setTicket(toTicketDetail(fallbackPayload.ticket, params.id));
            }
            return;
          }
        }

        throw new Error(asString(primaryPayload.message) || "Failed to load ticket.");
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load ticket.");
          setTicket(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTicket();

    return () => {
      cancelled = true;
    };
  }, [params.id, token]);

  const currentStep = deriveStepIndex(ticket?.status ?? "");
  const displayIdentifier = token || ticket?.guestTrackingNumber || ticket?.reference || ticket?.id || params.id;
  const brandBlueVars = {
    "--accent": "#179fe5",
    "--accent-hover": "#138dc9",
  } as CSSProperties;

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto my-4 min-h-[calc(100vh-4rem)] w-full max-w-6xl px-4 py-8" style={brandBlueVars}>
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-5xl rounded-xl border bg-white p-6 md:p-8"
        >
          <motion.div variants={itemVariants} className="mb-6">
            <Link
              href="/track"
              className="inline-flex items-center justify-center rounded-full border border-[#179fe5] bg-[#179fe5] px-5 py-2.5 text-sm font-bold text-[#f8fafc] transition-[background-color,border-color,transform] duration-150 hover:border-[#138dc9] hover:bg-[#138dc9] active:translate-y-px"
            >
              Back to tracking
            </Link>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="mb-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
          >
            {capitalizeFirstLetter(ticket?.title || "Untitled complaint")}
          </motion.h1>
          <motion.p variants={itemVariants} className="mb-8 text-base leading-relaxed text-slate-600">
            View the details and status of your complaint.
          </motion.p>

          {loading ? (
            <motion.p variants={itemVariants} className="text-slate-500">
              Loading ticket details...
            </motion.p>
          ) : null}

          {error ? (
            <motion.div variants={itemVariants} className="space-y-3">
              <p className="font-semibold text-red-700">{error}</p>
              <Link
                href="/track"
                className="inline-block font-semibold text-sky-600 hover:text-sky-700"
              >
                Back to tracking
              </Link>
            </motion.div>
          ) : null}

          {!loading && !error && ticket ? (
            <div className="space-y-6">
              {/* Ticket Details */}
              <motion.div variants={itemVariants}>
                <h3 className="mb-3 text-lg font-bold text-slate-800">
                  {`${ticket.ticketType || "Ticket"} details`}
                </h3>
                {displayIdentifier ? (
                  <p className="mb-3 text-base font-semibold text-slate-900">Ticket ID: {displayIdentifier}</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                    {ticket.category || "Uncategorized"}
                  </span>
                </div>
              </motion.div>

              {/* Description */}
              <motion.div variants={itemVariants}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Description
                </p>
                <p className="leading-relaxed text-slate-700">
                  {ticket.description || "No description provided."}
                </p>
              </motion.div>

              {/* Dates */}
              <motion.div variants={itemVariants} className="space-y-1">
                {ticket.submittedAt ? (
                  <p className="text-sm text-slate-500">Submitted: {formatDate(ticket.submittedAt)}</p>
                ) : null}
                {ticket.lastUpdatedAt ? (
                  <p className="text-sm text-slate-500">Last updated: {formatDate(ticket.lastUpdatedAt)}</p>
                ) : null}
              </motion.div>

              <div className="border-t border-slate-200" />

              {/* Status Stepper */}
              <motion.div variants={itemVariants}>
                <p className="mb-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </p>

                <div className="relative flex items-start justify-between">
                  {/* Background line */}
                  <div
                    className="absolute top-[14px] left-[12.5%] right-[12.5%] h-[3px] rounded-full bg-slate-200"
                    style={{ zIndex: 0 }}
                  />

                  {/* Progress line */}
                  <div
                    className="absolute top-[14px] left-[12.5%] h-[3px] rounded-full transition-all duration-400"
                    style={{
                      width:
                        currentStep === 0
                          ? "0%"
                          : `calc(${(currentStep / (STEPS.length - 1)) * 100}% - 25%)`,
                      background: "var(--accent)",
                      zIndex: 1,
                    }}
                  />

                  {STEPS.map((step, index) => {
                    const done = index < currentStep;
                    const active = index === currentStep;
                    return (
                      <div
                        key={step}
                        className="relative z-[2] flex flex-1 flex-col items-center gap-2"
                      >
                        <div
                          className={`flex h-[30px] w-[30px] items-center justify-center rounded-full border-[2.5px] transition-all duration-200 ${
                            done || active
                              ? "border-[var(--accent)] bg-[var(--accent)]"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {done ? (
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#fff"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : active ? (
                            <div className="h-2 w-2 rounded-full bg-white" />
                          ) : (
                            <div className="h-2 w-2 rounded-full bg-slate-300" />
                          )}
                        </div>
                        <span
                          className={`text-center text-xs leading-tight ${
                            active
                              ? "font-bold text-[var(--accent)]"
                              : done
                              ? "font-semibold text-slate-950"
                              : "font-medium text-slate-400"
                          }`}
                        >
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Feedback CTA */}
              <motion.div
                variants={itemVariants}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center"
              >
                <p className="mb-3 text-sm leading-relaxed text-slate-600">
                  Have a minute? Share your feedback and help us improve.
                </p>
                <Link
                  href="/feedback"
                  className="inline-flex items-center justify-center rounded-full border border-[#179fe5] bg-[#179fe5] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-[#138dc9] hover:bg-[#138dc9]"
                >
                  Submit Feedback
                </Link>
              </motion.div>
            </div>
          ) : null}
        </motion.div>
      </main>
    </div>
  );
}

function TicketDetailFallback({ id }: { id: string }) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto my-4 min-h-[calc(100vh-4rem)] w-full max-w-6xl px-4 py-8">
        <div className="mx-auto max-w-5xl rounded-xl border bg-white p-6 md:p-8">
          <div className="mb-6">
            <Link
              href="/track"
              className="inline-flex items-center justify-center rounded-full border border-[#179fe5] bg-[#179fe5] px-5 py-2.5 text-sm font-bold text-[#f8fafc] transition-[background-color,border-color,transform] duration-150 hover:border-[#138dc9] hover:bg-[#138dc9] active:translate-y-px"
            >
              Back to tracking
            </Link>
          </div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Untitled complaint
          </h1>
          <p className="mb-8 text-base leading-relaxed text-slate-600">
            View the details and status of your complaint.
          </p>
          <p className="mb-2 text-sm font-semibold text-slate-700">Ticket ID: {id}</p>
          <p className="text-slate-500">Loading ticket details...</p>
        </div>
      </main>
    </div>
  );
}
