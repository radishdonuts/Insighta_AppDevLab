"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, ClipboardCopy, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

import type { StaffTicketQueueItem } from "@/types/staff-tickets";
import {
  relativeTime,
  initialsForName,
  sourceSummary,
  statusBadge,
  priorityBadge,
  categoryBadge,
} from "./queue-ui";

/* ── small info sub-component (from insurance-card pattern) ── */
function InfoItem({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-sm text-card-foreground truncate">
          {value}
        </span>
        {children}
      </div>
    </div>
  );
}

/* ── ticket card ── */
export default function TicketCard({
  ticket,
  detailHrefBase = "/staff/tickets",
}: {
  ticket: StaffTicketQueueItem;
  detailHrefBase?: string;
}) {
  const status = statusBadge(ticket.status);
  const priority = priorityBadge(ticket.priority);
  const category = categoryBadge(ticket.category?.name ?? "Uncategorized");

  const [copied, setCopied] = React.useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(ticket.ticketNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const isUnassigned = !ticket.assignedStaff;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
    >
      <Card className="w-full overflow-hidden rounded-2xl border-primary/10 shadow-lg">
        {/* Header — assignee avatar, ticket number, updated date */}
        <CardHeader className="bg-muted/30 p-6">
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className={cn("h-14 w-14 shrink-0 border-2", isUnassigned ? "border-dashed border-muted-foreground/30" : "border-background")}>
                <AvatarFallback className={cn("text-xs font-bold", isUnassigned && "text-muted-foreground bg-muted/50")}>
                  {initialsForName(
                    ticket.assignedStaff?.displayName ?? null
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-bold text-sm text-foreground truncate">
                  {ticket.assignedStaff?.displayName ?? "Unassigned"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {ticket.assignedStaff?.email ?? "No current owner"}
                </p>
              </div>
            </div>

            {/* Ticket number + copy */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="font-mono text-sm font-bold text-foreground">
                {ticket.ticketNumber}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCopy}
              >
                <ClipboardCopy
                  className={cn(
                    "h-4 w-4 transition-colors",
                    copied ? "text-primary" : "text-muted-foreground"
                  )}
                />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Content — title, badge row, info grid, description */}
        <CardContent className="p-6 space-y-6">
          {/* Title */}
          {ticket.title && (
            <p className="text-sm font-semibold text-card-foreground line-clamp-1">
              {ticket.title}
            </p>
          )}

          {/* Badge pills */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={status.variant} className={status.className}>{status.label}</Badge>
            <Badge variant={priority.variant} className={priority.className}>{priority.label}</Badge>
            <Badge variant={category.variant} className={category.className}>{category.label}</Badge>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <InfoItem label="Submitter" value={ticket.submitterType} />
            <InfoItem
              label="Field Source"
              value={sourceSummary(
                ticket.prioritySource,
                ticket.categorySource
              )}
            />
            <div className="col-span-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Updated {relativeTime(ticket.lastUpdatedAt)}</span>
            </div>
          </div>

          {/* Description */}
          {ticket.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {ticket.description}
            </p>
          )}
        </CardContent>

        {/* Footer — open ticket link */}
        <CardFooter className="bg-muted/30 p-6">
          <Button asChild className="group h-11 w-full rounded-xl border-input/80 bg-background/90 shadow-none hover:bg-background" variant="outline">
            <Link href={`${detailHrefBase}/${ticket.id}`}>
              Open Ticket
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
