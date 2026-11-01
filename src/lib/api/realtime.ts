"use client";

import { io, type Socket } from "socket.io-client";
import type { PingSample } from "../clock-sync";
import { API_ORIGIN } from "./client";
import type { ApiNowPlaying, ApiRoomSnapshot } from "./types";

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(`${API_ORIGIN}/room`, {
      withCredentials: true,
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export interface VideoStateEvent {
  code: string;
  reason: "load" | "play" | "pause" | "seek" | "ended" | "error";
  nowPlaying: ApiNowPlaying | null;
  serverTime: number;
}

/** Kết nối socket (nếu chưa) và chờ tối đa `timeoutMs`. */
function waitForConnection(active: Socket, timeoutMs: number): Promise<boolean> {
  if (active.connected) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);
    const onConnect = () => {
      cleanup();
      resolve(true);
    };
    const onError = () => {
      cleanup();
      resolve(false);
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      active.off("connect", onConnect);
      active.off("connect_error", onError);
    };
    active.once("connect", onConnect);
    active.once("connect_error", onError);
    active.connect();
  });
}

/**
 * Đo một mẫu offset đồng hồ qua ack của `sync:ping`.
 * Backend trả `{ t0, serverTime }`; client tính RTT và offset ở `clock-sync.ts`.
 */
export async function pingServer(timeoutMs = 2500): Promise<PingSample | null> {
  const active = getSocket();
  if (!(await waitForConnection(active, timeoutMs))) return null;

  const t0 = Date.now();
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), timeoutMs);
    active.emit(
      "sync:ping",
      { t0 },
      (response: { t0?: number; serverTime?: number }) => {
        window.clearTimeout(timer);
        const t2 = Date.now();
        const serverTime = Number(response?.serverTime);
        if (!Number.isFinite(serverTime)) {
          resolve(null);
          return;
        }
        resolve({ t0, t1: serverTime, t2 });
      },
    );
  });
}

/**
 * Nhận `room:snapshot` cho một phòng. Phase 2 chỉ cần đúng sự kiện này để các
 * tab cùng phòng thấy ghế của nhau; đồng bộ phát/chat thuộc Phase 3-4.
 */
export function subscribeRoomSnapshots(
  code: string,
  onSnapshot: (snapshot: ApiRoomSnapshot) => void,
): () => void {
  const active = getSocket();
  const joined = code.toUpperCase();

  const handleSnapshot = (snapshot: ApiRoomSnapshot) => {
    if (snapshot.code?.toUpperCase() === joined) onSnapshot(snapshot);
  };
  const announce = () => active.emit("room:join", { code: joined });

  active.on("room:snapshot", handleSnapshot);
  active.on("connect", announce);

  if (active.connected) {
    announce();
  } else {
    active.connect();
  }

  return () => {
    active.off("room:snapshot", handleSnapshot);
    active.off("connect", announce);
    active.emit("room:leave", { code: joined });
  };
}

/** Nhận `video:state` của đúng phòng; bỏ qua event của phòng khác. */
export function subscribeVideoState(
  code: string,
  onState: (event: VideoStateEvent) => void,
): () => void {
  const active = getSocket();
  const joined = code.toUpperCase();
  const handler = (event: VideoStateEvent) => {
    if (event.code?.toUpperCase() === joined) onState(event);
  };
  active.on("video:state", handler);
  if (!active.connected) active.connect();
  return () => active.off("video:state", handler);
}
