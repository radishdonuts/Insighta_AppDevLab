"use client";

import * as React from "react";
import { motion } from "framer-motion";

interface AuthSplitShellProps {
  /** Content rendered in the form panel */
  children: React.ReactNode;
  /** Image URL for the image panel */
  imageSrc: string;
  /** Alt text for the image */
  imageAlt: string;
  /** Which side the image appears on. Defaults to "right". */
  imagePosition?: "left" | "right";
  /** Vertical alignment for the form panel content. Defaults to "center". */
  formVerticalAlign?: "center" | "start";
  /** Optional classes for the form content wrapper (e.g., slight vertical offsets). */
  contentClassName?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

/**
 * A responsive split-screen shell for auth pages (login / register).
 * Left panel: form content (passed as children).
 * Right panel: full-bleed image with a subtle blue gradient overlay.
 */
export function AuthSplitShell({
  children,
  imageSrc,
  imageAlt,
  imagePosition = "right",
  formVerticalAlign = "center",
  contentClassName,
}: AuthSplitShellProps) {
  const imagePanel = (
    <div className="relative hidden w-1/2 md:block">
      <img
        src={imageSrc}
        alt={imageAlt}
        className="h-full w-full object-cover"
      />
      {/* Blue‑tinted gradient overlay matching Insighta theme */}
      <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 to-blue-600/10" />
    </div>
  );

  const formPanel = (
    <div
      className={`flex w-full flex-col items-center bg-background p-8 md:w-1/2 ${
        formVerticalAlign === "start" ? "justify-start" : "justify-center"
      }`}
    >
      <div className="w-full max-w-md">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={`flex flex-col gap-6 ${contentClassName ?? ""}`}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );

  return (
    <div className="relative flex min-h-screen w-full flex-col md:flex-row">
      {imagePosition === "left" ? (
        <>
          {imagePanel}
          {formPanel}
        </>
      ) : (
        <>
          {formPanel}
          {imagePanel}
        </>
      )}
    </div>
  );
}

/** Re‑export the motion helpers so pages can animate individual rows */
export { itemVariants, containerVariants };
