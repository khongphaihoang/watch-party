"use client";

import { create } from "zustand";
import { isApiError } from "./api/client";
import {
  subscribeRoomSnapshots,
  subscribeVideoState,
  type VideoStateEvent,
} from "./api/realtime";
import {
  claimSeat as apiClaimSeat,
  closeRoom as apiCloseRoom,
  getRoom as apiGetRoom,
  joinRoom as apiJoinRoom,
  kickMember as apiKickMember,
  leaveRoom as apiLeaveRoom,
  loadVideo as apiLoadVideo,
  pauseVideo as apiPauseVideo,
  playVideo as apiPlayVideo,
  releaseSeat as apiReleaseSeat,
  reportVideoEnded as apiReportVideoEnded,
  reportVideoError as apiReportVideoError,
  seekVideo as apiSeekVideo,
} from "./api/rooms";
import type { ApiMember, ApiRoomSnapshot } from "./api/types";
import { useAuthStore } from "./auth-store";
import { t } from "./i18n";
import { createLocalRoomData } from "./local-room";
import { parseYouTubeId } from "./youtube";
import type {
  ChatMessage,
  Member,
  NowPlaying,
  PanelId,
  PlaybackErrorCode,
  QueueItem,
  RoomMode,
  RoomState,
  UiStatus,
  Viewpoint,
} from "./room-types";
import { pickNewerNowPlaying } from "./video-sync";
import {
  GRID,
  buildSeatGrid,
  seatId,
  type SeatCell,
  type ViewportTier,
} from "./theater-layout";

export interface Toast {
  id: number;
  message: string;
  tone: "info" | "ok" | "warn" | "danger";
}

interface RoomStore {
  room: RoomState | null;
  seats: SeatCell[];
  bootstrapped: boolean;
  /** Đã đo offset đồng hồ bằng sync:ping chưa (không để snapshot ghi đè). */
  clockSynced: boolean;
  /** Duration lấy từ player khi server chưa biết (local-only). */
  playerDurationSec: number;

  tier: ViewportTier;
  panel: PanelId;
  viewpoint: Viewpoint;
  mode: RoomMode;
  focus: boolean;
  infoCollapsed: boolean;
  /** Ẩn toàn bộ lớp HUD để xem rạp trống, chỉ còn nút hiện lại. */
  uiHidden: boolean;
  soundOn: boolean;
  volume: number;
  unread: number;
  chatDraft: string;
  toasts: Toast[];
  /** Thành viên đang thực sự có hoạt động âm thanh (do lớp realtime đẩy vào). */
  speakingIds: string[];
  /** Phase 1: giả lập mic để thấy hiệu ứng sóng âm. Tắt được trong Cài đặt. */
  demoVoice: boolean;

  bootstrap: (code: string) => Promise<void>;
  applySnapshot: (snapshot: ApiRoomSnapshot, adoptViewer: boolean) => void;
  applyVideoState: (event: VideoStateEvent) => void;
  refresh: () => Promise<void>;
  setServerOffset: (offsetMs: number) => void;
  setPlayerDuration: (durationSec: number) => void;

  loadVideo: (
    videoId: string,
    options?: { isLive?: boolean; title?: string; durationSec?: number },
  ) => Promise<boolean>;
  playVideo: (positionSec?: number) => Promise<void>;
  pauseVideo: (positionSec?: number) => Promise<void>;
  seekVideo: (positionSec: number) => Promise<void>;
  reportEnded: () => Promise<void>;
  reportError: (code: PlaybackErrorCode) => Promise<void>;

  setTier: (tier: ViewportTier) => void;
  setPanel: (panel: PanelId) => void;
  setViewpoint: (viewpoint: Viewpoint) => void;
  toggleMode: () => void;
  setFocus: (focus: boolean) => void;
  toggleFocus: () => void;
  setInfoCollapsed: (collapsed: boolean) => void;
  toggleInfo: () => void;
  setUiHidden: (hidden: boolean) => void;
  toggleUiHidden: () => void;
  toggleSound: () => void;
  setVolume: (volume: number) => void;
  setDraft: (draft: string) => void;
  pushToast: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
  setSpeaking: (memberIds: string[]) => void;
  toggleDemoVoice: () => void;

  takeSeat: (row: number, col: number) => void;
  releaseSeat: () => Promise<void>;
  leaveRoom: () => Promise<void>;
  kickMember: (memberId: string) => Promise<void>;
  closeRoom: () => Promise<void>;
  sendMessage: (body: string) => void;
  markChatRead: () => void;
  toggleSkipVote: () => void;
  enqueue: (url: string) => boolean;
  dequeue: (id: string) => void;
  playUrl: (url: string, isLive?: boolean) => Promise<boolean>;
  playQueueItem: (id: string) => Promise<void>;
  setUiStatus: (ui: UiStatus) => void;
  updateViewerProfile: (displayName: string, shirtColor?: string) => void;
}

let toastSeq = 0;
let bootstrapSeq = 0;
let bootstrapAbort: AbortController | null = null;
let bootstrappingCode: string | null = null;
let unsubscribeSnapshots: (() => void) | null = null;
let unsubscribeVideo: (() => void) | null = null;

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function applySeatStatuses(
  seats: SeatCell[],
  members: Member[],
  viewerId: string,
): SeatCell[] {
  const bySeat = new Map<string, string>();
  for (const member of members) {
    if (member.seatId) bySeat.set(member.seatId, member.id);
  }
  return seats.map((seat) => {
    const memberId = bySeat.get(seat.id);
    const status = !memberId ? "empty" : memberId === viewerId ? "mine" : "occupied";
    return { ...seat, memberId, status };
  });
}

function toMember(member: ApiMember): Member {
  return {
    id: member.id,
    displayName: member.displayName,
    shirtColor: member.shirtColor,
    bodyStyle: member.bodyStyle,
    isHost: member.isHost,
    isBot: false,
    seatId: member.seatId,
    frameTier: member.frameTier,
    micOn: member.micOn,
  };
}

function toNowPlaying(now: ApiRoomSnapshot["nowPlaying"]): NowPlaying | null {
  if (!now) return null;
  return {
    videoId: now.videoId,
    videoType: now.videoType ?? (now.isLive ? "live" : "video"),
    title: now.title,
    channelTitle: now.channelTitle,
    description: now.description,
    durationSec: now.durationSec,
    isLive: now.isLive,
    state: now.state,
    startedAt: now.startedAt,
    offsetSec: now.offsetSec,
    rate: now.rate,
    version: now.version ?? 0,
    updatedAt: now.updatedAt ?? now.startedAt,
    controlledBy: now.controlledBy ?? null,
    errorCode: now.errorCode,
  };
}

function emptyRoom(code: string, ui: UiStatus): RoomState {
  const local = createLocalRoomData();
  return {
    code,
    title: "",
    lifecycle: ui === "ended" ? "ended" : "waiting",
    capacity: (GRID.rows - 1) * GRID.cols,
    viewerId: "",
    nowPlaying: null,
    seats: [],
    members: [],
    queue: local.queue,
    messages: local.messages,
    skipVote: local.skipVote,
    ui,
    serverOffsetMs: 0,
    walletPoints: local.walletPoints,
  };
}

/** Mã lỗi API → trạng thái màn hình. */
function uiFromError(error: unknown): UiStatus {
  if (!isApiError(error)) return "reconnecting";
  switch (error.code) {
    case "ROOM_NOT_FOUND":
    case "SEAT_NOT_FOUND":
      return "missing";
    case "ROOM_CLOSED":
      return "ended";
    case "ROOM_FULL":
      return "full";
    case "NOT_ROOM_MEMBER":
    case "ROOM_FORBIDDEN":
      return "removed";
    case "ACCOUNT_REQUIRED":
    case "UNAUTHENTICATED":
      return "login";
    case "NETWORK_ERROR":
    case "INTERNAL_ERROR":
    case "RATE_LIMITED":
      return "reconnecting";
    default:
      return "missing";
  }
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  room: null,
  seats: [],
  bootstrapped: false,
  clockSynced: false,
  playerDurationSec: 0,

  tier: "wide",
  panel: null,
  viewpoint: "overview",
  mode: "seated",
  focus: false,
  infoCollapsed: false,
  uiHidden: false,
  soundOn: false,
  volume: 70,
  unread: 0,
  chatDraft: "",
  toasts: [],
  speakingIds: [],
  demoVoice: true,

  bootstrap: async (code) => {
    const seq = ++bootstrapSeq;
    // Huỷ request của lần bootstrap trước khi đổi mã phòng.
    bootstrapAbort?.abort();
    bootstrapAbort = new AbortController();
    const signal = bootstrapAbort.signal;
    bootstrappingCode = code.toUpperCase();

    unsubscribeSnapshots?.();
    unsubscribeSnapshots = null;
    unsubscribeVideo?.();
    unsubscribeVideo = null;

    // Chống dữ liệu phòng cũ khi đổi mã.
    set({
      room: null,
      seats: [],
      bootstrapped: false,
      panel: null,
      unread: 0,
      speakingIds: [],
      clockSynced: false,
      playerDurationSec: 0,
    });

    try {
      const user = await useAuthStore.getState().ensureSession();
      if (seq !== bootstrapSeq) return;
      if (!user) {
        set({ room: emptyRoom(code, "login"), seats: [], bootstrapped: true });
        return;
      }

      try {
        const snapshot = await apiJoinRoom(code, signal);
        if (seq !== bootstrapSeq) return;
        get().applySnapshot(snapshot, true);
        set({ bootstrapped: true });
        unsubscribeSnapshots = subscribeRoomSnapshots(snapshot.code, (next) => {
          get().applySnapshot(next, false);
        });
        unsubscribeVideo = subscribeVideoState(snapshot.code, (event) => {
          get().applyVideoState(event);
        });
      } catch (error) {
        if (isAbort(error) || seq !== bootstrapSeq) return;
        const ui = uiFromError(error);
        if (ui === "reconnecting") {
          get().pushToast(isApiError(error) ? error.message : t("toast.networkError"), "danger");
        }
        set({ room: emptyRoom(code, ui), seats: [], bootstrapped: true });
      }
    } finally {
      if (seq === bootstrapSeq) bootstrappingCode = null;
    }
  },

  applySnapshot: (snapshot, adoptViewer) => {
    const current = get().room;
    const viewerId = adoptViewer ? snapshot.viewerId : (current?.viewerId || snapshot.viewerId);
    const members = snapshot.members.map(toMember);
    const local = current ?? emptyRoom(snapshot.code, "ready");
    // Snapshot đẩy qua socket không còn mình trong danh sách nghĩa là vừa bị
    // kick khỏi phòng — hiện màn hình "đã bị mời ra" ngay, không đợi tải lại.
    const stillMember = !viewerId || members.some((member) => member.id === viewerId);
    const ui: UiStatus =
      snapshot.lifecycle === "ended" ? "ended" : stillMember ? "ready" : "removed";

    const measured = get().clockSynced;
    const serverOffsetMs = measured
      ? local.serverOffsetMs
      : snapshot.serverTime - Date.now();
    // Snapshot REST là ảnh chụp mới nhất tại thời điểm gọi: nếu server không
    // còn video nào thì xoá luôn, còn nếu có thì vẫn so version để event cũ
    // không ghi đè trạng thái mới hơn.
    const nowPlaying = snapshot.nowPlaying
      ? pickNewerNowPlaying(local.nowPlaying, toNowPlaying(snapshot.nowPlaying))
      : null;
    const room: RoomState = {
      ...local,
      code: snapshot.code,
      title: snapshot.title,
      lifecycle: snapshot.lifecycle,
      capacity: snapshot.capacity,
      viewerId,
      nowPlaying,
      skipVote:
        nowPlaying && local.skipVote?.videoId === nowPlaying.videoId
          ? local.skipVote
          : null,
      members,
      seats: [],
      ui,
      serverOffsetMs,
    };

    set({ room, seats: applySeatStatuses(buildSeatGrid(), members, viewerId) });
  },

  applyVideoState: (event) => {
    const current = get().room;
    if (!current || current.code.toUpperCase() !== event.code.toUpperCase()) return;
    const incoming = toNowPlaying(event.nowPlaying);
    const next = pickNewerNowPlaying(current.nowPlaying, incoming);
    if (next === current.nowPlaying) return;
    const serverOffsetMs = get().clockSynced
      ? current.serverOffsetMs
      : event.serverTime - Date.now();
    // Phiếu bỏ qua thuộc về video cũ, đổi video thì bỏ phiếu cũ đi.
    const skipVote =
      next && current.skipVote?.videoId === next.videoId ? current.skipVote : null;
    set({ room: { ...current, nowPlaying: next, serverOffsetMs, skipVote } });
  },

  setServerOffset: (offsetMs) => {
    if (!Number.isFinite(offsetMs)) return;
    const current = get().room;
    set({
      clockSynced: true,
      room: current ? { ...current, serverOffsetMs: offsetMs } : current,
    });
  },

  setPlayerDuration: (durationSec) => {
    if (!Number.isFinite(durationSec) || durationSec <= 0) return;
    if (get().playerDurationSec !== durationSec) {
      set({ playerDurationSec: durationSec });
    }
  },

  refresh: async () => {
    const room = get().room;
    if (!room?.code) return;
    try {
      const snapshot = await apiGetRoom(room.code);
      get().applySnapshot(snapshot, false);
    } catch (error) {
      const ui = uiFromError(error);
      if (ui === "reconnecting") {
        get().pushToast(isApiError(error) ? error.message : t("toast.networkError"), "danger");
        return;
      }
      // Bị dọn khỏi phòng / phòng đã đóng / không còn tồn tại: đổi màn hình
      // ngay thay vì giữ snapshot cũ cho tới lần tải lại sau.
      const current = get().room;
      if (current) set({ room: { ...current, ui }, seats: [] });
    }
  },

  setTier: (tier) => {
    if (get().tier !== tier) set({ tier });
  },
  setPanel: (panel) =>
    set((state) => ({
      panel,
      unread: panel === "chat" ? 0 : state.unread,
    })),
  setViewpoint: (viewpoint) => set({ viewpoint }),
  toggleMode: () =>
    set((state) => ({
      mode: state.mode === "seated" ? "flat" : "seated",
    })),
  setFocus: (focus) =>
    set((state) => ({
      focus,
      // Focus mode luôn dọn panel để không còn lớp phủ trên màn chiếu.
      panel: focus ? null : state.panel,
    })),
  toggleFocus: () => get().setFocus(!get().focus),
  setInfoCollapsed: (infoCollapsed) => {
    if (get().infoCollapsed !== infoCollapsed) set({ infoCollapsed });
  },
  toggleInfo: () => set((state) => ({ infoCollapsed: !state.infoCollapsed })),
  setUiHidden: (uiHidden) => {
    if (get().uiHidden !== uiHidden) set({ uiHidden });
  },
  toggleUiHidden: () => set((state) => ({ uiHidden: !state.uiHidden })),

  setSpeaking: (memberIds) => {
    const current = get().speakingIds;
    const same =
      current.length === memberIds.length &&
      current.every((id, index) => id === memberIds[index]);
    if (!same) set({ speakingIds: memberIds });
  },
  toggleDemoVoice: () =>
    set((state) => ({
      demoVoice: !state.demoVoice,
      speakingIds: state.demoVoice ? [] : state.speakingIds,
    })),
  toggleSound: () =>
    set((state) => {
      const soundOn = !state.soundOn;
      get().pushToast(t(soundOn ? "toast.soundOn" : "toast.soundOff"), "info");
      return { soundOn };
    }),
  setVolume: (volume) => set({ volume: Math.min(100, Math.max(0, volume)) }),
  setDraft: (chatDraft) => set({ chatDraft }),

  pushToast: (message, tone = "info") => {
    toastSeq += 1;
    const id = toastSeq;
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }].slice(-3) }));
    setTimeout(() => get().dismissToast(id), 4000);
  },
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),

  takeSeat: (row, col) => {
    const { room, seats } = get();
    if (!room) return;
    const target = seatId(row, col);
    const occupant = seats.find((seat) => seat.id === target)?.memberId;

    if (occupant === room.viewerId) {
      get().pushToast(t("toast.seatAlreadyYours"), "info");
      return;
    }
    if (occupant) {
      get().pushToast(t("toast.seatTaken"), "warn");
      return;
    }

    void apiClaimSeat(room.code, row, col)
      .then((snapshot) => {
        get().applySnapshot(snapshot, false);
        get().pushToast(
          t("toast.seatChosen", { row: row + 1, col: col + 1 }),
          "ok",
        );
      })
      .catch((error: unknown) => {
        if (isApiError(error) && error.code === "SEAT_ALREADY_OCCUPIED") {
          get().pushToast(t("toast.seatTaken"), "warn");
          void get().refresh();
          return;
        }
        get().pushToast(
          isApiError(error) ? error.message : t("toast.networkError"),
          "danger",
        );
      });
  },

  releaseSeat: async () => {
    const room = get().room;
    if (!room) return;
    try {
      const snapshot = await apiReleaseSeat(room.code);
      get().applySnapshot(snapshot, false);
      get().pushToast(t("toast.seatReleased"), "info");
    } catch (error) {
      get().pushToast(
        isApiError(error) ? error.message : t("toast.networkError"),
        "danger",
      );
    }
  },

  loadVideo: async (videoId, options = {}) => {
    const room = get().room;
    if (!room) return false;
    try {
      const snapshot = await apiLoadVideo(room.code, { videoId, ...options });
      get().applySnapshot(snapshot, false);
      get().pushToast(t("toast.videoLoaded"), "ok");
      return true;
    } catch (error) {
      get().pushToast(
        isApiError(error) ? error.message : t("toast.networkError"),
        "danger",
      );
      return false;
    }
  },

  playVideo: async (positionSec) => {
    const room = get().room;
    if (!room) return;
    try {
      const snapshot = await apiPlayVideo(room.code, positionSec);
      get().applySnapshot(snapshot, false);
    } catch (error) {
      get().pushToast(
        isApiError(error) ? error.message : t("toast.networkError"),
        "danger",
      );
    }
  },

  pauseVideo: async (positionSec) => {
    const room = get().room;
    if (!room) return;
    try {
      const snapshot = await apiPauseVideo(room.code, positionSec);
      get().applySnapshot(snapshot, false);
    } catch (error) {
      get().pushToast(
        isApiError(error) ? error.message : t("toast.networkError"),
        "danger",
      );
    }
  },

  seekVideo: async (positionSec) => {
    const room = get().room;
    if (!room) return;
    try {
      const snapshot = await apiSeekVideo(room.code, positionSec);
      get().applySnapshot(snapshot, false);
    } catch (error) {
      get().pushToast(
        isApiError(error) ? error.message : t("toast.networkError"),
        "danger",
      );
    }
  },

  reportEnded: async () => {
    const room = get().room;
    if (!room) return;
    try {
      const snapshot = await apiReportVideoEnded(room.code);
      get().applySnapshot(snapshot, false);
    } catch (error) {
      get().pushToast(
        isApiError(error) ? error.message : t("toast.networkError"),
        "danger",
      );
    }
  },

  reportError: async (code) => {
    const room = get().room;
    if (!room) return;
    try {
      const snapshot = await apiReportVideoError(room.code, code);
      get().applySnapshot(snapshot, false);
    } catch (error) {
      get().pushToast(
        isApiError(error) ? error.message : t("toast.networkError"),
        "danger",
      );
    }
  },

  leaveRoom: async () => {
    const room = get().room;
    unsubscribeSnapshots?.();
    unsubscribeSnapshots = null;
    unsubscribeVideo?.();
    unsubscribeVideo = null;
    set({ panel: null });
    if (!room?.code) return;
    // Không xoá `room` ở đây: RoomScreen còn mounted và effect bootstrap sẽ
    // join lại phòng ngay trước khi kịp điều hướng về trang chủ.
    try {
      await apiLeaveRoom(room.code);
    } catch {
      // Rời phòng là best-effort: người dùng vẫn được đưa về trang chủ.
    }
  },

  kickMember: async (memberId) => {
    const room = get().room;
    if (!room) return;
    try {
      const snapshot = await apiKickMember(room.code, memberId);
      const kicked = snapshot.members.length < room.members.length;
      get().applySnapshot(snapshot, false);
      if (kicked) get().pushToast(t("members.kicked"), "ok");
    } catch (error) {
      get().pushToast(
        isApiError(error) ? error.message : t("toast.networkError"),
        "danger",
      );
    }
  },

  closeRoom: async () => {
    const room = get().room;
    if (!room) return;
    try {
      const snapshot = await apiCloseRoom(room.code);
      get().applySnapshot(snapshot, false);
      get().pushToast(t("toast.roomClosed"), "info");
    } catch (error) {
      get().pushToast(
        isApiError(error) ? error.message : t("toast.networkError"),
        "danger",
      );
    }
  },

  sendMessage: (body) => {
    const text = body.trim();
    const { room } = get();
    if (!room || text.length === 0) return;
    const viewer = room.members.find((member) => member.id === room.viewerId);
    const message: ChatMessage = {
      id: `msg-local-${Date.now()}`,
      memberId: room.viewerId,
      displayName: viewer?.displayName || t("common.you"),
      kind: "text",
      body: text.slice(0, 200),
      createdAt: Date.now(),
    };
    set({ room: { ...room, messages: [...room.messages, message] }, chatDraft: "" });
  },

  markChatRead: () => set({ unread: 0 }),

  toggleSkipVote: () => {
    const { room } = get();
    if (!room) return;
    const base =
      room.skipVote ??
      ({
        videoId: room.nowPlaying?.videoId ?? "",
        yes: 0,
        total: room.members.length,
        voted: false,
      } as const);
    const voted = !base.voted;
    const yes = base.yes + (voted ? 1 : -1);
    set({
      room: {
        ...room,
        skipVote: { ...base, voted, yes: Math.max(0, yes) },
      },
    });
    get().pushToast(t(voted ? "toast.skipVoted" : "toast.skipWithdrawn"), "info");
  },

  enqueue: (url) => {
    const { room } = get();
    if (!room) return false;
    const videoId = parseYouTubeId(url);
    if (!videoId) {
      get().pushToast(t("toast.invalidLink"), "danger");
      return false;
    }
    const viewer = room.members.find((member) => member.id === room.viewerId);
    const item: QueueItem = {
      id: `q-local-${Date.now()}`,
      videoId,
      title: t("store.placeholderVideoTitle"),
      channelTitle: t("store.placeholderChannel"),
      durationSec: 0,
      addedBy: viewer?.displayName || t("common.you"),
      isLive: false,
    };
    set({ room: { ...room, queue: [...room.queue, item] } });
    get().pushToast(t("toast.videoAdded"), "ok");
    return true;
  },

  dequeue: (id) => {
    const { room } = get();
    if (!room) return;
    set({ room: { ...room, queue: room.queue.filter((item) => item.id !== id) } });
  },

  playUrl: async (url, isLive = false) => {
    const videoId = parseYouTubeId(url);
    if (!videoId) {
      get().pushToast(t("toast.invalidLink"), "danger");
      return false;
    }
    return get().loadVideo(videoId, { isLive });
  },

  playQueueItem: async (id) => {
    const { room } = get();
    const item = room?.queue.find((entry) => entry.id === id);
    if (!item) return;
    const loaded = await get().loadVideo(item.videoId, {
      isLive: item.isLive,
      title: item.title,
      durationSec: item.durationSec,
    });
    if (loaded) get().dequeue(id);
  },

  setUiStatus: (ui) => {
    const { room } = get();
    if (!room) return;
    set({ room: { ...room, ui } });
  },

  updateViewerProfile: (displayName, shirtColor) => {
    const { room, seats } = get();
    if (!room) return;
    const name = displayName.trim();
    const members = room.members.map((member) =>
      member.id === room.viewerId
        ? {
            ...member,
            displayName: name || member.displayName,
            shirtColor: shirtColor ?? member.shirtColor,
          }
        : member,
    );
    set({
      room: { ...room, members },
      seats: applySeatStatuses(seats, members, room.viewerId),
    });

    void useAuthStore
      .getState()
      .saveProfile({
        ...(name ? { displayName: name } : {}),
        ...(shirtColor ? { shirtColor } : {}),
      })
      .then((ok) => {
        const auth = useAuthStore.getState();
        if (!ok) {
          get().pushToast(auth.errorMessage ?? t("toast.networkError"), "danger");
          return;
        }
        get().pushToast(t("auth.saved"), "ok");
        const user = auth.user;
        const current = get().room;
        if (!user || !current) return;
        const synced = current.members.map((member) =>
          member.id === current.viewerId
            ? {
                ...member,
                displayName: user.displayName,
                shirtColor: user.shirtColor,
                bodyStyle: user.bodyStyle,
              }
            : member,
        );
        set({
          room: { ...current, members: synced },
          seats: applySeatStatuses(get().seats, synced, current.viewerId),
        });
      });
  },
}));

export function useViewerSeat() {
  return useRoomStore((state) => {
    const viewerId = state.room?.viewerId;
    if (!viewerId) return undefined;
    return state.room?.members.find((member) => member.id === viewerId)?.seatId;
  });
}

/**
 * Đổi danh tính (đăng nhập / đăng xuất / đổi tài khoản) thì phải join lại phòng:
 * thành viên và ghế gắn với user id, nên snapshot cũ không còn đúng.
 */
let lastAuthUserId: string | null = null;

useAuthStore.subscribe((state, previous) => {
  const nextId = state.user?.id ?? null;
  if (nextId === lastAuthUserId) return;
  lastAuthUserId = nextId;
  if (previous.user === undefined) return;

  const store = useRoomStore.getState();
  const code = store.room?.code;
  if (!code || !store.bootstrapped) return;
  // Đang trong chính lần bootstrap này (`ensureSession` vừa nạp xong phiên).
  if (bootstrappingCode === code.toUpperCase()) return;
  void store.bootstrap(code);
});
