import { pushConfigured, tick } from "@/lib/server/push";
import { json } from "../_shared";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 外部スケジューラ（Vercel Cron 等）から定期実行する。CRON_SECRET による認証必須 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!pushConfigured) return json({ error: "push_not_configured" }, 503);
  const result = await tick();
  return json({ ok: true, ...result });
}
