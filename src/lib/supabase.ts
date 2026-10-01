"use client";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { create } from "zustand";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Supabase の接続情報が設定されている場合のみクラウド機能を有効にする */
export const cloudEnabled = !!(url && key);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!cloudEnabled || typeof window === "undefined") return null;
  if (!client) {
    client = createClient(url!, key!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        storageKey: "kintore-auth",
      },
    });
  }
  return client;
}

export type SyncStatus = "disabled" | "signed-out" | "idle" | "syncing" | "offline" | "error";

export interface CloudConflict {
  remoteUpdatedAt: string;
}

interface CloudState {
  ready: boolean;
  user: User | null;
  status: SyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
  conflict: CloudConflict | null;
  set: (patch: Partial<Omit<CloudState, "set">>) => void;
}

export const useCloud = create<CloudState>()((set) => ({
  ready: !cloudEnabled,
  user: null,
  status: cloudEnabled ? "signed-out" : "disabled",
  lastSyncedAt: null,
  error: null,
  conflict: null,
  set: (patch) => set(patch),
}));

export const currentUserId = () => useCloud.getState().user?.id ?? null;
