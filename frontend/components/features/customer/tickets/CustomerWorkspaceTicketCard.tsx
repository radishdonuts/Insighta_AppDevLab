"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Clock3, Ticket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CustomerWorkspaceTicketCardProps = {
  id: string;
  destination: string;
  trackingNumber: string;
  categoryName: string;
  status: string;
  priority?: string | null;
  description: string;
  submittedLabel: string;
  submittedDateLabel: string;
};

function badgeClasses(kind: "status" | "priority", value: string) {
  if (kind === "status") {
    switch (value) {
      case "Resolved":
      case "Closed":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "In Progress":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "Pending Customer Response":
        return "bg-violet-100 text-violet-800 border-violet-200";
      case "Under Review":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  }

  switch (value) {
    case "High":
      return "bg-rose-100 text-rose-800 border-rose-200";
    case "Medium":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "Low":
      return "bg-cyan-100 text-cyan-800 border-cyan-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function truncate(text: string, max = 156) {
  return text.length <= max ? text : `${text.slice(0, max - 1)}...`;
}

export default function CustomerWorkspaceTicketCard({
  id,
  destination,
  trackingNumber,
  categoryName,
  status,
  priority,
  description,
  submittedLabel,
  submittedDateLabel,
}: CustomerWorkspaceTicketCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
    >
      <Card className="w-full overflow-hidden rounded-2xl border-primary/10 shadow-lg">
        <CardHeader className="bg-muted/30 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-background/90 text-primary shadow-sm">
                <Ticket />
              </div>
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-bold text-foreground">{trackingNumber}</p>
                <p className="truncate text-xs text-muted-foreground">{categoryName}</p>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-xs font-medium text-muted-foreground">Submitted</p>
              <p className="text-sm font-semibold text-foreground">{submittedLabel}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={cn("border", badgeClasses("status", status))}>
              {status}
            </Badge>
            {priority ? (
              <Badge variant="outline" className={cn("border", badgeClasses("priority", priority))}>
                {priority} Priority
              </Badge>
            ) : null}
            <Badge variant="secondary">{categoryName}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="flex min-w-0 flex-col">
              <span className="text-xs text-muted-foreground">Ticket ID</span>
              <span className="truncate text-sm font-semibold text-card-foreground">{trackingNumber}</span>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="text-xs text-muted-foreground">Visibility</span>
              <span className="truncate text-sm font-semibold text-card-foreground">Customer Workspace</span>
            </div>
            <div className="col-span-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              <span title={submittedDateLabel}>Created {submittedLabel}</span>
            </div>
          </div>

          <p className="line-clamp-3 text-sm text-muted-foreground">
            {truncate(description || `Open ticket ${id}`)}
          </p>
        </CardContent>

        <CardFooter className="bg-muted/30 p-6">
          <Button asChild className="group h-11 w-full rounded-xl border-input/80 bg-background/90 shadow-none hover:bg-background" variant="outline">
            <Link href={destination}>
              View Ticket
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
