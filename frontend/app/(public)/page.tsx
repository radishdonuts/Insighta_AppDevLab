import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-backdrop-word" aria-hidden="true">
          INSIGHTA
        </div>

        <div className="hero-glass">
          <div className="hero-phone-wrap">
            {/* Swap this src to your final phone mockup file when ready. */}
            <Image
              src="/assets/images/try6.png"
              alt="Insighta app preview"
              width={900}
              height={1000}
              className="hero-phone-image"
              priority
            />
          </div>

          <h1>
            <span className="highlight">AI-Powered</span> Complaint Resolution
            for Insurance
          </h1>
          <p className="hero-copy">
            Submit, track, and resolve insurance complaints with automatic
            triage, faster prioritization, and clearer follow-up workflows.
          </p>

          <div className="hero-buttons">
            <Link href="/submit" className="btn-primary">
              Submit a Complaint
            </Link>
            <Link href="/track" className="btn-outline">
              Track Your Ticket
            </Link>
          </div>
        </div>
      </section>

      <section className="after-hero-surface">
        <div className="after-hero-transition" aria-hidden="true" />
        <section className="features bento">
          <h2>How Insighta Works</h2>
          <div className="bento-grid">
            <article className="card bento-card bento-wide">
              <h3>01 Submit</h3>
              <p>
                File complaints through a guided form with evidence and policy
                details in one place.
              </p>
            </article>
            <article className="card bento-card">
              <h3>02 Classify</h3>
              <p>
                NLP automatically tags category, urgency, and probable escalation
                level.
              </p>
            </article>
            <article className="card bento-card">
              <h3>03 Resolve</h3>
              <p>
                Teams receive structured queues so high-impact cases are resolved
                first.
              </p>
            </article>
            <article className="card bento-card bento-tall">
              <h3>Live Status</h3>
              <p>
                Complainants and staff follow the same timeline for transparent
                updates and handoffs.
              </p>
            </article>
            <article className="card bento-card bento-wide">
              <h3>Predictive Prioritization</h3>
              <p>
                Insighta keeps response windows aligned with severity, preventing
                critical cases from being buried.
              </p>
            </article>
          </div>
        </section>
      </section>
    </>
  );
}
