import type { KeyboardEvent, ReactNode } from "react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge, type BadgeTone } from "./Badge";

export type TicketCardBadgeTone = BadgeTone;

export type TicketCardBadge = {
  label: string;
  tone?: TicketCardBadgeTone;
};

export type TicketCardMetaItem = {
  label: string;
  value: string;
};

type TicketCardProps = {
  icon?: ReactNode;
  iconTone?: "blue" | "mint" | "amber" | "rose" | "lavender";
  title: string;
  subtitle?: string;
  description?: string;
  badges?: TicketCardBadge[];
  metaItems?: TicketCardMetaItem[];
  footerNote?: string;
  ctaLabel?: string;
  onOpen?: () => void;
  ariaLabel?: string;
};

export default function TicketCard({
  icon,
  title,
  subtitle,
  description,
  badges = [],
  metaItems = [],
  footerNote,
  ctaLabel = "View",
  onOpen,
  ariaLabel,
}: TicketCardProps) {
  const clickable = typeof onOpen === "function";

  function handleCardClick() {
    if (onOpen) onOpen();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!onOpen) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  }

  return (
    <Card
      className={cn(
        "group grid h-full min-h-[198px] grid-rows-[auto_1fr_auto] gap-3 border-border/70 bg-card/95",
        clickable &&
          "cursor-pointer transition-colors transition-shadow hover:border-primary/25 hover:bg-card hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? ariaLabel ?? `${ctaLabel} ticket ${title}` : undefined}
      onClick={clickable ? handleCardClick : undefined}
      onKeyDown={clickable ? handleKeyDown : undefined}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 pt-4 pb-1">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            {icon ? <span className="text-muted-foreground">{icon}</span> : null}
            <CardTitle className="truncate text-base leading-snug tracking-normal">{title}</CardTitle>
          </div>
          {subtitle ? <CardDescription className="text-xs">{subtitle}</CardDescription> : null}
        </div>

        {clickable ? (
          <span
            className="text-muted-foreground/70 opacity-0 transition-opacity transition-transform group-hover:translate-x-0.5 group-hover:opacity-100"
            aria-hidden="true"
          >
            {" >"}
          </span>
        ) : null}
      </CardHeader>

      <CardContent className="grid gap-3 px-4 pt-0 pb-0">
        {description ? (
          <CardDescription
            className="line-clamp-2 text-sm leading-relaxed text-foreground/80"
            title={description.length > 140 ? description : undefined}
          >
            {description}
          </CardDescription>
        ) : null}

        {badges.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {badges.map((badge, index) => (
              <Badge key={`${badge.label}-${index}`} tone={badge.tone ?? "neutral"}>
                {badge.label}
              </Badge>
            ))}
          </div>
        ) : null}

        {metaItems.length > 0 ? (
          <dl className="grid gap-1.5 rounded-md border border-border/70 bg-muted/25 px-2.5 py-2">
            {metaItems.map((item) => (
              <div key={`${item.label}-${item.value}`} className="grid grid-cols-[auto_1fr] items-center gap-2 text-xs">
                <dt className="font-medium text-muted-foreground">{item.label}</dt>
                <dd className="truncate text-foreground/80" title={item.value}>
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </CardContent>

      <CardFooter className="mt-1 min-h-7 px-4 pt-0 pb-4">
        {footerNote ? <p className="truncate text-xs text-muted-foreground">{footerNote}</p> : null}
      </CardFooter>
    </Card>
  );
}

