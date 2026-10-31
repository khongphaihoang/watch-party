"use client";

import { useState } from "react";
import {
  Armchair,
  EyeOff,
  Focus,
  Maximize2,
  MessageSquareMore,
  Minimize2,
  Send,
  Shrink,
  Smile,
  Users,
  Volume2,
  VolumeX,
  Waves,
} from "lucide-react";
import type { PanelId, RoomMode, Viewpoint } from "@/lib/room-types";
import { ViewpointSwitcher } from "./ViewpointSwitcher";

const MAX_LEN = 200;
const EMOJI = ["😀", "😂", "🍿", "🔥", "❤️", "👏", "😮", "🎬"];

export function BottomDock({
  draft,
  onDraftChange,
  onSend,
  soundOn,
  volume,
  onToggleSound,
  onVolume,
  mode,
  onToggleMode,
  isFullscreen,
  onToggleFullscreen,
  onOpenPanel,
  activePanel,
  focus,
  onToggleFocus,
  viewpoint,
  onViewpoint,
  uiHidden,
  onToggleUiHidden,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  soundOn: boolean;
  volume: number;
  onToggleSound: () => void;
  onVolume: (value: number) => void;
  mode: RoomMode;
  onToggleMode: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenPanel: (panel: PanelId) => void;
  activePanel: PanelId;
  focus: boolean;
  onToggleFocus: () => void;
  viewpoint: Viewpoint;
  onViewpoint: (viewpoint: Viewpoint) => void;
  uiHidden: boolean;
  onToggleUiHidden: () => void;
}) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const nearLimit = draft.length >= MAX_LEN - 20;

  return (
    <div className="dock">
      <div className="dock__group dock__group--view">
        <button
          type="button"
          className={`icon-btn ${focus ? "is-active" : ""}`}
          onClick={onToggleFocus}
          aria-pressed={focus}
          aria-label={focus ? "Thoát chế độ tập trung" : "Bật chế độ tập trung"}
          data-tip={focus ? "Thoát Focus (Esc)" : "Focus Mode (F)"}
        >
          {focus ? <Shrink size={18} aria-hidden="true" /> : <Focus size={18} aria-hidden="true" />}
        </button>
        <button
          type="button"
          className="icon-btn dock__dup"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
          data-tip={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
        >
          {isFullscreen ? (
            <Minimize2 size={18} aria-hidden="true" />
          ) : (
            <Maximize2 size={18} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className={`icon-btn dock__dup ${activePanel === "seats" ? "is-active" : ""}`}
          onClick={() => onOpenPanel(activePanel === "seats" ? null : "seats")}
          aria-label="Chọn ghế"
          data-tip="Chọn ghế"
        >
          <Armchair size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`icon-btn ${mode === "flat" ? "is-active" : ""}`}
          onClick={onToggleMode}
          aria-pressed={mode === "flat"}
          aria-label={mode === "flat" ? "Chuyển về không gian rạp" : "Chuyển sang chế độ màn hình phẳng"}
          data-tip={mode === "flat" ? "Không gian rạp" : "Màn hình phẳng"}
        >
          <Waves size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`icon-btn dock__dup ${activePanel === "members" ? "is-active" : ""}`}
          onClick={() => onOpenPanel(activePanel === "members" ? null : "members")}
          aria-label="Xem thành viên"
          data-tip="Thành viên trong rạp"
        >
          <Users size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`icon-btn dock__ui-toggle ${uiHidden ? "is-active" : ""}`}
          onClick={onToggleUiHidden}
          aria-pressed={uiHidden}
          aria-label="Ẩn giao diện"
          data-tip="Ẩn giao diện (H)"
        >
          <EyeOff size={18} aria-hidden="true" />
        </button>
      </div>

      <ViewpointSwitcher viewpoint={viewpoint} onChange={onViewpoint} />

      <div className="dock__chat">
        <label htmlFor="chat-input" className="sr-only">
          Tin nhắn cho cả rạp
        </label>
        <input
          id="chat-input"
          className="dock__input"
          type="text"
          value={draft}
          maxLength={MAX_LEN}
          placeholder="Nhắn gì đó cho cả rạp…"
          autoComplete="off"
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
        />
        <span className={`char-count ${nearLimit ? "is-warn" : ""}`} aria-live="polite">
          {draft.length}/{MAX_LEN}
        </span>
        <button
          type="button"
          className="icon-btn dock__expand"
          onClick={() => onOpenPanel("chat")}
          aria-label="Mở khung chat"
          data-tip="Mở khung chat"
        >
          <MessageSquareMore size={18} aria-hidden="true" />
        </button>
        <div className="dock__emoji">
          <button
            type="button"
            className="icon-btn"
            aria-expanded={emojiOpen}
            aria-label="Biểu tượng cảm xúc"
            data-tip="Biểu tượng cảm xúc"
            onClick={() => setEmojiOpen((open) => !open)}
          >
            <Smile size={18} aria-hidden="true" />
          </button>
          {emojiOpen ? (
            <div className="panel emoji-pop" role="dialog" aria-label="Chọn biểu tượng cảm xúc">
              {EMOJI.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="icon-btn"
                  onClick={() => {
                    onDraftChange((draft + emoji).slice(0, MAX_LEN));
                    setEmojiOpen(false);
                  }}
                  aria-label={`Chèn ${emoji}`}
                >
                  <span aria-hidden="true">{emoji}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn-primary dock__send"
          onClick={onSend}
          disabled={draft.trim().length === 0}
        >
          <Send size={15} aria-hidden="true" />
          <span className="dock__send-label">Gửi</span>
        </button>
      </div>

      <div className="dock__group dock__group--sound">
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleSound}
          aria-pressed={soundOn}
          aria-label={soundOn ? "Tắt âm thanh" : "Bật âm thanh"}
          data-tip={soundOn ? "Tắt âm thanh" : "Bật âm thanh"}
        >
          {soundOn ? (
            <Volume2 size={18} aria-hidden="true" />
          ) : (
            <VolumeX size={18} aria-hidden="true" />
          )}
        </button>
        <div className="volume">
          <label htmlFor="volume" className="sr-only">
            Âm lượng
          </label>
          <input
            id="volume"
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(event) => onVolume(Number(event.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
