"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { unlockAudio } from "./notify";

export type TimerStatus = "idle" | "running" | "paused" | "finished";

interface TimerState {
  /** タイマー画面でユーザーが設定した秒数（TI-01） */
  userSeconds: number;
  /** 現在の計測の基準秒数（リセット時に戻る値） */
  duration: number;
  status: TimerStatus;
  /** running 時の終了予定時刻（epoch ms） */
  endAt: number | null;
  /** paused 時の残りミリ秒 */
  remainingMs: number;
  label: string;
  finishedAt: number | null;
  /** 終了通知を画面上に表示中か */
  alerting: boolean;

  setUserSeconds: (sec: number) => void;
  start: (sec?: number, label?: string) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skip: () => void;
  /** 終了予定時刻を過ぎていれば finished に遷移。遷移した場合 true */
  checkFinish: (now?: number) => boolean;
  dismissAlert: () => void;
}

export const useTimer = create<TimerState>()(
  persist(
    (set, get) => ({
      userSeconds: 60,
      duration: 60,
      status: "idle",
      endAt: null,
      remainingMs: 60000,
      label: "",
      finishedAt: null,
      alerting: false,

      setUserSeconds: (sec) => {
        const s = Math.max(1, Math.min(3600, Math.round(sec)));
        const st = get();
        if (st.status === "idle") {
          set({ userSeconds: s, duration: s, remainingMs: s * 1000, label: "" });
        } else {
          set({ userSeconds: s });
        }
      },
      start: (sec, label) => {
        unlockAudio();
        const s = sec ?? get().duration;
        set({
          duration: s,
          status: "running",
          endAt: Date.now() + s * 1000,
          remainingMs: s * 1000,
          label: label ?? "",
          finishedAt: null,
          alerting: false,
        });
      },
      pause: () => {
        const st = get();
        if (st.status !== "running" || !st.endAt) return;
        set({
          status: "paused",
          remainingMs: Math.max(0, st.endAt - Date.now()),
          endAt: null,
        });
      },
      resume: () => {
        unlockAudio();
        const st = get();
        if (st.status !== "paused") return;
        set({ status: "running", endAt: Date.now() + st.remainingMs });
      },
      reset: () => {
        const st = get();
        set({
          status: "idle",
          endAt: null,
          remainingMs: st.duration * 1000,
          finishedAt: null,
          alerting: false,
        });
      },
      skip: () => {
        const st = get();
        set({
          status: "idle",
          endAt: null,
          duration: st.userSeconds,
          remainingMs: st.userSeconds * 1000,
          label: "",
          finishedAt: null,
          alerting: false,
        });
      },
      checkFinish: (now = Date.now()) => {
        const st = get();
        if (st.status === "running" && st.endAt && now >= st.endAt) {
          set({
            status: "finished",
            remainingMs: 0,
            endAt: null,
            finishedAt: st.endAt,
            alerting: true,
          });
          return true;
        }
        return false;
      },
      dismissAlert: () => set({ alerting: false }),
    }),
    {
      name: "kintore-timer-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        userSeconds: s.userSeconds,
        duration: s.duration,
        status: s.status,
        endAt: s.endAt,
        remainingMs: s.remainingMs,
        label: s.label,
        finishedAt: s.finishedAt,
      }),
    },
  ),
);

/** 終了予定時刻との差分で残り秒数を算出（setInterval の精度に依存しない） */
export function remainingSeconds(
  st: Pick<TimerState, "status" | "endAt" | "remainingMs" | "duration">,
  now = Date.now(),
) {
  if (st.status === "running" && st.endAt)
    return Math.min(st.duration, Math.max(0, (st.endAt - now) / 1000));
  return st.remainingMs / 1000;
}
