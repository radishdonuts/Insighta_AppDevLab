"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type {
  StaffNlpReviewOptionsResponse,
  StaffNlpReviewResponse,
  StaffTicketDetailResponse,
  TicketFieldSource,
} from "@/types/staff-tickets";
import { TICKET_STATUSES } from "@/types/tickets";

import styles from "../../staff-workspace.module.css";

type ApiErrorPayload = { error?: string; message?: string };

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function badge(base: string) {
  return `${styles.badge} ${base}`;
}

function statusBadge(status: string) {
  if (status === "Resolved" || status === "Closed") return badge(styles.badgeSuccess);
  if (status === "Pending Customer Response") return badge(styles.badgeWarning);
  if (status === "In Progress") return badge(styles.badgeInfo);
  return badge(styles.badgeNeutral);
}

function priorityBadge(priority: string) {
  if (priority === "High") return badge(styles.badgeDanger);
  if (priority === "Medium") return badge(styles.badgeWarning);
  if (priority === "Low") return badge(styles.badgeSuccess);
  return badge(styles.badgeNeutral);
}

function confidenceLabel(value: number | null) {
  if (value === null) return "No confidence score";
  if (value >= 0.9) return "High confidence";
  if (value >= 0.75) return "Likely correct";
  if (value >= 0.6) return "Needs quick review";
  return "Please confirm";
}

function confidenceGradientStyle(value: number | null) {
  if (value === null) {
    return {
      background: "#f3f4f6",
      color: "#374151",
      border: "1px solid #d1d5db",
    };
  }

  const bounded = Math.max(0, Math.min(1, value));
  const hue = 6 + (bounded * 124);

  return {
    background: `hsl(${hue} 85% 94%)`,
    color: `hsl(${hue} 72% 28%)`,
    border: `1px solid hsl(${hue} 70% 78%)`,
  };
}

function fieldSourceLabel(source: TicketFieldSource) {
  if (source === "nlp") return "Overridden by NLP";
  if (source === "human_intervention") return "Overridden by human intervention";
  if (source === "user") return "Selected by user";
  return "Set by default flow";
}

async function readApiError(response: Response) {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    return payload.message || payload.error || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export default function StaffTicketDetailClient({ ticketId }: { ticketId: string }) {
  const [nlpOptions, setNlpOptions] = useState<StaffNlpReviewOptionsResponse["options"] | null>(null);
  const [nlpOptionsLoading, setNlpOptionsLoading] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [data, setData] = useState<StaffTicketDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState("");
  const [remarks, setRemarks] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const [reviewPriority, setReviewPriority] = useState("");
  const [reviewCategoryName, setReviewCategoryName] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");

  async function loadDetail() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/staff/tickets/${ticketId}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const payload = (await response.json()) as StaffTicketDetailResponse;
      setData(payload);
      setStatusDraft(payload.ticket.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ticket.");
    } finally {
      setLoading(false);
    }
  }

  async function loadNlpReviewOptions() {
    setNlpOptionsLoading(true);
    try {
      const response = await fetch(`/api/staff/tickets/${ticketId}/nlp-review`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const payload = (await response.json()) as StaffNlpReviewOptionsResponse;
      setNlpOptions(payload.options);
      setReviewPriority(payload.ticket.priority ?? "");
      setReviewCategoryName(payload.ticket.categoryName ?? "");
      setReviewNotes("");
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Failed to load NLP review options.");
    } finally {
      setNlpOptionsLoading(false);
    }
  }

  useEffect(() => {
    void loadDetail();
    void loadNlpReviewOptions();
  }, [ticketId]);

  async function handleNlpReviewSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReviewSaving(true);
    setReviewMessage(null);
    setReviewError(null);

    try {
      const payload: Record<string, string> = {};
      if (reviewPriority) payload.correctedPriority = reviewPriority;
      if (reviewCategoryName) payload.correctedCategoryName = reviewCategoryName;
      if (reviewNotes.trim()) payload.notes = reviewNotes.trim();

      const response = await fetch(`/api/staff/tickets/${ticketId}/nlp-review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const result = (await response.json()) as StaffNlpReviewResponse;
      setReviewMessage(result.message ?? "NLP review saved.");
      await loadDetail();
      await loadNlpReviewOptions();
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Failed to save NLP review.");
    } finally {
      setReviewSaving(false);
    }
  }

  async function handleSelfAssign() {
    setAssigning(true);
    setActionMessage(null);
    setActionError(null);
    try {
      const response = await fetch(`/api/staff/tickets/${ticketId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "self_assign" }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      const payload = (await response.json()) as { message?: string };
      setActionMessage(payload.message ?? "Ticket assignment updated.");
      await loadDetail();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to assign ticket.");
    } finally {
      setAssigning(false);
    }
  }

  async function handleStatusSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setActionMessage(null);
    setActionError(null);
    try {
      const response = await fetch(`/api/staff/tickets/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusDraft,
          remarks: remarks.trim() || undefined,
        }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      const payload = (await response.json()) as { message?: string };
      setActionMessage(payload.message ?? "Ticket status updated.");
      setRemarks("");
      await loadDetail();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update ticket status.");
    } finally {
      setSaving(false);
    }
  }

  const ticket = data?.ticket;

  return (
    <main className={styles.page}>
      <section className={styles.headerCard}>
        <Link href="/staff" className={styles.textLink}>Back to Staff Queue</Link>
        <h1 className={styles.title}>Ticket Detail</h1>
        <p className={styles.subtitle}>Review ticket context and perform staff actions.</p>
      </section>

      {loading && <section className={styles.card}><p className={styles.stateText}>Loading ticket...</p></section>}
      {!loading && error && <section className={styles.card}><p className={styles.errorText}>{error}</p></section>}

      {!loading && !error && ticket && (
        <>
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>{ticket.ticketNumber}</h2>
                {ticket.title ? <p className={styles.metaText} style={{ marginTop: 6 }}>{ticket.title}</p> : null}
                <p className={styles.metaText}>Submitted {formatDateTime(ticket.submittedAt)}</p>
              </div>
              <div className={styles.badgeRow}>
                <span className={statusBadge(ticket.status)}>{ticket.status}</span>
                <span className={priorityBadge(ticket.priority)}>{ticket.priority}</span>
              </div>
            </div>

            <div className={styles.gridTwo}>
              <div className={styles.infoPanel}>
                <h3 className={styles.panelTitle}>Ticket Details</h3>
                <dl className={styles.keyValueList}>
                  <div><dt>Type</dt><dd>{ticket.ticketType}</dd></div>
                  <div><dt>Category</dt><dd>{ticket.categoryName ?? ticket.category?.name ?? "-"}</dd></div>
                  <div><dt>Submitter Type</dt><dd>{ticket.submitterType}</dd></div>
                  <div><dt>Submitter</dt><dd>{ticket.submitter?.displayName ?? ticket.guestEmail ?? "-"}</dd></div>
                  <div><dt>Assigned Staff</dt><dd>{ticket.assignedStaff?.displayName ?? "Unassigned"}</dd></div>
                  <div><dt>Last Updated</dt><dd>{formatDateTime(ticket.lastUpdatedAt)}</dd></div>
                </dl>
              </div>

              <div className={styles.infoPanel}>
                <h3 className={styles.panelTitle}>NLP Fields</h3>
                <dl className={styles.keyValueList}>
                  <div><dt>Detected Category</dt><dd>{ticket.categoryName ?? "-"}</dd></div>
                  <div><dt>Detected Priority</dt><dd>{ticket.priority ?? "-"}</dd></div>
                  <div><dt>Category Source</dt><dd>{fieldSourceLabel(ticket.categorySource)}</dd></div>
                  <div><dt>Priority Source</dt><dd>{fieldSourceLabel(ticket.prioritySource)}</dd></div>
                </dl>

                {ticket.nlpSuggestion ? (
                  <div className={styles.infoPanel}>
                    <h3 className={styles.panelTitle}>Suggested By NLP</h3>
                    <dl className={styles.keyValueList}>
                      <div><dt>Category Suggestion</dt><dd>{ticket.nlpSuggestion.suggestedCategoryName ?? "-"}</dd></div>
                      <div><dt>Priority Suggestion</dt><dd>{ticket.nlpSuggestion.suggestedPriority ?? "-"}</dd></div>
                      <div><dt>Priority Source</dt><dd>{ticket.nlpSuggestion.prioritySource?.toUpperCase() ?? "-"}</dd></div>
                      <div><dt>Decision Status</dt><dd>{ticket.nlpSuggestion.isApplied ? "Auto-applied" : "Suggestion only"}</dd></div>
                    </dl>
                    <div className={styles.badgeRow}>
                      <span
                        className={styles.badge}
                        style={confidenceGradientStyle(ticket.nlpSuggestion.confidenceCategory)}
                      >
                        Category: {confidenceLabel(ticket.nlpSuggestion.confidenceCategory)}
                        {ticket.nlpSuggestion.confidenceCategory !== null
                          ? ` (${ticket.nlpSuggestion.confidenceCategory.toFixed(2)})`
                          : ""}
                      </span>
                      <span
                        className={styles.badge}
                        style={confidenceGradientStyle(ticket.nlpSuggestion.confidencePriority)}
                      >
                        Priority: {confidenceLabel(ticket.nlpSuggestion.confidencePriority)}
                        {ticket.nlpSuggestion.confidencePriority !== null
                          ? ` (${ticket.nlpSuggestion.confidencePriority.toFixed(2)})`
                          : ""}
                      </span>
                    </div>
                  </div>
                ) : null}

                <form className={styles.infoPanel} onSubmit={handleNlpReviewSubmit}>
                  <h3 className={styles.panelTitle}>NLP Correction</h3>
                  {reviewMessage ? <p className={styles.successText}>{reviewMessage}</p> : null}
                  {reviewError ? <p className={styles.errorText}>{reviewError}</p> : null}
                  {nlpOptionsLoading ? <p className={styles.stateText}>Loading taxonomy options...</p> : null}




                  <label className={styles.field}>
                    <span>Priority</span>
                    <select
                      className={styles.select}
                      value={reviewPriority}
                      onChange={(e) => setReviewPriority(e.target.value)}
                      disabled={nlpOptionsLoading || reviewSaving}
                    >
                      <option value="">Unspecified</option>
                      {(nlpOptions?.priorities ?? []).map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>Category</span>
                    <select
                      className={styles.select}
                      value={reviewCategoryName}
                      onChange={(e) => setReviewCategoryName(e.target.value)}
                      disabled={nlpOptionsLoading || reviewSaving}
                    >
                      <option value="">Unspecified</option>
                      {(nlpOptions?.categories ?? []).map((item) => (
                        <option key={item.id} value={item.name}>{item.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>Notes</span>
                    <textarea
                      className={styles.textarea}
                      rows={3}
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Optional reviewer notes"
                      disabled={reviewSaving}
                    />
                  </label>

                  <button
                    type="submit"
                    className={styles.buttonPrimary}
                    disabled={nlpOptionsLoading || reviewSaving}
                  >
                    {reviewSaving ? "Saving..." : "Save NLP Review"}
                  </button>
                </form>
              </div>
            </div>

            <div className={styles.infoPanel}>
              <h3 className={styles.panelTitle}>Description</h3>
              <p className={styles.preWrapText}>{ticket.description}</p>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Staff Actions</h2>
            </div>
            {actionMessage && <p className={styles.successText}>{actionMessage}</p>}
            {actionError && <p className={styles.errorText}>{actionError}</p>}
            <div className={styles.gridTwo}>
              <div className={styles.infoPanel}>
                <h3 className={styles.panelTitle}>Assignment</h3>
                <p className={styles.metaText}>Current: {ticket.assignedStaff?.displayName ?? "Unassigned"}</p>
                <button type="button" className={styles.buttonPrimary} onClick={handleSelfAssign} disabled={assigning}>
                  {assigning ? "Assigning..." : "Assign To Me"}
                </button>
              </div>

              <form className={styles.infoPanel} onSubmit={handleStatusSubmit}>
                <h3 className={styles.panelTitle}>Update Status</h3>
                <label className={styles.field}>
                  <span>Status</span>
                  <select className={styles.select} value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)}>
                    {TICKET_STATUSES.map((status: string) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Remarks (optional)</span>
                  <textarea
                    className={styles.textarea}
                    rows={3}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Add context for the status update"
                  />
                </label>
                <button type="submit" className={styles.buttonPrimary} disabled={saving}>
                  {saving ? "Saving..." : "Save Status"}
                </button>
              </form>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeader}><h2 className={styles.sectionTitle}>Attachments</h2></div>
            {ticket.attachments.length === 0 ? (
              <p className={styles.stateText}>No attachments available.</p>
            ) : (
              <ul className={styles.list}>
                {ticket.attachments.map((item) => (
                  <li key={item.id} className={styles.listItem}>
                    <div className={styles.cellStack}>
                      <strong>{item.fileName}</strong>
                      <span className={styles.mutedText}>{item.fileType ?? "Unknown type"}</span>
                      <span className={styles.bodyText}>{item.filePath}</span>
                      {item.signedUrl ? (
                        <a href={item.signedUrl} target="_blank" rel="noreferrer" className={styles.textLink}>
                          Open attachment
                        </a>
                      ) : null}
                      {item.signedUrl && (item.fileType ?? "").startsWith("image/") ? (
                        <img
                          src={item.signedUrl}
                          alt={item.fileName}
                          style={{
                            marginTop: 8,
                            maxWidth: 320,
                            width: "100%",
                            borderRadius: 10,
                            border: "1px solid rgba(148, 163, 184, 0.35)",
                          }}
                        />
                      ) : null}
                    </div>
                    <span className={styles.metaText}>{formatDateTime(item.uploadedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeader}><h2 className={styles.sectionTitle}>Status History</h2></div>
            {ticket.statusHistory.length === 0 ? (
              <p className={styles.stateText}>No status history entries yet.</p>
            ) : (
              <ol className={styles.timeline}>
                {ticket.statusHistory.map((entry) => (
                  <li key={entry.id} className={styles.timelineItem}>
                    <div className={styles.timelineDot} aria-hidden="true" />
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineHeader}>
                        <strong>{entry.oldStatus} to {entry.newStatus}</strong>
                        <span className={styles.metaText}>{formatDateTime(entry.changedAt)}</span>
                      </div>
                      <p className={styles.mutedText}>By {entry.changedBy?.displayName ?? "Unknown Staff"}</p>
                      {entry.remarks && <p className={styles.bodyText}>{entry.remarks}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

        </>
      )}
    </main>
  );
}
