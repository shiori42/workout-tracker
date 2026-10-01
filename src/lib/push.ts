"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useApp, type AppData } from "./store";
import { addDays, monthOf, ymd } from "./date";
import { getSupabase } from "./supabase";
import { requestNotificationPermission } from "./notify";

interface PushState {
  enabled: boolean;
  endpoint: string | null;
  set: (p: Partial<Omit<PushState, "set">>) => void;
}

export const usePush = create<PushState>()(
  persist(
    (set) => ({ enabled: false, endpoint: null, set: (p) => set(p) }),
    {
      name: "kintore-push-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ enabled: s.enabled, endpoint: s.endpoint }),
    },
  ),
);

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

let configCache: Promise<{ enabled: boolean; publicKey: string | null }> | null = null;
export function pushConfig() {
  if (!configCache) {
    configCache = fetch("/api/push/config")
      .then((r) => r.json())
      .catch(() => ({ enabled: false, publicKey: null }));
  }
  return configCache;
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function swUrl() {
  return process.env.NODE_ENV === "production" ? "/sw.js" : "/sw.js?dev=1";
}

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  await navigator.serviceWorker.register(swUrl(), { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}

/** サーバーが通知判定に使う最小限の情報（体重・写真などは送らない） */
export function buildProfile(d: AppData) {
  const label = (v: string | null | undefined) => {
    if (!v || v === "none") return null;
    if (v === "rest") return "rest";
    return d.templates.find((t) => t.id === v)?.name ?? null;
  };
  const today = ymd();
  const overrides: Record<string, string | null> = {};
  for (const [date, v] of Object.entries(d.dateAssignments)) {
    if (date >= addDays(today, -1) && date <= addDays(today, 60)) overrides[date] = label(v);
  }
  const lastOf = (dates: string[]) => dates.reduce<string | undefined>((a, x) => (!a || x > a ? x : a), undefined);
  return {
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tokyo",
    notif: d.settings.notif,
    weekday: d.weekdaySchedule.map(label),
    overrides,
    lastStampDate: lastOf(d.stamps.map((s) => s.date)),
    lastMealDate: lastOf(d.meals.map((m) => m.date)),
    lastBodyMonth: lastOf(d.bodyRecords.map((r) => monthOf(r.date))),
  };
}

async function accessToken() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}

async function postSubscription(sub: PushSubscription) {
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: sub.toJSON(),
      profile: buildProfile(useApp.getState()),
      accessToken: await accessToken(),
    }),
  });
  return res.ok;
}

export type EnableResult = "ok" | "denied" | "unsupported" | "not_configured" | "error";

export async function enablePush(): Promise<EnableResult> {
  if (!pushSupported()) return "unsupported";
  const cfg = await pushConfig();
  if (!cfg.enabled || !cfg.publicKey) return "not_configured";
  const perm = await requestNotificationPermission();
  if (perm !== "granted") return perm === "unsupported" ? "unsupported" : "denied";
  try {
    const reg = await registration();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(cfg.publicKey),
      });
    }
    if (!(await postSubscription(sub))) return "error";
    usePush.getState().set({ enabled: true, endpoint: sub.endpoint });
    return "ok";
  } catch (e) {
    console.error("[push] subscribe failed", e);
    return "error";
  }
}

export async function disablePush() {
  const { endpoint } = usePush.getState();
  usePush.getState().set({ enabled: false, endpoint: null });
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    await sub?.unsubscribe();
  } catch {
    /* noop */
  }
  if (endpoint) {
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    }).catch(() => {});
  }
}

/** 購読がブラウザ側で失効していないか確認し、通知判定用プロフィールを更新する */
export async function refreshSubscription() {
  if (!usePush.getState().enabled || !pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) {
      usePush.getState().set({ enabled: false, endpoint: null });
      return;
    }
    usePush.getState().set({ endpoint: sub.endpoint });
    await postSubscription(sub);
  } catch {
    /* オフライン時は次回に再送 */
  }
}

export async function scheduleTimerPush(at: number, label: string) {
  const { enabled, endpoint } = usePush.getState();
  if (!enabled || !endpoint) return;
  await fetch("/api/push/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint,
      tag: "interval",
      at,
      title: "インターバル終了",
      body: label ? `${label}：次のセットを始めましょう` : "次のセットを始めましょう",
      url: "/workout",
    }),
  }).catch(() => {});
}

export async function cancelTimerPush() {
  const { enabled, endpoint } = usePush.getState();
  if (!enabled || !endpoint) return;
  await fetch("/api/push/schedule", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint, tag: "interval" }),
  }).catch(() => {});
}

export async function testPush() {
  const { endpoint } = usePush.getState();
  if (!endpoint) return false;
  const res = await fetch("/api/push/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  }).catch(() => null);
  return !!res?.ok && (await res.json()).ok === true;
}
