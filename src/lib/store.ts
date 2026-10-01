"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  AIReport,
  BodyRecord,
  Exercise,
  ExtraBurn,
  MealRecord,
  PlanValue,
  SessionExercise,
  Settings,
  Stamp,
  Template,
  WorkoutSession,
  WorkoutSet,
} from "./types";
import { ymd } from "./date";
import { SAMPLE_EXERCISES, SAMPLE_TEMPLATES } from "./constants";

export const uid = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    try {
      return crypto.randomUUID();
    } catch {
      /* 非セキュアコンテキストでは使えない */
    }
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export const defaultSettings = (): Settings => ({
  nickname: "",
  monthlyGoal: 12,
  restCountsForStreak: true,
  onboarded: false,
  startDate: ymd(),
  notif: {
    training: { enabled: true, time: "19:00" },
    body: { enabled: true, day: 1, time: "08:00" },
    meal: { enabled: false, time: "21:00" },
    interval: { enabled: true },
  },
});

export interface AppData {
  settings: Settings;
  exercises: Exercise[];
  templates: Template[];
  /** index = 曜日(0=日)。templateId | "rest" | null */
  weekdaySchedule: (string | null)[];
  dateAssignments: Record<string, PlanValue>;
  sessions: WorkoutSession[];
  activeSessionId: string | null;
  meals: MealRecord[];
  extraBurns: ExtraBurn[];
  bodyRecords: BodyRecord[];
  stamps: Stamp[];
  reports: Record<string, AIReport>;
  /** バッジID → 初回達成時刻 */
  achievedAt: Record<string, number>;
  notifLog: Record<string, string>;
}

export type ExerciseInput = Omit<Exercise, "id" | "createdAt">;

interface AppActions {
  updateSettings: (patch: Partial<Settings>) => void;
  updateNotif: <K extends keyof Settings["notif"]>(
    key: K,
    patch: Partial<Settings["notif"][K]>,
  ) => void;

  addExercise: (input: ExerciseInput) => string;
  updateExercise: (id: string, patch: Partial<ExerciseInput>) => void;
  deleteExercise: (id: string) => void;
  duplicateExercise: (id: string) => void;

  addTemplate: (name: string, exerciseIds: string[]) => string;
  updateTemplate: (id: string, patch: Partial<Omit<Template, "id">>) => void;
  deleteTemplate: (id: string) => void;
  duplicateTemplate: (id: string) => void;

  setWeekday: (weekday: number, value: string | null) => void;
  setDatePlan: (date: string, value: PlanValue | undefined) => void;

  startSession: (templateId: string | null, date?: string) => string;
  addExerciseToSession: (sessionId: string, exerciseId: string) => void;
  removeExerciseFromSession: (sessionId: string, exUid: string) => void;
  moveSessionExercise: (sessionId: string, exUid: string, dir: -1 | 1) => void;
  updateSet: (
    sessionId: string,
    exUid: string,
    index: number,
    patch: Partial<WorkoutSet>,
  ) => void;
  addSet: (sessionId: string, exUid: string) => void;
  removeSet: (sessionId: string, exUid: string, index: number) => void;
  updateSessionExercise: (
    sessionId: string,
    exUid: string,
    patch: Partial<Pick<SessionExercise, "memo" | "restSec">>,
  ) => void;
  finishSession: (
    sessionId: string,
    opts: { kcalOverride?: number; note: string },
  ) => void;
  discardSession: (sessionId: string) => void;
  updateSession: (
    sessionId: string,
    patch: Partial<Pick<WorkoutSession, "note" | "kcalOverride">>,
  ) => void;
  deleteSession: (sessionId: string) => void;

  addMeal: (input: Omit<MealRecord, "id" | "createdAt">) => void;
  updateMeal: (id: string, patch: Partial<MealRecord>) => void;
  deleteMeal: (id: string) => void;
  addExtraBurn: (input: Omit<ExtraBurn, "id">) => void;
  deleteExtraBurn: (id: string) => void;

  upsertBodyRecord: (input: Omit<BodyRecord, "id"> & { id?: string }) => void;
  deleteBodyRecord: (id: string) => void;

  saveReport: (report: AIReport) => void;
  recordAchievements: (ids: string[]) => void;
  markNotified: (key: string, value: string) => void;

  loadSamples: () => void;
  importData: (data: Partial<AppData>) => void;
  resetAll: () => void;
}

export type AppState = AppData & AppActions;

const initialData = (): AppData => ({
  settings: defaultSettings(),
  exercises: [],
  templates: [],
  weekdaySchedule: [null, null, null, null, null, null, null],
  dateAssignments: {},
  sessions: [],
  activeSessionId: null,
  meals: [],
  extraBurns: [],
  bodyRecords: [],
  stamps: [],
  reports: {},
  achievedAt: {},
  notifLog: {},
});

/** 種目の前回実績（MN-10）。なければ既定値から生成 */
function initialSetsFor(
  sessions: WorkoutSession[],
  ex: Exercise,
): WorkoutSet[] {
  const sorted = [...sessions]
    .filter((s) => s.completed)
    .sort((a, b) => b.startAt - a.startAt);
  for (const s of sorted) {
    const prev = s.exercises.find((e) => e.exerciseId === ex.id);
    if (prev && prev.sets.length > 0) {
      const done = prev.sets.filter((x) => x.done);
      const base = done.length > 0 ? done : prev.sets;
      return base.map((x) => ({ weight: x.weight, reps: x.reps, done: false }));
    }
  }
  return Array.from({ length: Math.max(1, ex.defaultSets) }, () => ({
    weight: ex.defaultWeight,
    reps: ex.defaultReps,
    done: false,
  }));
}

function toSessionExercise(
  sessions: WorkoutSession[],
  ex: Exercise,
): SessionExercise {
  return {
    uid: uid(),
    exerciseId: ex.id,
    name: ex.name,
    bodyPart: ex.bodyPart,
    equipment: ex.equipment,
    weightMode: ex.weightMode,
    intensity: ex.intensity,
    restSec: ex.restSec,
    sets: initialSetsFor(sessions, ex),
    memo: "",
  };
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => {
      const mapSession = (
        sessionId: string,
        fn: (s: WorkoutSession) => WorkoutSession,
      ) =>
        set((st) => ({
          sessions: st.sessions.map((s) => (s.id === sessionId ? fn(s) : s)),
        }));

      const mapExercise = (
        sessionId: string,
        exUid: string,
        fn: (e: SessionExercise) => SessionExercise,
      ) =>
        mapSession(sessionId, (s) => ({
          ...s,
          exercises: s.exercises.map((e) => (e.uid === exUid ? fn(e) : e)),
        }));

      return {
        ...initialData(),

        updateSettings: (patch) =>
          set((st) => ({ settings: { ...st.settings, ...patch } })),
        updateNotif: (key, patch) =>
          set((st) => ({
            settings: {
              ...st.settings,
              notif: {
                ...st.settings.notif,
                [key]: { ...st.settings.notif[key], ...patch },
              },
            },
          })),

        addExercise: (input) => {
          const id = uid();
          set((st) => ({
            exercises: [...st.exercises, { ...input, id, createdAt: Date.now() }],
          }));
          return id;
        },
        updateExercise: (id, patch) =>
          set((st) => ({
            exercises: st.exercises.map((e) =>
              e.id === id ? { ...e, ...patch } : e,
            ),
          })),
        deleteExercise: (id) =>
          set((st) => ({
            exercises: st.exercises.filter((e) => e.id !== id),
            templates: st.templates.map((t) => ({
              ...t,
              exerciseIds: t.exerciseIds.filter((x) => x !== id),
            })),
          })),
        duplicateExercise: (id) => {
          const ex = get().exercises.find((e) => e.id === id);
          if (!ex) return;
          set((st) => ({
            exercises: [
              ...st.exercises,
              { ...ex, id: uid(), name: `${ex.name}（コピー）`, createdAt: Date.now() },
            ],
          }));
        },

        addTemplate: (name, exerciseIds) => {
          const id = uid();
          set((st) => ({ templates: [...st.templates, { id, name, exerciseIds }] }));
          return id;
        },
        updateTemplate: (id, patch) =>
          set((st) => ({
            templates: st.templates.map((t) =>
              t.id === id ? { ...t, ...patch } : t,
            ),
          })),
        deleteTemplate: (id) =>
          set((st) => ({
            templates: st.templates.filter((t) => t.id !== id),
            weekdaySchedule: st.weekdaySchedule.map((w) => (w === id ? null : w)),
            dateAssignments: Object.fromEntries(
              Object.entries(st.dateAssignments).filter(([, v]) => v !== id),
            ),
          })),
        duplicateTemplate: (id) => {
          const t = get().templates.find((x) => x.id === id);
          if (!t) return;
          set((st) => ({
            templates: [
              ...st.templates,
              { ...t, id: uid(), name: `${t.name}（コピー）` },
            ],
          }));
        },

        setWeekday: (weekday, value) =>
          set((st) => {
            const next = [...st.weekdaySchedule];
            next[weekday] = value;
            return { weekdaySchedule: next };
          }),
        setDatePlan: (date, value) =>
          set((st) => {
            const next = { ...st.dateAssignments };
            if (value === undefined) delete next[date];
            else next[date] = value;
            return { dateAssignments: next };
          }),

        startSession: (templateId, date) => {
          const st = get();
          const t = templateId
            ? st.templates.find((x) => x.id === templateId)
            : undefined;
          const exercises = (t?.exerciseIds ?? [])
            .map((id) => st.exercises.find((e) => e.id === id))
            .filter((e): e is Exercise => !!e)
            .map((e) => toSessionExercise(st.sessions, e));
          const session: WorkoutSession = {
            id: uid(),
            date: date ?? ymd(),
            templateId: t?.id,
            templateName: t?.name ?? "フリートレーニング",
            startAt: Date.now(),
            exercises,
            note: "",
            completed: false,
          };
          set((s) => ({
            sessions: [...s.sessions, session],
            activeSessionId: session.id,
          }));
          return session.id;
        },
        addExerciseToSession: (sessionId, exerciseId) => {
          const st = get();
          const ex = st.exercises.find((e) => e.id === exerciseId);
          if (!ex) return;
          mapSession(sessionId, (s) => ({
            ...s,
            exercises: [...s.exercises, toSessionExercise(st.sessions, ex)],
          }));
        },
        removeExerciseFromSession: (sessionId, exUid) =>
          mapSession(sessionId, (s) => ({
            ...s,
            exercises: s.exercises.filter((e) => e.uid !== exUid),
          })),
        moveSessionExercise: (sessionId, exUid, dir) =>
          mapSession(sessionId, (s) => {
            const list = [...s.exercises];
            const i = list.findIndex((e) => e.uid === exUid);
            const j = i + dir;
            if (i < 0 || j < 0 || j >= list.length) return s;
            [list[i], list[j]] = [list[j], list[i]];
            return { ...s, exercises: list };
          }),
        updateSet: (sessionId, exUid, index, patch) =>
          mapExercise(sessionId, exUid, (e) => ({
            ...e,
            sets: e.sets.map((x, i) => {
              if (i !== index) return x;
              const next = { ...x, ...patch };
              if (patch.done === true && !x.done) next.doneAt = Date.now();
              if (patch.done === false) delete next.doneAt;
              return next;
            }),
          })),
        addSet: (sessionId, exUid) =>
          mapExercise(sessionId, exUid, (e) => {
            const last = e.sets[e.sets.length - 1];
            return {
              ...e,
              sets: [
                ...e.sets,
                { weight: last?.weight ?? 0, reps: last?.reps ?? 10, done: false },
              ],
            };
          }),
        removeSet: (sessionId, exUid, index) =>
          mapExercise(sessionId, exUid, (e) => ({
            ...e,
            sets: e.sets.filter((_, i) => i !== index),
          })),
        updateSessionExercise: (sessionId, exUid, patch) =>
          mapExercise(sessionId, exUid, (e) => ({ ...e, ...patch })),
        finishSession: (sessionId, opts) => {
          const s = get().sessions.find((x) => x.id === sessionId);
          if (!s) return;
          mapSession(sessionId, (x) => ({
            ...x,
            completed: true,
            endAt: Date.now(),
            note: opts.note,
            kcalOverride: opts.kcalOverride,
          }));
          set((st) => ({
            activeSessionId:
              st.activeSessionId === sessionId ? null : st.activeSessionId,
            stamps: st.stamps.some((x) => x.date === s.date)
              ? st.stamps
              : [
                  ...st.stamps,
                  { date: s.date, type: "workout", reason: s.templateName ?? "トレーニング完了" },
                ],
          }));
        },
        discardSession: (sessionId) =>
          set((st) => ({
            sessions: st.sessions.filter((s) => s.id !== sessionId),
            activeSessionId:
              st.activeSessionId === sessionId ? null : st.activeSessionId,
          })),
        updateSession: (sessionId, patch) =>
          mapSession(sessionId, (s) => ({ ...s, ...patch })),
        deleteSession: (sessionId) =>
          set((st) => {
            const target = st.sessions.find((s) => s.id === sessionId);
            const sessions = st.sessions.filter((s) => s.id !== sessionId);
            const stillHas =
              target &&
              sessions.some((s) => s.date === target.date && s.completed);
            return {
              sessions,
              activeSessionId:
                st.activeSessionId === sessionId ? null : st.activeSessionId,
              stamps:
                target && !stillHas
                  ? st.stamps.filter((x) => x.date !== target.date)
                  : st.stamps,
            };
          }),

        addMeal: (input) =>
          set((st) => ({
            meals: [...st.meals, { ...input, id: uid(), createdAt: Date.now() }],
          })),
        updateMeal: (id, patch) =>
          set((st) => ({
            meals: st.meals.map((m) => (m.id === id ? { ...m, ...patch } : m)),
          })),
        deleteMeal: (id) =>
          set((st) => ({ meals: st.meals.filter((m) => m.id !== id) })),
        addExtraBurn: (input) =>
          set((st) => ({ extraBurns: [...st.extraBurns, { ...input, id: uid() }] })),
        deleteExtraBurn: (id) =>
          set((st) => ({ extraBurns: st.extraBurns.filter((x) => x.id !== id) })),

        upsertBodyRecord: (input) =>
          set((st) => {
            if (input.id && st.bodyRecords.some((r) => r.id === input.id)) {
              return {
                bodyRecords: st.bodyRecords.map((r) =>
                  r.id === input.id ? ({ ...r, ...input } as BodyRecord) : r,
                ),
              };
            }
            return {
              bodyRecords: [...st.bodyRecords, { ...input, id: input.id ?? uid() }],
            };
          }),
        deleteBodyRecord: (id) =>
          set((st) => ({ bodyRecords: st.bodyRecords.filter((r) => r.id !== id) })),

        saveReport: (report) =>
          set((st) => ({ reports: { ...st.reports, [report.month]: report } })),
        recordAchievements: (ids) => {
          const cur = get().achievedAt;
          const fresh = ids.filter((id) => !cur[id]);
          if (fresh.length === 0) return;
          const now = Date.now();
          set({ achievedAt: { ...cur, ...Object.fromEntries(fresh.map((id) => [id, now])) } });
        },
        markNotified: (key, value) =>
          set((st) => ({ notifLog: { ...st.notifLog, [key]: value } })),

        loadSamples: () => {
          const st = get();
          const keyToId: Record<string, string> = {};
          const newExercises: Exercise[] = SAMPLE_EXERCISES.map((s) => {
            const existing = st.exercises.find((e) => e.name === s.name);
            const id = existing?.id ?? uid();
            keyToId[s.key] = id;
            return existing ?? {
              id,
              name: s.name,
              bodyPart: s.bodyPart,
              equipment: s.equipment,
              weightMode: s.weightMode,
              defaultWeight: s.defaultWeight,
              defaultReps: s.defaultReps,
              defaultSets: s.defaultSets,
              restSec: s.restSec,
              intensity: s.intensity,
              memo: "",
              createdAt: Date.now(),
            };
          });
          const added = newExercises.filter(
            (e) => !st.exercises.some((x) => x.id === e.id),
          );
          const newTemplates: Template[] = SAMPLE_TEMPLATES.filter(
            (t) => !st.templates.some((x) => x.name === t.name),
          ).map((t) => ({
            id: uid(),
            name: t.name,
            exerciseIds: t.keys.map((k) => keyToId[k]),
          }));
          const templates = [...st.templates, ...newTemplates];
          const byName = (n: string) => templates.find((t) => t.name === n)?.id ?? null;
          const schedule = st.weekdaySchedule.some((w) => w !== null)
            ? st.weekdaySchedule
            : [
                "rest",
                byName("胸の日"),
                byName("背中＋腕の日"),
                "rest",
                byName("肩＋腹の日"),
                byName("脚の日"),
                "rest",
              ];
          set({
            exercises: [...st.exercises, ...added],
            templates,
            weekdaySchedule: schedule,
          });
        },
        importData: (data) => set((st) => ({ ...st, ...data })),
        resetAll: () => set({ ...initialData() }),
      };
    },
    {
      name: "kintore-app-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (st) => {
        const data: Partial<AppState> = {};
        for (const k of Object.keys(initialData()) as (keyof AppData)[]) {
          (data as Record<string, unknown>)[k] = st[k];
        }
        return data as AppData;
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppData>;
        return {
          ...current,
          ...p,
          settings: {
            ...current.settings,
            ...(p.settings ?? {}),
            notif: { ...current.settings.notif, ...(p.settings?.notif ?? {}) },
          },
        };
      },
    },
  ),
);

/** スナップショット取得（エクスポート用） */
export function exportData(): AppData {
  const st = useApp.getState();
  const data = {} as AppData;
  for (const k of Object.keys(initialData()) as (keyof AppData)[]) {
    (data as unknown as Record<string, unknown>)[k] = st[k];
  }
  return data;
}
