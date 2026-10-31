import type { NowPlaying } from "./room-types";

/**
 * Vị trí phát hiện tại suy ra từ trạng thái server. Không cần server tick liên tục.
 */
export function positionAt(nowPlaying: NowPlaying, serverNow: number): number {
  if (nowPlaying.isLive) return 0;
  const base = nowPlaying.offsetSec;
  if (nowPlaying.state !== "playing") return base;
  const elapsed = ((serverNow - nowPlaying.startedAt) / 1000) * nowPlaying.rate;
  return Math.max(0, Math.min(nowPlaying.durationSec, base + elapsed));
}

export type SyncAction = "none" | "soft-seek" | "hard-seek" | "resync";

/** Bậc hiệu chỉnh theo độ lệch (giây). Xem docs/realtime-sync.md §4.2. */
export function syncActionFor(driftSeconds: number): SyncAction {
  const drift = Math.abs(driftSeconds);
  if (drift < 0.35) return "none";
  if (drift < 1.5) return "soft-seek";
  if (drift < 4) return "hard-seek";
  return "resync";
}

export const DRIFT_TOLERANCE_SEC = 0.35;
