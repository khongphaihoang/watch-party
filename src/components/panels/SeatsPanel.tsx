"use client";

import { Armchair } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { Member } from "@/lib/room-types";
import { GRID, seatId, type SeatCell } from "@/lib/theater-layout";
import { PanelShell } from "./PanelShell";

export function SeatsPanel({
  seats,
  members,
  viewerId,
  onTakeSeat,
  onReleaseSeat,
  onClose,
}: {
  seats: SeatCell[];
  members: Member[];
  viewerId?: string;
  onTakeSeat: (row: number, col: number) => void;
  onReleaseSeat?: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const mine = members.find((member) => member.id === viewerId);

  return (
    <PanelShell
      title={t("dock.seats")}
      subtitle={
        mine?.seatId
          ? t("seats.subtitleAt", { seat: describeSeat(mine.seatId, t) })
          : t("seats.subtitleNone")
      }
      onClose={onClose}
      footer={
        <div style={{ display: "grid", gap: 8 }}>
          <p className="hint" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Armchair size={13} aria-hidden="true" />
            {t("seats.hint")}
          </p>
          {mine?.seatId && onReleaseSeat ? (
            <button type="button" className="btn btn-secondary btn-block" onClick={onReleaseSeat}>
              {t("seats.release")}
            </button>
          ) : null}
        </div>
      }
    >
      <div className="seat-map">
        <div className="seat-map__screen" aria-hidden="true" />
        <span className="eyebrow" style={{ marginBottom: 4 }}>
          {t("seats.screen")}
        </span>
        {/* Bỏ hàng ghế cuối cùng, chỉ hiển thị 5 hàng ghế tương ứng với rạp 3D */}
        {Array.from({ length: GRID.rows - 1 }).map((_, row) => (
          <div key={row} className="seat-map__row">
            {Array.from({ length: GRID.cols }).map((__, col) => {
              const id = seatId(row, col);
              const seat = seats.find((cell) => cell.id === id);
              const status = seat?.status ?? "empty";
              const state =
                status === "empty"
                  ? t("seats.stateEmpty")
                  : status === "mine"
                    ? t("seats.stateMine")
                    : t("seats.stateTaken");
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
                  title={t("seats.seatTitle", { row: row + 1, col: col + 1 })}
                  aria-label={`${t("seats.seatTitle", { row: row + 1, col: col + 1 })} — ${state}`}
                  onClick={() => onTakeSeat(row, col)}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="field" style={{ marginTop: 8 }}>
        <span className="field__label">{t("seats.legend")}</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 11.5 }}>
          <Legend className="" label={t("seats.legendEmpty")} />
          <Legend className="is-occupied" label={t("seats.legendTaken")} />
          <Legend className="is-mine" label={t("seats.legendMine")} />
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

function describeSeat(seatIdValue: string, t: ReturnType<typeof useT>): string {
  const match = seatIdValue.match(/r(\d+)c(\d+)/);
  if (!match) return seatIdValue;
  return t("seats.position", { row: Number(match[1]) + 1, col: Number(match[2]) + 1 });
}
