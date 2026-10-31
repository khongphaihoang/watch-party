import type { Locale } from "@/lib/locale-store";

/**
 * Cờ vẽ bằng SVG nội tuyến, không dùng emoji 🇻🇳 / 🇬🇧 — emoji cờ không hiển thị
 * trên Windows và không theo được token màu của giao diện.
 */
export function FlagIcon({
  locale,
  size = 18,
}: {
  locale: Locale;
  size?: number;
}) {
  if (locale === "vi") {
    return (
      <svg
        width={size}
        height={Math.round((size * 2) / 3)}
        viewBox="0 0 30 20"
        aria-hidden="true"
        focusable="false"
        style={{ display: "block", borderRadius: 2 }}
      >
        <rect width="30" height="20" fill="#DA251D" />
        <path
          fill="#FFFF00"
          d="M15 3.6l1.94 5.98h6.29l-5.09 3.7 1.94 5.98L15 15.56l-5.08 3.7 1.94-5.98-5.09-3.7h6.29z"
        />
      </svg>
    );
  }

  // Union Jack rút gọn — đủ để nhận diện "tiếng Anh" ở cỡ 18–20 px.
  return (
    <svg
      width={size}
      height={Math.round((size * 2) / 3)}
      viewBox="0 0 30 20"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", borderRadius: 2 }}
    >
      <rect width="30" height="20" fill="#012169" />
      <path d="M0 0l30 20M30 0L0 20" stroke="#FFFFFF" strokeWidth="4" />
      <path d="M0 0l30 20M30 0L0 20" stroke="#C8102E" strokeWidth="1.6" />
      <path d="M15 0v20M0 10h30" stroke="#FFFFFF" strokeWidth="6.6" />
      <path d="M15 0v20M0 10h30" stroke="#C8102E" strokeWidth="3.4" />
    </svg>
  );
}
