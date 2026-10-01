"use client";

let audioCtx: AudioContext | null = null;

/** iOS Safari ではユーザー操作中に AudioContext を有効化しておく必要がある */
export function unlockAudio() {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") void audioCtx.resume();
  } catch {
    /* noop */
  }
}

export function beep(times = 3) {
  try {
    unlockAudio();
    if (!audioCtx) return;
    const ctx = audioCtx;
    for (let i = 0; i < times; i++) {
      const t = ctx.currentTime + i * 0.35;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(i === times - 1 ? 1320 : 880, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    }
  } catch {
    /* noop */
  }
}

export function vibrate(pattern: number | number[] = [300, 120, 300, 120, 500]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    /* noop */
  }
}

export const notificationSupported = () =>
  typeof window !== "undefined" && "Notification" in window;

export const notificationPermission = (): NotificationPermission | "unsupported" =>
  notificationSupported() ? Notification.permission : "unsupported";

export async function requestNotificationPermission() {
  if (!notificationSupported()) return "unsupported" as const;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * OS通知を表示する。権限がない・非対応の場合は false を返し、
 * 呼び出し側でアプリ内通知にフォールバックする。
 */
export async function showSystemNotification(title: string, body: string, tag?: string) {
  if (!notificationSupported() || Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, {
        body,
        tag,
        icon: "/icons/192",
        badge: "/icons/192",
      });
      return true;
    }
    new Notification(title, { body, tag, icon: "/icons/192" });
    return true;
  } catch {
    return false;
  }
}
