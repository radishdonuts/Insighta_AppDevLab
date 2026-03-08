import type { ReactNode } from "react";

import { Badge as UiBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

type BadgeProps = {
  tone?: BadgeTone;
  children: ReactNode;
};

function toneVariant(tone: BadgeTone): "default" | "secondary" | "destructive" | "outline" {
  if (tone === "danger") return "destructive";
  if (tone === "info") return "default";
  if (tone === "accent") return "default";
  if (tone === "success") return "secondary";
  return "outline";
}

export function Badge({ tone = "neutral", children }: BadgeProps) {
  return (
    <UiBadge
      variant={toneVariant(tone)}
      className={cn(
        "font-medium",
        tone === "accent" && "bg-primary/10 text-primary hover:bg-primary/15",
        tone === "warning" && "bg-muted text-foreground hover:bg-muted",
        tone === "neutral" && "text-muted-foreground"
      )}
    >
      {children}
    </UiBadge>
  );
}
