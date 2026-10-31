"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Banknote,
  Building2,
  Check,
  Coffee,
  Copy,
  Crown,
  Heart,
  QrCode,
  ShieldCheck,
  Sparkles,
  Ticket,
  User,
  type LucideIcon,
} from "lucide-react";
import { PanelShell } from "./PanelShell";
import { useAuthStore } from "@/lib/auth-store";
import { useRoomStore } from "@/lib/room-store";

interface BoostPreset {
  amount: number;
  label: string;
  desc: string;
  icon: LucideIcon;
}

const PRESETS: BoostPreset[] = [
  { amount: 10000, label: "10.000đ", desc: "Cốc nước mát", icon: Coffee },
  { amount: 20000, label: "20.000đ", desc: "Bắp rang bơ", icon: Ticket },
  { amount: 50000, label: "50.000đ", desc: "Vé VIP Rạp", icon: Sparkles },
  { amount: 100000, label: "100.000đ", desc: "Tiếp lửa Vàng", icon: Crown },
];

export function BoostPanel({ onClose }: { onClose: () => void }) {
  const user = useAuthStore((state) => state.user);
  const room = useRoomStore((state) => state.room);
  const pushToast = useRoomStore((state) => state.pushToast);

  const [selectedAmount, setSelectedAmount] = useState<number>(20000);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Xác định tên người ủng hộ hiển thị trong nội dung chuyển khoản
  const viewerName = useMemo(() => {
    if (user?.displayName) return user.displayName;
    const viewer = room?.members.find((m) => m.id === room.viewerId);
    if (viewer?.displayName && viewer.displayName !== "Bạn") return viewer.displayName;
    return "khanza";
  }, [user, room]);

  // Chuẩn hóa nội dung chuyển khoản (không dấu, viết hoa)
  const normalizedTransferNote = useMemo(() => {
    const raw = `${viewerName} DA UNG HO`;
    return raw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toUpperCase();
  }, [viewerName]);

  const bankInfo = {
    bankName: "Techcombank",
    bankFullName: "Ngân hàng TMCP Kỹ Thương Việt Nam",
    accountHolder: "BUI DUY HOANG",
    accountNumber: "19073812985017",
  };

  async function handleCopy(text: string, fieldKey: string, fieldName: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      pushToast(`Đã sao chép ${fieldName}!`, "ok");
      setTimeout(() => setCopiedField(null), 2500);
    } catch {
      pushToast(`Không thể sao chép tự động. Hãy sao chép thủ công nhé!`, "warn");
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
  }

  return (
    <PanelShell
      title="Tiếp Lửa Rạp Chiếu"
      subtitle="Ủng hộ để chủ rạp duy trì hoạt động"
      onClose={onClose}
      className="sheet--boost"
      footer={
        <div className="boost-foot">
          <Heart size={14} className="text-red-400" aria-hidden="true" />
          <span>Mọi đóng góp đều được vinh danh và dùng để nâng cấp chất lượng phòng chiếu.</span>
        </div>
      }
    >
      <div className="boost-layout">
        {/* ===================== CỘT TRÁI: CHIẾC VÉ QR ĐIỆN ẢNH ===================== */}
        <div className="boost-ticket">
          <div className="boost-ticket__inner">
            {/* Header thẻ vé */}
            <div className="boost-ticket__header">
              <div className="boost-ticket__brand">
                <span className="boost-ticket__badge">TECHCOMBANK</span>
                <span className="boost-ticket__sub">Napas 247 · VietQR</span>
              </div>
              <div className="boost-ticket__dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>

            {/* Khung quét mã QR */}
            <div className="boost-ticket__qr-box">
              {/* 4 góc định vị quét mã */}
              <div className="boost-ticket__corner boost-ticket__corner--tl" aria-hidden="true" />
              <div className="boost-ticket__corner boost-ticket__corner--tr" aria-hidden="true" />
              <div className="boost-ticket__corner boost-ticket__corner--bl" aria-hidden="true" />
              <div className="boost-ticket__corner boost-ticket__corner--br" aria-hidden="true" />

              {/* Ảnh QR */}
              <div className="boost-ticket__qr-img-wrapper">
                <Image
                  src="/qr-boost.jpg"
                  alt="Mã QR chuyển khoản ủng hộ Techcombank Napas 247"
                  width={240}
                  height={240}
                  className="boost-ticket__qr-img"
                  priority
                />
              </div>

              {/* Quét nhanh qua App Ngân hàng */}
              <div className="boost-ticket__scan-tag">
                <QrCode size={13} aria-hidden="true" />
                <span>Quét bằng mọi ứng dụng ngân hàng</span>
              </div>
            </div>

            {/* Vết cắt răng cưa vé phim (Perforation) */}
            <div className="boost-ticket__perforation" aria-hidden="true">
              <div className="boost-ticket__notch boost-ticket__notch--left" />
              <div className="boost-ticket__dash-line" />
              <div className="boost-ticket__notch boost-ticket__notch--right" />
            </div>

            {/* Số tiền ủng hộ */}
            <div className="boost-ticket__amount-box">
              <span className="boost-ticket__amount-label">Số tiền gửi tặng</span>
              <div className="boost-ticket__amount-val">
                {formatCurrency(selectedAmount)}
              </div>
            </div>
          </div>
        </div>

        {/* ===================== CỘT PHẢI: BẢNG THÔNG TIN THỤ HƯỞNG ===================== */}
        <div className="boost-details">
          {/* Preset chọn nhanh mức tiền */}
          <div className="boost-presets-group">
            <span className="boost-presets-title">
              <Sparkles size={14} className="text-amber-300" aria-hidden="true" />
              Chọn mức tiếp lửa nhanh:
            </span>
            <div className="boost-presets">
              {PRESETS.map((p) => {
                const Icon = p.icon;
                const isSelected = selectedAmount === p.amount;
                return (
                  <button
                    key={p.amount}
                    type="button"
                    className={`boost-preset-btn ${isSelected ? "boost-preset-btn--active" : ""}`}
                    onClick={() => setSelectedAmount(p.amount)}
                  >
                    <Icon size={14} aria-hidden />
                    <span className="boost-preset-btn__label">{p.label}</span>
                    <span className="boost-preset-btn__desc">{p.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dãy thẻ thông tin thụ hưởng */}
          <div className="boost-info-cards">
            {/* THẺ 1: NGÂN HÀNG THỤ HƯỞNG */}
            <div className="boost-info-card">
              <div className="boost-info-card__icon" aria-hidden="true">
                <Building2 size={18} />
              </div>
              <div className="boost-info-card__content">
                <span className="boost-info-card__label">NGÂN HÀNG THỤ HƯỞNG</span>
                <strong className="boost-info-card__val">{bankInfo.bankName}</strong>
                <span className="boost-info-card__sub">{bankInfo.bankFullName}</span>
              </div>
            </div>

            {/* THẺ 2: CHỦ TÀI KHOẢN */}
            <div className="boost-info-card">
              <div className="boost-info-card__icon" aria-hidden="true">
                <User size={18} />
              </div>
              <div className="boost-info-card__content">
                <span className="boost-info-card__label">CHỦ TÀI KHOẢN</span>
                <strong className="boost-info-card__val text-gold">{bankInfo.accountHolder}</strong>
              </div>
            </div>

            {/* THẺ 3: SỐ TÀI KHOẢN */}
            <div className="boost-info-card boost-info-card--interactive">
              <div className="boost-info-card__icon" aria-hidden="true">
                <Banknote size={18} />
              </div>
              <div className="boost-info-card__content">
                <span className="boost-info-card__label">SỐ TÀI KHOẢN</span>
                <strong className="boost-info-card__val boost-info-card__val--mono">
                  {bankInfo.accountNumber}
                </strong>
              </div>
              <button
                type="button"
                className={`boost-copy-btn ${
                  copiedField === "account" ? "boost-copy-btn--copied" : ""
                }`}
                onClick={() => handleCopy(bankInfo.accountNumber, "account", "Số tài khoản")}
                aria-label="Sao chép số tài khoản"
              >
                {copiedField === "account" ? (
                  <>
                    <Check size={14} aria-hidden="true" />
                    <span>Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} aria-hidden="true" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>

            {/* THẺ 4: NỘI DUNG CHUYỂN KHOẢN */}
            <div className="boost-info-card boost-info-card--interactive boost-info-card--highlight">
              <div className="boost-info-card__icon" aria-hidden="true">
                <Sparkles size={18} />
              </div>
              <div className="boost-info-card__content">
                <span className="boost-info-card__label">NỘI DUNG CHUYỂN KHOẢN</span>
                <strong className="boost-info-card__val boost-info-card__val--highlight">
                  {normalizedTransferNote}
                </strong>
                <span className="boost-info-card__sub">
                  Đã tự động điền theo tên ghế ({viewerName}) trong mã QR
                </span>
              </div>
              <button
                type="button"
                className={`boost-copy-btn ${
                  copiedField === "note" ? "boost-copy-btn--copied" : ""
                }`}
                onClick={() => handleCopy(normalizedTransferNote, "note", "Nội dung chuyển khoản")}
                aria-label="Sao chép nội dung chuyển khoản"
              >
                {copiedField === "note" ? (
                  <>
                    <Check size={14} aria-hidden="true" />
                    <span>Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} aria-hidden="true" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Ghi chú an toàn */}
          <div className="boost-safety-note">
            <ShieldCheck size={15} className="text-emerald-400" aria-hidden="true" />
            <span>Kiểm tra tên người nhận và số tiền trong ứng dụng ngân hàng trước khi xác nhận.</span>
          </div>
        </div>
      </div>
    </PanelShell>
  );
}
