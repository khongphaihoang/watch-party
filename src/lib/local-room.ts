/**
 * Dữ liệu cục bộ của Cinema UI, không phải nguồn sự thật của phòng.
 *
 * Phase 4: hàng chờ, chat và bình chọn bỏ qua **không còn** dữ liệu mẫu — cả ba đọc
 * thẳng từ server (`RoomSnapshot` + `chat:message`). Ở đây chỉ còn ví điểm của Phase 5.
 */

export interface LocalRoomData {
  walletPoints: number;
}

/** Chỉ dùng nội bộ store — không phải nguồn sự thật của phòng. */
export function createLocalRoomData(): LocalRoomData {
  return { walletPoints: 250 };
}
