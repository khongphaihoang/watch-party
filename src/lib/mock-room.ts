import type {
  ChatMessage,
  Member,
  NowPlaying,
  QueueItem,
  RoomState,
} from "./room-types";
import { GRID, seatId } from "./theater-layout";

export const VIEWER_ID = "viewer-self";
export const HOST_ID = "m-host";

/** Video demo công khai, dùng đúng id mẫu trong tài liệu YouTube IFrame API. */
export const DEMO_VIDEO_ID = "M7lc1UVf-VE";

const SHIRTS = [
  "#8E9BD8",
  "#E0A48C",
  "#9CC7A6",
  "#C6A6D9",
  "#D9BE86",
  "#8FC3CE",
  "#D8A0B4",
  "#A7B886",
];

interface Seed {
  name: string;
  row: number;
  col: number;
  shirt: number;
  body: "male" | "female";
  host?: boolean;
  tier?: 0 | 1 | 2;
  micOff?: boolean;
}

/**
 * Chỗ ngồi mẫu. Cố ý để các cụm ghế trống xen kẽ để thấy rõ ba trạng thái ghế
 * (của tôi, có người, còn trống) trong cùng một khung hình.
 */
const SEED_MEMBERS: Seed[] = [
  { name: "Minh Anh", row: 0, col: 6, shirt: 0, body: "female" },
  { name: "Quốc Bảo", row: 0, col: 7, shirt: 2, body: "male" },
  { name: "Lan Chi", row: 0, col: 9, shirt: 6, body: "female", micOff: true },
  { name: "Hoàng Duy", row: 1, col: 4, shirt: 1, body: "male" },
  { name: "Thảo Hân", row: 1, col: 5, shirt: 3, body: "female", tier: 1 },
  { name: "Chị Bảy", row: 1, col: 10, shirt: 4, body: "female", micOff: true },
  { name: "Tiến Đạt", row: 2, col: 3, shirt: 5, body: "male" },
  { name: "Mai Linh", row: 2, col: 6, shirt: 7, body: "female" },
  { name: "Bảo Ngọc", row: 2, col: 7, shirt: 0, body: "female" },
  { name: "Kim Ngân", row: 2, col: 11, shirt: 6, body: "female", tier: 2, micOff: true },
  { name: "Hà My", row: 3, col: 5, shirt: 3, body: "female" },
  { name: "Nhật Nam", row: 3, col: 9, shirt: 1, body: "male" },
  { name: "Cô Tám", row: 3, col: 10, shirt: 4, body: "female" },
  { name: "Thu Trang", row: 4, col: 4, shirt: 7, body: "female" },
  { name: "Anh Tuấn", row: 4, col: 6, shirt: 5, body: "male" },
  { name: "Chủ Rạp", row: 3, col: 7, shirt: 0, body: "male", host: true, tier: 2 },
  { name: "Bích Phương", row: 1, col: 8, shirt: 3, body: "female" },
];

/** Ghế của người dùng hiện tại. */
const VIEWER_SEAT = { row: 4, col: 8 };

const QUEUE_SEED: QueueItem[] = [
  {
    id: "q1",
    videoId: DEMO_VIDEO_ID,
    title: "Đêm phim cuối tuần — tập mở màn",
    channelTitle: "Rạp Nhà Studio",
    durationSec: 1548,
    addedBy: "Chủ Rạp",
    isLive: false,
  },
  {
    id: "q2",
    videoId: "aqz-KE-bpKQ",
    title: "Cuộc phiêu lưu của chú chim giấy",
    channelTitle: "Giấy & Gió",
    durationSec: 734,
    addedBy: "Minh Anh",
    isLive: false,
  },
  {
    id: "q3",
    videoId: "ScMzIvxBSi4",
    title: "Phố đêm Sài Gòn, quay bằng tay",
    channelTitle: "Chuyện Phố",
    durationSec: 421,
    addedBy: "Quốc Bảo",
    isLive: false,
  },
];

const MESSAGE_SEED: Array<{ name: string; body: string; minsAgo: number }> = [
  { name: "Chủ Rạp", body: "Cả nhà chọn ghế đi, rạp mở rồi nhé!", minsAgo: 12 },
  { name: "Minh Anh", body: "Mình ngồi hàng giữa cho dễ nhìn.", minsAgo: 11 },
  { name: "Quốc Bảo", body: "Ai còn ghế cạnh màn chiếu không?", minsAgo: 9 },
  { name: "Thảo Hân", body: "Chờ mình 2 phút là tới 😄", minsAgo: 7 },
  { name: "Chị Bảy", body: "Có bắp rang không hay chỉ phim thôi?", minsAgo: 6 },
  { name: "Hà My", body: "Bấm vô ghế trống là ngồi được á.", minsAgo: 4 },
  { name: "Nhật Nam", body: "Đêm nay xem phim gì vậy rạp?", minsAgo: 2 },
  { name: "Chủ Rạp", body: "Phim mở màn sắp chiếu, có trong hàng chờ rồi.", minsAgo: 1 },
];

export function createMockRoom(code: string, now = Date.now()): RoomState {
  const members: Member[] = SEED_MEMBERS.map((seed, index) => ({
    id: seed.host ? HOST_ID : `m-${index}`,
    displayName: seed.name,
    shirtColor: SHIRTS[seed.shirt % SHIRTS.length],
    bodyStyle: seed.body,
    isHost: Boolean(seed.host),
    isBot: false,
    seatId: seatId(seed.row, seed.col),
    frameTier: seed.tier ?? 0,
    micOn: !seed.micOff,
  }));

  members.push({
    id: VIEWER_ID,
    displayName: "Bạn",
    shirtColor: "#D6E87F",
    bodyStyle: "male",
    isHost: false,
    isBot: false,
    seatId: seatId(VIEWER_SEAT.row, VIEWER_SEAT.col),
    frameTier: 1,
    micOn: false,
  });

  const nowPlaying: NowPlaying = {
    videoId: QUEUE_SEED[0].videoId,
    title: QUEUE_SEED[0].title,
    channelTitle: QUEUE_SEED[0].channelTitle,
    description:
      "Một suất chiếu mở màn cho cả hội. Ghế đôi còn trống ở hai hàng giữa — vào chỗ trước khi đèn tắt.",
    durationSec: QUEUE_SEED[0].durationSec,
    isLive: false,
    state: "playing",
    startedAt: now,
    offsetSec: 74,
    rate: 1,
  };

  const messages: ChatMessage[] = MESSAGE_SEED.map((seed, index) => {
    const author = members.find((m) => m.displayName === seed.name);
    return {
      id: `msg-${index}`,
      memberId: author?.id ?? HOST_ID,
      displayName: seed.name,
      kind: "text",
      body: seed.body,
      createdAt: now - seed.minsAgo * 60_000,
    };
  });

  return {
    code,
    title: "Đêm phim của hội mình",
    lifecycle: "live",
    capacity: (GRID.rows - 1) * GRID.cols,
    viewerId: VIEWER_ID,
    nowPlaying,
    seats: [],
    members,
    queue: QUEUE_SEED.slice(1),
    messages,
    skipVote: {
      videoId: nowPlaying.videoId,
      yes: 6,
      total: members.length,
      voted: false,
    },
    ui: "ready",
    serverOffsetMs: 0,
    walletPoints: 250,
  };
}

export const VIEWER_SEAT_CELL = VIEWER_SEAT;
