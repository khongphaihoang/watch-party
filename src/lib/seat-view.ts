import type { Member } from "./room-types";
import { GRID, seatId } from "./theater-layout";

/**
 * Hình học của "góc nhìn từ ghế".
 *
 * Người xem ngồi ở một ghế cụ thể, nên góc máy phải phụ thuộc vào ghế đó: ngồi lệch
 * trái thì màn chiếu nghiêng về bên phải, ngồi sát màn thì màn chiếu lớn hơn và
 * phải ngước lên nhiều hơn. Toàn bộ phép tính ở đây là thuần số học, không đụng DOM.
 */

/** Ghế mà người xem đang ngồi (mặc định khi chưa chọn ghế). */
export const DEFAULT_SEAT = { row: 4, col: 8 } as const;

/** Ghế ngay trước mặt người xem — dùng để dựng tiền cảnh. */
export const FRONT_ROW_OFFSET = 1;

export interface SeatPose {
  row: number;
  col: number;
  /** -1 (lệch trái) … 0 (chính giữa) … 1 (lệch phải). */
  lateral: number;
  /** 0 (hàng xa nhất) … 1 (hàng gần màn chiếu nhất). */
  depth: number;
  /** Góc xoay ngang của khung nhìn, độ. */
  yawDeg: number;
  /** Góc ngước lên của khung nhìn, độ. */
  pitchDeg: number;
  /** Dịch ngang của thế giới, px. */
  shiftX: number;
  /** Dịch dọc của thế giới, vh. */
  shiftY: number;
  /** Đẩy camera về phía màn chiếu, px. */
  pushZ: number;
  /** Hệ số phóng đại màn chiếu so với góc nhìn toàn cảnh. */
  screenScale: number;
}

export function parseSeat(seatIdValue: string | undefined): { row: number; col: number } | null {
  if (!seatIdValue) return null;
  const match = seatIdValue.match(/^r(\d+)c(\d+)$/);
  if (!match) return null;
  const row = Number(match[1]);
  const col = Number(match[2]);
  if (!Number.isFinite(row) || !Number.isFinite(col)) return null;
  return { row, col };
}

/**
 * Quy đổi ghế → thông số camera. Ghế càng lệch tâm thì màn chiếu càng nghiêng;
 * ghế càng gần màn chiếu thì camera càng tiến lên và ngước lên cao hơn.
 */
export function seatPose(seat: { row: number; col: number } | null): SeatPose {
  const row = clamp(seat?.row ?? DEFAULT_SEAT.row, 0, GRID.rows - 1);
  const col = clamp(seat?.col ?? DEFAULT_SEAT.col, 0, GRID.cols - 1);

  const centerCol = (GRID.cols - 1) / 2;
  const lateral = centerCol === 0 ? 0 : (col - centerCol) / centerCol;
  const depth = GRID.rows <= 1 ? 0 : 1 - row / (GRID.rows - 1);

  return {
    row,
    col,
    lateral,
    depth,
    yawDeg: round(-lateral * 7.5),
    pitchDeg: round(1.6 + depth * 3.4),
    shiftX: round(-lateral * 9),
    shiftY: round(8 - depth * 2.4),
    pushZ: Math.round(200 + depth * 120),
    screenScale: round(1 + depth * 0.14),
  };
}

/** Ghế ngay trước mặt người xem (cùng cột, hàng gần màn chiếu hơn). */
export function seatInFront(seat: { row: number; col: number } | null): string | null {
  const row = (seat?.row ?? DEFAULT_SEAT.row) - FRONT_ROW_OFFSET;
  const col = seat?.col ?? DEFAULT_SEAT.col;
  if (row < 0) return null;
  return seatId(row, col);
}

export interface ForegroundSlot {
  /** Ghế mà người này đang ngồi. */
  seatId: string;
  /** Vị trí ngang trên khung hình, %. */
  left: number;
  /** Độ cao so với đáy khung, vmin. */
  drop: number;
  scale: number;
  blur: number;
  order: number;
  /** `true` khi người này ngồi ngay trước mặt — vẽ to và rõ nhất. */
  front: boolean;
}

/**
 * Dựng tiền cảnh từ đúng những ghế có người ngồi.
 *
 * - Ghế ngay trước mặt (nếu có người) luôn là nhân vật lớn nhất, chính giữa.
 * - Các ghế trống **không** sinh ra ai; chúng được vẽ bằng lưng ghế trống
 *   (xem `CrowdForeground`), đúng như rạp thật.
 * - Người ngồi lệch trái/phải so với ghế của bạn sẽ lệch theo cùng hướng.
 */
export function foregroundSlots(
  members: Member[],
  viewerId: string,
  viewerSeat: { row: number; col: number } | null,
): ForegroundSlot[] {
  const centerCol = (GRID.cols - 1) / 2;
  const viewerCol = viewerSeat?.col ?? DEFAULT_SEAT.col;

  const candidates = members
    .filter((member) => member.id !== viewerId)
    .map((member) => ({ member, seat: parseSeat(member.seatId) }))
    .filter((entry): entry is { member: Member; seat: { row: number; col: number } } =>
      Boolean(entry.seat),
    )
    .filter((entry) => entry.seat.row < (viewerSeat?.row ?? DEFAULT_SEAT.row));

  const slots: ForegroundSlot[] = [];

  const front = candidates.find((entry) => entry.seat.row === (viewerSeat?.row ?? DEFAULT_SEAT.row) - FRONT_ROW_OFFSET && entry.seat.col === viewerCol);
  if (front) {
    slots.push({
      seatId: front.member.seatId ?? "",
      left: 50,
      drop: 0,
      scale: 1.12,
      blur: 0,
      order: 20,
      front: true,
    });
  }

  const others = candidates
    .filter((entry) => !front || entry.member.id !== front.member.id)
    .sort((a, b) => {
      // Hàng gần người xem hơn đứng trước; cùng hàng thì gần tâm đứng trước.
      if (a.seat.row !== b.seat.row) return b.seat.row - a.seat.row;
      return Math.abs(a.seat.col - centerCol) - Math.abs(b.seat.col - centerCol);
    })
    .slice(0, 6);

  others.forEach((entry, index) => {
    const offset = (entry.seat.col - viewerCol) / Math.max(1, centerCol);
    const rowGap = (viewerSeat?.row ?? DEFAULT_SEAT.row) - entry.seat.row;
    const near = 1 / Math.max(1, rowGap);
    slots.push({
      seatId: entry.member.seatId ?? "",
      left: round(50 + offset * 46),
      drop: round(1.4 + (1 - near) * 3.2 + (index % 3) * 0.6),
      scale: round(0.74 + near * 0.22),
      blur: round((1 - near) * 1.2),
      order: 10 - index,
      front: false,
    });
  });

  return slots;
}

/** Ghế trống ngay trước mặt — vẽ lưng ghế để thấy "chỗ đó không có ai". */
export function emptyFrontSeat(
  members: Member[],
  viewerId: string,
  viewerSeat: { row: number; col: number } | null,
): string | null {
  const target = seatInFront(viewerSeat);
  if (!target) return null;
  const taken = members.some(
    (member) => member.id !== viewerId && member.seatId === target,
  );
  return taken ? null : target;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
