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

    const unsubTimer = useTimer.subscribe((s, prev) => {
      if (!usePush.getState().enabled) return;
      if (s.status === "running" && s.endAt && s.endAt !== prev.endAt) {
        if (useApp.getState().settings.notif.interval.enabled) void scheduleTimerPush(s.endAt, s.label);
      } else if (prev.status === "running" && s.status !== "running" && s.status !== "finished") {
        void cancelTimerPush();
      }
    });

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
      unsubApp();
      unsubCloud();
      if (timer) clearTimeout(timer);
    };
  }, []);
  return null;
}
