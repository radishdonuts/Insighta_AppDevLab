"use client";

import Link from "next/link";
import { motion } from "framer-motion";
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

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const slideInRight = {
  hidden: { opacity: 0, x: 56 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.75 } },
};

const itemFadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const viewportSettings = {
  once: false,
  amount: 0.22,
};

export default function AboutPage() {
  return (
    <main className={styles.aboutPage}>
      <motion.header
        className={styles.aboutHeader}
        initial="hidden"
        whileInView="visible"
        viewport={viewportSettings}
        variants={staggerContainer}
      >
        <motion.h1 variants={itemFadeIn}>
          About <span className="highlight">Insighta</span>
        </motion.h1>
        <motion.p variants={itemFadeIn}>
          Insighta is an AI-powered non-life insurance complaint ticketing
          system designed to make complaint handling faster, smarter, and more
          transparent. It gives customers a simple way to submit concerns and
          track updates, while helping staff classify, prioritize, and resolve
          tickets more efficiently through AI-assisted analysis.
        </motion.p>
      </motion.header>

      <section className={styles.aboutContent}>
        <motion.div
          className={styles.container}
          initial="hidden"
          whileInView="visible"
          viewport={viewportSettings}
          variants={staggerContainer}
        >
          <motion.section className={styles.section} variants={fadeIn}>
            <motion.h2 variants={itemFadeIn}>Core Capabilities</motion.h2>
            <div className={styles.capabilityGrid}>
              {capabilityCards.map((item, index) => (
                <motion.article
                  key={item.title}
                  className={`${styles.capabilityCard} ${
                    index === 2 ? styles.capabilityCardFeatured : ""
                  }`.trim()}
                  variants={itemFadeIn}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                >
                  <span className={styles.capabilityBadge}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </motion.article>
              ))}
            </div>
          </motion.section>

          <motion.article className={styles.textPanel} variants={fadeIn}>
            <motion.h2 variants={itemFadeIn}>Our Mission</motion.h2>
            <p>
              We aim to improve complaint processing speed, strengthen customer
              trust through transparent tracking, and support better
              decision-making through dashboards, reporting, and service trend
              analysis.
            </p>
          </motion.article>

          <motion.article className={styles.textPanel} variants={slideInRight}>
            <motion.h2 variants={itemFadeIn}>Built for Trust</motion.h2>
            <p>
              Insighta is designed with role-based access, secure
              authentication, activity logging, and encrypted data handling to
              support a safer and more reliable complaint management process.
            </p>
          </motion.article>

          <motion.section className={styles.ctaSection} variants={fadeIn}>
            <motion.p variants={itemFadeIn}>
              Ready to streamline your complaint workflow?
            </motion.p>
            <motion.div className="hero-buttons" variants={staggerContainer}>
              <Link href="/submit" className="btn-primary">
                Submit a Complaint
              </Link>
              <Link href="/track" className="btn-outline">
                Track Your Ticket
              </Link>
            </motion.div>
          </motion.section>
        </motion.div>
      </section>
    </main>
  );
}
