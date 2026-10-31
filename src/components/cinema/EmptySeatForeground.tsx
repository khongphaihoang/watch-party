"use client";

import { memo } from "react";

import type { Member } from "@/lib/room-types";
import { emptyFrontSeat, parseSeat } from "@/lib/seat-view";

/**
 * Lưng ghế trống ngay trước mặt người xem.
 *
 * Rạp thật: nếu hàng trước còn trống, bạn thấy lưng ghế chứ không thấy ai. Chỉ khi
 * ghế đó có người thì `CrowdForeground` mới vẽ người, và component này trả về null.
 */
export const EmptySeatForeground = memo(function EmptySeatForeground({
  members,
  viewerId,
  viewerSeatId,
  active,
}: {
  members: Member[];
  viewerId: string;
  viewerSeatId?: string;
  active: boolean;
}) {
  const viewerSeat = parseSeat(viewerSeatId);
  const emptySeat = emptyFrontSeat(members, viewerId, viewerSeat);

  if (!emptySeat) {
    return null;
  }

  return (
    <div className={`crowd crowd--empty ${active ? "is-on" : ""}`} aria-hidden="true">
      <span className="crowd__chair">
        <span className="crowd__chair-back" />
        <span className="crowd__chair-head" />
      </span>
    </div>
  );
});
