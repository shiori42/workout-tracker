"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMounted } from "./hooks";
import { TabBar } from "./TabBar";
import { MiniTimer, TimerAlert } from "./TimerWidgets";
import { NotificationWatcher, ServiceWorkerRegister, TimerWatcher } from "./Watchers";
import { useApp } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { useTimer } from "@/lib/timerStore";

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
  const pathname = usePathname();
  const router = useRouter();
  const onboarded = useApp((s) => s.settings.onboarded);
  const isOnboarding = pathname === "/onboarding";
  const timerVisible = useTimer((s) => s.status !== "idle") && pathname !== "/timer";

  useEffect(() => {
    if (mounted && !onboarded && !isOnboarding) router.replace("/onboarding");
  }, [mounted, onboarded, isOnboarding, router]);

  if (!mounted || (!onboarded && !isOnboarding)) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="text-center">
          <div className="text-5xl animate-pulse">💪</div>
          <div className="mt-3 text-sm font-bold text-muted">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <TimerWatcher />
      <NotificationWatcher />
      <ServiceWorkerRegister />
      <main
        className={
          isOnboarding
            ? ""
            : timerVisible
              ? "pb-[calc(160px+env(safe-area-inset-bottom))]"
              : "pb-[calc(88px+env(safe-area-inset-bottom))]"
        }
      >
        {children}
      </main>
      {!isOnboarding && <MiniTimer />}
      {!isOnboarding && <TabBar />}
      <TimerAlert />
      <Toaster />
    </>
  );
}
