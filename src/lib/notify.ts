"use client";

let audioCtx: AudioContext | null = null;
let primed = false;

/**
 * iOS Safari ではユーザー操作中に AudioContext を有効化し、実際に音（無音）を再生しておく必要がある。
 * バックグラウンド復帰などで止まった場合も次のタップで再開できるよう、タップのたびに呼んでよい。
 */
export function unlockAudio() {
  if (typeof window === "undefined") return;
  try {
    // Safari 17+：マナーモード（サイレントスイッチ）中でも Web Audio を鳴らす
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session && session.type !== "playback") session.type = "playback";
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state !== "running") void audioCtx.resume().catch(() => {});
    if (!primed) {
      const src = audioCtx.createBufferSource();
      src.buffer = audioCtx.createBuffer(1, 1, 22050);
      src.connect(audioCtx.destination);
      src.start(0);
      primed = true;
    }
  } catch {
    /* noop */
  }
}

function playBeeps(ctx: AudioContext, times: number) {
  for (let i = 0; i < times; i++) {
    const t = ctx.currentTime + 0.05 + i * 0.4;
    const last = i === times - 1;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(last ? 1320 : 880, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + (last ? 0.6 : 0.28));
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + (last ? 0.65 : 0.32));
  }
}

export function beep(times = 4) {
  try {
    unlockAudio();
    const ctx = audioCtx;
    if (!ctx) return;
    if (ctx.state === "running") playBeeps(ctx, times);
    else void ctx.resume().then(() => playBeeps(ctx, times)).catch(() => {});
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
