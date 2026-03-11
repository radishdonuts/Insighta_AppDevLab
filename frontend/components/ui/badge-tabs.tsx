"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface BadgeTabItem {
  value: string;
  label: string;
  badge?: number;
}

interface BadgeTabsProps {
  items: BadgeTabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  fullWidth?: boolean;
}

export default function BadgeTabs({
  items,
  value,
  onValueChange,
  className,
  fullWidth = false,
}: BadgeTabsProps) {
  return (
    <div className={cn("w-full", className)}>
      <Tabs value={value} onValueChange={onValueChange} className="w-full">
        <TabsList
          className={cn(
            "relative flex gap-1 bg-muted/40 backdrop-blur-sm p-1.5 rounded-xl border",
            fullWidth ? "w-full justify-center" : "w-full sm:w-auto justify-center"
          )}
        >
          {items.map((item) => {
            const isActive = item.value === value;
            return (
              <TabsTrigger key={item.value} value={item.value} asChild>
                <motion.button
                  className={cn(
                    "relative flex-1 flex justify-between items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground/80"
                  )}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="staff-tab-pill"
                      className="absolute inset-0 bg-white dark:bg-white/10 rounded-lg shadow-sm z-0"
                      initial={false}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                      }}
                    />
                  )}

                  <span className="relative z-10">{item.label}</span>

                  <AnimatePresence mode="popLayout">
                    {typeof item.badge === "number" && item.badge >= 0 && (
                      <motion.span
                        key={item.badge}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className={cn(
                          "ml-2 relative z-10 inline-flex items-center justify-center min-w-[20px] h-5 px-2 rounded-full text-xs font-bold",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {item.badge}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}
