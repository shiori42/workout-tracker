"use client";

import { useEffect } from "react";
import { useTimer } from "@/lib/timerStore";
import { useApp } from "@/lib/store";
import { beep, showSystemNotification, unlockAudio, vibrate } from "@/lib/notify";
import { toast } from "@/lib/toast";
import { planFor } from "@/lib/calc";
import { monthOf, pad, ymd } from "@/lib/date";
import { swUrl, usePush } from "@/lib/push";

/** タイマー終了を全画面共通で監視する（TM-04 / TM-05 / TI-07） */
export function TimerWatcher() {
  useEffect(() => {
    const check = () => {
      const fired = useTimer.getState().checkFinish();
      if (!fired) return;
      const st = useTimer.getState();
      const late = st.finishedAt ? Date.now() - st.finishedAt > 60_000 : false;
      if (!late) {
        beep();
        vibrate();
      }
      if (useApp.getState().settings.notif.interval.enabled && document.visibilityState === "hidden") {
        void showSystemNotification(
          "インターバル終了",
          st.label ? `${st.label}：次のセットを始めましょう` : "次のセットを始めましょう",
          "interval",
        );
      }
    };
    check();
    const id = setInterval(check, 300);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("touchend", unlockAudio, { passive: true });
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("touchend", unlockAudio);
    };
  }, []);
  return null;
}

const nowHm = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

async function notify(title: string, body: string, tag: string) {
  const shown = document.visibilityState === "hidden" && (await showSystemNotification(title, body, tag));
  if (!shown) toast(title, body, "🔔");
}

/** 予定・身体記録・食事記録の通知（アプリ起動中に判定。非対応環境はアプリ内通知） */
export function NotificationWatcher() {
  useEffect(() => {
    const check = () => {
      const data = useApp.getState();
      const { notif } = data.settings;
      if (!data.settings.onboarded) return;
      if (usePush.getState().enabled) return;
      const today = ymd();
      const hm = nowHm();
      const log = data.notifLog;

      if (notif.training.enabled && hm >= notif.training.time && log.training !== today) {
        data.markNotified("training", today);
        const plan = planFor(data, today);
        const trained = data.stamps.some((s) => s.date === today);
        if (!trained && plan) {
          if (plan === "rest") {
            void notify("今日は休養日", "しっかり休んで回復しましょう。", "training");
          } else {
            const t = data.templates.find((x) => x.id === plan);
            void notify(`今日は${t?.name ?? "トレーニング"}`, "ホームの「筋トレを開始」から始めましょう。", "training");
          }
        }
      }

      const month = monthOf(today);
      if (
        notif.body.enabled &&
        new Date().getDate() >= notif.body.day &&
        hm >= notif.body.time &&
        log.body !== month
      ) {
        data.markNotified("body", month);
        if (!data.bodyRecords.some((r) => monthOf(r.date) === month)) {
          void notify("月次身体記録の日です", "身長・体重・写真を記録して変化を確認しましょう。", "body");
        }
      }

      if (notif.meal.enabled && hm >= notif.meal.time && log.meal !== today) {
        data.markNotified("meal", today);
        if (!data.meals.some((m) => m.date === today)) {
          void notify("食事記録を忘れていませんか？", "今日の食事とカロリーを記録しましょう。", "meal");
        }
      }
    };
    const first = setTimeout(check, 1500);
    const id = setInterval(check, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  return null;
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(swUrl(), { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}
