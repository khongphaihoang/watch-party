import type { SkipVote } from "./room-types";

/** Số phiếu cần để thông qua: quá bán. Phòng < 2 người thì không bao giờ tự qua. */
export function thresholdFor(total: number): number {
  if (total < 2) return 0;
  return Math.floor(total / 2) + 1;
}

export function hasPassed(vote: Pick<SkipVote, "yes" | "total">): boolean {
  const threshold = thresholdFor(vote.total);
  return threshold > 0 && vote.yes >= threshold;
}

/**
 * Gộp `skipVote` nhận từ server vào bản cục bộ.
 *
 * `voted` là cờ của **chính người xem**, nên broadcast (mang `voted` của người vừa thao
 * tác) chỉ được dùng khi `adoptVoted = true`. Version thấp hơn bị bỏ qua để sự kiện đến
 * trễ không ghi đè lượt mới.
 */
export function mergeSkipVote(
  previous: SkipVote | null,
  incoming: SkipVote | null,
  options: { adoptVoted: boolean },
): SkipVote | null {
  if (!incoming) return null;
  if (!previous || previous.videoId !== incoming.videoId) {
    return options.adoptVoted ? incoming : { ...incoming, voted: false };
  }
  if (incoming.version < previous.version) return previous;
  return {
    ...incoming,
    voted: options.adoptVoted ? incoming.voted : previous.voted,
  };
}

/** Lượt bỏ phiếu chỉ thuộc về đúng `videoId` đang chiếu. */
export function voteBelongsTo(
  vote: SkipVote | null,
  videoId: string | undefined,
): boolean {
  return Boolean(vote && videoId && vote.videoId === videoId);
}
