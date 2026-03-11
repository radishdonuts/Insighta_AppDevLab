"use client";

import { useState } from "react";
import Image from "next/image";

import { FeedbackForm, type FeedbackData } from "@/components/FeedbackForm";

type ApiResponse = {
  error?: string;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

type UniversalFeedbackPageProps = {
  sourceTicketId?: string;
  submitterEmail?: string | null;
};

export default function UniversalFeedbackPage({ sourceTicketId, submitterEmail = null }: UniversalFeedbackPageProps) {
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
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_24%),linear-gradient(180deg,_#f8fbff_0%,_#eef5ff_42%,_#ffffff_100%)] text-slate-950">
      <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_30px_80px_rgba(15,23,42,0.1)] backdrop-blur sm:p-10">
          <header className="mb-8 text-center">
            <div className="mb-3 flex justify-center">
              <Image src="/assets/images/blue_logo.png" alt="Insighta logo" width={44} height={44} priority />
            </div>
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Rate Your Experience</h1>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-600">
              Your feedback helps us improve future customer support.
            </p>
            {sourceTicketId ? (
              <p className="mt-2 text-sm text-slate-500">Opened from ticket: {sourceTicketId}</p>
            ) : null}
          </header>

          <FeedbackForm
            ticketId={sourceTicketId ?? "company-service"}
            subjectLabel="our company service"
            onSubmit={submitFeedback}
            initialData={initialFeedback}
            submitterEmail={submitterEmail}
          />

          {submitError ? <p className="mt-4 text-center text-sm font-semibold text-red-700">{submitError}</p> : null}
        </section>
      </main>
    </div>
  );
}
