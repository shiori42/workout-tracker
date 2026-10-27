"use client";

let wavUrl: string | null = null;

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

function makeBeepWav(): string {
  const sampleRate = 22050;
  const duration = 1.8;
  const n = Math.floor(sampleRate * duration);
  const pcm = new Int16Array(n);
  const tones = [
    { start: 0.05, len: 0.28, freq: 880 },
    { start: 0.45, len: 0.28, freq: 880 },
    { start: 0.85, len: 0.28, freq: 880 },
    { start: 1.25, len: 0.5, freq: 1320 },
  ];
  for (const tone of tones) {
    const s0 = Math.floor(tone.start * sampleRate);
    const s1 = Math.min(n, Math.floor((tone.start + tone.len) * sampleRate));
    for (let i = s0; i < s1; i++) {
      const env = Math.min(1, (i - s0) / 220) * Math.min(1, (s1 - i) / 440);
      pcm[i] = Math.max(
        -32767,
        Math.min(32767, Math.sin((2 * Math.PI * tone.freq * i) / sampleRate) * env * 0.55 * 32767),
      );
    }
  }
  const bytes = pcm.byteLength;
  const buf = new ArrayBuffer(44 + bytes);
  const view = new DataView(buf);
  const ascii = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  ascii(0, "RIFF");
  view.setUint32(4, 36 + bytes, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, bytes, true);
  new Uint8Array(buf, 44).set(new Uint8Array(pcm.buffer));
  let bin = "";
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return `data:audio/wav;base64,${btoa(bin)}`;
}

/** タイマー終了時だけ鳴らす。常時再生やタップ時の準備音は YouTube などの再生を止めてしまう */
export function beep(times = 4) {
  if (typeof window === "undefined") return;
  try {
    if (!wavUrl) wavUrl = makeBeepWav();
    const audio = new Audio(wavUrl);
    audio.setAttribute("playsinline", "true");
    void audio.play().catch(() => {});
  } catch {
    /* noop */
  }
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const run = () => {
      playBeeps(ctx, times);
      setTimeout(() => void ctx.close().catch(() => {}), 2200);
    };
    if (ctx.state === "running") run();
    else void ctx.resume().then(run).catch(() => {});
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
