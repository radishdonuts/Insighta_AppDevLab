"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type {
  StaffNlpReviewOptionsResponse,
  StaffNlpReviewResponse,
  StaffTicketDetailResponse,
  StaffTicketMessageCreateResponse,
  StaffTicketMessagesResponse,
  StaffTicketNoteCreateResponse,
  StaffTicketNotesResponse,
} from "@/types/staff-tickets";
import { TICKET_STATUSES } from "@/types/tickets";
import {
  formatDateTime,
  initialsForName,
  priorityBadge,
  sourceBadge,
  statusBadge,
} from "../workspace/queue-ui";
import { MessageThread, type ThreadMessage } from "@/components/MessageThread";
import { NotesTimeline, type InternalNote } from "@/components/NotesTimeline";
import styles from "./detail.module.css";

type ApiErrorPayload = { error?: string; message?: string };
type WorkspaceMode = "staff" | "admin";
type AdminStaffMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
};

type StaffTicketDetailClientProps = {
  ticketId: string;
  mode?: WorkspaceMode;
  apiBasePath?: string;
  backHref?: string;
};

function confidenceLabel(value: number | null) {
  if (value === null) return "No confidence";
  if (value >= 0.9) return "High confidence";
  if (value >= 0.75) return "Likely correct";
  if (value >= 0.6) return "Needs review";
  return "Please confirm";
}

function getPriorityPillClass(priority: string | undefined): string {
  if (priority === "High") return styles.pillPriorityHigh;
  if (priority === "Medium") return styles.pillPriorityMedium;
  if (priority === "Low") return styles.pillPriorityLow;
  return "";
}

async function readApiError(response: Response) {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    return payload.message || payload.error || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

function DetailSkeleton() {
  return (
    <div className={styles.stack}>
      <section className={styles.hero}>
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonBlock} style={{ marginTop: 12, height: 50 }} />
      </section>
      <div className={styles.layout}>
        <div className={styles.column}>
          {Array.from({ length: 4 }).map((_, index) => (
            <section key={index} className={styles.section}>
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonBlock} style={{ marginTop: 12 }} />
            </section>
          ))}
        </div>
        <div className={styles.column}>
          {Array.from({ length: 4 }).map((_, index) => (
            <section key={index} className={styles.section}>
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonBlock} style={{ marginTop: 12 }} />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.summaryItem}>
      <span className={styles.summaryLabel}>{label}</span>
      <span className={styles.summaryValue}>{value}</span>
    </div>
  );
}

function toThreadRole(senderType: string | null | undefined): "Customer" | "Staff" | "Admin" {
  if (senderType === "Admin") return "Admin";
  if (senderType === "Staff" || senderType === "staff") return "Staff";
  return "Customer";
}

function mapMessageToThreadMessage(
  message: StaffTicketMessagesResponse["messages"][number]
): ThreadMessage {
  const role = toThreadRole(message.senderType);

  return {
    id: message.id,
    content: message.content,
    created_at: message.createdAt,
    author: {
      name:
        message.sender?.displayName ??
        (role === "Customer" ? "Customer" : role === "Admin" ? "Admin" : "Staff"),
      role,
    },
  };
}

function mapNoteToInternalNote(note: StaffTicketNotesResponse["notes"][number]): InternalNote {
  return {
    id: note.id,
    content: note.content,
    created_at: note.createdAt,
    author: {
      name: note.author?.displayName ?? "Unknown",
    },
  };
}

export default function StaffTicketDetailClient({
  ticketId,
  mode = "staff",
  apiBasePath = mode === "admin" ? "/api/admin/tickets" : "/api/staff/tickets",
  backHref = mode === "admin" ? "/admin/work-tickets" : "/staff",
}: StaffTicketDetailClientProps) {
  const showStaffOnlySections = mode === "staff";
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
  const [notes, setNotes] = useState<StaffTicketNotesResponse["notes"]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteMessage, setNoteMessage] = useState<string | null>(null);
  const [noteSubmitError, setNoteSubmitError] = useState<string | null>(null);
  const [messages, setMessages] = useState<StaffTicketMessagesResponse["messages"]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messageSaving, setMessageSaving] = useState(false);
  const [messageStatus, setMessageStatus] = useState<string | null>(null);
  const [messageSubmitError, setMessageSubmitError] = useState<string | null>(null);
  const [assignableStaff, setAssignableStaff] = useState<AdminStaffMember[]>([]);
  const [assignableStaffLoading, setAssignableStaffLoading] = useState(false);
  const [assignedStaffId, setAssignedStaffId] = useState("__unassigned");

  async function loadDetail() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBasePath}/${ticketId}`, { method: "GET", cache: "no-store" });
      if (!response.ok) throw new Error(await readApiError(response));
      const payload = (await response.json()) as StaffTicketDetailResponse;
      setData(payload);
      setStatusDraft(payload.ticket.status);
      setAssignedStaffId(payload.ticket.assignedStaff?.id ?? "__unassigned");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ticket.");
    } finally {
      setLoading(false);
    }
  }

  async function loadNlpReviewOptions() {
    if (!showStaffOnlySections) return;
    setNlpOptionsLoading(true);
    setReviewError(null);
    try {
      const response = await fetch(`${apiBasePath}/${ticketId}/nlp-review`, { method: "GET", cache: "no-store" });
      if (!response.ok) throw new Error(await readApiError(response));
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

  async function loadNotes() {
    if (!showStaffOnlySections) return;
    setNotesLoading(true);
    setNotesError(null);
    try {
      const response = await fetch(`${apiBasePath}/${ticketId}/notes`, { method: "GET", cache: "no-store" });
      if (!response.ok) throw new Error(await readApiError(response));
      const payload = (await response.json()) as StaffTicketNotesResponse;
      setNotes(payload.notes);
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : "Failed to load notes.");
    } finally {
      setNotesLoading(false);
    }
  }

  async function loadMessages() {
    if (!showStaffOnlySections) return;
    setMessagesLoading(true);
    setMessagesError(null);
    try {
      const response = await fetch(`${apiBasePath}/${ticketId}/messages`, { method: "GET", cache: "no-store" });
      if (!response.ok) throw new Error(await readApiError(response));
      const payload = (await response.json()) as StaffTicketMessagesResponse;
      setMessages(payload.messages);
    } catch (err) {
      setMessagesError(err instanceof Error ? err.message : "Failed to load messages.");
    } finally {
      setMessagesLoading(false);
    }
  }

  async function loadAssignableStaff() {
    if (mode !== "admin") return;
    setAssignableStaffLoading(true);
    try {
      const response = await fetch("/api/admin/staff", { cache: "no-store" });
      if (!response.ok) throw new Error(await readApiError(response));
      const payload = (await response.json()) as { staff?: AdminStaffMember[] };
      setAssignableStaff((payload.staff ?? []).filter((member) => member.role === "Staff" && member.isActive));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to load assignable staff.");
    } finally {
      setAssignableStaffLoading(false);
    }
  }

  useEffect(() => {
    void loadDetail();
    void loadNlpReviewOptions();
    void loadNotes();
    void loadMessages();
    void loadAssignableStaff();
  }, [ticketId, apiBasePath, mode]);

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

      const response = await fetch(`${apiBasePath}/${ticketId}/nlp-review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await readApiError(response));
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
      const response = await fetch(`${apiBasePath}/${ticketId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "self_assign" }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const payload = (await response.json()) as { message?: string };
      setActionMessage(payload.message ?? "Ticket assignment updated.");
      await loadDetail();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to assign ticket.");
    } finally {
      setAssigning(false);
    }
  }

  async function handleAdminAssign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAssigning(true);
    setActionMessage(null);
    setActionError(null);
    try {
      const response = await fetch(`${apiBasePath}/${ticketId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedStaffId: assignedStaffId === "__unassigned" ? null : assignedStaffId }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const payload = (await response.json()) as { message?: string };
      setActionMessage(payload.message ?? "Ticket assignment updated.");
      await loadDetail();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update ticket assignment.");
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
      const response = await fetch(`${apiBasePath}/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusDraft, remarks: remarks.trim() || undefined }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
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

  async function handleChatSend(content: string) {
    setMessageSaving(true);
    setMessageStatus(null);
    setMessageSubmitError(null);
    try {
      const response = await fetch(`${apiBasePath}/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const payload = (await response.json()) as StaffTicketMessageCreateResponse;
      setMessageStatus(payload.message ?? "Message sent.");
      await loadMessages();
    } catch (err) {
      setMessageSubmitError(err instanceof Error ? err.message : "Failed to send message.");
      throw err;
    } finally {
      setMessageSaving(false);
    }
  }

  async function handleAddInternalNote(content: string) {
    setNoteSaving(true);
    setNoteMessage(null);
    setNoteSubmitError(null);
    try {
      const response = await fetch(`${apiBasePath}/${ticketId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const payload = (await response.json()) as StaffTicketNoteCreateResponse;
      setNoteMessage(payload.message ?? "Note added.");
      await loadNotes();
    } catch (err) {
      setNoteSubmitError(err instanceof Error ? err.message : "Failed to create note.");
      throw err;
    } finally {
      setNoteSaving(false);
    }
  }

  const ticket = data?.ticket;
  const threadMessages = messages.map(mapMessageToThreadMessage);
  const internalNotes = notes.map(mapNoteToInternalNote);

  return (
    <main className={styles.page}>
      {loading ? <DetailSkeleton /> : null}

      {!loading && error ? (
        <section className={`${styles.notice} ${styles.error}`}>
          <strong>Ticket request failed.</strong>
          <p>{error}</p>
        </section>
      ) : null}

      {!loading && !error && ticket ? (
        <div className={styles.stack}>
          <section className={styles.hero}>
            <div className={styles.heroTop}>
              <div>
                <Link href={backHref} className={styles.linkButton}>
                  Back to queue
                </Link>
                <h1 className={styles.title}>{ticket.ticketNumber}</h1>
                <p className={styles.subtitle}>
                  {ticket.title ?? (mode === "admin" ? "Admin ticket management view." : "Staff case workbench for this ticket.")}
                </p>
                <div className={styles.pillRow}>
                  <span className={styles.pill}>{ticket.ticketType}</span>
                  <span className={styles.pill}>{statusBadge(ticket.status).label}</span>
                  <span className={`${styles.pill} ${getPriorityPillClass(ticket.priority)}`}>
                    {priorityBadge(ticket.priority).label}
                  </span>
                </div>
              </div>
              <div className={styles.metaText}>
                <div>Submitted {formatDateTime(ticket.submittedAt)}</div>
                <div>Updated {formatDateTime(ticket.lastUpdatedAt)}</div>
                <div>{ticket.submitterType} ticket</div>
              </div>
            </div>
          </section>

          <div className={styles.layout}>
            <div className={styles.column}>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Case Summary</h2>
                <p className={styles.subtitle}>Basic ticket facts returned by the detail backend.</p>
                <div className={styles.summaryGrid}>
                  <SummaryItem label="Type" value={ticket.ticketType} />
                  <SummaryItem label="Category" value={ticket.categoryName ?? ticket.category?.name ?? "-"} />
                  <SummaryItem label="Submitter Type" value={ticket.submitterType} />
                  <SummaryItem label="Submitter" value={ticket.submitter?.displayName ?? ticket.guestEmail ?? "-"} />
                  <SummaryItem label="Assigned Staff" value={ticket.assignedStaff?.displayName ?? "Unassigned"} />
                  <SummaryItem label="Last Updated" value={formatDateTime(ticket.lastUpdatedAt)} />
                </div>
              </section>

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Description</h2>
                <p className={styles.textBlock}>{ticket.description}</p>
              </section>

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Attachments</h2>
                {ticket.attachments.length === 0 ? (
                  <div className={styles.empty}>No attachments available.</div>
                ) : (
                  <div className={styles.list}>
                    {ticket.attachments.map((item) => (
                      <div key={item.id} className={styles.listItem}>
                        <div className={styles.listItemTop}>
                          <div>
                            <strong>{item.fileName}</strong>
                            <div className={styles.metaText}>{item.fileType ?? "Unknown file type"}</div>
                            <div className={styles.metaText}>{item.filePath}</div>
                          </div>
                          <div className={styles.metaText}>{formatDateTime(item.uploadedAt)}</div>
                        </div>
                        {item.signedUrl ? (
                          <div className={styles.formActions}>
                            <a href={item.signedUrl} target="_blank" rel="noreferrer" className={styles.buttonLink}>
                              Open attachment
                            </a>
                          </div>
                        ) : null}
                        {item.signedUrl && (item.fileType ?? "").startsWith("image/") ? (
                          <img src={item.signedUrl} alt={item.fileName} className={styles.attachmentImage} />
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Status History</h2>
                {ticket.statusHistory.length === 0 ? (
                  <div className={styles.empty}>No status history yet.</div>
                ) : (
                  <div className={styles.list}>
                    {ticket.statusHistory.map((entry) => (
                      <div key={entry.id} className={styles.listItem}>
                        <div className={styles.listItemTop}>
                          <div>
                            <strong>
                              {entry.oldStatus} to {entry.newStatus}
                            </strong>
                            <div className={styles.metaText}>
                              By {entry.changedBy?.displayName ?? initialsForName(entry.changedBy?.email ?? "Unknown")}
                            </div>
                          </div>
                          <div className={styles.metaText}>{formatDateTime(entry.changedAt)}</div>
                        </div>
                        {entry.remarks ? <p className={styles.textBlock}>{entry.remarks}</p> : null}
                      </div>
                    ))}
                  </div>
                )}
              </section>
              {showStaffOnlySections ? (
                <>
                  <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Internal Notes</h2>
                    <p className={styles.subtitle}>Private notes visible only inside the workspace.</p>
                    {notesError ? <div className={`${styles.notice} ${styles.error}`}>{notesError}</div> : null}
                    {noteMessage ? <div className={`${styles.notice} ${styles.success}`}>{noteMessage}</div> : null}
                    {noteSubmitError ? <div className={`${styles.notice} ${styles.error}`}>{noteSubmitError}</div> : null}
                    {notesLoading ? (
                      <div className={styles.loadingBlock}>Loading notes...</div>
                    ) : (
                      <div className={styles.notesPanel}>
                        <NotesTimeline
                          notes={internalNotes}
                          onAddNote={handleAddInternalNote}
                          disabled={noteSaving}
                        />
                      </div>
                    )}
                  </section>
                  <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Messages</h2>
                    <p className={styles.subtitle}>Messages to the submitter from the workspace.</p>
                    {messagesError ? <div className={`${styles.notice} ${styles.error}`}>{messagesError}</div> : null}
                    {messageStatus ? <div className={`${styles.notice} ${styles.success}`}>{messageStatus}</div> : null}
                    {messageSubmitError ? <div className={`${styles.notice} ${styles.error}`}>{messageSubmitError}</div> : null}
                    {messagesLoading ? (
                      <div className={styles.loadingBlock}>Loading messages...</div>
                    ) : (
                      <div className={styles.chatPanel}>
                        <MessageThread
                          messages={threadMessages}
                          currentUserId=""
                          currentUserRole="Staff"
                          onSendMessage={handleChatSend}
                          allowAttachments={false}
                          disabled={messageSaving}
                        />
                      </div>
                    )}
                  </section>
                </>
              ) : null}
            </div>
            <div className={styles.column}>
              {(actionMessage || actionError) ? (
                <section className={`${styles.notice} ${actionError ? styles.error : styles.success}`}>
                  {actionError ?? actionMessage}
                </section>
              ) : null}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Assignment</h2>
                <p className={styles.subtitle}>{mode === "admin" ? "Assign or reassign this ticket to any active staff member." : "Current owner and self-assign action."}</p>
                <div className={styles.summaryGrid}>
                  <SummaryItem label="Assigned Staff" value={ticket.assignedStaff?.displayName ?? "Unassigned"} />
                  <SummaryItem label="Staff Email" value={ticket.assignedStaff?.email ?? "No current owner"} />
                </div>
                {mode === "admin" ? (
                  <form className={styles.form} onSubmit={handleAdminAssign}>
                    <label className={styles.field}>
                      <span className={styles.label}>Assign to staff</span>
                      <select className={styles.select} value={assignedStaffId} onChange={(event) => setAssignedStaffId(event.target.value)} disabled={assignableStaffLoading || assigning}>
                        <option value="__unassigned">Unassigned</option>
                        {assignableStaff.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className={styles.formActions}>
                      <button type="submit" className={styles.button} disabled={assigning}>
                        {assigning ? "Saving..." : "Save assignment"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className={styles.formActions} style={{ marginTop: 12 }}>
                    <button type="button" className={styles.button} onClick={handleSelfAssign} disabled={assigning}>
                      {assigning ? "Assigning..." : "Assign to me"}
                    </button>
                  </div>
                )}
              </section>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Update Status</h2>
                <p className={styles.subtitle}>Update the ticket status and add optional remarks.</p>
                <form className={styles.form} onSubmit={handleStatusSubmit}>
                  <label className={styles.field}>
                    <span className={styles.label}>Status</span>
                    <select className={styles.select} value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)}>
                      {TICKET_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Remarks</span>
                    <textarea className={styles.textarea} rows={4} value={remarks} placeholder="Optional status update remarks" onChange={(event) => setRemarks(event.target.value)} />
                  </label>
                  <div className={styles.formActions}>
                    <button type="submit" className={styles.button} disabled={saving}>
                      {saving ? "Saving..." : "Save status"}
                    </button>
                  </div>
                </form>
              </section>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Current Classification</h2>
                <div className={styles.summaryGrid}>
                  <SummaryItem label="Applied Category" value={ticket.categoryName ?? "-"} />
                  <SummaryItem label="Applied Priority" value={ticket.priority ?? "-"} />
                </div>
                <div className={styles.pillRow}>
                  <span className={styles.pill}>{sourceBadge(ticket.categorySource)}</span>
                  <span className={styles.pill}>{sourceBadge(ticket.prioritySource)}</span>
                </div>
              </section>
              {showStaffOnlySections ? (
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>NLP Suggestion and Review</h2>
                  <p className={styles.subtitle}>Inspect and correct the latest NLP suggestion.</p>
                  {ticket.nlpSuggestion ? (
                    <div className={styles.listItem}>
                      <SummaryItem label="Suggested Category" value={ticket.nlpSuggestion.suggestedCategoryName ?? "-"} />
                      <SummaryItem label="Suggested Priority" value={ticket.nlpSuggestion.suggestedPriority ?? "-"} />
                      <SummaryItem label="Suggestion Source" value={ticket.nlpSuggestion.prioritySource?.toUpperCase() ?? "-"} />
                      <SummaryItem label="Decision Status" value={ticket.nlpSuggestion.isApplied ? "Auto-applied" : "Suggestion only"} />
                      <div className={styles.pillRow}>
                        <span className={styles.pill}>Category: {confidenceLabel(ticket.nlpSuggestion.confidenceCategory)}{ticket.nlpSuggestion.confidenceCategory !== null ? ` (${ticket.nlpSuggestion.confidenceCategory.toFixed(2)})` : ""}</span>
                        <span className={styles.pill}>Priority: {confidenceLabel(ticket.nlpSuggestion.confidencePriority)}{ticket.nlpSuggestion.confidencePriority !== null ? ` (${ticket.nlpSuggestion.confidencePriority.toFixed(2)})` : ""}</span>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.empty}>No NLP suggestion available.</div>
                  )}
                  {reviewMessage ? <div className={`${styles.notice} ${styles.success}`}>{reviewMessage}</div> : null}
                  {reviewError ? <div className={`${styles.notice} ${styles.error}`}>{reviewError}</div> : null}
                  <form className={styles.form} onSubmit={handleNlpReviewSubmit}>
                    <label className={styles.field}>
                      <span className={styles.label}>Corrected Priority</span>
                      <select className={styles.select} value={reviewPriority || "__unspecified"} onChange={(event) => setReviewPriority(event.target.value === "__unspecified" ? "" : event.target.value)} disabled={nlpOptionsLoading || reviewSaving}>
                        <option value="__unspecified">Unspecified</option>
                        {(nlpOptions?.priorities ?? []).map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.field}>
                      <span className={styles.label}>Corrected Category</span>
                      <select className={styles.select} value={reviewCategoryName || "__unspecified"} onChange={(event) => setReviewCategoryName(event.target.value === "__unspecified" ? "" : event.target.value)} disabled={nlpOptionsLoading || reviewSaving}>
                        <option value="__unspecified">Unspecified</option>
                        {(nlpOptions?.categories ?? []).map((item) => (
                          <option key={item.id} value={item.name}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.field}>
                      <span className={styles.label}>Review Notes</span>
                      <textarea className={styles.textarea} rows={4} value={reviewNotes} placeholder="Optional reviewer notes" disabled={reviewSaving} onChange={(event) => setReviewNotes(event.target.value)} />
                    </label>
                    <div className={styles.formActions}>
                      <button type="submit" className={styles.button} disabled={nlpOptionsLoading || reviewSaving}>
                        {reviewSaving ? "Saving..." : "Save NLP review"}
                      </button>
                    </div>
                  </form>
                </section>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
