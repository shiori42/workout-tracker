"use client";

import { getSupabase } from "./supabase";

/** 自前の API を呼ぶ。ログイン中ならアクセストークンを付ける（本人専用モードでの認可に使う） */
export async function apiFetch(input: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
