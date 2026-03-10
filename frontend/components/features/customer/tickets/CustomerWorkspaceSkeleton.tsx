"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export default function CustomerWorkspaceSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="overflow-hidden rounded-2xl border-primary/10 shadow-lg">
          <CardHeader className="bg-muted/30 p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-14 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="space-y-2 text-right">
                <Skeleton className="ml-auto h-3 w-16" />
                <Skeleton className="ml-auto h-4 w-20" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="col-span-2 h-3.5 w-36" />
            </div>
            <Skeleton className="h-12 w-full" />
          </CardContent>
          <CardFooter className="bg-muted/30 p-6">
            <Skeleton className="h-11 w-full rounded-xl" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
