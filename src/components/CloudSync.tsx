"use client";

import { useEffect } from "react";
import { cloudEnabled, getSupabase, useCloud } from "@/lib/supabase";
import { reconcile, resolveConflict, startChangeTracking } from "@/lib/sync";
import { useApp } from "@/lib/store";
import { computeBadges } from "@/lib/calc";
import { fmtDateTime } from "@/lib/date";
import { Button, Sheet } from "./ui";

/** 認証状態の監視とクラウド同期（Supabase 未設定時は何もしない） */
export function CloudSync() {
  const conflict = useCloud((s) => s.conflict);

  useEffect(() => {
    const unsub = useApp.subscribe((s, prev) => {
      if (s.stamps === prev.stamps && s.bodyRecords === prev.bodyRecords && s.settings === prev.settings) return;
      const ids = computeBadges(s).filter((b) => b.achieved).map((b) => b.id);
      s.recordAchievements(ids);
    });
    const st = useApp.getState();
    st.recordAchievements(computeBadges(st).filter((b) => b.achieved).map((b) => b.id));
    return unsub;
  }, []);

  useEffect(() => {
    if (!cloudEnabled) return;
    const sb = getSupabase();
    if (!sb) return;
    const cloud = useCloud.getState();

    sb.auth.getSession().then(({ data }) => {
      cloud.set({ user: data.session?.user ?? null, ready: true, status: data.session ? "syncing" : "signed-out" });
      if (data.session) void reconcile();
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      const prevUser = useCloud.getState().user;
      useCloud.getState().set({ user: session?.user ?? null, ready: true });
      if (!session) {
        useCloud.getState().set({ status: "signed-out" });
      } else if (event === "SIGNED_IN" && prevUser?.id !== session.user.id) {
        void reconcile();
      }
    });

    const stopTracking = startChangeTracking();
    const onWake = () => {
      if (document.visibilityState === "visible") void reconcile();
    };
    const onOnline = () => void reconcile();
    const onOffline = () => useCloud.getState().user && useCloud.getState().set({ status: "offline" });
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const id = setInterval(() => void reconcile(), 60_000);

    return () => {
      sub.subscription.unsubscribe();
      stopTracking();
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(id);
    };
  }, []);

  return (
    <Sheet
      open={!!conflict}
      onClose={() => {}}
      title="どちらのデータを使いますか？"
      footer={
        <div className="grid gap-2">
          <Button size="lg" onClick={() => void resolveConflict("cloud")}>
            クラウドのデータを使う
          </Button>
          <Button variant="secondary" onClick={() => void resolveConflict("local")}>
            この端末のデータでクラウドを上書き
          </Button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-muted">
        このアカウントにはクラウド上に保存済みのデータがあり、この端末にも記録があります。
        {conflict && <span className="mt-2 block text-xs">クラウドの最終更新：{fmtDateTime(Date.parse(conflict.remoteUpdatedAt))}</span>}
      </p>
    </Sheet>
  );
}
