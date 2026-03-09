"use client";

import * as React from "react";
import { AnimatePresence } from "framer-motion";
import { AlertToast } from "@/components/ui/alert-toast";

interface FlashToastProps {
  message?: string;
  error?: string;
}

/**
 * A client component that displays flash messages from URL params as AlertToasts.
 * Automatically dismisses after a timeout or on user close.
 */
export function FlashToast({ message, error }: FlashToastProps) {
  const [mounted, setMounted] = React.useState(false);
  const [dismissed, setDismissed] = React.useState<{message: boolean; error: boolean}>({
    message: false,
    error: false,
  });

  // Only render on client to avoid hydration mismatch with framer-motion
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Reset dismissed state when props change
  React.useEffect(() => {
    setDismissed(prev => ({ ...prev, message: false }));
  }, [message]);

  React.useEffect(() => {
    setDismissed(prev => ({ ...prev, error: false }));
  }, [error]);

  // Auto-dismiss after 8 seconds
  React.useEffect(() => {
    if (message && !dismissed.message) {
      const timer = setTimeout(() => setDismissed(prev => ({ ...prev, message: true })), 8000);
      return () => clearTimeout(timer);
    }
  }, [message, dismissed.message]);

  React.useEffect(() => {
    if (error && !dismissed.error) {
      const timer = setTimeout(() => setDismissed(prev => ({ ...prev, error: true })), 8000);
      return () => clearTimeout(timer);
    }
  }, [error, dismissed.error]);

  // Don't render until mounted (client-side)
  if (!mounted) return null;
  
  const showMessage = message && !dismissed.message;
  const showError = error && !dismissed.error;
  
  if (!showMessage && !showError) return null;

  return (
    <div className="mb-4 w-full max-w-sm mx-auto">
      <AnimatePresence mode="wait">
        {showMessage && (
          <AlertToast
            key="success"
            variant="success"
            styleVariant="default"
            title="Success"
            description={message}
            onClose={() => setDismissed(prev => ({ ...prev, message: true }))}
          />
        )}
        {showError && (
          <AlertToast
            key="error"
            variant="error"
            styleVariant="default"
            title="Error"
            description={error}
            onClose={() => setDismissed(prev => ({ ...prev, error: true }))}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
