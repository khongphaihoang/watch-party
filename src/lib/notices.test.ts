import { describe, expect, it } from "vitest";
import {
  NOTICE_SEEN_LIMIT,
  describeNotice,
  rememberNoticeId,
  shouldShowNotice,
  type RoomNotice,
} from "./notices";

function notice(overrides: Partial<RoomNotice> = {}): RoomNotice {
  return {
    id: "n1",
    code: "RAP01",
    type: "member.joined",
    at: 1000,
    actorMemberId: null,
    data: { memberId: "m2", displayName: "Lan" },
    ...overrides,
  };
}

describe("describeNotice", () => {
  it("map type sang key i18n và tham số", () => {
    const descriptor = describeNotice(notice());
    expect(descriptor?.key).toBe("notice.memberJoined");
    expect(descriptor?.params).toEqual({ name: "Lan" });
    expect(descriptor?.tone).toBe("info");
  });

  it("phân biệt kicked / idle / left", () => {
    expect(describeNotice(notice({ type: "member.left", data: { reason: "kicked", displayName: "Lan" } }))?.key)
      .toBe("notice.memberKicked");
    expect(describeNotice(notice({ type: "member.left", data: { reason: "idle", displayName: "Lan" } }))?.key)
      .toBe("notice.memberIdle");
    expect(describeNotice(notice({ type: "member.left", data: { displayName: "Lan" } }))?.key)
      .toBe("notice.memberLeft");
  });

  it("queue/skip/room có tone phù hợp", () => {
    expect(describeNotice(notice({ type: "queue.added", data: { addedByName: "A", title: "T" } }))?.tone)
      .toBe("ok");
    expect(describeNotice(notice({ type: "skip.passed", data: { yes: 2, total: 3 } }))?.tone)
      .toBe("warn");
    expect(describeNotice(notice({ type: "room.closed", data: {} }))?.key).toBe(
      "notice.roomClosed",
    );
  });

  it("type lạ bị bỏ", () => {
    expect(describeNotice(notice({ type: "khong.biet" }))).toBeNull();
  });
});

describe("shouldShowNotice", () => {
  it("bỏ notice đã hiện", () => {
    expect(shouldShowNotice(notice(), "m1", new Set(["n1"]))).toBe(false);
  });

  it("bỏ thông báo chính mình vào phòng", () => {
    expect(shouldShowNotice(notice(), "m2", new Set())).toBe(false);
  });

  it("bỏ notice do chính mình gây ra khi đã có toast từ REST", () => {
    const added = notice({
      id: "n2",
      type: "queue.added",
      actorMemberId: "m1",
      data: { addedByName: "Tôi", title: "T" },
    });
    expect(shouldShowNotice(added, "m1", new Set())).toBe(false);
    expect(shouldShowNotice(added, "m3", new Set())).toBe(true);
  });

  it("vẫn hiện skip.passed cho người vừa bỏ phiếu cuối", () => {
    const passed = notice({
      id: "n3",
      type: "skip.passed",
      actorMemberId: "m1",
      data: { yes: 2, total: 2 },
    });
    expect(shouldShowNotice(passed, "m1", new Set())).toBe(true);
  });
});

describe("rememberNoticeId", () => {
  it("giữ tối đa số id giới hạn và bỏ id cũ nhất", () => {
    let seen: ReadonlySet<string> = new Set();
    for (let index = 0; index < NOTICE_SEEN_LIMIT + 5; index += 1) {
      seen = rememberNoticeId(seen, `id-${index}`);
    }
    expect(seen.size).toBe(NOTICE_SEEN_LIMIT);
    expect(seen.has("id-0")).toBe(false);
    expect(seen.has(`id-${NOTICE_SEEN_LIMIT + 4}`)).toBe(true);
  });

  it("không sửa tập gốc", () => {
    const original = new Set(["a"]);
    const next = rememberNoticeId(original, "b");
    expect(original.has("b")).toBe(false);
    expect(next.has("b")).toBe(true);
  });
});
