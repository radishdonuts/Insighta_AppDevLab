"use client";

import Link from "next/link";
import { Search } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import type {
  StaffCategorySummary,
  StaffPersonSummary,
  StaffTicketQueueItem,
  TicketFieldSource,
} from "@/types/staff-tickets";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/types/tickets";

export type AssignmentPreset = "all" | "mine" | "unassigned";
export type AssignmentSelection =
  | { kind: "preset"; value: AssignmentPreset }
  | { kind: "staff"; value: string };

type QueueFiltersProps = {
  searchValue: string;
  status: string;
  priority: string;
  categoryId: string;
  assignmentSelection: AssignmentSelection;
  categoryOptions: StaffCategorySummary[];
  staffOptions: StaffPersonSummary[];
  selectedStaffName: string | null;
  isUpdating: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onAssignmentChange: (next: AssignmentSelection) => void;
  onReset: () => void;
};

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

export function statusBadge(status: string) {
  if (status === "In Progress") {
    return (
      <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
        {status}
      </Badge>
    );
  }

  if (status === "Resolved" || status === "Closed") {
    return <Badge variant="secondary">{status}</Badge>;
  }

  if (status === "Pending Customer Response") {
    return (
      <Badge variant="outline" className="bg-muted text-foreground">
        {status}
      </Badge>
    );
  }

  return <Badge variant="outline">{status}</Badge>;
}

export function priorityBadge(priority: string) {
  if (priority === "High") return <Badge variant="destructive">{priority}</Badge>;

  if (priority === "Medium") {
    return (
      <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
        {priority}
      </Badge>
    );
  }

  if (priority === "Low") return <Badge variant="secondary">{priority}</Badge>;

  return <Badge variant="outline">{priority}</Badge>;
}

export function categoryBadge(label: string) {
  return <Badge variant="outline">{label}</Badge>;
}

export function assignmentValue(selection: AssignmentSelection): string {
  return selection.kind === "preset" ? `preset:${selection.value}` : `staff:${selection.value}`;
}

export function MetricCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-border/70 bg-card">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div className="flex flex-col gap-1">
          <CardDescription>{title}</CardDescription>
          <CardTitle className="text-2xl">{value}</CardTitle>
        </div>
        <div className="rounded-md border border-border/70 bg-muted/60 p-2 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function QueueFilters(props: QueueFiltersProps) {
  const {
    searchValue,
    status,
    priority,
    categoryId,
    assignmentSelection,
    categoryOptions,
    staffOptions,
    selectedStaffName,
    isUpdating,
    onSearchChange,
    onStatusChange,
    onPriorityChange,
    onCategoryChange,
    onAssignmentChange,
    onReset,
  } = props;

  return (
    <Card className="border-border/70 bg-card">
      <CardHeader className="flex flex-col gap-3 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base">Queue Filters</CardTitle>
            <CardDescription>Search, narrow, and switch queue ownership without leaving the page.</CardDescription>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            {selectedStaffName ? (
              <Badge variant="outline" className="max-w-[16rem] truncate">
                Assigned to {selectedStaffName}
              </Badge>
            ) : null}
            {isUpdating ? <span className="text-sm text-muted-foreground">Refreshing results...</span> : null}
            <Button type="button" variant="ghost" size="sm" onClick={onReset}>
              Reset
            </Button>
          </div>
        </div>

        <FieldGroup>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
            <Field>
              <FieldLabel htmlFor="ticket-search">Search</FieldLabel>
              <FieldContent>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="ticket-search"
                    type="search"
                    value={searchValue}
                    placeholder="Search ticket number or description"
                    className="pl-10"
                    onChange={(event) => onSearchChange(event.target.value)}
                  />
                </div>
              </FieldContent>
            </Field>

            <QueueSelect
              label="Status"
              value={status || "__all"}
              placeholder="All statuses"
              options={TICKET_STATUSES.map((item) => ({ label: item, value: item }))}
              onValueChange={(value) => onStatusChange(value === "__all" ? "" : value)}
            />

            <QueueSelect
              label="Priority"
              value={priority || "__all"}
              placeholder="All priorities"
              options={TICKET_PRIORITIES.map((item) => ({ label: item, value: item }))}
              onValueChange={(value) => onPriorityChange(value === "__all" ? "" : value)}
            />

            <QueueSelect
              label="Category"
              value={categoryId || "__all"}
              placeholder="All categories"
              options={categoryOptions.map((item) => ({ label: item.name, value: item.id }))}
              onValueChange={(value) => onCategoryChange(value === "__all" ? "" : value)}
            />

            <Field>
              <FieldLabel>Assignment</FieldLabel>
              <FieldContent>
                <Select
                  value={assignmentValue(assignmentSelection)}
                  onValueChange={(value) => {
                    if (value.startsWith("staff:")) {
                      onAssignmentChange({ kind: "staff", value: value.slice("staff:".length) });
                      return;
                    }

                    const preset = value.replace("preset:", "");
                    if (preset === "mine" || preset === "unassigned" || preset === "all") {
                      onAssignmentChange({ kind: "preset", value: preset });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assignment scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Presets</SelectLabel>
                      <SelectItem value="preset:mine">Mine</SelectItem>
                      <SelectItem value="preset:unassigned">Unassigned</SelectItem>
                      <SelectItem value="preset:all">All</SelectItem>
                    </SelectGroup>
                    {staffOptions.length > 0 ? (
                      <SelectGroup>
                        <SelectLabel>Staff Members</SelectLabel>
                        {staffOptions.map((staff) => (
                          <SelectItem key={staff.id} value={`staff:${staff.id}`}>
                            {staff.displayName}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ) : null}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          </div>
        </FieldGroup>

        <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3 md:hidden">
          <p className="text-sm text-muted-foreground">
            {selectedStaffName ? `Assigned to ${selectedStaffName}` : "Filter and assignment state is URL-synced."}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={onReset}>
            Reset
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}

function QueueSelect({
  label,
  value,
  placeholder,
  options,
  onValueChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: Array<{ label: string; value: string }>;
  onValueChange: (value: string) => void;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <FieldContent>
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>{label}</SelectLabel>
              <SelectItem value="__all">{placeholder}</SelectItem>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </FieldContent>
    </Field>
  );
}
