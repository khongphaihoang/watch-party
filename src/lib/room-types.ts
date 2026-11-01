export type SeatStatus = "empty" | "occupied" | "mine" | "held";

export type PlaybackState =
  | "idle"
  | "playing"
  | "paused"
  | "buffering"
  | "ended"
  | "error";

export type PlaybackErrorCode = "embed-disabled" | "removed" | "unavailable";

export interface Seat {
  id: string;
  row: number;
  index: number;
  span: 1 | 2;
  status: SeatStatus;
  memberId?: string;
}

export interface Member {
  id: string;
  displayName: string;
  shirtColor: string;
  bodyStyle: "male" | "female";
  isHost: boolean;
  isBot: boolean;
  seatId?: string;
  frameTier: 0 | 1 | 2;
  /** `false` khi người xem đã tắt mic; mặc định coi như đang mở. */
  micOn?: boolean;
}

export interface NowPlaying {
  videoId: string;
  videoType: "video" | "live";
  title: string;
  channelTitle: string;
  description: string;
  durationSec: number;
  isLive: boolean;
  state: PlaybackState;
  /** Epoch ms phía server của lần phát gần nhất. */
  startedAt: number;
  /** Vị trí video tại thời điểm `startedAt`, tính bằng giây. */
  offsetSec: number;
  rate: number;
  /** Tăng đơn điệu mỗi lệnh điều khiển; dùng để bỏ qua event cũ. */
  version: number;
  /** Epoch ms server của lần điều khiển gần nhất. */
  updatedAt: number;
  /** Id thành viên điều khiển gần nhất; null khi chưa có/chủ cũ đã rời. */
  controlledBy: string | null;
  errorCode?: PlaybackErrorCode;
}

export interface ChatMessage {
  id: string;
  memberId: string;
  displayName: string;
  kind: "text" | "emoji" | "system";
  body: string;
  createdAt: number;
}

export interface QueueItem {
  id: string;
  videoId: string;
  title: string;
  channelTitle: string;
  durationSec: number;
  addedBy: string;
  isLive: boolean;
}

export interface SkipVote {
  videoId: string;
  yes: number;
  total: number;
  voted: boolean;
}

export type RoomLifecycle = "waiting" | "live" | "ended";

/** Bề mặt giao diện đang hiển thị — độc lập với dữ liệu phòng. */
export type UiStatus =
  | "loading"
  | "ready"
  | "reconnecting"
  | "full"
  | "ended"
  /** Mã phòng không tồn tại (404 từ server). */
  | "missing"
  /** Đã bị host mời ra khỏi phòng. */
  | "removed"
  /** Chưa đăng nhập / chưa có tài khoản nên chưa được vào rạp. */
  | "login";

export type PanelId =
  | "chat"
  | "queue"
  | "send-video"
  | "photos"
  | "seats"
  | "wardrobe"
  | "boost"
  | "game"
  | "members"
  | "info"
  | "settings"
  | null;

export type Viewpoint = "overview" | "seat" | "screen" | "audience";

export type RoomMode = "seated" | "flat";

export interface RoomState {
  code: string;
  title: string;
  lifecycle: RoomLifecycle;
  capacity: number;
  viewerId: string;
  nowPlaying: NowPlaying | null;
  seats: Seat[];
  members: Member[];
  queue: QueueItem[];
  messages: ChatMessage[];
  skipVote: SkipVote | null;
  ui: UiStatus;
  serverOffsetMs: number;
  walletPoints: number;
}
