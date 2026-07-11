"use client";

import { useCallback, useRef, useState } from "react";

const POLL_INTERVAL_MS = 1500;

interface DrainResult {
  processed: number;
  remainingQueued: number;
}

export function useDrainEmailQueue() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const draining = useRef(false);

  const startDraining = useCallback(async () => {
    if (draining.current) return;
    draining.current = true;

    try {
      let remainingQueued = Infinity;
      while (remainingQueued > 0) {
        const response = await fetch("/api/emails/drain", { method: "POST" });
        const result: DrainResult = await response.json();
        remainingQueued = result.remainingQueued;
        setRemaining(remainingQueued);
        if (remainingQueued > 0) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }
      }
    } finally {
      draining.current = false;
    }
  }, []);

  return { remaining, startDraining };
}
