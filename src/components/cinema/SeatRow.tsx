"use client";

import type { CSSProperties } from "react";
import type { Member } from "@/lib/room-types";
import { depthScale, rowTransform, type SeatCell } from "@/lib/theater-layout";
import { Seat } from "./Seat";

export function SeatRow({
  row,
  seats,
  membersById,
  speakingIds,
  onSelect,
}: {
  row: number;
  seats: SeatCell[];
  membersById: Map<string, Member>;
  speakingIds: string[];
  onSelect: (row: number, col: number) => void;
}) {
  const { z, yVh } = rowTransform(row);
  // Tooltip nằm trong không gian 3D nên bị thu nhỏ theo độ sâu; bù lại để chữ
  // luôn đọc được ở mọi hàng ghế.
  const tipScale = 1 / depthScale(z);

  return (
    <div
      className="seat-row"
      style={
        {
          "--row-z": `${z}px`,
          "--row-y": `${yVh}vh`,
          "--tip-scale": tipScale.toFixed(3),
        } as CSSProperties
      }
    >
      {seats.map((seat) => (
        <Seat
          key={seat.id}
          row={seat.row}
          col={seat.col}
          status={seat.status}
          member={seat.memberId ? membersById.get(seat.memberId) : undefined}
          speaking={Boolean(seat.memberId && speakingIds.includes(seat.memberId))}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
