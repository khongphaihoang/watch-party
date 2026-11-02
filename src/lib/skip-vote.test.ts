import { describe, expect, it } from "vitest";
import {
  hasPassed,
  mergeSkipVote,
  thresholdFor,
  voteBelongsTo,
} from "./skip-vote";
import type { SkipVote } from "./room-types";

function vote(overrides: Partial<SkipVote> = {}): SkipVote {
  return {
    videoId: "M7lc1UVf-VE",
    yes: 1,
    total: 3,
    threshold: 2,
    passed: false,
    version: 4,
    voted: false,
    ...overrides,
  };
}

describe("thresholdFor", () => {
  it("là quá bán thành viên đủ điều kiện", () => {
    expect(thresholdFor(2)).toBe(2);
    expect(thresholdFor(3)).toBe(2);
    expect(thresholdFor(4)).toBe(3);
    expect(thresholdFor(5)).toBe(3);
    expect(thresholdFor(80)).toBe(41);
  });

  it("phòng dưới 2 người không bao giờ đạt ngưỡng", () => {
    expect(thresholdFor(0)).toBe(0);
    expect(thresholdFor(1)).toBe(0);
    expect(hasPassed({ yes: 1, total: 1 })).toBe(false);
  });
});

describe("hasPassed", () => {
  it("so sánh số phiếu với ngưỡng", () => {
    expect(hasPassed({ yes: 1, total: 3 })).toBe(false);
    expect(hasPassed({ yes: 2, total: 3 })).toBe(true);
    expect(hasPassed({ yes: 3, total: 4 })).toBe(true);
  });
});

describe("mergeSkipVote", () => {
  it("nhận cờ voted khi là response của chính mình", () => {
    const merged = mergeSkipVote(null, vote({ voted: true }), { adoptVoted: true });
    expect(merged?.voted).toBe(true);
  });

  it("bỏ cờ voted khi đến từ broadcast của người khác", () => {
    const merged = mergeSkipVote(null, vote({ voted: true }), { adoptVoted: false });
    expect(merged?.voted).toBe(false);
  });

  it("giữ cờ voted cục bộ khi broadcast cùng lượt", () => {
    const previous = vote({ voted: true });
    const merged = mergeSkipVote(previous, vote({ voted: false, yes: 2, version: 5 }), {
      adoptVoted: false,
    });
    expect(merged?.voted).toBe(true);
    expect(merged?.yes).toBe(2);
    expect(merged?.version).toBe(5);
  });

  it("video đổi thì bắt đầu lượt mới", () => {
    const previous = vote({ voted: true });
    const merged = mergeSkipVote(
      previous,
      vote({ videoId: "dQw4w9WgXcQ", yes: 0, version: 9, voted: false }),
      { adoptVoted: false },
    );
    expect(merged?.videoId).toBe("dQw4w9WgXcQ");
    expect(merged?.voted).toBe(false);
  });

  it("bỏ qua bản cũ hơn theo version", () => {
    const previous = vote({ yes: 2, version: 7 });
    const merged = mergeSkipVote(previous, vote({ yes: 1, version: 6 }), {
      adoptVoted: false,
    });
    expect(merged).toBe(previous);
  });

  it("không có phiếu thì trả null", () => {
    expect(mergeSkipVote(vote(), null, { adoptVoted: true })).toBeNull();
  });
});

describe("voteBelongsTo", () => {
  it("chỉ đúng video đang chiếu", () => {
    expect(voteBelongsTo(vote(), "M7lc1UVf-VE")).toBe(true);
    expect(voteBelongsTo(vote(), "dQw4w9WgXcQ")).toBe(false);
    expect(voteBelongsTo(null, "M7lc1UVf-VE")).toBe(false);
    expect(voteBelongsTo(vote(), undefined)).toBe(false);
  });
});
