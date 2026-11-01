/**
 * "Phòng gần đây" chỉ là cache giao diện để gợi ý lại mã phòng.
 * Nguồn sự thật của phòng luôn là API.
 */

export interface RecentRoom {
  code: string;
  title: string;
  videoTitle?: string;
  createdAt: number;
}

const KEY = "rap-chieu:recent-rooms";
const MAX_ITEMS = 4;

export function readRecentRooms(): RecentRoom[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is RecentRoom => {
        if (typeof item !== "object" || item === null) return false;
        const room = item as Partial<RecentRoom>;
        return typeof room.code === "string" && typeof room.title === "string";
      })
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function rememberRecentRoom(room: Omit<RecentRoom, "createdAt">): void {
  try {
    const next: RecentRoom[] = [
      { ...room, createdAt: Date.now() },
      ...readRecentRooms().filter((item) => item.code !== room.code),
    ].slice(0, MAX_ITEMS);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Chế độ riêng tư có thể chặn localStorage — chỉ là cache gợi ý.
  }
}
