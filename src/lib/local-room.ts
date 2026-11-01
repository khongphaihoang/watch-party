import type {
  ChatMessage,
  Member,
  NowPlaying,
  QueueItem,
  SkipVote,
} from "./room-types";

/**
 * Dữ liệu cục bộ còn lại của Phase 2: hàng chờ, chat và bình chọn bỏ qua.
 * Ba phần này thuộc Phase 3-4 nên chưa lấy từ server; trạng thái phòng
 * (thành viên, ghế, video đang chiếu) thì **luôn** lấy từ API.
 */

const QUEUE_SEED: QueueItem[] = [
  {
    id: "q1",
    videoId: "M7lc1UVf-VE",
    title: "Phim mở màn",
    channelTitle: "Rạp Nhà Studio",
    durationSec: 1548,
    addedBy: "Chủ Rạp",
    isLive: false,
  },
  {
    id: "q2",
    videoId: "aqz-KE-bpKQ",
    title: "Hoạt hình ngắn",
    channelTitle: "Giấy & Gió",
    durationSec: 734,
    addedBy: "Khách",
    isLive: false,
  },
];

const MESSAGE_SEED: Array<{ name: string; body: string; minsAgo: number }> = [
  { name: "Chủ Rạp", body: "Cả nhà chọn ghế đi, rạp mở rồi nhé!", minsAgo: 12 },
  { name: "Khách", body: "Mình ngồi hàng giữa cho dễ nhìn.", minsAgo: 9 },
  { name: "Chủ Rạp", body: "Phim mở màn sắp chiếu, có trong hàng chờ rồi.", minsAgo: 2 },
];

export interface LocalRoomData {
  queue: QueueItem[];
  messages: ChatMessage[];
  skipVote: SkipVote | null;
  walletPoints: number;
}

/** Chỉ dùng nội bộ store — không phải nguồn sự thật của phòng. */
export function createLocalRoomData(now = Date.now()): LocalRoomData {
  return {
    queue: QUEUE_SEED.map((item) => ({ ...item })),
    messages: MESSAGE_SEED.map((seed, index) => ({
      id: `msg-local-${index}`,
      memberId: "system",
      displayName: seed.name,
      kind: "text",
      body: seed.body,
      createdAt: now - seed.minsAgo * 60_000,
    })),
    skipVote: null,
    walletPoints: 250,
  };
}

export type { Member, NowPlaying };
