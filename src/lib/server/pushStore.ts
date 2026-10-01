import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { createHash } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NotificationSettings } from "../types";

export interface PushProfile {
  /** IANA タイムゾーン（例: Asia/Tokyo） */
  tz: string;
  notif: NotificationSettings;
  /** 曜日ごとの予定ラベル（テンプレート名 / "rest" / null） */
  weekday: (string | null)[];
  /** 日付ごとの上書き予定（"YYYY-MM-DD" → ラベル / "rest" / null） */
  overrides: Record<string, string | null>;
  lastStampDate?: string;
  lastMealDate?: string;
  lastBodyMonth?: string;
}

export interface StoredSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userId: string | null;
  profile: PushProfile | null;
  sentLog: Record<string, string>;
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

export interface Scheduled {
  id: string;
  endpoint: string;
  sendAt: number;
  payload: PushPayload;
}

export interface PushStore {
  upsert(sub: Omit<StoredSub, "sentLog">): Promise<void>;
  remove(endpoint: string): Promise<void>;
  get(endpoint: string): Promise<StoredSub | null>;
  list(): Promise<StoredSub[]>;
  setSentLog(endpoint: string, log: Record<string, string>): Promise<void>;
  schedule(item: Scheduled): Promise<void>;
  cancel(id: string): Promise<void>;
  /** 取り出しと同時に削除する（二重送信防止） */
  take(id: string): Promise<Scheduled | null>;
  takeDue(now: number): Promise<Scheduled[]>;
}

export const scheduleId = (endpoint: string, tag: string) =>
  `${createHash("sha256").update(endpoint).digest("hex").slice(0, 24)}:${tag}`;

/* ---------------------------------------------------------------- ファイル保存（Supabase未設定時のセルフホスト用） */

interface FileData {
  subs: Record<string, StoredSub>;
  scheduled: Record<string, Scheduled>;
}

class FileStore implements PushStore {
  private file = path.join(process.cwd(), ".data", "push.json");
  private queue: Promise<unknown> = Promise.resolve();

  private async read(): Promise<FileData> {
    try {
      return JSON.parse(await fs.readFile(this.file, "utf8")) as FileData;
    } catch {
      return { subs: {}, scheduled: {} };
    }
  }

  private async write(d: FileData) {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(d));
  }

  private tx<T>(fn: (d: FileData) => T | Promise<T>, save = true): Promise<T> {
    const run = this.queue.then(async () => {
      const d = await this.read();
      const r = await fn(d);
      if (save) await this.write(d);
      return r;
    });
    this.queue = run.catch(() => {});
    return run;
  }

  upsert(sub: Omit<StoredSub, "sentLog">) {
    return this.tx((d) => {
      d.subs[sub.endpoint] = { ...sub, sentLog: d.subs[sub.endpoint]?.sentLog ?? {} };
    });
  }
  remove(endpoint: string) {
    return this.tx((d) => {
      delete d.subs[endpoint];
      for (const [id, s] of Object.entries(d.scheduled)) if (s.endpoint === endpoint) delete d.scheduled[id];
    });
  }
  get(endpoint: string) {
    return this.tx((d) => d.subs[endpoint] ?? null, false);
  }
  list() {
    return this.tx((d) => Object.values(d.subs), false);
  }
  setSentLog(endpoint: string, log: Record<string, string>) {
    return this.tx((d) => {
      if (d.subs[endpoint]) d.subs[endpoint].sentLog = log;
    });
  }
  schedule(item: Scheduled) {
    return this.tx((d) => {
      d.scheduled[item.id] = item;
    });
  }
  cancel(id: string) {
    return this.tx((d) => {
      delete d.scheduled[id];
    });
  }
  take(id: string) {
    return this.tx((d) => {
      const s = d.scheduled[id] ?? null;
      delete d.scheduled[id];
      return s;
    });
  }
  takeDue(now: number) {
    return this.tx((d) => {
      const due = Object.values(d.scheduled).filter((s) => s.sendAt <= now);
      for (const s of due) delete d.scheduled[s.id];
      return due;
    });
  }
}

/* ---------------------------------------------------------------- Supabase 保存（service role） */

type SubRow = {
  endpoint: string;
  user_id: string | null;
  keys: StoredSub["keys"];
  profile: PushProfile | null;
  sent_log: Record<string, string>;
};

const fromSubRow = (r: SubRow): StoredSub => ({
  endpoint: r.endpoint,
  keys: r.keys,
  userId: r.user_id,
  profile: r.profile && Object.keys(r.profile).length ? r.profile : null,
  sentLog: r.sent_log ?? {},
});

type SchedRow = { id: string; endpoint: string; send_at: string; payload: PushPayload };
const fromSchedRow = (r: SchedRow): Scheduled => ({
  id: r.id,
  endpoint: r.endpoint,
  sendAt: Date.parse(r.send_at),
  payload: r.payload,
});

class SupabaseStore implements PushStore {
  constructor(private sb: SupabaseClient) {}

  async upsert(sub: Omit<StoredSub, "sentLog">) {
    const { error } = await this.sb.from("push_subscriptions").upsert(
      {
        endpoint: sub.endpoint,
        user_id: sub.userId,
        keys: sub.keys,
        profile: sub.profile ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
    if (error) throw error;
  }
  async remove(endpoint: string) {
    await this.sb.from("push_subscriptions").delete().eq("endpoint", endpoint);
  }
  async get(endpoint: string) {
    const { data } = await this.sb.from("push_subscriptions").select("*").eq("endpoint", endpoint).maybeSingle();
    return data ? fromSubRow(data as SubRow) : null;
  }
  async list() {
    const { data, error } = await this.sb.from("push_subscriptions").select("*");
    if (error) throw error;
    return (data as SubRow[]).map(fromSubRow);
  }
  async setSentLog(endpoint: string, log: Record<string, string>) {
    await this.sb.from("push_subscriptions").update({ sent_log: log }).eq("endpoint", endpoint);
  }
  async schedule(item: Scheduled) {
    const { error } = await this.sb.from("scheduled_pushes").upsert(
      { id: item.id, endpoint: item.endpoint, send_at: new Date(item.sendAt).toISOString(), payload: item.payload },
      { onConflict: "id" },
    );
    if (error) throw error;
  }
  async cancel(id: string) {
    await this.sb.from("scheduled_pushes").delete().eq("id", id);
  }
  async take(id: string) {
    const { data } = await this.sb.from("scheduled_pushes").delete().eq("id", id).select();
    const row = (data as SchedRow[] | null)?.[0];
    return row ? fromSchedRow(row) : null;
  }
  async takeDue(now: number) {
    const { data } = await this.sb
      .from("scheduled_pushes")
      .delete()
      .lte("send_at", new Date(now).toISOString())
      .select();
    return ((data as SchedRow[] | null) ?? []).map(fromSchedRow);
  }
}

/* ---------------------------------------------------------------- */

let store: PushStore | null = null;

export function serviceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function getPushStore(): PushStore {
  if (!store) {
    const sb = serviceSupabase();
    store = sb ? new SupabaseStore(sb) : new FileStore();
  }
  return store;
}
