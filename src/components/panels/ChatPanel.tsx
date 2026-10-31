"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Send } from "lucide-react";
import { formatClock, initials } from "@/lib/format";
import type { RoomState } from "@/lib/room-types";
import { PanelShell } from "./PanelShell";

const QUICK = ["🍿", "🔥", "❤️", "👏"];
const MAX_LEN = 200;

export function ChatPanel({
  room,
  draft,
  onDraftChange,
  onSend,
  onClose,
}: {
  room: RoomState;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onClose: () => void;
}) {
  const [reactions, setReactions] = useState<Array<{ id: number; emoji: string }>>([]);
  const reactionId = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const colorByName = new Map(room.members.map((m) => [m.id, m.shirtColor]));
  const nearLimit = draft.length >= MAX_LEN - 20;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [room.messages.length]);

  useEffect(() => {
    if (reactions.length === 0) return;
    const timer = window.setTimeout(() => setReactions((list) => list.slice(1)), 1600);
    return () => window.clearTimeout(timer);
  }, [reactions]);

  return (
    <PanelShell
      title="Trò chuyện"
      subtitle={`${room.messages.length} tin nhắn · cả rạp cùng đọc`}
      onClose={onClose}
      footer={
        <div className="chat-compose">
          <div className="chat-reactions">
            {QUICK.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="chat-reaction"
                aria-label={`Thả ${emoji}`}
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
            <span className="chat-compose__hint">Enter để gửi</span>
          </div>
          <div className="chat-compose__row">
            <label htmlFor={inputId} className="sr-only">
              Tin nhắn cho cả rạp
            </label>
            <input
              id={inputId}
              className="input chat-compose__input"
              value={draft}
              maxLength={MAX_LEN}
              placeholder="Nhập tin nhắn rồi Enter…"
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
              Gửi
            </button>
          </div>
        </div>
      }
    >
      <div className="chat-list" role="log" aria-live="polite">
        {room.messages.map((message) => (
          <div key={message.id} className="chat-msg">
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
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </PanelShell>
  );
}
