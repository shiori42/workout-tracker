"use client";

import { useEffect } from "react";
import { useTimer } from "@/lib/timerStore";
import { useApp } from "@/lib/store";
import { useCloud } from "@/lib/supabase";
import { cancelTimerPush, refreshSubscription, scheduleTimerPush, usePush } from "@/lib/push";

/** 終了の何ミリ秒前に「画面を見ているならプッシュを取り消す」判定をするか */
const FOREGROUND_CANCEL_MS = 3000;

/** タイマー・予定の変化をプッシュ通知サーバーへ伝える */
export function PushBridge() {
  useEffect(() => {
    void refreshSubscription();

    // iOS は通知が届くとアプリの音声が中断されるため、画面を開いている間はアプリ内のビープ音だけで知らせる。
    // 予約は開始時に入れておき（バックグラウンドでは JS が止まるため）、終了直前に表示中なら取り消す。
    let scheduledFor: number | null = null;
    const wantPush = () => usePush.getState().enabled && useApp.getState().settings.notif.interval.enabled;
    const visible = () => document.visibilityState === "visible";
    const schedule = (endAt: number, label: string) => {
      scheduledFor = endAt;
      void scheduleTimerPush(endAt, label);
    };
    const cancel = () => {
      scheduledFor = null;
      void cancelTimerPush();
    };
    const initial = useTimer.getState();
    if (wantPush() && initial.status === "running" && initial.endAt) scheduledFor = initial.endAt;

    const unsubTimer = useTimer.subscribe((s, prev) => {
      if (!usePush.getState().enabled) return;
      if (s.status === "running" && s.endAt && s.endAt !== prev.endAt) {
        if (!wantPush()) return;
        if (visible() && s.endAt - Date.now() <= FOREGROUND_CANCEL_MS) {
          if (scheduledFor) cancel();
          return;
        }
        schedule(s.endAt, s.label);
      } else if (prev.status === "running" && s.status !== "running") {
        if (s.status === "finished") scheduledFor = null;
        else if (scheduledFor) cancel();
      }
    });

    const watch = setInterval(() => {
      const t = useTimer.getState();
      if (scheduledFor && t.status === "running" && t.endAt === scheduledFor && visible() && t.endAt - Date.now() <= FOREGROUND_CANCEL_MS) {
        cancel();
      }
    }, 500);

    const onVisibility = () => {
      const t = useTimer.getState();
      if (visible() || !wantPush() || t.status !== "running" || !t.endAt) return;
      if (scheduledFor !== t.endAt && t.endAt > Date.now()) schedule(t.endAt, t.label);
    };
    document.addEventListener("visibilitychange", onVisibility);

    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubApp = useApp.subscribe((s, prev) => {
      if (!usePush.getState().enabled) return;
      const relevant =
        s.settings !== prev.settings ||
        s.weekdaySchedule !== prev.weekdaySchedule ||
        s.dateAssignments !== prev.dateAssignments ||
        s.templates !== prev.templates ||
        s.stamps !== prev.stamps ||
        s.meals !== prev.meals ||
        s.bodyRecords !== prev.bodyRecords;
      if (!relevant) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void refreshSubscription(), 3000);
    });

    const unsubCloud = useCloud.subscribe((s, prev) => {
      if (s.user?.id !== prev.user?.id) void refreshSubscription();
    });

    return () => {
      unsubTimer();
      clearInterval(watch);
      document.removeEventListener("visibilitychange", onVisibility);
      unsubApp();
      unsubCloud();
      if (timer) clearTimeout(timer);
    };
  }, []);
  return null;
}
