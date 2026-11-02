import { apiRequest } from "./client";
import type {
  ApiChatMessage,
  ApiMessagePage,
  ApiQueueItem,
  ApiRoomSnapshot,
  ApiSkipVote,
} from "./types";

/**
 * Gọi API tương tác Phase 4. Mọi mutation ghi đều trả `RoomSnapshot`; chỉ chat là
 * append-only nên trả đúng tin nhắn vừa lưu.
 *
 * `retry: false` cho mutation: thử lại có thể tạo hai mục hàng chờ hoặc tăng version
 * hai lần. Chat dùng `clientMessageId` để retry an toàn nhưng vẫn không tự retry.
 */
const enc = encodeURIComponent;

export function sendChatMessage(
  code: string,
  payload: { body: string; kind?: "text" | "emoji"; clientMessageId?: string },
): Promise<ApiChatMessage> {
  return apiRequest<ApiChatMessage>(`/api/rooms/${enc(code)}/messages`, {
    method: "POST",
    body: payload,
    retry: false,
  });
}

export function fetchMessages(
  code: string,
  options: { before?: string; limit?: number; signal?: AbortSignal } = {},
): Promise<ApiMessagePage> {
  const params = new URLSearchParams();
  if (options.before) params.set("before", options.before);
  if (options.limit) params.set("limit", String(options.limit));
  const query = params.toString();
  return apiRequest<ApiMessagePage>(
    `/api/rooms/${enc(code)}/messages${query ? `?${query}` : ""}`,
    { signal: options.signal },
  );
}

export function fetchQueue(code: string): Promise<ApiQueueItem[]> {
  return apiRequest<ApiQueueItem[]>(`/api/rooms/${enc(code)}/queue`);
}

export function addQueueItem(
  code: string,
  payload: {
    videoId: string;
    title?: string;
    channelTitle?: string;
    durationSec?: number;
    isLive?: boolean;
  },
): Promise<ApiRoomSnapshot> {
  return apiRequest<ApiRoomSnapshot>(`/api/rooms/${enc(code)}/queue`, {
    method: "POST",
    body: payload,
    retry: false,
  });
}

export function removeQueueItem(
  code: string,
  itemId: string,
): Promise<ApiRoomSnapshot> {
  return apiRequest<ApiRoomSnapshot>(
    `/api/rooms/${enc(code)}/queue/${enc(itemId)}`,
    { method: "DELETE", retry: false },
  );
}

export function reorderQueue(
  code: string,
  order: string[],
  expectedVersion: number,
): Promise<ApiRoomSnapshot> {
  return apiRequest<ApiRoomSnapshot>(`/api/rooms/${enc(code)}/queue/order`, {
    method: "PATCH",
    body: { order, expectedVersion },
    retry: false,
  });
}

export function playNextInQueue(code: string): Promise<ApiRoomSnapshot> {
  return apiRequest<ApiRoomSnapshot>(`/api/rooms/${enc(code)}/queue/next`, {
    method: "POST",
    body: {},
    retry: false,
  });
}

export function playQueueItem(
  code: string,
  itemId: string,
): Promise<ApiRoomSnapshot> {
  return apiRequest<ApiRoomSnapshot>(
    `/api/rooms/${enc(code)}/queue/${enc(itemId)}/play`,
    { method: "POST", body: {}, retry: false },
  );
}

export function fetchSkipVote(code: string): Promise<ApiSkipVote> {
  return apiRequest<ApiSkipVote>(`/api/rooms/${enc(code)}/skip-vote`);
}

export function castSkipVote(
  code: string,
  videoId: string,
): Promise<ApiRoomSnapshot> {
  return apiRequest<ApiRoomSnapshot>(`/api/rooms/${enc(code)}/skip-vote`, {
    method: "POST",
    body: { videoId },
    retry: false,
  });
}

export function withdrawSkipVote(code: string): Promise<ApiRoomSnapshot> {
  return apiRequest<ApiRoomSnapshot>(`/api/rooms/${enc(code)}/skip-vote`, {
    method: "DELETE",
    retry: false,
  });
}

export function setMemberRole(
  code: string,
  memberId: string,
  role: "cohost" | "viewer",
): Promise<ApiRoomSnapshot> {
  return apiRequest<ApiRoomSnapshot>(
    `/api/rooms/${enc(code)}/members/${enc(memberId)}/role`,
    { method: "PATCH", body: { role }, retry: false },
  );
}
