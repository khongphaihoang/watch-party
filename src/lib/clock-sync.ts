/**
 * Đo lệch đồng hồ client ↔ server bằng `sync:ping` (NTP-like đơn giản).
 * Hàm thuần để unit test; việc gửi ping nằm ở `lib/api/realtime.ts`.
 */

export interface PingSample {
  /** Client gửi lúc t0. */
  t0: number;
  /** `serverTime` server trả về. */
  t1: number;
  /** Client nhận lúc t2. */
  t2: number;
}

export function offsetFromSample(sample: PingSample): number | null {
  const { t0, t1, t2 } = sample;
  const rtt = t2 - t0;
  if (!Number.isFinite(rtt) || rtt < 0) return null;
  const offset = t1 - (t0 + rtt / 2);
  return Number.isFinite(offset) ? offset : null;
}

/** Trung vị của các mẫu hợp lệ; cần ít nhất 3 mẫu mới đủ tin cậy. */
export function pickServerOffset(samples: PingSample[]): number | null {
  const offsets = samples
    .map(offsetFromSample)
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  if (offsets.length < 3) return null;
  const middle = Math.floor(offsets.length / 2);
  return offsets.length % 2 === 0
    ? (offsets[middle - 1] + offsets[middle]) / 2
    : offsets[middle];
}

export const CLOCK_SAMPLES = 5;
export const CLOCK_SAMPLE_GAP_MS = 200;
export const CLOCK_REFRESH_MS = 60_000;
