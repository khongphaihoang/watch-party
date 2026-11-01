const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Chỉ những host này mới được coi là YouTube; tránh `evil.com/youtube.com/...`. */
const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const PATH_PREFIXES = new Set(["embed", "live", "shorts", "v"]);

function toVideoId(value: string | undefined | null): string | null {
  return value && VIDEO_ID_RE.test(value) ? value : null;
}

/** Nhận link YouTube đầy đủ hoặc chính id 11 ký tự. Trả `null` khi không nhận ra. */
export function parseYouTubeId(input: string): string | null {
  const value = input.trim();
  if (value.length === 0) return null;
  if (VIDEO_ID_RE.test(value)) return value;

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) return null;

  if (host === "youtu.be") {
    return toVideoId(url.pathname.split("/").filter(Boolean)[0]);
  }

  const fromQuery = toVideoId(url.searchParams.get("v"));
  if (fromQuery) return fromQuery;

  const [, prefix, id] = url.pathname.split("/");
  if (prefix && PATH_PREFIXES.has(prefix)) {
    return toVideoId(id);
  }
  return null;
}

export function youTubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
