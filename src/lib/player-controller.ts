import type { PlayerPhase } from "./video-sync";

/** Bề mặt điều khiển player mà HUD/store cần; không đưa iframe vào zustand. */
export interface PlayerHandle {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  mute: () => void;
  unMute: () => void;
  setVolume: (volume: number) => void;
}

let current: PlayerHandle | null = null;

export function setPlayerHandle(handle: PlayerHandle | null): void {
  current = handle;
}

export function getPlayerHandle(): PlayerHandle | null {
  return current;
}

export function phaseFromPlayerState(state: number): PlayerPhase {
  switch (state) {
    case 0:
      return "ended";
    case 1:
      return "playing";
    case 2:
      return "paused";
    case 3:
      return "buffering";
    case 5:
      return "ready";
    default:
      return "loading";
  }
}
