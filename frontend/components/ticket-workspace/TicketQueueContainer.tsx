import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import styles from "./workspace-ui.module.css";

type PaginationInfo = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type TicketQueueContainerProps = {
  pagination: PaginationInfo | null;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  children: ReactNode;
  footerText?: string;
};

export default function TicketQueueContainer({
  pagination,
  canPrev,
  canNext,
  onPrev,
  onNext,
  children,
  footerText,
}: TicketQueueContainerProps) {
  return (
    <Card className={styles.queueContainer}>
      <CardHeader className={`${styles.queueHeader} p-4 pb-2`}>
        <CardTitle className={styles.sectionTitle}>Ticket Queue</CardTitle>

        {pagination ? (
          <div className={styles.queueHeaderRight}>
            <span className={styles.metaText}>{pagination.total.toLocaleString()} tickets</span>
            <span className={styles.metaText}>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className={styles.compactPager}>
              <button type="button" className={styles.compactPagerButton} onClick={onPrev} disabled={!canPrev}>
                Prev
              </button>
              <button type="button" className={styles.compactPagerButton} onClick={onNext} disabled={!canNext}>
                Next
              </button>
            </div>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className={`${styles.queueContent} px-4 pb-4 pt-0`}>{children}</CardContent>

      {footerText ? <p className={`${styles.queueFooterText} px-4 pb-4`}>{footerText}</p> : null}
    </Card>
  );
}
