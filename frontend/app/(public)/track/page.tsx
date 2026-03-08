"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import TrackTicketLookup from "@/components/TrackTicketLookup";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export default function TrackPage() {
  return (
    <Suspense fallback={<TrackPageShell />}>
      <TrackPageContent />
    </Suspense>
  );
}

function TrackPageContent() {
  const searchParams = useSearchParams();
  const tokenFromQuery = asString(searchParams.get("token"));
  return <TrackPageShell initialToken={tokenFromQuery} />;
}

function TrackPageShell({
  initialToken = "",
}: {
  initialToken?: string;
}) {
  return (
    <main className="glass-shell">
      <div className="glass-shell-word" aria-hidden="true">
        INSIGHTA
      </div>
      <section className="glass-shell-panel glass-shell-panel--narrow">
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <h1
          style={{
            fontSize: "1.8rem",
            fontWeight: 800,
            marginBottom: "1.5rem",
            color: "var(--text)",
          }}
        >
          Track Ticket
        </h1>

        <TrackTicketLookup initialToken={initialToken} />
        </div>
      </section>
    </main>
  );
}
