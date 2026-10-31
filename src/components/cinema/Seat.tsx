"use client";

import { memo } from "react";
import { MicOff } from "lucide-react";
import { initials } from "@/lib/format";
import type { Member, SeatStatus } from "@/lib/room-types";
import { AvatarFigure } from "./AvatarFigure";

const STATUS_LABEL: Record<SeatStatus, string> = {
  empty: "còn trống",
  occupied: "đã có người",
  mine: "bạn đang ngồi",
  held: "đang được giữ chỗ",
};

function SeatBase({
  row,
  col,
  status,
  member,
  speaking = false,
  onSelect,
}: {
  row: number;
  col: number;
  status: SeatStatus;
  member?: Member;
  speaking?: boolean;
  onSelect: (row: number, col: number) => void;
}) {
  const label = `Hàng ${row + 1} số ${col + 1} — ${STATUS_LABEL[status]}${
    member ? `: ${member.displayName}` : ""
  }`;

  return (
    <button
      type="button"
      className={`seat seat--${status} ${speaking ? "is-speaking" : ""}`}
      aria-label={label}
      onClick={() => onSelect(row, col)}
    >
      <span className="seat__back">
        <span className="seat__headrest" />
      </span>

      {member ? (
        <AvatarFigure
          shirtColor={member.shirtColor}
          bodyStyle={member.bodyStyle}
          speaking={speaking}
        />
      ) : (
        <span className="seat__vacancy" aria-hidden="true" />
      )}

      {member ? (
        <span className="seat-tip" aria-hidden="true">
          <span className="seat-tip__avatar" style={{ background: member.shirtColor }}>
            {initials(member.displayName)}
          </span>
          <span className="seat-tip__body">
            <span className="seat-tip__name">
              {member.displayName}
              {member.isHost ? <span className="seat-tip__tag">chủ rạp</span> : null}
            </span>
            <span className="seat-tip__meta">
              <span className="seat-tip__online" />
              Trong rạp
              <span className="seat-tip__sep">·</span>
              {member.micOn === false ? (
                <span className="seat-tip__mic is-off">
                  <MicOff size={10} aria-hidden="true" /> Mic tắt
                </span>
              ) : (
                <span className="seat-tip__mic">Mic mở</span>
              )}
            </span>
          </span>
        </span>
      ) : null}

      {status === "mine" ? <span className="seat__badge">Bạn</span> : null}
    </button>
  );
}

export const Seat = memo(SeatBase);

