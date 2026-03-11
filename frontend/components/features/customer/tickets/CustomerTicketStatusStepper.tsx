"use client";

import { Fragment } from "react";

import { cn } from "@/lib/utils";

const CUSTOMER_STATUS_STEPS = [
  { key: "received", label: "Received" },
  { key: "review", label: "In Review" },
  { key: "progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
] as const;

function normalizeStatus(status: string) {
  const normalized = status.trim().toLowerCase();

  if (!normalized) return 0;
  if (normalized.includes("resolved") || normalized.includes("closed")) return 3;
  if (normalized.includes("progress") || normalized.includes("pending")) return 2;
  if (normalized.includes("review")) return 1;
  return 0;
}

export function getCustomerVisibleStatusSteps(status: string) {
  return CUSTOMER_STATUS_STEPS.slice(0, normalizeStatus(status) + 1);
}

type CustomerTicketStatusStepperProps = {
  status: string;
  compact?: boolean;
  className?: string;
};

export default function CustomerTicketStatusStepper({
  status,
  compact = false,
  className,
}: CustomerTicketStatusStepperProps) {
  const visibleSteps = getCustomerVisibleStatusSteps(status);
  const currentStepIndex = visibleSteps.length - 1;

  return (
    <div
      className={cn("w-full", className)}
      aria-label={`Ticket status: ${visibleSteps[currentStepIndex]?.label ?? "Received"}`}
    >
      <div className="flex items-start">
        {visibleSteps.map((step, index) => {
          const done = index < currentStepIndex;
          const active = index === currentStepIndex;
          const circleSizeClass = compact ? "h-8 w-8" : "h-11 w-11";
          const dotSizeClass = compact ? "h-2.5 w-2.5" : "h-3 w-3";
          const labelClass = compact ? "text-[11px]" : "text-sm";

          return (
            <Fragment key={step.key}>
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full border-2 transition-colors",
                    circleSizeClass,
                    done || active ? "border-[#0e62a5] bg-[#0e62a5]" : "border-slate-300 bg-white"
                  )}
                >
                  {done ? (
                    <svg
                      width={compact ? "14" : "18"}
                      height={compact ? "14" : "18"}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span
                      className={cn(
                        "rounded-full",
                        dotSizeClass,
                        active ? "bg-white" : "bg-slate-300"
                      )}
                      aria-hidden="true"
                    />
                  )}
                </div>

                <span
                  className={cn(
                    "max-w-full leading-tight",
                    labelClass,
                    active ? "font-bold text-[#0e62a5]" : "font-medium text-slate-700"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {index < currentStepIndex ? (
                <div
                  className={cn(
                    "mt-4 h-1 flex-1 rounded-full bg-[#0e62a5]",
                    compact ? "mx-2" : "mx-3 mt-5"
                  )}
                  aria-hidden="true"
                />
              ) : null}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
