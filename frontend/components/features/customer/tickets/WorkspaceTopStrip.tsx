import type { ReactNode } from "react";

import styles from "./workspace-ui.module.css";

export type WorkspaceTopNavItem = {
  id: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
};

type WorkspaceTopStripProps = {
  title: string;
  subtitle?: string;
  navItems?: WorkspaceTopNavItem[];
  rightSlot?: ReactNode;
};

export default function WorkspaceTopStrip({
  title,
  subtitle,
  navItems,
  rightSlot,
}: WorkspaceTopStripProps) {
  return (
    <section className={`${styles.surfaceCard} ${styles.topStrip}`}>
      <div className={styles.stripHead}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        {rightSlot}
      </div>

      {navItems && navItems.length > 0 ? (
        <div className={styles.navRow} role="tablist" aria-label="Workspace views">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.active === true}
              className={`${styles.navPill} ${item.active ? styles.navPillActive : ""}`}
              onClick={item.onClick}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
