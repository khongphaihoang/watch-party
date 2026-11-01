import { apiRequest } from "./client";
import type {
  ApiMember,
  ApiRoomSnapshot,
  ApiUser,
  CreateRoomPayload,
  LoadVideoPayload,
} from "./types";

export function registerAccount(payload: {
  username: string;
  password: string;
  displayName?: string;
}): Promise<ApiUser> {
  return apiRequest<ApiUser>("/api/auth/register", {
    method: "POST",
    body: payload,
    retry: false,
  });
}

export function loginAccount(payload: {
  username: string;
  password: string;
  remember: boolean;
}): Promise<ApiUser> {
  return apiRequest<ApiUser>("/api/auth/login", {
    method: "POST",
    body: payload,
    retry: false,
  });
}

export function logoutAccount(): Promise<void> {
  return apiRequest<void>("/api/auth/logout", { method: "POST", retry: false });
}

export function me(): Promise<ApiUser> {
  return apiRequest<ApiUser>("/api/auth/me", { retry: false });
}

export function updateProfile(payload: {
  displayName?: string;
  shirtColor?: string;
  bodyStyle?: "male" | "female";
}): Promise<ApiUser> {
  return apiRequest<ApiUser>("/api/auth/profile", {
    method: "PATCH",
    body: payload,
    retry: false,
  });
}

export function createRoom(payload: CreateRoomPayload): Promise<ApiRoomSnapshot> {
  return apiRequest<ApiRoomSnapshot>("/api/rooms", {
    method: "POST",
    body: payload,
    // Tạo phòng không idempotent: retry có thể sinh hai phòng.
    retry: false,
  });
}

export function joinRoom(code: string, signal?: AbortSignal): Promise<ApiRoomSnapshot> {
  return apiRequest<ApiRoomSnapshot>(`/api/rooms/${encodeURIComponent(code)}/join`, {
    method: "POST",
    signal,
  });
}

export function getRoom(code: string, signal?: AbortSignal): Promise<ApiRoomSnapshot> {
  return apiRequest<ApiRoomSnapshot>(`/api/rooms/${encodeURIComponent(code)}`, {
    signal,
  });
}

export function leaveRoom(code: string): Promise<void> {
  return apiRequest<void>(`/api/rooms/${encodeURIComponent(code)}/leave`, {
    method: "POST",
  });
}

export function closeRoom(code: string): Promise<ApiRoomSnapshot> {
  return apiRequest<ApiRoomSnapshot>(`/api/rooms/${encodeURIComponent(code)}/close`, {
    method: "POST",
  });
}

export function listMembers(code: string): Promise<ApiMember[]> {
  return apiRequest<ApiMember[]>(`/api/rooms/${encodeURIComponent(code)}/members`);
}

export function kickMember(code: string, memberId: string): Promise<ApiRoomSnapshot> {
  return apiRequest<ApiRoomSnapshot>(
    `/api/rooms/${encodeURIComponent(code)}/members/${encodeURIComponent(memberId)}/kick`,
    { method: "POST" },
  );
}

export function claimSeat(code: string, row: number, col: number): Promise<ApiRoomSnapshot> {
  return apiRequest<ApiRoomSnapshot>(`/api/rooms/${encodeURIComponent(code)}/seat`, {
    method: "POST",
    body: { row, col },
  });
}

export function releaseSeat(code: string): Promise<ApiRoomSnapshot> {
  return apiRequest<ApiRoomSnapshot>(`/api/rooms/${encodeURIComponent(code)}/seat`, {
    method: "DELETE",
  });
}

// Lệnh điều khiển video không retry: retry có thể tăng version hai lần.
export function loadVideo(code: string, payload: LoadVideoPayload): Promise<ApiRoomSnapshot> {
  return apiRequest<ApiRoomSnapshot>(`/api/rooms/${encodeURIComponent(code)}/video`, {
    method: "POST",
    body: payload,
    retry: false,
  });
}

export function playVideo(
  code: string,
  positionSec?: number,
): Promise<ApiRoomSnapshot> {
  return apiRequest<ApiRoomSnapshot>(`/api/rooms/${encodeURIComponent(code)}/video/play`, {
    method: "POST",
    body: positionSec === undefined ? {} : { positionSec },
    retry: false,
  });
}

export function pauseVideo(
  code: string,
  positionSec?: number,
): Promise<ApiRoomSnapshot> {
  return apiRequest<ApiRoomSnapshot>(`/api/rooms/${encodeURIComponent(code)}/video/pause`, {
    method: "POST",
    body: positionSec === undefined ? {} : { positionSec },
    retry: false,
  });
}

export function seekVideo(code: string, positionSec: number): Promise<ApiRoomSnapshot> {
  return apiRequest<ApiRoomSnapshot>(`/api/rooms/${encodeURIComponent(code)}/video/seek`, {
    method: "POST",
    body: { positionSec },
    retry: false,
  });
}

export function reportVideoEnded(code: string): Promise<ApiRoomSnapshot> {
  return apiRequest<ApiRoomSnapshot>(`/api/rooms/${encodeURIComponent(code)}/video/ended`, {
    method: "POST",
    body: {},
    retry: false,
  });
}

export function reportVideoError(
  code: string,
  errorCode: "embed-disabled" | "removed" | "unavailable",
): Promise<ApiRoomSnapshot> {
  return apiRequest<ApiRoomSnapshot>(`/api/rooms/${encodeURIComponent(code)}/video/error`, {
    method: "POST",
    body: { errorCode },
    retry: false,
  });
}
