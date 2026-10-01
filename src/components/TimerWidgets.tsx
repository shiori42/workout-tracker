"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { remainingSeconds, useTimer } from "@/lib/timerStore";
import { fmtClock } from "@/lib/date";
import { useNow } from "./hooks";
import { cx } from "./ui";

/** タイマー画面以外で表示するミニタイマー（UI-05：状態保持） */
export function MiniTimer() {
  const pathname = usePathname();
  const st = useTimer();
  const active = st.status === "running";
  const now = useNow(active);
  if (pathname === "/timer" || pathname === "/onboarding" || st.status === "idle") return null;
  const remain = remainingSeconds(st, now);
  const ratio = st.duration > 0 ? remain / st.duration : 0;

  return (
    <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom)+8px)] left-1/2 z-30 w-[calc(100%-24px)] max-w-[406px] -translate-x-1/2">
      <div
        className={cx(
          "relative flex items-center gap-3 overflow-hidden rounded-2xl border px-3 py-2 shadow-xl backdrop-blur",
          st.status === "finished" ? "border-red-500/60 bg-red-950/90" : "border-line bg-card/95",
        )}
      >
        <div
          className="absolute inset-y-0 left-0 bg-accent/15 transition-[width] duration-300"
          style={{ width: `${ratio * 100}%` }}
        />
        <Link href="/timer" className="relative flex min-w-0 flex-1 items-center gap-3">
          <span
            className={cx(
              "shrink-0 text-2xl font-extrabold tabular-nums",
              st.status === "finished" ? "text-red-400" : st.status === "paused" ? "text-muted" : "text-white",
            )}
          >
            {fmtClock(remain)}
          </span>
          <span className="min-w-0 truncate text-xs text-muted">
            {st.status === "finished" ? "インターバル終了！" : st.status === "paused" ? "一時停止中" : "インターバル中"}
            {st.label && <span className="block truncate text-white/80">{st.label}</span>}
          </span>
        </Link>
        <div className="relative flex shrink-0 gap-1.5 whitespace-nowrap">
          {st.status === "running" && (
            <>
              <button onClick={st.pause} className="h-9 rounded-lg bg-card2 px-3 text-xs font-bold">
                停止
              </button>
              <button onClick={st.skip} className="h-9 rounded-lg bg-card2 px-3 text-xs font-bold text-muted">
                スキップ
              </button>
            </>
          )}
          {st.status === "paused" && (
            <>
              <button onClick={st.resume} className="h-9 rounded-lg bg-accent px-3 text-xs font-bold">
                再開
              </button>
              <button onClick={st.skip} className="h-9 rounded-lg bg-card2 px-3 text-xs font-bold text-muted">
                スキップ
              </button>
            </>
          )}
          {st.status === "finished" && (
            <button onClick={st.reset} className="h-9 rounded-lg bg-red-500 px-4 text-xs font-bold">
              停止
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** インターバル終了の画面表示（TM-04） */
export function TimerAlert() {
  const alerting = useTimer((s) => s.alerting);
  const label = useTimer((s) => s.label);
  const dismiss = useTimer((s) => s.dismissAlert);
  const reset = useTimer((s) => s.reset);
  if (!alerting) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/70 animate-fade" onClick={dismiss} />
      <div className="relative w-full max-w-[360px] rounded-3xl border border-red-500/50 bg-card p-6 text-center animate-pop">
        <div className="mx-auto mb-3 grid h-20 w-20 place-items-center rounded-full bg-red-500/20 text-4xl animate-ring">
          ⏰
        </div>
        <div className="text-2xl font-extrabold">インターバル終了</div>
        <p className="mt-1 text-sm text-muted">{label ? `${label}：` : ""}次のセットを始めましょう</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={dismiss} className="h-12 rounded-xl bg-card2 font-bold">
            閉じる
          </button>
          <button
            onClick={() => {
              reset();
            }}
            className="h-12 rounded-xl bg-red-500 font-bold"
          >
            停止
          </button>
        </div>
      </div>
    </div>
  );
}
