"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";

export interface FeatureStepItem {
  step: string;
  title?: string;
  content: string;
  image: string;
}

interface FeatureStepsProps {
  features: FeatureStepItem[];
  className?: string;
  title?: string;
  autoPlayInterval?: number;
  imageHeight?: string;
}

export function FeatureSteps({
  features,
  className,
  title = "How it works",
  autoPlayInterval = 4000,
  imageHeight = "h-[360px] sm:h-[420px] lg:h-[520px]",
}: FeatureStepsProps) {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (features.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setProgress((prev) => {
        const next = prev + 100 / (autoPlayInterval / 100);

        if (next >= 100) {
          setCurrentFeature((current) => (current + 1) % features.length);
          return 0;
        }

        return next;
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [autoPlayInterval, features.length]);

  if (features.length === 0) {
    return null;
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-600 sm:text-lg">
            A clearer intake-to-resolution path for complaint-heavy insurance
            teams and the customers they support.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-10">
          <div className="flex flex-col gap-4">
            {features.map((feature, index) => {
              const isActive = index === currentFeature;
              const isCompleted = index < currentFeature;

              return (
                <motion.button
                  key={feature.step}
                  type="button"
                  onClick={() => {
                    setCurrentFeature(index);
                    setProgress(0);
                  }}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  className={cn(
                    "group rounded-[1.5rem] border p-5 text-left transition-all",
                    isActive
                      ? "border-sky-300 bg-[linear-gradient(180deg,_rgba(239,246,255,0.96),_rgba(255,255,255,0.98))] shadow-[0_18px_45px_rgba(14,116,144,0.12)]"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80",
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-all",
                        isActive
                          ? "border-sky-500 bg-sky-500 text-white"
                          : isCompleted
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-300 bg-slate-100 text-slate-700",
                      )}
                    >
                      {isCompleted ? "OK" : index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                        {feature.step}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-950">
                        {feature.title ?? feature.step}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                        {feature.content}
                      </p>
                      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <motion.div
                          className={cn(
                            "h-full rounded-full",
                            isActive ? "bg-sky-500" : "bg-slate-300",
                          )}
                          animate={{
                            width: isActive ? `${progress}%` : isCompleted ? "100%" : "0%",
                          }}
                          transition={{ duration: 0.2, ease: "linear" }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <div className="relative">
            <div className="absolute inset-x-8 top-6 h-24 rounded-full bg-sky-200/40 blur-3xl" />
            <div
              className={cn(
                "relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,_#e0f2fe_0%,_#f8fbff_35%,_#ffffff_100%)] p-3 shadow-[0_25px_70px_rgba(15,23,42,0.12)]",
                imageHeight,
              )}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={features[currentFeature]?.image}
                  initial={{ opacity: 0, y: 28, rotateX: -8 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  exit={{ opacity: 0, y: -28, rotateX: 8 }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                  className="absolute inset-3 overflow-hidden rounded-[1.5rem]"
                >
                  <Image
                    src={features[currentFeature].image}
                    alt={features[currentFeature].title ?? features[currentFeature].step}
                    fill
                    sizes="(max-width: 1024px) 100vw, 55vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(2,6,23,0.02)_0%,_rgba(2,6,23,0.08)_58%,_rgba(2,6,23,0.45)_100%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-7">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-100/90">
                      {features[currentFeature].step}
                    </p>
                    <p className="mt-3 max-w-xl text-2xl font-semibold leading-tight">
                      {features[currentFeature].title ?? features[currentFeature].step}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
