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

export interface ApiRoomSnapshot {
  code: string;
  title: string;
  lifecycle: "waiting" | "live" | "ended";
  capacity: number;
  viewerId: string;
  nowPlaying: ApiNowPlaying | null;
  members: ApiMember[];
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
