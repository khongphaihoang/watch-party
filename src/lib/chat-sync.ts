import type { ChatMessage } from "./room-types";

/** Tin nhắn do client tự sinh trước khi server xác nhận có id bắt đầu bằng tiền tố này. */
export const LOCAL_PREFIX = "local:";

export function isLocalMessage(message: ChatMessage): boolean {
  return message.id.startsWith(LOCAL_PREFIX);
}

function orderKey(message: ChatMessage): string {
  return `${message.createdAt.toString().padStart(16, "0")}|${message.id}`;
}

/** Sắp theo thời gian rồi theo id — thứ tự ổn định giữa lịch sử và tin mới. */
export function sortMessages(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => orderKey(a).localeCompare(orderKey(b)));
}

/**
 * Gộp tin nhắn mới vào danh sách: bỏ trùng theo `id`, thay bản `local:` cùng
 * `clientMessageId` bằng bản của server (nếu có), rồi sắp lại ổn định.
 */
export function mergeMessages(
  current: ChatMessage[],
  incoming: ChatMessage[],
): ChatMessage[] {
  if (incoming.length === 0) return current;
  const byId = new Map<string, ChatMessage>();
  for (const message of current) byId.set(message.id, message);

  for (const message of incoming) {
    byId.set(message.id, message);
    if (message.clientMessageId) {
      for (const [id, existing] of byId) {
        if (
          id !== message.id &&
          existing.clientMessageId === message.clientMessageId &&
          isLocalMessage(existing)
        ) {
          byId.delete(id);
        }
      }
    }
  }
  return sortMessages([...byId.values()]);
}

/** Tin cũ hơn (trang trước) được chèn vào đầu, không nhân đôi tin đã có. */
export function prependHistory(
  current: ChatMessage[],
  older: ChatMessage[],
): ChatMessage[] {
  return mergeMessages(current, older);
}
