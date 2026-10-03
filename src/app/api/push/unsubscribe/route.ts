import { getPushStore } from "@/lib/server/pushStore";
import { ensurePush, isEndpoint, json, readJson } from "../_shared";

export async function POST(req: Request) {
  const blocked = await ensurePush(req);
  if (blocked) return blocked;
  const body = await readJson<{ endpoint?: string }>(req);
  if (!isEndpoint(body?.endpoint)) return json({ error: "invalid_endpoint" }, 400);
  await getPushStore().remove(body.endpoint);
  return json({ ok: true });
}
