"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useKeyboardOpen, useMounted } from "./hooks";
import { TabBar } from "./TabBar";
import { MiniTimer, TimerAlert } from "./TimerWidgets";
import { NotificationWatcher, ServiceWorkerRegister, TimerWatcher } from "./Watchers";
import { useApp } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { useTimer } from "@/lib/timerStore";
import { CloudSync } from "./CloudSync";
import { requireLogin, useCloud } from "@/lib/supabase";
import { PushBridge } from "./PushBridge";
import { cx } from "./ui";

const SCROLL_ID = "app-scroll";

/** スクロールはページ全体ではなく main 要素で行う（iOS で固定タブバーがずれるのを防ぐ） */
export function scrollAppToTop() {
  document.getElementById(SCROLL_ID)?.scrollTo({ top: 0 });
  window.scrollTo(0, 0);
}

function Toaster() {
  const toasts = useToast((s) => s.toasts);
  const remove = useToast((s) => s.remove);
  return (
    <div className="pointer-events-none fixed top-[calc(env(safe-area-inset-top)+8px)] left-1/2 z-[70] flex w-[calc(100%-24px)] max-w-[406px] -translate-x-1/2 flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => remove(t.id)}
          className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-line bg-card/95 p-3 text-left shadow-2xl backdrop-blur animate-drop"
        >
          {t.icon && <span className="text-2xl leading-none">{t.icon}</span>}
          <span>
            <span className="block text-sm font-bold">{t.title}</span>
            {t.body && <span className="block text-xs text-muted">{t.body}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const keyboardOpen = useKeyboardOpen();
  const pathname = usePathname();
  const router = useRouter();
  const onboarded = useApp((s) => s.settings.onboarded);
  const user = useCloud((s) => s.user);
  const cloudReady = useCloud((s) => s.ready);
  const locked = requireLogin && !user;
  const allowedBeforeOnboarding = pathname === "/onboarding" || pathname === "/login";
  const isOnboarding = pathname === "/onboarding" || (pathname === "/login" && (!onboarded || locked));
  const timerVisible = useTimer((s) => s.status !== "idle") && pathname !== "/timer";

  const waiting = requireLogin && !cloudReady;
  const redirect = locked
    ? pathname === "/login"
      ? null
      : "/login"
    : !onboarded && !allowedBeforeOnboarding
      ? "/onboarding"
      : null;

  useEffect(() => {
    if (mounted && !waiting && redirect) router.replace(redirect);
  }, [mounted, waiting, redirect, router]);

  useEffect(() => {
    scrollAppToTop();
  }, [pathname]);

  if (!mounted || waiting || redirect) {
    return (
      <>
        {/* CloudSync がログイン状態を確定させるので、読み込み中もマウントしておく */}
        <CloudSync />
        <div className="grid min-h-dvh place-items-center">
          <div className="text-center">
            <div className="text-5xl animate-pulse">💪</div>
            <div className="mt-3 text-sm font-bold text-muted">読み込み中...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <CloudSync />
      <TimerWatcher />
      <NotificationWatcher />
      <ServiceWorkerRegister />
      <PushBridge />
      <main
        id={SCROLL_ID}
        className={cx(
          "h-dvh overflow-y-auto overscroll-y-contain",
          isOnboarding
            ? ""
            : timerVisible
              ? "pb-[calc(160px+env(safe-area-inset-bottom))]"
              : "pb-[calc(88px+env(safe-area-inset-bottom))]",
        )}
      >
        {children}
      </main>
      {!isOnboarding && !keyboardOpen && <MiniTimer />}
      {!isOnboarding && !keyboardOpen && <TabBar />}
      <TimerAlert />
      <Toaster />
    </>
  );
}
