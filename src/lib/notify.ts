"use client";

let audioCtx: AudioContext | null = null;
let primed = false;
let keepAlive: OscillatorNode | null = null;
let keepGain: GainNode | null = null;
let htmlAudio: HTMLAudioElement | null = null;
let wavUrl: string | null = null;

function setPlaybackSession() {
  const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
  if (session && session.type !== "playback") session.type = "playback";
}

/**
 * iOS Safari ではユーザー操作中に AudioContext を有効化し、実際に音（無音）を再生しておく必要がある。
 * バックグラウンド復帰などで止まった場合も次のタップで再開できるよう、タップのたびに呼んでよい。
 */
export function unlockAudio() {
  if (typeof window === "undefined") return;
  try {
    setPlaybackSession();
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) {
      try {
        audioCtx = new Ctx({ latencyHint: "interactive" });
      } catch {
        audioCtx = new Ctx();
      }
    }
    if (audioCtx.state !== "running") void audioCtx.resume().catch(() => {});
    if (!primed) {
      const src = audioCtx.createBufferSource();
      src.buffer = audioCtx.createBuffer(1, 1, 22050);
      src.connect(audioCtx.destination);
      src.start(0);
      primed = true;
    }
    primeHtmlAudio();
  } catch {
    /* noop */
  }
}

/** タイマー稼働中は無音を流し続け、iOS が AudioContext を suspend しないようにする */
export function startKeepAlive() {
  unlockAudio();
  if (!audioCtx) return;
  stopKeepAlive();
  try {
    keepGain = audioCtx.createGain();
    keepGain.gain.value = 0.00007;
    keepAlive = audioCtx.createOscillator();
    keepAlive.frequency.value = 20;
    keepAlive.connect(keepGain).connect(audioCtx.destination);
    keepAlive.start();
  } catch {
    keepAlive = null;
    keepGain = null;
  }
}

export function stopKeepAlive() {
  try {
    keepAlive?.stop();
  } catch {
    /* already stopped */
  }
  keepAlive = null;
  keepGain = null;
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

function primeHtmlAudio() {
  if (typeof window === "undefined") return;
  try {
    if (!wavUrl) wavUrl = makeBeepWav();
    if (!htmlAudio) {
      htmlAudio = new Audio(wavUrl);
      htmlAudio.preload = "auto";
      htmlAudio.setAttribute("playsinline", "true");
      htmlAudio.setAttribute("webkit-playsinline", "true");
    }
    htmlAudio.pause();
    htmlAudio.currentTime = 0;
    const play = htmlAudio.play();
    if (play) {
      void play
        .then(() => {
          htmlAudio?.pause();
          if (htmlAudio) htmlAudio.currentTime = 0;
        })
        .catch(() => {});
    }
  } catch {
    /* noop */
  }
}

function playHtmlBeep() {
  if (!htmlAudio) primeHtmlAudio();
  if (!htmlAudio) return;
  try {
    htmlAudio.pause();
    htmlAudio.currentTime = 0;
    void htmlAudio.play().catch(() => {});
  } catch {
    /* noop */
  }
}

export function beep(times = 4) {
  try {
    unlockAudio();
    const ctx = audioCtx;
    if (ctx) {
      if (ctx.state === "running") playBeeps(ctx, times);
      else void ctx.resume().then(() => playBeeps(ctx, times)).catch(() => {});
    }
    playHtmlBeep();
    setTimeout(stopKeepAlive, 2200);
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
