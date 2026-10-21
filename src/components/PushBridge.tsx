"use client";

import { useEffect } from "react";
import { useTimer } from "@/lib/timerStore";
import { useApp } from "@/lib/store";
import { useCloud } from "@/lib/supabase";
import { cancelTimerPush, refreshSubscription, scheduleTimerPush, usePush } from "@/lib/push";

/** タイマー・予定の変化をプッシュ通知サーバーへ伝える */
export function PushBridge() {
  useEffect(() => {
    void refreshSubscription();

    const wantPush = () => usePush.getState().enabled && useApp.getState().settings.notif.interval.enabled;

    const syncRunning = () => {
      if (!wantPush()) return;
      const t = useTimer.getState();
      if (t.status === "running" && t.endAt && t.endAt > Date.now()) {
        void scheduleTimerPush(Math.max(t.endAt, Date.now() + 200), t.label);
      }
    };

    const unsubTimer = useTimer.subscribe((s, prev) => {
      if (!usePush.getState().enabled) return;
      if (s.status === "running" && s.endAt && s.endAt !== prev.endAt) {
        if (wantPush()) void scheduleTimerPush(s.endAt, s.label);
      } else if (prev.status === "running" && s.status !== "running" && s.status !== "finished") {
        void cancelTimerPush();
      }
    });

    // バックグラウンドでは JS も音も止まるので、離れる瞬間に予約を入れ直す（サーバー側の待機が切れても拾う）
    const onHide = () => {
      if (document.visibilityState === "visible") return;
      syncRunning();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", syncRunning);
    document.addEventListener("freeze", syncRunning);

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
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", syncRunning);
      document.removeEventListener("freeze", syncRunning);
      unsubApp();
      unsubCloud();
      if (timer) clearTimeout(timer);
    };
  }, []);
  return null;
}
