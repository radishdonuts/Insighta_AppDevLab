import Link from "next/link";

import { GlassPageShell } from "@/components/GlassPageShell";

export default function AboutPage() {
  return (
    <GlassPageShell panelClassName="glass-shell-panel--wide">
      <section style={{ textAlign: "center", padding: "0.25rem 0 1.5rem" }}>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)", marginBottom: "0.8rem" }}>
          About <span style={{ color: "var(--accent)" }}>Insighta</span>
        </h1>
        <p style={{ maxWidth: 760, margin: "0 auto", color: "var(--muted)", lineHeight: 1.7 }}>
          We believe insurance complaints should not disappear into a black
          hole. Insighta brings transparency, speed, and AI-driven intelligence
          to every step of the resolution process.
        </p>
      </section>

      <section className="features" style={{ padding: "0.5rem 0 0.5rem" }}>
        <h2>Our Mission</h2>
        <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
          <article className="card" style={{ maxWidth: 780, margin: "0 auto" }}>
            <p>
              Insurance companies handle thousands of complaints daily. Without
              proper triage, critical issues get buried and customers lose
              trust. Insighta uses natural language processing to read,
              classify, and prioritize every ticket the moment it arrives, so
              the right team sees the right issue at the right time.
            </p>
          </article>
        </div>

        <h2 style={{ marginTop: "3rem" }}>What Powers Insighta</h2>
        <div className="grid">
          <article className="card">
            <h3>Smart Classification</h3>
            <p>
              Our NLP engine analyzes complaint text in real time, detecting
              category, sentiment, and urgency without any manual tagging.
            </p>
          </article>
          <article className="card">
            <h3>Priority Routing</h3>
            <p>
              High-severity tickets are surfaced immediately. Agents spend less
              time sorting and more time solving.
            </p>
          </article>
          <article className="card">
            <h3>Full Transparency</h3>
            <p>
              Customers can track their ticket status at any time, with no more
              unanswered follow-up emails or lost paperwork.
            </p>
          </article>
        </div>

        <h2 style={{ marginTop: "3rem" }}>Built With</h2>
        <div className="grid">
          <article className="card">
            <h3>Next.js + TypeScript</h3>
            <p>
              A modern, type-safe frontend and API layer for fast, reliable
              full-stack development.
            </p>
          </article>
          <article className="card">
            <h3>Supabase</h3>
            <p>
              Handles authentication, database storage, and file attachments
              with a simple, scalable backend.
            </p>
          </article>
          <article className="card">
            <h3>Local NLP Engine</h3>
            <p>
              Complaint text is processed through a locally hosted model for
              fast inference and data privacy.
            </p>
          </article>
        </div>

        <div style={{ textAlign: "center", marginTop: "3.5rem" }}>
          <p
            style={{
              color: "var(--muted)",
              marginBottom: "1.2rem",
              fontSize: "1.05rem",
            }}
          >
            Ready to streamline your complaint workflow?
          </p>
          <div className="hero-buttons">
            <Link href="/submit" className="btn-primary">
              Submit a Complaint
            </Link>
            <Link href="/" className="btn-outline">
              Back to Home
            </Link>
          </div>
        </div>
      </section>
    </GlassPageShell>
  );
}
