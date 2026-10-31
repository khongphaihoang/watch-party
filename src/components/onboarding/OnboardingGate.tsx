"use client";

import { useEffect, useState } from "react";
import { CreateRoomDialog } from "./CreateRoomDialog";

const DISMISS_KEY = "rap-chieu:onboarded";

/**
 * Popup tạo rạp hiện một lần mỗi phiên trình duyệt. Vào bằng link chia sẻ
 * (`/room/[code]`) không đi qua đây nên khách mời không bị chặn.
 */
export function OnboardingGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      // Không đọc được storage thì vẫn hiện popup.
    }
    if (!dismissed) setOpen(true);
  }, []);

  if (!open) return null;

  return (
    <CreateRoomDialog
      onClose={() => {
        try {
          window.sessionStorage.setItem(DISMISS_KEY, "1");
        } catch {
          // Bỏ qua: chỉ là cờ nhớ tạm.
        }
        setOpen(false);
        // Popup không có nút "mở" nào để trả tiêu điểm về, nên đưa người dùng
        // bàn phím vào điểm đầu tiên của rạp thay vì để rơi về <body>.
        // Dùng timer thay vì requestAnimationFrame: rAF không chạy ở tab nền.
        window.setTimeout(() => {
          document.querySelector<HTMLElement>(".brand")?.focus();
        }, 0);
      }}
    />
  );
}
