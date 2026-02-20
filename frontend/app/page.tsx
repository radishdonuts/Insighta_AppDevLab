import Link from "next/link";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="hero">
        <h1>
          AI-Powered Complaint Resolution{" "}
          <span className="highlight">for Insurance</span>
        </h1>
        <p>
          Submit, track, and resolve insurance complaints with the help of
          intelligent classification. Insighta automatically prioritizes your
          tickets so issues get resolved faster.
        </p>
        <div className="hero-buttons">
          <Link href="/submit" className="btn-primary">
            Submit a Complaint
          </Link>
          <Link href="/track" className="btn-outline">
            Track Your Ticket
          </Link>
        </div>
      </section>
    </>
  );
}
