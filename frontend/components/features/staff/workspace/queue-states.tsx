"use client";

import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { StaffTicketQueueItem } from "@/types/staff-tickets";

import {
  categoryBadge,
  formatDateTime,
  initialsForName,
  priorityBadge,
  sourceSummary,
  statusBadge,
} from "./queue-ui";

export function QueueMobileCard({ ticket }: { ticket: StaffTicketQueueItem }) {
  return (
    <Card className="border-border/70 bg-card">
      <CardHeader className="gap-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="text-base">{ticket.ticketNumber}</CardTitle>
            <p className="text-sm text-muted-foreground">{ticket.submitterType}</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/staff/tickets/${ticket.id}`}>Open</Link>
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {statusBadge(ticket.status)}
          {priorityBadge(ticket.priority)}
          {categoryBadge(ticket.category?.name ?? "Uncategorized")}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="line-clamp-2 text-sm text-foreground">{ticket.title ?? ticket.description}</p>
          {ticket.title ? <p className="line-clamp-2 text-sm text-muted-foreground">{ticket.description}</p> : null}
        </div>

        <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/30 p-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              <AvatarFallback>{initialsForName(ticket.assignedStaff?.displayName ?? "Unassigned")}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                {ticket.assignedStaff?.displayName ?? "Unassigned"}
              </span>
              <span className="text-xs text-muted-foreground">Assignee</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Updated</span>
            <span className="text-right text-foreground">{formatDateTime(ticket.lastUpdatedAt)}</span>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{sourceSummary(ticket.prioritySource, ticket.categorySource)}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function QueueSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="border-border/70 bg-card">
            <CardHeader className="gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/70 bg-card">
        <CardHeader className="gap-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="hidden flex-col gap-3 lg:flex">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
          <div className="flex flex-col gap-3 lg:hidden">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-40 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
