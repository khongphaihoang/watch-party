"use client";

import { create } from "zustand";
import { t } from "./i18n";
import { createMockRoom, DEMO_VIDEO_ID, VIEWER_ID } from "./mock-room";
import { applyRoomSetup, loadRoomSetup } from "./room-setup";
import { parseYouTubeId } from "./youtube";
import type {
  ChatMessage,
  PanelId,
  PlaybackState,
  QueueItem,
  RoomMode,
  RoomState,
  UiStatus,
  Viewpoint,
} from "./room-types";
import {
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

  bootstrap: (code: string) => void;
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
  sendMessage: (body: string) => void;
  markChatRead: () => void;
  toggleSkipVote: () => void;
  enqueue: (url: string) => boolean;
  dequeue: (id: string) => void;
  playNext: () => void;
  setUiStatus: (ui: UiStatus) => void;
  setPlaybackState: (state: PlaybackState) => void;
  updateViewerProfile: (displayName: string, shirtColor?: string) => void;
}

let toastSeq = 0;

function applySeatStatuses(seats: SeatCell[], members: RoomState["members"], viewerId: string): SeatCell[] {
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

export const useRoomStore = create<RoomStore>((set, get) => ({
  room: null,
  seats: [],
  bootstrapped: false,

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

  bootstrap: (code) => {
    const base = createMockRoom(code);
    const setup = loadRoomSetup(code);
    let room = setup ? applyRoomSetup(base, setup) : base;

    // Đọc session user hiện tại nếu có để gán tên lên ghế
    try {
      if (typeof window !== "undefined") {
        const rawUser = localStorage.getItem("rap-chieu:auth-session");
        if (rawUser) {
          const user = JSON.parse(rawUser);
          if (user?.displayName) {
            const members = room.members.map((m) =>
              m.id === room.viewerId
                ? { ...m, displayName: user.displayName, shirtColor: user.avatarColor || m.shirtColor }
                : m,
            );
            room = { ...room, members };
          }
        }
      }
    } catch {
      // Bỏ qua lỗi đọc session
    }

    const seats = applySeatStatuses(buildSeatGrid(), room.members, room.viewerId);
    set({ room, seats, bootstrapped: true, unread: 2 });
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

    if (occupant && occupant !== room.viewerId) {
      get().pushToast(t("toast.seatTaken"), "warn");
      return;
    }
    if (occupant === room.viewerId) {
      get().pushToast(t("toast.seatAlreadyYours"), "info");
      return;
    }

    const members = room.members.map((member) =>
      member.id === room.viewerId ? { ...member, seatId: target } : member,
    );
    set({
      room: { ...room, members },
      seats: applySeatStatuses(seats, members, room.viewerId),
    });
    get().pushToast(t("toast.seatChosen", { row: row + 1, col: col + 1 }), "ok");
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
    if (!room?.skipVote) return;
    const voted = !room.skipVote.voted;
    const yes = room.skipVote.yes + (voted ? 1 : -1);
    set({
      room: {
        ...room,
        skipVote: { ...room.skipVote, voted, yes: Math.max(0, yes) },
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

  playNext: () => {
    const { room } = get();
    if (!room) return;
    if (room.queue.length === 0) {
      get().pushToast(t("toast.queueEmpty"), "warn");
      return;
    }
    const [next, ...rest] = room.queue;
    const now = Date.now();
    set({
      room: {
        ...room,
        lifecycle: "live",
        queue: rest,
        nowPlaying: {
          videoId: next.videoId,
          title: next.title,
          channelTitle: next.channelTitle,
          description: t("store.showStarted"),
          durationSec: next.durationSec,
          isLive: next.isLive,
          state: "playing",
          startedAt: now,
          offsetSec: 0,
          rate: 1,
        },
        skipVote: { videoId: next.videoId, yes: 0, total: room.members.length, voted: false },
      },
    });
    get().pushToast(t("toast.playingNext"), "ok");
  },

  setUiStatus: (ui) => {
    const { room } = get();
    if (!room) return;
    set({ room: { ...room, ui } });
  },

  setPlaybackState: (state) => {
    const { room } = get();
    if (!room) return;

    if (state === "idle") {
      set({
        room: { ...room, nowPlaying: null, lifecycle: "waiting", skipVote: null },
      });
      return;
    }

    const now = Date.now();
    const source =
      room.nowPlaying ??
      (() => {
        const next = room.queue[0];
        return next
          ? {
              videoId: next.videoId,
              title: next.title,
              channelTitle: next.channelTitle,
              description: t("store.showStarted"),
              durationSec: next.durationSec,
              isLive: next.isLive,
              state,
              startedAt: now,
              offsetSec: 0,
              rate: 1,
            }
          : null;
      })();

    if (!source) return;

    set({
      room: {
        ...room,
        lifecycle: "live",
        nowPlaying: {
          ...source,
          state,
          startedAt: state === "playing" ? now : source.startedAt,
        },
      },
    });
  },

  updateViewerProfile: (displayName, shirtColor) => {
    const { room, seats } = get();
    if (!room) return;
    const members = room.members.map((member) =>
      member.id === room.viewerId
        ? {
            ...member,
            displayName: displayName.trim() || member.displayName,
            shirtColor: shirtColor ?? member.shirtColor,
          }
        : member,
    );
    set({
      room: { ...room, members },
      seats: applySeatStatuses(seats, members, room.viewerId),
    });
  },
}));

export function useViewerSeat() {
  return useRoomStore((state) => {
    const viewer = state.room?.members.find((member) => member.id === VIEWER_ID);
    return viewer?.seatId;
  });
}

export { VIEWER_ID, DEMO_VIDEO_ID };
