"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

/** Skeleton placeholder for the full workspace while the first load is in flight. */
export function QueueSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton — 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col justify-between gap-3 p-6 border rounded-lg"
          >
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-9 w-24 mt-6" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>

      {/* Ticket card skeletons — 4 cards in 2-col grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden rounded-2xl border-primary/10 shadow-lg">
            <CardHeader className="bg-muted/30 p-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-36" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-18 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-22 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
              <Skeleton className="h-3.5 w-40" />
            </CardContent>
            <CardFooter className="bg-muted/30 p-6">
              <Skeleton className="h-11 w-full rounded-xl" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
