import { after } from "next/server";
import { getPushStore, scheduleId } from "@/lib/server/pushStore";
import { sendPush } from "@/lib/server/push";
import { ensurePush, isEndpoint, json, readJson } from "../_shared";

export const maxDuration = 300;

interface Body {
  endpoint?: string;
  tag?: string;
  at?: number;
  title?: string;
  body?: string;
  url?: string;
}

const MAX_AHEAD_MS = 60 * 60 * 1000;

/** タイマー終了などの単発通知を予約する（同じ tag は置き換え） */
export async function POST(req: Request) {
  const blocked = await ensurePush(req);
  if (blocked) return blocked;
  const b = await readJson<Body>(req);
  if (!b || !isEndpoint(b.endpoint) || typeof b.at !== "number" || !b.title) {
    return json({ error: "invalid_request" }, 400);
  }
  const now = Date.now();
  if (b.at < now - 5000 || b.at > now + MAX_AHEAD_MS) return json({ error: "invalid_time" }, 400);
  const store = getPushStore();
  const sub = await store.get(b.endpoint);
  if (!sub) return json({ error: "unknown_subscription" }, 404);

  const tag = (b.tag || "default").slice(0, 32);
  const id = scheduleId(b.endpoint, tag);
  await store.schedule({
    id,
    endpoint: b.endpoint,
    sendAt: b.at,
    payload: { title: b.title.slice(0, 80), body: (b.body ?? "").slice(0, 200), tag, url: b.url ?? "/" },
  });

  // サーバーレス環境でも数分以内の通知を正確に送るため、レスポンス後に待機して送信する
  const delay = b.at - now;
  if (delay <= 290_000) {
    after(async () => {
      await new Promise((r) => setTimeout(r, Math.max(0, delay)));
      const item = await store.take(id);
      if (item && item.sendAt <= Date.now() + 1000) await sendPush(sub, item.payload);
      else if (item) await store.schedule(item);
    });
  }
  return json({ ok: true, id });
}

export async function DELETE(req: Request) {
  const blocked = await ensurePush(req);
  if (blocked) return blocked;
  const b = await readJson<Body>(req);
  if (!b || !isEndpoint(b.endpoint)) return json({ error: "invalid_request" }, 400);
  await getPushStore().cancel(scheduleId(b.endpoint, (b.tag || "default").slice(0, 32)));
  return json({ ok: true });
}
