import "server-only";
import { NextResponse } from "next/server";
import { pushConfigured, startPushScheduler } from "@/lib/server/push";
import { requireUser } from "@/lib/server/auth";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

/** 利用者を確認し、API 利用時にスケジューラが動いていることを保証する */
export async function ensurePush(req: Request) {
  if (!pushConfigured) return json({ error: "push_not_configured" }, 503);
  const denied = await requireUser(req);
  if (denied) return denied;
  startPushScheduler();
  return null;
}

/** ブラウザのプッシュサービス以外への送信（SSRF）を防ぐ */
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^android\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^(.+\.)?push\.apple\.com$/,
  /^(.+\.)?notify\.windows\.com$/,
];
const allowAny = process.env.PUSH_ALLOW_ANY_ENDPOINT === "true";

export const isEndpoint = (v: unknown): v is string => {
  if (typeof v !== "string" || v.length >= 2048) return false;
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    return false;
  }
  if (allowAny) return url.protocol === "https:" || url.protocol === "http:";
  return url.protocol === "https:" && PUSH_HOSTS.some((re) => re.test(url.hostname));
};
