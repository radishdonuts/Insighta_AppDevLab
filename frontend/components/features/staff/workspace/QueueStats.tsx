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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col justify-between gap-3 rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-sm"
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.1 }}
          className="flex flex-col gap-1 rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-sm transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
        >
          <div className="flex items-center gap-2 mb-2">
            {stat.icon && (
              <span className={stat.negative ? "text-destructive" : "text-sky-700"}>
                {stat.icon}
              </span>
            )}
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {stat.label}
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">
            {stat.value}
          </h2>
          <p className="text-xs leading-relaxed text-slate-600">
            {stat.description}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
