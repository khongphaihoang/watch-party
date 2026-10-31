import type { SeatStatus } from "./room-types";

/**
 * Số đo thế giới 3D (px CSS). Hệ toạ độ CSS: +X sang phải, +Y xuống, +Z về phía người xem.
 * Mọi giá trị trong file này là toạ độ *thế giới*, không phải px trên màn hình.
 */
export const PERSPECTIVE_PX = 1500;

/**
 * Toàn bộ trục Y của thế giới tính theo `vh` để bố cục giữ tỉ lệ khi đổi chiều cao
 * cửa sổ. `--row-y` và transform của mặt phẳng đều dùng đơn vị này.
 */
export const FLOOR_Y_VH = 50;

/** Mép xa / gần của dải hàng ghế. */
export const FAR_Z = -1560;
export const NEAR_Z = -220;

/** Chênh cao giữa hàng xa nhất và hàng gần nhất (sàn dốc kiểu rạp). */
export const ROW_RISE_VH = 10.5;

/**
 * Màn chiếu. Kích thước thật của mặt phẳng nằm trong `globals.css` (`.stage`
 * khai báo `--screen-h`, `--screen-ph`, `--screen-pw`) vì nó co giãn theo viewport.
 * `SCREEN_Z` phải khớp `transform` của `.screen` và luôn nằm **sau** hàng ghế xa
 * nhất (`FAR_Z`) để ghế không bao giờ bị chính màn chiếu che mất.
 */
export const SCREEN_Z = -1600;
export const SCREEN_SCALE = PERSPECTIVE_PX / (PERSPECTIVE_PX - SCREEN_Z);


export const SEAT = {
  width: 58,
  height: 96,
  gap: 16,
} as const;

/** Lưới ghế logic. Bố cục hiển thị chỉ cắt một cửa sổ của lưới này. */
export const GRID = { rows: 6, cols: 16 } as const;

export type ViewportTier = "compact" | "medium" | "wide";

export interface TierWindow {
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
}

export const TIER_WINDOW: Record<ViewportTier, TierWindow> = {
  wide: { rowStart: 0, rowEnd: 4, colStart: 0, colEnd: 15 },
  medium: { rowStart: 1, rowEnd: 4, colStart: 1, colEnd: 14 },
  compact: { rowStart: 3, rowEnd: 4, colStart: 4, colEnd: 11 },
};

export interface SeatCell {
  id: string;
  row: number;
  col: number;
  status: SeatStatus;
  memberId?: string;
}

export function seatId(row: number, col: number): string {
  return `r${row}c${col}`;
}

/** Lưới ghế trống đầy đủ — dùng làm dữ liệu mock. */
export function buildSeatGrid(): SeatCell[] {
  const seats: SeatCell[] = [];
  for (let row = 0; row < GRID.rows; row += 1) {
    for (let col = 0; col < GRID.cols; col += 1) {
      seats.push({ id: seatId(row, col), row, col, status: "empty" });
    }
  }
  return seats;
}

export interface RowTransform {
  z: number;
  yVh: number;
}

/**
 * Hàng `0` ở xa màn chiếu nhất. Vì parent dùng `preserve-3d` + `perspective`,
 * chỉ cần đặt `translateZ`; tỉ lệ phóng đại do trình duyệt tự tính.
 */
export function rowTransform(row: number): RowTransform {
  const t = row / Math.max(1, GRID.rows - 1);
  const z = FAR_Z + (NEAR_Z - FAR_Z) * t;
  const yVh = FLOOR_Y_VH - ROW_RISE_VH * (1 - t);
  return { z, yVh };
}

/** Tỉ lệ phóng đại của một lớp ở độ sâu `z` (z âm) dưới perspective hiện tại. */
export function depthScale(z: number): number {
  return PERSPECTIVE_PX / (PERSPECTIVE_PX - z);
}

export function rowWidth(seatCount: number): number {
  return seatCount * SEAT.width + Math.max(0, seatCount - 1) * SEAT.gap;
}

export function visibleRows(tier: ViewportTier): number[] {
  const { rowStart, rowEnd } = TIER_WINDOW[tier];
  const rows: number[] = [];
  for (let row = rowStart; row <= rowEnd; row += 1) rows.push(row);
  return rows;
}

export function visibleCols(tier: ViewportTier): number[] {
  const { colStart, colEnd } = TIER_WINDOW[tier];
  const cols: number[] = [];
  for (let col = colStart; col <= colEnd; col += 1) cols.push(col);
  return cols;
}
