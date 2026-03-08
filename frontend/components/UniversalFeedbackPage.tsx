"use client";

import { useState } from "react";

import { FeedbackForm, type FeedbackData } from "@/components/FeedbackForm";

import styles from "@/components/features/public/feedback/page.module.css";

type ApiResponse = {
  error?: string;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export default function UniversalFeedbackPage({ sourceTicketId }: { sourceTicketId?: string }) {
  const [initialFeedback, setInitialFeedback] = useState<FeedbackData | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function submitFeedback(data: FeedbackData) {
    setSubmitError(null);
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const payload = (await response.json()) as ApiResponse;
    if (!response.ok) {
      throw new Error(asString(payload.error) || "Failed to submit feedback.");
    }

    setInitialFeedback(data);
  }

  return (
    <main className={styles.container}>
      <section className={styles.card}>
        <header className={styles.header}>
          <div className={styles.headerIcon} aria-hidden>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L15 8l6 .9-4.5 4.4L17.5 20 12 17l-5.5 3 1-6.7L3 8.9 9 8z" />
            </svg>
          </div>
          <h1>Company Feedback</h1>
          <p>Share your experience with our service. Feedback is not tied to a specific ticket.</p>
          {sourceTicketId ? <p className={styles.stateText}>Opened from ticket: {sourceTicketId}</p> : null}
        </header>

        <FeedbackForm
          ticketId={sourceTicketId ?? "company-service"}
          subjectLabel="our company service"
          onSubmit={submitFeedback}
          initialData={initialFeedback}
        />

        {submitError ? <p className={styles.errorText}>{submitError}</p> : null}
      </section>
    </main>
  );
}
