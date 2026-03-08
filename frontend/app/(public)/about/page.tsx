import Link from "next/link";
import styles from "./about.module.css";

const capabilityCards = [
  {
    title: "AI Classification",
    body: "Automatically analyzes complaint content for smarter handling.",
  },
  {
    title: "Priority Routing",
    body: "Highlights urgent cases so teams can respond faster.",
  },
  {
    title: "Real-Time Tracking",
    body: "Gives customers clear visibility into ticket progress.",
  },
  {
    title: "Secure Complaint Handling",
    body: "Supports protected access, traceability, and accountability.",
  },
];

export default function AboutPage() {
  return (
    <main className={styles.aboutPage}>
      <header className={styles.aboutHeader}>
        <h1>
          About <span className="highlight">Insighta</span>
        </h1>
        <p>
          Insighta is an AI-powered non-life insurance complaint ticketing
          system designed to make complaint handling faster, smarter, and more
          transparent. It gives customers a simple way to submit concerns and
          track updates, while helping staff classify, prioritize, and resolve
          tickets more efficiently through AI-assisted analysis.
        </p>
      </header>

      <section className={styles.aboutContent}>
        <div className={styles.container}>
          <section className={styles.section}>
            <h2>Core Capabilities</h2>
            <div className={styles.capabilityGrid}>
              {capabilityCards.map((item, index) => (
                <article
                  key={item.title}
                  className={`${styles.capabilityCard} ${
                    index === 2 ? styles.capabilityCardFeatured : ""
                  }`.trim()}
                >
                  <span className={styles.capabilityBadge}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </section>

          <article className={styles.textPanel}>
            <h2>Our Mission</h2>
            <p>
              We aim to improve complaint processing speed, strengthen customer
              trust through transparent tracking, and support better
              decision-making through dashboards, reporting, and service trend
              analysis.
            </p>
          </article>

          <article className={styles.textPanel}>
            <h2>Built for Trust</h2>
            <p>
              Insighta is designed with role-based access, secure
              authentication, activity logging, and encrypted data handling to
              support a safer and more reliable complaint management process.
            </p>
          </article>

          <section className={styles.ctaSection}>
            <p>Ready to streamline your complaint workflow?</p>
            <div className="hero-buttons">
              <Link href="/submit" className="btn-primary">
                Submit a Complaint
              </Link>
              <Link href="/track" className="btn-outline">
                Track Your Ticket
              </Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
