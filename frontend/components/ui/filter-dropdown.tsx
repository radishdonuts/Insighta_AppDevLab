"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
  description?: string;
}

export interface FilterOptionGroup {
  label: string;
  options: FilterOption[];
}

interface FilterDropdownProps {
  label: string;
  placeholder?: string;
  options?: FilterOption[];
  groups?: FilterOptionGroup[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function FilterDropdown({
  label,
  placeholder = "Select...",
  options,
  groups,
  value,
  onChange,
  className,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Flatten all options for display lookup
  const allOptions = React.useMemo(() => {
    if (options) return options;
    if (groups) return groups.flatMap((g) => g.options);
    return [];
  }, [options, groups]);

  const selectedLabel =
    allOptions.find((o) => o.value === value)?.label ?? placeholder;

  // Close on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleSelect(optionValue: string) {
    onChange(optionValue);
    setIsOpen(false);
  }

  function renderOption(option: FilterOption, index: number) {
    return (
      <motion.button
        key={option.value}
        type="button"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.15, delay: index * 0.03 }}
        onClick={() => handleSelect(option.value)}
        className={cn(
          "w-full px-3 py-2.5 text-left transition-colors duration-150",
          "hover:bg-accent hover:text-accent-foreground",
          "flex items-center justify-between gap-2",
          "border-b border-border/50 last:border-b-0"
        )}
      >
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{option.label}</div>
          {option.description && (
            <div className="text-xs text-muted-foreground truncate">
              {option.description}
            </div>
          )}
        </div>
        {value === option.value && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <Check className="h-4 w-4 shrink-0 text-primary" />
          </motion.div>
        )}
      </motion.button>
    );
  }

  const hasActiveFilter = Boolean(value) && value !== "__all" && value !== "preset:mine";

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <span className="block text-sm font-medium text-foreground mb-1.5">
        {label}
      </span>

      {/* Trigger */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.99 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full h-9 px-3 rounded-lg border transition-colors duration-200",
          "bg-background text-foreground",
          "flex items-center justify-between gap-2",
          "text-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          hasActiveFilter
            ? "border-primary/50 bg-primary/5"
            : "border-input hover:border-ring"
        )}
      >
        <span className={cn("truncate", value ? "" : "text-muted-foreground")}>
          {selectedLabel}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </motion.button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute z-[70] w-full mt-1.5 rounded-lg border overflow-hidden shadow-lg",
              "bg-popover text-popover-foreground",
              "max-h-64 overflow-y-auto"
            )}
          >
            {options
              ? options.map((option, i) => renderOption(option, i))
              : null}

            {groups
              ? groups.map((group) => (
                  <div key={group.label}>
                    <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">
                      {group.label}
                    </div>
                    {group.options.map((option, i) =>
                      renderOption(option, i)
                    )}
                  </div>
                ))
              : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
