"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  MessageThread,
  type ThreadMessage,
} from "@/components/MessageThread";
import { useTicketMessagesRealtime } from "@/lib/tickets/use-ticket-messages-realtime";

type ApiTicket = {
  id?: unknown;
  reference?: unknown;
  ticketType?: unknown;
  title?: unknown;
  status?: unknown;
  priority?: unknown;
  categoryName?: unknown;
  description?: unknown;
  submittedAt?: unknown;
  lastUpdatedAt?: unknown;
};

type TicketResponse = {
  ok?: boolean;
  message?: string;
  ticket?: ApiTicket;
};

type TicketMessagesResponse = {
  messages: Array<{
    id: string;
    content: string;
    senderType: string;
    createdAt: string;
    sender: {
      id: string;
      displayName: string;
      email: string | null;
    } | null;
  }>; 
};

type TicketMessageCreateResponse = {
  message?: string;
  data?: TicketMessagesResponse["messages"][number];
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
};

const STEPS = ["Received", "In Review", "In Progress", "Resolved"] as const;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toTicketDetail(input: ApiTicket, fallbackId: string): TicketDetail {
  return {
    id: asString(input.id) || fallbackId,
    reference: asString(input.reference),
    ticketType: asString(input.ticketType),
    title: asString(input.title),
    status: asString(input.status),
    category: asString(input.categoryName),
    description: asString(input.description),
    submittedAt: asString(input.submittedAt),
    lastUpdatedAt: asString(input.lastUpdatedAt),
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

async function readApiError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string; message?: string };
    return payload.message || payload.error || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

function capitalizeFirstLetter(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

function mapThreadMessage(message: TicketMessagesResponse["messages"][number]): ThreadMessage {
  const role = message.senderType === "staff" ? "Staff" : "Customer";
  const fallbackName = message.senderType === "staff" ? "Staff" : "You";

  return {
    id: message.id,
    content: message.content,
    created_at: message.createdAt,
    author: {
      name: message.sender?.displayName || fallbackName,
      role,
    },
  };
}

function mergeThreadMessages(current: ThreadMessage[], next: ThreadMessage[]): ThreadMessage[] {
  const merged = new Map<string, ThreadMessage>();

  for (const message of current) {
    merged.set(message.id, message);
  }

  for (const message of next) {
    merged.set(message.id, message);
  }

  return Array.from(merged.values()).sort(
    (left, right) => Date.parse(left.created_at) - Date.parse(right.created_at)
  );
}

export default function CustomerTicketDetailClient({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<string | null>(null);

  async function loadTicket() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ticket/${encodeURIComponent(ticketId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error(await readApiError(response));

      const payload = (await response.json()) as TicketResponse;
      if (!payload.ticket) throw new Error(payload.message || "Failed to load ticket.");

      setTicket(toTicketDetail(payload.ticket, ticketId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load ticket.");
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }

  const loadMessages = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setMessagesLoading(true);
    }
    setMessagesError(null);

    try {
      const response = await fetch(`/api/ticket/${encodeURIComponent(ticketId)}/messages`, { cache: "no-store" });
      if (!response.ok) throw new Error(await readApiError(response));

      const payload = (await response.json()) as TicketMessagesResponse;
      setMessages((payload.messages ?? []).map(mapThreadMessage));
    } catch (loadError) {
      setMessagesError(loadError instanceof Error ? loadError.message : "Failed to load messages.");
      setMessages([]);
    } finally {
      if (!options?.silent) {
        setMessagesLoading(false);
      }
    }
  }, [ticketId]);

  useEffect(() => {
    void loadTicket();
    void loadMessages();
  }, [ticketId, loadMessages]);

  useTicketMessagesRealtime({
    ticketId,
    onRefresh: () => {
      void loadMessages({ silent: true });
    },
  });

  async function handleSendMessage(content: string) {
    setSendError(null);
    setSendStatus(null);

    const response = await fetch(`/api/ticket/${encodeURIComponent(ticketId)}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const message = await readApiError(response);
      setSendError(message);
      throw new Error(message);
    }

    const payload = (await response.json()) as TicketMessageCreateResponse;
    if (payload.data) {
      setMessages((current) => mergeThreadMessages(current, [mapThreadMessage(payload.data!)]));
    }
    setSendStatus(payload.message || "Message sent.");
  }

  const currentStep = deriveStepIndex(ticket?.status ?? "");

  return (
    <main className="mx-auto my-4 min-h-[calc(100vh-4rem)] w-full max-w-6xl px-4 py-8">
      <section className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-300 bg-white p-6 md:p-8">
        <div>
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <Link
                href="/tickets"
                className="inline-flex items-center justify-center rounded-full border border-[#179fe5] bg-[#179fe5] px-5 py-2.5 text-sm font-bold text-[#f8fafc] no-underline transition-[background-color,border-color,transform] duration-150 hover:border-[#138dc9] hover:bg-[#138dc9] active:translate-y-px"
              >
                Back to tickets
              </Link>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
                {capitalizeFirstLetter(ticket?.title || "Untitled complaint")}
              </h1>
            </div>
          </div>

          <section className="grid gap-6">
            {loading ? <p className="m-0 text-slate-500">Loading ticket details...</p> : null}

            {error ? (
              <div className="grid gap-3">
                <p className="m-0 font-semibold text-red-700">{error}</p>
              </div>
            ) : null}

            {!loading && !error && ticket ? (
              <>
                <div>
                  <h3 className="mb-3 text-3xl font-bold text-slate-950">Complaint details</h3>
                  {ticket.reference || ticketId ? (
                    <p className="mb-3 text-lg font-semibold text-slate-950">
                      Ticket ID: {ticket.reference || ticketId}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <span
                      className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-600"
                    >
                      {ticket.category || "Uncategorized"}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-sm font-medium uppercase tracking-wide text-slate-600">
                    Description
                  </p>
                  <p className="m-0 text-base leading-relaxed text-slate-800">
                    {ticket.description || "No description provided."}
                  </p>
                </div>

                <div className="grid gap-1.5">
                  {ticket.submittedAt ? (
                    <p className="m-0 text-sm text-slate-600">
                      Submitted: {formatDate(ticket.submittedAt)}
                    </p>
                  ) : null}
                  {ticket.lastUpdatedAt ? (
                    <p className="m-0 text-sm text-slate-600">
                      Last updated: {formatDate(ticket.lastUpdatedAt)}
                    </p>
                  ) : null}
                </div>

                <div className="border-t border-slate-200" />

                <div>
                  <p className="mb-5 text-sm font-medium uppercase tracking-wide text-slate-600">
                    Status
                  </p>

                  <div className="relative flex items-start justify-between">
                    <div className="absolute left-[12.5%] right-[12.5%] top-[14px] h-[3px] rounded-full bg-slate-200" />

                    <div
                      className="absolute left-[12.5%] top-[14px] h-[3px] rounded-full bg-[#179fe5] transition-all duration-300"
                      style={{
                        width:
                          currentStep === 0
                            ? "0%"
                            : `calc(${(currentStep / (STEPS.length - 1)) * 100}% - 25%)`,
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
                              done || active ? "border-[#179fe5] bg-[#179fe5]" : "border-slate-300 bg-white"
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
                                ? "font-bold text-[#179fe5]"
                                : done
                                  ? "font-semibold text-slate-950"
                                  : "font-medium text-slate-500"
                            }`}
                          >
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-4 border-t border-slate-200 pt-6">
                  <div>
                    <h2 className="m-0 text-3xl font-semibold text-slate-950">Conversation</h2>
                    <p className="mb-0 mt-1 text-base text-slate-600">
                      Send a message to the staff handling your ticket.
                    </p>
                  </div>

                  {messagesError ? (
                    <div style={{ color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: 12 }}>
                      {messagesError}
                    </div>
                  ) : null}

                  {sendError ? (
                    <div style={{ color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: 12 }}>
                      {sendError}
                    </div>
                  ) : null}

                  {sendStatus ? (
                    <div style={{ color: "#166534", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 12 }}>
                      {sendStatus}
                    </div>
                  ) : null}

                  {messagesLoading ? (
                    <p className="m-0 text-slate-500">Loading messages...</p>
                  ) : (
                    <MessageThread
                      messages={messages}
                      currentUserId=""
                      currentUserRole="Customer"
                      onSendMessage={handleSendMessage}
                      allowAttachments={false}
                      disabled={!!error}
                    />
                  )}
                </div>
              </>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}
