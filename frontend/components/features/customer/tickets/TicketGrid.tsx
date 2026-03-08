import type { ReactNode } from "react";

import styles from "./workspace-ui.module.css";

type TicketGridProps<T> = {
  items: T[];
  getKey: (item: T) => string;
  renderCard: (item: T) => ReactNode;
};

export default function TicketGrid<T>({ items, getKey, renderCard }: TicketGridProps<T>) {
  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <div key={getKey(item)}>{renderCard(item)}</div>
      ))}
    </div>
  );
}
