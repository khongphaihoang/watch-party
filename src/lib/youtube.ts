const VIDEO_ID_RE =
  /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/))([A-Za-z0-9_-]{11})/;

/** Nhận link YouTube đầy đủ hoặc chính id 11 ký tự. Trả `null` khi không nhận ra. */
export function parseYouTubeId(input: string): string | null {
  const value = input.trim();
  if (value.length === 0) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
  const match = value.match(VIDEO_ID_RE);
  return match ? match[1] : null;
}

export function youTubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
