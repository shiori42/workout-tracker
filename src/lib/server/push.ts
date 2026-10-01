import "server-only";
import webpush from "web-push";
import { getPushStore, type PushPayload, type PushProfile, type StoredSub } from "./pushStore";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

export const pushConfigured = !!(PUBLIC_KEY && PRIVATE_KEY);

let initialized = false;
function init() {
  if (initialized || !pushConfigured) return;
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY!, PRIVATE_KEY!);
  initialized = true;
}

export async function sendPush(sub: Pick<StoredSub, "endpoint" | "keys">, payload: PushPayload) {
  init();
  if (!pushConfigured) return false;
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload), {
      TTL: 600,
      urgency: "high",
      topic: payload.tag?.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) || undefined,
    });
    return true;
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) await getPushStore().remove(sub.endpoint);
    else console.error("[push] send failed", status, (e as Error).message);
    return false;
  }
}

/** タイムゾーン上の現在日時 */
export function localParts(tz: string, now: number) {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    }).formatToParts(new Date(now));
  } catch {
    return localParts("Asia/Tokyo", now);
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    month: `${get("year")}-${get("month")}`,
    day: Number(get("day")),
    hm: `${get("hour")}:${get("minute")}`,
    weekday: weekdays.indexOf(get("weekday")),
  };
}

/** 新規購読時、今日すでに時刻を過ぎた通知は送らず次回から通知する */
export function initialSentLog(p: PushProfile | null, now = Date.now()) {
  const log: Record<string, string> = {};
  if (!p) return log;
  const t = localParts(p.tz, now);
  if (t.hm >= p.notif.training.time) log.training = t.date;
  if (t.hm >= p.notif.meal.time) log.meal = t.date;
  if (t.day > p.notif.body.day || (t.day === p.notif.body.day && t.hm >= p.notif.body.time)) log.body = t.month;
  return log;
}

/** 予定・身体記録・食事記録の通知を判定して送信する */
export async function runDailyChecks(sub: StoredSub, now: number) {
  const p: PushProfile | null = sub.profile;
  if (!p) return;
  const t = localParts(p.tz, now);
  const log = { ...sub.sentLog };
  let changed = false;

  if (p.notif.training.enabled && t.hm >= p.notif.training.time && log.training !== t.date) {
    log.training = t.date;
    changed = true;
    const plan = t.date in p.overrides ? p.overrides[t.date] : p.weekday[t.weekday];
    if (plan && p.lastStampDate !== t.date) {
      await sendPush(
        sub,
        plan === "rest"
          ? { title: "今日は休養日", body: "しっかり休んで回復しましょう。", tag: "training", url: "/" }
          : { title: `今日は${plan}`, body: "ホームの「筋トレを開始」から始めましょう。", tag: "training", url: "/workout" },
      );
    }
  }

  if (
    p.notif.body.enabled &&
    t.day >= p.notif.body.day &&
    t.hm >= p.notif.body.time &&
    log.body !== t.month
  ) {
    log.body = t.month;
    changed = true;
    if (p.lastBodyMonth !== t.month) {
      await sendPush(sub, {
        title: "月次身体記録の日です",
        body: "身長・体重・写真を記録して変化を確認しましょう。",
        tag: "body",
        url: "/profile",
      });
    }
  }

  if (p.notif.meal.enabled && t.hm >= p.notif.meal.time && log.meal !== t.date) {
    log.meal = t.date;
    changed = true;
    if (p.lastMealDate !== t.date) {
      await sendPush(sub, {
        title: "食事記録を忘れていませんか？",
        body: "今日の食事とカロリーを記録しましょう。",
        tag: "meal",
        url: "/meals",
      });
    }
  }

  if (changed) await getPushStore().setSentLog(sub.endpoint, log);
}

let ticking = false;

export async function tick(now = Date.now()) {
  if (!pushConfigured || ticking) return { scheduled: 0, subs: 0 };
  ticking = true;
  try {
    const store = getPushStore();
    const due = await store.takeDue(now);
    for (const item of due) {
      const sub = await store.get(item.endpoint);
      if (sub) await sendPush(sub, item.payload);
    }
    const subs = await store.list();
    for (const sub of subs) await runDailyChecks(sub, now);
    return { scheduled: due.length, subs: subs.length };
  } finally {
    ticking = false;
  }
}

const g = globalThis as unknown as { __kintorePushTimer?: ReturnType<typeof setInterval> };

/** Node サーバー（next start）で常駐する簡易スケジューラ */
export function startPushScheduler() {
  if (!pushConfigured || g.__kintorePushTimer) return;
  g.__kintorePushTimer = setInterval(() => {
    tick().catch((e) => console.error("[push] tick failed", e));
  }, 10_000);
}
