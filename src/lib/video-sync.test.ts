import { describe, expect, it } from "vitest";
import type { NowPlaying } from "./room-types";
import {
  DRIFT_TOLERANCE_SEC,
  pickNewerNowPlaying,
  planSync,
  positionAt,
  syncActionFor,
} from "./video-sync";

function nowPlaying(overrides: Partial<NowPlaying> = {}): NowPlaying {
  return {
    videoId: "M7lc1UVf-VE",
    videoType: "video",
    title: "Demo",
    channelTitle: "Channel",
    description: "",
    durationSec: 0,
    isLive: false,
    state: "playing",
    startedAt: 1_000_000,
    offsetSec: 0,
    rate: 1,
    version: 1,
    updatedAt: 1_000_000,
    controlledBy: null,
    ...overrides,
  };
}

describe("positionAt", () => {
  it("không clamp vị trí về 0 khi chưa biết duration", () => {
    const state = nowPlaying({ durationSec: 0, startedAt: 10_000, offsetSec: 0 });
    expect(positionAt(state, 15_000)).toBe(5);
  });

  it("clamp theo duration khi duration đã biết", () => {
    const state = nowPlaying({ durationSec: 8, startedAt: 10_000 });
    expect(positionAt(state, 60_000)).toBe(8);
  });

  it("trả vị trí đã lưu khi đang tạm dừng", () => {
    const state = nowPlaying({ state: "paused", startedAt: 10_000, offsetSec: 42.5 });
    expect(positionAt(state, 999_999)).toBe(42.5);
  });

  it("trả 0 cho livestream", () => {
    const state = nowPlaying({ isLive: true, videoType: "live", startedAt: 10_000 });
    expect(positionAt(state, 999_999)).toBe(0);
  });

  it("bỏ qua thời gian âm do đồng hồ lệch", () => {
    const state = nowPlaying({ startedAt: 20_000, offsetSec: 3 });
    expect(positionAt(state, 10_000)).toBe(3);
  });
});

describe("syncActionFor", () => {
  it("không chỉnh khi lệch nhỏ", () => {
    expect(syncActionFor(0)).toBe("none");
    expect(syncActionFor(DRIFT_TOLERANCE_SEC - 0.01)).toBe("none");
    expect(syncActionFor(-0.1)).toBe("none");
  });

  it("phân bậc theo độ lệch", () => {
    expect(syncActionFor(0.8)).toBe("soft-seek");
    expect(syncActionFor(-2.5)).toBe("hard-seek");
    expect(syncActionFor(9)).toBe("resync");
  });
});

describe("planSync", () => {
  const base = {
    nowPlaying: nowPlaying({ startedAt: 100_000 }),
    serverNow: 110_000,
    suppressedUntil: 0,
    nowMs: 5_000,
  };

  it("không làm gì khi đang buffering", () => {
    const plan = planSync({ ...base, playerPosition: 0, playerPhase: "buffering" });
    expect(plan).toEqual({ action: "none", targetSec: 10 });
  });

  it("không làm gì với livestream", () => {
    const plan = planSync({
      ...base,
      nowPlaying: nowPlaying({ isLive: true, videoType: "live" }),
      playerPosition: 0,
      playerPhase: "playing",
    });
    expect(plan.action).toBe("none");
  });

  it("không làm gì khi đang trong thời gian chống nhiễu", () => {
    const plan = planSync({
      ...base,
      playerPosition: 0,
      playerPhase: "playing",
      suppressedUntil: 6_000,
    });
    expect(plan.action).toBe("none");
  });

  it("bỏ qua khi player đã đúng vị trí", () => {
    const plan = planSync({ ...base, playerPosition: 10.1, playerPhase: "playing" });
    expect(plan.action).toBe("none");
  });

  it("seek khi lệch vừa", () => {
    const plan = planSync({ ...base, playerPosition: 9, playerPhase: "playing" });
    expect(plan.action).toBe("soft-seek");
    expect(plan.targetSec).toBe(10);
  });

  it("resync khi lệch quá lớn", () => {
    const plan = planSync({ ...base, playerPosition: 0, playerPhase: "playing" });
    expect(plan.action).toBe("resync");
  });

  it("không áp trạng thái khi video đang tạm dừng", () => {
    const plan = planSync({
      ...base,
      nowPlaying: nowPlaying({ state: "paused", startedAt: 100_000, offsetSec: 4 }),
      playerPosition: 0,
      playerPhase: "paused",
    });
    expect(plan.action).toBe("none");
    expect(plan.targetSec).toBe(4);
  });

  it("bỏ qua khi chưa có video", () => {
    expect(planSync({ ...base, nowPlaying: null, playerPosition: 0, playerPhase: "idle" })).toEqual(
      { action: "none", targetSec: 0 },
    );
  });
});

describe("pickNewerNowPlaying", () => {
  it("nhận bản mới khi chưa có gì", () => {
    const incoming = nowPlaying({ version: 3 });
    expect(pickNewerNowPlaying(null, incoming)).toBe(incoming);
  });

  it("bỏ qua sự kiện cũ", () => {
    const current = nowPlaying({ version: 5 });
    expect(pickNewerNowPlaying(current, nowPlaying({ version: 4 }))).toBe(current);
  });

  it("áp bản mới hơn", () => {
    const incoming = nowPlaying({ version: 6, state: "paused" });
    expect(pickNewerNowPlaying(nowPlaying({ version: 5 }), incoming)).toBe(incoming);
  });

  it("giữ nguyên khi server không gửi trạng thái", () => {
    const current = nowPlaying({ version: 5 });
    expect(pickNewerNowPlaying(current, null)).toBe(current);
  });
});
