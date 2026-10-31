"use client";

import {
  BadgeCheck,
  Crop,
  Gamepad2,
  Gift,
  ImagePlus,
  Info,
  ListChecks,
  Mic,
  Users,
} from "lucide-react";
import { formatCount, initials } from "@/lib/format";
import type { PlaybackState, RoomState, UiStatus } from "@/lib/room-types";
import { PanelShell } from "./PanelShell";

export function MembersPanel({ room, onClose }: { room: RoomState; onClose: () => void }) {
  return (
    <PanelShell
      title="Trong rạp"
      subtitle={`${room.members.length} / ${room.capacity} ghế đã có người`}
      onClose={onClose}
    >
      <ul className="list">
        {room.members.map((member) => (
          <li key={member.id} className="row-item">
            <span
              className="chat-msg__avatar"
              style={{ background: member.shirtColor }}
              aria-hidden="true"
            >
              {initials(member.displayName)}
            </span>
            <span className="row-item__main">
              <span className="row-item__title">{member.displayName}</span>
              <span className="row-item__meta">
                {member.seatId ? describeSeat(member.seatId) : "chưa chọn ghế"}
              </span>
            </span>
            {member.isHost ? (
              <span className="chip chip--warn">
                <BadgeCheck size={11} aria-hidden="true" /> Chủ rạp
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </PanelShell>
  );
}

export function InfoPanel({
  room,
  onCopyLink,
  onClose,
}: {
  room: RoomState;
  onCopyLink: () => void;
  onClose: () => void;
}) {
  return (
    <PanelShell
      title="Thông tin phòng"
      subtitle="Rạp Nhà · bản demo Phase 1"
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary btn-block" onClick={onCopyLink}>
          Sao chép link phòng
        </button>
      }
    >
      <ul className="list">
        <InfoRow label="Tên phòng" value={room.title} />
        <InfoRow label="Mã phòng" value={room.code} />
        <InfoRow label="Đang chiếu" value={room.nowPlaying?.title ?? "Chưa có suất chiếu"} />
        <InfoRow label="Sức chứa" value={`${room.capacity} ghế`} />
        <InfoRow label="Đang có" value={`${room.members.length} người`} />
        <InfoRow label="Trạng thái" value={room.lifecycle === "live" ? "Đang chiếu" : "Đang chờ"} />
        <InfoRow label="Điểm của bạn" value={formatCount(room.walletPoints)} />
      </ul>
      <div className="row-item">
        <span style={{ color: "var(--text-faint)" }}>
          <Info size={18} aria-hidden="true" />
        </span>
        <span className="row-item__main">
          <span className="row-item__title">Giai đoạn hiện tại</span>
          <span className="row-item__meta">
            Phase 1 — Cinema UI với dữ liệu giả lập. Chưa có backend, chưa lưu dữ liệu thật.
          </span>
        </span>
      </div>
    </PanelShell>
  );
}

export function GamePanel({ onClose }: { onClose: () => void }) {
  return (
    <PanelShell
      title="Chơi game"
      subtitle="Chưa khả dụng trong Phase 1"
      onClose={onClose}
    >
      <Placeholder
        icon={<Gamepad2 size={26} aria-hidden="true" />}
        title="Mini-game trong rạp"
        body="Ghế đã sẵn sàng cho phần chơi chung: đoán phim, bắn chữ, co-op 2–4 người trên màn chiếu. Hạ tầng signaling sẽ đi qua kênh realtime ở Phase 4."
        items={[
          "Trạng thái nút: placeholder có chủ đích",
          "Không tạo nút trang trí không hành vi",
          "Sẽ mở khoá cùng Phase 4 — Realtime Interaction",
        ]}
      />
    </PanelShell>
  );
}

export function PhotosPanel({ onClose }: { onClose: () => void }) {
  return (
    <PanelShell
      title="Chia sẻ hình ảnh"
      subtitle="Chưa khả dụng trong Phase 1"
      onClose={onClose}
    >
      <Placeholder
        icon={<ImagePlus size={26} aria-hidden="true" />}
        title="Gửi ảnh lên màn chiếu"
        body="Ảnh JPG, PNG, WebP hoặc GIF tối đa 12MB sẽ được duyệt trước khi chiếu lên màn hình lớn cho cả rạp."
        items={[
          "Cần endpoint upload + kiểm duyệt",
          "Ảnh hiển thị tạm trên lớp màn chiếu, không che màn hình đang phát",
        ]}
      />
    </PanelShell>
  );
}

export function BoostPanel({ onClose }: { onClose: () => void }) {
  return (
    <PanelShell
      title="Ủng hộ chủ rạp"
      subtitle="Chưa khả dụng trong Phase 1"
      onClose={onClose}
    >
      <Placeholder
        icon={<Gift size={26} aria-hidden="true" />}
        title="Quà và ủng hộ"
        body="Bạn có thể gửi một phần quà nhỏ để cảm ơn chủ rạp. Số dư hiện tại là điểm demo, chưa gắn với giao dịch thật."
        items={[
          "Cần ví, lịch sử giao dịch và luồng duyệt",
          "Không xử lý thanh toán trong bản demo này",
        ]}
      />
    </PanelShell>
  );
}

const DEMO_STATES: Array<{
  label: string;
  ui?: UiStatus;
  playback?: PlaybackState;
}> = [
  { label: "1 · Đang tải phòng", ui: "loading" },
  { label: "2 · Phòng chưa có video", ui: "ready", playback: "idle" },
  { label: "3 · Đang phát video", ui: "ready", playback: "playing" },
  { label: "4 · Tạm dừng", ui: "ready", playback: "paused" },
  { label: "5 · Đang đồng bộ video", ui: "ready", playback: "buffering" },
  { label: "7 · Phòng đã đầy", ui: "full" },
  { label: "9 · Mất kết nối realtime", ui: "reconnecting" },
  { label: "10 · Không thể phát video", ui: "ready", playback: "error" },
  { label: "11 · Phòng đã kết thúc", ui: "ended" },
];

export function SettingsPanel({
  room,
  demoVoice,
  onSetUi,
  onSetPlayback,
  onToggleDemoVoice,
  onDemoJoin,
  onClose,
}: {
  room: RoomState;
  demoVoice: boolean;
  onSetUi: (ui: UiStatus) => void;
  onSetPlayback: (state: PlaybackState) => void;
  onToggleDemoVoice: () => void;
  onDemoJoin: () => void;
  onClose: () => void;
}) {
  return (
    <PanelShell
      title="Cài đặt phòng"
      subtitle="Bản demo — dùng để kiểm thử các trạng thái giao diện"
      onClose={onClose}
    >
      <div className="field">
        <span className="field__label">Trạng thái giao diện</span>
        <p className="hint">
          Yêu cầu Phase 1 cần đủ 11 trạng thái. Sáu trạng thái dữ liệu đổi ngay khi bấm;
          trạng thái 6 (đang chọn ghế) và 8 (vừa tham gia) nằm ở nút bên dưới.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {DEMO_STATES.map((state) => {
            const isActive =
              room.ui === state.ui &&
              (!state.playback || room.nowPlaying?.state === state.playback);
            return (
              <button
                key={state.label}
                type="button"
                className={`btn ${isActive ? "btn-primary" : "btn-secondary"}`}
                style={{ justifyContent: "flex-start" }}
                onClick={() => {
                  if (state.playback) onSetPlayback(state.playback);
                  if (state.ui) onSetUi(state.ui);
                }}
              >
                <ListChecks size={15} aria-hidden="true" />
                {state.label}
              </button>
            );
          })}
          <button
            type="button"
            className="btn btn-secondary"
            style={{ justifyContent: "flex-start" }}
            onClick={() => {
              onSetUi("ready");
              onSetPlayback("playing");
            }}
          >
            <Info size={15} aria-hidden="true" />
            Về trạng thái bình thường
          </button>
          <button
            type="button"
            className="btn btn-gold"
            style={{ justifyContent: "flex-start" }}
            onClick={onDemoJoin}
          >
            <Users size={15} aria-hidden="true" />
            8 · Mô phỏng vừa tham gia rạp
          </button>
        </div>
      </div>

      <div className="row-item">
        <span style={{ color: "var(--text-faint)" }}>
          <Crop size={18} aria-hidden="true" />
        </span>
        <span className="row-item__main">
          <span className="row-item__title">Trạng thái 6 · Đang chọn ghế</span>
          <span className="row-item__meta">
            Mở bảng &ldquo;Chọn ghế&rdquo; ở thanh công cụ bên trái hoặc nút ghế ở thanh dưới.
          </span>
        </span>
      </div>

      <div className="row-item">
        <span style={{ color: demoVoice ? "var(--accent)" : "var(--text-faint)" }}>
          <Mic size={18} aria-hidden="true" />
        </span>
        <span className="row-item__main">
          <span className="row-item__title">Hoạt động mic (giả lập)</span>
          <span className="row-item__meta">
            Phase 1 chưa có kênh thoại thật. Bật để xem vòng sáng và sóng âm quanh avatar
            đang nói — lớp realtime sẽ thay bằng trạng thái voice-activity.
          </span>
        </span>
      </div>
      <button
        type="button"
        className={`btn btn-block ${demoVoice ? "btn-gold" : "btn-secondary"}`}
        aria-pressed={demoVoice}
        onClick={onToggleDemoVoice}
      >
        <Mic size={15} aria-hidden="true" />
        {demoVoice ? "Đang mô phỏng mic" : "Đang tắt mô phỏng"}
      </button>
    </PanelShell>
  );
}

function Placeholder({
  icon,
  title,
  body,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  items: string[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 52,
          height: 52,
          borderRadius: 14,
          border: "1px solid var(--line)",
          background: "rgba(255,255,255,0.03)",
          color: "var(--accent)",
        }}
      >
        {icon}
      </span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        <p className="hint" style={{ marginTop: 4 }}>
          {body}
        </p>
      </div>
      <ul className="list">
        {items.map((item) => (
          <li key={item} className="row-item">
            <span className="row-item__main">
              <span className="row-item__meta">{item}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="row-item">
      <span className="row-item__main">
        <span className="row-item__meta">{label}</span>
        <span className="row-item__title">{value}</span>
      </span>
    </li>
  );
}

function describeSeat(seatId: string): string {
  const match = seatId.match(/r(\d+)c(\d+)/);
  if (!match) return seatId;
  return `Hàng ${Number(match[1]) + 1}, số ${Number(match[2]) + 1}`;
}
