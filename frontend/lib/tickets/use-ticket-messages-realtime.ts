"use client";

import { useEffect, useRef } from "react";

type UseTicketMessagesRealtimeOptions = {
  ticketId: string;
  enabled?: boolean;
  intervalMs?: number;
  onRefresh: () => void;
};

export function useTicketMessagesRealtime({
  ticketId,
  enabled = true,
  intervalMs = 2000,
  onRefresh,
}: UseTicketMessagesRealtimeOptions) {
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled || !ticketId) return;

    const intervalId = setInterval(() => {
      onRefreshRef.current();
    }, intervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, intervalMs, ticketId]);
}
