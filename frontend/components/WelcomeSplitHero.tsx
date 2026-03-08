import Image from "next/image";
import Link from "next/link";

import styles from "./welcome-split-hero.module.css";

type WelcomeSplitHeroProps = {
  roleLabel: string;
  firstName?: string | null;
  description: string;
  ctaHref: string;
  ctaLabel: string;
};

export default function WelcomeSplitHero({
  roleLabel,
  firstName,
  description,
  ctaHref,
  ctaLabel,
}: WelcomeSplitHeroProps) {
  const normalizedFirstName = firstName?.trim() ?? "";

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.logoPane} aria-hidden="true">
          <Image
            src="/assets/images/blue_logo.png"
            alt=""
            fill
            sizes="(max-width: 960px) 100vw, 50vw"
            className={styles.logoImage}
            priority
          />
          <div className={styles.logoTint} />
        </div>

        <div className={styles.contentPane}>
          <p className={styles.kicker}>{roleLabel} Workspace</p>
          {firstName ? (
            <h1 className={styles.title}>Welcome to 
            <br />{roleLabel} Workspace, <br />
            {normalizedFirstName}!</h1>
            ) : (
            <h1 className={styles.title}>Welcome to <br />
            {roleLabel} Workspace!</h1>
            )}
          <p className={styles.description}>{description}</p>
          
          <Link href={ctaHref} className={styles.ctaButton}>
            {ctaLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}
