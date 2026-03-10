"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, Ticket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

type CustomerWorkspaceTicketCardProps = {
  id: string;
  destination: string;
  trackingNumber: string;
  complaintTitle?: string | null;
  categoryName: string;
  status: string;
  description: string;
};

const STEP_LABELS = ["Received", "In Review", "In Progress", "Resolved"] as const;

function deriveStepIndex(status: string): number {
  const normalized = status.trim().toLowerCase();
  if (!normalized) return 0;
  if (normalized.includes("resolved") || normalized.includes("closed")) return 3;
  if (normalized.includes("progress")) return 2;
  if (normalized.includes("review") || normalized.includes("pending customer")) return 1;
  return 0;
}

function displayStatus(status: string): string {
  const stepIndex = deriveStepIndex(status);
  return STEP_LABELS[stepIndex];
}

function truncate(text: string, max = 156) {
  return text.length <= max ? text : `${text.slice(0, max - 1)}...`;
}

function withCapitalizedFirstLetter(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

export default function CustomerWorkspaceTicketCard({
  id,
  destination,
  trackingNumber,
  complaintTitle,
  categoryName,
  status,
  description,
}: CustomerWorkspaceTicketCardProps) {
  const currentStep = deriveStepIndex(status);
  const title = withCapitalizedFirstLetter(complaintTitle ?? "") || withCapitalizedFirstLetter(categoryName) || `Ticket ${id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
    >
      <Card className="w-full overflow-hidden rounded-2xl border-border bg-white shadow-sm">
        <CardHeader className="p-6 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-[#179fe5]/20 bg-[#e8f6ff] text-[#179fe5] shadow-sm">
                <Ticket />
              </div>
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-bold text-foreground">{trackingNumber}</p>
                <p className="truncate text-xs text-muted-foreground">Ticket #{id}</p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-6 pt-0">
          <div className="space-y-3">
            <p className="text-2xl font-bold leading-tight text-foreground">{displayStatus(status)}</p>
            <div className="flex items-center gap-2.5" aria-hidden="true">
              {STEP_LABELS.map((_, index) => {
                const complete = index < currentStep;
                const active = index === currentStep;

                return (
                  <div key={index} className="flex min-w-0 flex-1 items-center gap-2.5">
                    <div
                      className={[
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2",
                        complete
                          ? "border-[#179fe5] bg-[#179fe5] text-white"
                          : active
                            ? "border-[#179fe5] bg-[#e8f6ff] text-[#179fe5]"
                            : "border-slate-300 bg-white text-slate-300",
                      ].join(" ")}
                    >
                      {complete ? <Check className="h-4 w-4" /> : <span className="h-2.5 w-2.5 rounded-full bg-current" />}
                    </div>
                    {index < STEP_LABELS.length - 1 ? (
                      <span className={complete ? "h-1 w-full rounded-full bg-[#179fe5]" : "h-1 w-full rounded-full bg-slate-200"} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{categoryName}</Badge>
          </div>

          <h3 className="line-clamp-2 text-xl font-bold leading-tight text-foreground" title={title}>
            {title}
          </h3>

          <p className="line-clamp-3 text-sm text-muted-foreground">
            {truncate(description || `Open ticket ${id}`)}
          </p>
        </CardContent>

        <CardFooter className="p-6 pt-4">
          <Button
            asChild
            className="group h-11 w-full rounded-full border border-[#179fe5] bg-[#179fe5] text-[#f8fafc] shadow-none transition-[background-color,border-color,transform] duration-150 hover:border-[#138dc9] hover:bg-[#138dc9] active:translate-y-px"
          >
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
