"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BrainCircuit,
  FileText,
  History,
  Paperclip,
  Sparkles,
  UserRound,
  WandSparkles,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type {
  StaffNlpReviewOptionsResponse,
  StaffNlpReviewResponse,
  StaffTicketDetailResponse,
  TicketFieldSource,
} from "@/types/staff-tickets";
import { TICKET_STATUSES } from "@/types/tickets";

type ApiErrorPayload = { error?: string; message?: string };

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function initialsForName(value: string | null | undefined) {
  const cleaned = (value ?? "").trim();
  if (!cleaned) return "NA";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function statusBadge(status: string) {
  if (status === "In Progress") return <Badge className="bg-primary/10 text-primary hover:bg-primary/10">{status}</Badge>;
  if (status === "Resolved" || status === "Closed") return <Badge variant="secondary">{status}</Badge>;
  if (status === "Pending Customer Response") return <Badge variant="outline" className="bg-muted text-foreground">{status}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function priorityBadge(priority: string) {
  if (priority === "High") return <Badge variant="destructive">{priority}</Badge>;
  if (priority === "Medium") return <Badge className="bg-primary/10 text-primary hover:bg-primary/10">{priority}</Badge>;
  if (priority === "Low") return <Badge variant="secondary">{priority}</Badge>;
  return <Badge variant="outline">{priority}</Badge>;
}

function sourceBadge(source: TicketFieldSource) {
  if (source === "nlp") return <Badge variant="outline">NLP</Badge>;
  if (source === "human_intervention") return <Badge variant="outline">Staff override</Badge>;
  if (source === "user") return <Badge variant="outline">User selected</Badge>;
  return <Badge variant="outline">Default flow</Badge>;
}

function confidenceLabel(value: number | null) {
  if (value === null) return "No confidence";
  if (value >= 0.9) return "High confidence";
  if (value >= 0.75) return "Likely correct";
  if (value >= 0.6) return "Needs review";
  return "Please confirm";
}

function confidenceBadge(value: number | null, label: string) {
  if (value === null) return <Badge variant="outline">{label}: No confidence</Badge>;
  return (
    <Badge variant="outline">
      {label}: {confidenceLabel(value)} ({value.toFixed(2)})
    </Badge>
  );
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
    <div className="flex flex-col gap-6">
      <Card className="border-border/70 bg-card">
        <CardHeader className="gap-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
      </Card>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_420px]">
        <div className="flex flex-col gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="border-border/70 bg-card">
              <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex flex-col gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="border-border/70 bg-card">
              <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
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
      const response = await fetch(`/api/staff/tickets/${ticketId}`, { method: "GET", cache: "no-store" });
      if (!response.ok) throw new Error(await readApiError(response));
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
      const response = await fetch(`/api/staff/tickets/${ticketId}/nlp-review`, { method: "GET", cache: "no-store" });
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
      const response = await fetch(`/api/staff/tickets/${ticketId}/assign`, {
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

  async function handleStatusSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setActionMessage(null);
    setActionError(null);
    try {
      const response = await fetch(`/api/staff/tickets/${ticketId}/status`, {
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

  const ticket = data?.ticket;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      {loading ? <DetailSkeleton /> : null}

      {!loading && error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Ticket request failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!loading && !error && ticket ? (
        <>
          <Card className="border-border/70 bg-card">
            <CardHeader className="gap-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-col gap-3">
                  <Button asChild variant="ghost" size="sm" className="w-fit px-0 text-muted-foreground">
                    <Link href="/staff">
                      <ArrowLeft data-icon="inline-start" />
                      Back to queue
                    </Link>
                  </Button>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      {statusBadge(ticket.status)}
                      {priorityBadge(ticket.priority)}
                    </div>
                    <CardTitle className="text-3xl tracking-tight">{ticket.ticketNumber}</CardTitle>
                    <CardDescription>{ticket.title ?? "Staff case workbench for this ticket."}</CardDescription>
                  </div>
                </div>
                <div className="grid gap-2 text-sm text-muted-foreground md:text-right">
                  <span>Submitted {formatDateTime(ticket.submittedAt)}</span>
                  <span>Updated {formatDateTime(ticket.lastUpdatedAt)}</span>
                  <span>{ticket.submitterType} ticket</span>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_420px]">
            <div className="flex flex-col gap-6">
              <Card className="border-border/70 bg-card">
                <CardHeader>
                  <CardTitle>Case Summary</CardTitle>
                  <CardDescription>Current identity, ownership, and customer context.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <SummaryItem label="Type" value={ticket.ticketType} />
                  <SummaryItem label="Category" value={ticket.categoryName ?? ticket.category?.name ?? "-"} />
                  <SummaryItem label="Submitter Type" value={ticket.submitterType} />
                  <SummaryItem label="Submitter" value={ticket.submitter?.displayName ?? ticket.guestEmail ?? "-"} />
                  <SummaryItem label="Assigned Staff" value={ticket.assignedStaff?.displayName ?? "Unassigned"} />
                  <SummaryItem label="Last Updated" value={formatDateTime(ticket.lastUpdatedAt)} />
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card">
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                  <CardDescription>Full ticket narrative for case review.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">{ticket.description}</p>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Paperclip className="text-muted-foreground" />
                    <CardTitle>Attachments</CardTitle>
                  </div>
                  <CardDescription>Evidence and uploaded files attached to this ticket.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {ticket.attachments.length === 0 ? (
                    <Empty className="border border-dashed border-border bg-muted/20">
                      <EmptyHeader>
                        <EmptyMedia variant="icon"><Paperclip /></EmptyMedia>
                        <EmptyTitle>No attachments available</EmptyTitle>
                        <EmptyDescription>This case has no uploaded files yet.</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    ticket.attachments.map((item) => (
                      <Card key={item.id} className="border-border/70 bg-background/70 shadow-none">
                        <CardContent className="flex flex-col gap-4 p-4">
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div className="flex flex-col gap-1">
                              <p className="font-medium text-foreground">{item.fileName}</p>
                              <p className="text-sm text-muted-foreground">{item.fileType ?? "Unknown file type"}</p>
                              <p className="break-all text-xs text-muted-foreground">{item.filePath}</p>
                            </div>
                            <div className="flex flex-col gap-2 md:items-end">
                              <span className="text-xs text-muted-foreground">{formatDateTime(item.uploadedAt)}</span>
                              {item.signedUrl ? (
                                <Button asChild variant="outline" size="sm">
                                  <a href={item.signedUrl} target="_blank" rel="noreferrer">Open attachment</a>
                                </Button>
                              ) : null}
                            </div>
                          </div>
                          {item.signedUrl && (item.fileType ?? "").startsWith("image/") ? (
                            <img
                              src={item.signedUrl}
                              alt={item.fileName}
                              className="max-h-80 w-full rounded-lg border border-border/70 object-contain"
                            />
                          ) : null}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <History className="text-muted-foreground" />
                    <CardTitle>Status History</CardTitle>
                  </div>
                  <CardDescription>Chronological record of staff status changes and remarks.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {ticket.statusHistory.length === 0 ? (
                    <Empty className="border border-dashed border-border bg-muted/20">
                      <EmptyHeader>
                        <EmptyMedia variant="icon"><History /></EmptyMedia>
                        <EmptyTitle>No status history yet</EmptyTitle>
                        <EmptyDescription>Status transitions will appear here after staff actions.</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    ticket.statusHistory.map((entry) => (
                      <Card key={entry.id} className="border-border/70 bg-background/70 shadow-none">
                        <CardContent className="flex flex-col gap-3 p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="size-9">
                                <AvatarFallback>{initialsForName(entry.changedBy?.displayName ?? "Unknown")}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col gap-0.5">
                                <p className="font-medium text-foreground">{entry.oldStatus} to {entry.newStatus}</p>
                                <p className="text-sm text-muted-foreground">By {entry.changedBy?.displayName ?? "Unknown Staff"}</p>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">{formatDateTime(entry.changedAt)}</span>
                          </div>
                          {entry.remarks ? (
                            <>
                              <Separator />
                              <p className="text-sm text-foreground">{entry.remarks}</p>
                            </>
                          ) : null}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-6 xl:sticky xl:top-24 xl:self-start">
              {(actionMessage || actionError) ? (
                <Alert variant={actionError ? "destructive" : "default"}>
                  <AlertCircle />
                  <AlertTitle>{actionError ? "Action failed" : "Action completed"}</AlertTitle>
                  <AlertDescription>{actionError ?? actionMessage}</AlertDescription>
                </Alert>
              ) : null}

              <Card className="border-border/70 bg-card">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <UserRound className="text-muted-foreground" />
                    <CardTitle>Assignment</CardTitle>
                  </div>
                  <CardDescription>Claim ownership before working the case further.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/30 p-3">
                    <Avatar className="size-10">
                      <AvatarFallback>{initialsForName(ticket.assignedStaff?.displayName ?? "Unassigned")}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-medium text-foreground">{ticket.assignedStaff?.displayName ?? "Unassigned"}</span>
                      <span className="text-sm text-muted-foreground">{ticket.assignedStaff?.email ?? "No current owner"}</span>
                    </div>
                  </div>
                  <Button type="button" onClick={handleSelfAssign} disabled={assigning}>
                    {assigning ? "Assigning..." : "Assign to me"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card">
                <CardHeader>
                  <CardTitle>Update Status</CardTitle>
                  <CardDescription>Set the current customer-facing state and optionally record remarks.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="flex flex-col gap-4" onSubmit={handleStatusSubmit}>
                    <FieldGroup>
                      <Field>
                        <FieldLabel>Status</FieldLabel>
                        <FieldContent>
                          <Select value={statusDraft} onValueChange={setStatusDraft}>
                            <SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectLabel>Status</SelectLabel>
                                {TICKET_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </FieldContent>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="status-remarks">Remarks</FieldLabel>
                        <FieldContent>
                          <Textarea
                            id="status-remarks"
                            rows={4}
                            value={remarks}
                            placeholder="Add context for the status update"
                            onChange={(event) => setRemarks(event.target.value)}
                          />
                        </FieldContent>
                      </Field>
                    </FieldGroup>
                    <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save status"}</Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-muted-foreground" />
                    <CardTitle>Current Classification</CardTitle>
                  </div>
                  <CardDescription>Applied case values and the source of those values.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <SummaryItem label="Applied Category" value={ticket.categoryName ?? "-"} />
                  <SummaryItem label="Applied Priority" value={ticket.priority ?? "-"} />
                  <div className="flex flex-wrap gap-2">{sourceBadge(ticket.categorySource)}{sourceBadge(ticket.prioritySource)}</div>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="text-muted-foreground" />
                    <CardTitle>NLP Suggestion and Review</CardTitle>
                  </div>
                  <CardDescription>Compare suggested values with applied values, then submit corrections.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {ticket.nlpSuggestion ? (
                    <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/30 p-4">
                      <SummaryItem label="Suggested Category" value={ticket.nlpSuggestion.suggestedCategoryName ?? "-"} />
                      <SummaryItem label="Suggested Priority" value={ticket.nlpSuggestion.suggestedPriority ?? "-"} />
                      <SummaryItem label="Suggestion Source" value={ticket.nlpSuggestion.prioritySource?.toUpperCase() ?? "-"} />
                      <SummaryItem label="Decision Status" value={ticket.nlpSuggestion.isApplied ? "Auto-applied" : "Suggestion only"} />
                      <div className="flex flex-wrap gap-2">
                        {confidenceBadge(ticket.nlpSuggestion.confidenceCategory, "Category")}
                        {confidenceBadge(ticket.nlpSuggestion.confidencePriority, "Priority")}
                      </div>
                    </div>
                  ) : (
                    <Empty className="border border-dashed border-border bg-muted/20 p-6">
                      <EmptyHeader>
                        <EmptyMedia variant="icon"><WandSparkles /></EmptyMedia>
                        <EmptyTitle>No NLP suggestion available</EmptyTitle>
                        <EmptyDescription>This ticket currently has no stored NLP suggestion to compare against.</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}

                  {(reviewMessage || reviewError) ? (
                    <Alert variant={reviewError ? "destructive" : "default"}>
                      <AlertCircle />
                      <AlertTitle>{reviewError ? "Review failed" : "Review saved"}</AlertTitle>
                      <AlertDescription>{reviewError ?? reviewMessage}</AlertDescription>
                    </Alert>
                  ) : null}

                  <Separator />

                  <form className="flex flex-col gap-4" onSubmit={handleNlpReviewSubmit}>
                    <FieldGroup>
                      <Field>
                        <FieldLabel>Corrected Priority</FieldLabel>
                        <FieldContent>
                          <Select value={reviewPriority || "__unspecified"} onValueChange={(value) => setReviewPriority(value === "__unspecified" ? "" : value)} disabled={nlpOptionsLoading || reviewSaving}>
                            <SelectTrigger><SelectValue placeholder="Unspecified" /></SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectLabel>Priority</SelectLabel>
                                <SelectItem value="__unspecified">Unspecified</SelectItem>
                                {(nlpOptions?.priorities ?? []).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </FieldContent>
                      </Field>
                      <Field>
                        <FieldLabel>Corrected Category</FieldLabel>
                        <FieldContent>
                          <Select value={reviewCategoryName || "__unspecified"} onValueChange={(value) => setReviewCategoryName(value === "__unspecified" ? "" : value)} disabled={nlpOptionsLoading || reviewSaving}>
                            <SelectTrigger><SelectValue placeholder="Unspecified" /></SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectLabel>Category</SelectLabel>
                                <SelectItem value="__unspecified">Unspecified</SelectItem>
                                {(nlpOptions?.categories ?? []).map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </FieldContent>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="review-notes">Review Notes</FieldLabel>
                        <FieldContent>
                          <Textarea id="review-notes" rows={4} value={reviewNotes} placeholder="Optional reviewer notes" disabled={reviewSaving} onChange={(event) => setReviewNotes(event.target.value)} />
                        </FieldContent>
                      </Field>
                    </FieldGroup>
                    <Button type="submit" disabled={nlpOptionsLoading || reviewSaving}>{reviewSaving ? "Saving..." : "Save NLP review"}</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border/70 bg-muted/20 p-3">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}
