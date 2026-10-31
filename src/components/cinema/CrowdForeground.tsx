"use client";

import { memo } from "react";

import type { Member } from "@/lib/room-types";
import { foregroundSlots, parseSeat, type ForegroundSlot } from "@/lib/seat-view";

/**
 * Tiền cảnh của "góc nhìn từ ghế": đúng những người đang ngồi phía trước bạn.
 *
 * Ghế trống không sinh ra ai — chỗ đó được vẽ bằng lưng ghế trống, giống rạp thật.
 * Dữ liệu lấy từ chính thành viên trong phòng nên màu áo và kiểu tóc khớp avatar.
 */
export const CrowdForeground = memo(function CrowdForeground({
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
  const slots = foregroundSlots(members, viewerId, viewerSeat);
  const bySeat = new Map(
    members.filter((member) => member.seatId).map((member) => [member.seatId as string, member]),
  );

  if (slots.length === 0) {
    return null;
  }

  return (
    <div className={`crowd ${active ? "is-on" : ""}`} aria-hidden="true">
      {slots.map((slot, index) => {
        const member = bySeat.get(slot.seatId);
        if (!member) return null;
        return <Person key={slot.seatId} slot={slot} member={member} index={index} />;
      })}
    </div>
  );
});

function Person({
  slot,
  member,
  index,
}: {
  slot: ForegroundSlot;
  member: Member;
  index: number;
}) {
  return (
    <span
      className={`crowd__person ${slot.front ? "is-front" : ""}`}
      style={{
        left: `${slot.left}%`,
        transform: `translateX(-50%) translateY(${slot.drop}vmin) scale(${slot.scale})`,
        filter: `brightness(${slot.front ? 0.62 : 0.5}) saturate(0.7) blur(${slot.blur}px)`,
        transitionDelay: `${index * 45}ms`,
        zIndex: slot.order,
      }}
    >
      <span className="crowd__head">
        <span
          className="crowd__hair"
          style={
            member.bodyStyle === "female"
              ? {
                  height: "11vmin",
                  width: "14.6vmin",
                  borderRadius: "50% 50% 34% 34% / 74% 74% 34% 34%",
                }
              : undefined
          }
        />
      </span>
      <span
        className="crowd__shoulders"
        style={{
          background: `linear-gradient(180deg, ${member.shirtColor}, ${member.shirtColor}aa)`,
        }}
      />
    </span>
  );
}
