import type { QueueItem } from "./room-types";

/** Snapshot/sự kiện đến trễ (version thấp hơn) không được ghi đè hàng chờ hiện tại. */
export function isStaleQueue(localVersion: number, incomingVersion: number): boolean {
  return incomingVersion < localVersion;
}

/** Danh sách id theo đúng thứ tự cần gửi lên server. */
export function queueOrder(items: QueueItem[]): string[] {
  return [...items]
    .sort((a, b) => a.position - b.position)
    .map((item) => item.id);
}

/**
 * Áp một thứ tự mới lên danh sách cục bộ (dùng cho optimistic UI).
 * Trả nguyên danh sách nếu `order` không phải hoán vị của danh sách hiện tại.
 */
export function applyOrder(items: QueueItem[], order: string[]): QueueItem[] {
  if (order.length !== items.length) return items;
  const byId = new Map(items.map((item) => [item.id, item]));
  if (order.some((id) => !byId.has(id))) return items;
  return order.map((id, index) => ({ ...byId.get(id)!, position: index }));
}

/** Dịch một mục lên/xuống trong danh sách; trả `null` khi đã ở biên. */
export function moveOrder(order: string[], id: string, direction: -1 | 1): string[] | null {
  const index = order.indexOf(id);
  if (index < 0) return null;
  const target = index + direction;
  if (target < 0 || target >= order.length) return null;
  const next = [...order];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function sameQueue(a: QueueItem[], b: QueueItem[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const other = b[index];
    return (
      item.id === other.id &&
      item.videoId === other.videoId &&
      item.position === other.position
    );
  });
}
