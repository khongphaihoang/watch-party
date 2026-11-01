import type { NowPlaying } from "./room-types";

/**
 * Vị trí phát hiện tại suy ra từ trạng thái server. Không cần server tick liên tục.
 *
 * `durationSec = 0` nghĩa là chưa biết độ dài (phòng tạo từ UI không gửi duration):
 * khi đó KHÔNG clamp về 0, nếu không mọi phòng sẽ luôn phát ở giây 0.
 */
export function positionAt(nowPlaying: NowPlaying, serverNow: number): number {
  if (nowPlaying.isLive || nowPlaying.videoType === "live") return 0;
  const base = Math.max(0, nowPlaying.offsetSec);
  if (nowPlaying.state !== "playing") {
    return clampToDuration(base, nowPlaying.durationSec);
  }
  const elapsed = ((serverNow - nowPlaying.startedAt) / 1000) * nowPlaying.rate;
  return clampToDuration(base + Math.max(0, elapsed), nowPlaying.durationSec);
}

function clampToDuration(position: number, durationSec: number): number {
  const base = Math.max(0, position);
  return durationSec > 0 ? Math.min(base, durationSec) : base;
}

export type SyncAction = "none" | "soft-seek" | "hard-seek" | "resync";

/** Bậc hiệu chỉnh theo độ lệch (giây). Xem docs/realtime-sync.md §4.2. */
export function syncActionFor(driftSeconds: number): SyncAction {
  const drift = Math.abs(driftSeconds);
  if (drift < DRIFT_TOLERANCE_SEC) return "none";
  if (drift < 1.5) return "soft-seek";
  if (drift < 4) return "hard-seek";
  return "resync";
}

export const DRIFT_TOLERANCE_SEC = 0.35;
export const DRIFT_CHECK_MS = 2000;
export const SYNC_SUPPRESS_MS = 3000;

export type PlayerPhase =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "buffering"
  | "ended"
  | "error";

export interface SyncPlanInput {
  nowPlaying: NowPlaying | null;
  serverNow: number;
  playerPosition: number;
  playerPhase: PlayerPhase;
  suppressedUntil: number;
  nowMs: number;
}

export interface SyncPlan {
  action: SyncAction;
  targetSec: number;
}

/**
 * Quyết định có cần hiệu chỉnh player hay không. Hàm thuần, không đọc DOM/store —
 * nhờ vậy unit test được toàn bộ các nhánh buffering/live/paused/suppress.
 */
export function planSync(input: SyncPlanInput): SyncPlan {
  const { nowPlaying } = input;
  if (!nowPlaying) return { action: "none", targetSec: 0 };

  const targetSec = positionAt(nowPlaying, input.serverNow);
  if (
    nowPlaying.state !== "playing" ||
    nowPlaying.isLive ||
    nowPlaying.videoType === "live" ||
    input.playerPhase === "idle" ||
    input.playerPhase === "loading" ||
    input.playerPhase === "buffering" ||
    input.playerPhase === "error" ||
    input.nowMs < input.suppressedUntil
  ) {
    return { action: "none", targetSec };
  }

  return {
    action: syncActionFor(input.playerPosition - targetSec),
    targetSec,
  };
}

/**
 * Chọn bản `nowPlaying` mới hơn theo version. Snapshot REST và event socket có thể
 * đến lệch thứ tự; bản cũ không được ghi đè bản mới.
 */
export function pickNewerNowPlaying(
  current: NowPlaying | null,
  incoming: NowPlaying | null,
): NowPlaying | null {
  if (!incoming) return current;
  if (!current) return incoming;
  return incoming.version > current.version ? incoming : current;
}
