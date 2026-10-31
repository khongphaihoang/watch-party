"use client";

import { useEffect, useState } from "react";

/**
 * Đồng hồ phía client, trả `null` cho tới sau khi mount để render đầu tiên
 * (server + client) hoàn toàn giống nhau.
 */
export function useTicker(intervalMs = 1000): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
