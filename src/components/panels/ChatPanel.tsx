"use client";

import { useEffect, useId, useRef, useState } from "react";
import { RotateCw, Send } from "lucide-react";
import { formatClock, initials } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { isLocalMessage } from "@/lib/chat-sync";
import type { RoomState } from "@/lib/room-types";
import { PanelShell } from "./PanelShell";

const QUICK = ["🍿", "🔥", "❤️", "👏"];
const MAX_LEN = 200;
/** Coi là "đang ở cuối" khi còn cách đáy ít hơn ngưỡng này (px). */
const NEAR_BOTTOM_PX = 80;

export function ChatPanel({
  room,
  draft,
  onDraftChange,
  onSend,
  onLoadOlder,
  onRetry,
  onClose,
}: {
  room: RoomState;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onLoadOlder: () => void;
  onRetry: (localId: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [reactions, setReactions] = useState<Array<{ id: number; emoji: string }>>([]);
  const [atBottom, setAtBottom] = useState(true);
  const reactionId = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const colorByName = new Map(room.members.map((m) => [m.id, m.shirtColor]));
  const nearLimit = draft.length >= MAX_LEN - 20;

  // Chỉ tự cuộn khi người dùng đang ở cuối — không giật khỏi lịch sử đang đọc.
  useEffect(() => {
    if (!atBottom) return;
    endRef.current?.scrollIntoView({ block: "end" });
  }, [room.messages.length, atBottom]);

  useEffect(() => {
    if (reactions.length === 0) return;
    const timer = window.setTimeout(() => setReactions((list) => list.slice(1)), 1600);
    return () => window.clearTimeout(timer);
  }, [reactions]);

  const handleScroll = () => {
    const node = listRef.current;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    setAtBottom(distance < NEAR_BOTTOM_PX);
  };

  return (
    <PanelShell
      title={t("chat.title")}
      subtitle={t("chat.subtitle", { count: room.messages.length })}
      onClose={onClose}
      footer={
        <div className="chat-compose">
          <div className="chat-reactions">
            {QUICK.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="chat-reaction"
                aria-label={t("chat.react", { emoji })}
                onClick={() => {
                  reactionId.current += 1;
                  const id = reactionId.current;
                  setReactions((list) => [...list, { id, emoji }].slice(-5));
                }}
              >
                <span aria-hidden="true">{emoji}</span>
              </button>
            ))}
            <div className="chat-reactions__burst" aria-hidden="true">
              {reactions.map((reaction) => (
                <span key={reaction.id} className="chat-reaction-float">
                  {reaction.emoji}
                </span>
              ))}
            </div>
            <span className="chat-compose__hint">{t("chat.enterHint")}</span>
          </div>
          <div className="chat-compose__row">
            <label htmlFor={inputId} className="sr-only">
              {t("dock.chatLabel")}
            </label>
            <input
              id={inputId}
              className="input chat-compose__input"
              value={draft}
              maxLength={MAX_LEN}
              placeholder={t("chat.placeholder")}
              autoComplete="off"
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSend();
                }
              }}
            />
            <span className={`char-count ${nearLimit ? "is-warn" : ""}`}>
              {draft.length}/{MAX_LEN}
            </span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onSend}
              disabled={draft.trim().length === 0}
            >
              <Send size={15} aria-hidden="true" />
              {t("dock.send")}
            </button>
          </div>
        </div>
      }
    >
      <div
        className="chat-list"
        role="log"
        aria-live="polite"
        ref={listRef}
        onScroll={handleScroll}
      >
        {room.chatHasMore ? (
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={onLoadOlder}
            disabled={room.chatLoading}
          >
            {room.chatLoading ? t("chat.loading") : t("chat.loadOlder")}
          </button>
        ) : null}

        {room.messages.length === 0 ? (
          <p className="hint" style={{ textAlign: "center", padding: "24px 0" }}>
            {t("chat.empty")}
          </p>
        ) : null}

        {room.messages.map((message) => (
          <div
            key={message.id}
            className={`chat-msg ${message.status === "sending" ? "is-pending" : ""}`}
          >
            <span
              className="chat-msg__avatar"
              style={{ background: colorByName.get(message.memberId) ?? "#a5ae9f" }}
              aria-hidden="true"
            >
              {initials(message.displayName)}
            </span>
            <div className="chat-msg__body">
              <div className="chat-msg__name">
                <span>{message.displayName}</span>
                <span aria-hidden="true">·</span>
                <span>{formatClock(message.createdAt)}</span>
              </div>
              <div className="chat-msg__text">{message.body}</div>
              {message.status === "sending" ? (
                <span className="hint">{t("chat.sending")}</span>
              ) : null}
              {message.status === "failed" && isLocalMessage(message) ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onRetry(message.id)}
                >
                  <RotateCw size={13} aria-hidden="true" />
                  {t("chat.retry")}
                </button>
              ) : null}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </PanelShell>
  );
}
