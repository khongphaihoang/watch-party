import path from "node:path";

import type { NextConfig } from "next";

/** Header bảo mật tối thiểu cho mọi route. CSP đầy đủ xem docs/security.md. */
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  // Ảnh Docker chạy bằng server.js tự chứa thay vì cần toàn bộ node_modules.
  // Chỉ bật khi build cho container để `next start` ở local vẫn hoạt động bình thường.
  ...(process.env.NEXT_STANDALONE === "1"
    ? {
        output: "standalone" as const,
        // Monorepo: cố định gốc tracing là repo root để layout .next/standalone ổn định.
        outputFileTracingRoot: path.join(process.cwd(), ".."),
      }
    : {}),
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
