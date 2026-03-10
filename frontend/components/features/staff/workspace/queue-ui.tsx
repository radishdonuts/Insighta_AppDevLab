"use client";

import type { TicketFieldSource } from "@/types/staff-tickets";
import type { BadgeProps } from "@/components/ui/badge";

export type AssignmentPreset = "all" | "mine" | "unassigned";
export type AssignmentSelection =
  | { kind: "preset"; value: AssignmentPreset }
  | { kind: "staff"; value: string };

export type BadgeInfo = { label: string; variant: BadgeProps["variant"]; className?: string };

export function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function initialsForName(value: string | null | undefined) {
  const cleaned = (value ?? "").trim();
  if (!cleaned) return "NA";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function fieldSourceLabel(source: TicketFieldSource) {
  if (source === "nlp") return "NLP";
  if (source === "human_intervention") return "Staff";
  if (source === "user") return "User";
  return "Default";
}

export function sourceSummary(prioritySource: TicketFieldSource, categorySource: TicketFieldSource) {
  if (prioritySource && prioritySource === categorySource) {
    return `${fieldSourceLabel(prioritySource)}-set fields`;
  }

  return `Priority ${fieldSourceLabel(prioritySource)} / Category ${fieldSourceLabel(categorySource)}`;
}

export function sourceBadge(source: TicketFieldSource) {
  if (source === "nlp") return "NLP";
  if (source === "human_intervention") return "Staff override";
  if (source === "user") return "User selected";
  return "Default flow";
}

export function statusBadge(status: string): BadgeInfo {
  switch (status) {
    case "Open":
      return { label: status, variant: "outline", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" };
    case "In Progress":
      return { label: status, variant: "outline", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800" };
    case "Pending Review":
      return { label: status, variant: "outline", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800" };
    case "Escalated":
      return { label: status, variant: "outline", className: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800" };
    case "Resolved":
      return { label: status, variant: "outline", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800" };
    case "Closed":
      return { label: status, variant: "outline", className: "bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-400 border-gray-200 dark:border-gray-700" };
    case "Rejected":
      return { label: status, variant: "outline", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800" };
    case "On Hold":
      return { label: status, variant: "outline", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800" };
    default:
      return { label: status, variant: "outline" };
  }
}

export function priorityBadge(priority: string): BadgeInfo {
  switch (priority) {
    case "High":
      return { label: priority, variant: "outline", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800" };
    case "Medium":
      return { label: priority, variant: "outline", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800" };
    case "Low":
      return { label: priority, variant: "outline", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800" };
    default:
      return { label: priority, variant: "outline", className: "bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-400 border-slate-200 dark:border-slate-700" };
  }
}

export function categoryBadge(label: string): BadgeInfo {
  return {
    label,
    variant: "outline",
    className: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300",
  };
}

export function assignmentValue(selection: AssignmentSelection): string {
  return selection.kind === "preset" ? `preset:${selection.value}` : `staff:${selection.value}`;
}

export function relativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  if (Number.isNaN(then)) return dateString;

  const diffSec = Math.round((now - then) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return `${Math.floor(diffMonth / 12)}y ago`;
}
