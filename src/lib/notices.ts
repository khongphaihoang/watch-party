import type { MessageKey } from "./i18n";

/**
 * `room:notice` mang `type` + `data`, **không** mang chuỗi hiển thị: bảng i18n phía
 * client quyết định câu chữ (vi/en). Nhờ vậy đổi ngôn ngữ không cần server biết.
 */
export interface RoomNotice {
  id: string;
  code: string;
  type: string;
  at: number;
  actorMemberId: string | null;
  data: Record<string, unknown>;
}

export type NoticeTone = "info" | "ok" | "warn" | "danger";

export interface NoticeDescriptor {
  key: MessageKey;
  params: Record<string, string | number>;
  tone: NoticeTone;
  /** Bỏ qua notice do chính mình gây ra (đã có toast từ response REST). */
  skipForActor?: boolean;
}

export const NOTICE_SEEN_LIMIT = 100;

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function describeNotice(notice: RoomNotice): NoticeDescriptor | null {
  switch (notice.type) {
    case "member.joined":
      return {
        key: "notice.memberJoined",
        params: { name: text(notice.data.displayName) },
        tone: "info",
      };
    case "member.left": {
      const reason = text(notice.data.reason, "left");
      if (reason === "kicked") {
        return {
          key: "notice.memberKicked",
          params: { name: text(notice.data.displayName) },
          tone: "warn",
        };
      }
      if (reason === "idle") {
        return {
          key: "notice.memberIdle",
          params: { name: text(notice.data.displayName) },
          tone: "info",
        };
      }
      return {
        key: "notice.memberLeft",
        params: { name: text(notice.data.displayName) },
        tone: "info",
      };
    }
    case "member.role": {
      const role = text(notice.data.role, "viewer");
      return {
        key: role === "cohost" ? "notice.roleCohost" : "notice.roleViewer",
        params: { name: text(notice.data.displayName) },
        tone: "info",
        skipForActor: true,
      };
    }
    case "queue.added":
      return {
        key: "notice.queueAdded",
        params: {
          name: text(notice.data.addedByName),
          title: text(notice.data.title),
        },
        tone: "ok",
        skipForActor: true,
      };
    case "queue.removed":
      return {
        key: "notice.queueRemoved",
        params: {
          name: text(notice.data.removedByName),
          title: text(notice.data.title),
        },
        tone: "info",
        skipForActor: true,
      };
    case "queue.reordered":
      return {
        key: "notice.queueReordered",
        params: { name: text(notice.data.byName) },
        tone: "info",
        skipForActor: true,
      };
    case "queue.advanced":
      return {
        key: "notice.queueAdvanced",
        params: {
          name: text(notice.data.byName),
          title: text(notice.data.title),
        },
        tone: "ok",
        skipForActor: true,
      };
    case "skip.passed":
      return {
        key: "notice.skipPassed",
        params: { yes: count(notice.data.yes), total: count(notice.data.total) },
        tone: "warn",
      };
    case "skip.reset":
      return { key: "notice.skipReset", params: {}, tone: "info" };
    case "playback.control":
      return {
        key: "notice.controlChanged",
        params: { name: text(notice.data.displayName) },
        tone: "info",
      };
    case "room.closed":
      return { key: "notice.roomClosed", params: {}, tone: "warn" };
    default:
      return null;
  }
}

/** Notice trùng `id` bị bỏ; notice của chính mình (khi đã có toast từ REST) cũng bỏ. */
export function shouldShowNotice(
  notice: RoomNotice,
  viewerId: string,
  seen: ReadonlySet<string>,
): boolean {
  if (!notice.id || seen.has(notice.id)) return false;
  const descriptor = describeNotice(notice);
  if (!descriptor) return false;
  if (notice.type === "member.joined" && notice.data.memberId === viewerId) {
    return false;
  }
  if (descriptor.skipForActor && notice.actorMemberId === viewerId) return false;
  return true;
}

/** Nhớ id vừa hiện, giữ tối đa `limit` id gần nhất (chống lặp khi reconnect). */
export function rememberNoticeId(
  seen: ReadonlySet<string>,
  id: string,
  limit = NOTICE_SEEN_LIMIT,
): Set<string> {
  const next = new Set(seen);
  next.add(id);
  if (next.size <= limit) return next;
  const overflow = next.size - limit;
  let removed = 0;
  for (const value of next) {
    next.delete(value);
    removed += 1;
    if (removed >= overflow) break;
  }
  return next;
}
