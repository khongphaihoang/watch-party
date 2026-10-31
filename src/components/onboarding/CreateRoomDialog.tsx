"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clapperboard,
  Copy,
  Link2,
  Share2,
  TriangleAlert,
  X,
} from "lucide-react";
import { generateRoomCode, saveRoomSetup, type RoomSetup } from "@/lib/room-setup";
import { parseYouTubeId, youTubeThumbnail } from "@/lib/youtube";
import { BrandMark } from "@/components/hud/RoomTopBar";

type Step = "name" | "video" | "share";

const STEP_ORDER: Step[] = ["name", "video", "share"];

const STEP_INDICATOR: Record<Step, string> = {
  name: "Tên rạp",
  video: "Video",
  share: "Chia sẻ",
};

const STEP_EYEBROW: Record<Step, string> = {
  name: "Bước 1 / 3",
  video: "Bước 2 / 3",
  share: "Bước 3 / 3",
};

interface SuggestedVideo {
  videoId: string;
  title: string;
  channelTitle: string;
}

const SUGGESTIONS: SuggestedVideo[] = [
  {
    videoId: "M7lc1UVf-VE",
    title: "Đêm phim cuối tuần — tập mở màn",
    channelTitle: "Rạp Nhà Studio",
  },
  {
    videoId: "aqz-KE-bpKQ",
    title: "Cuộc phiêu lưu của chú chim giấy",
    channelTitle: "Giấy & Gió",
  },
  {
    videoId: "ScMzIvxBSi4",
    title: "Phố đêm Sài Gòn, quay bằng tay",
    channelTitle: "Chuyện Phố",
  },
];

const TITLE_MIN = 3;
const TITLE_MAX = 40;

type FieldKey = "room-title" | "video";

interface FieldError {
  field: FieldKey;
  message: string;
}

export function CreateRoomDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const shareInputRef = useRef<HTMLInputElement>(null);

  const headingId = useId();
  const stepsId = useId();

  const [step, setStep] = useState<Step>("name");
  const [roomTitle, setRoomTitle] = useState("");
  const [hostName, setHostName] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [created, setCreated] = useState<RoomSetup | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyBlocked, setCopyBlocked] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  // Mỗi bước là một "trang" mới: đưa tiêu điểm về đầu nội dung để trình đọc
  // màn hình đọc đúng ngữ cảnh thay vì giữ nguyên vị trí cũ.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const resolvedVideo = useMemo<SuggestedVideo | null>(() => {
    if (pickedId) {
      const picked = SUGGESTIONS.find((item) => item.videoId === pickedId);
      if (picked) return picked;
    }
    const id = parseYouTubeId(videoUrl);
    if (id) {
      return { videoId: id, title: "Video từ YouTube", channelTitle: "Link bạn dán" };
    }
    return null;
  }, [pickedId, videoUrl]);

  const previewId = pickedId ?? parseYouTubeId(videoUrl);
  const videoTyped = videoUrl.trim().length > 0;

  function validateTitle(onBlur = false): FieldError[] {
    const value = roomTitle.trim();
    if (value.length === 0) {
      return onBlur
        ? []
        : [{ field: "room-title", message: "Nhập tên rạp để cả hội nhận ra phòng." }];
    }
    if (value.length < TITLE_MIN) {
      return [
        { field: "room-title", message: `Tên rạp cần ít nhất ${TITLE_MIN} ký tự.` },
      ];
    }
    return [];
  }

  function validateVideo(): FieldError[] {
    if (resolvedVideo) return [];
    return videoTyped
      ? [
          {
            field: "video",
            message: "Link chưa đúng dạng YouTube. Dán link youtube.com/watch?v=… hoặc youtu.be/…",
          },
        ]
      : [{ field: "video", message: "Chọn một video gợi ý hoặc dán link YouTube." }];
  }

  function focusField(field: FieldKey) {
    if (field === "room-title") titleInputRef.current?.focus();
    else videoInputRef.current?.focus();
  }

  function createRoom() {
    if (!resolvedVideo) return;
    const setup: RoomSetup = {
      code: generateRoomCode(),
      title: roomTitle.trim(),
      hostName: hostName.trim() || "Bạn",
      videoId: resolvedVideo.videoId,
      videoTitle: resolvedVideo.title,
      channelTitle: resolvedVideo.channelTitle,
      createdAt: Date.now(),
    };
    saveRoomSetup(setup);
    setCreated(setup);
    setShareUrl(`${window.location.origin}/room/${setup.code}`);
    setStep("share");
  }

  function goNext() {
    if (step === "name") {
      const nextErrors = validateTitle();
      setErrors(nextErrors);
      if (nextErrors.length === 0) setStep("video");
      return;
    }
    if (step === "video") {
      const nextErrors = validateVideo();
      setErrors(nextErrors);
      if (nextErrors.length === 0) createRoom();
      return;
    }
    enterRoom();
  }

  function goBack() {
    setErrors([]);
    if (step === "video") setStep("name");
    else if (step === "share") setStep("video");
  }

  function enterRoom() {
    if (!created) return;
    onClose();
    router.push(`/room/${created.code}`);
  }

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyBlocked(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      // Trình duyệt có thể chặn clipboard (tab nền, quyền bị từ chối).
      // Chọn sẵn nội dung và nói rõ bước tiếp theo thay vì im lặng.
      shareInputRef.current?.focus();
      shareInputRef.current?.select();
      setCopyBlocked(true);
      window.setTimeout(() => setCopyBlocked(false), 5000);
    }
  }

  async function shareLink() {
    if (!created || !shareUrl) return;
    try {
      await navigator.share({
        title: created.title,
        text: `Vào rạp "${created.title}" xem cùng mình nhé!`,
        url: shareUrl,
      });
    } catch {
      // Người dùng huỷ hộp chia sẻ của hệ điều hành — không cần báo lỗi.
    }
  }

  useEffect(() => {
    if (errors.length > 0) summaryRef.current?.focus();
  }, [errors]);

  const stepIndex = STEP_ORDER.indexOf(step);
  const primaryLabel = step === "name" ? "Tiếp tục" : step === "video" ? "Tạo rạp" : "Vào rạp";

  return (
    <dialog
      ref={dialogRef}
      className="onboard"
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <form
        className="onboard__inner"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          goNext();
        }}
      >
        <header className="onboard__head">
          <span className="onboard__brand">
            <span className="brand__mark" aria-hidden="true">
              <BrandMark />
            </span>
            <span>
              <span className="onboard__brand-name">Rạp Nhà</span>
              <span className="onboard__brand-sub">Tạo rạp trong 3 bước</span>
            </span>
          </span>
          <button
            type="button"
            className="onboard__close"
            onClick={onClose}
            aria-label="Đóng và xem rạp demo"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <ol className="onboard__steps" id={stepsId}>
          {STEP_ORDER.map((item, index) => {
            const state = index < stepIndex ? "done" : index === stepIndex ? "current" : "todo";
            return (
              <li
                key={item}
                className="onboard__step"
                data-state={state}
                aria-current={state === "current" ? "step" : undefined}
              >
                <span className="onboard__step-dot" aria-hidden="true">
                  {state === "done" ? <Check size={11} strokeWidth={3} /> : index + 1}
                </span>
                <span className="onboard__step-label">{STEP_INDICATOR[item]}</span>
              </li>
            );
          })}
        </ol>

        <div className="onboard__body">
          {errors.length > 0 ? (
            <div className="onboard__error" role="alert" tabIndex={-1} ref={summaryRef}>
              <p className="onboard__error-title">
                <TriangleAlert size={13} aria-hidden="true" />
                Còn {errors.length} mục cần sửa
              </p>
              <ul>
                {errors.map((error) => (
                  <li key={error.field}>
                    <a
                      href={`#${error.field}`}
                      onClick={(event) => {
                        event.preventDefault();
                        focusField(error.field);
                      }}
                    >
                      {error.message}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {step === "name" ? (
            <>
              <span className="onboard__eyebrow">{STEP_EYEBROW.name}</span>
              <h2 className="onboard__title" tabIndex={-1} ref={headingRef} id={headingId}>
                Rạp của bạn tên gì?
              </h2>
              <p className="onboard__lead">
                Cả hội sẽ thấy tên này ở đầu rạp. Chọn một cái tên dễ gọi khi rủ bạn bè.
              </p>

              <div className="field">
                <label className="field__label" htmlFor="room-title">
                  Tên rạp
                </label>
                <input
                  id="room-title"
                  ref={titleInputRef}
                  className="input"
                  type="text"
                  value={roomTitle}
                  maxLength={TITLE_MAX}
                  placeholder="Đêm phim của hội mình"
                  autoComplete="off"
                  aria-invalid={errors.some((error) => error.field === "room-title")}
                  aria-describedby="room-title-hint"
                  onChange={(event) => {
                    setRoomTitle(event.target.value);
                    setErrors([]);
                  }}
                  onBlur={() => {
                    if (roomTitle.trim().length > 0 && validateTitle().length > 0) {
                      setErrors(validateTitle());
                    }
                  }}
                />
                <p className="hint" id="room-title-hint">
                  {TITLE_MIN}–{TITLE_MAX} ký tự. Còn {TITLE_MAX - roomTitle.length} ký tự.
                </p>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="room-host">
                  Tên của bạn <span className="field__optional">không bắt buộc</span>
                </label>
                <input
                  id="room-host"
                  className="input"
                  type="text"
                  value={hostName}
                  maxLength={16}
                  placeholder="Bạn"
                  autoComplete="nickname"
                  onChange={(event) => setHostName(event.target.value)}
                />
                <p className="hint">Hiện trên avatar và trong khung chat. Mặc định là “Bạn”.</p>
              </div>
            </>
          ) : null}

          {step === "video" ? (
            <>
              <span className="onboard__eyebrow">{STEP_EYEBROW.video}</span>
              <h2 className="onboard__title" tabIndex={-1} ref={headingRef} id={headingId}>
                Cả rạp xem gì tối nay?
              </h2>
              <p className="onboard__lead">
                Dán link video hoặc livestream YouTube, hoặc chọn một gợi ý bên dưới.
              </p>

              <div className="field">
                <label className="field__label" htmlFor="video-url">
                  Link YouTube
                </label>
                <input
                  id="video-url"
                  ref={videoInputRef}
                  className="input"
                  type="url"
                  inputMode="url"
                  value={videoUrl}
                  placeholder="https://www.youtube.com/watch?v=…"
                  autoComplete="off"
                  aria-invalid={errors.some((error) => error.field === "video")}
                  aria-describedby="video-url-hint"
                  onChange={(event) => {
                    setVideoUrl(event.target.value);
                    setPickedId(null);
                    setErrors([]);
                  }}
                />
                <p className="hint" id="video-url-hint">
                  Hỗ trợ youtube.com/watch, youtu.be, youtube.com/live và /shorts.
                </p>
              </div>

              {videoTyped && previewId ? (
                <div className="onboard__preview">
                  <Image
                    src={youTubeThumbnail(previewId)}
                    alt=""
                    width={128}
                    height={72}
                    unoptimized
                    className="onboard__preview-thumb"
                  />
                  <span className="onboard__preview-text">
                    <strong>Đã nhận diện video</strong>
                    <span>
                      Mã video {previewId} — cả rạp sẽ cùng xem khi bạn bấm “Tạo rạp”.
                    </span>
                  </span>
                </div>
              ) : null}

              <fieldset className="onboard__fieldset">
                <legend className="field__label">Hoặc chọn gợi ý</legend>
                <div className="video-options">
                  {SUGGESTIONS.map((item) => (
                    <label className="video-option" key={item.videoId}>
                      <input
                        type="radio"
                        name="suggested-video"
                        value={item.videoId}
                        checked={pickedId === item.videoId}
                        onChange={() => {
                          setPickedId(item.videoId);
                          setVideoUrl("");
                          setErrors([]);
                        }}
                      />
                      <Image
                        src={youTubeThumbnail(item.videoId)}
                        alt=""
                        width={128}
                        height={72}
                        unoptimized
                        className="video-option__thumb"
                      />
                      <span className="video-option__main">
                        <span className="video-option__title">{item.title}</span>
                        <span className="video-option__meta">{item.channelTitle}</span>
                      </span>
                      <span className="video-option__tick" aria-hidden="true">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          ) : null}

          {step === "share" && created ? (
            <>
              <span className="onboard__eyebrow">{STEP_EYEBROW.share}</span>
              <h2 className="onboard__title" tabIndex={-1} ref={headingRef} id={headingId}>
                Rạp đã sẵn sàng
              </h2>
              <p className="onboard__lead">
                Gửi link này cho bạn bè. Họ mở là vào thẳng rạp, chọn ghế và xem cùng bạn.
              </p>

              <div className="onboard__summary">
                <div className="onboard__summary-row">
                  <span className="onboard__summary-key">Tên rạp</span>
                  <span>{created.title}</span>
                </div>
                <div className="onboard__summary-row">
                  <span className="onboard__summary-key">Mã phòng</span>
                  <span className="onboard__summary-code">{created.code}</span>
                </div>
                <div className="onboard__summary-row">
                  <span className="onboard__summary-key">Đang chiếu</span>
                  <span>{created.videoTitle}</span>
                </div>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="share-url">
                  Link mời
                </label>
                <div className="share-box">
                  <input
                    id="share-url"
                    ref={shareInputRef}
                    className="input"
                    type="text"
                    readOnly
                    value={shareUrl}
                    onFocus={(event) => event.target.select()}
                    aria-describedby="share-status"
                  />
                  <button type="button" className="btn btn-secondary" onClick={copyLink}>
                    {copied ? (
                      <Check size={15} aria-hidden="true" />
                    ) : (
                      <Copy size={15} aria-hidden="true" />
                    )}
                    {copied ? "Đã sao chép" : "Sao chép"}
                  </button>
                </div>
                <p className="share-status" id="share-status" role="status">
                  {copied ? "Đã sao chép link mời vào bộ nhớ tạm." : ""}
                  {copyBlocked ? (
                    <span className="share-status--warn">
                      Trình duyệt chặn sao chép — link đã được chọn, nhấn Ctrl+C để lấy.
                    </span>
                  ) : null}
                </p>
              </div>

              {canShare ? (
                <button type="button" className="btn btn-gold btn-block" onClick={shareLink}>
                  <Share2 size={15} aria-hidden="true" />
                  Chia sẻ qua ứng dụng khác
                </button>
              ) : null}

              <p className="hint onboard__share-hint">
                <Link2 size={13} aria-hidden="true" />
                Ai có link đều vào được rạp này. Bạn có thể đặt mật khẩu ở Phase 2.
              </p>
            </>
          ) : null}
        </div>

        <footer className="onboard__foot">
          {step !== "name" ? (
            <button type="button" className="btn btn-ghost" onClick={goBack}>
              <ArrowLeft size={15} aria-hidden="true" />
              Quay lại
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Xem rạp demo
            </button>
          )}
          <span className="onboard__foot-spacer" />
          <button type="submit" className="btn btn-primary">
            {step === "share" ? (
              <Clapperboard size={15} aria-hidden="true" />
            ) : null}
            {primaryLabel}
            {step === "share" ? null : <ArrowRight size={15} aria-hidden="true" />}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
