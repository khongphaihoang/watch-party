"use client";

import { Armchair } from "lucide-react";
import type { Member } from "@/lib/room-types";
import { GRID, seatId, type SeatCell } from "@/lib/theater-layout";
import { PanelShell } from "./PanelShell";

export function SeatsPanel({
  seats,
  members,
  onTakeSeat,
  onClose,
}: {
  seats: SeatCell[];
  members: Member[];
  onTakeSeat: (row: number, col: number) => void;
  onClose: () => void;
}) {
  const mine = members.find((member) => member.displayName === "Bạn");

  return (
    <PanelShell
      title="Chọn ghế"
      subtitle={mine?.seatId ? `Bạn đang ở ${describeSeat(mine.seatId)}` : "Bạn chưa chọn ghế"}
      onClose={onClose}
      footer={
        <p className="hint" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Armchair size={13} aria-hidden="true" />
          Bấm vào ghế trong sơ đồ hoặc bấm trực tiếp vào ghế trong rạp 3D.
        </p>
      }
    >
      <div className="seat-map">
        <div className="seat-map__screen" aria-hidden="true" />
        <span className="eyebrow" style={{ marginBottom: 4 }}>
          Màn chiếu
        </span>
        {/* Bỏ hàng ghế cuối cùng, chỉ hiển thị 5 hàng ghế tương ứng với rạp 3D */}
        {Array.from({ length: GRID.rows - 1 }).map((_, row) => (
          <div key={row} className="seat-map__row">
            {Array.from({ length: GRID.cols }).map((__, col) => {
              const id = seatId(row, col);
              const seat = seats.find((cell) => cell.id === id);
              const status = seat?.status ?? "empty";
              return (
                <button
                  key={id}
                  type="button"
                  className={`seat-map__btn ${
                    status === "mine"
                      ? "is-mine"
                      : status === "occupied"
                        ? "is-occupied"
                        : status === "held"
                          ? "is-blocked"
                          : ""
                  }`}
                  title={`Hàng ${row + 1} số ${col + 1}`}
                  aria-label={`Hàng ${row + 1} số ${col + 1} — ${
                    status === "empty" ? "trống" : status === "mine" ? "của bạn" : "đã có người"
                  }`}
                  onClick={() => onTakeSeat(row, col)}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="field" style={{ marginTop: 8 }}>
        <span className="field__label">Chú thích</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 11.5 }}>
          <Legend className="" label="Còn trống" />
          <Legend className="is-occupied" label="Đã có người" />
          <Legend className="is-mine" label="Của bạn" />
        </div>
      </div>
    </PanelShell>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        className={`seat-map__btn ${className}`}
        style={{ width: 14, height: 14, borderRadius: 4 }}
        aria-hidden="true"
      />
      <span style={{ color: "var(--text-dim)" }}>{label}</span>
    </span>
  );
}

function describeSeat(seatId: string): string {
  const match = seatId.match(/r(\d+)c(\d+)/);
  if (!match) return seatId;
  return `hàng ${Number(match[1]) + 1}, số ${Number(match[2]) + 1}`;
}
