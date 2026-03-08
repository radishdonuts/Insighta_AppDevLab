"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface StatItem {
  label: string;
  value: number | string;
  description: string;
  negative?: boolean;
  icon?: React.ReactNode;
}

interface QueueStatsProps {
  stats: StatItem[];
  loading?: boolean;
}

export default function QueueStats({ stats, loading }: QueueStatsProps) {
  if (loading) {
    return (
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
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.1 }}
          className="flex flex-col gap-1 p-5 border border-[#0e62a5]/15 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm transition-colors hover:border-[#0e62a5]/40 hover:shadow-md hover:bg-white"
        >
          <div className="flex items-center gap-2 mb-2">
            {stat.icon && (
              <span className={stat.negative ? "text-destructive" : "text-primary"}>
                {stat.icon}
              </span>
            )}
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {stat.label}
            </span>
          </div>
          <h2 className="text-3xl tracking-tight font-bold text-[#0d1b2a]">
            {stat.value}
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {stat.description}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
