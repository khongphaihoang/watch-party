import { t } from "./i18n";
import type { RoomState } from "./room-types";

/** Cấu hình phòng do người dùng tạo ở popup khởi động. */
export interface RoomSetup {
  code: string;
  title: string;
  hostName: string;
  videoId: string;
  videoTitle: string;
  channelTitle: string;
  createdAt: number;
}

const KEY_PREFIX = "rap-chieu:room:";

/** Bỏ I, O, 0, 1 để mã phòng không bị đọc nhầm khi đọc qua điện thoại. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(length = 5): string {
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function saveRoomSetup(setup: RoomSetup): void {
  try {
    window.localStorage.setItem(KEY_PREFIX + setup.code, JSON.stringify(setup));
  } catch {
    // Chế độ riêng tư có thể chặn localStorage — phòng vẫn chạy với dữ liệu mẫu.
  }
}

export function loadRoomSetup(code: string): RoomSetup | null {
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + code);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const setup = parsed as Partial<RoomSetup>;
    if (typeof setup.title !== "string" || typeof setup.videoId !== "string") return null;
    return {
      code,
      title: setup.title,
      hostName: typeof setup.hostName === "string" ? setup.hostName : t("common.you"),
      videoId: setup.videoId,
      videoTitle:
        typeof setup.videoTitle === "string" ? setup.videoTitle : t("onboard.pastedTitle"),
      channelTitle:
        typeof setup.channelTitle === "string" ? setup.channelTitle : t("onboard.pastedChannel"),
      createdAt: typeof setup.createdAt === "number" ? setup.createdAt : Date.now(),
    };
  } catch {
    return null;
  }
}

/** Ghép cấu hình đã lưu vào phòng mẫu: đổi tên rạp, tên chủ rạp và video đang chiếu. */
export function applyRoomSetup(room: RoomState, setup: RoomSetup): RoomState {
  const hostName = setup.hostName.trim() || t("common.you");
  return {
    ...room,
    code: setup.code,
    title: setup.title,
    lifecycle: "live",
    members: room.members.map((member) =>
      member.id === room.viewerId ? { ...member, displayName: hostName } : member,
    ),
    nowPlaying: {
      videoId: setup.videoId,
      title: setup.videoTitle,
      channelTitle: setup.channelTitle,
      description: t("store.showOpenedByYou"),
      durationSec: 0,
      isLive: false,
      state: "playing",
      startedAt: Date.now(),
      offsetSec: 0,
      rate: 1,
    },
    skipVote: {
      videoId: setup.videoId,
      yes: 0,
      total: room.members.length,
      voted: false,
    },
  };
}
