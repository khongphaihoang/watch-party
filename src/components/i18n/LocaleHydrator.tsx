"use client";

import { useEffect } from "react";
import { useLocaleStore } from "@/lib/locale-store";

/**
 * Áp lại ngôn ngữ đã lưu ngay khi ứng dụng chạy, cho mọi route — kể cả `/`
 * nơi popup tạo rạp xuất hiện trước khi người dùng vào phòng chiếu.
 */
export function LocaleHydrator() {
  const hydrate = useLocaleStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return null;
}
