"use client";

import { memo } from "react";
import { MicOff } from "lucide-react";
import { initials } from "@/lib/format";
import { useT, type MessageKey } from "@/lib/i18n";
import type { Member, SeatStatus } from "@/lib/room-types";
import { AvatarFigure } from "./AvatarFigure";

const STATUS_LABEL: Record<SeatStatus, MessageKey> = {
  empty: "seat.statusEmpty",
  occupied: "seat.statusOccupied",
  mine: "seat.statusMine",
  held: "seat.statusHeld",
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
  const t = useT();
  const statusLabel = t(STATUS_LABEL[status]);
  const label = member
    ? t("seat.ariaWithMember", {
        row: row + 1,
        col: col + 1,
        status: statusLabel,
        name: member.displayName,
      })
    : t("seat.aria", { row: row + 1, col: col + 1, status: statusLabel });

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
              {member.isHost ? <span className="seat-tip__tag">{t("seat.host")}</span> : null}
            </span>
            <span className="seat-tip__meta">
              <span className="seat-tip__online" />
              {t("seat.inRoom")}
              <span className="seat-tip__sep">·</span>
              {member.micOn === false ? (
                <span className="seat-tip__mic is-off">
                  <MicOff size={10} aria-hidden="true" /> {t("seat.micOff")}
                </span>
              ) : (
                <span className="seat-tip__mic">{t("seat.micOn")}</span>
              )}
            </span>
          </span>
        </span>
      ) : null}

      {status === "mine" ? (
        <span className="seat__badge">{member?.displayName || t("common.you")}</span>
      ) : null}
    </button>
  );
}

export const Seat = memo(SeatBase);

