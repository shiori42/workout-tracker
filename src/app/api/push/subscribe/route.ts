import { getPushStore, serviceSupabase, type PushProfile } from "@/lib/server/pushStore";
import { initialSentLog } from "@/lib/server/push";
import { ensurePush, isEndpoint, json, readJson } from "../_shared";

interface Body {
  subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  profile?: PushProfile | null;
  accessToken?: string | null;
}

async function userIdFromToken(token?: string | null) {
  if (!token) return null;
  const sb = serviceSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser(token);
  return data.user?.id ?? null;
}

export async function POST(req: Request) {
  const blocked = await ensurePush(req);
  if (blocked) return blocked;
  const body = await readJson<Body>(req);
  const sub = body?.subscription;
  if (!sub || !isEndpoint(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) {
    return json({ error: "invalid_subscription" }, 400);
  }
  const store = getPushStore();
  const isNew = !(await store.get(sub.endpoint));
  const profile = body?.profile ?? null;
  await store.upsert({
    endpoint: sub.endpoint,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    userId: await userIdFromToken(body?.accessToken),
    profile,
  });
  if (isNew) await store.setSentLog(sub.endpoint, initialSentLog(profile));
  return json({ ok: true });
}
