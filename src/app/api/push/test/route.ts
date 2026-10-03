import { getPushStore } from "@/lib/server/pushStore";
import { sendPush } from "@/lib/server/push";
import { ensurePush, isEndpoint, json, readJson } from "../_shared";

export async function POST(req: Request) {
  const blocked = await ensurePush(req);
  if (blocked) return blocked;
  const b = await readJson<{ endpoint?: string }>(req);
  if (!isEndpoint(b?.endpoint)) return json({ error: "invalid_endpoint" }, 400);
  const sub = await getPushStore().get(b.endpoint);
  if (!sub) return json({ error: "unknown_subscription" }, 404);
  const ok = await sendPush(sub, {
    title: "テスト通知",
    body: "プッシュ通知は正常に動作しています 💪",
    tag: "test",
    url: "/settings",
  });
  return json({ ok });
}
