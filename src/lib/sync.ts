"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AIReport,
  BodyRecord,
  Exercise,
  ExerciseGuide,
  ExtraBurn,
  MealRecord,
  NotificationSettings,
  SessionExercise,
  Stamp,
  Template,
  WorkoutSession,
} from "./types";
import { useApp, defaultSettings, type AppData } from "./store";
import { useTimer } from "./timerStore";
import { MUSCLE_MAP } from "./constants";
import { bodyWeightAt, computeBadges, sessionKcal } from "./calc";
import { getSupabase, useCloud } from "./supabase";
import { uploadPendingPhotos } from "./photos";

/* ================================================================ 行マッピング */

type Row = { id: string } & Record<string, unknown>;

export const TABLES = [
  "exercises",
  "exercise_muscle_map",
  "workout_templates",
  "workout_sessions",
  "workout_session_exercises",
  "workout_sets",
  "stamps",
  "achievements",
  "meal_records",
  "extra_burns",
  "body_records",
  "ai_reports",
  "notification_settings",
] as const;
export type Table = (typeof TABLES)[number];

const iso = (ms?: number | null) => (ms ? new Date(ms).toISOString() : null);
const ms = (v: unknown) => (typeof v === "string" ? Date.parse(v) : undefined);
const num = (v: unknown) => (v === null || v === undefined ? undefined : Number(v));

export interface Snapshot {
  profile: Record<string, unknown>;
  timer: Record<string, unknown>;
  tables: Record<Table, Row[]>;
}

export function toRows(data: AppData, timerSeconds: { user: number; last: number }): Snapshot {
  const s = data.settings;
  const tables = Object.fromEntries(TABLES.map((t) => [t, [] as Row[]])) as Record<Table, Row[]>;

  for (const e of data.exercises) {
    tables.exercises.push({
      id: e.id,
      name: e.name,
      body_part: e.bodyPart,
      equipment: e.equipment,
      weight_mode: e.weightMode,
      default_weight: e.defaultWeight,
      default_reps: e.defaultReps,
      default_sets: e.defaultSets,
      default_rest_sec: e.restSec,
      intensity: e.intensity,
      memo: e.memo,
      guide: e.guide ?? null,
      created_at: iso(e.createdAt) ?? new Date(0).toISOString(),
    });
    for (const [muscle, rate] of Object.entries(e.muscles && Object.keys(e.muscles).length > 0 ? e.muscles : MUSCLE_MAP[e.bodyPart])) {
      tables.exercise_muscle_map.push({
        id: `${e.id}:${muscle}`,
        exercise_id: e.id,
        body_part: muscle,
        contribution_rate: rate,
      });
    }
  }

  for (const t of data.templates) {
    tables.workout_templates.push({
      id: t.id,
      name: t.name,
      weekday: data.weekdaySchedule.flatMap((w, i) => (w === t.id ? [i] : [])),
      exercise_order: t.exerciseIds,
    });
  }

  for (const ss of data.sessions) {
    tables.workout_sessions.push({
      id: ss.id,
      date: ss.date,
      template_id: ss.templateId ?? null,
      template_name: ss.templateName ?? null,
      start_at: iso(ss.startAt),
      end_at: iso(ss.endAt),
      estimated_kcal: sessionKcal({ ...ss, kcalOverride: undefined }, bodyWeightAt(data.bodyRecords, ss.date)),
      kcal_override: ss.kcalOverride ?? null,
      note: ss.note,
      completed: ss.completed,
    });
    ss.exercises.forEach((e, position) => {
      tables.workout_session_exercises.push({
        id: e.uid,
        session_id: ss.id,
        exercise_id: e.exerciseId,
        position,
        name: e.name,
        body_part: e.bodyPart,
        equipment: e.equipment,
        weight_mode: e.weightMode,
        intensity: e.intensity,
        rest_sec: e.restSec,
        memo: e.memo,
      });
      e.sets.forEach((x, i) => {
        tables.workout_sets.push({
          id: `${e.uid}:${i}`,
          session_id: ss.id,
          session_exercise_id: e.uid,
          exercise_id: e.exerciseId,
          set_no: i + 1,
          weight_kg: x.weight,
          reps: x.reps,
          completed: x.done,
          done_at: iso(x.doneAt),
          rest_sec: e.restSec,
        });
      });
    });
  }

  for (const st of data.stamps) {
    tables.stamps.push({ id: `${st.date}:${st.type}`, date: st.date, type: st.type, reason: st.reason });
  }

  const badges = computeBadges(data);
  for (const b of badges) {
    if (!b.achieved || !data.achievedAt[b.id]) continue;
    tables.achievements.push({
      id: b.id,
      type: "badge",
      title: b.title,
      achieved_at: iso(data.achievedAt[b.id]),
      value: null,
    });
  }

  for (const m of data.meals) {
    tables.meal_records.push({
      id: m.id,
      date: m.date,
      meal_type: m.mealType,
      food_name: m.foodName,
      amount: m.amount,
      kcal: m.kcal,
      protein_g: m.proteinG ?? null,
      fat_g: m.fatG ?? null,
      carb_g: m.carbG ?? null,
      photo_url: m.photoKey ?? null,
      note: m.note,
      created_at: iso(m.createdAt),
    });
  }

  for (const x of data.extraBurns) {
    tables.extra_burns.push({ id: x.id, date: x.date, label: x.label, kcal: x.kcal });
  }

  for (const r of data.bodyRecords) {
    tables.body_records.push({
      id: r.id,
      date: r.date,
      height_cm: r.heightCm,
      weight_kg: r.weightKg,
      body_fat_pct: r.bodyFatPct ?? null,
      muscle_kg: r.muscleKg ?? null,
      waist_cm: r.waistCm ?? null,
      photo_urls: r.photos,
      note: r.note,
    });
  }

  for (const r of Object.values(data.reports)) {
    tables.ai_reports.push({
      id: r.month,
      target_month: r.month,
      summary: r.summary,
      highlights: r.highlights,
      cautions: r.cautions,
      suggestions: r.suggestions,
      source: r.source ?? "template",
      generated_at: iso(r.generatedAt),
    });
  }

  const n = s.notif;
  tables.notification_settings.push(
    { id: "training", type: "training", weekday: null, time: n.training.time, enabled: n.training.enabled, extra: {} },
    { id: "body", type: "body", weekday: null, time: n.body.time, enabled: n.body.enabled, extra: { day: n.body.day } },
    { id: "meal", type: "meal", weekday: null, time: n.meal.time, enabled: n.meal.enabled, extra: {} },
    { id: "interval", type: "interval", weekday: null, time: null, enabled: n.interval.enabled, extra: {} },
  );

  return {
    profile: {
      nickname: s.nickname,
      monthly_goal: s.monthlyGoal,
      rest_counts_for_streak: s.restCountsForStreak,
      onboarded: s.onboarded,
      start_date: s.startDate,
      weekday_schedule: data.weekdaySchedule,
      date_assignments: data.dateAssignments,
      notif: s.notif,
      active_session_id: data.activeSessionId,
    },
    timer: { default_seconds: timerSeconds.user, last_seconds: timerSeconds.last },
    tables,
  };
}

type RemoteTables = Partial<Record<Table, Record<string, unknown>[]>>;

export function fromRows(
  profile: Record<string, unknown>,
  t: RemoteTables,
): Omit<AppData, "notifLog"> {
  const rows = (k: Table) => t[k] ?? [];
  const def = defaultSettings();

  const exercises: Exercise[] = rows("exercises").map((r) => ({
    id: String(r.id),
    name: String(r.name),
    bodyPart: r.body_part as Exercise["bodyPart"],
    equipment: r.equipment as Exercise["equipment"],
    weightMode: r.weight_mode as Exercise["weightMode"],
    defaultWeight: Number(r.default_weight),
    defaultReps: Number(r.default_reps),
    defaultSets: Number(r.default_sets),
    restSec: Number(r.default_rest_sec),
    intensity: r.intensity as Exercise["intensity"],
    memo: String(r.memo ?? ""),
    ...(r.guide ? { guide: r.guide as ExerciseGuide } : {}),
    createdAt: ms(r.created_at) ?? 0,
  }));
  exercises.sort((a, b) => a.createdAt - b.createdAt);
  const muscleRows = rows("exercise_muscle_map");
  for (const e of exercises) {
    const map = Object.fromEntries(
      muscleRows.filter((m) => m.exercise_id === e.id).map((m) => [String(m.body_part), Number(m.contribution_rate)]),
    ) as Exercise["muscles"];
    const defaults = MUSCLE_MAP[e.bodyPart];
    const same =
      map &&
      Object.keys(map).length === Object.keys(defaults).length &&
      Object.entries(defaults).every(([k, v]) => map[k as keyof typeof map] === v);
    if (map && Object.keys(map).length > 0 && !same) e.muscles = map;
  }

  const templates: Template[] = rows("workout_templates").map((r) => ({
    id: String(r.id),
    name: String(r.name),
    exerciseIds: (r.exercise_order as string[]) ?? [],
  }));

  const setsByEx = new Map<string, Record<string, unknown>[]>();
  for (const r of rows("workout_sets")) {
    const k = String(r.session_exercise_id);
    if (!setsByEx.has(k)) setsByEx.set(k, []);
    setsByEx.get(k)!.push(r);
  }
  const exBySession = new Map<string, Record<string, unknown>[]>();
  for (const r of rows("workout_session_exercises")) {
    const k = String(r.session_id);
    if (!exBySession.has(k)) exBySession.set(k, []);
    exBySession.get(k)!.push(r);
  }

  const sessions: WorkoutSession[] = rows("workout_sessions").map((r) => {
    const exs = (exBySession.get(String(r.id)) ?? []).sort((a, b) => Number(a.position) - Number(b.position));
    return {
      id: String(r.id),
      date: String(r.date),
      templateId: (r.template_id as string) ?? undefined,
      templateName: (r.template_name as string) ?? undefined,
      startAt: ms(r.start_at) ?? 0,
      endAt: ms(r.end_at) ?? undefined,
      kcalOverride: num(r.kcal_override),
      note: String(r.note ?? ""),
      completed: !!r.completed,
      exercises: exs.map(
        (e): SessionExercise => ({
          uid: String(e.id),
          exerciseId: String(e.exercise_id),
          name: String(e.name),
          bodyPart: e.body_part as SessionExercise["bodyPart"],
          equipment: e.equipment as SessionExercise["equipment"],
          weightMode: e.weight_mode as SessionExercise["weightMode"],
          intensity: e.intensity as SessionExercise["intensity"],
          restSec: Number(e.rest_sec),
          memo: String(e.memo ?? ""),
          sets: (setsByEx.get(String(e.id)) ?? [])
            .sort((a, b) => Number(a.set_no) - Number(b.set_no))
            .map((x) => ({
              weight: Number(x.weight_kg),
              reps: Number(x.reps),
              done: !!x.completed,
              ...(x.done_at ? { doneAt: ms(x.done_at) } : {}),
            })),
        }),
      ),
    };
  });
  sessions.sort((a, b) => a.startAt - b.startAt);

  const stamps: Stamp[] = rows("stamps").map((r) => ({
    date: String(r.date),
    type: "workout",
    reason: String(r.reason ?? ""),
  }));

  const achievedAt = Object.fromEntries(
    rows("achievements").map((r) => [String(r.id), ms(r.achieved_at) ?? Date.now()]),
  );

  const meals: MealRecord[] = rows("meal_records").map((r) => ({
    id: String(r.id),
    date: String(r.date),
    mealType: r.meal_type as MealRecord["mealType"],
    foodName: String(r.food_name),
    amount: String(r.amount ?? ""),
    kcal: Number(r.kcal),
    proteinG: num(r.protein_g),
    fatG: num(r.fat_g),
    carbG: num(r.carb_g),
    photoKey: (r.photo_url as string) ?? undefined,
    note: String(r.note ?? ""),
    createdAt: ms(r.created_at) ?? 0,
  }));

  const extraBurns: ExtraBurn[] = rows("extra_burns").map((r) => ({
    id: String(r.id),
    date: String(r.date),
    label: String(r.label),
    kcal: Number(r.kcal),
  }));

  const bodyRecords: BodyRecord[] = rows("body_records").map((r) => ({
    id: String(r.id),
    date: String(r.date),
    heightCm: Number(r.height_cm),
    weightKg: Number(r.weight_kg),
    bodyFatPct: num(r.body_fat_pct),
    muscleKg: num(r.muscle_kg),
    waistCm: num(r.waist_cm),
    photos: (r.photo_urls as BodyRecord["photos"]) ?? [],
    note: String(r.note ?? ""),
  }));

  const reports: Record<string, AIReport> = Object.fromEntries(
    rows("ai_reports").map((r) => [
      String(r.target_month),
      {
        month: String(r.target_month),
        summary: String(r.summary),
        highlights: (r.highlights as string[]) ?? [],
        cautions: (r.cautions as string[]) ?? [],
        suggestions: (r.suggestions as string[]) ?? [],
        source: (r.source as AIReport["source"]) ?? "template",
        generatedAt: ms(r.generated_at) ?? Date.now(),
      },
    ]),
  );

  const notif = { ...def.notif, ...((profile.notif as Partial<NotificationSettings>) ?? {}) };

  return {
    settings: {
      nickname: String(profile.nickname ?? ""),
      monthlyGoal: Number(profile.monthly_goal ?? def.monthlyGoal),
      restCountsForStreak: profile.rest_counts_for_streak !== false,
      onboarded: !!profile.onboarded,
      startDate: (profile.start_date as string) ?? def.startDate,
      notif,
    },
    exercises,
    templates,
    weekdaySchedule: (profile.weekday_schedule as (string | null)[]) ?? [null, null, null, null, null, null, null],
    dateAssignments: (profile.date_assignments as Record<string, string>) ?? {},
    sessions,
    activeSessionId: (profile.active_session_id as string) ?? null,
    meals,
    extraBurns,
    bodyRecords,
    stamps,
    reports,
    achievedAt,
  };
}

/* ================================================================ 同期エンジン */

const META_KEY = "kintore-sync-meta";

interface SyncMeta {
  userId: string | null;
  /** 最後に同期したリモートの data_updated_at */
  remoteVersion: string | null;
  dirty: boolean;
  localUpdatedAt: number;
}

const loadMeta = (): SyncMeta => {
  try {
    return { userId: null, remoteVersion: null, dirty: false, localUpdatedAt: 0, ...JSON.parse(localStorage.getItem(META_KEY) ?? "{}") };
  } catch {
    return { userId: null, remoteVersion: null, dirty: false, localUpdatedAt: 0 };
  }
};
const saveMeta = (m: SyncMeta) => localStorage.setItem(META_KEY, JSON.stringify(m));

/** テーブル → (id → 最後に同期した行のJSON)。null は「リモートに存在するが内容不明」 */
let baseline: Map<Table, Map<string, string | null>> | null = null;
let applyingRemote = false;
let changeVersion = 0;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let running: Promise<void> | null = null;

const timerSeconds = () => {
  const t = useTimer.getState();
  return { user: t.userSeconds, last: t.duration };
};

const hasLocalData = (d: AppData) =>
  d.exercises.length > 0 || d.sessions.length > 0 || d.bodyRecords.length > 0 || d.meals.length > 0;

async function fetchAll(sb: SupabaseClient, table: string) {
  const out: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select("*").range(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function fetchIds(sb: SupabaseClient, table: string) {
  const out: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select("id").range(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []).map((r: { id: string }) => r.id));
    if (!data || data.length < 1000) break;
  }
  return out;
}

function setBaselineFrom(snapshot: Snapshot) {
  baseline = new Map(
    TABLES.map((t) => [t, new Map(snapshot.tables[t].map((r) => [r.id, JSON.stringify(r)]))]),
  );
}

async function loadBaseline(sb: SupabaseClient) {
  const map = new Map<Table, Map<string, string | null>>();
  for (const t of TABLES) {
    const ids = await fetchIds(sb, t);
    map.set(t, new Map(ids.map((id) => [id, null])));
  }
  baseline = map;
}

const chunk = <T,>(arr: T[], n: number) =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

async function doPush(sb: SupabaseClient, userId: string) {
  const versionAtStart = changeVersion;
  const meta = loadMeta();
  const snap = toRows(useApp.getState(), timerSeconds());
  if (!baseline) await loadBaseline(sb);

  for (const t of TABLES) {
    const base = baseline!.get(t)!;
    const rows = snap.tables[t];
    const ids = new Set(rows.map((r) => r.id));
    const upserts = rows.filter((r) => base.get(r.id) !== JSON.stringify(r));
    const deletes = [...base.keys()].filter((id) => !ids.has(id));
    for (const c of chunk(upserts, 500)) {
      const { error } = await sb
        .from(t)
        .upsert(c.map((r) => ({ ...r, user_id: userId })), { onConflict: "user_id,id" });
      if (error) throw error;
    }
    for (const c of chunk(deletes, 200)) {
      const { error } = await sb.from(t).delete().in("id", c);
      if (error) throw error;
    }
  }

  const updatedAt = new Date(Math.max(meta.localUpdatedAt, Date.now() - 1000)).toISOString();
  const { error: pErr } = await sb
    .from("profiles")
    .upsert({ user_id: userId, ...snap.profile, data_updated_at: updatedAt }, { onConflict: "user_id" });
  if (pErr) throw pErr;
  const { error: tErr } = await sb
    .from("timer_settings")
    .upsert({ user_id: userId, ...snap.timer, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (tErr) throw tErr;

  setBaselineFrom(snap);
  const { data: saved } = await sb.from("profiles").select("data_updated_at").eq("user_id", userId).maybeSingle();
  saveMeta({
    ...loadMeta(),
    userId,
    remoteVersion: (saved?.data_updated_at as string) ?? updatedAt,
    dirty: changeVersion !== versionAtStart,
  });
  await uploadPendingPhotos(userId).catch(() => {});
}

async function doPull(sb: SupabaseClient, userId: string) {
  const { data: profile, error } = await sb.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!profile) return;
  const tables: RemoteTables = {};
  for (const t of TABLES) tables[t] = await fetchAll(sb, t);
  const { data: timer } = await sb.from("timer_settings").select("*").eq("user_id", userId).maybeSingle();

  const next = fromRows(profile, tables);
  applyingRemote = true;
  try {
    useApp.getState().importData(next);
    if (timer && useTimer.getState().status === "idle") {
      useTimer.getState().setUserSeconds(Number(timer.default_seconds));
    }
  } finally {
    applyingRemote = false;
  }
  setBaselineFrom(toRows(useApp.getState(), timerSeconds()));
  saveMeta({
    userId,
    remoteVersion: profile.data_updated_at as string,
    dirty: false,
    localUpdatedAt: Date.parse(profile.data_updated_at as string),
  });
}

function guard(fn: (sb: SupabaseClient, userId: string) => Promise<void>) {
  return async () => {
    const sb = getSupabase();
    const user = useCloud.getState().user;
    if (!sb || !user) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      useCloud.getState().set({ status: "offline" });
      return;
    }
    while (running) await running;
    useCloud.getState().set({ status: "syncing", error: null });
    running = fn(sb, user.id)
      .then(() => useCloud.getState().set({ status: "idle", lastSyncedAt: Date.now() }))
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
        useCloud.getState().set({ status: "error", error: message });
      })
      .finally(() => {
        running = null;
      });
    await running;
  };
}

export const pushNow = guard(doPush);
export const pullNow = guard(doPull);

/** 起動時・フォーカス時・定期的に呼び出し、リモートとローカルを突き合わせる */
export const reconcile = guard(async (sb, userId) => {
  const meta = loadMeta();
  const { data: remote, error } = await sb
    .from("profiles")
    .select("data_updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  const local = useApp.getState();

  if (meta.userId !== userId) {
    baseline = null;
    if (!remote) {
      await doPush(sb, userId);
    } else if (hasLocalData(local)) {
      useCloud.getState().set({ conflict: { remoteUpdatedAt: remote.data_updated_at as string } });
    } else {
      await doPull(sb, userId);
    }
    return;
  }

  if (!remote) {
    baseline = null;
    await doPush(sb, userId);
    return;
  }
  if (remote.data_updated_at !== meta.remoteVersion) {
    if (meta.dirty && meta.localUpdatedAt > Date.parse(remote.data_updated_at as string)) {
      baseline = null;
      await doPush(sb, userId);
    } else {
      await doPull(sb, userId);
    }
  } else if (meta.dirty) {
    await doPush(sb, userId);
  }
});

/** 初回リンク時の競合解決 */
export async function resolveConflict(choice: "cloud" | "local") {
  useCloud.getState().set({ conflict: null });
  if (choice === "cloud") await pullNow();
  else {
    baseline = null;
    const meta = loadMeta();
    saveMeta({ ...meta, userId: useCloud.getState().user?.id ?? null, dirty: true, localUpdatedAt: Date.now() });
    await pushNow();
  }
}

/** ローカルの変更を監視し、少し待ってからまとめて送信する */
export function startChangeTracking() {
  const schedule = () => {
    if (applyingRemote) return;
    changeVersion++;
    const meta = loadMeta();
    saveMeta({ ...meta, dirty: true, localUpdatedAt: Date.now() });
    if (!useCloud.getState().user || useCloud.getState().conflict) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      if (loadMeta().userId === useCloud.getState().user?.id) void pushNow();
    }, 1500);
  };
  const unsubApp = useApp.subscribe((s, prev) => {
    for (const k of Object.keys(s) as (keyof AppData)[]) {
      if (k === "notifLog") continue;
      if (typeof s[k] === "function") continue;
      if (s[k] !== prev[k]) {
        schedule();
        return;
      }
    }
  });
  const unsubTimer = useTimer.subscribe((s, prev) => {
    if (s.userSeconds !== prev.userSeconds) schedule();
  });
  return () => {
    unsubApp();
    unsubTimer();
    if (pushTimer) clearTimeout(pushTimer);
  };
}

export function resetSyncState() {
  baseline = null;
  localStorage.removeItem(META_KEY);
}
