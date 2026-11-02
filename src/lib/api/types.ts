/**
 * Hình dạng dữ liệu API trả về — khớp `RoomSnapshot` trong `room-types.ts`
 * và schema Pydantic của backend.
 */

export interface ApiUser {
  id: string;
  username?: string | null;
  displayName: string;
  shirtColor: string;
  bodyStyle: "male" | "female";
}

export interface ApiMember {
  id: string;
  displayName: string;
  shirtColor: string;
  bodyStyle: "male" | "female";
  isHost: boolean;
  isBot: boolean;
  seatId?: string;
  frameTier: 0 | 1 | 2;
  micOn?: boolean;
  role?: "host" | "cohost" | "viewer";
}

export interface ApiNowPlaying {
  videoId: string;
  videoType?: "video" | "live";
  title: string;
  channelTitle: string;
  description: string;
  durationSec: number;
  isLive: boolean;
  state: "idle" | "playing" | "paused" | "buffering" | "ended" | "error";
  startedAt: number;
  offsetSec: number;
  rate: number;
  version?: number;
  updatedAt?: number;
  controlledBy?: string | null;
  errorCode?: "embed-disabled" | "removed" | "unavailable";
}

export interface LoadVideoPayload {
  videoId: string;
  isLive?: boolean;
  title?: string;
  channelTitle?: string;
  description?: string;
  durationSec?: number;
}

export interface ApiQueueItem {
  id: string;
  videoId: string;
  title: string;
  channelTitle: string;
  durationSec: number;
  isLive: boolean;
  addedById: string;
  addedBy: string;
  createdAt: number;
  position: number;
}

export interface ApiSkipVote {
  videoId: string;
  yes: number;
  total: number;
  threshold: number;
  passed: boolean;
  version: number;
  voted: boolean;
}

export interface ApiChatMessage {
  id: string;
  memberId: string;
  displayName: string;
  kind: "text" | "emoji" | "system";
  body: string;
  clientMessageId?: string | null;
  createdAt: number;
}

export interface ApiMessagePage {
  messages: ApiChatMessage[];
  nextBefore?: string | null;
}

export interface ApiRoomSnapshot {
  code: string;
  title: string;
  lifecycle: "waiting" | "live" | "ended";
  capacity: number;
  viewerId: string;
  nowPlaying: ApiNowPlaying | null;
  members: ApiMember[];
  queue?: ApiQueueItem[];
  queueVersion?: number;
  skipVote?: ApiSkipVote | null;
  serverTime: number;
}

export interface CreateRoomPayload {
  title: string;
  videoId: string;
  capacity?: number;
  videoTitle?: string;
  channelTitle?: string;
  description?: string;
  durationSec?: number;
}
