/**
 * Gốc của API. Nhận cả hai dạng cấu hình phổ biến:
 * `http://localhost:4000` và `http://localhost:4000/api`.
 */
const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const API_ORIGIN = RAW_API_URL.replace(/\/+$/, "").replace(/\/api$/, "");

/** Dùng cho fetch: mọi path trong `lib/api/*` đều bắt đầu bằng `/api`. */
export const API_BASE_URL = API_ORIGIN;

export interface ApiErrorPayload {
  code: string;
  message: string;
}

/** Lỗi nghiệp vụ trả về từ API: `{ code, message }` kèm HTTP status. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

const RETRY_DELAYS_MS = [500, 1000, 2000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  /** Chỉ bật cho thao tác idempotent; tạo phòng phải tắt để không tạo trùng. */
  retry?: boolean;
}

async function parsePayload(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal, retry = true } = options;
  const maxAttempts = retry ? RETRY_DELAYS_MS.length + 1 : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        credentials: "include",
        cache: "no-store",
        signal,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      const payload = await parsePayload(response);

      if (!response.ok) {
        const shape = (payload ?? {}) as Partial<ApiErrorPayload>;
        throw new ApiError(
          shape.code ?? "INTERNAL_ERROR",
          shape.message ?? `Yêu cầu thất bại (${response.status}).`,
          response.status,
        );
      }

      return payload as T;
    } catch (error) {
      if (isAbortError(error)) throw error;

      const retryable = isApiError(error) ? error.status >= 500 : true;
      if (!retryable || attempt === maxAttempts) {
        if (isApiError(error)) throw error;
        throw new ApiError("NETWORK_ERROR", "Không kết nối được máy chủ rạp.", 0);
      }

      await sleep(RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)]);
    }
  }

  throw new ApiError("NETWORK_ERROR", "Không kết nối được máy chủ rạp.", 0);
}
