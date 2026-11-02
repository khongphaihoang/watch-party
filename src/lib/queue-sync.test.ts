import { describe, expect, it } from "vitest";
import {
  applyOrder,
  isStaleQueue,
  moveOrder,
  queueOrder,
  sameQueue,
} from "./queue-sync";
import type { QueueItem } from "./room-types";

function item(id: string, position: number): QueueItem {
  return {
    id,
    videoId: `video${id}`,
    title: `Video ${id}`,
    channelTitle: "Kênh",
    durationSec: 60,
    addedBy: "Lan",
    addedById: "m1",
    isLive: false,
    createdAt: 1,
    position,
  };
}

const queue = [item("b", 1), item("a", 0), item("c", 2)];

describe("isStaleQueue", () => {
  it("version thấp hơn là cũ", () => {
    expect(isStaleQueue(3, 2)).toBe(true);
    expect(isStaleQueue(3, 3)).toBe(false);
    expect(isStaleQueue(3, 4)).toBe(false);
  });
});

describe("queueOrder", () => {
  it("trả id theo position tăng dần bất kể thứ tự mảng", () => {
    expect(queueOrder(queue)).toEqual(["a", "b", "c"]);
  });
});

describe("applyOrder", () => {
  it("áp thứ tự mới và đánh lại position", () => {
    const next = applyOrder(queue, ["c", "a", "b"]);
    expect(next.map((entry) => entry.id)).toEqual(["c", "a", "b"]);
    expect(next.map((entry) => entry.position)).toEqual([0, 1, 2]);
  });

  it("không áp khi độ dài lệch", () => {
    expect(applyOrder(queue, ["a"])).toBe(queue);
  });

  it("không áp khi có id lạ", () => {
    expect(applyOrder(queue, ["a", "b", "z"])).toBe(queue);
  });
});

describe("moveOrder", () => {
  it("dịch lên/xuống", () => {
    expect(moveOrder(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveOrder(["a", "b", "c"], "b", 1)).toEqual(["a", "c", "b"]);
  });

  it("trả null ở biên hoặc id không tồn tại", () => {
    expect(moveOrder(["a", "b"], "a", -1)).toBeNull();
    expect(moveOrder(["a", "b"], "b", 1)).toBeNull();
    expect(moveOrder(["a", "b"], "z", 1)).toBeNull();
  });
});

describe("sameQueue", () => {
  it("so sánh id và position", () => {
    expect(sameQueue(queue, [item("b", 1), item("a", 0), item("c", 2)])).toBe(true);
    expect(sameQueue(queue, [item("a", 0), item("b", 1), item("c", 2)])).toBe(false);
    expect(sameQueue(queue, queue.slice(0, 2))).toBe(false);
  });
});
