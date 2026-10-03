import "server-only";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const allowed = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/** ALLOWED_EMAILS が設定されていれば、そのアカウント以外からの API 利用を拒否する */
export const privateMode = allowed.length > 0;

export async function requireUser(req: Request): Promise<NextResponse | null> {
  if (!privateMode) return null;
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !key) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await sb.auth.getUser(token);
  const email = data.user?.email?.toLowerCase();
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!allowed.includes(email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return null;
}
