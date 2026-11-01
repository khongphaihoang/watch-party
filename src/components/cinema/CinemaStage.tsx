"use client";

import { useMemo } from "react";
import { useT } from "@/lib/i18n";
import type { Member, NowPlaying, RoomMode, UiStatus, Viewpoint } from "@/lib/room-types";
import { parseSeat, seatPose } from "@/lib/seat-view";
import type { SeatCell, ViewportTier } from "@/lib/theater-layout";
import { seatId, visibleCols, visibleRows } from "@/lib/theater-layout";
import { ScreenSurface } from "./ScreenSurface";
import { SeatRow } from "./SeatRow";

export function CinemaStage({
  tier,
  viewpoint,
  mode,
  seats,
  members,
  nowPlaying,
  ui,
  viewerSeatId,
  isHost,
  speakingIds,
  onSeatSelect,
  onOpenVideoPicker,
}: {
  tier: ViewportTier;
  viewpoint: Viewpoint;
  mode: RoomMode;
  seats: SeatCell[];
  members: Member[];
  nowPlaying: NowPlaying | null;
  ui: UiStatus;
  viewerSeatId?: string;
  isHost: boolean;
  speakingIds: string[];
  onSeatSelect: (row: number, col: number) => void;
  onOpenVideoPicker: () => void;
}) {
  const t = useT();
  const membersById = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members],
  );

  // Góc máy "từ ghế" phụ thuộc đúng ghế người xem đang ngồi: lệch trái/phải thì
  // màn chiếu nghiêng theo, ngồi gần màn thì camera tiến lên và ngước cao hơn.
  const pose = useMemo(() => seatPose(parseSeat(viewerSeatId)), [viewerSeatId]);

  const rows = useMemo(() => {
    const cols = visibleCols(tier);
    const byCell = new Map(seats.map((seat) => [seat.id, seat]));
    return visibleRows(tier).map((row) => ({
      row,
      seats: cols
        .map((col) => byCell.get(seatId(row, col)))
        .filter((seat): seat is SeatCell => Boolean(seat)),
    }));
  }, [seats, tier]);

  return (
    <div
      className={`stage v-${viewpoint} t-${tier} ${mode === "flat" ? "stage--flat" : ""}`}
      style={
        {
          "--seat-yaw": `${pose.yawDeg}deg`,
          "--seat-pitch": `${pose.pitchDeg}deg`,
          "--seat-x": `${pose.shiftX}px`,
          "--seat-y": `${pose.shiftY}vh`,
          "--seat-z": `${pose.pushZ}px`,
          "--seat-screen-scale": pose.screenScale,
        } as React.CSSProperties
      }
      aria-label={t("stage.aria")}
    >
      {/* Vỏ rạp và màn chiếu nằm ở hai lớp 3D riêng để sàn/trần không bao giờ
          cắt lên mặt phẳng video, trong khi vẫn dùng chung một phối cảnh. */}
      <div className="world world--shell" aria-hidden="true">
        <div className="plane wall-back" />
        <div className="plane wall-side wall-left" />
        <div className="plane wall-side wall-right" />
        <div className="plane ceiling" />
        <div className="plane floor" />
      </div>

      <div className="world world--stage">
        <div className="plane screen">
          <ScreenSurface
            nowPlaying={nowPlaying}
            ui={ui}
            isHost={isHost}
            onOpenVideoPicker={onOpenVideoPicker}
          />
        </div>

        {rows.map(({ row, seats: rowSeats }) => (
          <SeatRow
            key={row}
            row={row}
            seats={rowSeats}
            membersById={membersById}
            speakingIds={speakingIds}
            onSelect={onSeatSelect}
          />
        ))}
      </div>
    </div>
  );
}
