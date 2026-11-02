import { describe, expect, it } from "vitest";
import {
  LOCAL_PREFIX,
  isLocalMessage,
  mergeMessages,
  prependHistory,
  sortMessages,
} from "./chat-sync";
import type { ChatMessage } from "./room-types";

function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "m1",
    memberId: "u1",
    displayName: "Lan",
    kind: "text",
    body: "xin chào",
    createdAt: 1000,
    status: "sent",
    ...overrides,
  };
}

describe("isLocalMessage", () => {
  it("nhận diện tin chưa được server xác nhận", () => {
    expect(isLocalMessage(message({ id: `${LOCAL_PREFIX}c-1` }))).toBe(true);
    expect(isLocalMessage(message({ id: "abc" }))).toBe(false);
  });
});

describe("mergeMessages", () => {
  it("bỏ tin trùng id", () => {
    const current = [message({ id: "a", createdAt: 1 })];
    const merged = mergeMessages(current, [message({ id: "a", createdAt: 1 })]);
    expect(merged).toHaveLength(1);
  });

  it("thay tin local bằng bản của server theo clientMessageId", () => {
    const local = message({
      id: `${LOCAL_PREFIX}c-9`,
      clientMessageId: "c-9",
      createdAt: 1000,
      status: "sending",
    });
    const saved = message({ id: "server-1", clientMessageId: "c-9", createdAt: 1005 });

    const merged = mergeMessages([local], [saved]);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("server-1");
    expect(merged[0].status).toBe("sent");
  });

  it("giữ thứ tự theo thời gian rồi id", () => {
    const merged = mergeMessages(
      [message({ id: "b", createdAt: 2000 })],
      [message({ id: "a", createdAt: 1000 }), message({ id: "c", createdAt: 3000 })],
    );
    expect(merged.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
  });

  it("không đổi mảng khi không có tin mới", () => {
    const current = [message()];
    expect(mergeMessages(current, [])).toBe(current);
  });
});

describe("prependHistory", () => {
  it("chèn trang cũ hơn vào đầu mà không nhân đôi", () => {
    const current = [
      message({ id: "n3", createdAt: 3000 }),
      message({ id: "n4", createdAt: 4000 }),
    ];
    const older = [
      message({ id: "n1", createdAt: 1000 }),
      message({ id: "n2", createdAt: 2000 }),
      message({ id: "n3", createdAt: 3000 }),
    ];
    const merged = prependHistory(current, older);
    expect(merged.map((entry) => entry.id)).toEqual(["n1", "n2", "n3", "n4"]);
  });
});

describe("sortMessages", () => {
  it("không sửa mảng gốc", () => {
    const input = [message({ id: "b", createdAt: 2 }), message({ id: "a", createdAt: 1 })];
    const sorted = sortMessages(input);
    expect(sorted.map((entry) => entry.id)).toEqual(["a", "b"]);
    expect(input.map((entry) => entry.id)).toEqual(["b", "a"]);
  });
});
