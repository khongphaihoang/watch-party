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
import { useT, type MessageKey } from "@/lib/i18n";
import { BrandMark } from "@/components/hud/RoomTopBar";

type Step = "name" | "video" | "share";

const STEP_ORDER: Step[] = ["name", "video", "share"];

const STEP_INDICATOR: Record<Step, MessageKey> = {
  name: "onboard.stepName",
  video: "onboard.stepVideo",
  share: "onboard.stepShare",
};

interface SuggestedVideo {
  videoId: string;
  title: string;
  channelTitle: string;
}

const SUGGESTIONS: Array<{ videoId: string; titleKey: MessageKey; channelKey: MessageKey }> = [
  {
    videoId: "M7lc1UVf-VE",
    titleKey: "onboard.suggest1Title",
    channelKey: "onboard.suggest1Channel",
  },
  {
    videoId: "aqz-KE-bpKQ",
    titleKey: "onboard.suggest2Title",
    channelKey: "onboard.suggest2Channel",
  },
  {
    videoId: "ScMzIvxBSi4",
    titleKey: "onboard.suggest3Title",
    channelKey: "onboard.suggest3Channel",
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
  const t = useT();

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
      if (picked) {
        return {
          videoId: picked.videoId,
          title: t(picked.titleKey),
          channelTitle: t(picked.channelKey),
        };
      }
    }
    const id = parseYouTubeId(videoUrl);
    if (id) {
      return {
        videoId: id,
        title: t("onboard.pastedTitle"),
        channelTitle: t("onboard.pastedChannel"),
      };
    }
    return null;
  }, [pickedId, videoUrl, t]);

  const previewId = pickedId ?? parseYouTubeId(videoUrl);
  const videoTyped = videoUrl.trim().length > 0;

  function validateTitle(onBlur = false): FieldError[] {
    const value = roomTitle.trim();
    if (value.length === 0) {
      return onBlur ? [] : [{ field: "room-title", message: t("onboard.errTitleRequired") }];
    }
    if (value.length < TITLE_MIN) {
      return [
        { field: "room-title", message: t("onboard.errTitleShort", { min: TITLE_MIN }) },
      ];
    }
    return [];
  }

  function validateVideo(): FieldError[] {
    if (resolvedVideo) return [];
    return videoTyped
      ? [{ field: "video", message: t("onboard.errLink") }]
      : [{ field: "video", message: t("onboard.errVideoRequired") }];
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
      hostName: hostName.trim() || t("common.you"),
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
        text: t("onboard.shareText", { title: created.title }),
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
  const primaryLabel =
    step === "name"
      ? t("common.next")
      : step === "video"
        ? t("onboard.ctaCreate")
        : t("onboard.ctaEnter");

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
              <span className="onboard__brand-name">{t("brand.name")}</span>
              <span className="onboard__brand-sub">{t("onboard.brandSub")}</span>
            </span>
          </span>
          <button
            type="button"
            className="onboard__close"
            onClick={onClose}
            aria-label={t("onboard.close")}
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
                <span className="onboard__step-label">{t(STEP_INDICATOR[item])}</span>
              </li>
            );
          })}
        </ol>

        <div className="onboard__body">
          {errors.length > 0 ? (
            <div className="onboard__error" role="alert" tabIndex={-1} ref={summaryRef}>
              <p className="onboard__error-title">
                <TriangleAlert size={13} aria-hidden="true" />
                {t("onboard.errorsCount", { count: errors.length })}
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
              <span className="onboard__eyebrow">{t("onboard.stepOf", { current: 1 })}</span>
              <h2 className="onboard__title" tabIndex={-1} ref={headingRef} id={headingId}>
                {t("onboard.nameTitle")}
              </h2>
              <p className="onboard__lead">{t("onboard.nameLead")}</p>

              <div className="field">
                <label className="field__label" htmlFor="room-title">
                  {t("onboard.roomLabel")}
                </label>
                <input
                  id="room-title"
                  ref={titleInputRef}
                  className="input"
                  type="text"
                  value={roomTitle}
                  maxLength={TITLE_MAX}
                  placeholder={t("onboard.roomPlaceholder")}
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
                  {t("onboard.roomHint", {
                    min: TITLE_MIN,
                    max: TITLE_MAX,
                    left: TITLE_MAX - roomTitle.length,
                  })}
                </p>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="room-host">
                  {t("onboard.hostLabel")}{" "}
                  <span className="field__optional">{t("onboard.optional")}</span>
                </label>
                <input
                  id="room-host"
                  className="input"
                  type="text"
                  value={hostName}
                  maxLength={16}
                  placeholder={t("onboard.hostPlaceholder")}
                  autoComplete="nickname"
                  onChange={(event) => setHostName(event.target.value)}
                />
                <p className="hint">{t("onboard.hostHint")}</p>
              </div>
            </>
          ) : null}

          {step === "video" ? (
            <>
              <span className="onboard__eyebrow">{t("onboard.stepOf", { current: 2 })}</span>
              <h2 className="onboard__title" tabIndex={-1} ref={headingRef} id={headingId}>
                {t("onboard.videoTitle")}
              </h2>
              <p className="onboard__lead">{t("onboard.videoLead")}</p>

              <div className="field">
                <label className="field__label" htmlFor="video-url">
                  {t("onboard.linkLabel")}
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
                  {t("onboard.linkHint")}
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
                    <strong>{t("onboard.detected")}</strong>
                    <span>{t("onboard.detectedDesc", { id: previewId })}</span>
                  </span>
                </div>
              ) : null}

              <fieldset className="onboard__fieldset">
                <legend className="field__label">{t("onboard.suggestLabel")}</legend>
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
                        <span className="video-option__title">{t(item.titleKey)}</span>
                        <span className="video-option__meta">{t(item.channelKey)}</span>
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
              <span className="onboard__eyebrow">{t("onboard.stepOf", { current: 3 })}</span>
              <h2 className="onboard__title" tabIndex={-1} ref={headingRef} id={headingId}>
                {t("onboard.shareTitle")}
              </h2>
              <p className="onboard__lead">{t("onboard.shareLead")}</p>

              <div className="onboard__summary">
                <div className="onboard__summary-row">
                  <span className="onboard__summary-key">{t("onboard.shareRoomName")}</span>
                  <span>{created.title}</span>
                </div>
                <div className="onboard__summary-row">
                  <span className="onboard__summary-key">{t("onboard.shareRoomCode")}</span>
                  <span className="onboard__summary-code">{created.code}</span>
                </div>
                <div className="onboard__summary-row">
                  <span className="onboard__summary-key">{t("onboard.shareNowShowing")}</span>
                  <span>{created.videoTitle}</span>
                </div>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="share-url">
                  {t("onboard.shareLinkLabel")}
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
                    {copied ? t("common.copied") : t("common.copy")}
                  </button>
                </div>
                <p className="share-status" id="share-status" role="status">
                  {copied ? t("onboard.shareCopied") : ""}
                  {copyBlocked ? (
                    <span className="share-status--warn">{t("onboard.shareBlocked")}</span>
                  ) : null}
                </p>
              </div>

              {canShare ? (
                <button type="button" className="btn btn-gold btn-block" onClick={shareLink}>
                  <Share2 size={15} aria-hidden="true" />
                  {t("onboard.shareNative")}
                </button>
              ) : null}

              <p className="hint onboard__share-hint">
                <Link2 size={13} aria-hidden="true" />
                {t("onboard.shareHint")}
              </p>
            </>
          ) : null}
        </div>

        <footer className="onboard__foot">
          {step !== "name" ? (
            <button type="button" className="btn btn-ghost" onClick={goBack}>
              <ArrowLeft size={15} aria-hidden="true" />
              {t("common.back")}
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t("onboard.demo")}
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
