"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  MessageThread,
  type ThreadMessage,
} from "@/components/MessageThread";

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

type TicketDetail = {
  id: string;
  reference: string;
  ticketType: string;
  title: string;
  status: string;
  priority: string;
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
    priority: asString(input.priority),
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

  async function loadMessages() {
    setMessagesLoading(true);
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
      setMessagesLoading(false);
    }
  }

  useEffect(() => {
    void loadTicket();
    void loadMessages();
  }, [ticketId]);

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

    setSendStatus("Message sent.");
    await loadMessages();
  }

  const currentStep = deriveStepIndex(ticket?.status ?? "");
  const priorityColors: Record<string, { bg: string; color: string; border: string }> = {
    High: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
    Medium: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
    Low: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  };
  const priorityStyle = priorityColors[ticket?.priority ?? ""] ?? priorityColors.Low;

  return (
    <main className="glass-shell">
      <div className="glass-shell-word" aria-hidden="true">
        INSIGHTA
      </div>
      <section className="glass-shell-panel glass-shell-panel--narrow">
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: "1.5rem" }}>
            <div>
              <Link href="/tickets" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
                Back to tickets
              </Link>
              <h1
                style={{
                  fontSize: "1.8rem",
                  fontWeight: 800,
                  margin: "0.75rem 0 0",
                  color: "var(--text)",
                }}
              >
                Ticket: {ticket?.reference || ticketId}
              </h1>
            </div>
          </div>

          <section
            style={{
              background: "rgba(255, 255, 255, 0.84)",
              border: "1px solid #e5e7eb",
              borderRadius: "1rem",
              padding: "2rem",
              display: "grid",
              gap: "1.5rem",
            }}
          >
            {loading ? <p style={{ margin: 0, color: "var(--muted)" }}>Loading ticket details...</p> : null}

            {error ? (
              <div style={{ display: "grid", gap: "0.75rem" }}>
                <p style={{ margin: 0, color: "#b91c1c", fontWeight: 600 }}>{error}</p>
              </div>
            ) : null}

            {!loading && !error && ticket ? (
              <>
                <div>
                  <h3
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      marginBottom: "0.75rem",
                      color: "var(--text)",
                    }}
                  >
                    {`${ticket.ticketType || "Ticket"} details`}
                  </h3>
                  {ticket.title ? (
                    <p style={{ color: "var(--text)", fontSize: "0.95rem", fontWeight: 600, margin: "0 0 0.75rem" }}>
                      {ticket.title}
                    </p>
                  ) : null}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: 999,
                        background: "var(--surface)",
                        border: "1px solid #e5e7eb",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--accent)",
                      }}
                    >
                      {ticket.category || "Uncategorized"}
                    </span>
                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: 999,
                        background: priorityStyle.bg,
                        border: `1px solid ${priorityStyle.border}`,
                        fontSize: 12,
                        fontWeight: 600,
                        color: priorityStyle.color,
                      }}
                    >
                      {(ticket.priority || "Low") + " Priority"}
                    </span>
                  </div>
                </div>

                <div>
                  <p
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      marginBottom: "0.4rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Description
                  </p>
                  <p style={{ color: "var(--text)", fontSize: "0.95rem", lineHeight: 1.6, margin: 0 }}>
                    {ticket.description || "No description provided."}
                  </p>
                </div>

                <div style={{ display: "grid", gap: "0.35rem" }}>
                  {ticket.submittedAt ? (
                    <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.875rem" }}>
                      Submitted: {formatDate(ticket.submittedAt)}
                    </p>
                  ) : null}
                  {ticket.lastUpdatedAt ? (
                    <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.875rem" }}>
                      Last updated: {formatDate(ticket.lastUpdatedAt)}
                    </p>
                  ) : null}
                </div>

                <div style={{ borderTop: "1px solid #e5e7eb" }} />

                <div>
                  <p
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      marginBottom: "1.25rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Status
                  </p>

                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 14,
                        left: "calc(100% / 8)",
                        right: "calc(100% / 8)",
                        height: 3,
                        background: "#e5e7eb",
                        borderRadius: 999,
                        zIndex: 0,
                      }}
                    />

                    <div
                      style={{
                        position: "absolute",
                        top: 14,
                        left: "calc(100% / 8)",
                        width:
                          currentStep === 0
                            ? "0%"
                            : `calc(${(currentStep / (STEPS.length - 1)) * 100}% - 25%)`,
                        height: 3,
                        background: "var(--accent)",
                        borderRadius: 999,
                        transition: "width 0.4s ease",
                        zIndex: 1,
                      }}
                    />

                    {STEPS.map((step, index) => {
                      const done = index < currentStep;
                      const active = index === currentStep;
                      return (
                        <div
                          key={step}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 8,
                            zIndex: 2,
                            flex: 1,
                          }}
                        >
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: "50%",
                              background: done || active ? "var(--accent)" : "var(--bg)",
                              border: `2.5px solid ${done || active ? "var(--accent)" : "#d1d5db"}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.2s ease",
                            }}
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
                              <div
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background: "#fff",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background: "#d1d5db",
                                }}
                              />
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: active ? 700 : 500,
                              color: active ? "var(--accent)" : done ? "var(--text)" : "var(--muted)",
                              textAlign: "center",
                              lineHeight: 1.3,
                            }}
                          >
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1.5rem", display: "grid", gap: "1rem" }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text)" }}>Conversation</h2>
                    <p style={{ margin: "0.35rem 0 0", color: "var(--muted)", fontSize: "0.95rem" }}>
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
                    <p style={{ margin: 0, color: "var(--muted)" }}>Loading messages...</p>
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
